import { store } from "@/config/store";
import type { Locale } from "@/config/types";
import { fmt, getDictionary } from "@/content";
import { deliveryEstimate } from "@/lib/catalog";

/** Bandeau défilant (marquee) des arguments clés. Statique si « réduire les animations ». */
export function AnnouncementBar({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).announce;
  const est = deliveryEstimate();
  const items = [t.freeShipping, fmt(t.returns, { days: store.returns.windowDays }), t.secure, t.canada, fmt(t.delivery, est)].map((s) => s.toUpperCase());
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((it, i) => (
        <li key={i} className="flex items-center whitespace-nowrap px-4 font-mono text-xs font-bold tracking-wider sm:text-sm">
          {it}
          <span className="ml-8 inline-block size-2 bg-accent" aria-hidden="true" />
        </li>
      ))}
    </ul>
  );
  return (
    <div className="group overflow-hidden border-b-[3px] border-ink bg-ink py-2 text-paper">
      <p className="sr-only">{items.join(" — ")}</p>
      <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none" aria-hidden="true">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
