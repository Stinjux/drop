"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { store } from "@/config/store";
import { alternatePath, fmt } from "@/content";
import { useStore } from "../store/store-provider";
import { IconCart } from "../ui/icons";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="#16202E" />
        <path d="M7 21c3-6 6-9 9-9s6 3 9 9" stroke="#C2410C" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <path d="M10 22.5c2-3.4 4-5 6-5s4 1.6 6 5" stroke="#F3EDE4" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </svg>
      <span className="font-display text-xl font-bold tracking-tight">{store.brand.name}</span>
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
    { href: `${home}#benefits`, label: t.nav.benefits },
    { href: `${home}#demo`, label: t.nav.howItWorks },
    { href: `${home}#details`, label: t.nav.details },
    { href: `${home}#offers`, label: t.nav.offers },
    { href: `${home}#faq`, label: t.nav.faq },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-cream/90 backdrop-blur supports-[backdrop-filter]:bg-cream/75">
      <div className="mx-auto flex h-[var(--header-h)] max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href={home} className="rounded-md" aria-label={`${store.brand.name} — accueil`}>
          <Logo />
        </Link>

        <nav aria-label={t.a11y.mainNav} className="hidden md:block">
          <ul className="flex items-center gap-1">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="rounded-full px-3 py-2 text-sm font-medium text-ink-soft transition hover:bg-sand hover:text-ink">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-1.5">
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
            className="inline-flex h-10 items-center rounded-full px-3 text-sm font-semibold text-ink-soft transition hover:bg-sand hover:text-ink"
          >
            <span className="sm:hidden">{other.toUpperCase()}</span>
            <span className="hidden sm:inline">{t.nav.switchLanguage}</span>
          </Link>
          <button
            type="button"
            onClick={openDrawer}
            aria-label={fmt(t.nav.cartCount, { count: cartCount })}
            className="relative inline-flex size-11 items-center justify-center rounded-full bg-ink text-white transition hover:bg-ink-soft"
          >
            <IconCart />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-bold leading-5 text-white ring-2 ring-cream">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
