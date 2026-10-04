"use client";

import { useActionState } from "react";
import { loginAction } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="mt-6 space-y-4">
      <div>
        <label htmlFor="password" className="block text-sm font-semibold">
          Mot de passe
        </label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="mt-1 w-full rounded-xl border border-line px-3 py-2.5" />
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-accent-hover">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="w-full rounded-full bg-ink px-4 py-3 font-semibold text-white disabled:opacity-60">
        {pending ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
