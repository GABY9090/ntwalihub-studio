"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Dict } from "@/lib/i18n";
import DurationPicker, { label } from "./DurationPicker";
import PromptTips from "./PromptTips";
import StoryboardPreview from "./StoryboardPreview";
import { announceCredits } from "./CreditChip";

type Clip = { id: string; part_clip: number; status: "pending" | "ready"; video_url: string | null };
type Part = {
  id: string; part_number: number; prompt: string; requested_clips: number;
  status: "running" | "done" | "no_credits" | "failed"; clips: Clip[];
  merge_status: "none" | "merging" | "ready" | "failed"; merged_url: string | null;
};
type Data = {
  project: { title: string; final_status: "none" | "merging" | "ready" | "failed"; final_url: string | null; final_clip_count: number | null };
  parts: Part[]; readyCount: number; credits: number;
};

export default function ProjectView({ id, title, t }: { id: string; title: string; t: Dict }) {
  const [data, setData] = useState<Data | null>(null);
  const [prompt, setPrompt] = useState("");
  const [seconds, setSeconds] = useState(5);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [preview, setPreview] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/projects/${id}`, { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setData(d);
      announceCredits(d.credits ?? 0);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Rafraîchit toutes les 5 s tant que quelque chose est en cours
  const working = !!data && (
    data.parts.some((p) => p.status === "running" || p.merge_status === "merging")
    || data.project.final_status === "merging"
  );
  useEffect(() => {
    if (!working) return;
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [working, load]);

  async function post(path: string, body: unknown) {
    setBusy(true);
    setMsg("");
    const r = await fetch(`/api/projects/${id}${path}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) setMsg(d.error ?? t.errServer);
    setBusy(false);
    await load();
    return r.ok;
  }

  async function generatePart() {
    if (await post("/parts", { prompt, seconds })) {
      setPrompt("");
      setPreview(false);
      setTimeout(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), 300);
    }
  }

  function nextPart(e: React.FormEvent) {
    e.preventDefault();
    // plus de 5 s : on montre d'abord le découpage, puis on génère après accord
    if (seconds > 5) setPreview(true);
    else generatePart();
  }

  const credits = data?.credits ?? 0;
  const nextNumber = (data?.parts.length ?? 0) + 1;
  const fp = data?.project;
  const exportUpToDate = fp?.final_status === "ready" && fp.final_clip_count === data?.readyCount;

  return (
    <main className="wrap">
      <header className="top">
        <Link href="/studio" className="small">← {t.myProjects}</Link>
        <span className="muted small">{credits} {t.credits}</span>
      </header>
      <h1 className="title">{title}</h1>

      {/* Fichier complet (assemblé automatiquement quand il y a plusieurs parties) */}
      {!!data?.readyCount && (data?.parts.length ?? 0) > 1 && (
        <div className="card export">
          <span>
            🎞️ {t.fullSeries} : {data.readyCount} {t.clips} · {label(data.readyCount * 5)}
          </span>
          {exportUpToDate && fp?.final_url ? (
            <a href={fp.final_url} download className="btn">⬇ {t.downloadFull}</a>
          ) : fp?.final_status === "merging" || working ? (
            <span className="muted small">{t.fullSoon}</span>
          ) : (
            <button onClick={() => post("/export", {})} disabled={busy}>{t.buildFull}</button>
          )}
        </div>
      )}

      {/* Les parties, comme les messages d'une conversation */}
      {!data && <p className="muted">…</p>}
      {data?.parts.map((p) => {
        const ready = p.clips.filter((c) => c.status === "ready").length;
        return (
          <section key={p.id} className="part">
            <div className="bubble">
              <span className="muted small">{t.part} {p.part_number}</span>
              <p>{p.prompt}</p>
            </div>
            <div className="card">
              <div className="progress-line small">
                <span>
                  {ready}/{p.requested_clips} {t.clips} · {label(ready * 5)} / {label(p.requested_clips * 5)}
                </span>
                <span>
                  {p.status === "running" && `⏳ ${t.generating}`}
                  {p.status === "done" && `✅ ${t.partDone}`}
                  {p.status === "no_credits" && `⛔ ${t.creditsOut}`}
                  {p.status === "failed" && `❌ ${t.partFailed}`}
                </span>
              </div>
              <div className="bar"><div style={{ width: `${(ready / p.requested_clips) * 100}%` }} /></div>

              {/* Vidéo collée : tous les clips de la partie en une seule vidéo */}
              {p.merge_status === "ready" && p.merged_url && (
                <>
                  <video key={p.merged_url} src={p.merged_url} controls playsInline preload="metadata" className="vid big-vid" />
                  <a href={p.merged_url} download className="small">⬇ {t.downloadPart.replace("{s}", label(ready * 5))}</a>
                </>
              )}
              {p.merge_status === "failed" && (
                <button className="link small" disabled={busy}
                  onClick={() => post("/merge-part", { partId: p.id })}>↻ {t.mergeAgain}</button>
              )}

              {/* Les clips de 5 s : visibles pendant la génération, repliés ensuite */}
              {p.merge_status !== "ready" || !p.merged_url || p.status === "running" ? (
                <div className="clips">{clipList(p.clips, t)}</div>
              ) : p.clips.length > 1 && (
                <details>
                  <summary className="small muted">{t.seeClips.replace("{n}", String(p.clips.length))}</summary>
                  <div className="clips">{clipList(p.clips, t)}</div>
                </details>
              )}

              {p.status === "no_credits" && (
                <div className="row wrap-row">
                  <span className="small">{t.creditsOutText}</span>
                  <Link href="/credits" className="btn small-btn">{t.buyCredits}</Link>
                  <button className="secondary small-btn" disabled={busy || credits < 1}
                    onClick={() => post("/resume", { partId: p.id })}>{t.continue}</button>
                </div>
              )}
              {p.status === "failed" && (
                <div className="row wrap-row">
                  <span className="small">{t.partFailedText}</span>
                  <button className="secondary small-btn" disabled={busy || credits < 1}
                    onClick={() => post("/resume", { partId: p.id })}>{t.tryAgain}</button>
                </div>
              )}
            </div>
          </section>
        );
      })}

      {/* Partie suivante */}
      {data && (
        <form onSubmit={nextPart} className="card next">
          <label>{t.nextPart.replace("{n}", String(nextNumber))}</label>
          <PromptTips t={t} next onExample={setPrompt} />
          <textarea rows={3} value={prompt} onChange={(e) => { setPrompt(e.target.value); setPreview(false); }}
            placeholder={t.nextPlaceholder} disabled={working} />
          <DurationPicker value={seconds} onChange={(s) => { setSeconds(s); setPreview(false); }} credits={credits} t={t} />
          {preview ? (
            <StoryboardPreview
              prompt={prompt} seconds={seconds} credits={credits} t={t} busy={busy}
              onAccept={generatePart} onEdit={() => setPreview(false)}
            />
          ) : credits === 0 ? (
            <Link href="/credits" className="btn">{t.buyCredits}</Link>
          ) : (
            <button disabled={busy || working || prompt.trim().length < 10}>
              {working ? t.waitPart : seconds > 5 ? `👁️ ${t.sbSee}` : t.generatePart.replace("{n}", String(nextNumber))}
            </button>
          )}
          {msg && <p className="error">{msg}</p>}
        </form>
      )}
      <div ref={bottom} />
    </main>
  );
}

function clipList(clips: Clip[], t: Dict) {
  return clips.map((c) => c.status === "ready" && c.video_url ? (
    <video key={c.id} src={c.video_url} controls playsInline preload="metadata" className="vid" />
  ) : (
    <div key={c.id} className="placeholder small">⏳ {t.clip} {c.part_clip}</div>
  ));
}
