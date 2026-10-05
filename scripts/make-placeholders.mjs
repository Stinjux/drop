// Génère les visuels PROVISOIRES (JPG) de /public/product à l'aide de Chromium (Playwright).
// Usage : node scripts/make-placeholders.mjs  — à remplacer par les vraies photos.
import { chromium } from "playwright";
const slots = [
  ["hero", 1200, 1200, "PHOTO PRINCIPALE", "Main product photo"],
  ["angle-1", 1200, 1200, "ANGLE 1", "Angle 1"],
  ["angle-2", 1200, 1200, "ANGLE 2", "Angle 2"],
  ["angle-3", 1200, 1200, "ANGLE 3", "Angle 3"],
  ["variant-2", 1200, 1200, "VARIANTE 2", "Variant 2"],
  ["detail-1", 1200, 1200, "DÉTAIL / COLIS", "Detail / box"],
  ["lifestyle", 1600, 1000, "EN SITUATION", "In use"],
  ["before", 1200, 900, "AVANT", "Before"],
  ["after", 1200, 900, "APRÈS", "After"],
];
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, w, h, fr, en] of slots) {
  await page.setViewportSize({ width: w, height: h });
  const s = Math.min(w, h);
  await page.setContent(`<html><body style="margin:0">
  <div style="width:${w}px;height:${h}px;box-sizing:border-box;background:#F4F3EF;border:${s * 0.012}px solid #0E0E0E;position:relative;font-family:monospace;overflow:hidden;
    background-image:linear-gradient(#0E0E0E14 2px,transparent 2px),linear-gradient(90deg,#0E0E0E14 2px,transparent 2px);background-size:${s / 10}px ${s / 10}px">
    <div style="position:absolute;left:50%;top:44%;width:${s * 0.36}px;height:${s * 0.36}px;transform:translate(-50%,-50%);background:#fff;border:${s * 0.008}px solid #0E0E0E;box-shadow:${s * 0.02}px ${s * 0.02}px 0 #0E0E0E"></div>
    <div style="position:absolute;left:50%;top:44%;width:${s * 0.12}px;height:${s * 0.12}px;transform:translate(-30%,-80%);background:#FF3B00;border:${s * 0.006}px solid #0E0E0E"></div>
    <div style="position:absolute;left:${s * 0.05}px;top:${s * 0.05}px;background:#0E0E0E;color:#F4F3EF;font-weight:700;font-size:${s * 0.03}px;padding:${s * 0.012}px ${s * 0.02}px;letter-spacing:.08em">VISUEL PROVISOIRE · PLACEHOLDER</div>
    <div style="position:absolute;left:${s * 0.05}px;bottom:${s * 0.05}px;color:#0E0E0E">
      <div style="font-weight:800;font-size:${s * 0.075}px;letter-spacing:-.02em">${fr}</div>
      <div style="font-size:${s * 0.03}px;opacity:.7">${en} — public/product/${name}.jpg</div>
    </div>
  </div></body></html>`);
  await page.screenshot({ path: `public/product/${name}.jpg`, type: "jpeg", quality: 80 });
}
await browser.close();
console.log("ok");
