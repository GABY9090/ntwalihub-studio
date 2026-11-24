import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";
import { getDict } from "@/lib/lang";
import { PACKS } from "@/lib/packs";
import { providersEnabled } from "@/lib/payments";
import PacksPicker from "@/components/PacksPicker";

export default async function CreditsPage({ searchParams }: { searchParams: Promise<{ cancel?: string }> }) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { lang, t } = await getDict();
  const { cancel } = await searchParams;
  const { data: profile } = await supabase.from("profiles").select("credits").eq("id", user.id).single();

  const locale = lang === "fr" ? "fr-FR" : "en-US";
  const eur = (c: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(c / 100);
  const rwf = (n: number) => `${new Intl.NumberFormat(locale).format(n)} RWF`;

  return (
    <main className="wrap">
      <p className="small"><Link href="/studio">← {t.backStudio}</Link> · <span className="muted">{t.yourBalance} : <b>{profile?.credits ?? 0}</b> {t.credits}</span></p>
      <h1>{t.buyTitle}</h1>
      <p className="muted">{t.buyText}</p>
      {cancel && <p className="card small">{t.payCancelled}</p>}

      <PacksPicker
        t={t} stripe={providersEnabled.stripe} flutterwave={providersEnabled.flutterwave}
        packs={PACKS.map((p) => ({ id: p.id, credits: p.credits, best: p.best, rwfLabel: rwf(p.rwf), eurLabel: eur(p.eurCents) }))}
      />
      <p className="muted small" style={{ marginTop: 20 }}>{t.paySecure}</p>
    </main>
  );
}
