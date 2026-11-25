import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";
import { getDict } from "@/lib/lang";
import ProfileForms from "@/components/ProfileForms";
import ReferralCard from "@/components/ReferralCard";
import { supabaseAdmin } from "@/lib/supabase";
import { LEGAL } from "@/lib/legal";

// "Mon compte" : voir son profil, le modifier, changer de mot de passe, supprimer le compte
export default async function AccountPage() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { lang, t } = await getDict();

  const [{ data: profile }, { data: history }, projects, clips] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("transactions").select("amount, reason, created_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("projects").select("id", { count: "exact", head: true }),
    supabase.from("videos").select("id", { count: "exact", head: true }).eq("status", "ready"),
  ]);
  // Parrainage : amis invités, amis ayant acheté, crédits gagnés
  const admin = supabaseAdmin();
  const [{ count: invited }, { count: rewarded }, { data: refTx }] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("referred_by", user.id),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("referred_by", user.id).eq("referral_rewarded", true),
    admin.from("transactions").select("amount").eq("user_id", user.id).eq("reason", "parrainage"),
  ]);
  const earned = (refTx ?? []).reduce((s, x) => s + x.amount, 0);
  const refLink = profile?.referral_code ? `${LEGAL.siteUrl}/?ref=${profile.referral_code}` : "";

  const date = (d: string) => new Date(d).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", { day: "numeric", month: "short", year: "numeric" });
  const reason = (r: string) => ({ bienvenue: t.rWelcome, achat: t.rPurchase, video: t.rVideo, remboursement: t.rRefund, "cadeau admin": t.rGift, parrainage: t.rReferral } as Record<string, string>)[r] ?? r;

  return (
    <main className="wrap narrow-text">
      <div className="top">
        <h1>{t.myAccount}</h1>
        <form action="/auth/signout" method="post"><button className="secondary small-btn">{t.logout}</button></form>
      </div>

      <div className="kpis">
        <div className="card kpi"><span className="muted small">{t.credits}</span><strong>{profile?.credits ?? 0}</strong>
          <Link href="/credits" className="small">{t.buyCredits}</Link></div>
        <div className="card kpi"><span className="muted small">{t.myProjects}</span><strong>{projects.count ?? 0}</strong></div>
        <div className="card kpi"><span className="muted small">{t.clips}</span><strong>{clips.count ?? 0}</strong>
          <span className="muted small">{Math.round((clips.count ?? 0) * 5 / 60)} min</span></div>
        <div className="card kpi"><span className="muted small">{t.memberSince}</span><strong className="small-strong">{profile ? date(profile.created_at) : "—"}</strong></div>
      </div>

      {refLink && <ReferralCard t={t} link={refLink} invited={invited ?? 0} rewarded={rewarded ?? 0} earned={earned} />}

      <ProfileForms t={t} email={user.email ?? ""} displayName={profile?.display_name ?? ""} />

      <h2>{t.creditHistory}</h2>
      <div className="table-wrap admin">
        <table>
          <tbody>
            {(history ?? []).map((h, i) => (
              <tr key={i}>
                <td>{date(h.created_at)}</td>
                <td>{reason(h.reason)}</td>
                <td className={h.amount > 0 ? "ok" : "muted"}>{h.amount > 0 ? `+${h.amount}` : h.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
