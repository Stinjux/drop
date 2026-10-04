import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OpenCartButton } from "@/components/store/order-status";
import { btn } from "@/components/ui/primitives";
import { isLocale } from "@/config/types";
import { getDictionary } from "@/content";

export const metadata: Metadata = { robots: { index: false } };

export default async function CancelPage({ params }: PageProps<"/[locale]/checkout/cancel">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center sm:py-24">
      <h1 className="font-display text-4xl font-bold">{t.cancel.title}</h1>
      <p className="mt-4 text-lg text-ink-soft">{t.cancel.text}</p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <OpenCartButton label={t.cancel.backToCart} />
        <Link href={`/${locale}`} className={btn.secondary}>
          {t.cancel.back}
        </Link>
      </div>
    </div>
  );
}
