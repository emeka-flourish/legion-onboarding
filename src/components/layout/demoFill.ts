// "Fill this step" in the demo controls: answers the current step the way the demo patient would, so a
// reviewer can move quickly. Journeys without a demo patient get plain invented answers.
import type { ActOutcome, JourneyState } from "@/components/journey/JourneyProvider";
import { PERSONAS } from "@/data/personas";
import { PHARMACIES } from "@/data/pharmacies";
import type { Action } from "@/domain/actions";
import type { StoryItem } from "@/domain/types";
import { api } from "@/lib/api";
import { FIT_QUESTIONS } from "@/rules/eligibility";
import type { MatchResult } from "@/rules/matching";
import { prepStatus } from "@/rules/prep";
import { GAD7_LENGTH, PHQ9_LENGTH } from "@/rules/questionnaires";

type Act = (action: Action, opts?: { navigate?: boolean }) => Promise<ActOutcome>;

/** A fictional 555-01xx number for journeys without a demo patient, so reviewers never share one. */
export function inventedPhone(): string {
  return `(512) 555-01${String(Math.floor(Math.random() * 100)).padStart(2, "0")}`;
}

export const GENERIC_MEMBER_ID = "DEMO10293847";
export const GENERIC_DOB = "1990-06-15";

const GENERIC_STORY: StoryItem[] = [
  { kind: "concern", text: "Feeling stressed and on edge most days" },
  { kind: "duration", text: "A few months" },
  { kind: "prior_treatment", text: "Nothing tried yet" },
  { kind: "goal", text: "Feel more like myself" },
];
const GENERIC_CHECKIN = { gad7: [1, 1, 1, 1, 0, 1, 0, 1], phq9: [1, 1, 1, 1, 0, 0, 0, 0, 0, 1] };
const GENERIC_ESSENTIALS = {
  hospitalizedEver: "no",
  controlledNow: "no",
  otherAllergies: [],
  alcohol: "occasionally",
  cannabis: "never",
  otherSubstances: "no",
  contactName: "Sam Sample",
  contactPhone: "(512) 555-0110",
} as const;

/** Returns a plain message when there's nothing to fill here. */
export async function fillStep(state: JourneyState, act: Act): Promise<string | null> {
  const j = state.journey;
  const p = j.personaId ? PERSONAS[j.personaId] : undefined;
  switch (j.stage) {
    case "fit": {
      const left = FIT_QUESTIONS.filter((q) => j.fit[q.id] === undefined);
      for (const [i, q] of left.entries()) {
        await act({ type: "ANSWER_FIT", questionId: q.id, answer: p ? p.fit[q.id] : q.continueWith }, { navigate: i === left.length - 1 });
      }
      return null;
    }
    case "needs":
      await act({ type: "SET_CONDITIONS", conditions: p?.conditions ?? ["anxiety"] });
      return null;
    case "help":
      await act({ type: "SET_CARE_TYPE", careType: p?.careType ?? "new_evaluation" });
      return null;
    case "pay":
      await act({ type: "SET_PLAN", plan: p?.plan ?? "none" });
      return null;
    case "providers": {
      const m = await api<MatchResult>("/api/providers", { body: {} });
      const card = m.ok ? m.data.top[0] : undefined;
      if (!card) return "No provider to choose here.";
      await act({ type: "SELECT_SLOT", providerId: card.id, slotStart: card.slots[0] });
      return null;
    }
    case "hold": {
      const sent = await act(
        { type: "HOLD_START", firstName: p?.firstName ?? "Alex", lastName: p?.lastName ?? "Rivers", phone: j.demoPhone ?? inventedPhone() },
        { navigate: false },
      );
      if (!sent.ok || !sent.demoCode) return sent.message ?? "We couldn't send a code.";
      await act({ type: "HOLD_VERIFY", code: sent.demoCode });
      return null;
    }
    case "coverage": {
      const status = j.coverage?.status;
      if (status === "active") await act({ type: "COVERAGE_CONTINUE" });
      else if (status === "inactive") await act({ type: "COVERAGE_USE_SELF_PAY" });
      else if (status === "not_found") await act({ type: "COVERAGE_TRY_AGAIN" }, { navigate: false });
      else if (status === "pending") return "Still checking the plan. Try again in a moment.";
      else {
        await act(
          { type: "COVERAGE_SUBMIT", method: "member_id", memberId: p?.coverage.memberId ?? GENERIC_MEMBER_ID, dob: p?.coverage.dob ?? GENERIC_DOB },
          { navigate: false },
        );
      }
      return null;
    }
    case "book":
      await act({ type: "BOOK", consents: { terms: true, treatment: true, recording: true }, cardLast4: "4242" });
      return null;
    case "home":
      return fillNextTask(state, act);
    case "visit":
      await act({ type: "END_VISIT" });
      return null;
    case "after": {
      const slot = state.derived.followUpSlots?.[0];
      if (!slot || j.after?.followUpStart) return "Nothing left to fill.";
      await act({ type: "BOOK_FOLLOW_UP", slotStart: slot }, { navigate: false });
      return null;
    }
    default:
      return "There's nothing to fill on this screen.";
  }
}

