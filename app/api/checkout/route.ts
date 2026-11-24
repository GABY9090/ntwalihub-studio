import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase";
import { findPack } from "@/lib/packs";
import { createCheckout, providersEnabled, type Provider } from "@/lib/payments";
import { getDict } from "@/lib/lang";

// Démarre un achat de crédits et renvoie le lien de la page de paiement
export async function POST(req: Request) {
  const { lang, t } = await getDict();
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t.errLogin }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const pack = findPack(String(body.pack ?? ""));
  const provider = body.provider as Provider;
  if (!pack || !["stripe", "flutterwave"].includes(provider)) {
    return NextResponse.json({ error: t.errServer }, { status: 400 });
  }
  if (!providersEnabled[provider]) {
    console.error(`❌ Paiement ${provider} pas configuré : ajoute sa clé dans .env.local`);
    return NextResponse.json({ error: t.payUnavailable }, { status: 503 });
  }

  try {
    const url = await createCheckout({
      admin: supabaseAdmin(), provider, pack,
      userId: user.id, email: user.email ?? "", origin: new URL(req.url).origin, lang,
    });
    return NextResponse.json({ url });
  } catch (e) {
    console.error("❌ Paiement :", e);
    return NextResponse.json({ error: t.payError }, { status: 502 });
  }
}
