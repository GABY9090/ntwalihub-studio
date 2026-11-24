import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { stripeSignatureValid, verifyStripe } from "@/lib/payments";

// Stripe prévient ici quand un paiement est terminé (secours si l'utilisateur ferme la page).
export async function POST(req: Request) {
  const payload = await req.text();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !(await stripeSignatureValid(payload, req.headers.get("stripe-signature"), secret))) {
    return NextResponse.json({ error: "signature invalide" }, { status: 400 });
  }

  const event = JSON.parse(payload);
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const s = event.data.object;
    const paymentId = s.client_reference_id ?? s.metadata?.payment_id;
    if (paymentId) await verifyStripe(supabaseAdmin(), paymentId, s.id);
  }
  return NextResponse.json({ received: true });
}
