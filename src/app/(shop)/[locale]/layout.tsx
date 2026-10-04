import "@fontsource-variable/inter";
import "@fontsource-variable/bricolage-grotesque";
import "../../globals.css";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { CartDrawer } from "@/components/store/cart-drawer";
import { StoreProvider } from "@/components/store/store-provider";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { product } from "@/config/product";
import { store } from "@/config/store";
import { isLocale, LOCALES } from "@/config/types";
import { getDictionary } from "@/content";
import { env } from "@/server/env";

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: "#FBF8F3",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    metadataBase: new URL(env.siteUrl()),
    title: { default: `${product.name[locale]} | ${store.brand.name}`, template: `%s | ${store.brand.name}` },
    description: product.description[locale],
    applicationName: store.brand.name,
    // Pas d'indexation tant que le contenu produit n'est pas confirmé.
    robots: product.confirmed ? { index: true, follow: true } : { index: false, follow: false },
  };
}

export default async function ShopLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const preview = !product.confirmed;

  return (
    <html lang={locale === "fr" ? "fr-CA" : "en-CA"}>
      <body className="min-h-dvh">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
          {t.a11y.skipToContent}
        </a>
        <StoreProvider locale={locale} taxesAtCheckout={env.stripeTaxEnabled()}>
          {preview && (
            <p className="bg-ink px-4 py-2 text-center text-xs font-medium text-white/90" data-testid="preview-banner">
              {t.preview.banner}
            </p>
          )}
          <Header />
          <main id="main">{children}</main>
          <Footer locale={locale} />
          <CartDrawer />
        </StoreProvider>
      </body>
    </html>
  );
}
