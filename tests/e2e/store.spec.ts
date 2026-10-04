import { expect, test, type Page } from "@playwright/test";
import Stripe from "stripe";
import { E2E_ENV } from "../../playwright.config";

const stripe = new Stripe("sk_test_dummy");
const SHOTS = "tests/.tmp/screenshots";

/** Intercepte la page Stripe Checkout (hors ligne en test) et renvoie l'URL demandée. */
async function interceptStripe(page: Page) {
  const hits: string[] = [];
  await page.route("https://checkout.stripe.com/**", (route) => {
    hits.push(route.request().url());
    return route.fulfill({ status: 200, contentType: "text/html", body: "<h1>Stripe Checkout (simulé)</h1>" });
  });
  return hits;
}

async function sendWebhook(page: Page, type: string, session: Record<string, unknown>) {
  const payload = JSON.stringify({ id: `evt_e2e_${Math.random().toString(36).slice(2)}`, object: "event", type, data: { object: session }, livemode: false, created: Math.floor(Date.now() / 1000), api_version: "2026-09-30.endive" });
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret: E2E_ENV.STRIPE_WEBHOOK_SECRET });
  const res = await page.request.post("/api/stripe/webhook", { headers: { "stripe-signature": header, "content-type": "application/json" }, data: payload });
  expect(res.status()).toBe(200);
  return res.json();
}

/** Lance un achat immédiat et renvoie l'identifiant de session Stripe obtenu. */
async function checkoutAndGetSession(page: Page): Promise<string> {
  const hits = await interceptStripe(page);
  await page.goto("/fr");
  await page.locator("#buy-box").getByRole("button", { name: /Commander maintenant/ }).click();
  await page.waitForURL(/checkout\.stripe\.com/);
  return hits[0].split("/").pop() as string;
}

function paidSession(id: string, subtotal: number, paymentStatus: "paid" | "unpaid" = "paid") {
  return {
    id,
    object: "checkout.session",
    payment_status: paymentStatus,
    currency: "cad",
    amount_subtotal: subtotal,
    amount_total: subtotal,
    total_details: { amount_shipping: 0, amount_tax: 0 },
    livemode: false,
    payment_intent: "pi_e2e",
    customer_details: { email: "e2e@example.com", name: "Client Test", phone: "+15145550000" },
    collected_information: { shipping_details: { name: "Client Test", address: { line1: "1 rue Test", city: "Québec", state: "QC", postal_code: "G1R 1A1", country: "CA" } } },
  };
}

