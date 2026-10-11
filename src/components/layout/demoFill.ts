// "Fill this step" in the demo controls: answers the current step the way the demo patient would, so a
// reviewer can move quickly. Journeys without a demo patient get plain invented answers.
import type { ActOutcome } from "@/components/journey/JourneyProvider";
import type { JourneyState } from "@/components/journey/JourneyProvider";
import { PERSONAS } from "@/data/personas";
import type { Action } from "@/domain/actions";
import { api } from "@/lib/api";
import { FIT_QUESTIONS } from "@/rules/eligibility";
import type { MatchResult } from "@/rules/matching";

type Act = (action: Action, opts?: { navigate?: boolean }) => Promise<ActOutcome>;

/** A fictional 555-01xx number for journeys without a demo patient, so reviewers never share one. */
export function inventedPhone(): string {
  return `(512) 555-01${String(Math.floor(Math.random() * 100)).padStart(2, "0")}`;
}

export const GENERIC_MEMBER_ID = "DEMO10293847";
export const GENERIC_DOB = "1990-06-15";

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
      const sent = await act({ type: "HOLD_START", firstName: p?.firstName ?? "Alex", phone: j.demoPhone ?? inventedPhone() }, { navigate: false });
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
    default:
      return "There's nothing to fill on this screen yet.";
  }
}
