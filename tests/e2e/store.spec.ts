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

/** Choisit une taille dans le sélecteur du hero (obligatoire avant l'achat). */
async function pickSize(page: Page, size = "M") {
  await page.locator("#hero-size").getByText(size, { exact: true }).click();
}

/** Lance un achat immédiat et renvoie l'identifiant de session Stripe obtenu. */
async function checkoutAndGetSession(page: Page): Promise<string> {
  const hits = await interceptStripe(page);
  await page.goto("/fr");
  await pickSize(page);
  await page.locator("#buy-box").getByRole("button", { name: /Acheter maintenant/ }).click();
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
    await expect(page.locator("#buy-box").getByRole("button", { name: /Acheter maintenant/ })).toBeVisible();
    await expect(page.locator("#buy-box").getByRole("button", { name: "Ajouter au panier" })).toBeVisible();
    // Bandeau défilant : arguments vrais, aucune fausse rareté.
    await expect(page.getByText(/LIVRAISON GRATUITE — 30 JOURS SATISFAIT OU REMBOURSÉ/)).toBeAttached();
    await expect(page.getByText(/stock limité/i)).toHaveCount(0);
    // Sans vrais avis : ni section avis, ni note étoilée, ni prix barré injustifié.
    await expect(page.locator("#reviews")).toHaveCount(0);
    await expect(page.getByText("★")).toHaveCount(0);
    await expect(page.locator("#buy-box s")).toHaveCount(0);
    // Ordre des sections demandé.
    const ids = await page.locator("main > section[id]").evaluateAll((els) => els.map((e) => e.id));
    expect(ids).toEqual(["problem", "features", "how", "faq", "final-cta"]);
    await expect(page.locator("#compare")).toHaveCount(0);
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
    await page.locator("#problem").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOTS}/${info.project.name}-before-after.png` });
    await page.locator("#final-cta").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOTS}/${info.project.name}-final-cta.png` });
    await page.getByRole("button", { name: /^Zoom —/ }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/${info.project.name}-lightbox.png` });
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Guide des tailles →" }).first().click();
    await page.getByRole("radio", { name: /^L / }).first().click();
    await page.screenshot({ path: `${SHOTS}/${info.project.name}-size-guide.png` });
    await page.keyboard.press("Escape");
    await page.locator("#buy-box").getByRole("button", { name: "Ajouter au panier" }).click();
    await expect(page.getByRole("dialog", { name: /Votre panier/ })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/${info.project.name}-cart.png` });
    await page.goto(`${E2E_ENV.NEXT_PUBLIC_SITE_URL}/en`);
    await page.screenshot({ path: `${SHOTS}/${info.project.name}-en.png` });
    await ctx.close();
  });

  test("coloris, taille obligatoire, quantités et remise de quantité", async ({ page }) => {
    await page.goto("/fr");
    const box = page.locator("#buy-box");
    await expect(box.getByTestId("price")).toHaveText(/54,99/);
    await expect(box.getByTestId("quantity-deals")).toContainText("2 = -15 %");
    await expect(box.getByTestId("quantity-deals")).toContainText("3 = -20 %");
    await expect(box.getByTestId("quantity-deals")).toContainText("4+ = -25 %");
    // 5 coloris × 8 tailles.
    await expect(box.locator("input[name='hero-color']")).toHaveCount(5);
    await expect(box.locator("input[name='hero-size']")).toHaveCount(8);
    await box.getByText("Violet", { exact: true }).click();
    await expect(page.getByRole("button", { name: /^Zoom — .*violette/ })).toBeVisible();
    // Sans taille : pas d'ajout, message d'erreur.
    await box.getByRole("button", { name: "Ajouter au panier" }).click();
    await expect(box.getByRole("alert")).toContainText("Choisis une taille");
    await expect(page.getByRole("dialog", { name: /Votre panier/ })).toBeHidden();
    await pickSize(page, "2XL");
    await expect(box.getByRole("alert")).toHaveCount(0);
    await box.getByRole("button", { name: "Augmenter la quantité" }).click();
    await expect(box.getByTestId("price")).toHaveText(/93,48/); // 2 × 46,74 (-15 %)
    await expect(box.locator("s")).toHaveText(/109,98/); // prix barré = 2 × 54,99 (prix unitaire réel)
    await expect(box.locator("[data-testid=quantity-deals] [aria-current]")).toHaveText(/^2 = -15/);
    await expect(box.getByTestId("price").locator("..")).toContainText("-15 %");
    await box.getByRole("button", { name: "Augmenter la quantité" }).click();
    await expect(box.getByTestId("price")).toHaveText(/131,97/); // 3 × 43,99 (-20 %)
    await expect(box.getByTestId("price").locator("..")).toContainText("-20 %");
    await box.getByRole("button", { name: "Augmenter la quantité" }).click();
    await expect(box.getByTestId("price")).toHaveText(/164,96/); // 4 × 41,24 (-25 %)
    await expect(box.getByTestId("price").locator("..")).toContainText("-25 %");
    await box.getByRole("button", { name: "Ajouter au panier" }).click();
    await expect(page.getByRole("dialog", { name: /Votre panier/ })).toContainText("Violet · 2XL");
  });

  test("guide des tailles : tiroir, sélection partagée, unités, clavier, FAQ", async ({ page }) => {
    await page.goto("/fr");
    await pickSize(page, "M");
    await page.getByRole("button", { name: "Guide des tailles →" }).first().click();
    const drawer = page.getByRole("dialog", { name: "Trouve la bonne taille" });
    await expect(drawer).toBeVisible();
    // La taille choisie dans le hero est surlignée à l'ouverture.
    await expect(drawer.getByRole("radio", { name: /^M / })).toHaveAttribute("aria-checked", "true");
    await expect(drawer.getByRole("radiogroup")).toBeVisible();
    // Clic sur une ligne → met à jour le sélecteur du hero.
    await drawer.getByRole("radio", { name: /^3XL / }).click();
    await expect(page.locator("#hero-size-3XL")).toBeChecked();
    // Clavier ↑/↓.
    await page.keyboard.press("ArrowDown");
    await expect(drawer.getByRole("radio", { name: /^4XL / })).toHaveAttribute("aria-checked", "true");
    await expect(drawer.getByRole("radio", { name: /^4XL / })).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowUp");
    await expect(page.locator("#hero-size-2XL")).toBeChecked();
    // Unités : cm par défaut, pouces avec 2 décimales, mémorisé.
    await expect(drawer.getByRole("button", { name: "CM" })).toHaveAttribute("aria-pressed", "true");
    await expect(drawer.getByRole("radio", { name: /^S / })).toContainText("40");
    await drawer.getByRole("button", { name: "POUCES" }).click();
    await expect(drawer.getByRole("button", { name: "POUCES" })).toHaveAttribute("aria-pressed", "true");
    await expect(drawer.getByRole("radio", { name: /^S / })).toContainText("15,75");
    await expect(drawer.getByRole("radio", { name: /^L / })).toContainText("12,20");
    // Fermeture : Échap.
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    // Fermeture : bouton.
    await page.getByRole("button", { name: "Guide des tailles →" }).first().click();
    await drawer.getByRole("button", { name: "Fermer ✕" }).click();
    await expect(drawer).toBeHidden();
    // Choix d'unité mémorisé après rechargement.
    await page.reload();
    await page.getByRole("button", { name: "Guide des tailles →" }).first().click();
    await expect(drawer.getByRole("button", { name: "POUCES" })).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Escape");
    // Tableau présent dans la FAQ sous « Quelle taille choisir ? ».
    const faq = page.locator("#faq");
    await expect(faq.getByRole("button", { name: "Quelle taille choisir ?" })).toHaveAttribute("aria-expanded", "true");
    await expect(faq.getByRole("radiogroup")).toBeVisible();
    await faq.getByRole("radio", { name: /^XL / }).click();
    await expect(page.locator("#hero-size-XL")).toBeChecked();
  });

  test("panier latéral modifiable avec livraison et total avant paiement", async ({ page }) => {
    await page.goto("/fr");
    await pickSize(page);
    await page.locator("#buy-box").getByRole("button", { name: "Ajouter au panier" }).click();
    const cart = page.getByRole("dialog", { name: /Votre panier/ });
    await expect(cart).toBeVisible();
    await expect(cart).toContainText("LivraisonGratuite");
    await expect(cart).toContainText("Total54,99");
    const gift = cart.getByTestId("gift-bar");
    await expect(gift).toContainText("Plus que 15,01 $ pour recevoir");
    await cart.getByRole("button", { name: "Augmenter la quantité" }).click();
    await expect(gift).toContainText("offert avec votre commande");
    await expect(cart).toContainText("Total93,48");
    await cart.getByRole("button", { name: "Augmenter la quantité" }).click();
    await expect(cart).toContainText("131,97");
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
    await pickSize(page);
    const btn = page.locator("#buy-box").getByRole("button", { name: /Acheter maintenant/ });
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

    await sendWebhook(page, "checkout.session.completed", paidSession(sessionId, 5499));
    await expect(status).toHaveAttribute("data-status", "paid", { timeout: 15_000 });
    await expect(status).toContainText("Paiement confirmé");
    // Panier vidé au retour.
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("borea-cart-v2") ?? "{}").state?.cart)).toEqual([]);

    // Suivi de commande : numéro + courriel requis, pas d'énumération.
    const orderNumber = (await page.locator("strong.font-mono").textContent())!.trim();
    await page.goto("/fr/suivi-commande");
    await page.getByLabel("Numéro de commande").fill(orderNumber);
    await page.getByLabel("Courriel").fill("autre@example.com");
    await page.getByRole("button", { name: "Suivre ma commande" }).click();
    await expect(page.getByText(/Aucune commande ne correspond/)).toBeVisible();
    await page.getByLabel("Courriel").fill("E2E@example.com");
    await page.getByRole("button", { name: "Suivre ma commande" }).click();
    await expect(page.getByTestId("tracking-result")).toContainText("Paiement confirmé");
  });

  test("session inventée → aucun faux succès", async ({ page }) => {
    await page.goto("/fr/checkout/success?session_id=cs_test_inventee_par_un_curieux");
    await expect(page.getByTestId("order-status")).toHaveAttribute("data-status", "unknown");
    await expect(page.getByText("Paiement confirmé")).toHaveCount(0);
  });

  test("paiement différé puis échec", async ({ page }) => {
    const sessionId = await checkoutAndGetSession(page);
    await sendWebhook(page, "checkout.session.completed", paidSession(sessionId, 5499, "unpaid"));
    await page.goto(`/fr/checkout/success?session_id=${sessionId}`);
    await expect(page.getByTestId("order-status")).toHaveAttribute("data-status", "processing");
    await sendWebhook(page, "checkout.session.async_payment_failed", paidSession(sessionId, 5499, "unpaid"));
    await page.reload();
    await expect(page.getByTestId("order-status")).toHaveAttribute("data-status", "failed");
  });

  test("annulation : panier conservé", async ({ page }) => {
    await page.goto("/fr");
    await pickSize(page, "L");
    await page.locator("#buy-box").getByRole("button", { name: "Ajouter au panier" }).click();
    await page.keyboard.press("Escape");
    await page.goto("/fr/checkout/cancel");
    await expect(page.getByRole("heading", { name: "Paiement annulé" })).toBeVisible();
    await page.getByRole("button", { name: "Revenir au panier" }).click();
    await expect(page.getByRole("dialog", { name: /Votre panier/ })).toContainText("Vert · L");
  });

  test("anglais disponible et pages légales", async ({ page }) => {
    await page.goto("/fr/livraison");
    await expect(page.getByRole("heading", { level: 1, name: "Livraison" })).toBeVisible();
    await expect(page.locator("[data-todo]").first()).toBeVisible(); // informations à compléter signalées
    await page.getByRole("link", { name: /Switch to English/ }).click();
    await expect(page).toHaveURL(/\/en\/shipping$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en-CA");
    for (const p of ["/en/contact", "/en/returns", "/en/privacy", "/en/terms", "/fr/confidentialite", "/fr/cgv", "/fr/suivi-commande", "/en/order-tracking", "/fr/retours", "/fr/contact"]) {
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
    const bar = page.getByRole("region", { name: "Ajouter au panier" });
    await expect(bar).toHaveCount(0);
    await page.locator("#features").scrollIntoViewIfNeeded();
    await expect(bar).toBeVisible();
    await expect(bar).toContainText("54,99");
    await page.screenshot({ path: `${SHOTS}/mobile-sticky.png` });
    // Sans taille : renvoie au sélecteur du hero avec un message.
    await bar.getByRole("button", { name: "Ajouter au panier" }).click();
    await expect(page.locator("#buy-box").getByRole("alert")).toContainText("Choisis une taille");
    await pickSize(page, "S");
    await page.locator("#features").scrollIntoViewIfNeeded();
    await bar.getByRole("button", { name: "Ajouter au panier" }).click();
    await expect(page.getByRole("dialog", { name: /Votre panier/ })).toContainText("Vert · S");
    await page.keyboard.press("Escape");
    await page.locator("#final-cta").scrollIntoViewIfNeeded();
    await expect(bar).toHaveCount(0);
    await page.locator("#site-footer").scrollIntoViewIfNeeded();
    await expect(bar).toHaveCount(0);
  });
  test("absente sur desktop", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "desktop uniquement");
    await page.goto("/fr");
    await page.locator("#features").scrollIntoViewIfNeeded();
    await expect(page.getByRole("region", { name: "Ajouter au panier" })).toHaveCount(0);
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
