"use client";

import { formatMoney } from "@/lib/money";
import { BuyNowButton, useSelectionPricing } from "./buy-controls";
import { CheckoutAlert } from "./checkout-alert";
import { useStore } from "./store-provider";

/** Appel à l'action placé après les principales sections. */
export function SectionCta({ id, secondary }: { id: string; secondary?: { href: string; label: string } }) {
  const { t, locale } = useStore();
  const pricing = useSelectionPricing();
  return (
    <div className="mt-10 flex flex-col items-center gap-3 text-center">
      <BuyNowButton source={`cta-${id}`} className="w-full max-w-sm text-lg" label={`${t.buy.orderNow} · ${formatMoney(pricing.subtotalCents, locale)}`} />
      {secondary && (
        <a href={secondary.href} className="text-sm font-semibold text-ink underline underline-offset-4 hover:text-accent">
          {secondary.label}
        </a>
      )}
      <CheckoutAlert source={`cta-${id}`} className="w-full max-w-sm text-left" />
    </div>
  );
}
