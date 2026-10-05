"use client";

import { product, reviewSummary } from "@/config/product";
import { fmt } from "@/content";
import { BuyControls } from "./buy-controls";
import { Gallery } from "./gallery";
import { useStore } from "./store-provider";

/** Étoiles + note : affichées UNIQUEMENT à partir de vrais avis (data/product.ts → reviews). */
export function RatingBadge() {
  const { t } = useStore();
  const summary = reviewSummary();
  if (!summary) return null;
  const full = Math.round(summary.average);
  return (
    <a href="#reviews" className="inline-flex items-center gap-2 font-mono text-sm font-bold" aria-label={fmt(t.hero.reviews, { avg: summary.average.toFixed(1), count: summary.count })}>
      <span aria-hidden="true" className="tracking-widest">
        {"★".repeat(full)}
        <span className="opacity-25">{"★".repeat(5 - full)}</span>
      </span>
      <span className="underline decoration-2 underline-offset-4">{fmt(t.hero.reviews, { avg: summary.average.toFixed(1), count: summary.count })}</span>
    </a>
  );
}

export function Hero() {
  const { locale } = useStore();
  return (
    <section aria-labelledby="hero-title" className="border-b-[3px] border-ink bg-grid">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-6 sm:px-6 md:py-12 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
        <div className="lg:sticky lg:top-[calc(var(--header-h)+24px)] lg:self-start">
          <Gallery />
        </div>

        <div className="min-w-0 text-left [container-type:inline-size]">
          <RatingBadge />
          <p className="mt-2 inline-block border-2 border-ink bg-white px-2 py-0.5 font-mono text-xs font-bold uppercase tracking-wider">{product.name[locale]}</p>
          <h1 id="hero-title" className="display-xl mt-4" lang={locale}>
            {product.headline[locale]}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed">{product.subheadline[locale]}</p>

          <div id="buy-box" data-anchor className="mt-7 border-[3px] border-ink bg-white p-5 shadow-[var(--shadow-hard)] sm:p-6">
            <BuyControls source="hero" />
          </div>
        </div>
      </div>
    </section>
  );
}
