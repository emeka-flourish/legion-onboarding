import { describe, expect, it, vi } from "vitest";
import { cachedLookup, lookupRxNorm, rxTerm, type RxDeps } from "@/services/rxnorm";

// Response shapes recorded from the live RxNav API on 2026-10-11, trimmed to the fields the lookup reads.
const FIXTURES: Record<string, unknown> = {
  "/approximateTerm.json?term=hydroxyzine&maxEntries=8": {
    approximateGroup: { candidate: [{ rxcui: "5553", rank: "1" }, { rxcui: "5553", rank: "1" }] },
  },
  "/rxcui/5553/properties.json": { properties: { rxcui: "5553", name: "hydroxyzine", tty: "IN" } },
  "/approximateTerm.json?term=amphetamine%20salts&maxEntries=8": {
    approximateGroup: { candidate: [{ rxcui: "1246973", rank: "1" }, { rxcui: "1009145", rank: "2" }] },
  },
  "/rxcui/1246973/properties.json": {}, // not a current RxNorm concept
  "/rxcui/1009145/properties.json": {
    properties: { rxcui: "1009145", name: "amphetamine aspartate 5 MG / ... Oral Tablet", tty: "SCD" },
  },
  "/rxcui/1009145/related.json?tty=MIN+IN": {
    relatedGroup: {
      conceptGroup: [
        { tty: "IN", conceptProperties: [{ rxcui: "725", name: "amphetamine" }, { rxcui: "3288", name: "dextroamphetamine" }] },
        {
          tty: "MIN",
          conceptProperties: [{ rxcui: "822929", name: "amphetamine aspartate / amphetamine sulfate / dextroamphetamine saccharate / dextroamphetamine sulfate" }],
        },
      ],
    },
  },
  "/approximateTerm.json?term=lexapro&maxEntries=8": { approximateGroup: { candidate: [{ rxcui: "352741", rank: "1" }] } },
  "/rxcui/352741/properties.json": { properties: { rxcui: "352741", name: "Lexapro", tty: "BN" } },
  "/rxcui/352741/related.json?tty=MIN+IN": {
    relatedGroup: { conceptGroup: [{ tty: "IN", conceptProperties: [{ rxcui: "321988", name: "escitalopram" }] }] },
  },
  "/approximateTerm.json?term=notarealdrug&maxEntries=8": { approximateGroup: { candidate: null } },
};

const BASE = "https://rxnav.test/REST";
function fakeFetch(overrides: Record<string, () => Response | Promise<Response>> = {}) {
  return vi.fn(async (url: string | URL | Request) => {
    const path = String(url).replace(BASE, "");
    if (overrides[path]) return overrides[path]();
    if (path in FIXTURES) return new Response(JSON.stringify(FIXTURES[path]), { status: 200 });
    return new Response("not found", { status: 404 });
  });
}
const deps = (f = fakeFetch(), timeoutMs = 1_000): RxDeps => ({ fetch: f as unknown as typeof fetch, baseUrl: BASE, timeoutMs });

describe("RxNorm name cleaning", () => {
  it("keeps only the drug name: no dose, release form, timing, or notes", () => {
    expect(rxTerm("Amphetamine salts XR 20 mg each morning (paid cash)")).toBe("amphetamine salts");
    expect(rxTerm("Hydroxyzine as needed, from primary care")).toBe("hydroxyzine");
    expect(rxTerm("Sertraline 50 mg")).toBe("sertraline");
    expect(rxTerm("Hydroxyzine HCl 25 mg tablet")).toBe("hydroxyzine hcl");
    expect(rxTerm("Lexapro")).toBe("lexapro");
    expect(rxTerm("20 mg")).toBe("");
  });
});

describe("RxNorm lookup (TAC-35)", () => {
  it("matches a name to its RxNorm ingredient", async () => {
    expect(await lookupRxNorm("Hydroxyzine", deps())).toEqual({
      matches: [{ rxcui: "5553", name: "hydroxyzine", tty: "IN" }],
      meta: { mode: "live", source: "RxNorm" },
    });
  });

  it("resolves a product match to its ingredients, never to a strength", async () => {
    const r = await lookupRxNorm("Amphetamine salts XR 20 mg each morning", deps());
    expect(r.matches).toEqual([
      { rxcui: "822929", name: "amphetamine aspartate / amphetamine sulfate / dextroamphetamine saccharate / dextroamphetamine sulfate", tty: "MIN" },
    ]);
    expect(JSON.stringify(r)).not.toMatch(/\bMG\b/);
  });

  it("links a brand name to the ingredient it contains", async () => {
    expect((await lookupRxNorm("Lexapro", deps())).matches).toEqual([
      { rxcui: "352741", name: "Lexapro", tty: "BN", ingredient: { rxcui: "321988", name: "escitalopram" } },
    ]);
  });

  it("returns no match for a name RxNorm doesn't know, without calling it for an empty name", async () => {
    expect((await lookupRxNorm("notarealdrug", deps())).matches).toEqual([]);
    const f = fakeFetch();
    expect((await lookupRxNorm("20 mg", deps(f))).matches).toEqual([]);
    expect(f).not.toHaveBeenCalled();
  });

  it("comes back empty, never throwing, when RxNorm errors, is unreachable, or is slow", async () => {
    const bad = fakeFetch({ "/approximateTerm.json?term=hydroxyzine&maxEntries=8": () => new Response("bad gateway", { status: 502 }) });
    expect(await lookupRxNorm("hydroxyzine", deps(bad))).toEqual({ matches: [], meta: { mode: "unavailable", source: "RxNorm", reason: "rxnav_502" } });

    const down = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    expect((await lookupRxNorm("hydroxyzine", deps(down as never))).meta).toEqual({ mode: "unavailable", source: "RxNorm", reason: "unreachable" });

    const slow = vi.fn(
      (_url: unknown, init?: RequestInit) =>
        new Promise<Response>((_, reject) => init?.signal?.addEventListener("abort", () => reject(init.signal!.reason))),
    );
    expect((await lookupRxNorm("hydroxyzine", deps(slow as never, 50))).meta).toEqual({ mode: "unavailable", source: "RxNorm", reason: "timeout" });
  });

  it("caches live answers but not failures", async () => {
    const f = fakeFetch();
    await cachedLookup("Lexapro", deps(f));
    const calls = f.mock.calls.length;
    await cachedLookup("lexapro", deps(f));
    expect(f.mock.calls.length).toBe(calls);

    const down = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    await cachedLookup("melatonin", deps(down as never));
    await cachedLookup("melatonin", deps(down as never));
    expect(down).toHaveBeenCalledTimes(2);
  });
});
