import Link from "next/link";
import { getDict } from "@/lib/lang";

export default async function Home() {
  const { t } = await getDict();
  return (
    <main className="wrap hero">
      <h1>{t.heroTitle}</h1>
      <p className="muted">{t.heroText}</p>
      <Link href="/studio" className="btn">{t.heroCta}</Link>
    </main>
  );
}
