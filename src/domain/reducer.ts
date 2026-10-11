// The journey state machine (TRD 4.1 and 6.1): one pure function decides what each action does at each stage.
// It returns the next journey plus the events to record; the server layer persists both.
import { PERSONAS } from "@/data/personas";
import { pharmacyById } from "@/data/pharmacies";
import { SELF_PAY } from "@/data/plans";
import type { EventName, EventProps } from "@/events/catalog";
import { newId } from "@/lib/random";
import { randomInt } from "node:crypto";
import { ageCheck } from "@/rules/age";
import { evaluateFit } from "@/rules/eligibility";
import { rankProviders } from "@/rules/matching";
import { checkInComplete, GAD7_LENGTH, PHQ9_LENGTH, phq9Item9Positive } from "@/rules/questionnaires";
import { emptyTasks, readinessStatus } from "@/rules/readiness";
import { DELAYS_MS, scaled } from "@/services/sim/delays";
import { verifyIdentity } from "@/services/sim/identity";
import { startJob } from "@/services/sim/jobs";
import { followUpSlots } from "@/services/sim/scheduling";
import type { Action } from "./actions";
import type { Journey, PersonaId, SafetyFlag, Stage } from "./types";

export interface Ctx {
  now: Date;
  demoMode: boolean;
  phoneHash?: string;
  codeValid?: boolean;
  /** Set by the server when the verified phone already belongs to a person (person-level dedupe, TRD 7.2). */
  existingPersonId?: string;
}

export interface PendingEvent {
  name: EventName;
  props?: EventProps;
}

export interface ReduceResult {
  journey: Journey;
  events: PendingEvent[];
  reply?: { alternatives?: string[] };
}

export class TransitionError extends Error {
  constructor(
    public code: "invalid_transition" | "invalid_input",
    message: string,
  ) {
    super(message);
  }
}

const HOUR = 3_600_000;

/** Demo phone numbers stay in the fictional 555-01xx range but differ per journey, so reviewers never collide. */
export function demoPhoneFor(personaPhone: string): string {
  return personaPhone.replace(/555-01\d\d$/, `555-01${String(randomInt(0, 100)).padStart(2, "0")}`);
}

export function newJourney(id: string, now: Date, opts: { personaId?: PersonaId; timeZone: string }): Journey {
  const persona = opts.personaId ? PERSONAS[opts.personaId] : undefined;
  const iso = now.toISOString();
  return {
    id,
    createdAt: iso,
    updatedAt: iso,
    personaId: opts.personaId,
    demoPhone: persona ? demoPhoneFor(persona.phone) : undefined,
    timeZone: persona?.timeZone ?? opts.timeZone,
    stage: "fit",
    sessions: 1,
    fit: {},
    conditions: [],
    preferences: { windows: persona?.windows ?? [], chips: [], earlierOpeningAlert: false },
    readiness: {
      tasks: emptyTasks(),
      gad7: Array<number | null>(GAD7_LENGTH).fill(null),
      phq9: Array<number | null>(PHQ9_LENGTH).fill(null),
      safetyFlags: [],
    },
    jobs: {},
    counters: { typed: 0, taps: 0, aiCalls: 0, rejectedEvents: 0 },
    demo: { slowInsurer: false, takeChosenSlot: false, takenSlots: [] },
  };
}

export function raiseSafetyFlag(j: Journey, type: SafetyFlag["type"], now: Date, events: PendingEvent[]): void {
  if (j.readiness.safetyFlags.some((f) => f.type === type && !f.reviewedAt)) return;
  j.readiness.safetyFlags.push({ id: newId("flag"), type, raisedAt: now.toISOString() });
  events.push({ name: "safety_flag_raised", props: { type } });
  events.push({ name: "crisis_resources_shown", props: { trigger: type } });
}

