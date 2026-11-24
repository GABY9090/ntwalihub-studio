import { redirect } from "next/navigation";
import { getDict } from "@/lib/lang";
import { currentUser } from "@/lib/auth";
import NewPasswordForm from "@/components/NewPasswordForm";

// Après "mot de passe oublié" : le lien de l'e-mail connecte le client ici pour choisir un nouveau mot de passe
export default async function NewPasswordPage() {
  if (!(await currentUser())) redirect("/login?mode=forgot");
  const { t } = await getDict();
  return (
    <main className="wrap narrow">
      <h1>{t.newPasswordTitle}</h1>
      <NewPasswordForm t={t} after="/studio" />
    </main>
  );
}
