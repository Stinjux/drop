import Link from "next/link";
import { store } from "@/config/store";
import type { Locale } from "@/config/types";
import { getDictionary, infoHref } from "@/content";
import { Logo } from "./header";

export function Footer({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const links = [
    { href: infoHref(locale, "terms"), label: t.footer.terms },
    { href: infoHref(locale, "privacy"), label: t.footer.privacy },
    { href: infoHref(locale, "returns"), label: t.footer.returns },
    { href: infoHref(locale, "contact"), label: t.footer.contact },
    { href: infoHref(locale, "tracking"), label: t.footer.tracking },
    { href: infoHref(locale, "shipping"), label: t.footer.shipping },
  ];
  return (
    <footer id="site-footer" className="border-t-[3px] border-ink bg-ink text-paper">
      <div className="mx-auto grid max-w-7xl grid-cols-1 md:grid-cols-[1.2fr_2fr]">
        <div className="border-b-[3px] border-paper/20 p-6 sm:p-8 md:border-b-0 md:border-r-[3px]">
          <Logo />
          <p className="mt-4 max-w-sm text-sm text-paper/75">{store.brand.tagline[locale]}</p>
          {store.contact.email && (
            <a href={`mailto:${store.contact.email}`} className="mt-4 inline-block font-mono text-sm font-bold underline decoration-accent decoration-2 underline-offset-4">
              {store.contact.email}
            </a>
          )}
        </div>
        <nav aria-label="Informations légales">
          <ul className="grid grid-cols-2 sm:grid-cols-3">
            {links.map((l) => (
              <li key={l.href} className="border-b-[3px] border-r-[3px] border-paper/20">
                <Link href={l.href} className="block p-5 font-mono text-xs font-bold uppercase tracking-wider hover:bg-accent hover:text-ink sm:p-6 sm:text-sm">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="mx-auto flex max-w-7xl flex-col gap-1 px-6 py-5 font-mono text-xs text-paper/70 sm:flex-row sm:justify-between sm:px-8">
        <p>
          © {new Date().getFullYear()} {store.legal.businessName || store.brand.name}. {t.footer.rights}
        </p>
        <p>{t.footer.payments}</p>
      </div>
    </footer>
  );
}
