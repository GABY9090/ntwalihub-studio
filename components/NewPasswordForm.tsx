"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Dict } from "@/lib/i18n";
import { supabaseBrowser } from "@/lib/supabase-browser";

// Choisir un nouveau mot de passe (après oubli, ou depuis "Mon compte")
export default function NewPasswordForm({ t, after }: { t: Dict; after?: string }) {
  const router = useRouter();
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (p1.length < 8) return setMsg({ ok: false, text: t.errWeakPassword });
    if (p1 !== p2) return setMsg({ ok: false, text: t.errPasswordsDiffer });
    setBusy(true);
    const { error } = await supabaseBrowser().auth.updateUser({ password: p1 });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: error.message });
    setMsg({ ok: true, text: t.passwordChanged });
    setP1(""); setP2("");
    if (after) setTimeout(() => { router.push(after); router.refresh(); }, 1200);
  }

  return (
    <form onSubmit={submit} className="card">
      <label>{t.newPassword}</label>
      <input type="password" required minLength={8} autoComplete="new-password" value={p1} onChange={(e) => setP1(e.target.value)} />
      <label>{t.password2}</label>
      <input type="password" required minLength={8} autoComplete="new-password" value={p2} onChange={(e) => setP2(e.target.value)} />
      <p className="muted small">{t.passwordRule}</p>
      <button disabled={busy}>{busy ? t.sending : t.savePassword}</button>
      {msg && <p className={msg.ok ? "ok small" : "error small"}>{msg.text}</p>}
    </form>
  );
}
