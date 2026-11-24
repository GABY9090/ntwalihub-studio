import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { currentUser, ownProject } from "@/lib/auth";
import { startExport } from "@/lib/series";
import { getDict } from "@/lib/lang";

// Assemble tous les clips du projet (toutes les parties) en un seul fichier vidéo
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t } = await getDict();
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t.errLogin }, { status: 401 });
  const project = await ownProject(id, user.id);
  if (!project) return NextResponse.json({ error: t.errServer }, { status: 404 });
  if (project.final_status === "merging") return NextResponse.json({ ok: true });

  try {
    const ok = await startExport(supabaseAdmin(), id);
    if (!ok) return NextResponse.json({ error: t.noClipsYet }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("❌ Assemblage :", JSON.stringify((e as { body?: unknown })?.body ?? String(e)));
    return NextResponse.json({ error: t.errServer }, { status: 502 });
  }
}
