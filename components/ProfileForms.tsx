"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Dict } from "@/lib/i18n";
import NewPasswordForm from "./NewPasswordForm";

// Modifier le nom, changer le mot de passe, supprimer le compte
export default function ProfileForms({ t, email, displayName }: { t: Dict; email: string; displayName: string }) {
  const router = useRouter();
  const [name, setName] = useState(displayName);
  const [nameMsg, setNameMsg] = useState("");
  const [confirm, setConfirm] = useState("");
  const [delMsg, setDelMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await fetch("/api/profile", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ display_name: name }),
    });
    setNameMsg(r.ok ? `✅ ${t.saved}` : `❌ ${t.errServer}`);
    setBusy(false);
    router.refresh();
  }

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!window.confirm(t.deleteConfirmPopup)) return;
    setBusy(true);
    const r = await fetch("/api/profile", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm }),
    });
    if (r.ok) { window.location.href = "/"; return; }
    setDelMsg(`❌ ${t.deleteError}`);
    setBusy(false);
  }

  return (
    <>
      <h2>{t.profile}</h2>
      <form onSubmit={saveName} className="card">
        <label>{t.loginEmail}</label>
        <input value={email} disabled />
        <label>{t.displayName}</label>
        <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder={t.displayNamePh} />
        <button disabled={busy}>{t.save}</button>
        {nameMsg && <p className="small">{nameMsg}</p>}
      </form>

      <h2>{t.changePassword}</h2>
      <NewPasswordForm t={t} />

      <h2 className="error">{t.dangerZone}</h2>
      <form onSubmit={deleteAccount} className="card danger">
        <p className="small">{t.deleteText}</p>
        <label className="small">{t.deleteType.replace("{email}", email)}</label>
        <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={email} />
        <button className="danger-btn" disabled={busy || confirm.trim().toLowerCase() !== email.toLowerCase()}>{t.deleteButton}</button>
        {delMsg && <p className="small">{delMsg}</p>}
      </form>
    </>
  );
}
