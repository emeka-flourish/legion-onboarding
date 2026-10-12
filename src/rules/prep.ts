// Visit prep as four areas instead of seven separate tasks (Emeka's walkthrough feedback, 2026-10-11).
// Pure and safe for the browser: the home screen, the task screens, and the demo controls all read it.
import type { Journey, ReadinessTaskId, TaskStatus } from "@/domain/types";

export type PrepAreaId = "identity" | "health" | "needs" | "pharmacy";

/**
 * Ordered by what makes a patient clinically ready: who they are, their history, what they need help with,
 * and last, where prescriptions go. Inside an area, steps run in order and later steps depend on earlier ones.
 */
export const PREP_AREAS: { id: PrepAreaId; tasks: ReadinessTaskId[] }[] = [
  { id: "identity", tasks: ["identity"] },
  { id: "health", tasks: ["records", "confirm_found", "essentials"] },
  { id: "needs", tasks: ["story", "check_in"] },
  { id: "pharmacy", tasks: ["pharmacy"] },
];

export const TASK_ROUTE: Record<ReadinessTaskId, string> = {
  identity: "/home/id",
  records: "/home/records",
  confirm_found: "/home/records",
  essentials: "/home/essentials",
  story: "/home/story",
  check_in: "/home/check-in",
  pharmacy: "/home/pharmacy",
};

/** Where finishing a step leads: the next step of the same workflow, so a patient isn't sent back to a list. */
const CONTINUES_TO: Partial<Record<ReadinessTaskId, ReadinessTaskId>> = {
  identity: "records", // the verified ID is what the records search uses
  confirm_found: "essentials",
  story: "check_in",
};

type PrepInput = Pick<Journey, "readiness">;

const finished = (s: TaskStatus) => s === "done" || s === "skipped";

/** Whether a step can start now. The records search needs a verified ID; reviewing needs the search done or declined. */
export function isAvailable(task: ReadinessTaskId, j: PrepInput): boolean {
  const t = j.readiness.tasks;
  if (task === "records") return t.identity === "done";
  if (task === "confirm_found") return finished(t.records);
  return true;
}

export interface PrepStep {
  task: ReadinessTaskId;
  status: TaskStatus;
  available: boolean;
}

export interface PrepArea {
  id: PrepAreaId;
  steps: PrepStep[];
  done: boolean;
  started: boolean;
}

export function prepStatus(j: PrepInput) {
  const t = j.readiness.tasks;
  const areas: PrepArea[] = PREP_AREAS.map(({ id, tasks }) => {
    const steps = tasks.map((task) => ({ task, status: t[task], available: isAvailable(task, j) }));
    return {
      id,
      steps,
      // The records search is optional: declining it still finishes that step.
      done: steps.every((s) => finished(s.status)),
      started: steps.some((s) => s.status !== "todo"),
    };
  });
  // The next thing the patient can do, in area order. A search that is running needs nothing from them.
  const canDoNow = (s: PrepStep) => s.available && !finished(s.status) && !(s.task === "records" && s.status === "in_progress");
  const next = areas.flatMap((a) => a.steps).find(canDoNow);
  return {
    areas,
    areasDone: areas.filter((a) => a.done).length,
    total: areas.length,
    next: next?.task,
    searching: t.records === "in_progress",
  };
}

/** The route after finishing `task`: the step it leads into, when that step is still open, else home. */
export function routeAfter(task: ReadinessTaskId, j: PrepInput): string {
  const next = CONTINUES_TO[task];
  if (!next) return "/home";
  const status = j.readiness.tasks[next];
  if (finished(status) || !isAvailable(next, j)) return "/home";
  if (next === "records" && status !== "todo") return "/home"; // already searching
  return TASK_ROUTE[next];
}
