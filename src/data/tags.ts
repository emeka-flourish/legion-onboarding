// What a provider focuses on beyond the conditions list, and who they care for. A patient's own words in the
// optional note map onto these, and each match shows on the card as a reason with its source. Browser-safe.

export type ProviderTag = "work stress" | "sleep" | "students" | "bipoc" | "lgbtq+" | "perinatal" | "veterans" | "life transitions";

export const TAGS: Record<ProviderTag, { chip: string; reason: string; profile: string }> = {
  "work stress": { chip: "Work stress", reason: "Experienced with work stress", profile: "work stress and burnout" },
  sleep: { chip: "Sleep problems", reason: "Focus includes sleep problems", profile: "sleep problems" },
  students: { chip: "Works with students", reason: "Works with students and young adults", profile: "students and young adults" },
  bipoc: { chip: "Experience with BIPOC patients", reason: "Experienced caring for BIPOC patients", profile: "BIPOC patients" },
  "lgbtq+": { chip: "LGBTQ+ affirming", reason: "LGBTQ+ affirming care", profile: "LGBTQ+ patients" },
  perinatal: { chip: "Pregnancy and new parents", reason: "Focus includes pregnancy and new parenthood", profile: "pregnancy and new parents" },
  veterans: { chip: "Works with veterans", reason: "Experienced with veterans", profile: "veterans and their families" },
  "life transitions": { chip: "Life transitions", reason: "Focus includes big life changes", profile: "big life changes" },
};

export const TAG_VALUES = Object.keys(TAGS) as ProviderTag[];

// How patients (and models) tend to say each one. Checked in order; the first match wins.
const SYNONYMS: [RegExp, ProviderTag][] = [
  [/\b(bipoc|poc|people of colou?r|patients? of colou?r|culturally (responsive|sensitive|competent|informed))\b/, "bipoc"],
  [/\b(lgbtq\+?|lgbt|queer|gay|lesbian|trans(gender)?|non-?binary)\b/, "lgbtq+"],
  [/\b(work|job|career|workplace)[- ]?(related )?(stress|burnout|burn out)\b|\bburn(ed)? ?out\b|\bstress(ed)? (at|from|about) (work|my job)\b/, "work stress"],
  [/\b(sleep|insomnia)\b/, "sleep"],
  [/\b(students?|college|university|grad(uate)? school|young adults?)\b/, "students"],
  [/\b(perinatal|postpartum|post-partum|pregnan\w*|new (parents?|moms?|mothers?|dads?))\b/, "perinatal"],
  [/\b(veterans?|military|service members?)\b/, "veterans"],
  [/\b(life (changes?|transitions?)|big (life )?changes?|transitions?)\b/, "life transitions"],
];

/** The tag a value means, if any: "bipoc patients" and "people of color" both mean "bipoc". */
export function canonicalTag(value: string): ProviderTag | null {
  const v = value.toLowerCase().trim();
  if ((TAG_VALUES as string[]).includes(v)) return v as ProviderTag;
  for (const [re, tag] of SYNONYMS) if (re.test(v)) return tag;
  return null;
}
