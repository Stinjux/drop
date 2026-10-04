"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { fmt } from "@/content";
import { deliveryEstimate } from "@/lib/catalog";
import { IconCheck } from "../ui/icons";
import { btn, Spinner } from "../ui/primitives";
import { useStore } from "./store-provider";

type Status = "pending" | "processing" | "paid" | "failed" | "expired" | "unknown";

export function OpenCartButton({ label }: { label: string }) {
  const { openDrawer } = useStore();
  return (
    <button type="button" className={btn.primary} onClick={openDrawer}>
      {label}
    </button>
  );
}

export function OrderStatus({ sessionId, initial }: { sessionId: string | null; initial: { status: Status; orderNumber: string | null } }) {
  const { t, locale, clearCart } = useStore();
  const [state, setState] = useState(initial);
  const cleared = useRef(false);
  const est = deliveryEstimate();

  // Le client est revenu de Stripe après avoir validé : on vide le panier local.
  useEffect(() => {
    if (sessionId && !cleared.current) {
      cleared.current = true;
      clearCart();
    }
  }, [sessionId, clearCart]);

  // Actualisation du statut tant que le webhook n'a pas confirmé.
  useEffect(() => {
    if (!sessionId || state.status === "paid" || state.status === "failed" || state.status === "expired") return;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      attempts++;
      try {
        const res = await fetch(`/api/orders/status?session_id=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { status: Status; orderNumber?: string };
          setState({ status: data.status, orderNumber: data.orderNumber ?? null });
          if (data.status === "paid" || data.status === "failed") return;
        }
      } catch {
        /* nouvel essai plus tard */
      }
      if (attempts < 40) timer = setTimeout(tick, attempts < 10 ? 2500 : 8000);
    };
    timer = setTimeout(tick, 1500);
    return () => clearTimeout(timer);
  }, [sessionId, state.status]);

  const message =
    state.status === "paid"
      ? t.success.paid
      : state.status === "processing"
        ? t.success.processing
        : state.status === "failed" || state.status === "expired"
          ? t.success.failed
          : state.status === "pending"
            ? t.success.confirming
            : t.success.unknown;

  const ok = state.status === "paid";
  const waiting = state.status === "pending" || state.status === "unknown";

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:py-24">
      <div className="rounded-[32px] bg-white p-6 text-center shadow-[var(--shadow-soft)] ring-1 ring-line sm:p-10">
        <span className={`mx-auto inline-flex size-16 items-center justify-center rounded-full ${ok ? "bg-pine text-white" : "bg-sand text-ink"}`}>
          {ok ? <IconCheck width={34} height={34} /> : waiting ? <Spinner /> : <span className="text-2xl">!</span>}
        </span>
        <h1 className="mt-5 font-display text-3xl font-bold">{state.status === "failed" ? t.cancel.title : t.success.title}</h1>
        {state.orderNumber && (
          <p className="mt-3 text-sm text-muted">
            {t.success.orderNumber} : <strong className="font-mono text-base text-ink">{state.orderNumber}</strong>
          </p>
        )}
        <p className="mt-4 leading-relaxed text-ink-soft" role="status" aria-live="polite" data-testid="order-status" data-status={state.status}>
          {message}
        </p>
        {(ok || state.status === "processing") && (
          <div className="mt-8 text-left">
            <h2 className="font-display text-lg font-bold">{t.success.nextSteps}</h2>
            <ol className="mt-3 space-y-2 text-sm text-ink-soft">
              <li>1. {t.success.step1}</li>
              <li>2. {fmt(t.success.step2, est)}</li>
              <li>3. {t.success.step3}</li>
            </ol>
          </div>
        )}
        <Link href={`/${locale}`} className={`${btn.secondary} mt-8`}>
          {t.success.back}
        </Link>
      </div>
    </div>
  );
}
