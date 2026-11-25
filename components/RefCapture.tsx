"use client";
import { useEffect } from "react";

// Si quelqu'un arrive avec un lien de parrainage (?ref=CODE), on retient le code 30 jours
export default function RefCapture() {
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("ref");
    if (code && /^[A-Za-z0-9]{4,12}$/.test(code)) {
      document.cookie = `ref=${code.toUpperCase()}; path=/; max-age=${30 * 24 * 3600}; samesite=lax`;
    }
  }, []);
  return null;
}

export function readRefCookie() {
  if (typeof document === "undefined") return "";
  return document.cookie.split("; ").find((c) => c.startsWith("ref="))?.slice(4) ?? "";
}
