import { redirect } from "next/navigation";
import { getDict } from "@/lib/lang";
import { currentUser } from "@/lib/auth";
import AuthForm from "@/components/AuthForm";

// Page unique : se connecter / créer un compte / mot de passe oublié
export default async function Login({
  searchParams,
}: { searchParams: Promise<{ mode?: string; error?: string }> }) {
  if (await currentUser()) redirect("/studio");
  const { t } = await getDict();
  const { mode, error } = await searchParams;
  const start = mode === "signup" || mode === "forgot" ? mode : "login";
  return <AuthForm t={t} start={start} linkError={error === "link"} />;
}
