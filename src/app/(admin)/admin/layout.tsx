import "@fontsource-variable/inter";
import "../../globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { store } from "@/config/store";
import { isAdminAuthenticated } from "@/server/admin/auth";
import { logoutAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Administration — ${store.brand.name}`, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const authed = await isAdminAuthenticated();
  return (
    <html lang="fr-CA">
      <body className="min-h-dvh bg-sand/60 text-ink">
        <header className="border-b border-line bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Link href="/admin" className="font-bold">
              {store.brand.name} · Administration
            </Link>
            {authed && (
              <nav className="flex items-center gap-1 text-sm">
                <Link className="rounded-full px-3 py-2 hover:bg-sand" href="/admin">
                  Tableau de bord
                </Link>
                <Link className="rounded-full px-3 py-2 hover:bg-sand" href="/admin/orders">
                  Commandes
                </Link>
                <Link className="rounded-full px-3 py-2 hover:bg-sand" href="/fr" target="_blank">
                  Voir la boutique
                </Link>
                <form action={logoutAction}>
                  <button className="rounded-full px-3 py-2 text-accent hover:bg-accent-soft">Déconnexion</button>
                </form>
              </nav>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
