"use client";

import { useStore } from "./store-provider";
import { IconClose } from "../ui/icons";

/** Message d'erreur du paiement, annoncé aux lecteurs d'écran. */
export function CheckoutAlert({ source, className = "" }: { source: string; className?: string }) {
  const { checkout, dismissCheckoutError, t } = useStore();
  return (
    <div aria-live="assertive" className={className}>
      {checkout.status === "error" && checkout.source === source && (
        <div role="alert" className="mt-3 flex items-start justify-between gap-3 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent-hover">
          <p>{checkout.message}</p>
          <button type="button" onClick={dismissCheckoutError} aria-label={t.a11y.close} className="shrink-0 rounded-full p-0.5 hover:bg-white/60">
            <IconClose width={18} height={18} />
          </button>
        </div>
      )}
    </div>
  );
}
