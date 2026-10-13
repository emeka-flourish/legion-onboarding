// Small text helpers shared by the AI tasks and their scripted fallbacks. Nothing here stores or logs text.

export function collapse(text: string): string {
  return text.replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();
}

/** For comparing a typed answer with a demo patient's canned answer. */
export function normalizeForMatch(text: string): string {
  return collapse(text).toLowerCase().replace(/[.!?]+$/, "");
}

/** Cuts at a word boundary, so an item never ends mid-word. */
export function clip(text: string, max: number): string {
  const t = collapse(text);
  if (t.length <= max) return t;
  const cut = t.slice(0, max + 1);
  const space = cut.lastIndexOf(" ");
  return (space > max * 0.5 ? cut.slice(0, space) : t.slice(0, max)).replace(/[,;:\s-]+$/, "");
}

export function capitalize(text: string): string {
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}

/** Splits an answer into short clauses that can each become a reviewable item. */
export function clauses(text: string): string[] {
  return collapse(text)
    .split(/(?<=[.!?;])\s+|\s+(?:but|and also|so|although)\s+/i)
    .map((s) =>
      s
        .replace(/^(and|but|so|also|honestly|i think|i guess|basically|well)[,\s]+/i, "")
        .replace(/[.!?;,]+$/, "")
        .trim(),
    )
    .filter((s) => s.split(" ").length >= 2);
}

// Common psychiatric medications, generic and brand names. Used to spot medication mentions without a model,
// and by the summary filter to catch a medication the patient never mentioned.
export const MEDICATION_NAMES = [
  "sertraline", "zoloft", "fluoxetine", "prozac", "escitalopram", "lexapro", "citalopram", "celexa", "paroxetine",
  "paxil", "venlafaxine", "effexor", "desvenlafaxine", "pristiq", "duloxetine", "cymbalta", "bupropion", "wellbutrin",
  "mirtazapine", "remeron", "trazodone", "buspirone", "buspar", "hydroxyzine", "vistaril", "atarax", "propranolol",
  "clonazepam", "klonopin", "alprazolam", "xanax", "lorazepam", "ativan", "diazepam", "valium", "lamotrigine",
  "lamictal", "lithium", "quetiapine", "seroquel", "aripiprazole", "abilify", "olanzapine", "zyprexa", "risperidone",
  "risperdal", "amphetamine", "adderall", "lisdexamfetamine", "vyvanse", "methylphenidate", "ritalin", "concerta",
  "dexmethylphenidate", "focalin", "atomoxetine", "strattera", "guanfacine", "intuniv", "vortioxetine", "trintellix",
  "prazosin", "gabapentin", "zolpidem", "ambien",
] as const;

const MED_RE = new RegExp(`\\b(${MEDICATION_NAMES.join("|")})\\b`, "gi");
const DOSE_RE = /\b(\d+(?:\.\d+)?)\s?(mg|mcg|milligrams?|micrograms?)\b/gi;

export function medicationsIn(text: string): string[] {
  return [...new Set([...collapse(text).matchAll(MED_RE)].map((m) => m[1].toLowerCase()))];
}

/** Doses in a canonical form ("20 milligrams" and "20mg" both become "20 mg"). */
export function dosesIn(text: string): string[] {
  return [...collapse(text).matchAll(DOSE_RE)].map((m) => `${m[1]} ${/^(mc|micro)/i.test(m[2]) ? "mcg" : "mg"}`);
}
