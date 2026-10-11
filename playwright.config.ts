import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
// E2E_PROD=1 runs against a production build (used by `npm run verify`); otherwise the dev server.
const prod = process.env.E2E_PROD === "1";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "mobile", use: { ...devices["iPhone 13"], browserName: "chromium" } },
    { name: "desktop", use: { browserName: "chromium", viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: prod ? `npm run build && npx next start --port ${PORT}` : `npx next dev --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 240_000,
    // Deterministic runs: scripted AI, short simulated delays, in-memory storage.
    env: {
      AI_PROVIDER: "scripted",
      DEMO_MODE: "true",
      DEMO_FAST: "1",
      SESSION_SECRET: "e2e-secret-not-for-production",
      UPSTASH_REDIS_REST_URL: "",
      UPSTASH_REDIS_REST_TOKEN: "",
      KV_REST_API_URL: "",
      KV_REST_API_TOKEN: "",
    },
  },
});
