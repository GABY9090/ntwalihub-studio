import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { FAL_COST_PER_SECOND, USD_TO_EUR, isAdmin } from "@/lib/admin";
import AdminGiftForm from "@/components/AdminGiftForm";

export const dynamic = "force-dynamic";

// Tableau de bord administrateur : ventes, coûts, utilisateurs, derniers paiements.
export default async function AdminPage() {
  const user = await currentUser();
  if (!user || !isAdmin(user.email)) notFound(); // invisible pour les autres

  const admin = supabaseAdmin();
  const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const count = (q: PromiseLike<{ count: number | null }>) => q.then((r) => r.count ?? 0);

  const [
    usersRes, { data: payments }, { data: profiles },
    clipsReady, clipsFailed, clipsPending, clipsReady30, projectsCount,
    { data: recentVideos },
  ] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("payments").select("*").order("created_at", { ascending: false }).limit(1000),
    admin.from("profiles").select("id, credits, created_at"),
    count(admin.from("videos").select("id", { count: "exact", head: true }).eq("status", "ready")),
    count(admin.from("videos").select("id", { count: "exact", head: true }).eq("status", "failed")),
    count(admin.from("videos").select("id", { count: "exact", head: true }).eq("status", "pending")),
    count(admin.from("videos").select("id", { count: "exact", head: true }).eq("status", "ready").gte("created_at", since30)),
    count(admin.from("projects").select("id", { count: "exact", head: true })),
    admin.from("videos").select("user_id").eq("status", "ready"),
  ]);

  const users = usersRes.data?.users ?? [];
  const emailOf = new Map(users.map((u) => [u.id, u.email ?? "?"]));
  const paid = (payments ?? []).filter((p) => p.status === "paid");
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

  const creditsSold = paid.reduce((s, p) => s + p.credits, 0);
  const creditsLeft = (profiles ?? []).reduce((s, p) => s + p.credits, 0);
  const buyers = new Set(paid.map((p) => p.user_id)).size;
  const new30 = users.filter((u) => u.created_at >= since30).length;

  // Meilleurs utilisateurs (nombre de clips)
  const perUser = new Map<string, number>();
  for (const v of recentVideos ?? []) perUser.set(v.user_id, (perUser.get(v.user_id) ?? 0) + 1);
  const top = [...perUser.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const creditsOf = new Map((profiles ?? []).map((p) => [p.id, p.credits]));

  const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
  const date = (d: string) => new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <main className="wrap admin">
      <header className="top">
        <strong>🛠️ Admin</strong>
        <Link href="/studio" className="small">← Studio</Link>
      </header>

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
        <Kpi label="Crédits vendus / restants" value={`${creditsSold} / ${creditsLeft}`} sub="restants = vidéos dues" />
      </div>

      <h2>Offrir des crédits</h2>
      <AdminGiftForm />

      <h2>Derniers paiements</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Client</th><th>Pack</th><th>Montant</th><th>Moyen</th><th>Statut</th></tr></thead>
          <tbody>
            {(payments ?? []).slice(0, 30).map((p) => (
              <tr key={p.id}>
                <td>{date(p.created_at)}</td>
                <td>{emailOf.get(p.user_id) ?? "?"}</td>
                <td>{p.credits} cr.</td>
                <td>{p.currency === "eur" ? fmt(p.amount / 100) : `${p.amount.toLocaleString("fr-FR")} RWF`}</td>
                <td>{p.provider === "stripe" ? "Carte" : "Mobile Money"}</td>
                <td className={p.status === "paid" ? "ok" : p.status === "failed" ? "error" : "muted"}>
                  {p.status === "paid" ? "Payé" : p.status === "failed" ? "Échoué" : "En attente"}
                </td>
              </tr>
            ))}
            {!payments?.length && <tr><td colSpan={6} className="muted">Aucun paiement pour l&apos;instant.</td></tr>}
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
