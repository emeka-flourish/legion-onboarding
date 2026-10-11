// Provider filtering, ranking, and "why this provider" reasons (TRD 6.3, decision L14 item 4).
// Hard filters remove providers; ranking only orders them. Every reason names its source.
import { PLAN_LABEL } from "@/data/plans";
import { PROVIDERS, type Provider } from "@/data/providers";
import type { ConditionCode, Journey, PreferenceChip, Reason, TimeWindow } from "@/domain/types";
import { generateSlots } from "@/services/sim/scheduling";
import { windowOf, WINDOW_SHORT } from "./time";

export const ALL_WINDOWS: TimeWindow[] = ["weekday_morning", "weekday_afternoon", "weekday_evening", "weekend"];

export const CONDITION_LABEL: Record<ConditionCode, string> = {
  adhd: "ADHD",
  depression: "depression",
  anxiety: "anxiety",
  bipolar: "bipolar disorder",
  ptsd: "PTSD",
  not_sure: "not sure yet",
  other: "other concerns",
};

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
  focusNote: string;
  languages: string[];
  reasons: Reason[];
  slots: string[];
  rank: number;
}

export interface MatchResult {
  top: ProviderCard[];
  sharedReasons: Reason[];
  noOpenings: boolean;
  totalEligible: number;
  all: ProviderCard[];
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

function preferenceMatches(p: Provider, chips: PreferenceChip[], inWindowSlots: string[], timeZone: string): PreferenceChip[] {
  return chips.filter((c) => {
    if (c.kind === "gender") return c.value === p.gender;
    if (c.kind === "language") return p.languages.some((l) => l.toLowerCase() === c.value.toLowerCase());
    if (c.kind === "focus") return (p.focus as string[]).includes(c.value);
    if (c.kind === "time") return inWindowSlots.some((s) => windowOf(s, timeZone) === c.value);
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
      (a, b) =>
        Number(b.inWindow.length > 0) - Number(a.inWindow.length > 0) ||
        b.focusMatches.length - a.focusMatches.length ||
        b.prefMatches.length - a.prefMatches.length ||
        (a.inWindow[0] ?? a.slots[0] ?? "~").localeCompare(b.inWindow[0] ?? b.slots[0] ?? "~") ||
        a.provider.id.localeCompare(b.provider.id),
    );
}

const listJoin = (items: string[]) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

const PRIORITY = ["openings", "focus", "pref", "experience", "network", "care_type", "licensed"];
const priorityOf = (code: string) => {
  const i = PRIORITY.findIndex((p) => code === p || code.startsWith(`${p}_`));
  return i === -1 ? PRIORITY.length : i;
};

function candidateReasons(r: Ranked, j: MatchInput, coverageVerified: boolean): Reason[] {
  const reasons: Reason[] = [];
  const profile = "Legion provider profile (simulated)";
  const w = j.preferences.windows;
  if (r.inWindow.length > 0) {
    const kind = w.length === 1 ? `${WINDOW_SHORT[w[0]]} ` : "";
    reasons.push({
      code: "openings",
      label: `${r.inWindow.length} ${kind}openings in the next 2 weeks`,
      source: "Legion scheduling (simulated)",
      shared: false,
    });
  }
  if (r.focusMatches.length) {
    reasons.push({
      code: "focus",
      label: `Focuses on ${listJoin(r.focusMatches.map((c) => CONDITION_LABEL[c]))}`,
      source: profile,
      shared: false,
    });
  }
  for (const c of r.prefMatches) reasons.push({ code: `pref_${c.kind}_${c.value}`, label: c.label, source: profile, shared: false });
  reasons.push({
    code: "experience",
    label: `${r.provider.yearsInPractice} years in practice`,
    source: `${r.provider.licenseSource} (simulated)`,
    shared: false,
  });
  if (isSelfPay(j)) {
    reasons.push({ code: "network", label: "Sees self-pay patients", source: "Legion pricing (simulated)", shared: false });
  } else {
    reasons.push({
      code: "network",
      label: `In network with ${PLAN_LABEL[j.plan!]}`,
      source: coverageVerified ? "Network status · Sohar (simulated)" : "Legion credentialing (simulated)",
      shared: false,
    });
  }
  if (j.careType === "new_evaluation") {
    reasons.push({ code: "care_type", label: "Does new evaluations", source: profile, shared: false });
  } else if (j.careType === "existing_dx_medication") {
    reasons.push({ code: "care_type", label: "Manages ongoing medication", source: profile, shared: false });
  }
  reasons.push({ code: "licensed", label: "Licensed in Texas", source: "Texas licensing boards (simulated)", shared: false });
  return reasons;
}

/** Splits reasons into those every shown provider shares (one header line) and those that differ (on cards). */
export function buildReasons(top: Ranked[], j: MatchInput, coverageVerified = false) {
  const all = top.map((r) => candidateReasons(r, j, coverageVerified));
  const key = (r: Reason) => `${r.code}|${r.label}`;
  const shared =
    all.length > 1 ? all[0].filter((r) => all.every((list) => list.some((x) => key(x) === key(r)))).map((r) => ({ ...r, shared: true })) : [];
  const sharedKeys = new Set(shared.map(key));
  const perCard = all.map((list) =>
    list
      .filter((r) => !sharedKeys.has(key(r)))
      .sort((a, b) => priorityOf(a.code) - priorityOf(b.code))
      .slice(0, 3),
  );
  return { shared, perCard };
}

export function matchProviders(
  j: MatchInput,
  now: Date,
  opts: { coverageVerified?: boolean; topCount?: number; exclude?: readonly string[] } = {},
): MatchResult {
  const ranked = rankProviders(j, now, opts.exclude);
  const topCount = opts.topCount ?? 3;
  const noOpenings = ranked.length > 0 && ranked.every((r) => r.inWindow.length === 0);
  const toCard = (r: Ranked, reasons: Reason[], rank: number): ProviderCard => ({
    id: r.provider.id,
    name: r.provider.name,
    initials: r.provider.initials,
    credential: r.provider.credential,
    focusNote: r.provider.focusNote,
    languages: r.provider.languages,
    reasons,
    slots: (r.inWindow.length ? r.inWindow : r.slots).slice(0, 6),
    rank,
  });
  const topRanked = ranked.slice(0, topCount);
  const { shared, perCard } = buildReasons(topRanked, j, opts.coverageVerified);
  const allReasons = ranked.map((r) => buildReasons([r], j, opts.coverageVerified).perCard[0]);
  return {
    top: topRanked.map((r, i) => toCard(r, perCard[i], i + 1)),
    sharedReasons: shared,
    noOpenings,
    totalEligible: ranked.length,
    all: ranked.map((r, i) => toCard(r, allReasons[i], i + 1)),
  };
}
