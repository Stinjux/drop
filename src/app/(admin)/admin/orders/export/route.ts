import { isAdminAuthenticated } from "@/server/admin/auth";
import { listOrders } from "@/server/orders/repository";
import { FULFILLMENT_STATUSES, PAYMENT_STATUSES, type FulfillmentStatus, type PaymentStatus } from "@/server/orders/types";
import { toCsv } from "@/server/orders/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) return new Response("Non autorisé", { status: 401 });
  const sp = new URL(request.url).searchParams;
  const payment = sp.get("payment");
  const fulfillment = sp.get("fulfillment");
  const { orders } = await listOrders({
    payment: PAYMENT_STATUSES.includes(payment as PaymentStatus) ? (payment as PaymentStatus) : "all",
    fulfillment: FULFILLMENT_STATUSES.includes(fulfillment as FulfillmentStatus) ? (fulfillment as FulfillmentStatus) : "all",
    q: sp.get("q")?.slice(0, 100) ?? "",
    limit: 5000,
  });
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(toCsv(orders), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="commandes-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
