"use client";
import { useState } from "react";
import Link from "next/link";
import type { Dict } from "@/lib/i18n";
import BuyButtons from "./BuyButtons";

type PackView = { id: string; credits: number; best?: boolean; rwfLabel: string; eurLabel: string };

// Liste des packs + case à cocher obligatoire (CGV + renonciation au droit de rétractation)
export default function PacksPicker({
  packs, t, stripe, flutterwave,
}: { packs: PackView[]; t: Dict; stripe: boolean; flutterwave: boolean }) {
  const [agreed, setAgreed] = useState(false);

  return (
    <>
      <label className="consent card">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        <span className="small">
          {t.consentBefore}{" "}
          <Link href="/legal/cgv" target="_blank">{t.terms}</Link>
          {t.consentAfter}
        </span>
      </label>

      <div className="grid">
        {packs.map((p) => (
          <div key={p.id} className={`card pack ${p.best ? "best" : ""}`}>
            {p.best && <span className="tag">{t.bestValue}</span>}
            <div className="big">{p.credits} {t.credits}</div>
            <p className="muted small">{t.packVideos.replace("{n}", String(p.credits))}</p>
            <BuyButtons
              packId={p.id} t={t} stripe={stripe} flutterwave={flutterwave}
              rwfLabel={p.rwfLabel} eurLabel={p.eurLabel} disabled={!agreed}
            />
          </div>
        ))}
      </div>
      {!agreed && <p className="muted small">{t.consentNeeded}</p>}
    </>
  );
}
