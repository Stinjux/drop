import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { requireAdmin } from "@/server/admin/auth";
import { listOrders } from "@/server/orders/repository";
import {
  FULFILLMENT_STATUSES,
  FULFILLMENT_STATUS_LABELS,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  type FulfillmentStatus,
  type PaymentStatus,
} from "@/server/orders/types";

const PAGE_SIZE = 50;

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdmin();
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  const payment = PAYMENT_STATUSES.includes(one(sp.payment) as PaymentStatus) ? (one(sp.payment) as PaymentStatus) : one(sp.payment) === "all" ? "all" : "paid";
  const fulfillment = FULFILLMENT_STATUSES.includes(one(sp.fulfillment) as FulfillmentStatus) ? (one(sp.fulfillment) as FulfillmentStatus) : "all";
  const q = (one(sp.q) ?? "").slice(0, 100);
  const page = Math.max(1, Number(one(sp.page) ?? 1) || 1);
  const { orders, total } = await listOrders({ payment, fulfillment, q, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
  const qs = new URLSearchParams({ payment, fulfillment, ...(q ? { q } : {}) });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-bold">Commandes ({total})</h1>
        <a href={`/admin/orders/export?${qs}`} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
          Exporter en CSV
        </a>
      </div>

      <form className="mt-4 flex flex-wrap gap-3 rounded-2xl bg-white p-4 ring-1 ring-line" method="get">
        <label className="text-sm">
          <span className="block font-semibold">Paiement</span>
          <select name="payment" defaultValue={payment} className="mt-1 rounded-lg border border-line px-2 py-2">
            <option value="all">Tous</option>
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PAYMENT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block font-semibold">Traitement</span>
          <select name="fulfillment" defaultValue={fulfillment} className="mt-1 rounded-lg border border-line px-2 py-2">
            <option value="all">Tous</option>
            {FULFILLMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {FULFILLMENT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-48 flex-1 text-sm">
          <span className="block font-semibold">Recherche</span>
          <input name="q" defaultValue={q} placeholder="N° commande, courriel, nom, suivi…" className="mt-1 w-full rounded-lg border border-line px-3 py-2" />
        </label>
        <button className="self-end rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white">Filtrer</button>
      </form>

      <div className="mt-4 overflow-x-auto rounded-2xl bg-white ring-1 ring-line">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-sand/70 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Commande</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Articles</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Paiement</th>
              <th className="px-4 py-3">Traitement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  Aucune commande pour ces filtres.
                </td>
              </tr>
            )}
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-sand/40">
                <td className="px-4 py-3 font-mono font-semibold">
                  <Link href={`/admin/orders/${o.id}`} className="underline-offset-4 hover:underline">
                    {o.orderNumber}
                  </Link>
                  {o.needsReview && <span className="ml-2 rounded bg-accent px-1.5 py-0.5 text-xs font-bold text-white">À vérifier</span>}
                  {o.stripeLivemode === false && <span className="ml-2 rounded bg-sand px-1.5 py-0.5 text-xs text-muted">test</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{new Date(o.createdAt).toLocaleString("fr-CA")}</td>
                <td className="px-4 py-3">
                  {o.customerName ?? "—"}
                  <br />
                  <span className="text-muted">{o.customerEmail ?? ""}</span>
                </td>
                <td className="px-4 py-3">{o.items.map((i) => `${i.quantity}× ${i.variantLabel}`).join(", ")}</td>
                <td className="px-4 py-3 tabular-nums">{formatMoney(o.amountPaidCents ?? o.totalCents, "fr")}</td>
                <td className="px-4 py-3">{PAYMENT_STATUS_LABELS[o.paymentStatus]}</td>
                <td className="px-4 py-3">{FULFILLMENT_STATUS_LABELS[o.fulfillmentStatus]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total > PAGE_SIZE && (
        <div className="mt-4 flex gap-2">
          {page > 1 && (
            <Link className="rounded-full bg-white px-4 py-2 ring-1 ring-line" href={`/admin/orders?${qs}&page=${page - 1}`}>
              ← Précédent
            </Link>
          )}
          {page * PAGE_SIZE < total && (
            <Link className="rounded-full bg-white px-4 py-2 ring-1 ring-line" href={`/admin/orders?${qs}&page=${page + 1}`}>
              Suivant →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
