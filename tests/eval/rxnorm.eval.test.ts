// Live RxNorm check (TAC-35): the demo patients' medication names, and a few common ones, against the real NLM API.
// Results go to docs/QA.md between the rxnorm-eval markers.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { lookupRxNorm, rxDeps, rxTerm, TTY_LABEL } from "@/services/rxnorm";

const TERMS = [
  "Hydroxyzine",
  "Amphetamine salts XR 20 mg each morning",
  "Sertraline 50 mg",
  "Lexapro",
  "Adderall",
  "Wellbutrin XL 150 mg",
  "notarealdrug",
];
const START = "<!-- rxnorm-eval:start -->";
const END = "<!-- rxnorm-eval:end -->";

describe("live RxNorm", () => {
  it("matches each name at the ingredient or brand level, or not at all", { timeout: 60_000 }, async () => {
    const deps = { ...rxDeps(), baseUrl: process.env.RXNORM_URL || "https://rxnav.nlm.nih.gov/REST", timeoutMs: 8_000 };
    const rows: string[] = [];
    for (const term of TERMS) {
      const started = Date.now();
      const r = await lookupRxNorm(term, deps);
      const ms = Date.now() - started;
      expect(r.meta.mode).toBe("live");
      for (const m of r.matches) {
        expect(["IN", "PIN", "MIN", "BN"]).toContain(m.tty);
        expect(m.name).not.toMatch(/\b\d+(\.\d+)?\s*MG\b/i); // never a strength
      }
      const m = r.matches[0];
      const match = m ? `${m.name}${m.ingredient ? ` (brand of ${m.ingredient.name})` : ""}` : "no match";
      rows.push(`| ${term} | \`${rxTerm(term)}\` | ${match} | ${m ? `${m.rxcui} (${TTY_LABEL[m.tty]})` : "none"} | ${ms} ms |`);
    }
    const block = [
      START,
      "## Live RxNorm check",
      "",
      `Last run: ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC, with \`npm run eval:ai\`. Each name is cleaned`,
      "of dose, release form, and timing, then matched with RxNav's approximate-term search. Matches resolve to the",
      "ingredient or brand level, so a fuzzy match can never put a wrong strength in front of a clinician.",
      "",
      "| Mentioned as | Looked up as | RxNorm match | RxCUI | Time |",
      "|---|---|---|---|---|",
      ...rows,
      END,
    ].join("\n");
    const path = "docs/QA.md";
    const current = existsSync(path) ? readFileSync(path, "utf8") : "# QA log\n";
    const next = current.includes(START)
      ? current.slice(0, current.indexOf(START)) + block + current.slice(current.indexOf(END) + END.length)
      : `${current.trimEnd()}\n\n${block}\n`;
    writeFileSync(path, next);
  });
});
