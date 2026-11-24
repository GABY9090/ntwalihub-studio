import { cookies, headers } from "next/headers";
import { dict, LANGS, type Lang } from "./i18n";

// Langue choisie : d'abord le bouton FR/EN (cookie), sinon la langue du téléphone/navigateur.
export async function getLang(): Promise<Lang> {
  const c = (await cookies()).get("lang")?.value;
  if (c && (LANGS as readonly string[]).includes(c)) return c as Lang;
  const accept = (await headers()).get("accept-language") ?? "";
  return accept.toLowerCase().startsWith("fr") ? "fr" : "en";
}

export async function getDict() {
  const lang = await getLang();
  return { lang, t: dict[lang] };
}
