import type { CareType, ConditionCode } from "@/domain/types";
import { CONDITION_LABEL } from "@/data/conditions";

// Condition-specific expectations are fixed rules, shown when a condition is selected (TAC-04).
export const EXPECTATIONS: Partial<Record<ConditionCode, string[]>> = {
  anxiety: [
    "We do not prescribe benzodiazepines over 1 mg a day.",
    "If a benzodiazepine is ever considered, your provider checks your Texas prescription monitoring record first, as state law requires.",
  ],
  adhd: [
    "Stimulant prescriptions need a verified ID and a review of your history first. Your provider decides what's right for you.",
  ],
  depression: ["You're not alone. Many people start to feel better with the right care."],
  bipolar: ["Our providers help with mood stabilization and medication management."],
  ptsd: ["Our providers offer trauma-informed care."],
};

export function conditionExpectations(conditions: ConditionCode[]): { condition: ConditionCode; lines: string[] }[] {
  return conditions.filter((c) => EXPECTATIONS[c]).map((c) => ({ condition: c, lines: EXPECTATIONS[c]! }));
}

const listJoin = (items: string[]) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

/** The care-type options adapt their wording to the conditions chosen (TAC-05). */
export function careTypeOptions(conditions: ConditionCode[]): { value: CareType; title: string; detail: string }[] {
  if (conditions.includes("adhd")) {
    return [
      {
        value: "existing_dx_medication",
        title: "I was diagnosed with ADHD and need medication support",
        detail: "We'll pair you with a provider who manages ADHD medication.",
      },
      {
        value: "new_evaluation",
        title: "I think I might have ADHD and want an evaluation",
        detail: "Your first visit is a full evaluation.",
      },
      { value: "not_sure", title: "I'm not sure yet, but I need help", detail: "We'll work it out together at your first visit." },
    ];
  }
  const named = conditions.filter((c) => c !== "not_sure" && c !== "other").map((c) => CONDITION_LABEL[c]);
  return [
    {
      value: "existing_dx_medication",
      title: named.length
        ? `I already have a diagnosis of ${listJoin(named)} and need medication support`
        : "I already have a diagnosis and need medication support",
      detail: "Your provider picks up where your last care left off.",
    },
    {
      value: "new_evaluation",
      title: named.length ? `I'd like an evaluation for ${listJoin(named)}` : "I'd like an evaluation",
      detail: "Your first visit is a full evaluation, with medication discussed if it helps.",
    },
    { value: "not_sure", title: "I'm not sure what I need yet", detail: "We'll work it out together at your first visit." },
  ];
}
