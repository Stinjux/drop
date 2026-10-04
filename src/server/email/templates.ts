import "server-only";
import { store } from "@/config/store";
import { deliveryEstimate, defaultShipping } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import type { OrderWithItems } from "../orders/types";
import type { EmailMessage } from "./provider";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function layout(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#FBF8F3;font-family:Arial,Helvetica,sans-serif;color:#16202E">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;padding:28px">
<tr><td><p style="font-size:20px;font-weight:bold;margin:0 0 16px">${esc(store.brand.name)}</p>
<h1 style="font-size:22px;margin:0 0 12px">${esc(title)}</h1>${body}
<p style="font-size:13px;color:#5B6472;margin-top:28px">${esc(store.brand.name)}${store.contact.email ? ` · ${esc(store.contact.email)}` : ""}</p>
</td></tr></table></td></tr></table></body></html>`;
}

function itemsTable(order: OrderWithItems): { html: string; text: string } {
  const l = order.locale;
  const rows = order.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0">${esc(i.productName)} — ${esc(i.variantLabel)} × ${i.quantity}</td><td align="right">${formatMoney(i.lineTotalCents, l)}</td></tr>`,
    )
    .join("");
  const shipping = `<tr><td style="padding:6px 0">${l === "fr" ? "Livraison" : "Shipping"}</td><td align="right">${formatMoney(order.shippingCents, l)}</td></tr>`;
  const tax =
    order.taxCents !== null && order.taxCents > 0
      ? `<tr><td style="padding:6px 0">${l === "fr" ? "Taxes" : "Taxes"}</td><td align="right">${formatMoney(order.taxCents, l)}</td></tr>`
      : "";
  const total = order.amountPaidCents ?? order.totalCents;
  const html = `<table role="presentation" width="100%" style="font-size:15px;border-top:1px solid #E7E1D8;margin:16px 0">${rows}${shipping}${tax}
<tr><td style="padding:10px 0;font-weight:bold;border-top:1px solid #E7E1D8">Total</td><td align="right" style="font-weight:bold;border-top:1px solid #E7E1D8">${formatMoney(total, l)}</td></tr></table>`;
  const text = [
    ...order.items.map((i) => `- ${i.productName} — ${i.variantLabel} × ${i.quantity} : ${formatMoney(i.lineTotalCents, l)}`),
    `${l === "fr" ? "Livraison" : "Shipping"} : ${formatMoney(order.shippingCents, l)}`,
    ...(order.taxCents ? [`Taxes : ${formatMoney(order.taxCents, l)}`] : []),
    `Total : ${formatMoney(total, l)}`,
  ].join("\n");
  return { html, text };
}

function address(order: OrderWithItems): string {
  return [order.shipName, order.shipLine1, order.shipLine2, [order.shipCity, order.shipState, order.shipPostalCode].filter(Boolean).join(" "), order.shipCountry]
    .filter(Boolean)
    .join("\n");
}

export function confirmationEmail(order: OrderWithItems): Omit<EmailMessage, "to"> {
  const l = order.locale;
  const est = deliveryEstimate(defaultShipping);
  const items = itemsTable(order);
  const addr = address(order);
  const title = l === "fr" ? `Merci ! Commande ${order.orderNumber} confirmée` : `Thank you! Order ${order.orderNumber} confirmed`;
  const intro =
    l === "fr"
      ? `Votre paiement a bien été reçu. Nous préparons votre commande et vous enverrons le numéro de suivi dès l'expédition. Délai estimé : ${est.min} à ${est.max} jours ouvrables.`
      : `We've received your payment. We're preparing your order and will email your tracking number as soon as it ships. Estimated delivery: ${est.min}–${est.max} business days.`;
  const shipTo = l === "fr" ? "Adresse de livraison" : "Shipping address";
  return {
    subject: title,
    html: layout(
      title,
      `<p style="font-size:15px;line-height:1.5">${esc(intro)}</p>${items.html}<p style="font-size:14px"><strong>${shipTo}</strong><br>${esc(addr).replace(/\n/g, "<br>")}</p>`,
    ),
    text: `${title}\n\n${intro}\n\n${items.text}\n\n${shipTo} :\n${addr}`,
  };
}

export function shippingEmail(order: OrderWithItems): Omit<EmailMessage, "to"> {
  const l = order.locale;
  const title = l === "fr" ? `Votre commande ${order.orderNumber} est expédiée` : `Your order ${order.orderNumber} has shipped`;
  const tracking = `${order.carrier ?? ""} ${order.trackingNumber ?? ""}`.trim();
  const intro =
    l === "fr"
      ? `Bonne nouvelle : votre colis est en route. Transporteur et numéro de suivi : ${tracking}.`
      : `Good news: your parcel is on its way. Carrier and tracking number: ${tracking}.`;
  const link = order.trackingUrl
    ? `<p><a href="${esc(order.trackingUrl)}" style="display:inline-block;background:#C2410C;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">${l === "fr" ? "Suivre mon colis" : "Track my parcel"}</a></p>`
    : "";
  return {
    subject: title,
    html: layout(title, `<p style="font-size:15px;line-height:1.5">${esc(intro)}</p>${link}`),
    text: `${title}\n\n${intro}${order.trackingUrl ? `\n${order.trackingUrl}` : ""}`,
  };
}
