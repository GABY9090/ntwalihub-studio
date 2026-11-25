"use client";
import { useState } from "react";
import type { Dict } from "@/lib/i18n";

// Encadré jaune : comment écrire une bonne demande (comme un scénario)
export default function PromptTips({
  t, onExample, next = false,
}: { t: Dict; onExample: (text: string) => void; next?: boolean }) {
  const [open, setOpen] = useState(!next);

  return (
    <div className="tips">
      <button type="button" className="tips-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>💡 {next ? t.tipsNextTitle : t.tipsTitle}</span>
        <span className="tips-toggle">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="tips-body">
          <p>{next ? t.tipsNextIntro : t.tipsIntro}</p>
          <ul>
            <li><b>{t.tipWho}</b> {t.tipWhoText}</li>
            <li><b>{t.tipWhere}</b> {t.tipWhereText}</li>
            <li><b>{t.tipWhat}</b> {t.tipWhatText}</li>
            <li><b>{t.tipCamera}</b> {t.tipCameraText}</li>
            <li><b>{t.tipMood}</b> {t.tipMoodText}</li>
          </ul>
          <p className="tips-warn">⚠️ {t.tipAvoid}</p>
          <button type="button" className="tips-example" onClick={() => onExample(next ? t.exampleNext : t.examplePrompt)}>
            ✨ {t.tipUseExample}
          </button>
        </div>
      )}
    </div>
  );
}
