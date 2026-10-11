import { PLAN_LABEL, SELF_PAY } from "@/data/plans";
import type { CoverageState, PlanCode } from "@/domain/types";

export const formatCents = (cents: number) => `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;

/** Shown when a plan is tapped, before any check (Legion's own published range for insured patients). */
export function typicalCostText(plan: PlanCode): string {
  if (plan === "none") {
    return `Self-pay is ${formatCents(SELF_PAY.intakeCents)} for your first visit and ${formatCents(SELF_PAY.followUpCents)} for follow-ups.`;
  }
  if (plan === "other") return "We'll check your plan's coverage and your cost before you book.";
  return `Most patients with ${PLAN_LABEL[plan]} pay $0 to $40 per visit. We'll confirm your exact cost before you book.`;
}

export function costLine(coverage?: CoverageState): string {
  if (!coverage) return "";
  if (coverage.mode === "self_pay") {
    return `${formatCents(SELF_PAY.intakeCents)} for this first visit, ${formatCents(SELF_PAY.followUpCents)} for follow-ups (self-pay)`;
  }
  if (coverage.status === "active" && coverage.intakeCents !== undefined) {
    return `${formatCents(coverage.intakeCents)} copay for this visit with ${PLAN_LABEL[coverage.plan]}`;
  }
  if (coverage.confirmLater) {
    return `Usually $0 to $40 with ${PLAN_LABEL[coverage.plan]}. We'll confirm your exact cost before your visit.`;
  }
  return "";
}
