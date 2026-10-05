"use client";

import { AnimatePresence, m } from "framer-motion";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { getMedia, product } from "@/config/product";
import { IconChevron, IconClose, IconZoom } from "../ui/icons";
import { ProductImage } from "../ui/primitives";
import { useStore } from "./store-provider";

/** Galerie du hero : image principale, miniatures, visionneuse plein écran avec zoom. */
export function Gallery() {
  const { locale, t, mediaId } = useStore();
  const items = product.gallery.map((id) => getMedia(id));
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const dialog = useRef<HTMLDialogElement>(null);
  const current = items[index];

  // Le choix d'un coloris affiche sa photo.
  useEffect(() => {
    const i = items.findIndex((it) => it.id === mediaId);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronisation avec la variante choisie
    if (i >= 0) setIndex(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaId]);

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
    <div className="min-w-0" aria-label={t.hero.gallery} role="group">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative block w-full overflow-hidden border-[3px] border-ink bg-white shadow-[var(--shadow-hard)]"
        aria-label={`Zoom — ${current.alt[locale]}`}
      >
        <AnimatePresence initial={false} mode="popLayout">
          <m.div key={current.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <ProductImage media={current} locale={locale} priority={index === 0} sizes="(min-width: 1024px) 50vw, 100vw" className="aspect-square w-full object-cover" />
          </m.div>
        </AnimatePresence>
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 border-2 border-ink bg-white px-2 py-1 font-mono text-xs font-bold uppercase">
          <IconZoom width={16} height={16} /> Zoom
        </span>
      </button>

      <ul className="mt-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 6)}, minmax(0, 1fr))` }} aria-label={t.hero.gallery}>
        {items.map((it, i) => (
          <li key={it.id}>
            <button
              type="button"
              onClick={() => setIndex(i)}
              aria-current={i === index}
              aria-label={it.alt[locale]}
              className={`block aspect-square w-full overflow-hidden border-[3px] transition ${i === index ? "border-accent" : "border-ink opacity-70 hover:opacity-100"}`}
            >
              <ProductImage media={it} locale={locale} sizes="96px" className="size-full object-cover" />
            </button>
          </li>
        ))}
      </ul>

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
        className="m-auto h-dvh max-h-none w-screen max-w-none bg-paper p-0 text-ink"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b-[3px] border-ink p-3">
            <p className="font-mono text-sm font-bold">
              {String(index + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
            </p>
            <button type="button" onClick={() => setOpen(false)} className="btn-press inline-flex size-11 items-center justify-center border-[3px] border-ink bg-white" aria-label={t.a11y.close}>
              <IconClose />
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 [touch-action:pinch-zoom]">
            <button
              type="button"
              onClick={() => setZoomed((z) => !z)}
              onPointerMove={onMove}
              className={`relative max-h-full max-w-[min(100%,900px)] border-[3px] border-ink ${zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
              aria-label={t.a11y.zoom}
            >
              <ProductImage media={current} locale={locale} sizes="100vw" className="max-h-[76dvh] w-auto object-contain" />
              <span
                className="pointer-events-none absolute inset-0"
                style={zoomed ? { backgroundImage: `url(${current.src})`, backgroundSize: "220%", backgroundPosition: origin, backgroundColor: "#F4F3EF" } : undefined}
                aria-hidden="true"
              />
            </button>
            <button type="button" onClick={() => go(-1)} className="btn-press absolute left-3 top-1/2 inline-flex size-12 -translate-y-1/2 items-center justify-center border-[3px] border-ink bg-white" aria-label={t.a11y.previous}>
              <IconChevron className="rotate-180" />
            </button>
            <button type="button" onClick={() => go(1)} className="btn-press absolute right-3 top-1/2 inline-flex size-12 -translate-y-1/2 items-center justify-center border-[3px] border-ink bg-white" aria-label={t.a11y.next}>
              <IconChevron />
            </button>
          </div>
          <p className="border-t-[3px] border-ink p-3 text-center text-sm">{current.alt[locale]}</p>
        </div>
      </dialog>
    </div>
  );
}
