"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { prizeLabel, prizeOdds, scratchGame, type Prize } from "@/config/promo";
import { fmt, infoHref } from "@/content";
import { IconBone, IconPaw } from "./ui/icons";
import { btn, Spinner } from "./ui/primitives";
import { useStore } from "./store/store-provider";

type Ticket = { code: string; prize: Prize; expiresAt: string; redeemed: boolean };
type Phase = "idle" | "loading" | "ready" | "revealed" | "error";

const LS_KEY = "borea-scratch";
const OPEN_EVENT = "borea:scratch-open";

/** Ouvre la fenêtre du jeu depuis n'importe quel composant (bloc d'achat, panier…). */
export function openScratchGame() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}
type Saved = { snoozedAt?: string; revealed?: boolean };

function readSaved(): Saved {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? "{}") as Saved;
  } catch {
    return {};
  }
}
function writeSaved(patch: Saved) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ ...readSaved(), ...patch }));
  } catch {
    /* stockage indisponible */
  }
}

/* ─── Dessin de la couverture : os et pattes de chien ─────────────────────── */

function drawPaw(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.ellipse(0, s * 0.28, s * 0.36, s * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const [dx, dy, r] of [
    [-0.42, -0.12, 0.15],
    [-0.15, -0.38, 0.16],
    [0.15, -0.38, 0.16],
    [0.42, -0.12, 0.15],
  ]) {
    ctx.beginPath();
    ctx.ellipse(dx * s, dy * s, r * s, r * s * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBone(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillRect(-s * 0.45, -s * 0.09, s * 0.9, s * 0.18);
  for (const [dx, dy] of [
    [-0.45, -0.11],
    [-0.45, 0.11],
    [0.45, -0.11],
    [0.45, 0.11],
  ]) {
    ctx.beginPath();
    ctx.arc(dx * s, dy * s, s * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function paintCover(canvas: HTMLCanvasElement, label: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  const u = w / 360; // unité relative
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#FF3B00";
  ctx.fillRect(0, 0, w, h);
  // Motif régulier d'os et de pattes (pseudo-aléatoire stable).
  ctx.fillStyle = "rgba(14,14,14,0.85)";
  let i = 0;
  for (let y = 18 * u; y < h + 20 * u; y += 46 * u) {
    for (let x = (i % 2) * 26 * u + 16 * u; x < w + 20 * u; x += 52 * u) {
      const rot = ((i * 37) % 360) * (Math.PI / 180);
      if (i % 3 === 0) drawBone(ctx, x, y, 30 * u, rot);
      else drawPaw(ctx, x, y, 22 * u, rot / 3);
      i++;
    }
    i++;
  }
  // Étiquette centrale.
  const fontFamily = getComputedStyle(document.documentElement).getPropertyValue("--font-unbounded").trim() || "Arial Black, sans-serif";
  const bw = 230 * u;
  const bh = 54 * u;
  ctx.fillStyle = "#0E0E0E";
  ctx.fillRect((w - bw) / 2 + 5 * u, (h - bh) / 2 + 5 * u, bw, bh);
  ctx.fillStyle = "#F4F3EF";
  ctx.fillRect((w - bw) / 2, (h - bh) / 2, bw, bh);
  ctx.strokeStyle = "#0E0E0E";
  ctx.lineWidth = 3 * u;
  ctx.strokeRect((w - bw) / 2, (h - bh) / 2, bw, bh);
  ctx.fillStyle = "#0E0E0E";
  ctx.font = `800 ${20 * u}px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label.toUpperCase(), w / 2, h / 2 + 1 * u);
}

/* ─── Carte à gratter ──────────────────────────────────────────────────────── */

function ScratchCard({ ticket, onReveal, label, ariaLabel }: { ticket: Ticket | null; onReveal: () => void; label: string; ariaLabel: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const moves = useRef(0);
  const done = useRef(false);

  // La fenêtre est fermée (taille nulle) au montage : la couverture est peinte dès que la
  // carte a une taille réelle, puis repeinte si elle change avant le premier coup de grattage.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const fit = () => {
      if (moves.current > 0) return;
      const rect = c.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.round(rect.width * dpr);
      c.height = Math.round(rect.height * dpr);
      paintCover(c, label);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(c);
    return () => ro.disconnect();
  }, [label]);

  const scratchedRatio = () => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d", { willReadFrequently: true });
    if (!c || !ctx) return 0;
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    let clear = 0;
    let total = 0;
    for (let i = 3; i < data.length; i += 4 * 24) {
      total++;
      if (data[i] < 32) clear++;
    }
    return total ? clear / total : 0;
  };

  const scratchAt = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx || done.current || !ticket) return;
    const r = c.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * c.width;
    const y = ((e.clientY - r.top) / r.height) * c.height;
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = c.width * 0.12;
    ctx.beginPath();
    const from = last.current ?? { x, y };
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(x + 0.01, y);
    ctx.stroke();
    last.current = { x, y };
    if (++moves.current % 6 === 0 && scratchedRatio() >= scratchGame.revealThreshold) {
      done.current = true;
      onReveal();
    }
  };

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={ariaLabel}
      data-testid="scratch-canvas"
      className={`absolute inset-0 size-full touch-none ${ticket ? "cursor-grab active:cursor-grabbing" : "cursor-wait"}`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        last.current = null;
        scratchAt(e);
      }}
      onPointerMove={(e) => {
        if (e.buttons === 0 && e.pointerType === "mouse") return;
        scratchAt(e);
      }}
      onPointerUp={() => (last.current = null)}
    />
  );
}

/* ─── Fenêtre du jeu ───────────────────────────────────────────────────────── */

export function ScratchGame() {
  const { t, locale, promo, setPromo } = useStore();
  const s = t.scratch;
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealedBefore, setRevealedBefore] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isCheckout = pathname.includes("/checkout/");
  const applied = !!ticket && promo?.code === ticket.code;

  const load = useCallback(async () => {
    setPhase("loading");
    setError(null);
    try {
      const res = await fetch("/api/scratch", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = (await res.json().catch(() => ({}))) as Partial<Ticket> & { error?: string };
      if (!res.ok || !data.code || !data.prize) {
        setError(data.error === "limit_reached" ? s.limit : s.error);
        setPhase("error");
        return;
      }
      setTicket(data as Ticket);
      setPhase(readSaved().revealed ? "revealed" : "ready");
    } catch {
      setError(s.error);
      setPhase("error");
    }
  }, [s.error, s.limit]);

  const open = useCallback(() => {
    const d = dialog.current;
    if (!d || d.open) return;
    d.showModal();
    if (phase === "idle" || phase === "error") void load();
  }, [load, phase]);

  const close = () => dialog.current?.close();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture de localStorage après le montage
    setMounted(true);
    setRevealedBefore(!!readSaved().revealed);
  }, []);

  useEffect(() => {
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, [open]);

  // Ouverture automatique : une fois, sur la page d'accueil, si le visiteur n'a pas encore joué.
  useEffect(() => {
    if (!scratchGame.enabled || pathname !== `/${locale}`) return;
    const saved = readSaved();
    if (saved.revealed || promo) return;
    if (saved.snoozedAt && Date.now() - new Date(saved.snoozedAt).getTime() < scratchGame.snoozeDays * 864e5) return;
    const timer = setTimeout(() => {
      if (!document.querySelector("dialog[open]")) open();
    }, scratchGame.autoOpenDelayMs);
    return () => clearTimeout(timer);
  }, [pathname, locale, promo, open]);

  const reveal = () => {
    setPhase("revealed");
    setRevealedBefore(true);
    writeSaved({ revealed: true });
  };

  const apply = () => {
    if (!ticket) return;
    setPromo({ code: ticket.code, prizeId: ticket.prize.id, expiresAt: ticket.expiresAt });
  };

  if (!scratchGame.enabled || !mounted || isCheckout) return null;
  const date = ticket ? new Date(ticket.expiresAt).toLocaleDateString(locale === "fr" ? "fr-CA" : "en-CA", { day: "numeric", month: "long" }) : "";
  const showFloating = !promo;

  return (
    <>
      {showFloating && (
        <button
          type="button"
          onClick={open}
          className="fixed left-0 top-1/2 z-30 hidden -translate-y-1/2 rotate-180 items-center gap-2 border-[3px] border-r-0 border-ink bg-accent px-2 py-3 font-display text-[11px] font-bold uppercase tracking-wider text-ink [writing-mode:vertical-rl] md:flex"
        >
          <IconPaw width={16} height={16} className="rotate-90" />
          {revealedBefore ? s.code : s.floating}
        </button>
      )}

      <dialog
        ref={dialog}
        aria-labelledby="scratch-title"
        onClose={() => {
          if (phase !== "revealed") writeSaved({ snoozedAt: new Date().toISOString() });
        }}
        onClick={(e) => {
          if (e.target === dialog.current) close();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md border-[3px] border-ink bg-paper p-0 text-ink shadow-[var(--shadow-hard)]"
      >
        <div className="flex items-center justify-between border-b-[3px] border-ink bg-ink px-4 py-2 text-paper">
          <p className="flex items-center gap-2 text-accent" aria-hidden="true">
            <IconBone width={20} height={20} />
            <IconPaw width={18} height={18} />
            <IconBone width={20} height={20} />
            <IconPaw width={18} height={18} />
          </p>
          <button type="button" onClick={close} className="border-2 border-paper px-2 py-1 font-mono text-xs font-bold uppercase hover:bg-accent hover:text-ink">
            {s.close}
          </button>
        </div>

        <div className="p-5 text-left">
          <h2 id="scratch-title" className="font-display text-[clamp(28px,7vw,40px)] font-extrabold uppercase leading-none tracking-[-0.03em]">
            {s.title}
          </h2>
          <p className="mt-2 text-sm">{s.subtitle}</p>

          {/* Carte : résultat dessous, couverture à gratter dessus */}
          <div className="relative mt-5 aspect-[16/10] w-full overflow-hidden border-[3px] border-ink bg-white select-none">
            <div className="absolute inset-0 flex flex-col items-start justify-center gap-1 p-5" aria-live="polite">
              {phase === "loading" || phase === "idle" ? (
                <p className="flex items-center gap-2 font-mono text-sm font-bold">
                  <Spinner /> {s.loading}
                </p>
              ) : phase === "error" ? (
                <p className="font-bold">{error}</p>
              ) : ticket && (phase === "revealed" || phase === "ready") ? (
                <div className={phase === "ready" ? "invisible" : ""} data-testid="scratch-result">
                  <p className="font-mono text-xs font-bold uppercase tracking-wider">{s.won}</p>
                  <p className="font-display text-[clamp(30px,9vw,48px)] font-extrabold uppercase leading-none tracking-[-0.03em]">
                    {prizeLabel(ticket.prize, locale)}
                  </p>
                  <p className="mt-2 font-mono text-sm">
                    {s.code} : <strong>{ticket.code}</strong>
                  </p>
                  <p className="text-xs text-muted">{fmt(s.validUntil, { date })}</p>
                </div>
              ) : null}
            </div>
            {phase !== "revealed" && phase !== "error" && (
              <ScratchCard ticket={phase === "ready" ? ticket : null} onReveal={reveal} label={s.scratchHere} ariaLabel={s.canvasLabel} />
            )}
          </div>

          {phase === "ready" && (
            <button type="button" onClick={reveal} className={`${btn.ghost} mt-2 text-sm`}>
              {s.reveal}
            </button>
          )}

          {phase === "revealed" && ticket && (
            <div className="mt-4 space-y-3 pr-[6px]">
              {ticket.redeemed ? (
                <p className="border-2 border-ink bg-white p-2 text-sm font-bold">{s.alreadyUsed}</p>
              ) : applied ? (
                <p className="border-2 border-ink bg-accent p-2 text-sm font-bold" role="status">
                  {s.applied}
                </p>
              ) : (
                <button type="button" onClick={apply} className={`${btn.primary} w-full`}>
                  {s.apply}
                </button>
              )}
              {ticket.prize.type === "bogo" && <p className="text-sm">{s.bogoNote}</p>}
              <button type="button" onClick={close} className={`${btn.outline} w-full`}>
                {applied ? s.close : s.later}
              </button>
            </div>
          )}

          <div className="mt-5 border-t-2 border-ink pt-3 text-[12px]">
            <p className="font-mono font-bold uppercase tracking-wider">{s.odds}</p>
            <ul className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 tabular-nums" data-testid="scratch-odds">
              {scratchGame.prizes
                .slice()
                .sort((a, b) => b.weight - a.weight)
                .map((p) => (
                  <li key={p.id} className={p.type === "bogo" ? "col-span-2" : undefined}>
                    <strong>{prizeLabel(p, locale)}</strong> : {prizeOdds(p, locale)}
                  </li>
                ))}
            </ul>
            <p className="mt-2 opacity-70">
              {s.noPurchase} {s.stack} {fmt(s.validity, { days: scratchGame.validityDays })}
            </p>
            <a href={infoHref(locale, "game")} className="mt-1 inline-block font-bold underline decoration-2 underline-offset-2">
              {s.rulesLink}
            </a>
          </div>
        </div>
      </dialog>
    </>
  );
}

/** Accès au jeu depuis le bloc d'achat (visible sur mobile, où l'onglet flottant est masqué). */
export function ScratchEntry() {
  const { t, locale, promo, promoResult } = useStore();
  if (!scratchGame.enabled) return null;
  if (promo) {
    return (
      <p className="flex items-center gap-2 border-2 border-ink bg-white px-3 py-2 text-sm font-bold" data-testid="scratch-applied">
        <IconPaw width={16} height={16} className="shrink-0" />
        {t.scratch.promoLine} : {prizeLabel(promo.prize, locale)} ({promo.code})
        {promoResult?.status === "needs_second_item" ? ` — ${t.scratch.needsSecond}` : ""}
      </p>
    );
  }
  return (
    <button
      type="button"
      onClick={openScratchGame}
      className="flex w-full items-center gap-2 border-2 border-dashed border-ink bg-white px-3 py-2 text-left text-sm font-bold hover:bg-accent"
      data-testid="scratch-entry"
    >
      <IconBone width={20} height={20} className="shrink-0" />
      {t.scratch.entry}
      <IconPaw width={16} height={16} className="ml-auto shrink-0" />
    </button>
  );
}
