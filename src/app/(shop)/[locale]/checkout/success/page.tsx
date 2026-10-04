import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderStatus } from "@/components/store/order-status";
import { isLocale } from "@/config/types";
import { getOrderBySessionId } from "@/server/orders/repository";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false } };

/**
 * Page de retour après Stripe. Elle n'est JAMAIS la source de confirmation :
 * elle affiche le statut enregistré en base par le webhook (et l'actualise).
 */
export default async function SuccessPage({ params, searchParams }: PageProps<"/[locale]/checkout/success">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const sp = await searchParams;
  const sessionId = typeof sp.session_id === "string" && /^cs_[A-Za-z0-9_]{10,200}$/.test(sp.session_id) ? sp.session_id : null;
  const order = sessionId ? await getOrderBySessionId(sessionId) : null;
  return (
    <OrderStatus
      sessionId={sessionId}
      initial={order ? { status: order.paymentStatus, orderNumber: order.orderNumber } : { status: "unknown", orderNumber: null }}
    />
  );
}
