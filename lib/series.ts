// Moteur des séries : un projet contient des parties, chaque partie est découpée
// en clips de 5 s (1 crédit chacun). Chaque clip démarre sur la dernière image du
// clip précédent, pour que la vidéo soit continue. Quand les crédits sont épuisés,
// la partie s'arrête ("no_credits") et peut reprendre après un achat.
import { fal } from "@fal-ai/client";
import { checkWithFal, copyToStorage, markFailed, type Admin } from "./finalize";

export const CLIP_SECONDS = 5;
export const DURATIONS = [5, 10, 15, 20, 30, 60, 120]; // secondes proposées au client

const T2V = () => process.env.FAL_MODEL!; // texte -> vidéo (premier clip)
const I2V = () => process.env.FAL_MODEL_I2V || "minimax/h3-max/image-to-video"; // suite
const MERGE = "fal-ai/ffmpeg-api/merge-videos";
const FRAME = "fal-ai/ffmpeg-api/extract-frame";

type Part = { id: string; project_id: string; user_id: string; prompt: string; requested_clips: number; status: string };

function webhookFor(videoId: string) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  if (!site.startsWith("https://")) return {}; // en local : pas de webhook, on vérifie nous-mêmes
  return {
    webhookUrl: `${site}/api/fal-webhook?video_id=${videoId}&secret=${encodeURIComponent(process.env.WEBHOOK_SECRET!)}`,
  };
}

// Dernière image d'un clip, pour démarrer le clip suivant dessus
async function lastFrame(videoUrl: string): Promise<string | undefined> {
  try {
    const r = await fal.subscribe(FRAME, { input: { video_url: videoUrl, frame_type: "last" } });
    return (r.data as { images?: { url: string }[] })?.images?.[0]?.url;
  } catch (e) {
    console.error("⚠️ Extraction de la dernière image impossible :", JSON.stringify((e as { body?: unknown })?.body ?? String(e)));
    return undefined;
  }
}

// Lance le clip suivant d'une partie (si besoin et si le client a des crédits)
export async function startNextClip(admin: Admin, part: Part) {
  if (part.status !== "running") return;
  const { data: clips } = await admin.from("videos")
    .select("id, status, part_clip").eq("part_id", part.id);
  const list = clips ?? [];
  if (list.some((c) => c.status === "pending")) return; // un clip est déjà en cours
  const ready = list.filter((c) => c.status === "ready").length;
  if (ready >= part.requested_clips) {
    const { data: claimed } = await admin.from("parts").update({ status: "done" })
      .eq("id", part.id).eq("status", "running").select("id");
    if (claimed?.length) await startPartMerge(admin, part.id);
    return;
  }

  const nextIndex = Math.max(0, ...list.map((c) => c.part_clip ?? 0)) + 1;
  const { data: last } = await admin.from("videos")
    .select("seq, video_url").eq("project_id", part.project_id)
    .order("seq", { ascending: false, nullsFirst: false }).limit(1);
  const seq = (last?.[0]?.seq ?? 0) + 1;

  // 1) Réserver le clip (l'index unique empêche les doublons)
  const { data: clip, error } = await admin.from("videos")
    .insert({
      user_id: part.user_id, project_id: part.project_id, part_id: part.id,
      part_clip: nextIndex, seq, prompt: part.prompt, credits_spent: 1,
    })
    .select().single();
  if (error || !clip) return; // déjà lancé par une autre requête

  // 2) Payer 1 crédit. Plus de crédits -> la partie s'arrête ici.
  const { data: paid } = await admin.rpc("spend_credits", { p_user: part.user_id, p_amount: 1, p_reference: clip.id });
  if (!paid) {
    await admin.from("videos").delete().eq("id", clip.id);
    const { data: stopped } = await admin.from("parts").update({ status: "no_credits" })
      .eq("id", part.id).eq("status", "running").select("id");
    if (stopped?.length) await startPartMerge(admin, part.id);
    return;
  }

  // 3) Continuer à partir de la dernière image du projet (sinon : texte seul)
  const { data: prev } = await admin.from("videos")
    .select("video_url").eq("project_id", part.project_id).eq("status", "ready")
    .order("seq", { ascending: false }).limit(1);
  const image = prev?.[0]?.video_url ? await lastFrame(prev[0].video_url) : undefined;
  const model = image ? I2V() : T2V();
  const input: Record<string, unknown> = { prompt: part.prompt };
  if (image) input.image_url = image;
  if (process.env.FAL_RESOLUTION) input.resolution = process.env.FAL_RESOLUTION;

  try {
    const { request_id } = await fal.queue.submit(model, { input, ...webhookFor(clip.id) });
    await admin.from("videos").update({ fal_request_id: request_id, model }).eq("id", clip.id);
  } catch (e) {
    const body = JSON.stringify((e as { body?: unknown })?.body ?? String(e));
    console.error("❌ fal.ai (envoi clip) :", body);
    await markFailed(admin, { ...clip, part_id: part.id }, body);
  }
}

