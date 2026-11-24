import Link from "next/link";
import { notFound } from "next/navigation";
import { getDict } from "@/lib/lang";
import { LEGAL_SLUGS, legalPage, type LegalSlug } from "@/lib/legal-content";

// Pages légales : /legal/contact, /legal/cgv, /legal/confidentialite, /legal/remboursement
export default async function LegalPageView({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  if (!(LEGAL_SLUGS as readonly string[]).includes(page)) notFound();
  const { lang, t } = await getDict();
  const content = legalPage(lang, page as LegalSlug);

  return (
    <main className="wrap narrow-text legal">
      <Link href="/" className="small">← {t.home}</Link>
      <h1>{content.title}</h1>
      {content.sections.map((s) => (
        <section key={s.h}>
          <h2>{s.h}</h2>
          {s.p.map((p, i) => <p key={i}>{p}</p>)}
        </section>
      ))}
    </main>
  );
}
