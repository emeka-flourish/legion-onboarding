import type { Journey, ReadinessTaskId } from "@/domain/types";

// Approved order (L15): the ID check comes first because it supplies what the record search needs.
export const TASK_ORDER: ReadinessTaskId[] = ["identity", "records", "story", "check_in", "confirm_found", "pharmacy", "essentials"];
export const REQUIRED_TASKS: ReadinessTaskId[] = ["identity", "story", "check_in", "confirm_found", "pharmacy", "essentials"];

export const emptyTasks = (): Record<ReadinessTaskId, "todo"> => ({
  identity: "todo",
  records: "todo",
  story: "todo",
  check_in: "todo",
  confirm_found: "todo",
  pharmacy: "todo",
  essentials: "todo",
});

export function readinessStatus(j: Pick<Journey, "readiness" | "booking">) {
  const remaining = REQUIRED_TASKS.filter((t) => j.readiness.tasks[t] !== "done");
  const deadline = j.booking ? new Date(new Date(j.booking.start).getTime() - 24 * 3600_000).toISOString() : undefined;
  return {
    requiredDone: remaining.length === 0,
    remaining,
    doneCount: REQUIRED_TASKS.length - remaining.length,
    total: REQUIRED_TASKS.length,
    deadline,
  };
}
