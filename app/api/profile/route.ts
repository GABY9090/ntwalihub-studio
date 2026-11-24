import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase";

// Modifier son profil (nom d'affichage)
export async function PATCH(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "non connecté" }, { status: 401 });
  const { display_name } = await req.json().catch(() => ({}));
  const name = String(display_name ?? "").trim().slice(0, 60);
  const { error } = await supabaseAdmin().from("profiles")
    .update({ display_name: name || null }).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Supprimer son compte : vidéos, projets et crédits sont effacés définitivement.
export async function DELETE(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "non connecté" }, { status: 401 });
  const { confirm } = await req.json().catch(() => ({}));
  if (String(confirm ?? "").trim().toLowerCase() !== String(user.email).toLowerCase()) {
    return NextResponse.json({ error: "confirmation" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  // 1) Fichiers vidéo stockés (dossier de l'utilisateur et sous-dossiers)
  try {
    const folders = [user.id, `${user.id}/parts`];
    const { data: projects } = await admin.from("projects").select("id").eq("user_id", user.id);
    for (const p of projects ?? []) folders.push(`${user.id}/${p.id}`);
    for (const folder of folders) {
      const { data: files } = await admin.storage.from("videos").list(folder, { limit: 1000 });
      const paths = (files ?? []).filter((f) => f.id).map((f) => `${folder}/${f.name}`);
      if (paths.length) await admin.storage.from("videos").remove(paths);
    }
  } catch (e) {
    console.error("⚠️ Suppression des fichiers :", e);
  }
  // 2) Le compte (projets, vidéos, crédits suivent automatiquement)
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await (await supabaseServer()).auth.signOut();
  return NextResponse.json({ ok: true });
}
