import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isAdmin } from "@/lib/admin";

// Réservé à l'admin : ajoute (ou retire si négatif) des crédits à un utilisateur par e-mail
export async function POST(req: Request) {
  const me = await currentUser();
  if (!me || !isAdmin(me.email)) return NextResponse.json({ error: "interdit" }, { status: 403 });

  const { email, amount } = await req.json().catch(() => ({}));
  const n = Math.trunc(Number(amount));
  if (!email || !n || Math.abs(n) > 1000) return NextResponse.json({ error: "E-mail ou nombre invalide" }, { status: 400 });

  const admin = supabaseAdmin();
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const target = data?.users.find((u) => u.email?.toLowerCase() === String(email).toLowerCase().trim());
  if (!target) return NextResponse.json({ error: "Aucun compte avec cet e-mail" }, { status: 404 });

  const { data: profile } = await admin.from("profiles").select("credits").eq("id", target.id).single();
  if (!profile) return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
  if (profile.credits + n < 0) return NextResponse.json({ error: "Le solde deviendrait négatif" }, { status: 400 });

  await admin.rpc("add_credits", {
    p_user: target.id, p_amount: n, p_reason: n > 0 ? "cadeau admin" : "retrait admin", p_reference: me.email,
  });
  return NextResponse.json({ ok: true, credits: profile.credits + n });
}
