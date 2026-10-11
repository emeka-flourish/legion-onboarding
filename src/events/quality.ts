// Data-quality checks (TRD 7.8), run when the journey view opens. Pure: journeys and their events in, a report out.
import type { Journey, JourneyEvent, Stage } from "@/domain/types";

export interface Issue {
  journeyId: string;
  event: string;
  detail: string;
}

export interface QualityReport {
  journeys: number;
  events: number;
  validationFailures: number;
  outOfOrder: Issue[];
  duplicates: Issue[];
  linkageGaps: Issue[];
  completeChains: number;
}

/** An event may only follow the events it depends on. */
const PREREQUISITES: Record<string, string[]> = {
  eligibility_evaluated: ["onboarding_started"],
  providers_presented: ["coverage_selected"],
  slot_selected: ["providers_presented"],
  reservation_created: ["slot_selected"],
  account_created: ["reservation_created"],
  coverage_verified: ["coverage_check_started"],
  appointment_confirmed: ["reservation_created", "account_created", "consents_signed"],
  records_requested: ["identity_verified"],
  records_received: ["records_requested"],
  med_history_received: ["records_requested"],
  visit_ready: ["appointment_confirmed"],
  visit_started: ["appointment_confirmed"],
  first_visit_completed: ["visit_started"],
  prescription_sent: ["first_visit_completed"],
  visit_summary_viewed: ["first_visit_completed"],
  follow_up_booked: ["first_visit_completed"],
  safety_flag_reviewed: ["safety_flag_raised"],
};

/** System-of-record events that happen once per journey. Reminders are once per kind. */
const ONCE = new Set([
  "payment_method_added",
  "appointment_confirmed",
  "identity_verified",
  "records_received",
  "med_history_received",
  "visit_started",
  "first_visit_completed",
  "prescription_sent",
  "follow_up_booked",
]);

/** The events a journey at each stage must already have recorded. */
const CHAIN: Partial<Record<Stage, string[]>> = {
  needs: ["onboarding_started", "eligibility_evaluated"],
  providers: ["onboarding_started", "eligibility_evaluated", "care_need_captured", "coverage_selected"],
  hold: ["onboarding_started", "eligibility_evaluated", "care_need_captured", "coverage_selected", "providers_presented", "slot_selected", "reservation_created"],
  home: [
    "onboarding_started", "eligibility_evaluated", "care_need_captured", "coverage_selected", "providers_presented",
    "slot_selected", "reservation_created", "account_created", "consents_signed", "payment_method_added", "appointment_confirmed",
  ],
  after: ["appointment_confirmed", "visit_started", "first_visit_completed"],
};
CHAIN.help = CHAIN.needs;
CHAIN.pay = [...CHAIN.needs!, "care_need_captured"];
CHAIN.coverage = [...CHAIN.hold!, "account_created"];
CHAIN.book = CHAIN.hold;
CHAIN.visit = [...CHAIN.home!, "visit_started"];
CHAIN.crisis = ["onboarding_started", "eligibility_evaluated", "crisis_resources_shown"];
CHAIN.not_a_fit = ["onboarding_started", "eligibility_evaluated", "screen_out_resource_shown"];

export function missingFromChain(stage: Stage, events: JourneyEvent[]): string[] {
  const names = new Set(events.map((e) => e.name));
  return (CHAIN[stage] ?? ["onboarding_started"]).filter((n) => !names.has(n));
}

export function checkQuality(journeys: { journey: Pick<Journey, "id" | "stage" | "counters">; events: JourneyEvent[] }[]): QualityReport {
  const report: QualityReport = {
    journeys: journeys.length,
    events: 0,
    validationFailures: 0,
    outOfOrder: [],
    duplicates: [],
    linkageGaps: [],
    completeChains: 0,
  };
  for (const { journey, events } of journeys) {
    report.events += events.length;
    report.validationFailures += journey.counters.rejectedEvents;

    const seen = new Set<string>();
    const onceKeys = new Set<string>();
    const accountIndex = events.findIndex((e) => e.name === "account_created");
    const personId = accountIndex >= 0 ? events[accountIndex].personId : undefined;

    events.forEach((e, i) => {
      for (const needed of PREREQUISITES[e.name] ?? []) {
        if (!seen.has(needed)) report.outOfOrder.push({ journeyId: journey.id, event: e.name, detail: `came before ${needed}` });
      }
      seen.add(e.name);

      const key = e.name === "reminder_sent" ? `${e.name}:${e.props.kind}` : e.name;
      if (ONCE.has(e.name) || e.name === "reminder_sent") {
        if (onceKeys.has(key)) report.duplicates.push({ journeyId: journey.id, event: e.name, detail: "recorded more than once" });
        onceKeys.add(key);
      }

      if (e.journeyId !== journey.id) report.linkageGaps.push({ journeyId: journey.id, event: e.name, detail: "carries another journey's ID" });
      if (accountIndex < 0 || i < accountIndex) {
        if (e.personId) report.linkageGaps.push({ journeyId: journey.id, event: e.name, detail: "has a person ID before the account existed" });
      } else if (!e.personId || e.personId !== personId) {
        report.linkageGaps.push({ journeyId: journey.id, event: e.name, detail: "is missing the person ID after the account" });
      }
    });

    if (missingFromChain(journey.stage, events).length === 0) report.completeChains += 1;
  }
  return report;
}

/** What should happen next for a journey, for the timeline and the people-in-progress panel. */
export function nextExpected(j: Pick<Journey, "stage" | "readiness" | "after">): string[] {
  switch (j.stage) {
    case "fit":
      return ["eligibility_evaluated"];
    case "needs":
    case "help":
      return ["care_need_captured"];
    case "pay":
      return ["coverage_selected"];
    case "providers":
      return ["slot_selected", "reservation_created"];
    case "hold":
      return ["account_created"];
    case "coverage":
      return ["coverage_verified"];
    case "book":
      return ["appointment_confirmed"];
    case "home": {
      const t = j.readiness.tasks;
      const next: string[] = [];
      if (t.identity !== "done") next.push("identity_verified");
      else if (t.records === "todo") next.push("records_requested");
      else if (t.records === "in_progress") next.push("records_received");
      const left = (["story", "check_in", "confirm_found", "pharmacy", "essentials"] as const).filter((x) => t[x] !== "done");
      if (left.length) next.push(`intake_task_completed (${left.length} left)`);
      next.push(left.length || t.identity !== "done" ? "visit_ready" : "visit_started");
      return next;
    }
    case "visit":
      return ["first_visit_completed"];
    case "after":
      if (!j.after?.summaryViewed) return ["visit_summary_viewed"];
      return j.after.followUpStart ? [] : ["follow_up_booked"];
    default:
      return [];
  }
}
