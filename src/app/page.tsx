import { LoginForm } from "@/components/auth/login-form";
import { redirectIfAuthenticated } from "@/lib/server-auth";

export default async function Home() {
  await redirectIfAuthenticated();
  return <LoginForm />;
}
