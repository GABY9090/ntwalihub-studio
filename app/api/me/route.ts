import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

// Solde de crédits de l'utilisateur connecté (pour la barre du haut)
export async function GET() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ credits: 0 }, { status: 401 });
  const { data } = await supabase.from("profiles").select("credits").eq("id", user.id).single();
  return NextResponse.json({ credits: data?.credits ?? 0 }, { headers: { "Cache-Control": "no-store" } });
}
