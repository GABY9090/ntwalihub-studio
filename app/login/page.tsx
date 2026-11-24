import { getDict } from "@/lib/lang";
import LoginForm from "@/components/LoginForm";

export default async function Login() {
  const { t } = await getDict();
  return <LoginForm t={t} />;
}
