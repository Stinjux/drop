import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
export const E2E_ENV = {
  NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
  STRIPE_SECRET_KEY: "sk_test_e2e",
  STRIPE_API_BASE_FOR_TESTS: "http://127.0.0.1:12199",
  STRIPE_WEBHOOK_SECRET: "whsec_e2e_secret",
  DATABASE_URL: "file:./tests/.tmp/e2e.db",
  ADMIN_PASSWORD: "e2e-mot-de-passe-admin",
  ADMIN_SESSION_SECRET: "e2e-session-secret-0123456789-abcdefghij",
};

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 45_000,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : undefined,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 900 } } },
  ],
  webServer: [
    { command: "node tests/e2e/mock-stripe-server.mjs", port: 12199, reuseExistingServer: false },
    {
      command: `rm -f tests/.tmp/e2e.db* && mkdir -p tests/.tmp && npx next start -p ${PORT}`,
      url: `http://localhost:${PORT}/fr`,
      reuseExistingServer: false,
      env: E2E_ENV,
      timeout: 60_000,
    },
  ],
});
