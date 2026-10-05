"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Locale, MediaItem } from "@/config/types";

/** Boutons néo-brutalistes : bordure 3px, ombre dure 6px, s'enfoncent au clic (.btn-press). */
export const btn = {
  primary:
    "btn-press inline-flex min-h-14 items-center justify-center gap-2 border-[3px] border-ink bg-accent px-6 py-3 font-display text-sm font-bold uppercase tracking-wide text-ink hover:bg-accent-hover disabled:opacity-80 sm:text-base",
  secondary:
    "btn-press inline-flex min-h-14 items-center justify-center gap-2 border-[3px] border-ink bg-ink px-6 py-3 font-display text-sm font-bold uppercase tracking-wide text-paper disabled:opacity-70 sm:text-base",
  outline:
    "btn-press inline-flex min-h-12 items-center justify-center gap-2 border-[3px] border-ink bg-white px-5 py-2.5 font-display text-sm font-bold uppercase tracking-wide text-ink",
  ghost: "inline-flex min-h-11 items-center gap-2 px-1 py-2 font-semibold text-ink underline decoration-2 underline-offset-4 hover:decoration-accent",
};

export function Spinner() {
  return (
    <svg className="size-5 animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function ProductImage({
  media,
  locale,
  sizes,
  priority = false,
  className = "",
}: {
  media: MediaItem;
  locale: Locale;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={media.src}
      alt={media.alt[locale]}
      width={media.width}
      height={media.height}
      sizes={sizes}
      // Next 16 : `priority` est déprécié → préchargement + priorité réseau explicites pour l'image LCP.
      preload={priority}
      fetchPriority={priority ? "high" : undefined}
      loading={priority ? "eager" : "lazy"}
      // Les SVG provisoires ne passent pas par l'optimiseur ; les photos réelles (jpg/png/webp) oui.
      unoptimized={media.src.endsWith(".svg")}
      className={className}
    />
  );
}

/** Apparition discrète au défilement. Le contenu reste visible sans JavaScript. */
export function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"static" | "pending" | "in">("static");

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) return; // déjà visible : pas d'animation
    setState("pending");
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setState("in");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${state === "pending" ? "reveal-pending" : state === "in" ? "reveal-in" : ""} ${className}`}
      style={delay && state !== "static" ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

export function QuantityStepper({
  value,
  onChange,
  max,
  labels,
  size = "md",
  id,
}: {
  value: number;
  onChange: (v: number) => void;
  max: number;
  labels: { decrease: string; increase: string; quantity: string };
  size?: "sm" | "md";
  id?: string;
}) {
  const h = size === "sm" ? "h-10" : "h-12";
  const w = size === "sm" ? "w-10" : "w-12";
  return (
    <div className={`inline-flex ${h} items-stretch border-[3px] border-ink bg-white`}>
      <button
        type="button"
        className={`${w} font-mono text-xl font-bold text-ink transition hover:bg-accent disabled:opacity-30 disabled:hover:bg-transparent`}
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        aria-label={labels.decrease}
      >
        −
      </button>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        value={value}
        aria-label={labels.quantity}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-14 border-x-[3px] border-ink bg-transparent text-center font-mono text-lg font-bold tabular-nums [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        className={`${w} font-mono text-xl font-bold text-ink transition hover:bg-accent disabled:opacity-30 disabled:hover:bg-transparent`}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label={labels.increase}
      >
        +
      </button>
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="mb-4 inline-block border-2 border-ink bg-white px-2 py-0.5 font-mono text-xs font-bold uppercase tracking-[0.14em]">{children}</p>;
}

export function SectionTitle({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="display-lg text-balance">
      {children}
    </h2>
  );
}
