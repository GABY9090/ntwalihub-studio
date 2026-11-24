import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { currentUser, ownProject } from "@/lib/auth";
import { startNextClip } from "@/lib/series";
import { getDict } from "@/lib/lang";

// Reprend une partie arrêtée (crédits épuisés puis rechargés, ou clip raté)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t } = await getDict();
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t.errLogin }, { status: 401 });
  if (!(await ownProject(id, user.id))) return NextResponse.json({ error: t.errServer }, { status: 404 });

  const { partId } = await req.json().catch(() => ({}));
  const admin = supabaseAdmin();
  const { data: profile } = await admin.from("profiles").select("credits").eq("id", user.id).single();
  if (!profile || profile.credits < 1) return NextResponse.json({ error: t.errCredits }, { status: 402 });

  const { data: part } = await admin.from("parts")
    .update({ status: "running", merge_status: "none", merged_url: null })
    .eq("id", partId).eq("project_id", id).in("status", ["no_credits", "failed"])
    .select().single();
  if (!part) return NextResponse.json({ error: t.errBusy }, { status: 409 });

  await startNextClip(admin, part);
  return NextResponse.json({ ok: true });
}
