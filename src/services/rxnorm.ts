// Live RxNorm lookup (TRD stretch, TAC-35): matches a medication name the patient mentioned to RxNorm, the National
// Library of Medicine's standard drug vocabulary. It is the only live vendor call in the prototype. Free, no key.
//
// Matches resolve to the ingredient or brand level, never a specific strength: a fuzzy match on "20 mg" can land on a
// different strength, and a wrong dose must never reach a clinician. The patient's own words keep the dose.

export interface RxMatch {
  rxcui: string;
  name: string;
  /** RxNorm term type: IN ingredient, PIN precise ingredient, MIN multiple ingredients, BN brand name. */
  tty: "IN" | "PIN" | "MIN" | "BN";
  /** For a brand name, the ingredient it contains. */
  ingredient?: { rxcui: string; name: string };
}

export interface RxResult {
  matches: RxMatch[];
  meta: { mode: "live" | "unavailable"; source: "RxNorm"; reason?: string };
}

export interface RxDeps {
  fetch: typeof fetch;
  baseUrl: string;
  timeoutMs: number;
}

const INGREDIENT = new Set(["IN", "PIN", "MIN"]);
// Strength- or form-specific concepts, which resolve to their ingredients instead.
const PRODUCT = new Set(["SCD", "SBD", "SCDC", "SBDC", "SCDF", "SBDF", "SCDG", "SBDG", "GPCK", "BPCK", "SCDFP", "SBDFP"]);

/**
 * The drug name inside an item such as "Amphetamine salts XR 20 mg each morning (paid cash)": no dose, release form,
 * timing, or notes. Returns "" when nothing name-like is left.
 */
export function rxTerm(text: string): string {
  let t = text.toLowerCase().replace(/\([^)]*\)/g, " ");
  t = t.split(/\b(?:each|every|daily|twice|once|as needed|as-needed|prn|at night|at bedtime|in the morning|from|for|tablets?|capsules?|pills?|by mouth|orally|taken|since)\b/)[0];
  t = t
    .replace(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|µg|g|ml|milligrams?|micrograms?|units?)\b/g, " ")
    .replace(/\b(?:xr|er|sr|ir|cr|la|xl|dr|odt|extended[- ]release|immediate[- ]release|sustained[- ]release|delayed[- ]release)\b/g, " ")
    .replace(/[^a-z0-9/ -]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return /[a-z]{3}/.test(t) ? t.slice(0, 40).trim() : "";
}

async function getJson(deps: RxDeps, path: string): Promise<unknown> {
  const res = await deps.fetch(`${deps.baseUrl}${path}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(deps.timeoutMs),
  });
  if (!res.ok) throw new Error(`rxnav_${res.status}`);
  return res.json();
}

interface Props {
  rxcui: string;
  name: string;
  tty: string;
}

async function properties(deps: RxDeps, rxcui: string): Promise<Props | null> {
  const d = (await getJson(deps, `/rxcui/${encodeURIComponent(rxcui)}/properties.json`)) as { properties?: Props };
  return d.properties?.name ? d.properties : null;
}

/** The ingredient-level concept for a product or brand: the combination (MIN) if there is one, else the ingredient. */
async function ingredientOf(deps: RxDeps, rxcui: string): Promise<{ rxcui: string; name: string; tty: "IN" | "MIN" } | null> {
  const d = (await getJson(deps, `/rxcui/${encodeURIComponent(rxcui)}/related.json?tty=MIN+IN`)) as {
    relatedGroup?: { conceptGroup?: { tty: string; conceptProperties?: { rxcui: string; name: string }[] }[] };
  };
  const groups = d.relatedGroup?.conceptGroup ?? [];
  const min = groups.find((g) => g.tty === "MIN")?.conceptProperties?.[0];
  if (min) return { rxcui: min.rxcui, name: min.name, tty: "MIN" };
  const ins = groups.find((g) => g.tty === "IN")?.conceptProperties ?? [];
  if (ins.length === 1) return { rxcui: ins[0].rxcui, name: ins[0].name, tty: "IN" };
  return null;
}

/** Looks a term up live. Never throws: on any failure it returns no matches, and the conversation carries on. */
export async function lookupRxNorm(term: string, deps: RxDeps): Promise<RxResult> {
  const live = (matches: RxMatch[]): RxResult => ({ matches, meta: { mode: "live", source: "RxNorm" } });
  const name = rxTerm(term);
  if (!name) return live([]);
  try {
    const d = (await getJson(deps, `/approximateTerm.json?term=${encodeURIComponent(name)}&maxEntries=8`)) as {
      approximateGroup?: { candidate?: { rxcui: string; rank: string }[] };
    };
    const ranked = [...(d.approximateGroup?.candidate ?? [])].sort((a, b) => Number(a.rank) - Number(b.rank));
    const rxcuis = [...new Set(ranked.map((c) => c.rxcui))].slice(0, 3);
    for (const rxcui of rxcuis) {
      const p = await properties(deps, rxcui);
      if (!p) continue; // retired or not an RxNorm concept
      if (INGREDIENT.has(p.tty)) return live([{ rxcui: p.rxcui, name: p.name, tty: p.tty as RxMatch["tty"] }]);
      if (p.tty === "BN") {
        const ingredient = await ingredientOf(deps, p.rxcui);
        return live([{ rxcui: p.rxcui, name: p.name, tty: "BN", ingredient: ingredient ? { rxcui: ingredient.rxcui, name: ingredient.name } : undefined }]);
      }
      if (PRODUCT.has(p.tty)) {
        const ingredient = await ingredientOf(deps, p.rxcui);
        if (ingredient) return live([ingredient]);
      }
    }
    return live([]);
  } catch (e) {
    const reason = e instanceof Error && /^rxnav_\d+$/.test(e.message) ? e.message : e instanceof Error && e.name === "TimeoutError" ? "timeout" : "unreachable";
    return { matches: [], meta: { mode: "unavailable", source: "RxNorm", reason } };
  }
}

// Results are cached for the life of the server instance, so a repeated name costs nothing and NLM sees little traffic.
const cache = new Map<string, RxResult>();
const CACHE_MAX = 500;

export async function cachedLookup(term: string, deps: RxDeps): Promise<RxResult> {
  const key = rxTerm(term);
  const hit = cache.get(key);
  if (hit) return hit;
  const result = await lookupRxNorm(term, deps);
  if (result.meta.mode === "live") {
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
    cache.set(key, result);
  }
  return result;
}

export function rxDeps(): RxDeps {
  return { fetch, baseUrl: process.env.RXNORM_URL || "https://rxnav.nlm.nih.gov/REST", timeoutMs: 3_000 };
}

/** Plain words for the term type, for the provider's panel. */
export const TTY_LABEL: Record<RxMatch["tty"], string> = {
  IN: "ingredient",
  PIN: "ingredient",
  MIN: "ingredients",
  BN: "brand name",
};
