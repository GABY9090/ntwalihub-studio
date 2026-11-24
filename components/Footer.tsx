import Link from "next/link";
import type { Dict } from "@/lib/i18n";
import { LEGAL } from "@/lib/legal";

export default function Footer({ t }: { t: Dict }) {
  return (
    <footer className="footer">
      <nav>
        <Link href="/legal/cgv">{t.terms}</Link>
        <Link href="/legal/confidentialite">{t.privacy}</Link>
        <Link href="/legal/remboursement">{t.refunds}</Link>
        <Link href="/legal/contact">{t.contact}</Link>
      </nav>
      <p>© {new Date().getFullYear()} {LEGAL.appName} · {LEGAL.email}</p>
    </footer>
  );
}
