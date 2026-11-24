import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyFlutterwave } from "@/lib/payments";

// Flutterwave prévient ici quand un paiement Mobile Money / carte est terminé.
export async function POST(req: Request) {
  const hash = process.env.FLW_WEBHOOK_HASH;
  if (!hash || req.headers.get("verif-hash") !== hash) {
    return NextResponse.json({ error: "interdit" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const tx = body?.data;
  if (tx?.tx_ref && tx?.id) {
    // On ne croit pas le contenu du message : on revérifie auprès de Flutterwave
    await verifyFlutterwave(supabaseAdmin(), String(tx.tx_ref), String(tx.id));
  }
  return NextResponse.json({ received: true });
}
