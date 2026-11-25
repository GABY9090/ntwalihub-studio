"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Dict } from "@/lib/i18n";
import DurationPicker from "./DurationPicker";
import PromptTips from "./PromptTips";

export default function NewProjectForm({ t, credits }: { t: Dict; credits: number }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [seconds, setSeconds] = useState(5);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const r = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, seconds }),
    });
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.id) router.push(`/studio/${d.id}`);
    else { setMsg(d.error ?? t.errServer); setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="card">
      <label>{t.newProject}</label>
      <PromptTips t={t} onExample={setPrompt} />
      <textarea rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={t.placeholder} />
      <DurationPicker value={seconds} onChange={setSeconds} credits={credits} t={t} />
      {credits === 0 ? (
        <>
          <p className="muted small">{t.noCredits}</p>
          <Link href="/credits" className="btn">{t.buyCredits}</Link>
        </>
      ) : (
        <button disabled={busy || prompt.trim().length < 10}>{busy ? t.sending : t.startProject}</button>
      )}
      {msg && <p className="error">{msg}</p>}
    </form>
  );
}
