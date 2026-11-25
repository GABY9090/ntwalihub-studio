import Link from "next/link";
import { supabaseServer } from "@/lib/supabase";
import { getDict } from "@/lib/lang";
import { isAdmin } from "@/lib/admin";
import UserMenu from "./UserMenu";
import CreditChip from "./CreditChip";
import LangSwitch from "./LangSwitch";

// Barre du haut, sur toutes les pages : logo, crédits, menu du compte
export default async function NavBar() {
  const { lang, t } = await getDict();
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("credits, display_name").eq("id", user.id).single()
    : { data: null };

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href={user ? "/studio" : "/"} className="brand">
          <span className="brand-logo">▶</span>
          <span>NtwaliHub <b>Studio</b></span>
        </Link>

        {user ? (
          <div className="nav-right">
            <CreditChip initial={profile?.credits ?? 0} label={t.credits} title={t.buyCredits} />
            <UserMenu
              t={t} lang={lang}
              email={user.email ?? ""}
              name={profile?.display_name ?? ""}
              admin={isAdmin(user.email)}
            />
          </div>
        ) : (
          <div className="nav-right">
            <LangSwitch lang={lang} />
            <Link href="/login" className="nav-link hide-sm">{t.tabLogin}</Link>
            <Link href="/login?mode=signup" className="btn small-btn">{t.tabSignup}</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
