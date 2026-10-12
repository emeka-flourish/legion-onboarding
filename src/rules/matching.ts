// Provider filtering, ranking, and "why this provider fits you" (TRD 6.3; decisions L14, L19, and L20).
// Hard filters remove providers; ranking only orders them. Every reason is true and names its source.
// What makes a provider a fit (their focus, the patient's stated preferences, the care asked for) is kept apart from
// when they can see the patient: availability ranks the list and shapes the times shown, but it is never a "why".
import { CONDITION_LABEL } from "@/data/conditions";
import { PLAN_LABEL } from "@/data/plans";
import type { Portrait } from "@/data/portraits";
import { PROVIDERS, type Provider } from "@/data/providers";
import { canonicalTag, TAGS } from "@/data/tags";
import type { ConditionCode, Journey, PreferenceChip, Reason, TimeWindow } from "@/domain/types";
import { generateSlots } from "@/services/sim/scheduling";
import { windowOf } from "./time";

export { CONDITION_LABEL };

export const ALL_WINDOWS: TimeWindow[] = ["weekday_morning", "weekday_afternoon", "weekday_evening", "weekend"];

export type MatchInput = Pick<Journey, "id" | "conditions" | "careType" | "plan" | "coverage" | "preferences" | "timeZone">;

export interface Ranked {
  provider: Provider;
  slots: string[];
  inWindow: string[];
  focusMatches: ConditionCode[];
  prefMatches: PreferenceChip[];
}

export interface ProviderCard {
  id: string;
  name: string;
  initials: string;
  credential: string;
  /** The credential in plain words: "Psychiatric nurse practitioner" or "Psychiatrist". */
  role: string;
  portrait: Portrait;
  /** Why this provider fits this patient, most pertinent first: their focus, then stated preferences, then the care asked for. */
  reasons: Reason[];
  /** Two or three times worth offering first, in time order: the best fits for the chosen times, and the soonest opening. */
  slots: string[];
  /** Which of `slots` is the soonest opening, when it falls outside the chosen times. */
  soonest?: string;
  /** More times, for "See more times." */
  moreSlots: string[];
  /** Profile details, kept behind "View profile" (L20). */
  focusNote: string;
  languages: string[];
  careFor: string[];
  yearsInPractice: number;
  licenseSource: string;
  rank: number;
}

export interface MatchResult {
  /** The best match, then the other strong matches. */
  top: ProviderCard[];
  all: ProviderCard[];
  totalEligible: number;
  /** Providers who fit and have openings in the chosen times. */
  matched: number;
  noOpenings: boolean;
  /** What every provider shown has in common, for "How matching works." */
  criteria: Reason[];
}

const isSelfPay = (j: MatchInput) => j.coverage?.mode === "self_pay" || !j.plan || j.plan === "none" || j.plan === "other";

export function isEligibleProvider(p: Provider, j: MatchInput): boolean {
  if (!p.licenseStates.includes("TX") || !p.acceptingNew) return false;
  if (isSelfPay(j) ? !p.selfPay : !p.plans.includes(j.plan!)) return false;
  if (j.careType && j.careType !== "not_sure" && !p.careTypes.includes(j.careType)) return false;
  // Assumption: ADHD medication (stimulants) and bipolar care need a provider who lists that focus.
  if (j.conditions.includes("adhd") && j.careType === "existing_dx_medication" && !p.focus.includes("adhd")) return false;
  if (j.conditions.includes("bipolar") && !p.focus.includes("bipolar")) return false;
  return true;
}

function preferenceMatches(p: Provider, chips: PreferenceChip[], slots: string[], timeZone: string): PreferenceChip[] {
  return chips.filter((c) => {
    if (c.kind === "gender") return c.value === p.gender;
    if (c.kind === "language") return p.languages.some((l) => l.toLowerCase() === c.value.toLowerCase());
    if (c.kind === "focus") return (p.focus as string[]).includes(c.value);
    if (c.kind === "time") return slots.some((s) => windowOf(s, timeZone) === c.value);
    if (c.kind === "other") {
      const tag = canonicalTag(c.value);
      return (tag !== null && p.tags.includes(tag)) || p.focusNote.toLowerCase().includes(c.value.toLowerCase());
    }
    return false;
  });
}

export function rankProviders(j: MatchInput, now: Date, exclude: readonly string[] = []): Ranked[] {
  const windows = j.preferences.windows.length ? j.preferences.windows : ALL_WINDOWS;
  return PROVIDERS.filter((p) => isEligibleProvider(p, j))
    .map((provider) => {
      const slots = generateSlots(provider, j.id, now).filter((s) => !exclude.includes(s));
      const inWindow = slots.filter((s) => windows.includes(windowOf(s, j.timeZone)));
      return {
        provider,
        slots,
        inWindow,
        focusMatches: j.conditions.filter((c) => provider.focus.includes(c)),
        prefMatches: preferenceMatches(provider, j.preferences.chips, slots, j.timeZone),
      };
    })
    .sort(
      // A provider who can see the patient in the times they picked comes first, then one who focuses on at least
      // one of their conditions. Then fit: each preference the patient stated counts twice a matched condition, so
      // what they ask for in their own words changes the recommendation (L20). Then the sooner time.
      (a, b) =>
        Number(b.inWindow.length > 0) - Number(a.inWindow.length > 0) ||
        Number(b.focusMatches.length > 0) - Number(a.focusMatches.length > 0) ||
        fitScore(b) - fitScore(a) ||
        (a.inWindow[0] ?? a.slots[0] ?? "~").localeCompare(b.inWindow[0] ?? b.slots[0] ?? "~") ||
        a.provider.id.localeCompare(b.provider.id),
    );
}

