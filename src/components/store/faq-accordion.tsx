"use client";

import { AnimatePresence, m } from "framer-motion";
import { useId, useState } from "react";

/** Accordéon accessible (bouton + région), animé avec Framer Motion. */
export function FaqAccordion({ items }: { items: Array<{ q: string; a: string }> }) {
  const [open, setOpen] = useState<number | null>(0);
  const base = useId();
  return (
    <div className="mt-10 border-[3px] border-ink bg-white shadow-[var(--shadow-hard)]">
      {items.map((it, i) => {
        const expanded = open === i;
        const btnId = `${base}-q${i}`;
        const panelId = `${base}-a${i}`;
        return (
          <div key={i} className={i > 0 ? "border-t-[3px] border-ink" : ""}>
            <h3>
              <button
                id={btnId}
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpen(expanded ? null : i)}
                className={`flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-bold transition-colors sm:px-6 ${expanded ? "bg-ink text-paper" : "hover:bg-paper"}`}
              >
                <span>{it.q}</span>
                <span className={`inline-flex size-8 shrink-0 items-center justify-center border-2 font-mono text-lg ${expanded ? "border-paper bg-accent text-ink" : "border-ink"}`} aria-hidden="true">
                  {expanded ? "−" : "+"}
                </span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {expanded && (
                <m.div
                  id={panelId}
                  role="region"
                  aria-labelledby={btnId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <p className="px-5 py-4 leading-relaxed sm:px-6">{it.a}</p>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
