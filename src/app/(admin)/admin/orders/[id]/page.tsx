import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { formatMoney } from "@/lib/money";
import { requireAdmin } from "@/server/admin/auth";
import { isEmailConfigured } from "@/server/email/provider";
import { getFulfillmentProvider } from "@/server/fulfillment";
import { getOrderById, listOrderEvents } from "@/server/orders/repository";
import {
  EMAIL_STATUS_LABELS,
  FULFILLMENT_STATUSES,
  FULFILLMENT_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/server/orders/types";
import { clearReviewAction, resendEmailAction, setStatusAction } from "../../actions";
import { SupplierForm, TrackingForm } from "./forms";

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-line">
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

const money = (c: number | null) => (c === null ? "—" : formatMoney(c, "fr"));

export default async function OrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const order = await getOrderById(id);
  if (!order) notFound();
  const events = await listOrderEvents(order.id);
  const provider = getFulfillmentProvider(order.fulfillmentProvider);
  const instr = provider.instructions(order);
  const paid = order.paymentStatus === "paid";
  const dash = `https://dashboard.stripe.com/${order.stripeLivemode ? "" : "test/"}`;
  const margin = order.supplierCostCents !== null && order.amountPaidCents !== null ? order.amountPaidCents - (order.taxCents ?? 0) - order.supplierCostCents : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-bold">{order.orderNumber}</h1>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${paid ? "bg-pine text-white" : "bg-sand"}`}>{PAYMENT_STATUS_LABELS[order.paymentStatus]}</span>
        <span className="rounded-full bg-white px-3 py-1 text-sm ring-1 ring-line">{FULFILLMENT_STATUS_LABELS[order.fulfillmentStatus]}</span>
        {order.stripeLivemode === false && <span className="rounded-full bg-sand px-3 py-1 text-sm text-muted">Mode test</span>}
      </div>

      {!paid && (
        <p className="rounded-xl bg-accent-soft p-4 text-sm text-accent-hover">
          Paiement non confirmé par le webhook Stripe : <strong>ne passez pas la commande fournisseur</strong>.
        </p>
      )}
      {order.needsReview && (
        <form action={clearReviewAction} className="flex flex-wrap items-center gap-3 rounded-xl bg-accent-soft p-4 text-sm text-accent-hover">
          <input type="hidden" name="orderId" value={order.id} />
          <span>Anomalie détectée (voir l&apos;historique). Vérifiez dans Stripe avant d&apos;expédier.</span>
          <button className="rounded-full bg-white px-3 py-1 font-semibold">Marquer comme vérifiée</button>
        </form>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Articles et montants">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-line">
                {order.items.map((i) => (
                  <tr key={i.id}>
                    <td className="py-2">
                      {i.productName} — {i.variantLabel} <span className="text-muted">({i.sku})</span>
                    </td>
                    <td className="py-2 text-right">
                      {i.quantity} × {money(i.unitPriceCents)}
                    </td>
                    <td className="py-2 text-right font-semibold">{money(i.lineTotalCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="mt-3 grid grid-cols-2 gap-1 text-sm">
              <dt>Sous-total</dt>
              <dd className="text-right">{money(order.subtotalCents)}</dd>
              <dt>Remise de lot</dt>
              <dd className="text-right">{money(order.savingsCents)}</dd>
              <dt>Livraison</dt>
              <dd className="text-right">{money(order.shippingCents)}</dd>
              <dt>Taxes</dt>
              <dd className="text-right">{money(order.taxCents)}</dd>
              <dt className="font-bold">Total payé (Stripe)</dt>
              <dd className="text-right font-bold">{money(order.amountPaidCents)}</dd>
              <dt className="text-muted">Marge brute estimée (hors frais Stripe)</dt>
              <dd className="text-right text-muted">{money(margin)}</dd>
            </dl>
          </Card>

          <Card title={`Commande fournisseur — ${provider.label}`}>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3 text-sm">
                <p>
                  <a href={instr.productUrl} target="_blank" rel="noreferrer noopener" className="font-semibold text-accent underline">
                    Ouvrir la fiche {instr.supplierName}
                  </a>
                </p>
                <p>
                  <strong>Livraison fournisseur :</strong> {instr.shippingMethod}
                </p>
                <ul className="space-y-1">
                  {instr.lines.map((l) => (
                    <li key={l.sku}>
                      {l.quantity} × option « {l.supplierOptionLabel} » <span className="text-muted">(boutique : {l.variantLabel})</span>
                      {l.estimatedCostCents !== null && <> — env. {money(l.estimatedCostCents)}</>}
                    </li>
                  ))}
                </ul>
                {!instr.costVerified && <p className="text-xs text-accent-hover">Coût fournisseur habituel non vérifié dans la configuration.</p>}
                <div>
                  <p className="font-semibold">Adresse à saisir</p>
                  <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-sand/60 p-3 font-sans">{instr.shippingAddress || "— (reçue après paiement)"}</pre>
                  {instr.phone && <p className="mt-1">Tél. : {instr.phone}</p>}
                </div>
                <p className="text-xs text-muted">{instr.notes}</p>
              </div>
              <SupplierForm
                orderId={order.id}
                disabled={!paid}
                defaults={{
                  supplierOrderId: order.supplierOrderId ?? "",
                  supplierCost: order.supplierCostCents === null ? "" : (order.supplierCostCents / 100).toFixed(2),
                  supplierNotes: order.supplierNotes ?? "",
                }}
              />
            </div>
          </Card>

          <Card title="Expédition et suivi">
            <TrackingForm
              orderId={order.id}
              disabled={!paid}
              defaults={{ carrier: order.carrier ?? "", trackingNumber: order.trackingNumber ?? "", trackingUrl: order.trackingUrl ?? "" }}
            />
            <form action={setStatusAction} className="mt-6 flex flex-wrap items-end gap-2 border-t border-line pt-4 text-sm">
              <input type="hidden" name="orderId" value={order.id} />
              <label>
                <span className="block font-semibold">Statut de traitement</span>
                <select name="status" defaultValue={order.fulfillmentStatus} className="mt-1 rounded-lg border border-line px-2 py-2">
                  {FULFILLMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {FULFILLMENT_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="min-w-48 flex-1">
                <span className="block font-semibold">Note</span>
                <input name="note" className="mt-1 w-full rounded-lg border border-line px-3 py-2" />
              </label>
              <button className="rounded-full bg-ink px-4 py-2 font-semibold text-white">Mettre à jour</button>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Client">
            <p className="text-sm">
              {order.customerName ?? "—"}
              <br />
              {order.customerEmail ?? ""}
              <br />
              {order.customerPhone ?? ""}
            </p>
            <p className="mt-3 text-sm font-semibold">Livraison</p>
            <pre className="whitespace-pre-wrap font-sans text-sm">{instr.shippingAddress || "—"}</pre>
            <p className="mt-3 text-xs text-muted">Langue : {order.locale}</p>
          </Card>

          <Card title="Courriels">
            {!isEmailConfigured() && <p className="mb-3 rounded-lg bg-accent-soft p-2 text-xs text-accent-hover">Service d&apos;envoi non configuré : aucun courriel n&apos;est réellement envoyé.</p>}
            {(["confirmation", "shipping"] as const).map((kind) => {
              const status = kind === "confirmation" ? order.confirmationEmailStatus : order.shippingEmailStatus;
              return (
                <form key={kind} action={resendEmailAction} className="mb-3 flex items-center justify-between gap-2 text-sm">
                  <input type="hidden" name="orderId" value={order.id} />
                  <input type="hidden" name="kind" value={kind} />
                  <span>
                    {kind === "confirmation" ? "Confirmation" : "Expédition"} : <strong>{status ? EMAIL_STATUS_LABELS[status] : "—"}</strong>
                  </span>
                  {status && status !== "sent" && paid && <button className="rounded-full bg-white px-3 py-1 text-xs font-semibold ring-1 ring-line">Renvoyer</button>}
                </form>
              );
            })}
          </Card>

          <Card title="Stripe">
            <dl className="space-y-1 break-all text-xs">
              <dt className="font-semibold">Session Checkout</dt>
              <dd>{order.stripeCheckoutSessionId ?? "—"}</dd>
              <dt className="font-semibold">PaymentIntent</dt>
              <dd>
                {order.stripePaymentIntentId ? (
                  <a className="text-accent underline" target="_blank" rel="noreferrer noopener" href={`${dash}payments/${order.stripePaymentIntentId}`}>
                    {order.stripePaymentIntentId}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
              <dt className="font-semibold">Client Stripe</dt>
              <dd>{order.stripeCustomerId ?? "—"}</dd>
            </dl>
          </Card>

          <Card title="Historique">
            <ol className="space-y-2 text-xs">
              {events.map((e) => (
                <li key={e.id}>
                  <span className="text-muted">{new Date(e.at).toLocaleString("fr-CA")}</span>
                  <br />
                  {e.message}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
