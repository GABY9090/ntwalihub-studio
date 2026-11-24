import Link from "next/link";
import { getDict } from "@/lib/lang";
import { currentUser } from "@/lib/auth";

export default async function Home() {
  const { t } = await getDict();
  const user = await currentUser();
  return (
    <main className="wrap hero">
      <h1>{t.heroTitle}</h1>
      <p className="muted">{t.heroText}</p>
      {user ? (
        <Link href="/studio" className="btn">{t.goStudio}</Link>
      ) : (
        <div className="hero-actions">
          <Link href="/login?mode=signup" className="btn">{t.heroCta}</Link>
          <Link href="/login" className="small">{t.haveAccount}</Link>
        </div>
      )}
    </main>
  );
}
