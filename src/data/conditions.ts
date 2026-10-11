import type { ConditionCode } from "@/domain/types";

// Condition names in running text ("Focuses on anxiety and depression") and on the "What brings you here" tiles.
// Kept free of server-only imports so screens can use it.
export const CONDITION_LABEL: Record<ConditionCode, string> = {
  adhd: "ADHD",
  depression: "depression",
  anxiety: "anxiety",
  bipolar: "bipolar disorder",
  ptsd: "PTSD",
  not_sure: "not sure yet",
  other: "other concerns",
};

export const CONDITION_TILE: Record<ConditionCode, string> = {
  anxiety: "Anxiety",
  depression: "Depression",
  adhd: "ADHD",
  bipolar: "Bipolar disorder",
  ptsd: "PTSD or trauma",
  not_sure: "I'm not sure",
  other: "Something else",
};

export const CONDITION_ORDER: ConditionCode[] = ["anxiety", "depression", "adhd", "bipolar", "ptsd", "other", "not_sure"];
