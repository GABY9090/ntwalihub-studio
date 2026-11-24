import { fal } from "@fal-ai/client";
import { supabaseAdmin } from "./supabase";

fal.config({ credentials: process.env.FAL_KEY });

export type Admin = ReturnType<typeof supabaseAdmin>;
export type PendingVideo = {
  id: string; user_id: string; credits_spent: number; fal_request_id: string | null;
  created_at: string; model?: string | null; part_id?: string | null;
};

// Copie un fichier de fal.ai vers Supabase Storage (les liens fal.ai ne sont pas permanents).
// Si ça échoue (fichier trop gros, etc.), on garde le lien fal.ai.
export async function copyToStorage(admin: Admin, url: string, path: string) {
  try {
    const file = await fetch(url);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error } = await admin.storage.from("videos")
      .upload(path, bytes, { contentType: "video/mp4", upsert: true });
    if (error) throw error;
    return admin.storage.from("videos").getPublicUrl(path).data.publicUrl;
  } catch (e) {
    console.error("⚠️ Copie vers Supabase Storage impossible, lien fal.ai conservé :", e);
    return url;
  }
}

// Clip réussi : on "réserve" la ligne (pending -> ready) pour ne la traiter qu'une fois,
// même si le webhook et la vérification arrivent en même temps.
export async function markReady(admin: Admin, video: PendingVideo, falUrl: string) {
  const { data: claimed } = await admin.from("videos")
    .update({ status: "ready", video_url: falUrl })
    .eq("id", video.id).eq("status", "pending")
    .select("id");
  if (!claimed?.length) return;
  const url = await copyToStorage(admin, falUrl, `${video.user_id}/${video.id}.mp4`);
  if (url !== falUrl) await admin.from("videos").update({ video_url: url }).eq("id", video.id);
}

// Clip raté : statut "failed" + remboursement (une seule fois). La partie s'arrête.
export async function markFailed(admin: Admin, video: PendingVideo, reason: string) {
  const { data: claimed } = await admin.from("videos")
    .update({ status: "failed", error: reason.slice(0, 500) })
    .eq("id", video.id).eq("status", "pending")
    .select("id");
  if (!claimed?.length) return;
  await admin.rpc("add_credits", {
    p_user: video.user_id, p_amount: video.credits_spent,
    p_reason: "remboursement", p_reference: video.id,
  });
  if (video.part_id) {
    await admin.from("parts").update({ status: "failed" }).eq("id", video.part_id).eq("status", "running");
  }
}

// Demande à fal.ai où en est un clip (fonctionne sans webhook, donc en local)
export async function checkWithFal(admin: Admin, video: PendingVideo) {
  // Sécurité : au-delà de 20 minutes (ou 3 min sans envoi), on abandonne et on rembourse
  const age = Date.now() - new Date(video.created_at).getTime();
  if (age > 20 * 60 * 1000 || (!video.fal_request_id && age > 3 * 60 * 1000)) {
    return markFailed(admin, video, "délai dépassé");
  }
  if (!video.fal_request_id) return;
  const model = video.model || process.env.FAL_MODEL!;

  try {
    const status = await fal.queue.status(model, { requestId: video.fal_request_id });
    if (status.status !== "COMPLETED") return; // encore en cours
    const result = await fal.queue.result(model, { requestId: video.fal_request_id });
    const url = (result.data as { video?: { url?: string } })?.video?.url;
    if (url) await markReady(admin, video, url);
    else await markFailed(admin, video, "pas de vidéo dans la réponse");
  } catch (e) {
    const body = JSON.stringify((e as { body?: unknown })?.body ?? String(e));
    console.error("❌ fal.ai (vérification) :", body);
    if ((e as { status?: number })?.status && (e as { status: number }).status < 500) {
      await markFailed(admin, video, body);
    }
  }
}
