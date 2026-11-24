// Filtre simple de départ, mot par mot. À renforcer plus tard
// (par exemple avec un modèle IA de modération).
const BLOCKED = [
  // contenus sexuels
  "nu", "nue", "nus", "nude", "naked", "sexe", "sex", "sexy", "porn", "porno",
  // violence extrême
  "gore", "décapité", "decapite", "massacre", "génocide", "genocide",
  // vraies personnes connues (deepfakes) : ajoute les noms à bloquer
  "kagame", "macron", "trump", "biden",
];

import type { Dict } from "./i18n";

export function checkPrompt(prompt: string, t: Dict): string | null {
  if (prompt.trim().length < 10) return t.errShort;
  if (prompt.length > 1000) return t.errLong;
  const words = prompt.toLowerCase().split(/[^\p{L}\p{N}]+/u);
  if (words.some((w) => BLOCKED.includes(w))) return t.errBlocked;
  return null;
}
