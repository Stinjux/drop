"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/server/admin/auth";
import { ADMIN_COOKIE, ADMIN_SESSION_TTL_SECONDS, createAdminToken, isAdminConfigured, safeEqual } from "@/server/admin/session-token";
import { sendOrderEmail } from "@/server/email/notifications";
import { env } from "@/server/env";
import { clearNeedsReview, getOrderById, setFulfillmentStatus, updateSupplierInfo, updateTracking } from "@/server/orders/repository";
import { FULFILLMENT_STATUSES } from "@/server/orders/types";
import { clientIp, rateLimit } from "@/server/rate-limit";
import { revalidatePath } from "next/cache";

export type FormState = { error?: string; ok?: string } | undefined;

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isAdminConfigured()) return { error: "Administration non configurée : définissez ADMIN_PASSWORD (12+ caractères) et ADMIN_SESSION_SECRET (32+ caractères)." };
  const ip = clientIp(await headers());
  const limit = await rateLimit("admin-login", ip, 5, 900);
  if (!limit.ok) return { error: `Trop de tentatives. Réessayez dans ${Math.ceil(limit.retryAfter / 60)} min.` };
  const password = String(formData.get("password") ?? "");
  if (!safeEqual(password, env.adminPassword() ?? "")) return { error: "Mot de passe incorrect." };
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, createAdminToken(), {
    httpOnly: true,
    secure: env.isProduction(),
    sameSite: "strict",
    path: "/",
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  });
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

const idSchema = z.uuid();
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v));

function parseCents(value: FormDataEntryValue | null): number | null | "invalid" {
  const raw = String(value ?? "").trim().replace(",", ".");
  if (raw === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return "invalid";
  return Math.round(Number(raw) * 100);
}

export async function saveSupplierAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = idSchema.safeParse(formData.get("orderId"));
  if (!id.success) return { error: "Commande invalide." };
  const order = await getOrderById(id.data);
  if (!order) return { error: "Commande introuvable." };
  if (order.paymentStatus !== "paid") return { error: "Le paiement n'est pas confirmé : ne passez pas la commande fournisseur." };
  const cost = parseCents(formData.get("supplierCost"));
  if (cost === "invalid") return { error: "Coût invalide (ex. 18.45)." };
  const supplierOrderId = optionalText(120).safeParse(String(formData.get("supplierOrderId") ?? ""));
  const notes = optionalText(2000).safeParse(String(formData.get("supplierNotes") ?? ""));
  if (!supplierOrderId.success || !notes.success) return { error: "Champs trop longs." };
  await updateSupplierInfo(order.id, {
    supplierOrderId: supplierOrderId.data,
    supplierCostCents: cost,
    supplierNotes: notes.data,
    supplierOrderedAt: supplierOrderId.data && !order.supplierOrderedAt ? new Date().toISOString() : null,
  });
  revalidatePath(`/admin/orders/${order.id}`);
  return { ok: "Informations fournisseur enregistrées." };
}

export async function saveTrackingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = idSchema.safeParse(formData.get("orderId"));
  if (!id.success) return { error: "Commande invalide." };
  const order = await getOrderById(id.data);
  if (!order) return { error: "Commande introuvable." };
  if (order.paymentStatus !== "paid") return { error: "Le paiement n'est pas confirmé." };
  const carrier = String(formData.get("carrier") ?? "").trim();
  const trackingNumber = String(formData.get("trackingNumber") ?? "").trim();
  const urlRaw = String(formData.get("trackingUrl") ?? "").trim();
  if (!carrier || carrier.length > 80) return { error: "Transporteur requis." };
  if (!/^[A-Za-z0-9-]{4,60}$/.test(trackingNumber)) return { error: "Numéro de suivi invalide (lettres, chiffres, tirets)." };
  let trackingUrl: string | null = null;
  if (urlRaw) {
    try {
      const u = new URL(urlRaw);
      if (u.protocol !== "https:") throw new Error();
      trackingUrl = u.toString();
    } catch {
      return { error: "Lien de suivi invalide (https:// requis)." };
    }
  }
  await updateTracking(order.id, { carrier, trackingNumber, trackingUrl });
  const notify = formData.get("notify") === "on";
  let emailNote = "";
  if (notify) {
    const status = await sendOrderEmail(order.id, "shipping");
    emailNote =
      status === "sent"
        ? " Courriel d'expédition envoyé."
        : status === "not_configured"
          ? " Courriel NON envoyé : service d'envoi non configuré."
          : status === "skipped"
            ? " Courriel d'expédition déjà traité (utilisez « Renvoyer » si nécessaire)."
            : " Échec de l'envoi du courriel.";
  }
  revalidatePath(`/admin/orders/${order.id}`);
  return { ok: `Suivi enregistré.${emailNote}` };
}

export async function setStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = idSchema.parse(formData.get("orderId"));
  const status = z.enum(FULFILLMENT_STATUSES).parse(formData.get("status"));
  const note = String(formData.get("note") ?? "").trim().slice(0, 300);
  await setFulfillmentStatus(id, status, note || undefined);
  revalidatePath(`/admin/orders/${id}`);
}

export async function resendEmailAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = idSchema.parse(formData.get("orderId"));
  const kind = z.enum(["confirmation", "shipping"]).parse(formData.get("kind"));
  await sendOrderEmail(id, kind, { retry: true });
  revalidatePath(`/admin/orders/${id}`);
}

export async function clearReviewAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = idSchema.parse(formData.get("orderId"));
  await clearNeedsReview(id);
  revalidatePath(`/admin/orders/${id}`);
}
