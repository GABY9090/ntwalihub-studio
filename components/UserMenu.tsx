"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Dict, Lang } from "@/lib/i18n";

// Menu du compte : avatar rond, puis liste (projets, compte, crédits, langue, admin, déconnexion)
export default function UserMenu({
  t, lang, email, name, admin,
}: { t: Dict; lang: Lang; email: string; name: string; admin: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const initial = (name || email).trim().charAt(0).toUpperCase() || "?";

  // Ferme le menu si on clique ailleurs ou appuie sur Échap
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, [open]);

  function setLang(l: Lang) {
    document.cookie = `lang=${l}; path=/; max-age=31536000`;
    router.refresh();
  }

  return (
    <div className="menu" ref={box}>
      <button className="avatar" onClick={() => setOpen(!open)} aria-label={t.myAccount} aria-expanded={open}>
        {initial}
      </button>
      {open && (
        <div className="menu-panel" onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setOpen(false); }}>
          <div className="menu-head">
            <div className="avatar big">{initial}</div>
            <div>
              {name && <strong>{name}</strong>}
              <span className="muted small">{email}</span>
            </div>
          </div>
          <Link href="/studio" className="menu-item">🎬 {t.myProjects}</Link>
          <Link href="/compte" className="menu-item">👤 {t.myAccount}</Link>
          <Link href="/credits" className="menu-item">💳 {t.buyCredits}</Link>
          <div className="menu-item lang-row">
            <span>🌍 {t.language}</span>
            <span className="seg">
              <button className={lang === "fr" ? "on" : ""} onClick={() => setLang("fr")}>FR</button>
              <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>EN</button>
            </span>
          </div>
          <div className="menu-sep" />
          <form action="/auth/signout" method="post">
            <button className="menu-item danger-text">↩ {t.logout}</button>
          </form>
          {admin && (
            <>
              <div className="menu-sep" />
              <Link href="/admin" className="menu-item admin-item">🛠️ {t.adminArea}</Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
