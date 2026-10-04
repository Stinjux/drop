"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { getMedia, product } from "@/config/product";
import { IconChevron, IconClose, IconZoom } from "../ui/icons";
import { ProductImage } from "../ui/primitives";
import { useStore } from "./store-provider";

/** Galerie avec vignettes et visionneuse plein écran (zoom au clic, déplacement au pointeur, pincement sur mobile). */
export function Gallery() {
  const { locale, t } = useStore();
  const items = product.gallery.map((id) => getMedia(id));
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const dialog = useRef<HTMLDialogElement>(null);
  const current = items[index];

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const go = (delta: number) => {
    setZoomed(false);
    setIndex((i) => (i + delta + items.length) % items.length);
  };

  const onMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (!zoomed) return;
    const r = e.currentTarget.getBoundingClientRect();
    setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
  };

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block w-full overflow-hidden rounded-3xl bg-sand"
        aria-label={`${t.a11y.zoom} — ${current.alt[locale]}`}
      >
        <ProductImage
          key={current.id}
          media={current}
          locale={locale}
          sizes="(min-width: 768px) 50vw, 100vw"
          className="aspect-square w-full object-cover transition duration-500 group-hover:scale-[1.03] animate-fade"
        />
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-sm font-medium shadow">
          <IconZoom width={18} height={18} /> {t.a11y.zoom}
        </span>
      </button>

      <ul className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Galerie">
        {items.map((m, i) => (
          <li key={m.id} className="shrink-0">
            <button
              type="button"
              onClick={() => setIndex(i)}
              aria-current={i === index}
              aria-label={m.alt[locale]}
              className={`block size-16 overflow-hidden rounded-xl border-2 transition sm:size-20 ${i === index ? "border-ink" : "border-transparent opacity-75 hover:opacity-100"}`}
            >
              <ProductImage media={m} locale={locale} sizes="80px" className="size-full object-cover" />
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-xs text-muted">{t.sections.zoomHint}</p>

      <dialog
        ref={dialog}
        onClose={() => {
          setOpen(false);
          setZoomed(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(1);
          if (e.key === "ArrowLeft") go(-1);
        }}
        aria-label={current.alt[locale]}
        className="m-auto h-dvh max-h-none w-screen max-w-none bg-ink/95 p-0 text-white open:animate-fade"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between p-3">
            <p className="px-2 text-sm text-white/80">
              {index + 1} / {items.length}
            </p>
            <button type="button" onClick={() => setOpen(false)} className="inline-flex size-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label={t.a11y.close}>
              <IconClose />
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 [touch-action:pinch-zoom]">
            <button
              type="button"
              onClick={() => setZoomed((z) => !z)}
              onPointerMove={onMove}
              className={`relative max-h-full max-w-[min(100%,900px)] ${zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
              aria-label={t.a11y.zoom}
            >
              <ProductImage
                media={current}
                locale={locale}
                sizes="100vw"
                className="max-h-[78dvh] w-auto object-contain transition-transform duration-300"
              />
              <span
                className="pointer-events-none absolute inset-0"
                style={zoomed ? { backgroundImage: `url(${current.src})`, backgroundSize: "220%", backgroundPosition: origin, backgroundColor: "#16202e" } : undefined}
                aria-hidden="true"
              />
            </button>
            <button type="button" onClick={() => go(-1)} className="absolute left-2 top-1/2 inline-flex size-12 -translate-y-1/2 rotate-180 items-center justify-center rounded-full bg-white/15 hover:bg-white/25" aria-label={t.a11y.previous}>
              <IconChevron />
            </button>
            <button type="button" onClick={() => go(1)} className="absolute right-2 top-1/2 inline-flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 hover:bg-white/25" aria-label={t.a11y.next}>
              <IconChevron />
            </button>
          </div>
          <p className="p-4 text-center text-sm text-white/80">{current.alt[locale]}</p>
        </div>
      </dialog>
    </div>
  );
}
