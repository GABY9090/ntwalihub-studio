"use client";
import type { Dict } from "@/lib/i18n";

export type Aspect = "9:16" | "16:9" | "1:1";

// Choix du format de la vidéo
export default function FormatPicker({ value, onChange, t }: { value: Aspect; onChange: (a: Aspect) => void; t: Dict }) {
  const options: { v: Aspect; icon: string; label: string; hint: string }[] = [
    { v: "9:16", icon: "📱", label: t.fmtVertical, hint: "TikTok · Reels · Shorts" },
    { v: "16:9", icon: "🖥️", label: t.fmtHorizontal, hint: "YouTube · TV" },
    { v: "1:1", icon: "⬛", label: t.fmtSquare, hint: "Instagram · Facebook" },
  ];
  return (
    <div className="duration">
      <label className="small">{t.format}</label>
      <div className="formats">
        {options.map((o) => (
          <button type="button" key={o.v} className={o.v === value ? "fmt on" : "fmt"} onClick={() => onChange(o.v)}>
            <span className={`fmt-shape s${o.v.replace(":", "x")}`} />
            <span className="fmt-text">
              <b>{o.icon} {o.label}</b>
              <span>{o.v} · {o.hint}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
