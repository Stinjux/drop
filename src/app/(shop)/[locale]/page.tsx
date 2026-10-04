import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Gallery } from "@/components/store/gallery";
import { FinalBuy } from "@/components/store/final-buy";
import { Hero } from "@/components/store/hero";
import { Offers } from "@/components/store/offers";
import { SectionCta } from "@/components/store/section-cta";
import { Benefits, Demo, DetailsSpecs, Faq, Reassurance, Reviews } from "@/components/store/sections";
import { StickyBuyBar } from "@/components/store/sticky-bar";
import { Eyebrow, Reveal, SectionTitle } from "@/components/ui/primitives";
import { getMedia, product } from "@/config/product";
import { store } from "@/config/store";
import { isLocale } from "@/config/types";
import { getDictionary } from "@/content";
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

/** Données structurées Product : émises UNIQUEMENT quand le contenu est confirmé (aucune note ni avis inventé). */
function ProductJsonLd({ locale }: { locale: "fr" | "en" }) {
  if (!product.confirmed) return null;
  const site = env.siteUrl();
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
    },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const taxesAtCheckout = env.stripeTaxEnabled();

  return (
    <>
      <ProductJsonLd locale={locale} />
      <Hero />

      <section id="benefits" aria-labelledby="benefits-title" className="bg-white/60 py-16 sm:py-24">
        <Benefits locale={locale} />
        <SectionCta id="benefits" secondary={{ href: "#offers", label: t.sections.offersTitle }} />
      </section>

      <section id="demo" aria-labelledby="demo-title" className="py-16 sm:py-24">
        <Demo locale={locale} />
        <SectionCta id="demo" />
      </section>

      <section id="details" aria-labelledby="details-title" className="bg-white/60 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="mb-10 max-w-2xl">
            <Eyebrow>{t.sections.detailsEyebrow}</Eyebrow>
            <SectionTitle id="details-title">{t.sections.detailsTitle}</SectionTitle>
          </Reveal>
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
            <Gallery />
            <DetailsSpecs locale={locale} />
          </div>
        </div>
        <SectionCta id="details" />
      </section>

      <section id="offers" aria-labelledby="offers-title" className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="mx-auto mb-8 max-w-2xl text-center">
            <Eyebrow>{t.sections.offersEyebrow}</Eyebrow>
            <SectionTitle id="offers-title">{t.sections.offersTitle}</SectionTitle>
            <p className="mt-3 text-ink-soft">{t.sections.offersSubtitle}</p>
          </Reveal>
          <Offers />
        </div>
      </section>

      <section id="reassurance" aria-labelledby="reassurance-title" className="bg-white/60 py-16 sm:py-24">
        <Reassurance locale={locale} />
      </section>

      <Reviews locale={locale} />

      <section id="faq" aria-labelledby="faq-title" className="py-16 sm:py-24">
        <Faq locale={locale} taxesAtCheckout={taxesAtCheckout} />
        <SectionCta id="faq" />
      </section>

      <section id="buy" aria-labelledby="final-title" className="pb-16 sm:pb-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-8 text-center">
            <Eyebrow>{t.sections.finalEyebrow}</Eyebrow>
            <SectionTitle id="final-title">{t.sections.finalTitle}</SectionTitle>
          </div>
          <FinalBuy />
        </div>
      </section>

      <StickyBuyBar />
    </>
  );
}
