"use client";

import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { product } from "@/config/product";
import { fmt } from "@/content";
import { useStore } from "./store/store-provider";

type Unit = "cm" | "in";

/** Unité choisie (cm / pouces), mémorisée dans localStorage et partagée entre les tableaux. */
const useUnitStore = create<{ unit: Unit; setUnit: (u: Unit) => void }>()(
  persist((set) => ({ unit: "cm", setUnit: (unit) => set({ unit }) }), {
    name: "borea-size-unit",
    storage: createJSONStorage(() => localStorage),
    skipHydration: true,
  }),
);

function useUnit() {
  const unit = useUnitStore((s) => s.unit);
  const setUnit = useUnitStore((s) => s.setUnit);
  useEffect(() => {
    void useUnitStore.persist.rehydrate();
  }, []);
  return { unit, setUnit };
}

/** Tableau des tailles (sélectionne la taille du produit au clic ou au clavier). */
export function SizeChart({ headingLevel = 2 }: { headingLevel?: 2 | 3 }) {
  const { t, locale, size, setSize } = useStore();
  const g = t.sizeGuide;
  const { unit, setUnit } = useUnit();
  const titleId = useId();
  const rowsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const chart = product.sizeChart;
  const inches = new Intl.NumberFormat(locale === "fr" ? "fr-CA" : "en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const value = (cm: number, inch: number) => (unit === "cm" ? String(cm) : inches.format(inch));
  const unitLabel = unit === "cm" ? g.unitCm : g.unitIn;
  const selectedIndex = chart.findIndex((r) => r.size === size);
  // Ligne focalisable (« roving tabindex ») : la taille choisie, sinon la première.
  const focusIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const Heading = headingLevel === 2 ? "h2" : "h3";

  const pick = (i: number) => {
    const row = chart[(i + chart.length) % chart.length];
    setSize(row.size);
    rowsRef.current[(i + chart.length) % chart.length]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const moves: Record<string, number> = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: chart.length - 1 };
    if (e.key in moves) {
      e.preventDefault();
      pick(moves[e.key]);
    }
  };

  return (
    <div className="text-left">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-accent-ink">{g.eyebrow}</p>
          <Heading id={titleId} className="mt-1 font-display text-[clamp(28px,5vw,44px)] font-extrabold uppercase leading-none tracking-[-0.03em]">
            {g.title}
          </Heading>
        </div>
        <div role="group" aria-label={g.unit} className="inline-flex border-2 border-ink font-mono text-xs font-bold">
          {(["cm", "in"] as const).map((u, i) => (
            <button
              key={u}
              type="button"
              aria-pressed={unit === u}
              onClick={() => setUnit(u)}
              className={`px-3 py-2 ${i > 0 ? "border-l-2 border-ink" : ""} ${unit === u ? "bg-ink text-paper" : "bg-white text-ink hover:bg-paper"}`}
            >
              {u === "cm" ? g.cm : g.inches}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 border-y-2 border-ink">
        <div className="grid grid-cols-[1fr_1.5fr_1.5fr] border-b-2 border-ink bg-white text-[11px] font-bold uppercase tracking-[0.1em]" aria-hidden="true">
          <span className="px-3 py-2.5">{g.size}</span>
          <span className="border-l-2 border-ink px-3 py-2.5">
            {g.chest} ({unitLabel})
          </span>
          <span className="border-l-2 border-ink px-3 py-2.5">
            {g.back} ({unitLabel})
          </span>
        </div>
        <div role="radiogroup" aria-labelledby={titleId}>
          {chart.map((r, i) => {
            const selected = r.size === size;
            return (
              <button
                key={r.size}
                ref={(el) => {
                  rowsRef.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={i === focusIndex ? 0 : -1}
                onClick={() => pick(i)}
                onKeyDown={(e) => onKeyDown(e, i)}
                data-size={r.size}
                className={`grid w-full grid-cols-[1fr_1.5fr_1.5fr] text-left tabular-nums ${i < chart.length - 1 ? "border-b border-ink" : ""} ${
                  selected ? "bg-accent text-white" : "bg-white text-ink hover:bg-accent/10"
                }`}
              >
                <span className="px-3 py-2.5 font-display text-[22px] font-extrabold leading-tight">{r.size}</span>
                <span className={`border-l-2 border-ink px-3 py-2.5 text-[20px] leading-tight ${selected ? "font-bold" : ""}`}>
                  <span className="sr-only">{g.chest} </span>
                  {value(r.chestCm, r.chestIn)}
                  <span className="sr-only"> {unitLabel},</span>
                </span>
                <span className={`border-l-2 border-ink px-3 py-2.5 text-[20px] leading-tight ${selected ? "font-bold" : ""}`}>
                  <span className="sr-only">{g.back} </span>
                  {value(r.backCm, r.backIn)}
                  <span className="sr-only"> {unitLabel}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="mt-4 max-w-[52ch] text-[13px] opacity-70">{g.note}</p>
      <p className="sr-only" aria-live="polite">
        {size ? fmt(g.selected, { size }) : ""}
      </p>
    </div>
  );
}

/** Lien « Guide des tailles → » ouvrant le tableau dans un tiroir latéral (plein écran sur mobile). */
export function SizeGuide() {
  const { t } = useStore();
  const ref = useRef<HTMLDialogElement>(null);
  const open = () => ref.current?.showModal();
  const close = () => ref.current?.close();
  return (
    <>
      <button type="button" onClick={open} className="font-mono text-xs font-bold uppercase tracking-wider underline decoration-2 underline-offset-4 hover:decoration-accent">
        {t.sizeGuide.open}
      </button>
      <dialog
        ref={ref}
        aria-label={t.sizeGuide.title}
        onClick={(e) => {
          if (e.target === ref.current) close();
        }}
        className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-dvh w-full max-w-none bg-paper p-0 text-ink sm:max-w-xl sm:border-l-[3px] sm:border-ink"
      >
        <div className="flex h-full flex-col">
          <div className="flex justify-end border-b-[3px] border-ink p-3">
            <button type="button" onClick={close} className="border-2 border-ink bg-white px-3 py-2 font-mono text-sm font-bold uppercase hover:bg-accent">
              {t.sizeGuide.close}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 sm:p-6">
            <SizeChart />
          </div>
        </div>
      </dialog>
    </>
  );
}
