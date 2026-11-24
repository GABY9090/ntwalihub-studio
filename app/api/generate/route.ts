import { NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase";
import { checkPrompt } from "@/lib/moderation";
import { getDict } from "@/lib/lang";

fal.config({ credentials: process.env.FAL_KEY });

export async function POST(req: Request) {
  const { t } = await getDict();

  // 1) Qui est connecté ?
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t.errLogin }, { status: 401 });

  // 2) Vérifier la demande
  const { prompt } = await req.json().catch(() => ({ prompt: "" }));
  const problem = checkPrompt(String(prompt ?? ""), t);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  // Vérifie que toutes les clés sont remplies (sinon : erreur 500)
  const missing = ["SUPABASE_SERVICE_ROLE_KEY", "FAL_KEY", "FAL_MODEL", "NEXT_PUBLIC_SITE_URL", "WEBHOOK_SECRET"]
    .filter((k) => !process.env[k] || process.env[k]!.includes("..."));
  if (missing.length) {
    console.error("❌ Variables manquantes dans .env.local :", missing.join(", "));
    return NextResponse.json({ error: `Configuration incomplète : ${missing.join(", ")}` }, { status: 500 });
  }

  const admin = supabaseAdmin();
  const cost = Number(process.env.CREDITS_PER_VIDEO ?? 1);

  // Limite anti-abus : 2 vidéos en cours maximum par personne
  const { count } = await admin
    .from("videos").select("id", { count: "exact", head: true })
    .eq("user_id", user.id).eq("status", "pending");
  if ((count ?? 0) >= 2) {
    return NextResponse.json({ error: t.errBusy }, { status: 429 });
  }

  // 3) Créer la ligne vidéo
  const { data: video, error: insertErr } = await admin
    .from("videos")
    .insert({ user_id: user.id, prompt, credits_spent: cost })
    .select()
    .single();
  if (insertErr || !video) {
    console.error("❌ Supabase (insertion vidéo) :", insertErr);
    return NextResponse.json(
      { error: `Base de données : ${insertErr?.message ?? "erreur inconnue"}. As-tu lancé schema.sql ?` },
      { status: 500 }
    );
  }

  // 4) Retirer les crédits AVANT de payer fal.ai
  const { data: paid } = await admin.rpc("spend_credits", {
    p_user: user.id, p_amount: cost, p_reference: video.id,
  });
  if (!paid) {
    await admin.from("videos").delete().eq("id", video.id);
    return NextResponse.json({ error: t.errCredits }, { status: 402 });
  }

  // 5) Envoyer à fal.ai ; il nous préviendra via le webhook quand c'est fini
  try {
    // Le webhook n'est utile que si le site est joignable depuis Internet.
    // En local (localhost), on s'en passe : /api/videos demande à fal.ai si c'est prêt.
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const isPublic = site.startsWith("https://");
    const webhookUrl = isPublic
      ? `${site}/api/fal-webhook?video_id=${video.id}&secret=${encodeURIComponent(process.env.WEBHOOK_SECRET!)}`
      : undefined;
    const { request_id } = await fal.queue.submit(process.env.FAL_MODEL!, {
      input: { prompt },
      ...(webhookUrl ? { webhookUrl } : {}),
    });
    await admin.from("videos").update({ fal_request_id: request_id }).eq("id", video.id);
    return NextResponse.json({ id: video.id });
  } catch (e) {
    console.error("❌ fal.ai :", (e as { status?: number })?.status, JSON.stringify((e as { body?: unknown })?.body ?? String(e)));
    // Échec : on rend les crédits
    await admin.from("videos").update({ status: "failed", error: String(e) }).eq("id", video.id);
    await admin.rpc("add_credits", {
      p_user: user.id, p_amount: cost, p_reason: "remboursement", p_reference: video.id,
    });
    return NextResponse.json({ error: t.errStart }, { status: 502 });
  }
}
