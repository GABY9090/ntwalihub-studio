import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { FAL_COST_PER_SECOND, USD_TO_EUR, isAdmin } from "@/lib/admin";
import AdminGiftForm from "@/components/AdminGiftForm";

export const dynamic = "force-dynamic";

// Tableau de bord administrateur : ventes, coûts, utilisateurs, derniers paiements.
export default async function AdminPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.email)) {
    return (
      <main className="wrap narrow hero">
        <h1>🔒</h1>
        <p className="card">Accès réservé à l&apos;administrateur. Tu es connecté avec <b>{user.email}</b>.</p>
        <Link href="/studio" className="btn">Retour au studio</Link>
      </main>
    );
  }

  const admin = supabaseAdmin();
  const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const errors: string[] = [];
  // Exécute une requête ; en cas d'erreur, note-la et continue avec une valeur vide
  async function safe<T>(label: string, run: () => PromiseLike<{ data: T | null; error: { message: string } | null }>, empty: T): Promise<T> {
    try {
      const { data, error } = await run();
      if (error) { errors.push(`${label} : ${error.message}`); return empty; }
      return data ?? empty;
    } catch (e) { errors.push(`${label} : ${String(e)}`); return empty; }
  }
  async function count(label: string, run: () => PromiseLike<{ count: number | null; error: { message: string } | null }>) {
    try {
      const { count: n, error } = await run();
      if (error) { errors.push(`${label} : ${error.message}`); return 0; }
      return n ?? 0;
    } catch (e) { errors.push(`${label} : ${String(e)}`); return 0; }
  }
  type Payment = { id: string; user_id: string | null; status: string; currency: string; amount: number; credits: number; provider: string; created_at: string; paid_at: string | null };
  type Profile = { id: string; credits: number; created_at: string; referred_by?: string | null; referral_rewarded?: boolean };

  const [usersList, payments, profiles, clipsReady, clipsFailed, clipsPending, clipsReady30, projectsCount, recentVideos] = await Promise.all([
    (async () => {
      try {
        const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (error) errors.push(`Utilisateurs : ${error.message}`);
        return data?.users ?? [];
      } catch (e) { errors.push(`Utilisateurs : ${String(e)}`); return []; }
    })(),
    safe<Payment[]>("Paiements", () => admin.from("payments").select("*").order("created_at", { ascending: false }).limit(1000), []),
    safe<Profile[]>("Profils", () => admin.from("profiles").select("*"), []),
    count("Clips réussis", () => admin.from("videos").select("id", { count: "exact", head: true }).eq("status", "ready")),
    count("Clips ratés", () => admin.from("videos").select("id", { count: "exact", head: true }).eq("status", "failed")),
    count("Clips en cours", () => admin.from("videos").select("id", { count: "exact", head: true }).eq("status", "pending")),
    count("Clips 30 j", () => admin.from("videos").select("id", { count: "exact", head: true }).eq("status", "ready").gte("created_at", since30)),
    count("Projets", () => admin.from("projects").select("id", { count: "exact", head: true })),
    safe<{ user_id: string }[]>("Vidéos", () => admin.from("videos").select("user_id").eq("status", "ready"), []),
  ]);

  const users = usersList;
  const emailOf = new Map<string | null, string>(users.map((u) => [u.id, u.email ?? "?"]));
  const paid = payments.filter((p) => p.status === "paid");
  const paid30 = paid.filter((p) => p.paid_at && p.paid_at >= since30);

  // Chiffre d'affaires (Stripe en centimes d'euro, Flutterwave en RWF)
  const eur = (list: typeof paid) => list.filter((p) => p.currency === "eur").reduce((s, p) => s + p.amount, 0) / 100;
  const rwf = (list: typeof paid) => list.filter((p) => p.currency === "RWF").reduce((s, p) => s + p.amount, 0);
  const revenueEur = eur(paid), revenueEur30 = eur(paid30);
  const revenueRwf = rwf(paid);

  // Coût fal.ai estimé : 5 s par clip réussi
  const costEur = clipsReady * 5 * FAL_COST_PER_SECOND * USD_TO_EUR;
  const costEur30 = clipsReady30 * 5 * FAL_COST_PER_SECOND * USD_TO_EUR;
  // Stripe : estimation 1,5 % + 0,25 € par paiement (cartes européennes)
  const stripeFees = paid.filter((p) => p.currency === "eur").reduce((s, p) => s + p.amount / 100 * 0.015 + 0.25, 0);
  const margin = revenueEur - costEur - stripeFees;

  const referred = profiles.filter((p) => p.referred_by).length;
  const referredBuyers = profiles.filter((p) => p.referral_rewarded).length;
  const creditsSold = paid.reduce((s, p) => s + p.credits, 0);
  const creditsLeft = profiles.reduce((s, p) => s + p.credits, 0);
  const buyers = new Set(paid.map((p) => p.user_id)).size;
  const new30 = users.filter((u) => u.created_at >= since30).length;

  // Meilleurs utilisateurs (nombre de clips)
  const perUser = new Map<string, number>();
  for (const v of recentVideos) perUser.set(v.user_id, (perUser.get(v.user_id) ?? 0) + 1);
  const top = [...perUser.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const creditsOf = new Map(profiles.map((p) => [p.id, p.credits]));

  const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
  const date = (d: string) => new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <main className="wrap admin">
      <header className="top">
        <strong>🛠️ Admin</strong>
        <Link href="/studio" className="small">← Studio</Link>
      </header>

      {errors.length > 0 && (
        <div className="card danger small">
          <strong>⚠️ Certaines données n&apos;ont pas pu être chargées :</strong>
          {errors.map((e, i) => <span key={i}>{e}</span>)}
          <span className="muted">Vérifie la variable SUPABASE_SERVICE_ROLE_KEY dans Cloudflare et que les fichiers SQL ont été lancés.</span>
        </div>
      )}

      <h2>Argent</h2>
      <div className="kpis">
        <Kpi label="Chiffre d'affaires total" value={fmt(revenueEur)} sub={revenueRwf ? `+ ${revenueRwf.toLocaleString("fr-FR")} RWF` : undefined} />
        <Kpi label="CA 30 derniers jours" value={fmt(revenueEur30)} />
        <Kpi label="Coût fal.ai estimé" value={fmt(costEur)} sub={`30 j : ${fmt(costEur30)}`} />
        <Kpi label="Frais Stripe estimés" value={fmt(stripeFees)} />
        <Kpi label="Bénéfice estimé" value={fmt(margin)} good={margin >= 0} />
        <Kpi label="Paiements réussis" value={String(paid.length)} sub={`${buyers} acheteurs`} />
      </div>

      <h2>Utilisation</h2>
      <div className="kpis">
        <Kpi label="Utilisateurs" value={String(users.length)} sub={`+${new30} en 30 j`} />
        <Kpi label="Projets" value={String(projectsCount)} />
        <Kpi label="Clips réussis" value={String(clipsReady)} sub={`${Math.round(clipsReady * 5 / 60)} min de vidéo`} />
        <Kpi label="Clips ratés (remboursés)" value={String(clipsFailed)} />
        <Kpi label="En cours" value={String(clipsPending)} />
        <Kpi label="Parrainages" value={String(referred)} sub={`${referredBuyers} ont acheté`} />
        <Kpi label="Crédits vendus / restants" value={`${creditsSold} / ${creditsLeft}`} sub="restants = vidéos dues" />
      </div>

      <h2>Offrir des crédits</h2>
      <AdminGiftForm />

      <h2>Derniers paiements</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Client</th><th>Pack</th><th>Montant</th><th>Moyen</th><th>Statut</th></tr></thead>
          <tbody>
            {payments.slice(0, 30).map((p) => (
              <tr key={p.id}>
                <td>{date(p.created_at)}</td>
                <td>{p.user_id ? emailOf.get(p.user_id) ?? "?" : "compte supprimé"}</td>
                <td>{p.credits} cr.</td>
                <td>{p.currency === "eur" ? fmt(p.amount / 100) : `${p.amount.toLocaleString("fr-FR")} RWF`}</td>
                <td>{p.provider === "stripe" ? "Carte" : "Mobile Money"}</td>
                <td className={p.status === "paid" ? "ok" : p.status === "failed" ? "error" : "muted"}>
                  {p.status === "paid" ? "Payé" : p.status === "failed" ? "Échoué" : "En attente"}
                </td>
              </tr>
            ))}
            {!payments.length && <tr><td colSpan={6} className="muted">Aucun paiement pour l&apos;instant.</td></tr>}
          </tbody>
        </table>
      </div>

      <h2>Meilleurs utilisateurs</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>E-mail</th><th>Clips générés</th><th>Crédits restants</th></tr></thead>
          <tbody>
            {top.map(([id, n]) => (
              <tr key={id}><td>{emailOf.get(id) ?? "?"}</td><td>{n}</td><td>{creditsOf.get(id) ?? 0}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Derniers inscrits</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>E-mail</th><th>Crédits</th></tr></thead>
          <tbody>
            {[...users].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 20).map((u) => (
              <tr key={u.id}><td>{date(u.created_at)}</td><td>{u.email}</td><td>{creditsOf.get(u.id) ?? 0}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="muted small">
        Estimations : coût fal.ai = clips réussis × 5 s × {FAL_COST_PER_SECOND} $/s ; frais Stripe ≈ 1,5 % + 0,25 € par paiement.
        Les chiffres exacts sont dans Stripe (Transactions) et fal.ai (Usage).
      </p>
    </main>
  );
}

function Kpi({ label, value, sub, good }: { label: string; value: string; sub?: string; good?: boolean }) {
  return (
    <div className="card kpi">
      <span className="muted small">{label}</span>
      <strong className={good === undefined ? "" : good ? "ok" : "error"}>{value}</strong>
      {sub && <span className="muted small">{sub}</span>}
    </div>
  );
}
