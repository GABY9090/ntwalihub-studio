// Qui peut voir la page /admin : liste d'e-mails séparés par des virgules (variable ADMIN_EMAILS).
const DEFAULT_ADMINS = "ntwaligag@gmail.com,contact@ntwalihub.com";

export function isAdmin(email?: string | null) {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS || DEFAULT_ADMINS)
    .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.toLowerCase());
}

// Coût fal.ai estimé par seconde de vidéo (H3 Max 768p : 0,08 $). Modifiable via FAL_COST_PER_SECOND.
export const FAL_COST_PER_SECOND = Number(process.env.FAL_COST_PER_SECOND || 0.08);
// Taux pour convertir les dollars en euros dans les estimations
export const USD_TO_EUR = Number(process.env.USD_TO_EUR || 0.92);
