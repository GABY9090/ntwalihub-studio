"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Dict } from "@/lib/i18n";
import { detectAspect } from "@/lib/storyboard";
import DurationPicker from "./DurationPicker";
import PromptTips from "./PromptTips";
import FormatPicker, { type Aspect } from "./FormatPicker";
import StoryboardPreview from "./StoryboardPreview";

export default function NewProjectForm({ t, credits }: { t: Dict; credits: number }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [seconds, setSeconds] = useState(5);
  const [aspect, setAspect] = useState<Aspect>("9:16");
  const [aspectTouched, setAspectTouched] = useState(false);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // si le texte parle de « vertical », « 9:16 », « YouTube »… on règle le format tout seul
  function changePrompt(v: string) {
    setPrompt(v);
    setPreview(false);
    const found = detectAspect(v);
    if (found && !aspectTouched) setAspect(found);
  }

  async function generate() {
    setBusy(true);
    setMsg("");
    const r = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, seconds, aspect }),
    }).catch(() => null);
    // serveur injoignable (coupure réseau, serveur arrêté) : message clair au lieu d'une erreur
    if (!r) { setMsg(t.errNetwork); setBusy(false); return; }
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.id) router.push(`/studio/${d.id}`);
    else { setMsg(d.error ?? t.errServer); setBusy(false); }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // plus de 5 s : on montre d'abord le découpage, le client accepte, puis on génère
    if (seconds > 5) setPreview(true);
    else generate();
  }

  return (
    <form onSubmit={submit} className="card">
      <label>{t.newProject}</label>
      <PromptTips t={t} onExample={changePrompt} />
      <textarea rows={4} value={prompt} onChange={(e) => changePrompt(e.target.value)} placeholder={t.placeholder} />
      <DurationPicker value={seconds} onChange={(s) => { setSeconds(s); setPreview(false); }} credits={credits} t={t} />
      <FormatPicker value={aspect} onChange={(a) => { setAspect(a); setAspectTouched(true); }} t={t} />

      {preview ? (
        <StoryboardPreview
          prompt={prompt} seconds={seconds} credits={credits} aspect={aspect} t={t} busy={busy}
          onAccept={generate} onEdit={() => setPreview(false)}
        />
      ) : credits === 0 ? (
        <>
          <p className="muted small">{t.noCredits}</p>
          <Link href="/credits" className="btn">{t.buyCredits}</Link>
        </>
      ) : (
        <button disabled={busy || prompt.trim().length < 10}>
          {busy ? t.sending : seconds > 5 ? `👁️ ${t.sbSee}` : t.startProject}
        </button>
      )}
      {msg && <p className="error">{msg}</p>}
    </form>
  );
}