/** On the home screen, completes the next visit-prep step, in the order the home screen shows them. */
async function fillNextTask(state: JourneyState, act: Act): Promise<string | null> {
  const j = state.journey;
  const r = j.readiness;
  const p = j.personaId ? PERSONAS[j.personaId] : undefined;
  const stay = { navigate: false };
  const next = prepStatus(j).next;
  if (!next) {
    if (r.tasks.records === "in_progress") return "Still searching for records. Try again in a moment.";
    await act({ type: "JOIN_VISIT" }); // prep is done, so the next step is the visit
    return null;
  }
  switch (next) {
    case "identity":
      await act({ type: "ID_VERIFY" }, stay);
      break;
    case "records":
      await act({ type: "RECORDS_CONSENT" }, stay);
      break;
    case "confirm_found":
      await act(
        {
          type: "CONFIRM_FOUND",
          recordIds: (r.foundRecords ?? []).map((x) => x.id),
          medicationIds: (r.foundMedications ?? []).map((x) => x.id),
          otherMedications: p?.otherMedications ?? [],
        },
        stay,
      );
      break;
    case "essentials":
      await act({ type: "SET_ESSENTIALS", ...(p?.essentials ?? GENERIC_ESSENTIALS), otherAllergies: [...(p?.essentials.otherAllergies ?? [])] }, stay);
      break;
    case "story": {
      const items = p
        ? [...Object.values(p.story.extract).flatMap((e) => e.items), ...Object.values(p.story.followUpExtract).flat()]
        : GENERIC_STORY;
      const res = await api<{ text: string; meta: { mode: "live" | "scripted"; provider?: string } } | { safety: "crisis" }>("/api/ai/summary", {
        body: { items },
      });
      if (!res.ok || "safety" in res.data) return "We couldn't fill the conversation just now.";
      const typedAnswers = p ? 4 + Object.keys(p.story.followUpAnswers).length : 4;
      await act({ type: "STORY_CONFIRM", items, summary: { text: res.data.text, mode: res.data.meta.mode, provider: res.data.meta.provider }, typedAnswers }, stay);
      break;
    }
    case "check_in": {
      const answers = p?.checkIn ?? GENERIC_CHECKIN;
      for (let index = 0; index < GAD7_LENGTH; index++) {
        if (r.gad7[index] === null) await act({ type: "CHECKIN_ANSWER", instrument: "gad7", index, value: answers.gad7[index] }, stay);
      }
      for (let index = 0; index < PHQ9_LENGTH; index++) {
        if (r.phq9[index] === null) await act({ type: "CHECKIN_ANSWER", instrument: "phq9", index, value: answers.phq9[index] }, stay);
      }
      break;
    }
    case "pharmacy": {
      const fromHistory = r.foundMedications?.find((m) => m.pharmacyId)?.pharmacyId;
      const pharmacyId = fromHistory ?? p?.pharmacyChoice ?? PHARMACIES.find((x) => x.city === r.identity?.city)?.id ?? PHARMACIES[0].id;
      await act({ type: "SET_PHARMACY", pharmacyId }, stay);
      break;
    }
  }
  return null;
}
