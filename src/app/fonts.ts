import localFont from "next/font/local";

/**
 * Polices auto-hébergées et préchargées (next/font) :
 * - Unbounded (titres) et JetBrains Mono (prix, compteurs) : SIL Open Font License, via npm.
 * - Satoshi (corps) : Fontshare, téléchargée par scripts/fetch-fonts.mjs dans public/fonts
 *   (non versionnée), déclarée dans globals.css et préchargée dans les layouts.
 */
export const display = localFont({
  src: [
    // Sous-ensemble latin : couvre le français (é, è, à, ç, œ…). Le latin étendu (119 Ko) est inutile ici.
    { path: "../../node_modules/@fontsource-variable/unbounded/files/unbounded-latin-wght-normal.woff2", weight: "200 900" },
  ],
  variable: "--font-unbounded",
  display: "swap",
  preload: true,
  fallback: ["Arial Black", "system-ui", "sans-serif"],
});

export const mono = localFont({
  src: [{ path: "../../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2", weight: "100 800" }],
  variable: "--font-jetbrains",
  display: "swap",
  preload: true,
  fallback: ["ui-monospace", "Menlo", "monospace"],
});

export const SATOSHI_URL = "/fonts/Satoshi-Variable.woff2";
