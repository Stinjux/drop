// Faux serveur d'API Stripe pour les tests e2e (sessions Checkout uniquement).
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";

const port = Number(process.env.MOCK_STRIPE_PORT ?? 12199);
const byKey = new Map();
let count = 0;
createServer((req, res) => {
  let data = "";
  req.on("data", (c) => (data += c));
  req.on("end", () => {
    if (req.url === "/__count") {
      res.end(String(count));
      return;
    }
    if (req.method === "POST" && req.url === "/v1/checkout/sessions") {
      const key = req.headers["idempotency-key"];
      if (key && byKey.has(key)) return res.writeHead(200, { "content-type": "application/json" }).end(byKey.get(key));
      count++;
      const body = new URLSearchParams(data);
      const id = `cs_test_${randomBytes(12).toString("hex")}`;
      const json = JSON.stringify({ id, object: "checkout.session", url: `https://checkout.stripe.com/c/pay/${id}`, expires_at: Number(body.get("expires_at")), livemode: false, metadata: { order_id: body.get("metadata[order_id]") } });
      if (key) byKey.set(key, json);
      return res.writeHead(200, { "content-type": "application/json" }).end(json);
    }
    res.writeHead(200).end("ok");
  });
}).listen(port, "127.0.0.1", () => console.log(`mock stripe on ${port}`));
