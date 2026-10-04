"use client";

import { getMedia, getVariant, product } from "@/config/product";
import { store } from "@/config/store";
import { fmt } from "@/content";
import { IconLock, IconPlay, IconReturn, IconTruck, IconUser } from "../ui/icons";
import { btn, ProductImage } from "../ui/primitives";
import { BuyControls } from "./buy-controls";
import { useStore } from "./store-provider";

export function Hero() {
  const { locale, t, variantId } = useStore();
  const media = getMedia(getVariant(variantId)?.mediaId);

  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(60%_60%_at_20%_10%,#fdecdf_0%,transparent_70%),radial-gradient(50%_50%_at_90%_0%,#e2f0ee_0%,transparent_70%)]"
        aria-hidden="true"
      />
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 px-4 pb-12 pt-4 sm:px-6 md:grid-cols-2 md:gap-12 md:pb-20 md:pt-10">
        <div className="md:sticky md:top-[calc(var(--header-h)+24px)] md:self-start">
          <div className="overflow-hidden rounded-[28px] bg-sand shadow-[var(--shadow-soft)]">
            <ProductImage
              key={media.id}
              media={media}
              locale={locale}
              priority
              sizes="(min-width: 768px) 50vw, 100vw"
              className="aspect-[4/3] w-full object-cover animate-fade md:aspect-square"
            />
          </div>
        </div>

        <div className="flex flex-col">
          <p className="mb-3 hidden w-fit items-center gap-2 rounded-full bg-white px-3 py-1 text-sm sm:inline-flex font-medium text-ink-soft shadow-sm ring-1 ring-line">
            <IconTruck width={18} height={18} className="text-pine" /> {t.trust.shipsCanada}
          </p>
          <h1 id="hero-title" className="font-display text-[2rem] font-bold leading-[1.05] tracking-tight text-balance sm:text-5xl">
            {product.headline[locale]}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-ink-soft text-pretty sm:mt-4 sm:text-lg">{product.subheadline[locale]}</p>
          <p className="mt-2 text-sm font-medium text-muted">{product.name[locale]}</p>

          <div id="buy-box" data-anchor className="mt-5 rounded-3xl bg-white p-5 shadow-[var(--shadow-soft)] ring-1 ring-line sm:p-6">
            <BuyControls source="hero" />
          </div>

          <a href="#demo" className={`${btn.ghost} mt-3 w-fit self-center sm:self-start`}>
            <IconPlay width={22} height={22} className="text-accent" /> {t.buy.seeInAction}
          </a>

          <ul className="mt-5 grid grid-cols-2 gap-3 text-sm text-ink-soft">
            <li className="flex items-center gap-2">
              <IconLock width={18} height={18} className="shrink-0 text-pine" /> {t.trust.securePayment}
            </li>
            <li className="flex items-center gap-2">
              <IconReturn width={18} height={18} className="shrink-0 text-pine" /> {fmt(t.trust.returns, { days: store.returns.windowDays })}
            </li>
            <li className="flex items-center gap-2">
              <IconUser width={18} height={18} className="shrink-0 text-pine" /> {t.trust.noAccount}
            </li>
            <li className="flex items-center gap-2">
              <IconTruck width={18} height={18} className="shrink-0 text-pine" /> {t.trust.shipsCanada}
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
