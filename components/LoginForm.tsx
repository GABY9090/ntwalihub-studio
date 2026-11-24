"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { Dict } from "@/lib/i18n";

export default function LoginForm({ t }: { t: Dict }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setErr(error.message);
    else setSent(true);
  }

  return (
    <main className="wrap narrow">
      <h1>{t.loginTitle}</h1>
      {sent ? (
        <p className="card">{t.loginSent}</p>
      ) : (
        <form onSubmit={submit} className="card">
          <label>{t.loginEmail}</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com" />
          <button type="submit">{t.loginButton}</button>
          {err && <p className="error">{err}</p>}
        </form>
      )}
    </main>
  );
}