function maybeReady(j: Journey, now: Date, events: PendingEvent[]): void {
  if (!j.booking || j.readiness.readyAt || !readinessStatus(j).requiredDone) return;
  j.readiness.readyAt = now.toISOString();
  const hours = Math.max(0, Math.round((new Date(j.booking.start).getTime() - now.getTime()) / HOUR));
  events.push({
    name: "visit_ready",
    props: { hours_before_visit: hours, typed_inputs: j.counters.typed, taps: j.counters.taps },
  });
}

const PREVIOUS: Partial<Record<Stage, (j: Journey) => Stage>> = {
  needs: () => "fit",
  help: () => "needs",
  pay: () => "help",
  providers: () => "pay",
  hold: () => "providers",
  coverage: () => "providers",
  book: (j) => (j.coverage?.mode === "insured" ? "coverage" : "providers"),
};

export function applyAction(prev: Journey, action: Action, ctx: Ctx): ReduceResult {
  const j: Journey = structuredClone(prev);
  const events: PendingEvent[] = [];
  let reply: ReduceResult["reply"];
  const now = ctx.now;
  const nowIso = now.toISOString();
  const persona = j.personaId ? PERSONAS[j.personaId] : undefined;

  const need = (...stages: Stage[]) => {
    if (!stages.includes(j.stage)) throw new TransitionError("invalid_transition", `${action.type} is not allowed at ${j.stage}`);
  };
  const demoOnly = () => {
    if (!ctx.demoMode) throw new TransitionError("invalid_transition", `${action.type} is only available in demo mode`);
  };

  switch (action.type) {
    case "ANSWER_FIT": {
      need("fit");
      j.fit[action.questionId] = action.answer;
      j.counters.taps += 1;
      const result = evaluateFit(j.fit);
      if (result.outcome === "crisis") {
        j.eligibility = { outcome: "crisis" };
        j.stage = "crisis";
        events.push({ name: "eligibility_evaluated", props: { outcome: "crisis", reason: "safety" } });
        events.push({ name: "crisis_resources_shown", props: { trigger: "fit_check" } });
      } else if (result.outcome === "screened_out") {
        j.eligibility = { outcome: "screened_out", reasonCode: result.reasonCode };
        j.stage = "not_a_fit";
        events.push({ name: "eligibility_evaluated", props: { outcome: "screened_out", reason: result.reasonCode } });
        events.push({ name: "screen_out_resource_shown", props: { reason: result.reasonCode } });
      } else if (result.outcome === "eligible") {
        j.eligibility = { outcome: "eligible" };
        j.stage = "needs";
        events.push({ name: "eligibility_evaluated", props: { outcome: "eligible" } });
      }
      break;
    }

    case "GO_BACK": {
      const back = PREVIOUS[j.stage];
      if (!back) throw new TransitionError("invalid_transition", `Can't go back from ${j.stage}`);
      j.stage = back(j);
      break;
    }

    case "SET_CONDITIONS": {
      need("needs");
      j.conditions = [...new Set(action.conditions)];
      j.counters.taps += j.conditions.length;
      j.stage = "help";
      events.push({ name: "care_need_captured", props: { condition_count: j.conditions.length } });
      break;
    }

    case "SET_CARE_TYPE": {
      need("help");
      j.careType = action.careType;
      j.counters.taps += 1;
      j.stage = "pay";
      events.push({ name: "care_need_captured", props: { need_type: action.careType } });
      break;
    }

    case "SET_PLAN": {
      need("pay");
      j.plan = action.plan;
      j.counters.taps += 1;
      j.coverage =
        action.plan === "none"
          ? { mode: "self_pay", plan: "none", status: "not_started", ...SELF_PAY, source: "Legion self-pay rates", confirmLater: false }
          : { mode: "insured", plan: action.plan, status: "not_started", source: "Plan selected by patient", confirmLater: false };
      j.stage = "providers";
      events.push({ name: "coverage_selected", props: { plan_kind: action.plan === "none" ? "self_pay" : "insured" } });
      break;
    }

    case "SET_TIME_WINDOWS": {
      need("providers");
      j.preferences.windows = [...new Set(action.windows)];
      j.counters.taps += 1;
      events.push({ name: "filter_applied", props: { window_count: j.preferences.windows.length } });
      break;
    }

    case "APPLY_PREFERENCE_CHIPS": {
      need("providers");
      j.preferences.chips = action.chips;
      j.counters.typed += 1;
      events.push({ name: "preference_note_applied", props: { chip_count: action.chips.length, mode: action.mode } });
      break;
    }

    case "SET_EARLIER_ALERT": {
      need("providers");
      j.preferences.earlierOpeningAlert = action.on;
      j.counters.taps += 1;
      events.push({ name: "earlier_opening_alert_set", props: { on: action.on } });
      break;
    }

    case "SELECT_SLOT": {
      need("providers");
      const ranked = rankProviders(j, now, j.demo.takenSlots);
      const index = ranked.findIndex((r) => r.provider.id === action.providerId);
      if (index === -1) throw new TransitionError("invalid_input", "That provider isn't available for you");
      if (!ranked[index].slots.includes(action.slotStart)) throw new TransitionError("invalid_input", "That time isn't available");
      j.counters.taps += 1;
      const rank = index + 1;
      events.push({ name: "slot_selected", props: { rank } });
      if (j.demo.takeChosenSlot) {
        // Demo scenario: someone else booked this time a moment ago.
        j.demo.takeChosenSlot = false;
        j.demo.takenSlots.push(action.slotStart);
        reply = { alternatives: ranked[index].slots.filter((s) => s !== action.slotStart).slice(0, 3) };
        events.push({ name: "reservation_failed", props: { reason: "slot_taken" } });
        break;
      }
      j.selection = { providerId: action.providerId, slotStart: action.slotStart, rank };
      events.push({ name: "reservation_created", props: { hold_minutes: 10 } });
      j.stage = j.person ? (j.coverage?.mode === "insured" ? "coverage" : "book") : "hold";
      break;
    }

    case "HOLD_START": {
      need("hold");
      if (!ctx.phoneHash) throw new TransitionError("invalid_input", "Please enter a valid US mobile number");
      j.pendingPerson = { firstName: action.firstName, phoneHash: ctx.phoneHash };
      j.counters.typed += 2;
      break;
    }

    case "HOLD_VERIFY": {
      need("hold");
      if (!j.pendingPerson) throw new TransitionError("invalid_transition", "Start by entering your name and number");
      if (!ctx.codeValid) throw new TransitionError("invalid_input", "That code doesn't match. Please try again.");
      j.person = {
        personId: ctx.existingPersonId ?? newId("per"),
        firstName: j.pendingPerson.firstName,
        phoneHash: j.pendingPerson.phoneHash,
        createdAt: nowIso,
      };
      delete j.pendingPerson;
      j.counters.typed += 1;
      events.push({ name: "account_created", props: { method: "phone" } });
      j.stage = j.coverage?.mode === "insured" ? "coverage" : "book";
      break;
    }

    case "COVERAGE_SUBMIT": {
      need("coverage");
      if (!j.coverage || j.coverage.mode !== "insured") throw new TransitionError("invalid_transition", "No plan to check");
      if (j.coverage.status === "pending") throw new TransitionError("invalid_transition", "We're already checking your plan");
      if (action.method === "member_id" && (!action.memberId || action.memberId.length < 5)) {
        throw new TransitionError("invalid_input", "Please enter the member ID from your insurance card");
      }
      j.coverage.method = action.method;
      j.coverage.memberIdLast4 = action.memberId?.slice(-4);
      j.coverage.dobGiven = action.dob;
      j.coverage.status = "pending";
      const kind = action.method === "lookup" ? "coverage_discover" : "coverage_verify";
      const delay = j.demo.slowInsurer
        ? DELAYS_MS.slow_insurer
        : kind === "coverage_discover"
          ? DELAYS_MS.coverage_discover
          : DELAYS_MS.coverage_verify;
      delete j.jobs.coverage_verify;
      delete j.jobs.coverage_discover;
      j.jobs[kind] = startJob(kind, now, scaled(delay));
      j.counters.typed += action.method === "member_id" ? 2 : 1;
      events.push({ name: "coverage_check_started", props: { method: action.method } });
      break;
    }

    case "COVERAGE_TRY_AGAIN": {
      need("coverage");
      if (!j.coverage || !["not_found", "inactive"].includes(j.coverage.status)) {
        throw new TransitionError("invalid_transition", "Nothing to retry");
      }
      j.coverage.status = "not_started";
      j.coverage.method = undefined;
      break;
    }

    case "CHANGE_PLAN": {
      need("coverage", "book");
      // A different plan can change which providers fit, so the patient picks again (the account stays).
      delete j.selection;
      delete j.coverage;
      delete j.jobs.coverage_verify;
      delete j.jobs.coverage_discover;
      j.stage = "pay";
      break;
    }

    case "COVERAGE_CONTINUE": {
      need("coverage");
      // The patient has seen the confirmed cost; certainty comes before the card (principle 5).
      if (j.coverage?.status !== "active") throw new TransitionError("invalid_transition", "Your coverage isn't confirmed yet");
      j.counters.taps += 1;
      j.stage = "book";
      break;
    }

    case "COVERAGE_USE_SELF_PAY": {
      need("coverage");
      j.coverage = { mode: "self_pay", plan: "none", status: "not_started", ...SELF_PAY, source: "Legion self-pay rates", confirmLater: false };
      delete j.jobs.coverage_verify;
      delete j.jobs.coverage_discover;
      j.counters.taps += 1;
      j.stage = "book";
      events.push({ name: "coverage_selected", props: { plan_kind: "self_pay" } });
      break;
    }

    case "COVERAGE_CONFIRM_LATER": {
      need("coverage");
      const job = j.jobs.coverage_verify ?? j.jobs.coverage_discover;
      const waited = job ? now.getTime() - new Date(job.startedAt).getTime() : 0;
      if (!job || job.status !== "pending" || waited < scaled(DELAYS_MS.confirm_later_after)) {
        throw new TransitionError("invalid_transition", "Still checking your plan");
      }
      j.coverage!.confirmLater = true;
      j.counters.taps += 1;
      j.stage = "book";
      events.push({ name: "coverage_check_timed_out", props: { seconds: Math.round(waited / 1000) } });
      break;
    }

    case "BOOK": {
      need("book");
      if (!j.selection || !j.coverage) throw new TransitionError("invalid_transition", "Choose a time first");
      if (j.coverage.mode === "insured" && j.coverage.status !== "active" && !j.coverage.confirmLater) {
        throw new TransitionError("invalid_transition", "Your coverage isn't confirmed yet");
      }
      const start = new Date(j.selection.slotStart);
      j.booking = {
        appointmentId: newId("apt"),
        providerId: j.selection.providerId,
        start: start.toISOString(),
        end: new Date(start.getTime() + HOUR).toISOString(),
        timeZone: j.timeZone,
        cardLast4: action.cardLast4,
        confirmedAt: nowIso,
      };
      j.counters.taps += 3;
      j.counters.typed += 1;
      j.stage = "home";
      events.push({ name: "consents_signed", props: { count: 3 } });
      events.push({ name: "payment_method_added", props: { result: "authorized" } });
      events.push({
        name: "appointment_confirmed",
        props: {
          lead_hours: Math.round((start.getTime() - now.getTime()) / HOUR),
          coverage_confirm_later: j.coverage.confirmLater,
          typed_inputs: j.counters.typed,
          taps: j.counters.taps,
        },
      });
      events.push({ name: "reminder_sent", props: { kind: "confirmation", channel: "sms" } });
      break;
    }

    case "ID_VERIFY": {
      need("home");
      const id = verifyIdentity(j);
      const check = ageCheck(id.dob, j.fit.adult, j.coverage?.dobGiven, now);
      j.readiness.identity = { ...id, ageVerified: check.ageVerified, reviewFlag: check.reviewFlag };
      j.readiness.tasks.identity = "done";
      j.counters.taps += 1;
      events.push({
        name: "identity_verified",
        props: { result: "verified", age_verified: check.ageVerified, review_flag: check.reviewFlag },
      });
      break;
    }

    case "RECORDS_CONSENT": {
      need("home");
      if (j.readiness.tasks.identity !== "done") throw new TransitionError("invalid_transition", "Verify your ID first");
      if (j.jobs.records) break; // already searching
      j.readiness.tasks.records = "in_progress";
      j.jobs.records = startJob("records", now, scaled(DELAYS_MS.records));
      j.jobs.med_history = startJob("med_history", now, scaled(DELAYS_MS.med_history));
      j.counters.taps += 1;
      events.push({ name: "records_requested", props: { sources: "hie_and_pharmacy" } });
      break;
    }

    case "STORY_CONFIRM": {
      need("home");
      j.readiness.story = action.items;
      j.readiness.clinicianSummary = action.summary;
      j.readiness.tasks.story = "done";
      j.counters.typed += action.typedAnswers;
      j.counters.taps += 1;
      events.push({ name: "intake_task_completed", props: { task: "story", items: action.items.length, mode: action.summary.mode } });
      maybeReady(j, now, events);
      break;
    }

    case "CHECKIN_ANSWER": {
      need("home");
      const list = action.instrument === "gad7" ? j.readiness.gad7 : j.readiness.phq9;
      if (action.index >= list.length) throw new TransitionError("invalid_input", "No such question");
      list[action.index] = action.value;
      j.counters.taps += 1;
      if (j.readiness.tasks.check_in === "todo") j.readiness.tasks.check_in = "in_progress";
      // Fixed rule (L3): any answer above "Not at all" to PHQ-9 item 9 shows resources and flags a person to review.
      if (action.instrument === "phq9" && action.index === 8 && phq9Item9Positive(j.readiness.phq9)) {
        raiseSafetyFlag(j, "phq9_item9", now, events);
      }
      if (j.readiness.tasks.check_in !== "done" && checkInComplete(j.readiness.gad7, j.readiness.phq9)) {
        j.readiness.tasks.check_in = "done";
        events.push({ name: "intake_task_completed", props: { task: "check_in" } });
        maybeReady(j, now, events);
      }
      break;
    }

    case "CONFIRM_FOUND": {
      need("home");
      if (j.readiness.tasks.records !== "done") throw new TransitionError("invalid_transition", "Still searching for your records");
      const recordIds = new Set((j.readiness.foundRecords ?? []).map((r) => r.id));
      const medIds = new Set((j.readiness.foundMedications ?? []).map((m) => m.id));
      j.readiness.confirmedRecordIds = action.recordIds.filter((id) => recordIds.has(id));
      j.readiness.confirmedMedicationIds = action.medicationIds.filter((id) => medIds.has(id));
      j.readiness.otherMedications = action.otherMedications;
      j.readiness.tasks.confirm_found = "done";
      j.counters.taps += 1;
      j.counters.typed += action.otherMedications.length;
      events.push({
        name: "intake_task_completed",
        props: {
          task: "confirm_found",
          records_confirmed: j.readiness.confirmedRecordIds.length,
          meds_confirmed: j.readiness.confirmedMedicationIds.length,
          other_meds: action.otherMedications.length,
        },
      });
      maybeReady(j, now, events);
      break;
    }

    case "SET_PHARMACY": {
      need("home");
      if (!pharmacyById(action.pharmacyId)) throw new TransitionError("invalid_input", "Unknown pharmacy");
      const fromHistory = j.readiness.foundMedications?.find((m) => m.pharmacyId)?.pharmacyId;
      j.readiness.pharmacyId = action.pharmacyId;
      j.readiness.tasks.pharmacy = "done";
      j.counters.taps += 1;
      events.push({ name: "intake_task_completed", props: { task: "pharmacy", prefilled: fromHistory === action.pharmacyId } });
      maybeReady(j, now, events);
      break;
    }

    case "SET_ESSENTIALS": {
      need("home");
      const essentials = {
        hospitalizedEver: action.hospitalizedEver,
        controlledNow: action.controlledNow,
        otherAllergies: action.otherAllergies,
        alcohol: action.alcohol,
        cannabis: action.cannabis,
        otherSubstances: action.otherSubstances,
        contactName: action.contactName,
        contactPhone: action.contactPhone,
      };
      j.readiness.essentials = essentials;
      j.readiness.tasks.essentials = "done";
      j.counters.taps += 5;
      j.counters.typed += 2 + essentials.otherAllergies.length;
      events.push({ name: "intake_task_completed", props: { task: "essentials" } });
      maybeReady(j, now, events);
      break;
    }

    case "TRUST_PULSE": {
      need("home");
      if (j.trustPulse !== undefined) break; // asked once
      j.trustPulse = action.score;
      j.counters.taps += 1;
      events.push({ name: "trust_pulse_answered", props: { score: action.score } });
      break;
    }

    case "JOIN_VISIT": {
      need("home", "visit");
      if (!j.booking) throw new TransitionError("invalid_transition", "No visit booked");
      if (j.stage === "home") {
        j.visit = { status: "in_progress", startedAt: nowIso };
        j.stage = "visit";
        events.push({ name: "reminder_sent", props: { kind: "join_link", channel: "sms" } });
        events.push({ name: "visit_join_attempted" });
        events.push({ name: "visit_started" });
      }
      break;
    }

    case "END_VISIT": {
      need("visit");
      j.visit = { ...j.visit!, status: "completed", completedAt: nowIso };
      const prescribes = persona ? persona.visit.prescribes : false; // generic journeys: no prescription
      j.after = { summaryViewed: false, prescriptionPharmacyId: prescribes ? j.readiness.pharmacyId : undefined };
      j.stage = "after";
      const minutes = Math.round((now.getTime() - new Date(j.createdAt).getTime()) / 60_000);
      events.push({ name: "first_visit_completed", props: { within_14_days: minutes <= 14 * 24 * 60, minutes_from_start: minutes } });
      if (prescribes && j.readiness.pharmacyId) events.push({ name: "prescription_sent" });
      break;
    }

    case "VIEW_SUMMARY": {
      need("after");
      if (!j.after!.summaryViewed) {
        j.after!.summaryViewed = true;
        events.push({ name: "visit_summary_viewed" });
      }
      break;
    }

    case "BOOK_FOLLOW_UP": {
      need("after");
      const visitStart = new Date(j.booking!.start);
      if (!followUpSlots(j.booking!.providerId, j.id, visitStart).includes(action.slotStart)) {
        throw new TransitionError("invalid_input", "That time isn't available");
      }
      j.after!.followUpStart = action.slotStart;
      events.push({
        name: "follow_up_booked",
        props: { weeks_out: Math.round((new Date(action.slotStart).getTime() - visitStart.getTime()) / (7 * 24 * HOUR)) },
      });
      break;
    }

    case "DEMO_SET": {
      demoOnly();
      if (action.slowInsurer !== undefined) j.demo.slowInsurer = action.slowInsurer;
      if (action.takeChosenSlot !== undefined) j.demo.takeChosenSlot = action.takeChosenSlot;
      break;
    }

    case "DEMO_REVIEW_FLAG": {
      demoOnly();
      const flag = j.readiness.safetyFlags.find((f) => f.id === action.flagId);
      if (!flag) throw new TransitionError("invalid_input", "No such flag");
      if (!flag.reviewedAt) {
        flag.reviewedAt = nowIso;
        events.push({
          name: "safety_flag_reviewed",
          props: { type: flag.type, minutes_to_review: Math.round((now.getTime() - new Date(flag.raisedAt).getTime()) / 60_000) },
        });
      }
      break;
    }
  }

  j.updatedAt = nowIso;
  return { journey: j, events, reply };
}
