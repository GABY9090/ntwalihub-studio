"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import type { Dict } from "@/lib/i18n";

type PackView = { id: string; credits: number; best?: boolean; rwfLabel: string; eurLabel: string };
type Provider = "stripe" | "flutterwave";

// Liste des packs : un clic sur un pack ouvre directement la page de paiement.
// Si la case des conditions n'est pas cochée, un message rouge s'affiche.
export default function PacksPicker({
  packs, t, stripe, flutterwave,
}: { packs: PackView[]; t: Dict; stripe: boolean; flutterwave: boolean }) {
  const [agreed, setAgreed] = useState(false);
  const [needConsent, setNeedConsent] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const consentRef = useRef<HTMLLabelElement>(null);

  // Moyen de paiement par défaut : la carte (Stripe), sinon Mobile Money
  const main: Provider | null = stripe ? "stripe" : flutterwave ? "flutterwave" : null;

  async function buy(packId: string, provider: Provider | null) {
    if (!provider || busy) return;
    if (!agreed) {
      setNeedConsent(true);
      consentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      // relance l'animation de secousse
      consentRef.current?.classList.remove("shake");
      void consentRef.current?.offsetWidth;
      consentRef.current?.classList.add("shake");
      return;
    }
    setBusy(packId);
    setErr("");
    const r = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pack: packId, provider }),
    });
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.url) window.location.href = d.url; // page de paiement sécurisée
    else { setErr(d.error ?? t.payError); setBusy(null); }
  }

  return (
    <>
      <label ref={consentRef} className={`consent card ${needConsent && !agreed ? "consent-error" : ""}`}>
        <input type="checkbox" checked={agreed}
          onChange={(e) => { setAgreed(e.target.checked); if (e.target.checked) setNeedConsent(false); }} />
        <span className="small">
          {t.consentBefore}{" "}
          <Link href="/legal/cgv" target="_blank">{t.terms}</Link>
          {t.consentAfter}
        </span>
      </label>
      {needConsent && !agreed && <p className="error consent-msg">⚠️ {t.consentRequired}</p>}

      {!main && <p className="muted">{t.payUnavailable}</p>}

      <div className="grid">
        {packs.map((p) => (
          <div key={p.id} role="button" tabIndex={0}
            className={`card pack pack-click ${p.best ? "best" : ""} ${busy === p.id ? "loading" : ""}`}
            onClick={() => buy(p.id, main)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); buy(p.id, main); } }}>
            {p.best && <span className="tag">{t.bestValue}</span>}
            <div className="big">{p.credits} {t.credits}</div>
            <p className="muted small">{t.packVideos.replace("{n}", String(p.credits))}</p>
            <div className="price">{main === "flutterwave" ? p.rwfLabel : p.eurLabel}</div>
            <div className="pay-cta">
              {busy === p.id ? t.sending : `${main === "flutterwave" ? "📱" : "💳"} ${t.buyNow}`}
            </div>
            {/* Si les deux moyens existent : lien secondaire pour l'autre */}
            {stripe && flutterwave && (
              <button type="button" className="link" disabled={!!busy}
                onClick={(e) => { e.stopPropagation(); buy(p.id, "flutterwave"); }}>
                📱 {t.payMomo} · {p.rwfLabel}
              </button>
            )}
          </div>
        ))}
      </div>
      {err && <p className="error">{err}</p>}
    </>
  );
}
