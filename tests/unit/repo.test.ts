import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// TAC-34: the repository holds no secrets, .env.example lists every variable, and uploads leave out private material.
const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" }).split("\n").filter(Boolean);
const text = (f: string) => {
  try {
    return readFileSync(f, "utf8");
  } catch {
    return "";
  }
};

describe("repository hygiene (TAC-34)", () => {
  it("tracks no environment files and no key-like strings", () => {
    expect(tracked.filter((f) => /(^|\/)\.env(?!\.example$)/.test(f))).toEqual([]);
    const KEY = /\b(sk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{30,}|xox[baprs]-[A-Za-z0-9-]{10,}|gh[pousr]_[A-Za-z0-9]{30,})\b/;
    const offenders = tracked.filter((f) => !/\.(png|jpe?g|ico|woff2?|mov|mp4)$/i.test(f) && KEY.test(text(f)));
    expect(offenders).toEqual([]);
  });

  it("lists every environment variable the app reads in .env.example", () => {
    const example = text(".env.example");
    const used = new Set<string>();
    for (const f of tracked.filter((f) => f.startsWith("src/"))) {
      for (const m of text(f).matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g)) used.add(m[1]);
      for (const m of text(f).matchAll(/["']((?:OPENAI|ANTHROPIC|GOOGLE_GENERATIVE_AI)_API_KEY)["']/g)) used.add(m[1]);
    }
    const platform = new Set(["NODE_ENV", "VERCEL"]);
    const missing = [...used].filter((v) => !platform.has(v) && !new RegExp(`^${v}=`, "m").test(example));
    expect(missing).toEqual([]);
  });

  it("keeps recordings, raw notes, transcripts, and env files out of Vercel uploads", () => {
    const ignore = text(".vercelignore");
    for (const entry of ["discovery/raw_discovery/", "ai_history/", "*.mov", "*.MP4", ".env*", ".ai-history-private"]) {
      expect(ignore).toContain(entry);
    }
  });
});
