import Link from "next/link";
import { getMedia, product } from "@/config/product";
import { store } from "@/config/store";
import type { Locale } from "@/config/types";
import { fmt, getDictionary, infoHref } from "@/content";
import { defaultShipping, deliveryEstimate } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { BenefitIcons, IconChat, IconChevron, IconLock, IconReturn, IconTruck } from "../ui/icons";
import { Eyebrow, ProductImage, Reveal, SectionTitle } from "../ui/primitives";

const wrap = "mx-auto max-w-6xl px-4 sm:px-6";

export function Benefits({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  return (
    <div className={wrap}>
      <Reveal className="mx-auto max-w-2xl text-center">
        <Eyebrow>{t.sections.benefitsEyebrow}</Eyebrow>
        <SectionTitle id="benefits-title">{t.sections.benefitsTitle}</SectionTitle>
      </Reveal>
      <ul className={`mt-10 grid gap-4 sm:grid-cols-2 ${product.benefits.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        {product.benefits.map((b, i) => {
          const Icon = BenefitIcons[b.icon];
          return (
            <li key={i}>
              <Reveal delay={i * 80} className="h-full rounded-3xl bg-white p-6 ring-1 ring-line">
                <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                  <Icon width={26} height={26} />
                </span>
                <h3 className="mt-4 font-display text-xl font-bold">{b.title[locale]}</h3>
                <p className="mt-2 leading-relaxed text-ink-soft">{b.text[locale]}</p>
              </Reveal>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Demo({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const lifestyle = getMedia("lifestyle");
  return (
    <div className={`${wrap} grid grid-cols-1 items-center gap-10 md:grid-cols-2`}>
      <Reveal className="order-2 md:order-1">
        <Eyebrow>{t.sections.demoEyebrow}</Eyebrow>
        <SectionTitle id="demo-title">{fmt(t.sections.demoTitle, { count: product.steps.length })}</SectionTitle>
        <ol className="mt-8 space-y-5">
          {product.steps.map((s, i) => (
            <li key={i} className="flex gap-4">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-ink font-display text-lg font-bold text-white">{i + 1}</span>
              <div>
                <h3 className="font-display text-lg font-bold">{s.title[locale]}</h3>
                <p className="mt-1 leading-relaxed text-ink-soft">{s.text[locale]}</p>
              </div>
            </li>
          ))}
        </ol>
      </Reveal>
      <Reveal className="order-1 md:order-2">
        <div className="relative overflow-hidden rounded-[28px] bg-sand shadow-[var(--shadow-soft)]">
          {product.video ? (
            <video controls playsInline preload="none" poster={product.video.poster} className="aspect-[16/10] w-full object-cover" aria-label={product.video.title[locale]}>
              <source src={product.video.src} />
            </video>
          ) : (
            <>
              <ProductImage media={lifestyle} locale={locale} sizes="(min-width: 768px) 50vw, 100vw" className="aspect-[16/10] w-full object-cover" />
              <p className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-ink-soft">{t.sections.demoVideoMissing}</p>
            </>
          )}
        </div>
      </Reveal>
    </div>
  );
}

export function DetailsSpecs({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-display text-xl font-bold">{t.sections.specs}</h3>
        <dl className="mt-4 divide-y divide-line overflow-hidden rounded-2xl bg-white ring-1 ring-line">
          {product.specs.map((s, i) => (
            <div key={i} className="grid grid-cols-[40%_1fr] gap-4 px-4 py-3 text-sm sm:px-5">
              <dt className="font-semibold">{s.label[locale]}</dt>
              <dd className="text-ink-soft">{s.value[locale]}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div>
        <h3 className="font-display text-xl font-bold">{t.sections.inTheBox}</h3>
        <ul className="mt-4 space-y-2">
          {product.packageContents.map((c, i) => (
            <li key={i} className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm ring-1 ring-line">
              <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
              {c[locale]}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function Reassurance({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const est = deliveryEstimate();
  const items = [
    { icon: IconLock, title: t.reassurance.paymentTitle, text: t.reassurance.paymentText, href: null },
    { icon: IconTruck, title: t.reassurance.shippingTitle, text: fmt(t.reassurance.shippingText, est), href: infoHref(locale, "shipping") },
    { icon: IconChat, title: t.reassurance.supportTitle, text: fmt(t.reassurance.supportText, { response: store.contact.responseTime[locale] }), href: infoHref(locale, "contact") },
    { icon: IconReturn, title: t.reassurance.returnsTitle, text: fmt(t.reassurance.returnsText, { days: store.returns.windowDays }), href: infoHref(locale, "returns") },
  ];
  return (
    <div className={wrap}>
      <Reveal className="text-center">
        <SectionTitle id="reassurance-title">{t.sections.reassuranceTitle}</SectionTitle>
      </Reveal>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it, i) => (
          <li key={i}>
            <Reveal delay={i * 70} className="h-full rounded-3xl bg-pine-soft/60 p-6">
              <it.icon width={28} height={28} className="text-pine" />
              <h3 className="mt-3 font-display text-lg font-bold">{it.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{it.text}</p>
              {it.href && (
                <Link href={it.href} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-pine underline-offset-4 hover:underline">
                  {it.title} <IconChevron width={16} height={16} />
                </Link>
              )}
            </Reveal>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Masquée tant qu'aucun avis réel n'est configuré. */
export function Reviews({ locale }: { locale: Locale }) {
  if (product.reviews.length === 0) return null;
  const t = getDictionary(locale);
  return (
    <section id="reviews" aria-labelledby="reviews-title" className="py-16">
      <div className={wrap}>
        <SectionTitle id="reviews-title">{t.sections.reviewsTitle}</SectionTitle>
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {product.reviews.map((r, i) => (
            <li key={i} className="rounded-3xl bg-white p-6 ring-1 ring-line">
              <p className="text-accent" aria-label={`${r.rating}/5`}>
                {"★".repeat(r.rating)}
                <span className="text-line">{"★".repeat(5 - r.rating)}</span>
              </p>
              <blockquote className="mt-3 leading-relaxed">{r.text[locale]}</blockquote>
              <p className="mt-3 text-sm font-semibold">
                {r.author} <span className="font-normal text-muted">· {r.date}</span>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Faq({ locale, taxesAtCheckout }: { locale: Locale; taxesAtCheckout: boolean }) {
  const t = getDictionary(locale);
  const ship = defaultShipping;
  const est = deliveryEstimate();
  const shippingText =
    ship.freeFromSubtotalCents !== null
      ? fmt(t.buy.shippingLine, { amount: formatMoney(ship.amountCents, locale), threshold: formatMoney(ship.freeFromSubtotalCents, locale) })
      : fmt(t.buy.shippingFlat, { amount: formatMoney(ship.amountCents, locale) });
  const g = t.faqGeneral;
  const items = [
    ...product.faq.map((f) => ({ q: f.q[locale], a: f.a[locale] })),
    { q: g.shippingQ, a: fmt(g.shippingA, { shipping: shippingText }) },
    {
      q: g.delayQ,
      a: fmt(g.delayA, { pmin: ship.processingDays.min, pmax: ship.processingDays.max, tmin: ship.transitDays.min, tmax: ship.transitDays.max, min: est.min, max: est.max }),
    },
    { q: g.returnsQ, a: fmt(g.returnsA, { days: store.returns.windowDays }) },
    { q: g.paymentQ, a: g.paymentA },
    { q: g.taxesQ, a: taxesAtCheckout ? g.taxesExtra : g.taxesNone },
    { q: g.accountQ, a: g.accountA },
  ];
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <Reveal className="text-center">
        <Eyebrow>{t.sections.faqEyebrow}</Eyebrow>
        <SectionTitle id="faq-title">{t.sections.faqTitle}</SectionTitle>
      </Reveal>
      <div className="mt-8 divide-y divide-line overflow-hidden rounded-3xl bg-white ring-1 ring-line">
        {items.map((it, i) => (
          <details key={i} className="group">
            <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold transition hover:bg-sand/60 sm:px-6">
              {it.q}
              <IconChevron width={20} height={20} className="shrink-0 rotate-90 transition group-open:-rotate-90" />
            </summary>
            <p className="px-5 pb-5 leading-relaxed text-ink-soft sm:px-6">{it.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
