"use client";

import { Check, ChevronDown, ChevronRight, Lock } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { JourneyState } from "@/components/journey/JourneyProvider";
import { LinkButton } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Status";
import { pharmacyById } from "@/data/pharmacies";
import type { ReadinessTaskId } from "@/domain/types";
import { cx } from "@/lib/cx";
import { prepStatus, TASK_ROUTE, type PrepArea, type PrepAreaId, type PrepStep } from "@/rules/prep";
import { formatSlot } from "@/rules/time";

const AREA: Record<PrepAreaId, { title: string; detail: string }> = {
  identity: {
    title: "Confirm who you are",
    detail: "Verify your identity so we can securely find your records and save you from re-entering information.",
  },
  health: {
    title: "Review your health information",
    detail: "We look for your records and medications, you confirm what we found, then a few health basics.",
  },
  needs: {
    title: "Tell your provider what you need help with",
    detail: "A few questions in your own words, then two standard check-ins.",
  },
  pharmacy: { title: "Choose where prescriptions go", detail: "In case your provider prescribes something." },
};

/** The one next thing to do, as the module's main button. */
const NEXT_LABEL: Record<ReadinessTaskId, string> = {
  identity: "Verify your identity",
  records: "Find my records",
  confirm_found: "Review your health information",
  essentials: "Confirm a few health basics",
  story: "Tell your provider what's going on",
  check_in: "Answer the check-in questions",
  pharmacy: "Choose your pharmacy",
};

/** After a declined or empty search, the review step is the medications question. */
function nextLabel(task: ReadinessTaskId, state: JourneyState): string {
  const r = state.journey.readiness;
  const nothing = r.tasks.records === "skipped" || (r.tasks.records === "done" && !r.foundRecords?.length && !r.foundMedications?.length);
  return task === "confirm_found" && nothing ? "Tell us your medications" : NEXT_LABEL[task];
}

interface StepView {
  label: string;
  note?: ReactNode;
  state: "done" | "open" | "working" | "locked" | "ready";
}

/** How one step reads, given where the patient is. Dependencies are said as part of the workflow, not as a lock. */
function stepView(step: PrepStep, state: JourneyState): StepView {
  const r = state.journey.readiness;
  const t = r.tasks;
  const done = step.status === "done" || step.status === "skipped";
  switch (step.task) {
    case "identity":
      return { label: "Verify your identity", note: done ? "Verified" : "About a minute", state: done ? "done" : "open" };
    case "records": {
      if (t.records === "skipped") return { label: "Find your records", note: "You chose to enter them yourself", state: "done" };
      if (t.records === "done") {
        const n = (r.foundRecords?.length ?? 0) + (r.foundMedications?.length ?? 0);
        return { label: "Find your records", note: n ? `We found ${n} item${n === 1 ? "" : "s"}` : "Searched, nothing found", state: "done" };
      }
      if (t.records === "in_progress") return { label: "Finding your records…", note: "We'll let you know when they're ready", state: "working" };
      if (!step.available) return { label: "Find your records", note: "Starts once you've verified your identity", state: "locked" };
      return { label: "Find your records", note: "With your permission, so you can confirm instead of typing", state: "open" };
    }
    case "confirm_found": {
      const nothing = t.records === "done" && !r.foundRecords?.length && !r.foundMedications?.length;
      const label = t.records === "skipped" || nothing ? "Tell us your medications" : "Review what we found";
      if (done) return { label, note: "Confirmed", state: "done" };
      if (nothing) return { label, note: "Nothing turned up in the search", state: "ready" };
      if (t.records === "done") return { label: "Review the health information we found", note: "Your records are ready", state: "ready" };
      if (step.available) return { label, state: "open" };
      return { label, note: t.records === "in_progress" ? "Opens when your records arrive" : "After the records search", state: "locked" };
    }
    case "essentials":
      return {
        label: "Confirm a few health basics",
        note: done ? "Saved" : "Hospital stays, allergies, substance use, an emergency contact",
        state: done ? "done" : "open",
      };
    case "story":
      return { label: "Four short questions in your own words", note: done ? "Saved for your provider" : "An AI assistant organizes your answers", state: done ? "done" : "open" };
    case "check_in":
      return {
        label: "Two standard check-ins",
        note: done ? "Done" : step.status === "in_progress" ? "Partly answered" : "The GAD-7 and PHQ-9 questionnaires",
        state: done ? "done" : "open",
      };
    case "pharmacy": {
      const chosen = pharmacyById(r.pharmacyId);
      const fromHistory = pharmacyById(r.foundMedications?.find((m) => m.pharmacyId)?.pharmacyId);
      return {
        label: "Choose your pharmacy",
        note: chosen ? chosen.name : fromHistory ? `We found ${fromHistory.name} in your history` : undefined,
        state: done ? "done" : "open",
      };
    }
  }
}

