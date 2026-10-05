"use client";

import { useActionState, useState } from "react";
import { trackOrderAction, type TrackingResult } from "@/server/tracking";
import { fmt } from "@/content";
import { btn, Spinner } from "../ui/primitives";
import { useStore } from "./store-provider";

const input = "mt-1 w-full border-[3px] border-ink bg-white px-3 py-3 font-mono text-base uppercase placeholder:normal-case";

export function TrackingForm() {
  const { t, locale } = useStore();
  const tr = t.tracking;
  const [state, action, pending] = useActionState<TrackingResult, FormData>(trackOrderAction, { state: "idle" });
  // Champs contrôlés : ils restent remplis après une recherche (React réinitialise sinon le formulaire).
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");

  const steps = [
    { key: "paid", label: tr.steps.paid },
    { key: "processing", label: tr.steps.processing },
    { key: "shipped", label: tr.steps.shipped },
    { key: "delivered", label: tr.steps.delivered },
  ];
  let reached = 0;
  if (state.state === "found" && state.payment === "paid") {
    reached = { not_started: 1, supplier_ordered: 2, issue: 2, shipped: 3, delivered: 4, cancelled: 0 }[state.fulfillment] ?? 1;
  }

  return (
    <div className="mt-6">
      <p>{tr.intro}</p>
      <form action={action} className="mt-6 grid gap-4 border-[3px] border-ink bg-white p-5 shadow-[var(--shadow-hard)] sm:grid-cols-2 sm:p-6">
        <label className="block font-mono text-xs font-bold uppercase tracking-wider">
          {tr.orderNumber}
          <input name="orderNumber" required autoComplete="off" placeholder="BR-7K2Q9M" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} className={input} />
        </label>
        <label className="block font-mono text-xs font-bold uppercase tracking-wider">
          {tr.email}
          <input name="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${input} !normal-case`} />
        </label>
        <div className="sm:col-span-2">
          <button className={`${btn.primary} w-full sm:w-auto`} disabled={pending}>
            {pending ? (
              <>
                <Spinner /> {tr.loading}
              </>
            ) : (
              tr.submit
            )}
          </button>
        </div>
      </form>

      <div aria-live="polite" className="mt-6">
        {state.state === "error" && (
          <p role="alert" className="border-[3px] border-ink bg-accent-soft p-4 font-bold">
            {state.code === "rate_limited" ? tr.rateLimited : tr.notFound}
          </p>
        )}
        {state.state === "found" && (
          <div className="border-[3px] border-ink bg-white p-5 sm:p-6" data-testid="tracking-result">
            <p className="font-mono text-lg font-bold">{state.orderNumber}</p>
            <p className="text-sm text-muted">{fmt(tr.placedOn, { date: new Date(state.createdAt).toLocaleDateString(locale === "fr" ? "fr-CA" : "en-CA") })}</p>
            {state.payment !== "paid" ? (
              <p className="mt-4 font-bold">{state.payment === "failed" ? tr.failed : tr.pending}</p>
            ) : state.fulfillment === "cancelled" ? (
              <p className="mt-4 font-bold">{tr.cancelled}</p>
            ) : (
              <ol className="mt-5 grid grid-cols-2 border-l-[3px] border-t-[3px] border-ink sm:grid-cols-4">
                {steps.map((s, i) => (
                  <li key={s.key} className={`border-b-[3px] border-r-[3px] border-ink p-3 font-mono text-xs font-bold uppercase ${i < reached ? "bg-accent" : "bg-paper opacity-60"}`}>
                    {String(i + 1).padStart(2, "0")} · {s.label}
                  </li>
                ))}
              </ol>
            )}
            {state.trackingNumber && (
              <dl className="mt-5 grid gap-2 font-mono text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-bold uppercase">{tr.carrier}</dt>
                  <dd>{state.carrier}</dd>
                </div>
                <div>
                  <dt className="font-bold uppercase">{tr.trackingNumber}</dt>
                  <dd>{state.trackingNumber}</dd>
                </div>
              </dl>
            )}
            {state.trackingUrl && (
              <a href={state.trackingUrl} target="_blank" rel="noopener noreferrer" className={`${btn.outline} mt-5`}>
                {tr.trackLink}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
