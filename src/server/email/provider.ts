import "server-only";
import { env } from "../env";

export type EmailMessage = { to: string; subject: string; html: string; text: string; bcc?: string };
export type EmailResult = { status: "sent"; id: string | null } | { status: "not_configured" } | { status: "failed"; error: string };

export function isEmailConfigured(): boolean {
  return !!env.resendApiKey() && !!env.emailFrom();
}

/**
 * Envoi via l'API HTTP de Resend (https://resend.com). Pour changer de service,
 * remplacer uniquement cette fonction. Sans configuration, AUCUN courriel n'est
 * envoyé et le statut « not_configured » est enregistré sur la commande.
 */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const apiKey = env.resendApiKey();
  const from = env.emailFrom();
  if (!apiKey || !from) return { status: "not_configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [message.to],
        ...(message.bcc ? { bcc: [message.bcc] } : {}),
        ...(env.emailReplyTo() ? { reply_to: env.emailReplyTo() } : {}),
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { status: "failed", error: `HTTP ${res.status}: ${(await res.text()).slice(0, 300)}` };
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { status: "sent", id: data.id ?? null };
  } catch (err) {
    return { status: "failed", error: (err as Error).message };
  }
}
