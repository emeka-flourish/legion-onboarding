// Per-person metrics (TRD 7.5). Pure: give it events, get the funnel. Every metric counts people: the person ID
// once it exists, otherwise the journey ID, so a patient who resumes on a second device counts once.
import type { JourneyEvent } from "@/domain/types";

export interface Rate {
  id: string;
  label: string;
  numerator: number;
  denominator: number;
  /** null when the denominator is zero. */
  rate: number | null;
  /** What is counted. People, unless noted. */
  unit?: "flags";
}

export interface Value {
  id: string;
  label: string;
  value: number | null;
  unit: string;
  note?: string;
}

export interface Funnel {
  people: number;
  headline: Rate;
  stages: Rate[];
  guardrails: (Rate | Value)[];
  trust: { median: number | null; shareHigh: number | null; answered: number };
}

const DAY_MS = 24 * 3_600_000;
export const REVIEW_TARGET_MINUTES = 240; // an assumed target; Legion sets the real one (TRD 13)

/** Groups events by person: a journey's events all belong to the person it was linked to, if any. */
export function groupByPerson(events: JourneyEvent[]): Map<string, JourneyEvent[]> {
  const personOfJourney = new Map<string, string>();
  for (const e of events) if (e.personId) personOfJourney.set(e.journeyId, e.personId);
  const people = new Map<string, JourneyEvent[]>();
  for (const e of events) {
    const key = personOfJourney.get(e.journeyId) ?? e.journeyId;
    const list = people.get(key);
    if (list) list.push(e);
    else people.set(key, [e]);
  }
  for (const list of people.values()) list.sort((a, b) => a.ts.localeCompare(b.ts));
  return people;
}

const rate = (id: string, label: string, numerator: number, denominator: number): Rate => ({
  id,
  label,
  numerator,
  denominator,
  rate: denominator ? numerator / denominator : null,
});

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function computeFunnel(events: JourneyEvent[]): Funnel {
  const people = [...groupByPerson(events).values()];
  const has = (list: JourneyEvent[], name: string, test?: (e: JourneyEvent) => boolean) =>
    list.some((e) => e.name === name && (!test || test(e)));
  const count = (pred: (list: JourneyEvent[]) => boolean) => people.filter(pred).length;
  const first = (list: JourneyEvent[], name: string) => list.find((e) => e.name === name);

  const eligible = count((l) => has(l, "eligibility_evaluated", (e) => e.props.outcome === "eligible"));
  const completedWithin14 = count((l) => {
    const start = first(l, "onboarding_started");
    const done = first(l, "first_visit_completed");
    return Boolean(start && done && Date.parse(done.ts) - Date.parse(start.ts) <= 14 * DAY_MS) &&
      has(l, "eligibility_evaluated", (e) => e.props.outcome === "eligible");
  });
  const presented = count((l) => has(l, "providers_presented"));
  const reserved = count((l) => has(l, "reservation_created"));
  const accounts = count((l) => has(l, "account_created"));
  const booked = count((l) => has(l, "appointment_confirmed"));
  const knownCost = count((l) => has(l, "appointment_confirmed", (e) => e.props.coverage_confirm_later === false));
  const readyOnTime = count((l) => has(l, "visit_ready", (e) => Number(e.props.hours_before_visit) >= 24));
  const attended = count((l) => has(l, "first_visit_completed"));
  const followedUp = count((l) => has(l, "follow_up_booked"));
  const screenedOut = count((l) => has(l, "eligibility_evaluated", (e) => e.props.outcome === "screened_out"));
  const shownResource = count((l) => has(l, "screen_out_resource_shown"));

  const typed = people.flatMap((l) => {
    const ready = first(l, "visit_ready");
    return ready ? [Number(ready.props.typed_inputs)] : [];
  });
  const minutesToBook = people.flatMap((l) => {
    const start = first(l, "onboarding_started");
    const book = first(l, "appointment_confirmed");
    return start && book ? [(Date.parse(book.ts) - Date.parse(start.ts)) / 60_000] : [];
  });
  const flagsRaised = events.filter((e) => e.name === "safety_flag_raised").length;
  const flagsOnTime = events.filter(
    (e) => e.name === "safety_flag_reviewed" && Number(e.props.minutes_to_review) <= REVIEW_TARGET_MINUTES,
  ).length;
  const scores = people.flatMap((l) => {
    const t = first(l, "trust_pulse_answered");
    return t ? [Number(t.props.score)] : [];
  });

  return {
    people: people.length,
    headline: rate("headline", "First visit completed within 14 days, among eligible starters", completedWithin14, eligible),
    stages: [
      rate("selected", "Picked a time, among people shown providers", reserved, presented),
      rate("account", "Held time became an account", accounts, reserved),
      rate("cost_known", "Knew coverage and cost before booking", knownCost, booked),
      rate("ready_on_time", "Ready at least 24 hours before the visit", readyOnTime, booked),
      rate("attended", "Attended the first visit", attended, booked),
      rate("next_step", "Booked a follow-up after the visit", followedUp, attended),
    ],
    guardrails: [
      { id: "typed", label: "Typed inputs before the visit (median)", value: median(typed), unit: "inputs", note: "Today: about 75 to 80 inputs, most typed" },
      {
        id: "minutes_to_book",
        label: "Time from start to booking (median)",
        value: (() => {
          const m = median(minutesToBook);
          return m === null ? null : Math.round(m * 10) / 10;
        })(),
        unit: "minutes",
      },
      rate("resources", "Screened-out people shown a resource", shownResource, screenedOut),
      { ...rate("flags_on_time", `Safety flags reviewed within ${REVIEW_TARGET_MINUTES} minutes`, flagsOnTime, flagsRaised), unit: "flags" },
    ],
    trust: {
      median: median(scores),
      shareHigh: scores.length ? scores.filter((s) => s >= 4).length / scores.length : null,
      answered: scores.length,
    },
  };
}

/** The rebuild's person-level stages, through the first visit and the step after it. */
export const REBUILD_STAGES: { label: string; event: string; test?: (e: JourneyEvent) => boolean }[] = [
  { label: "Started", event: "onboarding_started" },
  { label: "Eligible", event: "eligibility_evaluated", test: (e) => e.props.outcome === "eligible" },
  { label: "Shown best-fit providers", event: "providers_presented" },
  { label: "Held a time", event: "reservation_created" },
  { label: "Account created", event: "account_created" },
  { label: "Visit booked", event: "appointment_confirmed" },
  { label: "Ready for the visit", event: "visit_ready" },
  { label: "First visit completed", event: "first_visit_completed" },
  { label: "Follow-up booked", event: "follow_up_booked" },
];

export function countStages(events: JourneyEvent[]): { label: string; people: number }[] {
  const people = [...groupByPerson(events).values()];
  return REBUILD_STAGES.map((s) => ({
    label: s.label,
    people: people.filter((list) => list.some((e) => e.name === s.event && (!s.test || s.test(e)))).length,
  }));
}