const fitScore = (r: Pick<Ranked, "focusMatches" | "prefMatches">) => r.focusMatches.length + 2 * r.prefMatches.length;

const listJoin = (items: string[]) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

const PROFILE = "Legion provider profile (simulated)";

/** A preference the provider matches, said as a reason for this patient. */
function preferenceReason(c: PreferenceChip): string {
  if (c.kind === "gender") return `A ${c.value}, as you asked`;
  if (c.kind === "focus") return `Experienced with ${CONDITION_LABEL[c.value as ConditionCode] ?? c.value}`;
  if (c.kind === "other") {
    const tag = canonicalTag(c.value);
    return tag ? TAGS[tag].reason : `Focus includes ${c.value}`;
  }
  return c.label; // a language: "Speaks Spanish"
}

const MAX_REASONS = 4;

/** Why this provider fits: focus on the patient's conditions first, then what they asked for, then the care they want. */
function fitReasons(r: Ranked, j: MatchInput): Reason[] {
  const reasons: Reason[] = [];
  if (r.focusMatches.length) {
    reasons.push({ code: "focus", label: `Focuses on ${listJoin(r.focusMatches.map((c) => CONDITION_LABEL[c]))}`, source: PROFILE, shared: false });
  }
  for (const c of r.prefMatches) {
    if (c.kind === "time") continue; // availability is shown with the times, never as fit
    reasons.push({ code: `pref_${c.kind}_${c.value.replace(/[^a-z0-9]+/g, "_")}`, label: preferenceReason(c), source: PROFILE, shared: false });
  }
  if (j.careType === "new_evaluation") {
    reasons.push({ code: "care_type", label: "Offers the full evaluation you asked for", source: PROFILE, shared: false });
  } else if (j.careType === "existing_dx_medication") {
    reasons.push({ code: "care_type", label: "Manages ongoing medication, as you asked", source: PROFILE, shared: false });
  }
  return reasons.slice(0, MAX_REASONS);
}

/** What every provider shown has in common: the filters, stated once in "How matching works." */
function criteria(j: MatchInput, coverageVerified: boolean): Reason[] {
  const list: Reason[] = [{ code: "licensed", label: "Licensed in Texas", source: "Texas licensing boards (simulated)", shared: true }];
  list.push(
    isSelfPay(j)
      ? { code: "network", label: "Sees self-pay patients", source: "Legion pricing (simulated)", shared: true }
      : {
          code: "network",
          label: `In network with ${PLAN_LABEL[j.plan!]}`,
          source: coverageVerified ? "Network status · Sohar (simulated)" : "Legion credentialing (simulated)",
          shared: true,
        },
  );
  if (j.careType === "new_evaluation") list.push({ code: "care_type", label: "Does new evaluations", source: PROFILE, shared: true });
  if (j.careType === "existing_dx_medication") list.push({ code: "care_type", label: "Manages ongoing medication", source: PROFILE, shared: true });
  list.push({ code: "accepting", label: "Accepting new patients", source: "Legion scheduling (simulated)", shared: true });
  return list;
}

/**
 * Two or three times worth offering first (Emeka's direction): the best fits for the chosen times, plus the soonest
 * opening when it falls outside them, so a patient who can flex sees it. Everything else waits behind "See more times."
 */
export function pickTimes(r: Pick<Ranked, "slots" | "inWindow">): { slots: string[]; soonest?: string; more: string[] } {
  if (!r.inWindow.length) return { slots: r.slots.slice(0, 3), more: r.slots.slice(3, 12) };
  let picks = r.inWindow.slice(0, 2);
  let soonest: string | undefined;
  const earliest = r.slots[0];
  if (earliest && !picks.includes(earliest)) {
    soonest = earliest;
    picks = [earliest, ...picks];
  } else if (r.inWindow[2]) {
    picks.push(r.inWindow[2]);
  }
  picks.sort();
  return { slots: picks, soonest, more: r.inWindow.filter((s) => !picks.includes(s)).slice(0, 9) };
}

const ROLE: Record<Provider["credential"], string> = {
  "PMHNP-BC": "Psychiatric nurse practitioner",
  MD: "Psychiatrist",
  DO: "Psychiatrist",
};

export function matchProviders(
  j: MatchInput,
  now: Date,
  opts: { coverageVerified?: boolean; topCount?: number; exclude?: readonly string[] } = {},
): MatchResult {
  const ranked = rankProviders(j, now, opts.exclude);
  const topCount = opts.topCount ?? 3;
  const matched = ranked.filter((r) => r.inWindow.length > 0).length;
  const toCard = (r: Ranked, rank: number): ProviderCard => {
    const times = pickTimes(r);
    return {
      id: r.provider.id,
      name: r.provider.name,
      initials: r.provider.initials,
      credential: r.provider.credential,
      role: ROLE[r.provider.credential],
      portrait: r.provider.portrait,
      reasons: fitReasons(r, j),
      slots: times.slots,
      soonest: times.soonest,
      moreSlots: times.more,
      focusNote: r.provider.focusNote,
      languages: r.provider.languages,
      careFor: r.provider.tags.map((t) => TAGS[t].profile),
      yearsInPractice: r.provider.yearsInPractice,
      licenseSource: r.provider.licenseSource,
      rank,
    };
  };
  const all = ranked.map((r, i) => toCard(r, i + 1));
  return {
    top: all.slice(0, topCount),
    all,
    totalEligible: ranked.length,
    matched,
    noOpenings: ranked.length > 0 && matched === 0,
    criteria: criteria(j, Boolean(opts.coverageVerified)),
  };
}
