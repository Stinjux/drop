"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Locale, MediaItem } from "@/config/types";

export const btn = {
  primary:
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-base font-semibold text-white shadow-[var(--shadow-cta)] transition hover:bg-accent-hover active:scale-[0.98] disabled:cursor-wait disabled:opacity-80",
  secondary:
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-ink bg-white px-6 py-3 text-base font-semibold text-ink transition hover:bg-ink hover:text-white active:scale-[0.98] disabled:opacity-60",
  ghost:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2 font-semibold text-ink underline-offset-4 transition hover:underline",
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
      priority={priority}
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
    <div className={`inline-flex ${h} items-stretch overflow-hidden rounded-full border border-line bg-white`}>
      <button
        type="button"
        className={`${w} text-xl font-semibold text-ink transition hover:bg-sand disabled:opacity-35`}
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
        className="w-12 border-x border-line bg-transparent text-center text-base font-semibold tabular-nums [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        className={`${w} text-xl font-semibold text-ink transition hover:bg-sand disabled:opacity-35`}
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
  return <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-pine">{children}</p>;
}

export function SectionTitle({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="font-display text-3xl font-bold leading-tight tracking-tight text-balance sm:text-4xl">
      {children}
    </h2>
  );
}
