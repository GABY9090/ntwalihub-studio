import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { currentUser, ownProject } from "@/lib/auth";
import { advanceProject } from "@/lib/series";

// État complet d'un projet. Au passage, fait avancer la génération
// (vérifie les clips en cours, lance les suivants, suit l'assemblage).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "non connecté" }, { status: 401 });
  if (!(await ownProject(id, user.id))) return NextResponse.json({ error: "introuvable" }, { status: 404 });

  const admin = supabaseAdmin();
  await advanceProject(admin, id);

  const [{ data: project }, { data: parts }, { data: clips }, { data: profile }] = await Promise.all([
    admin.from("projects").select("id, title, final_status, final_url, final_clip_count").eq("id", id).single(),
    admin.from("parts").select("id, part_number, prompt, requested_clips, status, merge_status, merged_url").eq("project_id", id).order("part_number"),
    admin.from("videos").select("id, part_id, part_clip, status, video_url").eq("project_id", id).order("seq"),
    admin.from("profiles").select("credits").eq("id", user.id).single(),
  ]);

  return NextResponse.json({
    project,
    parts: (parts ?? []).map((p) => ({
      ...p,
      clips: (clips ?? []).filter((c) => c.part_id === p.id && c.status !== "failed"),
    })),
    readyCount: (clips ?? []).filter((c) => c.status === "ready").length,
    credits: profile?.credits ?? 0,
  });
}