function StepRow({ step, state }: { step: PrepStep; state: JourneyState }) {
  const v = stepView(step, state);
  const icon =
    v.state === "done" ? (
      <span className="flex size-6 items-center justify-center rounded-full bg-green-600 text-white">
        <Check aria-hidden className="size-4" />
      </span>
    ) : v.state === "working" ? (
      <span className="flex size-6 items-center justify-center rounded-full bg-blue-50">
        <Spinner className="size-4 text-primary" />
      </span>
    ) : v.state === "locked" ? (
      <span className="flex size-6 items-center justify-center rounded-full bg-gray-100 text-gray-600">
        <Lock aria-hidden className="size-3.5" />
      </span>
    ) : (
      <span className={cx("size-6 rounded-full border-2", v.state === "ready" ? "border-primary bg-blue-50" : "border-gray-300 bg-white")} />
    );
  const body = (
    <>
      {icon}
      <span className="min-w-0 flex-1">
        <span className={cx("block text-[15px]", v.state === "done" ? "text-gray-700" : "font-medium text-gray-900")}>{v.label}</span>
        {v.note && (
          <span role={v.state === "working" || v.state === "ready" ? "status" : undefined} className={cx("block text-sm", v.state === "ready" ? "font-medium text-primary-strong" : "text-gray-700")}>
            {v.note}
          </span>
        )}
      </span>
    </>
  );
  if (v.state === "locked") {
    return <div className="flex min-h-11 items-center gap-3 py-1.5">{body}</div>;
  }
  return (
    <Link
      href={TASK_ROUTE[step.task]}
      className={cx("-mx-2 flex min-h-11 items-center gap-3 rounded-md px-2 py-1.5 hover:bg-gray-50", v.state === "ready" && "bg-blue-50 hover:bg-blue-100")}
    >
      {body}
      <ChevronRight aria-hidden className="size-5 shrink-0 text-gray-500" />
    </Link>
  );
}

/**
 * Where tapping a folded area goes: its first open step, or its first step to review once it's done. An area
 * whose first step waits on an earlier one (the records search waits for the ID check) isn't a link yet.
 */
function areaTarget(area: PrepArea): ReadinessTaskId | null {
  if (!area.steps[0].available && area.steps[0].status === "todo") return null;
  const open = area.steps.find((s) => s.status !== "done" && s.status !== "skipped" && s.available);
  if (open) return open.task;
  return area.done ? area.steps[0].task : null;
}

