import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Live AI evaluation: calls the real providers configured in .env.local. Run with `npm run eval:ai`.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["tests/eval/**/*.test.ts"],
    setupFiles: ["tests/eval/setup.ts"],
    testTimeout: 120_000,
  },
});
