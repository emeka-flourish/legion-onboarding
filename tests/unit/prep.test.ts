import { describe, expect, it } from "vitest";
import type { Journey, ReadinessTaskId, TaskStatus } from "@/domain/types";
import { prepStatus, routeAfter } from "@/rules/prep";
import { mergeChips } from "@/rules/preferences";
import { emptyTasks } from "@/rules/readiness";

// Visit prep as four areas with explicit dependencies (Emeka's walkthrough feedback, 2026-10-11).
const prep = (tasks: Partial<Record<ReadinessTaskId, TaskStatus>>): Pick<Journey, "readiness"> =>
  ({ readiness: { tasks: { ...emptyTasks(), ...tasks } } }) as Pick<Journey, "readiness">;

describe("visit prep areas", () => {
  it("groups seven tasks into four areas, with the pharmacy last", () => {
    const s = prepStatus(prep({}));
    expect(s.areas.map((a) => a.id)).toEqual(["identity", "health", "needs", "pharmacy"]);
    expect(s.areas.map((a) => a.steps.map((x) => x.task))).toEqual([
      ["identity"],
      ["records", "confirm_found", "essentials"],
      ["story", "check_in"],
      ["pharmacy"],
    ]);
    expect(s.total).toBe(4);
    expect(s.areasDone).toBe(0);
  });

  it("starts with the ID check, and the records search waits for it", () => {
    const s = prepStatus(prep({}));
    expect(s.next).toBe("identity");
    const records = s.areas[1].steps[0];
    expect(records).toMatchObject({ task: "records", available: false });
    expect(prepStatus(prep({ identity: "done" })).next).toBe("records");
  });

  it("skips a running search and keeps the patient moving, then offers the review once it's back", () => {
    const searching = prepStatus(prep({ identity: "done", records: "in_progress" }));
    expect(searching.searching).toBe(true);
    expect(searching.next).toBe("essentials"); // confirming waits for the search; health basics don't
    const back = prepStatus(prep({ identity: "done", records: "done" }));
    expect(back.next).toBe("confirm_found");
  });

  it("treats a declined search as finished, so the patient types their medications instead", () => {
    const s = prepStatus(prep({ identity: "done", records: "skipped" }));
    expect(s.areas[1].steps[1]).toMatchObject({ task: "confirm_found", available: true });
    expect(s.next).toBe("confirm_found");
  });

  it("counts an area done only when every step in it is done", () => {
    const s = prepStatus(prep({ identity: "done", records: "done", confirm_found: "done", essentials: "done", story: "done" }));
    expect(s.areas.map((a) => a.done)).toEqual([true, true, false, false]);
    expect(s.areasDone).toBe(2);
    expect(s.next).toBe("check_in");
  });

  it("returns a partly answered check-in as the next step", () => {
    expect(prepStatus(prep({ identity: "done", records: "done", confirm_found: "done", essentials: "done", story: "done", check_in: "in_progress" })).next).toBe(
      "check_in",
    );
  });

  it("has no next step once everything is done", () => {
    const all = prep({ identity: "done", records: "done", confirm_found: "done", essentials: "done", story: "done", check_in: "done", pharmacy: "done" });
    expect(prepStatus(all).next).toBeUndefined();
    expect(prepStatus(all).areasDone).toBe(4);
  });
});

describe("one continuous workflow", () => {
  it("leads from the ID check straight into the records step", () => {
    expect(routeAfter("identity", prep({ identity: "done" }))).toBe("/home/records");
    expect(routeAfter("identity", prep({ identity: "done", records: "in_progress" }))).toBe("/home");
  });

  it("leads from the review into health basics, and from the conversation into the check-in", () => {
    expect(routeAfter("confirm_found", prep({ identity: "done", records: "done" }))).toBe("/home/essentials");
    expect(routeAfter("confirm_found", prep({ identity: "done", records: "done", essentials: "done" }))).toBe("/home");
    expect(routeAfter("story", prep({}))).toBe("/home/check-in");
    expect(routeAfter("story", prep({ check_in: "done" }))).toBe("/home");
    expect(routeAfter("pharmacy", prep({}))).toBe("/home");
  });
});

describe("editing preferences", () => {
  const woman = { kind: "gender", value: "woman", label: "Woman provider" } as const;
  const man = { kind: "gender", value: "man", label: "Man provider" } as const;
  const spanish = { kind: "language", value: "spanish", label: "Speaks Spanish" } as const;
  const stress = { kind: "other", value: "work stress", label: "Work stress" } as const;

  it("adds new preferences to the ones already chosen, without duplicates", () => {
    expect(mergeChips([woman, spanish], [spanish, stress])).toEqual([woman, spanish, stress]);
  });

  it("lets a new gender preference replace the old one", () => {
    expect(mergeChips([woman, spanish], [man])).toEqual([spanish, man]);
  });

  it("keeps at most five, the newest winning", () => {
    const many = ["a", "b", "c", "d", "e"].map((v) => ({ kind: "other" as const, value: `topic ${v}`, label: v }));
    expect(mergeChips(many, [stress])).toEqual([...many.slice(1), stress]);
  });
});
