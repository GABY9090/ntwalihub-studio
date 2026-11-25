"use client";
import { useRef, useState } from "react";
import type { Dict } from "@/lib/i18n";

// Enregistre la vidéo sur l'appareil :
// - téléphone (iPhone / Android) : menu de partage -> « Enregistrer la vidéo » -> Photos / Galerie
// - ordinateur : fichier MP4 enregistré dans Téléchargements
export default function SaveVideoButton({
  url, filename, t, label, className = "btn",
}: { url: string; filename: string; t: Dict; label?: string; className?: string }) {
  const fileRef = useRef<File | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "tap" | "done">("idle");

  const isMobile = () =>
    typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  async function getFile() {
    if (fileRef.current) return fileRef.current;
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    fileRef.current = new File([blob], filename, { type: blob.type || "video/mp4" });
    return fileRef.current;
  }

  function downloadOnComputer(file: File) {
    const link = document.createElement("a");
    const objectUrl = URL.createObjectURL(file);
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
  }

  async function shareOnPhone(file: File) {
    await navigator.share({ files: [file], title: "NtwaliHub Studio" });
  }

  async function save() {
    try {
      // 2e appui sur téléphone : le fichier est prêt, on ouvre tout de suite le menu
      if (state === "tap" && fileRef.current) {
        await shareOnPhone(fileRef.current);
        setState("done");
        return;
      }
      setState("loading");
      const file = await getFile();
      const canShareFile = isMobile() && !!navigator.canShare?.({ files: [file] });
      if (canShareFile) {
        try {
          await shareOnPhone(file);
          setState("done");
        } catch (e) {
          // le téléphone exige un nouvel appui après le téléchargement
          if ((e as Error).name === "NotAllowedError") setState("tap");
          else if ((e as Error).name === "AbortError") setState("idle"); // menu fermé
          else throw e;
        }
      } else {
        downloadOnComputer(file);
        setState("done");
      }
    } catch {
      // dernier recours : ouvrir la vidéo (on peut alors l'enregistrer depuis le lecteur)
      window.open(url, "_blank", "noopener");
      setState("idle");
    }
  }

  const text =
    state === "loading" ? t.savePreparing
      : state === "tap" ? `📲 ${t.saveTapAgain}`
        : state === "done" ? `✅ ${t.saveDone}`
          : `⬇ ${label ?? t.saveVideo}`;

  return (
    <div className="save-video">
      <button type="button" className={className} onClick={save} disabled={state === "loading"}>{text}</button>
      {state === "tap" && <span className="muted small">{t.saveHint}</span>}
    </div>
  );
}
