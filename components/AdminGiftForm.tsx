"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Offrir (ou retirer, avec un nombre négatif) des crédits à un utilisateur
export default function AdminGiftForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState(5);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const r = await fetch("/api/admin/credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, amount }),
    });
    const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? `✅ ${amount} crédit(s) pour ${email}. Nouveau solde : ${d.credits}` : `❌ ${d.error ?? "Erreur"}`);
    setBusy(false);
    if (r.ok) router.refresh();
  }

  return (
    <form onSubmit={submit} className="card row wrap-row">
      <input type="email" required placeholder="email@client.com" value={email}
        onChange={(e) => setEmail(e.target.value)} style={{ flex: 2, minWidth: 200 }} />
      <input type="number" required value={amount} onChange={(e) => setAmount(Number(e.target.value))}
        style={{ width: 100 }} />
      <button disabled={busy || !email || !amount}>{busy ? "…" : "Ajouter"}</button>
      {msg && <p className="small" style={{ width: "100%", margin: 0 }}>{msg}</p>}
    </form>
  );
}
