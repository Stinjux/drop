"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { store } from "@/config/store";
import { alternatePath, fmt } from "@/content";
import { useStore } from "../store/store-provider";
import { m } from "framer-motion";
import { IconCart } from "../ui/icons";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="inline-block size-4 border-[3px] border-current bg-accent" aria-hidden="true" />
      <span className="font-display text-lg font-bold uppercase tracking-tight sm:text-xl">{store.brand.name}</span>
    </span>
  );
}

export function Header() {
  const { locale, t, cartCount, openDrawer } = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const other = locale === "fr" ? "en" : "fr";
  const switchHref = alternatePath(pathname, other);
  const home = `/${locale}`;

  const links = [
    { href: `${home}#features`, label: t.blocks.featuresEyebrow },
    { href: `${home}#how`, label: t.blocks.howTitle },
    { href: `${home}#faq`, label: t.nav.faq },
  ];

  return (
    <header className="sticky top-0 z-40 border-b-[3px] border-ink bg-paper">
      <div className="mx-auto flex h-[var(--header-h)] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href={home} aria-label={`${store.brand.name} — accueil`}>
          <Logo />
        </Link>

        <nav aria-label={t.a11y.mainNav} className="hidden md:block">
          <ul className="flex items-center">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider hover:bg-ink hover:text-paper">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={switchHref}
            hrefLang={other === "fr" ? "fr-CA" : "en-CA"}
            lang={other}
            aria-label={t.nav.switchLanguageLabel}
            onClick={(e) => {
              document.cookie = `locale=${other}; path=/; max-age=31536000; samesite=lax`;
              // Conserver les paramètres (ex. session_id sur la page de confirmation).
              if (window.location.search) {
                e.preventDefault();
                router.push(`${switchHref}${window.location.search}`);
              }
            }}
            className="inline-flex h-11 items-center border-[3px] border-transparent px-2 font-mono text-sm font-bold uppercase hover:border-ink"
          >
            {other.toUpperCase()}
          </Link>
          <button
            type="button"
            onClick={openDrawer}
            aria-label={fmt(t.nav.cartCount, { count: cartCount })}
            className="btn-press relative inline-flex h-11 items-center gap-2 border-[3px] border-ink bg-white px-3 font-mono text-sm font-bold"
          >
            <IconCart width={20} height={20} />
            <m.span
              key={cartCount}
              initial={{ scale: 1.5 }}
              animate={{ scale: 1 }}
              className={`inline-flex min-w-6 justify-center border-2 border-ink px-1 tabular-nums ${cartCount > 0 ? "bg-accent" : "bg-paper"}`}
            >
              {cartCount}
            </m.span>
          </button>
        </div>
      </div>
    </header>
  );
}
