import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/server/admin/auth";
import { isAdminConfigured } from "@/server/admin/session-token";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await isAdminAuthenticated()) redirect("/admin");
  return (
    <div className="mx-auto mt-10 max-w-sm rounded-3xl bg-white p-8 shadow-[var(--shadow-soft)] ring-1 ring-line">
      <h1 className="text-2xl font-bold">Connexion</h1>
      {!isAdminConfigured() && (
        <p className="mt-3 rounded-xl bg-accent-soft p-3 text-sm text-accent-hover">
          Administration désactivée : définissez <code>ADMIN_PASSWORD</code> (12 caractères min.) et <code>ADMIN_SESSION_SECRET</code> (32 caractères min.).
        </p>
      )}
      <LoginForm />
    </div>
  );
}
