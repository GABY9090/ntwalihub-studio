"use client";
import { useState } from "react";
import type { Dict } from "@/lib/i18n";

export default function BuyButtons({
  packId, t, stripe, flutterwave, rwfLabel, eurLabel, disabled = false,
}: {
  packId: string; t: Dict; stripe: boolean; flutterwave: boolean; rwfLabel: string; eurLabel: string; disabled?: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");

  async function buy(provider: "stripe" | "flutterwave") {
    setBusy(provider);
    setErr("");
    const r = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pack: packId, provider }),
    });
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.url) {
      window.location.href = d.url; // page de paiement sécurisée
    } else {
      setErr(d.error ?? t.payError);
      setBusy(null);
    }
  }

  return (
    <div className="buy">
      {flutterwave && (
        <button onClick={() => buy("flutterwave")} disabled={!!busy || disabled}>
          {busy === "flutterwave" ? t.sending : `📱 ${t.payMomo} · ${rwfLabel}`}
        </button>
      )}
      {stripe && (
        <button className="secondary" onClick={() => buy("stripe")} disabled={!!busy || disabled}>
          {busy === "stripe" ? t.sending : `💳 ${t.payCard} · ${eurLabel}`}
        </button>
      )}
      {!stripe && !flutterwave && <p className="muted small">{t.payUnavailable}</p>}
      {err && <p className="error small">{err}</p>}
    </div>
  );
}
