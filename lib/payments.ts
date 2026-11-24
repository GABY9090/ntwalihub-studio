// Paiements : Stripe (carte, EUR) et Flutterwave (Mobile Money MTN/Airtel + carte, RWF).
// Règle d'or : on ne fait JAMAIS confiance au navigateur. Les crédits ne sont ajoutés
// qu'après avoir redemandé au service de paiement si l'argent est bien arrivé.
import type { supabaseAdmin } from "./supabase";
import type { Pack } from "./packs";

export type Provider = "stripe" | "flutterwave";
type Admin = ReturnType<typeof supabaseAdmin>;

export const providersEnabled = {
  stripe: !!process.env.STRIPE_SECRET_KEY,
  flutterwave: !!process.env.FLW_SECRET_KEY,
};

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "NtwaliHub Studio";

// ---------- 1) Créer le paiement et obtenir le lien de la page de paiement ----------
export async function createCheckout(opts: {
  admin: Admin; provider: Provider; pack: Pack; userId: string; email: string; origin: string; lang: string;
}): Promise<string> {
  const { admin, provider, pack, userId, email, origin } = opts;
  const amount = provider === "stripe" ? pack.eurCents : pack.rwf;
  const currency = provider === "stripe" ? "eur" : "RWF";

  const { data: payment, error } = await admin.from("payments")
    .insert({ user_id: userId, provider, pack_id: pack.id, credits: pack.credits, amount, currency })
    .select().single();
  if (error || !payment) throw new Error("payments insert: " + error?.message);

  const back = `${origin}/credits/retour?provider=${provider}&payment=${payment.id}`;
  const label = `${APP_NAME} — ${pack.credits} crédits / credits`;

  if (provider === "stripe") {
    const form = new URLSearchParams({
      mode: "payment",
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "eur",
      "line_items[0][price_data][unit_amount]": String(pack.eurCents),
      "line_items[0][price_data][product_data][name]": label,
      client_reference_id: payment.id,
      "metadata[payment_id]": payment.id,
      customer_email: email,
      locale: opts.lang === "fr" ? "fr" : "en",
      success_url: `${back}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/credits?cancel=1`,
    });
    const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });
    const d = await r.json();
    if (!r.ok || !d.url) throw new Error("Stripe: " + JSON.stringify(d.error ?? d));
    await admin.from("payments").update({ provider_ref: d.id }).eq("id", payment.id);
    return d.url as string;
  }

  // Flutterwave Standard : page de paiement hébergée (MTN MoMo, Airtel Money, carte)
  const r = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: payment.id,
      amount: pack.rwf,
      currency: "RWF",
      redirect_url: back,
      payment_options: "mobilemoneyrwanda,card",
      customer: { email },
      customizations: { title: APP_NAME, description: label },
      configurations: { session_duration: 30 },
    }),
  });
  const d = await r.json();
  if (!r.ok || d.status !== "success") throw new Error("Flutterwave: " + JSON.stringify(d));
  return d.data.link as string;
}

// ---------- 2) Vérifier un paiement auprès du service, puis créditer ----------
export type VerifyResult = "paid" | "pending" | "failed";

export async function verifyStripe(admin: Admin, paymentId: string, sessionId: string): Promise<VerifyResult> {
  const { data: payment } = await admin.from("payments").select("*").eq("id", paymentId).single();
  if (!payment || payment.provider !== "stripe") return "failed";
  if (payment.status === "paid") return "paid";

  const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
  });
  const s = await r.json();
  if (!r.ok) return "pending";

  const ok = s.payment_status === "paid"
    && s.client_reference_id === payment.id
    && s.amount_total === payment.amount
    && String(s.currency).toLowerCase() === "eur";
  if (ok) { await admin.rpc("credit_payment", { p_payment: payment.id, p_provider_ref: s.id }); return "paid"; }
  if (s.status === "expired") { await markPaymentFailed(admin, payment.id); return "failed"; }
  return "pending";
}

export async function verifyFlutterwave(admin: Admin, paymentId: string, transactionId: string): Promise<VerifyResult> {
  const { data: payment } = await admin.from("payments").select("*").eq("id", paymentId).single();
  if (!payment || payment.provider !== "flutterwave") return "failed";
  if (payment.status === "paid") return "paid";
  if (!transactionId) return "pending";

  const r = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`, {
    headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` },
  });
  const d = await r.json();
  const t = d?.data;
  if (!r.ok || !t) return "pending";

  const ok = t.status === "successful"
    && t.tx_ref === payment.id
    && t.currency === "RWF"
    && Number(t.amount) >= payment.amount;
  if (ok) { await admin.rpc("credit_payment", { p_payment: payment.id, p_provider_ref: String(t.id) }); return "paid"; }
  if (t.status === "failed") { await markPaymentFailed(admin, payment.id); return "failed"; }
  return "pending";
}

async function markPaymentFailed(admin: Admin, id: string) {
  await admin.from("payments").update({ status: "failed" }).eq("id", id).eq("status", "pending");
}

// ---------- 3) Vérifier la signature des webhooks Stripe (sans librairie) ----------
export async function stripeSignatureValid(payload: string, header: string | null, secret: string) {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = parts["t"];
  const signatures = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!t || !signatures.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false; // plus de 5 minutes : refusé

  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`));
  const expected = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return signatures.some((s) => s === expected);
}
