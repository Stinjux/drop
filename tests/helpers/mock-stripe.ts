import { createServer, type IncomingMessage, type Server } from "node:http";
import { randomBytes } from "node:crypto";

export type RecordedRequest = { method: string; path: string; body: URLSearchParams; idempotencyKey: string | undefined };

/**
 * Faux serveur d'API Stripe minimal : enregistre les paramètres réellement envoyés
 * par le SDK et renvoie une session Checkout. Rejoue la même réponse pour une même
 * clé d'idempotence, comme Stripe.
 */
export async function startMockStripe(): Promise<{ url: string; requests: RecordedRequest[]; close: () => Promise<void> }> {
  const requests: RecordedRequest[] = [];
  const byKey = new Map<string, string>();
  const read = (req: IncomingMessage) =>
    new Promise<string>((resolve) => {
      let data = "";
      req.on("data", (c) => (data += c));
      req.on("end", () => resolve(data));
    });
  const server: Server = createServer(async (req, res) => {
    const body = new URLSearchParams(await read(req));
    const idempotencyKey = req.headers["idempotency-key"] as string | undefined;
    requests.push({ method: req.method ?? "", path: req.url ?? "", body, idempotencyKey });
    if (req.method === "POST" && req.url === "/v1/checkout/sessions") {
      if (idempotencyKey && byKey.has(idempotencyKey)) {
        res.writeHead(200, { "content-type": "application/json", "idempotent-replayed": "true" });
        res.end(byKey.get(idempotencyKey));
        return;
      }
      const id = `cs_test_${randomBytes(12).toString("hex")}`;
      const json = JSON.stringify({
        id,
        object: "checkout.session",
        url: `https://checkout.stripe.com/c/pay/${id}`,
        expires_at: Number(body.get("expires_at")),
        livemode: false,
        payment_status: "unpaid",
        status: "open",
      });
      if (idempotencyKey) byKey.set(idempotencyKey, json);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(json);
      return;
    }
    if (req.method === "POST" && req.url === "/v1/coupons") {
      if (idempotencyKey && byKey.has(idempotencyKey)) {
        res.writeHead(200, { "content-type": "application/json", "idempotent-replayed": "true" });
        res.end(byKey.get(idempotencyKey));
        return;
      }
      const json = JSON.stringify({ id: `coupon_${randomBytes(8).toString("hex")}`, object: "coupon", amount_off: Number(body.get("amount_off")), currency: body.get("currency"), duration: body.get("duration") });
      if (idempotencyKey) byKey.set(idempotencyKey, json);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(json);
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: { message: "not mocked" } }));
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return { url: `http://127.0.0.1:${port}`, requests, close: () => new Promise((r) => server.close(() => r())) };
}
