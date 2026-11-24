"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Dict } from "@/lib/i18n";

type Video = { id: string; prompt: string; status: "pending" | "ready" | "failed"; video_url: string | null };

export default function Studio({ email, t }: { email: string; t: Dict }) {
  const [prompt, setPrompt] = useState("");
  const [credits, setCredits] = useState<number | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/videos", { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setCredits(d.credits);
      setVideos(d.videos);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Tant qu'une vidéo est en cours, on rafraîchit toutes les 5 secondes
  useEffect(() => {
    if (!videos.some((v) => v.status === "pending")) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [videos, load]);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const r = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const d = await r.json();
    if (!r.ok) setMsg(d.error ?? t.errServer);
    else setPrompt("");
    setBusy(false);
    load();
  }

  return (
    <main className="wrap">
      <header className="top">
        <strong>🎬 Studio</strong>
        <span className="row">
          <span className="pill">{credits ?? "…"} {t.credits}</span>
          <Link href="/credits" className="btn small-btn">{t.buyCredits}</Link>
        </span>
      </header>
      <p className="muted small">{email}</p>

      <form onSubmit={generate} className="card">
        <label>{t.describe}</label>
        <textarea rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)}
          placeholder={t.placeholder} />
        {credits === 0 ? (
          <>
            <p className="muted small">{t.noCredits}</p>
            <Link href="/credits" className="btn">{t.buyCredits}</Link>
          </>
        ) : (
          <button disabled={busy || prompt.trim().length < 10}>
            {busy ? t.sending : t.generate}
          </button>
        )}
        {msg && <p className="error">{msg}</p>}
      </form>

      <h2>{t.myVideos}</h2>
      {videos.length === 0 && <p className="muted">{t.noVideos}</p>}
      <div className="grid">
        {videos.map((v) => (
          <div key={v.id} className="card">
            {v.status === "ready" && v.video_url && (
              <video src={v.video_url} controls playsInline className="vid" />
            )}
            {v.status === "pending" && <div className="placeholder">{t.pending}</div>}
            {v.status === "failed" && <div className="placeholder">{t.failed}</div>}
            <p className="small">{v.prompt}</p>
            {v.status === "ready" && v.video_url && (
              <a href={v.video_url} download className="small">{t.download}</a>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
