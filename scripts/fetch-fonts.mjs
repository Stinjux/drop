/**
 * Télécharge Satoshi (Fontshare, ITF Free Font License) dans public/fonts/.
 * La licence autorise l'auto-hébergement sur VOTRE site, mais pas la redistribution :
 * les fichiers ne sont donc pas versionnés (dépôt public). Sans eux, la police de
 * repli système s'applique et le build fonctionne quand même.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";

const dest = path.resolve("public/fonts");
const files = ["Satoshi-Variable.woff2"];
if (files.every((f) => existsSync(path.join(dest, f)))) process.exit(0);

try {
  const res = await fetch("https://api.fontshare.com/v2/fonts/download/satoshi", { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const zip = path.join(tmpdir(), `satoshi-${Date.now()}.zip`);
  writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
  mkdirSync(dest, { recursive: true });
  for (const f of files) {
    const data = execFileSync("unzip", ["-p", zip, `Satoshi_Complete/Fonts/WEB/fonts/${f}`]);
    writeFileSync(path.join(dest, f), data);
  }
  console.log("[fonts] Satoshi téléchargée dans public/fonts/");
} catch (err) {
  console.warn(`[fonts] Satoshi non téléchargée (${err.message}) : police de repli utilisée.`);
}
