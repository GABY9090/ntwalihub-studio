import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { currentUser } from "@/lib/auth";
import { createPart } from "@/lib/parts";
import { getDict } from "@/lib/lang";

// Nouveau projet (= nouvelle "conversation") avec sa partie 1
export async function POST(req: Request) {
  const { t } = await getDict();
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t.errLogin }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const prompt = String(body.prompt ?? "").trim();
  const seconds = Number(body.seconds ?? 5);

  const admin = supabaseAdmin();
  const { data: project, error } = await admin.from("projects")
    .insert({ user_id: user.id, title: prompt.slice(0, 60) || "Projet" })
    .select().single();
  if (error || !project) {
    console.error("❌ Supabase (projet) :", error);
    return NextResponse.json({ error: `${t.errServer} As-tu lancé supabase/series.sql ?` }, { status: 500 });
  }

  const fail = await createPart({ projectId: project.id, userId: user.id, prompt, seconds, t });
  if (fail) {
    await admin.from("projects").delete().eq("id", project.id);
    return NextResponse.json({ error: fail.error }, { status: fail.status });
  }
  return NextResponse.json({ id: project.id });
}
