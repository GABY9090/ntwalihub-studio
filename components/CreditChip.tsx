"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Pastille de crédits de la barre du haut, toujours à jour :
// - se met à jour quand une page annonce un nouveau solde (événement "credits")
// - se recharge à chaque changement de page et quand on revient sur l'onglet
export default function CreditChip({ initial, label, title }: { initial: number; label: string; title: string }) {
  const [credits, setCredits] = useState(initial);
  const pathname = usePathname();

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      const r = await fetch("/api/me", { cache: "no-store" }).catch(() => null);
      if (r?.ok && alive) setCredits((await r.json()).credits ?? 0);
    };
    refresh();
    const onCredits = (e: Event) => setCredits((e as CustomEvent<number>).detail);
    const onFocus = () => refresh();
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("credits", onCredits);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      window.removeEventListener("credits", onCredits);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pathname]);

  return (
    <Link href="/credits" className="credit-chip" title={title}>
      <span className="dot" /> {credits} <span className="hide-sm">{label}</span>
      <span className="plus">＋</span>
    </Link>
  );
}

// À appeler depuis n'importe quelle page qui connaît le nouveau solde
export function announceCredits(n: number) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("credits", { detail: n }));
}