function AreaBlock({ area, index, state, expanded }: { area: PrepArea; index: number; state: JourneyState; expanded: boolean }) {
  const copy = AREA[area.id];
  const light = area.id === "pharmacy"; // lower in the hierarchy than clinically needed prep (feedback item 9)
  const badge = (
    <span
      aria-hidden
      className={cx(
        "flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
        area.done ? "bg-green-600 text-white" : "bg-blue-50 text-primary-strong",
      )}
    >
      {area.done ? <Check className="size-4" /> : index + 1}
    </span>
  );
  const title = (
    <h3 className={cx("font-semibold text-gray-900", light ? "text-[15px]" : "text-base")}>
      {copy.title}
      {area.done && <span className="sr-only"> (done)</span>}
    </h3>
  );
  const box = cx(
    "rounded-lg border",
    area.done ? "border-green-200 bg-green-50/40" : "border-gray-200 bg-white",
    light && !area.done && "bg-gray-50/60",
  );

  // Folded: one line per area, so the patient sees four things, not seven (feedback item 3).
  if (!expanded) {
    const target = areaTarget(area);
    const note = area.done ? "Done" : target ? copy.detail : "Starts once you've verified your identity";
    const body = (
      <>
        {badge}
        <span className="min-w-0 flex-1">
          {title}
          <span className={cx("mt-0.5 block text-sm", area.done ? "text-green-800" : "text-gray-700")}>{note}</span>
        </span>
      </>
    );
    return (
      <li className={box}>
        {target ? (
          <Link href={TASK_ROUTE[target]} className="flex min-h-14 items-center gap-3 rounded-lg p-3 hover:bg-gray-50 sm:px-4">
            {body}
            <ChevronRight aria-hidden className="size-5 shrink-0 text-gray-500" />
          </Link>
        ) : (
          <div className="flex min-h-14 items-center gap-3 p-3 sm:px-4">{body}</div>
        )}
      </li>
    );
  }

  return (
    <li className={cx(box, "p-3 sm:p-4")}>
      <div className="flex items-start gap-3">
        {badge}
        <div className="min-w-0 flex-1">
          {title}
          {!area.done && <p className="mt-0.5 text-sm text-gray-700">{copy.detail}</p>}
          <div className="mt-1.5">
            {area.steps.map((s) => (
              <StepRow key={s.task} step={s} state={state} />
            ))}
          </div>
        </div>
      </div>
    </li>
  );
}

/**
 * "Get ready for your visit": four areas instead of seven separate tasks, with the one next step as the main
 * button. Dominant until the patient is ready; then it folds away so joining the visit leads (feedback items 2 to 5).
 */
export function PrepModule({ state, folded = false }: { state: JourneyState; folded?: boolean }) {
  const j = state.journey;
  const prep = prepStatus(j);
  const r = state.derived.readiness;
  // Only the area in hand opens up: the one holding the next step, and any that's under way (a search running).
  const open = (a: PrepArea) => !folded && (a.steps.some((s) => s.task === prep.next) || (a.started && !a.done));
  const list = (
    <ol className="space-y-3" aria-label="Visit prep steps">
      {prep.areas.map((a, i) => (
        <AreaBlock key={a.id} area={a} index={i} state={state} expanded={open(a)} />
      ))}
    </ol>
  );

  if (folded) {
    return (
      <section aria-labelledby="ready-title" className="rounded-lg border border-green-200 bg-white">
        <details className="group">
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
            <span className="flex size-7 items-center justify-center rounded-full bg-green-600 text-white">
              <Check aria-hidden className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <h2 id="ready-title" className="text-base font-semibold text-gray-900">
                Get ready for your visit
              </h2>
              <span className="block text-sm text-gray-700">All {prep.total} done. Review what you shared.</span>
            </span>
            <ChevronDown aria-hidden className="size-5 text-gray-600 transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-gray-100 p-4">{list}</div>
        </details>
      </section>
    );
  }

  return (
    <section aria-labelledby="ready-title" className="rounded-xl border border-blue-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="ready-title" className="text-lg font-semibold text-gray-900">
          Get ready for your visit
        </h2>
        <span className="text-sm font-medium text-gray-700">
          {prep.areasDone} of {prep.total} done
        </span>
      </div>
      <p className="mt-1 text-[15px] text-gray-700">
        We find what we can, so you mostly review and confirm.
        {r.deadline && (r.deadlinePassed ? <> Please finish before your visit.</> : <> Please finish by {formatSlot(r.deadline, j.timeZone)}.</>)}
      </p>
      <div aria-hidden className="mt-3 flex gap-1">
        {prep.areas.map((a) => (
          <span key={a.id} className={cx("h-1.5 flex-1 rounded-full", a.done ? "bg-green-600" : a.started ? "bg-primary/60" : "bg-gray-200")} />
        ))}
      </div>
      {prep.next && (
        <LinkButton href={TASK_ROUTE[prep.next]} full className="mt-4">
          Next: {nextLabel(prep.next, state)}
        </LinkButton>
      )}
      {!prep.next && prep.searching && (
        <p role="status" className="mt-4 flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2.5 text-[15px] text-gray-800">
          <Spinner className="size-4 text-primary" />
          Records search in progress. We&apos;ll let you know when they&apos;re ready.
        </p>
      )}
      <div className="mt-4">{list}</div>
    </section>
  );
}
