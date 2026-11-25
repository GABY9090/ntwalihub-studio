"use client";
import { useState } from "react";
import type { Dict } from "@/lib/i18n";

// Section "Parrainage" de Mon compte : lien à partager + statistiques
export default function ReferralCard({
  t, link, invited, rewarded, earned,
}: { t: Dict; link: string; invited: number; rewarded: number; earned: number }) {
  const [copied, setCopied] = useState(false);
  const message = t.refShareText.replace("{link}", link);

  async function copy() {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  }
  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: "NtwaliHub Studio", text: message, url: link }); } catch {}
    } else copy();
  }

  return (
    <div className="card referral" id="parrainage">
      <strong className="ref-title">🎁 {t.refTitle}</strong>
      <p className="small">{t.refText}</p>
      <div className="ref-link">
        <input readOnly value={link} onFocus={(e) => e.target.select()} />
        <button type="button" onClick={copy}>{copied ? `✅ ${t.refCopied}` : t.refCopy}</button>
      </div>
      <div className="row wrap-row">
        <a className="btn small-btn whatsapp" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        <button type="button" className="secondary small-btn" onClick={share}>{t.refShare}</button>
      </div>
      <div className="ref-stats small">
        <span><b>{invited}</b> {t.refInvited}</span>
        <span><b>{rewarded}</b> {t.refBought}</span>
        <span><b>+{earned}</b> {t.refEarned}</span>
      </div>
    </div>
  );
}
