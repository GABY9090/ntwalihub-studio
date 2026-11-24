import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { currentUser, ownProject } from "@/lib/auth";
import { startPartMerge } from "@/lib/series";
import { getDict } from "@/lib/lang";

// Relance le collage des clips d'une partie (si le collage automatique a échoué)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t } = await getDict();
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t.errLogin }, { status: 401 });
  if (!(await ownProject(id, user.id))) return NextResponse.json({ error: t.errServer }, { status: 404 });

  const { partId } = await req.json().catch(() => ({}));
  const admin = supabaseAdmin();
  const { data: part } = await admin.from("parts").select("id, status, merge_status")
    .eq("id", partId).eq("project_id", id).single();
  if (!part || part.status === "running" || part.merge_status === "merging") {
    return NextResponse.json({ error: t.errBusy }, { status: 409 });
  }
  await startPartMerge(admin, part.id);
  return NextResponse.json({ ok: true });
}