// Fait avancer un projet : vérifie les clips en cours, lance les suivants, suit l'assemblage
export async function advanceProject(admin: Admin, projectId: string) {
  const { data: pending } = await admin.from("videos")
    .select("id, user_id, credits_spent, fal_request_id, created_at, model, part_id")
    .eq("project_id", projectId).eq("status", "pending");
  await Promise.all((pending ?? []).map((v) => checkWithFal(admin, v)));

  const { data: running } = await admin.from("parts").select("*")
    .eq("project_id", projectId).eq("status", "running");
  for (const p of running ?? []) await startNextClip(admin, p);

  const { data: merging } = await admin.from("parts").select("id, user_id, merge_request_id, merged_clip_count")
    .eq("project_id", projectId).eq("merge_status", "merging");
  for (const p of merging ?? []) await checkPartMerge(admin, p);

  await checkMerge(admin, projectId);
}

// ---------- Assemblage de tous les clips en un seul fichier ----------
export async function startExport(admin: Admin, projectId: string) {
  const { data: clips } = await admin.from("videos")
    .select("video_url").eq("project_id", projectId).eq("status", "ready")
    .order("seq", { ascending: true });
  const urls = (clips ?? []).map((c) => c.video_url).filter(Boolean) as string[];
  if (!urls.length) return false;

  if (urls.length === 1) {
    await admin.from("projects").update({
      final_status: "ready", final_url: urls[0], final_clip_count: 1, merge_request_id: null,
    }).eq("id", projectId);
    return true;
  }
  const { request_id } = await fal.queue.submit(MERGE, { input: { video_urls: urls } });
  await admin.from("projects").update({
    final_status: "merging", final_url: null, final_clip_count: urls.length, merge_request_id: request_id,
  }).eq("id", projectId);
  return true;
}

async function checkMerge(admin: Admin, projectId: string) {
  const { data: project } = await admin.from("projects").select("*").eq("id", projectId).single();
  if (!project || project.final_status !== "merging" || !project.merge_request_id) return;
  try {
    const st = await fal.queue.status(MERGE, { requestId: project.merge_request_id });
    if (st.status !== "COMPLETED") return;
    const res = await fal.queue.result(MERGE, { requestId: project.merge_request_id });
    const falUrl = (res.data as { video?: { url?: string } })?.video?.url;
    if (!falUrl) throw new Error("pas de vidéo");
    // On ne passe "ready" qu'une fois (si deux vérifications arrivent ensemble)
    const { data: claimed } = await admin.from("projects")
      .update({ final_status: "ready", final_url: falUrl })
      .eq("id", projectId).eq("final_status", "merging").select("id");
    if (!claimed?.length) return;
    const url = await copyToStorage(admin, falUrl, `${project.user_id}/${projectId}/serie-${project.final_clip_count}.mp4`);
    if (url !== falUrl) await admin.from("projects").update({ final_url: url }).eq("id", projectId);
  } catch (e) {
    console.error("❌ Assemblage :", JSON.stringify((e as { body?: unknown })?.body ?? String(e)));
    if ((e as { status?: number })?.status && (e as { status: number }).status < 500) {
      await admin.from("projects").update({ final_status: "failed" }).eq("id", projectId);
    }
  }
}

// ---------- Collage automatique des clips d'une partie en UNE vidéo ----------
// Ex : 20 s demandées = 4 clips de 5 s -> une seule vidéo de 20 s pour le client.
export async function startPartMerge(admin: Admin, partId: string) {
  const { data: clips } = await admin.from("videos")
    .select("video_url").eq("part_id", partId).eq("status", "ready")
    .order("part_clip", { ascending: true });
  const urls = (clips ?? []).map((c) => c.video_url).filter(Boolean) as string[];
  if (!urls.length) return;

  if (urls.length === 1) {
    await admin.from("parts").update({
      merge_status: "ready", merged_url: urls[0], merged_clip_count: 1, merge_request_id: null,
    }).eq("id", partId);
    return;
  }
  try {
    const { request_id } = await fal.queue.submit(MERGE, { input: { video_urls: urls } });
    await admin.from("parts").update({
      merge_status: "merging", merged_url: null, merged_clip_count: urls.length, merge_request_id: request_id,
    }).eq("id", partId);
  } catch (e) {
    console.error("❌ Collage de la partie :", JSON.stringify((e as { body?: unknown })?.body ?? String(e)));
    await admin.from("parts").update({ merge_status: "failed" }).eq("id", partId);
  }
}

async function checkPartMerge(
  admin: Admin,
  part: { id: string; user_id: string; merge_request_id: string | null; merged_clip_count: number | null },
) {
  if (!part.merge_request_id) return;
  try {
    const st = await fal.queue.status(MERGE, { requestId: part.merge_request_id });
    if (st.status !== "COMPLETED") return;
    const res = await fal.queue.result(MERGE, { requestId: part.merge_request_id });
    const falUrl = (res.data as { video?: { url?: string } })?.video?.url;
    if (!falUrl) throw new Error("pas de vidéo");
    const { data: claimed } = await admin.from("parts")
      .update({ merge_status: "ready", merged_url: falUrl })
      .eq("id", part.id).eq("merge_status", "merging").select("id");
    if (!claimed?.length) return;
    const url = await copyToStorage(admin, falUrl, `${part.user_id}/parts/${part.id}-${part.merged_clip_count}.mp4`);
    if (url !== falUrl) await admin.from("parts").update({ merged_url: url }).eq("id", part.id);
  } catch (e) {
    console.error("❌ Collage de la partie :", JSON.stringify((e as { body?: unknown })?.body ?? String(e)));
    if ((e as { status?: number })?.status && (e as { status: number }).status < 500) {
      await admin.from("parts").update({ merge_status: "failed" }).eq("id", part.id);
    }
  }
}
