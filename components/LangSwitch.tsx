"use client";
import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/i18n";

export default function LangSwitch({ lang }: { lang: Lang }) {
  const router = useRouter();
  function set(l: Lang) {
    document.cookie = `lang=${l}; path=/; max-age=31536000`;
    router.refresh();
  }
  return (
    <div className="lang">
      <button className={lang === "fr" ? "on" : ""} onClick={() => set("fr")}>FR</button>
      <button className={lang === "en" ? "on" : ""} onClick={() => set("en")}>EN</button>
    </div>
  );
}
