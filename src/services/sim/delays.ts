// Response times for simulated asynchronous services (TRD 4.5). DEMO_FAST=1 divides them by 20 for tests.
export const DELAYS_MS = {
  coverage_verify: 4_000,
  coverage_discover: 6_000,
  records: 8_000,
  med_history: 5_000,
  slow_insurer: 60_000,
  confirm_later_after: 15_000,
} as const;

export function scaled(ms: number): number {
  return process.env.DEMO_FAST === "1" ? Math.round(ms / 20) : ms;
}
