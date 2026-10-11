import { defineConfig, devices } from "@playwright/test";

// Optional live smoke test: the real AI provider from .env.local, through the real screens. A few calls with
// invented demo-patient text. Run with `npm run e2e:live`; it is not part of `npm run verify`.
const PORT = 3200;

export default defineConfig({
  testDir: "tests/live",
  timeout: 180_000,
  expect: { timeout: 45_000 },
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
  webServer: {
    command: `npx next dev --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: { DEMO_MODE: "true", DEMO_FAST: "1", UPSTASH_REDIS_REST_URL: "", UPSTASH_REDIS_REST_TOKEN: "", KV_REST_API_URL: "", KV_REST_API_TOKEN: "" },
  },
});
