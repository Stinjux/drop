import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import { proxy } from "@/proxy";
import { ADMIN_COOKIE, createAdminToken, isAdminConfigured, verifyAdminToken } from "@/server/admin/session-token";
import { csvCell } from "@/server/orders/csv";

beforeEach(() => {
  process.env.ADMIN_PASSWORD = "un-mot-de-passe-solide";
  process.env.ADMIN_SESSION_SECRET = "s".repeat(40);
});

describe("jeton administrateur", () => {
  it("valide un jeton signé et non expiré", () => {
    expect(isAdminConfigured()).toBe(true);
    expect(verifyAdminToken(createAdminToken())).toBe(true);
  });
  it("refuse un jeton modifié, expiré, signé avec un autre secret ou absent", () => {
    const token = createAdminToken();
    const [payload, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "admin", exp: 9_999_999_999 })).toString("base64url");
    expect(verifyAdminToken(`${forged}.${sig}`)).toBe(false);
    expect(verifyAdminToken(`${payload}.${sig}x`)).toBe(false);
    expect(verifyAdminToken(createAdminToken(Date.now() - 9 * 3600 * 1000))).toBe(false);
    process.env.ADMIN_SESSION_SECRET = "t".repeat(40);
    expect(verifyAdminToken(token)).toBe(false);
    expect(verifyAdminToken(undefined)).toBe(false);
    expect(verifyAdminToken("n'importe.quoi")).toBe(false);
  });
  it("administration désactivée si le mot de passe ou le secret sont trop faibles", () => {
    process.env.ADMIN_PASSWORD = "court";
    expect(isAdminConfigured()).toBe(false);
    process.env.ADMIN_PASSWORD = "un-mot-de-passe-solide";
    process.env.ADMIN_SESSION_SECRET = "trop-court";
    expect(isAdminConfigured()).toBe(false);
    expect(verifyAdminToken("a.b")).toBe(false);
  });
});

describe("proxy", () => {
  const req = (path: string, cookie?: string) =>
    new NextRequest(`http://localhost:3000${path}`, { headers: cookie ? { cookie: `${ADMIN_COOKIE}=${cookie}` } : {} });

  it("redirige /admin et /admin/orders/export vers la connexion sans session", () => {
    for (const p of ["/admin", "/admin/orders", "/admin/orders/export"]) {
      const res = proxy(req(p));
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("http://localhost:3000/admin/login");
    }
    expect(proxy(req("/admin", "faux.jeton")).status).toBe(307);
  });
  it("laisse passer une session valide et la page de connexion", () => {
    expect(proxy(req("/admin/orders", createAdminToken())).headers.get("location")).toBeNull();
    expect(proxy(req("/admin/login")).headers.get("location")).toBeNull();
  });
  it("français par défaut, langue mémorisée respectée", () => {
    expect(proxy(req("/")).headers.get("location")).toBe("http://localhost:3000/fr");
    expect(proxy(req("/livraison")).headers.get("location")).toBe("http://localhost:3000/fr/livraison");
    const en = new NextRequest("http://localhost:3000/", { headers: { cookie: "locale=en" } });
    expect(proxy(en).headers.get("location")).toBe("http://localhost:3000/en");
    expect(proxy(req("/en")).headers.get("location")).toBeNull();
  });
});

describe("export CSV", () => {
  it("neutralise l'injection de formules et échappe les guillemets", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell("+1 514")).toBe(`"'+1 514"`);
    expect(csvCell("Montréal")).toBe(`"Montréal"`);
    expect(csvCell(null)).toBe(`""`);
  });
});
