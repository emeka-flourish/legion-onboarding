import type { PlanCode } from "@/domain/types";

export const PLAN_LABEL: Record<PlanCode, string> = {
  aetna: "Aetna",
  bcbs_tx: "Blue Cross Blue Shield of Texas",
  cigna: "Cigna",
  uhc: "UnitedHealthcare",
  oscar: "Oscar Health",
  other: "Other insurance",
  none: "No insurance",
};

export const PLAN_ORDER: PlanCode[] = ["aetna", "bcbs_tx", "cigna", "uhc", "oscar", "other", "none"];

// Legion's published self-pay rates (discovery/current-flow.md, stage 3).
export const SELF_PAY = { intakeCents: 25_000, followUpCents: 15_000 };
