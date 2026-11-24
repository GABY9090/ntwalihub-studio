import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";
import { getDict } from "@/lib/lang";
import NewProjectForm from "@/components/NewProjectForm";
import { isAdmin } from "@/lib/admin";

// Liste des projets (comme la liste des conversations d'un chat)
export default async function StudioPage() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { lang, t } = await getDict();

  const [{ data: profile }, { data: projects }, { data: clips }] = await Promise.all([
    supabase.from("profiles").select("credits").eq("id", user.id).single(),
    supabase.from("projects").select("id, title, created_at").order("created_at", { ascending: false }),
    supabase.from("videos").select("project_id, video_url, seq").eq("status", "ready").order("seq"),
  ]);

  const stats = new Map<string, { count: number; thumb?: string }>();
  for (const c of clips ?? []) {
    if (!c.project_id) continue;
    const s = stats.get(c.project_id) ?? { count: 0 };
    s.count += 1;
    s.thumb ??= c.video_url ?? undefined;
    stats.set(c.project_id, s);
  }
  const date = (d: string) => new Date(d).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", { day: "numeric", month: "short" });

  return (
    <main className="wrap">
      <header className="top">
        <strong>🎬 Studio</strong>
        <span className="row">
          <span className="pill">{profile?.credits ?? 0} {t.credits}</span>
          <Link href="/credits" className="btn small-btn">{t.buyCredits}</Link>
        </span>
      </header>
      <p className="muted small">
        {user.email}
        {isAdmin(user.email) && <> · <Link href="/admin">🛠️ Admin</Link></>}
      </p>

      <NewProjectForm t={t} credits={profile?.credits ?? 0} />

      <h2>{t.myProjects}</h2>
      {!projects?.length && <p className="muted">{t.noProjects}</p>}
      <div className="grid">
        {(projects ?? []).map((p) => {
          const s = stats.get(p.id);
          return (
            <Link key={p.id} href={`/studio/${p.id}`} className="card project-card">
              {s?.thumb
                ? <video src={s.thumb} muted playsInline preload="metadata" className="vid" />
                : <div className="placeholder">⏳</div>}
              <strong>{p.title}</strong>
              <span className="muted small">
                {date(p.created_at)} · {s?.count ?? 0} {t.clips} · {(s?.count ?? 0) * 5} s
              </span>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