test.describe("boutique", () => {
  test("page de vente : contenu, CTA, captures", async ({ page }, info) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/fr$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "fr-CA");
    await expect(page.getByTestId("preview-banner")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("#buy-box").getByRole("button", { name: /Commander maintenant/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Voir le produit en action/ })).toBeVisible();
    // Section avis masquée sans vrais avis.
    await expect(page.locator("#reviews")).toHaveCount(0);
    // Aucun débordement horizontal.
    // Aucun élément plus large que l'écran (sinon le navigateur mobile élargit la fenêtre de mise en page).
    const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, layout: window.innerWidth, client: document.documentElement.clientWidth }));
    expect(widths.layout).toBe(page.viewportSize()!.width);
    expect(widths.scroll).toBeLessThanOrEqual(widths.client);
    await page.screenshot({ path: `${SHOTS}/${info.project.name}-hero.png` });
  });

  test("captures d'aperçu (page complète, panier, galerie)", async ({ browser }, info) => {
    // Animations réduites : toutes les sections sont visibles sur la capture pleine page.
    const ctx = await browser.newContext({ ...info.project.use, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto(`${E2E_ENV.NEXT_PUBLIC_SITE_URL}/fr`);
    await page.screenshot({ path: `${SHOTS}/${info.project.name}-full.png`, fullPage: true });
    await page.locator("#offers").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOTS}/${info.project.name}-offers.png` });
    await page.locator("#details").getByRole("button", { name: /Agrandir/ }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/${info.project.name}-lightbox.png` });
    await page.keyboard.press("Escape");
    await page.locator("#buy-box").getByRole("button", { name: "Ajouter au panier" }).click();
    await expect(page.getByRole("dialog", { name: "Votre panier" })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/${info.project.name}-cart.png` });
    await page.goto(`${E2E_ENV.NEXT_PUBLIC_SITE_URL}/en`);
    await page.screenshot({ path: `${SHOTS}/${info.project.name}-en.png` });
    await ctx.close();
  });

  test("variantes, quantités et lots mettent à jour le prix", async ({ page }) => {
    await page.goto("/fr");
    const box = page.locator("#buy-box");
    await expect(box).toContainText("39,99");
    await box.getByText("Option 2 (à confirmer)").click();
    await expect(page.locator("#hero-title").locator("..").locator("..").getByRole("img").first()).toHaveAttribute("alt", /deuxième variante/);
    await box.getByRole("button", { name: "Augmenter la quantité" }).click();
    await expect(box).toContainText("71,98"); // 2 × 35,99
    await expect(box).toContainText("Vous économisez 8,00");
    await page.locator("#offers").getByRole("button", { name: /3 unités/ }).click();
    await expect(box.getByRole("spinbutton")).toHaveValue("3");
    await expect(page.locator("#offers")).toContainText("Économie de 21,00 $ (17 %)");
  });

  test("panier latéral modifiable avec livraison et total avant paiement", async ({ page }) => {
    await page.goto("/fr");
    await page.locator("#buy-box").getByRole("button", { name: "Ajouter au panier" }).click();
    const cart = page.getByRole("dialog", { name: "Votre panier" });
    await expect(cart).toBeVisible();
    await expect(cart).toContainText("Livraison");
    await expect(cart).toContainText("7,99");
    await expect(cart).toContainText("47,98"); // 39,99 + 7,99
    await cart.getByRole("button", { name: "Augmenter la quantité" }).click();
    await expect(cart).toContainText("Plus que");
    await cart.getByRole("button", { name: "Augmenter la quantité" }).click();
    await expect(cart).toContainText("Livraison gratuite atteinte");
    await expect(cart).toContainText("98,97");
    await cart.getByRole("button", { name: /Retirer/ }).click();
    await expect(cart).toContainText("Votre panier est vide");
    await page.keyboard.press("Escape");
    await expect(cart).toBeHidden();
  });

  test("achat immédiat : un seul appel malgré le double clic, redirection Stripe", async ({ page }) => {
    const stripeHits = await interceptStripe(page);
    let apiCalls = 0;
    page.on("request", (r) => {
      if (r.url().endsWith("/api/checkout")) apiCalls++;
    });
    await page.goto("/fr");
    const btn = page.locator("#buy-box").getByRole("button", { name: /Commander maintenant/ });
    await btn.dblclick();
    await page.waitForURL(/checkout\.stripe\.com/);
    expect(stripeHits).toHaveLength(1);
    expect(apiCalls).toBe(1);
  });

  test("paiement confirmé par webhook → page de succès à jour (jamais l'URL seule)", async ({ page }) => {
    const sessionId = await checkoutAndGetSession(page);

    // Retour sur la page de succès AVANT le webhook : pas de confirmation.
    await page.goto(`/fr/checkout/success?session_id=${sessionId}`);
    const status = page.getByTestId("order-status");
    await expect(status).toHaveAttribute("data-status", "pending");
    await expect(status).toContainText("Nous confirmons");

    await sendWebhook(page, "checkout.session.completed", paidSession(sessionId, 3999));
    await expect(status).toHaveAttribute("data-status", "paid", { timeout: 15_000 });
    await expect(status).toContainText("Paiement confirmé");
    // Panier vidé au retour.
    expect(await page.evaluate(() => localStorage.getItem("borea-cart-v1"))).toBe("[]");
  });

  test("session inventée → aucun faux succès", async ({ page }) => {
    await page.goto("/fr/checkout/success?session_id=cs_test_inventee_par_un_curieux");
    await expect(page.getByTestId("order-status")).toHaveAttribute("data-status", "unknown");
    await expect(page.getByText("Paiement confirmé")).toHaveCount(0);
  });

  test("paiement différé puis échec", async ({ page }) => {
    const sessionId = await checkoutAndGetSession(page);
    await sendWebhook(page, "checkout.session.completed", paidSession(sessionId, 3999, "unpaid"));
    await page.goto(`/fr/checkout/success?session_id=${sessionId}`);
    await expect(page.getByTestId("order-status")).toHaveAttribute("data-status", "processing");
    await sendWebhook(page, "checkout.session.async_payment_failed", paidSession(sessionId, 3999, "unpaid"));
    await page.reload();
    await expect(page.getByTestId("order-status")).toHaveAttribute("data-status", "failed");
  });

  test("annulation : panier conservé", async ({ page }) => {
    await page.goto("/fr");
    await page.locator("#buy-box").getByRole("button", { name: "Ajouter au panier" }).click();
    await page.keyboard.press("Escape");
    await page.goto("/fr/checkout/cancel");
    await expect(page.getByRole("heading", { name: "Paiement annulé" })).toBeVisible();
    await page.getByRole("button", { name: "Revenir au panier" }).click();
    await expect(page.getByRole("dialog", { name: "Votre panier" })).toContainText("Option 1");
  });

  test("anglais disponible et pages légales", async ({ page }) => {
    await page.goto("/fr/livraison");
    await expect(page.getByRole("heading", { level: 1, name: "Livraison" })).toBeVisible();
    await expect(page.locator("[data-todo]").first()).toBeVisible(); // informations à compléter signalées
    await page.getByRole("link", { name: /Switch to English/ }).click();
    await expect(page).toHaveURL(/\/en\/shipping$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en-CA");
    for (const p of ["/en/contact", "/en/returns", "/en/privacy", "/en/terms", "/fr/confidentialite", "/fr/conditions-de-vente", "/fr/retours", "/fr/contact"]) {
      const res = await page.goto(p);
      expect(res?.status(), p).toBe(200);
    }
  });

  test("animations réduites : aucun contenu masqué", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto(E2E_ENV.NEXT_PUBLIC_SITE_URL + "/fr");
    await page.mouse.wheel(0, 3000);
    expect(await page.locator(".reveal-pending").count()).toBe(0);
    await ctx.close();
  });
});

test.describe("barre d'achat mobile", () => {
  test("apparaît après le hero, disparaît sur le bloc final et le pied de page", async ({ page }, info) => {
    test.skip(info.project.name !== "mobile", "mobile uniquement");
    await page.goto("/fr");
    const bar = page.getByRole("region", { name: "Commander maintenant" });
    await expect(bar).toHaveCount(0);
    await page.locator("#details").scrollIntoViewIfNeeded();
    await expect(bar).toBeVisible();
    await expect(bar).toContainText("39,99");
    await page.screenshot({ path: `${SHOTS}/mobile-sticky.png` });
    await page.locator("#final-buy").scrollIntoViewIfNeeded();
    await expect(bar).toHaveCount(0);
    await page.locator("#site-footer").scrollIntoViewIfNeeded();
    await expect(bar).toHaveCount(0);
  });
  test("absente sur desktop", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "desktop uniquement");
    await page.goto("/fr");
    await page.locator("#details").scrollIntoViewIfNeeded();
    await expect(page.getByRole("region", { name: "Commander maintenant" })).toHaveCount(0);
  });
});

test.describe("administration", () => {
  test("protégée, puis gestion d'une commande payée et export CSV", async ({ page }, info) => {
    // Accès refusé sans session.
    await page.goto("/admin/orders");
    await expect(page).toHaveURL(/\/admin\/login$/);
    const exportRes = await page.request.get("/admin/orders/export", { maxRedirects: 0 });
    expect(exportRes.status()).toBe(307);
    await page.context().addCookies([{ name: "admin_session", value: "forge.signature", url: E2E_ENV.NEXT_PUBLIC_SITE_URL }]);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);

    await page.getByLabel("Mot de passe").fill("mauvais-mot-de-passe");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByText("Mot de passe incorrect.")).toBeVisible();
    await page.getByLabel("Mot de passe").fill(E2E_ENV.ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();
    await expect(page.getByText("Avant d'accepter de vraies commandes")).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/${info.project.name}-admin-dashboard.png`, fullPage: true });

    await page.goto("/admin/orders?payment=paid");
    const firstOrder = page.locator("tbody a").first();
    await expect(firstOrder).toBeVisible();
    const orderNumber = (await firstOrder.textContent())!.trim();
    await firstOrder.click();
    await expect(page.getByText("Adresse à saisir")).toBeVisible();
    await expect(page.getByText("1 rue Test").first()).toBeVisible();

    await page.getByLabel("N° de commande fournisseur").fill(`AE-${info.project.name}-81234`);
    await page.getByLabel(/Coût réel payé/).fill("12.40");
    await page.getByRole("button", { name: "Enregistrer la commande fournisseur" }).click();
    await expect(page.getByText("Informations fournisseur enregistrées.")).toBeVisible();

    await page.getByLabel("Transporteur").fill("Postes Canada");
    await page.getByLabel("Numéro de suivi").fill("LX123456789CA");
    await page.getByRole("button", { name: "Enregistrer le suivi" }).click();
    await expect(page.getByText(/Suivi enregistré\. Courriel NON envoyé : service d'envoi non configuré\./)).toBeVisible();
    await page.reload();
    await expect(page.getByText("Expédiée").first()).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/${info.project.name}-admin-order.png`, fullPage: true });

    const csv = await page.request.get("/admin/orders/export?payment=all");
    expect(csv.status()).toBe(200);
    expect(csv.headers()["content-type"]).toContain("text/csv");
    const text = await csv.text();
    expect(text).toContain(orderNumber);
    expect(text).toContain("LX123456789CA");
  });
});
