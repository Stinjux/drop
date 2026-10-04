import "server-only";
import { env } from "../env";
import { addOrderEvent, claimEmail, getOrderById, setEmailStatus } from "../orders/repository";
import { sendEmail } from "./provider";
import { confirmationEmail, shippingEmail } from "./templates";

export type NotificationKind = "confirmation" | "shipping";

/**
 * Envoie un courriel de commande au plus une fois (réservation atomique en base).
 * `retry: true` permet à l'administrateur de relancer un envoi échoué ou non configuré.
 */
export async function sendOrderEmail(orderId: string, kind: NotificationKind, opts: { retry?: boolean } = {}): Promise<string> {
  const claimed = await claimEmail(orderId, kind, opts.retry ?? false);
  if (!claimed) return "skipped";
  const order = await getOrderById(orderId);
  if (!order || !order.customerEmail) {
    await setEmailStatus(orderId, kind, "failed");
    await addOrderEvent(orderId, "email", `Courriel ${kind} non envoyé : adresse du client inconnue.`);
    return "failed";
  }
  if (kind === "confirmation" && order.paymentStatus !== "paid") {
    await setEmailStatus(orderId, kind, "pending");
    return "skipped";
  }
  const content = kind === "confirmation" ? confirmationEmail(order) : shippingEmail(order);
  const result = await sendEmail({
    to: order.customerEmail,
    ...content,
    bcc: kind === "confirmation" ? env.orderNotificationEmail() : undefined,
  });
  await setEmailStatus(orderId, kind, result.status);
  const label = kind === "confirmation" ? "de confirmation" : "d'expédition";
  if (result.status === "sent") await addOrderEvent(orderId, "email", `Courriel ${label} envoyé à ${order.customerEmail}.`);
  else if (result.status === "not_configured")
    await addOrderEvent(orderId, "email", `Courriel ${label} NON envoyé : service d'envoi non configuré (RESEND_API_KEY / EMAIL_FROM).`);
  else await addOrderEvent(orderId, "email", `Échec de l'envoi du courriel ${label} : ${result.error}`);
  return result.status;
}
