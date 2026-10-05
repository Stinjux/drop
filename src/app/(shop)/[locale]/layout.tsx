import "../../globals.css";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { preload } from "react-dom";
import { CartDrawer } from "@/components/store/cart-drawer";
import { ScratchGame } from "@/components/ScratchGame";
import { StoreProvider } from "@/components/store/store-provider";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { Footer } from "@/components/layout/footer";
import { MotionProvider } from "@/components/ui/motion-provider";
import { display, mono, SATOSHI_URL } from "../../fonts";
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
  themeColor: "#F4F3EF",
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
  // Police du corps (Satoshi, auto-hébergée) préchargée une seule fois.
  preload(SATOSHI_URL, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });

  return (
    <html lang={locale === "fr" ? "fr-CA" : "en-CA"} className={`${display.variable} ${mono.variable}`}>
      <body className="min-h-dvh">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:border-[3px] focus:border-accent focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
          {t.a11y.skipToContent}
        </a>
        <MotionProvider>
          <StoreProvider locale={locale} taxesAtCheckout={env.stripeTaxEnabled()}>
            {preview && (
              <p className="border-b-[3px] border-ink bg-white px-4 py-1.5 text-left font-mono text-xs font-bold sm:text-center" data-testid="preview-banner">
                {t.preview.banner}
              </p>
            )}
            <AnnouncementBar locale={locale} />
            <Header />
            <main id="main">{children}</main>
            <Footer locale={locale} />
            <CartDrawer />
            <ScratchGame />
          </StoreProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
