"use client";
import type { Dict } from "@/lib/i18n";
import { planClips } from "@/lib/storyboard";
import type { Aspect } from "./FormatPicker";

// Aperçu : ce qui va se passer toutes les 5 secondes, avant de dépenser des crédits
export default function StoryboardPreview({
  prompt, seconds, credits, aspect, t, busy, onAccept, onEdit,
}: {
  prompt: string; seconds: number; credits: number; aspect?: Aspect; t: Dict; busy: boolean;
  onAccept: () => void; onEdit: () => void;
}) {
  const total = Math.ceil(seconds / 5);
  const { plans, scene } = planClips(prompt, total);
  const hasDialogue = plans.some((p) => p.turns.length);
  const affordable = Math.min(total, credits);

  const defaultAction = (i: number) =>
    i === 1 ? t.sbStart : i === total ? t.sbEnd : t.sbContinue;

  return (
    <div className="storyboard">
      <div className="sb-head">
        <strong>🎬 {t.sbTitle}</strong>
        <span className="muted small">
          {total} {t.clips} · {seconds} s{aspect ? ` · ${aspect}` : ""} · {total} {t.credits}
        </span>
      </div>
      {scene && (
        <p className="sb-scene small"><b>{t.sbAll}</b> {scene.length > 260 ? scene.slice(0, 260) + "…" : scene}</p>
      )}

      <ol className="sb-list">
        {plans.map((p) => (
          <li key={p.index} className={p.index > affordable ? "sb-off" : ""}>
            <span className="sb-time">{p.from}–{p.to} s</span>
            <div className="sb-body">
              <span>🎥 {p.beat || defaultAction(p.index)}</span>
              {hasDialogue && (
                p.turns.length ? (
                  p.turns.map((tu, i) => (
                    <span key={i} className="sb-say">🗣️ <b>{tu.speaker || t.sbSomeone}</b> : « {tu.line} »</span>
                  ))
                ) : (
                  <span className="sb-say muted">🤫 {t.sbSilent}</span>
                )
              )}
            </div>
          </li>
        ))}
      </ol>

      {credits < total && (
        <p className="warn small">⚠️ {t.sbNotEnough.replace("{n}", String(credits)).replace("{s}", String(credits * 5))}</p>
      )}
      <p className="muted small">{t.sbNote}</p>

      <div className="row wrap-row">
        <button type="button" onClick={onAccept} disabled={busy || credits < 1}>
          {busy ? t.sending : `✅ ${t.sbAccept}`}
        </button>
        <button type="button" className="secondary" onClick={onEdit} disabled={busy}>✏️ {t.sbEdit}</button>
      </div>
    </div>
  );
}
