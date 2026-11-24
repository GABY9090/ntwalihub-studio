import { supabaseAdmin } from "./supabase";
import { checkPrompt } from "./moderation";
import { CLIP_SECONDS, DURATIONS, startNextClip } from "./series";
import type { Dict } from "./i18n";

// Crée une nouvelle partie dans un projet et lance son premier clip.
// Renvoie un message d'erreur (traduit) ou null si tout va bien.
export async function createPart(opts: {
  projectId: string; userId: string; prompt: string; seconds: number; t: Dict;
}): Promise<{ error: string; status: number } | null> {
  const { projectId, userId, prompt, seconds, t } = opts;
  const problem = checkPrompt(prompt, t);
  if (problem) return { error: problem, status: 400 };
  if (!DURATIONS.includes(seconds)) return { error: t.errServer, status: 400 };

  const admin = supabaseAdmin();
  const { data: profile } = await admin.from("profiles").select("credits").eq("id", userId).single();
  if (!profile || profile.credits < 1) return { error: t.errCredits, status: 402 };

  const { data: parts } = await admin.from("parts").select("part_number, status").eq("project_id", projectId);
  if ((parts ?? []).some((p) => p.status === "running")) return { error: t.errBusy, status: 429 };
  const partNumber = Math.max(0, ...(parts ?? []).map((p) => p.part_number)) + 1;

  const { data: part, error } = await admin.from("parts").insert({
    project_id: projectId, user_id: userId, part_number: partNumber,
    prompt, requested_clips: Math.ceil(seconds / CLIP_SECONDS),
  }).select().single();
  if (error || !part) {
    console.error("❌ Supabase (partie) :", error);
    return { error: `${t.errServer} ${error?.message ?? ""}`, status: 500 };
  }
  await startNextClip(admin, part);
  return null;
}
