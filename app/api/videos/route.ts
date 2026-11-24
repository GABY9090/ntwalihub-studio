import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase";
import { checkWithFal } from "@/lib/finalize";

// Renvoie le solde et les vidéos de l'utilisateur connecté.
// Au passage, demande à fal.ai si les vidéos "en cours" sont prêtes
// (ça marche même sans webhook, donc sans ngrok en local).
export async function GET() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "non connecté" }, { status: 401 });

  const admin = supabaseAdmin();
  const { data: pending } = await admin.from("videos")
    .select("id, user_id, credits_spent, fal_request_id, created_at")
    .eq("user_id", user.id).eq("status", "pending");
  await Promise.all((pending ?? []).map((v) => checkWithFal(admin, v)));

  const [{ data: profile }, { data: videos }] = await Promise.all([
    supabase.from("profiles").select("credits").eq("id", user.id).single(),
    supabase.from("videos")
      .select("id, prompt, status, video_url, created_at")
      .order("created_at", { ascending: false }).limit(50),
  ]);
  return NextResponse.json({ credits: profile?.credits ?? 0, videos: videos ?? [] });
}
