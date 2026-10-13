// Crisis-language check (TRD 6.3). Runs on every free-text input BEFORE any model call.
// Deliberately conservative: a false alarm shows resources and asks a person to review; it never blocks care.

const PATTERNS: { category: "suicide" | "self_harm" | "harm_others"; re: RegExp }[] = [
  { category: "suicide", re: /\bsuicid/ },
  { category: "suicide", re: /\bkil+(ing)? ?my ?self\b/ },
  { category: "suicide", re: /\bend(ing)? (my life|it all|things for good)\b/ },
  { category: "suicide", re: /\btake my (own )?life\b/ },
  { category: "suicide", re: /\b(want|wanted|wanting|wish|wished) (to die|i was dead|i were dead|to be dead|i wasn'?t alive)\b/ },
  { category: "suicide", re: /\bbetter off dead\b/ },
  { category: "suicide", re: /\bno reason to (live|keep going|go on)\b/ },
  { category: "suicide", re: /\bdon'?t want to (be alive|live anymore|wake up)\b/ },
  { category: "suicide", re: /\bnot worth living\b/ },
  { category: "suicide", re: /\boverdos(e|ing)\b/ },
  { category: "self_harm", re: /\b(hurt|harm|cut|cutting|burn|burning) (my ?self|myself)\b/ },
  { category: "self_harm", re: /\bself[- ]?harm/ },
  {
    category: "harm_others",
    re: /\b(kill|hurt|harm|shoot|stab) (him|her|them|someone|somebody|people|my (wife|husband|partner|boss|kid|kids|son|daughter|mom|dad|roommate))\b/,
  },
];

export interface CrisisCheck {
  match: boolean;
  category?: "suicide" | "self_harm" | "harm_others";
}

export function detectCrisisLanguage(text: string): CrisisCheck {
  const normalized = text.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ");
  for (const p of PATTERNS) {
    if (p.re.test(normalized)) return { match: true, category: p.category };
  }
  return { match: false };
}
