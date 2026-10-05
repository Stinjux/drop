import Image from "next/image";
import { getMedia, product, reviewSummary } from "@/config/product";
import { store } from "@/config/store";
import type { Locale } from "@/config/types";
import { fmt, getDictionary } from "@/content";
import { defaultShipping, deliveryEstimate } from "@/lib/catalog";
import { FeatureIcons, IconChat, IconCheck, IconClose, IconLock, IconReturn, IconTruck } from "../ui/icons";
import { Eyebrow, ProductImage, Reveal, SectionTitle } from "../ui/primitives";
import { SizeChart } from "../SizeGuide";
import { FaqAccordion } from "./faq-accordion";

const wrap = "mx-auto max-w-7xl px-4 sm:px-6";

/** 4. Bande de réassurance */
export function ReassuranceBand({ locale }: { locale: Locale }) {
  const r = getDictionary(locale).blocks.reassurance;
  const est = deliveryEstimate();
  const items = [
    { icon: IconTruck, title: r.shipping, text: fmt(r.shippingText, est) },
    { icon: IconLock, title: r.payment, text: r.paymentText },
    { icon: IconReturn, title: fmt(r.returns, { days: store.returns.windowDays }), text: r.returnsText },
    { icon: IconChat, title: r.support, text: r.supportText },
  ];
  return (
    <section aria-label={r.payment} className="border-b-[3px] border-ink bg-white">
      <ul className="mx-auto grid max-w-7xl grid-cols-2 lg:grid-cols-4">
        {items.map((it, i) => (
          <li key={i} className={`flex items-start gap-3 border-ink p-4 sm:p-6 ${i % 2 === 0 ? "border-r-[3px]" : ""} ${i < 2 ? "border-b-[3px] lg:border-b-0" : ""} ${i === 1 ? "lg:border-r-[3px]" : ""}`}>
            <span className="inline-flex size-10 shrink-0 items-center justify-center border-[3px] border-ink bg-accent">
              <it.icon width={20} height={20} />
            </span>
            <div className="min-w-0">
              <p className="font-display text-xs font-bold uppercase leading-tight sm:text-sm">{it.title}</p>
              <p className="mt-1 text-sm text-muted">{it.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** 5. Problème → solution (avant / après) */
export function ProblemSolution({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).blocks;
  const ps = product.problemSolution;
  const col = (side: typeof ps.before, kind: "before" | "after") => (
    <div className={`flex flex-col border-[3px] border-ink ${kind === "after" ? "bg-white shadow-[var(--shadow-hard)]" : "bg-sand"}`}>
      <div className="relative border-b-[3px] border-ink">
        <ProductImage media={getMedia(side.mediaId)} locale={locale} sizes="(min-width: 768px) 45vw, 100vw" className="aspect-[4/3] w-full object-cover object-[62%_50%]" />
        <span className={`absolute left-0 top-0 border-b-[3px] border-r-[3px] border-ink px-3 py-1 font-display text-sm font-bold uppercase ${kind === "after" ? "bg-accent" : "bg-white"}`}>
          {side.title[locale]}
        </span>
      </div>
      <ul className="space-y-3 p-5 sm:p-6">
        {side.points.map((p, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className={`mt-0.5 inline-flex size-6 shrink-0 items-center justify-center border-2 border-ink ${kind === "after" ? "bg-accent" : "bg-white"}`}>
              {kind === "after" ? <IconCheck width={16} height={16} /> : <IconClose width={14} height={14} />}
            </span>
            <span>{p[locale]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <div className={wrap}>
      <Reveal>
        <Eyebrow>{t.problemEyebrow}</Eyebrow>
        <SectionTitle id="problem-title">{product.problemSolved[locale]}</SectionTitle>
      </Reveal>
      <div className="mt-10 grid grid-cols-1 gap-6 pr-[6px] md:grid-cols-2">
        <Reveal>{col(ps.before, "before")}</Reveal>
        <Reveal delay={100}>{col(ps.after, "after")}</Reveal>
      </div>
      <p className="mt-4 font-mono text-xs text-muted">{t.illustration}</p>
    </div>
  );
}

/** 6. Caractéristiques en grille modulaire (cellules égales, bordures visibles) */
export function Features({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).blocks;
  const n = product.features.length;
  return (
    <div className={wrap}>
      <Reveal>
        <Eyebrow>{t.featuresEyebrow}</Eyebrow>
        <SectionTitle id="features-title">{t.featuresTitle}</SectionTitle>
      </Reveal>
      <ul className={`mt-10 grid grid-cols-1 border-l-[3px] border-t-[3px] border-ink sm:grid-cols-2 ${n % 3 === 0 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
        {product.features.map((f, i) => {
          const Icon = FeatureIcons[f.icon];
          return (
            <li key={i} className="flex flex-col border-b-[3px] border-r-[3px] border-ink bg-white p-6 transition-colors hover:bg-paper">
              <div className="flex items-start justify-between">
                <span className="inline-flex size-12 items-center justify-center border-[3px] border-ink bg-accent">
                  <Icon width={24} height={24} />
                </span>
                <span className="font-mono text-sm font-bold text-muted">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <h3 className="mt-6 font-display text-lg font-bold uppercase leading-tight">{f.title[locale]}</h3>
              <p className="mt-2 text-muted">{f.text[locale]}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** 7. Comment ça marche — 3 étapes, gros chiffres en mono */
export function HowItWorks({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).blocks;
  return (
    <div className={wrap}>
      <Reveal>
        <Eyebrow>{t.howEyebrow}</Eyebrow>
        <SectionTitle id="how-title">{t.howTitle}</SectionTitle>
      </Reveal>
      <ol className="mt-10 grid grid-cols-1 gap-6 pr-[6px] md:grid-cols-3">
        {product.steps.map((s, i) => (
          <li key={i}>
            <Reveal delay={i * 90} className="h-full border-[3px] border-ink bg-white p-6 shadow-[var(--shadow-hard)]">
              <span className="block font-mono text-7xl font-bold leading-none tracking-tighter text-ink sm:text-8xl" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-6 border-t-[3px] border-ink pt-4 font-display text-lg font-bold uppercase">
                <span className="sr-only">{i + 1}. </span>
                {s.title[locale]}
              </h3>
              <p className="mt-2 text-muted">{s.text[locale]}</p>
            </Reveal>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** 8. Avis clients — masqué tant qu'il n'y a pas de VRAIS avis. */
export function Reviews({ locale }: { locale: Locale }) {
  const summary = reviewSummary();
  if (!summary) return null;
  const t = getDictionary(locale);
  return (
    <section id="reviews" aria-labelledby="reviews-title" className="border-b-[3px] border-ink py-16 sm:py-24">
      <div className={wrap}>
        <Eyebrow>{t.blocks.reviewsEyebrow}</Eyebrow>
        <SectionTitle id="reviews-title">{t.blocks.reviewsTitle}</SectionTitle>
        <p className="mt-4 font-mono text-lg font-bold">
          {"★".repeat(Math.round(summary.average))} {fmt(t.hero.reviews, { avg: summary.average.toFixed(1), count: summary.count })}
        </p>
        <ul className="mt-10 grid grid-cols-1 border-l-[3px] border-t-[3px] border-ink sm:grid-cols-2 lg:grid-cols-3">
          {product.reviews.map((r, i) => (
            <li key={i} className="flex flex-col border-b-[3px] border-r-[3px] border-ink bg-white">
              {r.photo && (
                <Image src={r.photo} alt="" width={600} height={450} sizes="(min-width: 1024px) 33vw, 100vw" className="aspect-[4/3] w-full border-b-[3px] border-ink object-cover" />
              )}
              <div className="flex flex-1 flex-col p-6">
                <p className="font-mono text-lg" aria-label={`${r.rating}/5`}>
                  {"★".repeat(r.rating)}
                  <span className="opacity-25">{"★".repeat(5 - r.rating)}</span>
                </p>
                <blockquote className="mt-3 flex-1">« {r.text[locale]} »</blockquote>
                <p className="mt-4 font-display text-sm font-bold uppercase">{r.author}</p>
                <p className="font-mono text-xs text-muted">
                  {r.city} · {r.date}
                  {r.verifiedPurchase && ` · ${t.blocks.verified}`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** 10. FAQ en accordéon (livraison, retours, garantie, compatibilité) */
export function Faq({ locale, taxesAtCheckout }: { locale: Locale; taxesAtCheckout: boolean }) {
  const t = getDictionary(locale);
  const ship = defaultShipping;
  const est = deliveryEstimate();
  const g = t.faqGeneral;
  const items = [
    ...product.faq.map((f) => ({ q: f.q[locale], a: f.a[locale], extra: f.sizeChart ? <SizeChart headingLevel={3} /> : undefined })),
    {
      q: g.delayQ,
      a: fmt(g.delayA, { pmin: ship.processingDays.min, pmax: ship.processingDays.max, tmin: ship.transitDays.min, tmax: ship.transitDays.max, min: est.min, max: est.max }),
    },
    { q: g.shippingQ, a: fmt(g.shippingA, { shipping: t.buy.shippingFree }) },
    { q: g.returnsQ, a: fmt(g.returnsA, { days: store.returns.windowDays }) },
    { q: g.paymentQ, a: g.paymentA },
    { q: g.taxesQ, a: taxesAtCheckout ? g.taxesExtra : g.taxesNone },
    { q: g.accountQ, a: g.accountA },
  ];
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6">
      <Reveal>
        <Eyebrow>{t.nav.faq}</Eyebrow>
        <SectionTitle id="faq-title">{t.blocks.faqTitle}</SectionTitle>
      </Reveal>
      <FaqAccordion items={items} />
    </div>
  );
}
