import type { EligibilityReason, FitQuestionId } from "@/domain/types";

// The six fit questions, unchanged from Legion's current flow (Gate 1: keep screening as is).
// `continueWith` is the answer that lets a patient continue.
export const FIT_QUESTIONS: {
  id: FitQuestionId;
  text: string;
  detail: string;
  continueWith: boolean;
  reason?: EligibilityReason;
}[] = [
  {
    id: "texas",
    text: "Are you based in Texas?",
    detail: "Our clinicians are licensed in Texas. If you're elsewhere, we'll point you to resources.",
    continueWith: true,
    reason: "not_texas",
  },
  {
    id: "medicaid_medicare",
    text: "Do you currently have Medicaid or Medicare as your insurance?",
    detail: "We're unable to serve patients who have Medicaid or Medicare, even on a cash-pay basis.",
    continueWith: false,
    reason: "medicaid_medicare",
  },
  {
    id: "risk_of_harm",
    text: "Are you currently at risk of harming yourself or others?",
    detail: "If you are, we'll connect you immediately to crisis resources for urgent support.",
    continueWith: false,
  },
  {
    id: "recent_hospitalization",
    text: "Have you been hospitalized for mental health or substance use in the past year?",
    detail: "If so, we may not be the right intensity of care, and we'll help you find what is.",
    continueWith: false,
    reason: "recent_hospitalization",
  },
  {
    id: "adult",
    text: "Are you 18 years or older?",
    detail: "Our care is for adults.",
    continueWith: true,
    reason: "under_18",
  },
  {
    id: "virtual_only",
    text: "Are you looking for virtual care only?",
    detail: "All of our visits happen by secure video.",
    continueWith: true,
    reason: "not_virtual",
  },
];

export type FitOutcome =
  | { outcome: "crisis" }
  | { outcome: "screened_out"; reasonCode: EligibilityReason }
  | { outcome: "eligible" }
  | { outcome: "incomplete" };

/** A "Yes" to the risk-of-harm question takes precedence over everything else. */
export function evaluateFit(fit: Partial<Record<FitQuestionId, boolean>>): FitOutcome {
  if (fit.risk_of_harm === true) return { outcome: "crisis" };
  for (const q of FIT_QUESTIONS) {
    const answer = fit[q.id];
    if (answer !== undefined && answer !== q.continueWith && q.reason) {
      return { outcome: "screened_out", reasonCode: q.reason };
    }
  }
  const complete = FIT_QUESTIONS.every((q) => fit[q.id] !== undefined);
  return complete ? { outcome: "eligible" } : { outcome: "incomplete" };
}
