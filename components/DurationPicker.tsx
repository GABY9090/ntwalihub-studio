"use client";
import type { Dict } from "@/lib/i18n";

export const DURATIONS = [5, 10, 15, 20, 30, 60, 120];

export function label(s: number) {
  return s < 60 ? `${s} s` : `${s / 60} min`;
}

export default function DurationPicker({
  value, onChange, credits, t,
}: { value: number; onChange: (s: number) => void; credits: number; t: Dict }) {
  const needed = Math.ceil(value / 5);
  return (
    <div className="duration">
      <label className="small">{t.duration}</label>
      <div className="chips">
        {DURATIONS.map((s) => (
          <button type="button" key={s} className={s === value ? "chip on" : "chip"} onClick={() => onChange(s)}>
            {label(s)}
          </button>
        ))}
      </div>
      <p className="muted small">
        {t.costHint.replace("{n}", String(needed))}
        {needed > credits && credits > 0 && <> · <span className="warn">{t.partialHint.replace("{s}", label(credits * 5))}</span></>}
      </p>
    </div>
  );
}
