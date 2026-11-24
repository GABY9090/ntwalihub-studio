import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";
import { getDict } from "@/lib/lang";
import { verifyFlutterwave, verifyStripe, type VerifyResult } from "@/lib/payments";

// Page où l'utilisateur revient après avoir payé. On vérifie le paiement côté serveur.
export default async function RetourPaiement({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { t } = await getDict();
  const q = await searchParams;
  const admin = supabaseAdmin();
  let result: VerifyResult = "failed";

  if (q.payment) {
    if (q.provider === "stripe" && q.session_id) {
      result = await verifyStripe(admin, q.payment, q.session_id);
    } else if (q.provider === "flutterwave") {
      // Flutterwave renvoie ?status=successful|cancelled&tx_ref=...&transaction_id=...
      result = q.status === "cancelled"
        ? "failed"
        : await verifyFlutterwave(admin, q.payment, q.transaction_id ?? "");
    }
  }

  const msg = { paid: t.payOk, pending: t.payPending, failed: t.payFailed }[result];
  return (
    <main className="wrap narrow hero">
      <h1>{result === "paid" ? "✅" : result === "pending" ? "⏳" : "❌"}</h1>
      <p className="card">{msg}</p>
      <p>
        {result === "paid"
          ? <Link href="/studio" className="btn">{t.backStudio}</Link>
          : result === "pending"
            ? <a href="" className="btn">{t.refresh}</a>
            : <Link href="/credits" className="btn">{t.tryAgain}</Link>}
      </p>
    </main>
  );
}
