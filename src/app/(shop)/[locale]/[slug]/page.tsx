import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InfoPageContent, INFO_TITLES } from "@/components/info-pages";
import { isLocale, LOCALES } from "@/config/types";
import { INFO_PAGES, infoPageFromSlug } from "@/content";

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.flatMap((locale) => Object.values(INFO_PAGES).map((slugs) => ({ locale, slug: slugs[locale] })));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const id = infoPageFromSlug(locale, slug);
  if (!id) return {};
  return {
    title: INFO_TITLES[id][locale],
    alternates: { canonical: `/${locale}/${slug}`, languages: { "fr-CA": `/fr/${INFO_PAGES[id].fr}`, "en-CA": `/en/${INFO_PAGES[id].en}` } },
  };
}

export default async function InfoPage({ params }: PageProps<"/[locale]/[slug]">) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const id = infoPageFromSlug(locale, slug);
  if (!id) notFound();
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="display-lg uppercase">{INFO_TITLES[id][locale]}</h1>
      <InfoPageContent id={id} locale={locale} />
    </article>
  );
}
