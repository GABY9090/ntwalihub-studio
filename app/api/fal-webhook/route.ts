import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { markFailed, markReady } from "@/lib/finalize";
import { advanceProject } from "@/lib/series";

// fal.ai appelle cette adresse quand un clip est prêt (seulement si le site est en ligne).
// On enchaîne alors directement le clip suivant, même si le client a fermé la page.
export async function POST(req: Request) {
  const url = new URL(req.url);
  const videoId = url.searchParams.get("video_id");
  if (url.searchParams.get("secret") !== process.env.WEBHOOK_SECRET || !videoId) {
    return NextResponse.json({ error: "interdit" }, { status: 403 });
  }

  const body = await req.json();
  const admin = supabaseAdmin();

  const { data: video } = await admin.from("videos").select("*").eq("id", videoId).single();
  if (!video || video.status !== "pending") return NextResponse.json({ ok: true });
  if (video.fal_request_id && body.request_id && body.request_id !== video.fal_request_id) {
    return NextResponse.json({ error: "requête inconnue" }, { status: 400 });
  }

  const falUrl: string | undefined = body?.payload?.video?.url;
  if (body.status === "OK" && falUrl) await markReady(admin, video, falUrl);
  else await markFailed(admin, video, JSON.stringify(body.error ?? body.payload ?? "inconnu"));

  if (video.project_id) await advanceProject(admin, video.project_id);
  return NextResponse.json({ ok: true });
}
