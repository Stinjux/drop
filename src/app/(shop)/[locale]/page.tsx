import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FinalCta } from "@/components/store/final-cta";
import { Hero } from "@/components/store/hero";
import { SectionCta } from "@/components/store/section-cta";
import { Faq, Features, HowItWorks, ProblemSolution, ReassuranceBand, Reviews } from "@/components/store/sections";
import { StickyBuyBar } from "@/components/store/sticky-bar";
import { getMedia, product, reviewSummary } from "@/config/product";
import { store } from "@/config/store";
import { isLocale } from "@/config/types";
import { baseUnitPrice } from "@/lib/pricing";
import { env } from "@/server/env";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const hero = getMedia("hero");
  return {
    title: { absolute: `${product.name[locale]} | ${store.brand.name}` },
    description: product.description[locale],
    alternates: {
      canonical: `/${locale}`,
      languages: { "fr-CA": "/fr", "en-CA": "/en", "x-default": "/fr" },
    },
    openGraph: {
      type: "website",
      locale: locale === "fr" ? "fr_CA" : "en_CA",
      siteName: store.brand.name,
      title: product.headline[locale],
      description: product.description[locale],
      url: `/${locale}`,
      images: hero.provisional ? [] : [{ url: hero.src, width: hero.width, height: hero.height, alt: hero.alt[locale] }],
    },
  };
}

/**
 * Données structurées schema.org Product : émises UNIQUEMENT quand le contenu est
 * confirmé. Prix réel ; note et avis uniquement à partir des vrais avis configurés.
 */
function ProductJsonLd({ locale }: { locale: "fr" | "en" }) {
  if (!product.confirmed) return null;
  const site = env.siteUrl();
  const summary = reviewSummary();
  const images = product.gallery.map((id) => getMedia(id)).filter((m) => !m.provisional).map((m) => `${site}${m.src}`);
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name[locale],
    description: product.description[locale],
    ...(images.length ? { image: images } : {}),
    brand: { "@type": "Brand", name: store.brand.name },
    sku: product.variants[0]?.sku,
    offers: {
      "@type": "Offer",
      url: `${site}/${locale}`,
      priceCurrency: store.currency,
      price: (baseUnitPrice(product.pricing.tiers) / 100).toFixed(2),
      availability: product.variants.some((v) => v.available) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: { "@type": "MonetaryAmount", value: "0", currency: store.currency },
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "CA" },
      },
    },
    ...(summary
      ? {
          aggregateRating: { "@type": "AggregateRating", ratingValue: summary.average, reviewCount: summary.count },
          review: product.reviews.map((r) => ({
            "@type": "Review",
            author: { "@type": "Person", name: r.author },
            datePublished: r.date,
            reviewBody: r.text[locale],
            reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
          })),
        }
      : {}),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const taxesAtCheckout = env.stripeTaxEnabled();
  const section = "border-b-[3px] border-ink py-16 sm:py-24";

  return (
    <>
      <ProductJsonLd locale={locale} />
      <Hero />
      <ReassuranceBand locale={locale} />

      <section id="problem" aria-labelledby="problem-title" className={section}>
        <ProblemSolution locale={locale} />
      </section>

      <section id="features" aria-labelledby="features-title" className={`${section} bg-grid`}>
        <Features locale={locale} />
        <SectionCta id="features" />
      </section>

      <section id="how" aria-labelledby="how-title" className={section}>
        <HowItWorks locale={locale} />
      </section>

      <Reviews locale={locale} />


      <section id="faq" aria-labelledby="faq-title" className={section}>
        <Faq locale={locale} taxesAtCheckout={taxesAtCheckout} />
      </section>

      <FinalCta />
      <StickyBuyBar />
    </>
  );
}
