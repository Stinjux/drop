import Link from "next/link";
import { requireAdmin } from "@/server/admin/auth";
import { launchChecklist } from "@/server/admin/launch-checklist";
import { countOrdersByStatus } from "@/server/orders/repository";

export default async function AdminHome() {
  await requireAdmin();
  const [counts, checklist] = [await countOrdersByStatus(), launchChecklist()];
  const blocking = checklist.filter((c) => c.blocking && !c.ok).length;
  const tiles = [
    { label: "Payées à commander chez le fournisseur", value: counts.paidToFulfill, href: "/admin/orders?payment=paid&fulfillment=not_started", strong: counts.paidToFulfill > 0 },
    { label: "Paiements différés en cours", value: counts.processing, href: "/admin/orders?payment=processing" },
    { label: "Commandes payées (total)", value: counts.paidTotal, href: "/admin/orders?payment=paid" },
    { label: "Anomalies à vérifier", value: counts.needsReview, href: "/admin/orders", strong: counts.needsReview > 0 },
    { label: "Courriels non envoyés", value: counts.emailIssues, href: "/admin/orders?payment=paid", strong: counts.emailIssues > 0 },
  ];
  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {tiles.map((t) => (
            <li key={t.label}>
              <Link href={t.href} className={`block rounded-2xl bg-white p-4 ring-1 transition hover:ring-ink ${t.strong ? "ring-accent" : "ring-line"}`}>
                <p className="text-3xl font-bold tabular-nums">{t.value}</p>
                <p className="mt-1 text-sm text-muted">{t.label}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold">Avant d&apos;accepter de vraies commandes</h2>
        <p className="mt-1 text-sm text-muted">
          {blocking > 0 ? `${blocking} point(s) bloquant(s) restant(s).` : "Aucun point bloquant. Faites un dernier achat test complet avant de passer en mode live."}
        </p>
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl bg-white ring-1 ring-line">
          {checklist.map((c) => (
            <li key={c.label} className="flex items-start gap-3 px-4 py-3 text-sm">
              <span className={`mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${c.ok ? "bg-pine" : c.blocking ? "bg-accent" : "bg-muted"}`}>
                {c.ok ? "✓" : "!"}
              </span>
              <div>
                <p className="font-medium">
                  {c.label} {!c.ok && !c.blocking && <span className="text-muted">(recommandé)</span>}
                </p>
                {c.detail && <p className="text-muted">{c.detail}</p>}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
