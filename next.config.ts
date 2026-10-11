import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // AGENTS.md is curated by hand and already tells agents to read the bundled Next.js docs,
  // so `next dev` must not rewrite it.
  agentRules: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
