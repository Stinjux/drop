import Link from "next/link";
import { store } from "@/config/store";
import type { Locale } from "@/config/types";
import { getDictionary, infoHref } from "@/content";
import { Logo } from "./header";

export function Footer({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const links = [
    { href: infoHref(locale, "contact"), label: t.footer.contact },
    { href: infoHref(locale, "shipping"), label: t.footer.shipping },
    { href: infoHref(locale, "returns"), label: t.footer.returns },
    { href: infoHref(locale, "privacy"), label: t.footer.privacy },
    { href: infoHref(locale, "terms"), label: t.footer.terms },
  ];
  return (
    <footer id="site-footer" className="border-t border-line bg-ink text-white/85">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.2fr_1fr]">
        <div>
          <span className="text-white">
            <Logo />
          </span>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/70">{store.brand.tagline[locale]}</p>
          {store.contact.email && (
            <p className="mt-4 text-sm">
              <a href={`mailto:${store.contact.email}`} className="font-semibold text-white underline-offset-4 hover:underline">
                {store.contact.email}
              </a>
            </p>
          )}
        </div>
        <nav aria-label="Informations">
          <ul className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-white/80 underline-offset-4 hover:text-white hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-white/60 sm:flex-row sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} {store.legal.businessName || store.brand.name}. {t.footer.rights}
          </p>
          <p>{t.footer.payments}</p>
        </div>
      </div>
    </footer>
  );
}
