import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

// L'utilisateur arrive ici après avoir cliqué sur le lien reçu par e-mail
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await supabaseServer();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL("/studio", url.origin));
}
