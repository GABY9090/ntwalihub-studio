"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Dict } from "@/lib/i18n";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { readRefCookie } from "./RefCapture";

type Mode = "login" | "signup" | "forgot";

// Traduit les messages d'erreur de Supabase
function errorText(message: string, t: Dict) {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return t.errInvalidLogin;
  if (m.includes("not confirmed")) return t.errNotConfirmed;
  if (m.includes("already registered") || m.includes("already been registered")) return t.errAlreadyRegistered;
  if (m.includes("password") && (m.includes("least") || m.includes("weak"))) return t.errWeakPassword;
  if (m.includes("rate limit") || m.includes("too many")) return t.errRateLimit;
  return message;
}

export default function AuthForm({ t, start, linkError }: { t: Dict; start: Mode; linkError: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(start);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(linkError ? t.errLink : "");
  const [info, setInfo] = useState("");
  const [canResend, setCanResend] = useState(false);
  const [hasRef, setHasRef] = useState(false);
  useEffect(() => { setHasRef(!!readRefCookie()); }, []);

  function switchTo(m: Mode) { setMode(m); setErr(""); setInfo(""); setCanResend(false); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setInfo(""); setBusy(true);
    const supabase = supabaseBrowser();
    const origin = window.location.origin;

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErr(errorText(error.message, t));
        setCanResend(error.message.toLowerCase().includes("not confirmed"));
      } else { router.push("/studio"); router.refresh(); return; }
    }

    if (mode === "signup") {
      if (password.length < 8) { setErr(t.errWeakPassword); setBusy(false); return; }
      if (password !== password2) { setErr(t.errPasswordsDiffer); setBusy(false); return; }
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=/studio`,
          data: readRefCookie() ? { ref: readRefCookie() } : undefined,
        },
      });
      if (error) setErr(errorText(error.message, t));
      // Supabase ne dit pas si l'e-mail existe déjà (sécurité) : identities vide = déjà inscrit
      else if (data.user && data.user.identities?.length === 0) setErr(t.errAlreadyRegistered);
      else { setInfo(t.signupSent.replace("{email}", email)); setCanResend(true); setPassword(""); setPassword2(""); }
    }

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/compte/mot-de-passe`,
      });
      if (error) setErr(errorText(error.message, t));
      else setInfo(t.resetSent.replace("{email}", email));
    }
    setBusy(false);
  }

  async function resend() {
    setBusy(true);
    const { error } = await supabaseBrowser().auth.resend({
      type: "signup", email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/studio` },
    });
    setErr(error ? errorText(error.message, t) : "");
    setInfo(error ? "" : t.resendDone);
    setBusy(false);
  }

  return (
    <main className="wrap narrow">
      <h1>{mode === "signup" ? t.signupTitle : mode === "forgot" ? t.forgotTitle : t.loginTitle}</h1>

      {mode !== "forgot" && (
        <div className="tabs">
          <button type="button" className={mode === "login" ? "tab on" : "tab"} onClick={() => switchTo("login")}>{t.tabLogin}</button>
          <button type="button" className={mode === "signup" ? "tab on" : "tab"} onClick={() => switchTo("signup")}>{t.tabSignup}</button>
        </div>
      )}
      {mode === "signup" && <p className="muted small">🎁 {t.signupGift}</p>}
      {mode === "signup" && hasRef && <p className="ok small">🤝 {t.refInvitedBanner}</p>}
      {mode === "forgot" && <p className="muted small">{t.forgotText}</p>}

      <form onSubmit={submit} className="card">
        <label>{t.loginEmail}</label>
        <input type="email" required autoComplete="email" value={email}
          onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />

        {mode !== "forgot" && (
          <>
            <label>{t.password}</label>
            <input type="password" required minLength={mode === "signup" ? 8 : 1}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password} onChange={(e) => setPassword(e.target.value)} />
          </>
        )}
        {mode === "signup" && (
          <>
            <label>{t.password2}</label>
            <input type="password" required minLength={8} autoComplete="new-password"
              value={password2} onChange={(e) => setPassword2(e.target.value)} />
            <p className="muted small">{t.passwordRule}</p>
          </>
        )}

        <button type="submit" disabled={busy}>
          {busy ? t.sending : mode === "signup" ? t.signupButton : mode === "forgot" ? t.forgotButton : t.loginButton}
        </button>

        {err && <p className="error small">{err}</p>}
        {info && <p className="ok small">{info}</p>}
        {canResend && <button type="button" className="secondary small-btn" disabled={busy || !email} onClick={resend}>{t.resend}</button>}

        {mode === "login" && <button type="button" className="link" onClick={() => switchTo("forgot")}>{t.forgotLink}</button>}
        {mode === "forgot" && <button type="button" className="link" onClick={() => switchTo("login")}>← {t.backToLogin}</button>}
      </form>
    </main>
  );
}
