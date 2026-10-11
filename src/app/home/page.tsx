"use client";

import {
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileSearch,
  FlaskConical,
  HeartPulse,
  IdCard,
  MessageSquare,
  MessageSquareText,
  Pill,
  Stethoscope,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useJourney, type JourneyState } from "@/components/journey/JourneyProvider";
import { StageScreen } from "@/components/journey/StageScreen";
import { AsideSection, StepLayout } from "@/components/layout/StepLayout";
import { Button } from "@/components/ui/Button";
import { ErrorText, Notice } from "@/components/ui/Status";
import { SimulatedTag, SourceTag } from "@/components/ui/Tags";
import { PLAN_LABEL } from "@/data/plans";
import type { ReadinessTaskId, TaskStatus } from "@/domain/types";
import { cx } from "@/lib/cx";
import { formatSlot, formatSlotLong } from "@/rules/time";

export default function HomePage() {
  return <StageScreen stages={["home"]}>{(state) => <Home state={state} />}</StageScreen>;
}

function Home({ state }: { state: JourneyState }) {
  const j = state.journey;
  const r = state.derived.readiness;
  return (
    <StepLayout
      title={`You're booked, ${j.person?.firstName ?? "and all set"}`}
      subtitle="Here's your visit, and a short checklist to get ready for it."
      aside={
        <>
          <AsideSection title="Why we ask before the visit" icon={<Stethoscope aria-hidden className="size-4 text-primary" />}>
            <p>
              Your provider reads all of this before you meet, so your visit starts with what matters to you, not with forms.
            </p>
            <p>The visit stays booked no matter what. If something isn&apos;t done, your provider covers it with you.</p>
          </AsideSection>
          <AsideSection title="Simulated in this demo" icon={<FlaskConical aria-hidden className="size-4 text-primary" />}>
            <p>The ID check, records search, pharmacy history, texts, and the visit itself.</p>
          </AsideSection>
        </>
      }
    >
      <div className="space-y-6">
        <VisitCard state={state} />
        <TrustPulse state={state} />
        <CoverageFollowThrough state={state} />
        {r.requiredDone ? (
          <Notice tone="success" title="You're ready for your visit">
            <p>Your provider has everything they need. See you soon.</p>
          </Notice>
        ) : null}
        <Checklist state={state} />
        <Texts state={state} />
      </div>
    </StepLayout>
  );
}

function VisitCard({ state }: { state: JourneyState }) {
  const { act, busy } = useJourney();
  const b = state.journey.booking!;
  const p = state.derived.provider;
  return (
    <section aria-labelledby="visit-title" className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 id="visit-title" className="sr-only">
        Your visit
      </h2>
      <div className="flex items-center gap-3">
        <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-50 font-semibold text-primary-strong">
          {p?.initials}
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900">
            {p?.name}, {p?.credential}
          </p>
          <p className="flex items-start gap-1.5 text-[15px] text-gray-800">
            <CalendarCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>{formatSlotLong(b.start, b.timeZone)}</span>
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm text-gray-700">{state.derived.costLine}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button loading={busy} onClick={() => void act({ type: "JOIN_VISIT" })}>
          <Video aria-hidden className="size-4" />
          Join visit
        </Button>
        <span className="text-sm text-gray-600">Opens 10 minutes before. In this demo you can join any time.</span>
      </div>
    </section>
  );
}

const PULSE = ["not at all sure", "a little sure", "somewhat sure", "quite sure", "very sure"];

/** One optional question right after booking (goal 2): how sure the patient feels about their provider. */
function TrustPulse({ state }: { state: JourneyState }) {
  const { act } = useJourney();
  const [sent, setSent] = useState(false);
  if (state.journey.trustPulse !== undefined) {
    return sent ? (
      <p role="status" className="text-sm text-gray-700">
        Thanks. This helps us get matching right.
      </p>
    ) : null;
  }
  return (
    <section aria-labelledby="pulse-title" className="rounded-lg border border-blue-100 bg-blue-50 p-4">
      <h2 id="pulse-title" className="text-[15px] font-semibold text-gray-900">
        One quick question (optional): how sure are you that {state.derived.provider?.name ?? "this provider"} is right for you?
      </h2>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {PULSE.map((label, i) => (
          <button
            key={label}
            type="button"
            aria-label={`${i + 1}, ${label}`}
            onClick={() => {
              setSent(true);
              void act({ type: "TRUST_PULSE", score: i + 1 }, { navigate: false });
            }}
            className="min-h-11 rounded-md border border-gray-300 bg-white text-[15px] font-semibold text-gray-800 hover:bg-gray-50"
          >
            {i + 1}
          </button>
        ))}
      </div>
      <div aria-hidden className="mt-1.5 flex justify-between text-xs text-gray-700">
        <span>Not at all sure</span>
        <span>Very sure</span>
      </div>
    </section>
  );
}

/** Coverage confirmed after booking (decision L14, item 2): the result, and a plain choice if it fell through. */
function CoverageFollowThrough({ state }: { state: JourneyState }) {
  const { act, busy } = useJourney();
  const [error, setError] = useState<string>();
  const c = state.journey.coverage;
  if (!c || c.mode !== "insured" || !c.confirmLater) return null;
  const plan = PLAN_LABEL[c.plan];
  if (c.status === "pending") {
    return (
      <Notice title={`We're still confirming your coverage with ${plan}`}>
        <p>We&apos;ll let you know before your visit. If it falls through, you can switch to self-pay or cancel for free.</p>
      </Notice>
    );
  }
  if (c.status === "active") {
    return (
      <Notice tone="success" title="Your coverage is confirmed">
        <p>In network with {plan} · verified. {state.derived.costLine}.</p>
        <SourceTag source={c.source} />
      </Notice>
    );
  }
  return (
    <Notice tone="warning" title={`Your ${plan} plan isn't active`}>
      <p>
        You can keep your visit with self-pay ($250 for the first visit, $150 for follow-ups), or cancel for free from your
        confirmation text.
      </p>
      <Button loading={busy} onClick={() => void act({ type: "COVERAGE_USE_SELF_PAY" }, { navigate: false }).then((r) => !r.ok && setError(r.message))}>
        Keep my visit with self-pay
      </Button>
      <SourceTag source={c.source} />
      <ErrorText>{error}</ErrorText>
    </Notice>
  );
}

interface Row {
  task: ReadinessTaskId;
  title: string;
  detail: string;
  href: string;
  icon: ReactNode;
  required: boolean;
  blockedBy?: { task: ReadinessTaskId; note: string };
}

const ROWS: Row[] = [
  { task: "identity", title: "Verify your ID", detail: "About a minute. It lets us find your records and confirm your details.", href: "/home/id", icon: <IdCard aria-hidden className="size-5" />, required: true },
  {
    task: "records",
    title: "Let us look for your records",
    detail: "With your permission, so you confirm instead of typing.",
    href: "/home/records",
    icon: <FileSearch aria-hidden className="size-5" />,
    required: false,
    blockedBy: { task: "identity", note: "Opens after your ID check" },
  },
  { task: "story", title: "Tell us what's going on", detail: "Four short questions, in your own words.", href: "/home/story", icon: <MessageSquareText aria-hidden className="size-5" />, required: true },
  { task: "check_in", title: "Answer the check-in questions", detail: "Two standard questionnaires your provider uses.", href: "/home/check-in", icon: <ClipboardList aria-hidden className="size-5" />, required: true },
  {
    task: "confirm_found",
    title: "Confirm your medications",
    detail: "Check what we found, and add anything it missed.",
    href: "/home/records",
    icon: <Pill aria-hidden className="size-5" />,
    required: true,
    blockedBy: { task: "records", note: "Opens after the records step" },
  },
  { task: "pharmacy", title: "Choose your pharmacy", detail: "Where your provider sends any prescription.", href: "/home/pharmacy", icon: <Pill aria-hidden className="size-5" />, required: true },
  {
    task: "essentials",
    title: "A few health basics",
    detail: "Hospital stays, current medications, allergies, substance use, and an emergency contact.",
    href: "/home/essentials",
    icon: <HeartPulse aria-hidden className="size-5" />,
    required: true,
  },
];

const STATUS_LABEL: Record<TaskStatus, string> = { todo: "To do", in_progress: "In progress", done: "Done", skipped: "Skipped" };
const STATUS_STYLE: Record<TaskStatus, string> = {
  todo: "bg-gray-100 text-gray-700",
  in_progress: "bg-amber-100 text-amber-900",
  done: "bg-green-100 text-green-800",
  skipped: "bg-gray-100 text-gray-700",
};

function Checklist({ state }: { state: JourneyState }) {
  const j = state.journey;
  const r = state.derived.readiness;
  const tasks = j.readiness.tasks;
  const isOpen = (row: Row) => {
    if (!row.blockedBy) return true;
    const s = tasks[row.blockedBy.task];
    return row.blockedBy.task === "records" ? s === "done" || s === "skipped" : s === "done";
  };
  return (
    <section aria-labelledby="ready-title">
      <h2 id="ready-title" className="text-lg font-semibold text-gray-900">
        Get ready for your visit
      </h2>
      <p className="mt-1 text-[15px] text-gray-700">
        {r.doneCount} of {r.total} required items done
        {r.deadline && !r.requiredDone ? ` · Please finish by ${formatSlot(r.deadline, j.timeZone)}` : ""}
      </p>
      <div aria-hidden className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
        <div className="h-full rounded-full bg-green-600" style={{ width: `${(r.doneCount / r.total) * 100}%` }} />
      </div>
      <ul className="mt-4 divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
        {ROWS.map((row) => {
          const status = tasks[row.task];
          const open = isOpen(row);
          const content = (
            <>
              <span className={cx("flex size-10 shrink-0 items-center justify-center rounded-full", status === "done" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700")}>
                {status === "done" ? <CheckCircle2 aria-hidden className="size-5" /> : row.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-[15px] font-semibold text-gray-900">{row.title}</span>
                  <span className={cx("rounded-full px-2 py-0.5 text-xs font-medium", row.required ? "bg-blue-50 text-primary-strong" : "bg-gray-100 text-gray-700")}>
                    {row.required ? "Required" : "Optional"}
                  </span>
                  <span className={cx("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLE[status])}>{STATUS_LABEL[status]}</span>
                </span>
                <span className="mt-0.5 block text-sm text-gray-700">{open ? row.detail : row.blockedBy!.note}</span>
              </span>
              {open && <ChevronRight aria-hidden className="size-5 shrink-0 text-gray-500" />}
            </>
          );
          return (
            <li key={row.task}>
              {open ? (
                <Link href={row.href} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-gray-50">
                  {content}
                </Link>
              ) : (
                <div className="flex min-h-16 items-center gap-3 bg-gray-50 px-4 py-3">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The simulated texts: the confirmation, a day-before reminder listing what's left, and the join link. */
function Texts({ state }: { state: JourneyState }) {
  const j = state.journey;
  const b = j.booking!;
  const name = state.derived.provider?.name ?? "your provider";
  const remaining = state.derived.readiness.remaining.length;
  const reminderAt = new Date(new Date(b.start).getTime() - 24 * 3_600_000).toISOString();
  const joinAt = new Date(new Date(b.start).getTime() - 10 * 60_000).toISOString();
  const texts = [
    { when: `Sent ${formatSlot(b.confirmedAt, j.timeZone)}`, body: `Legion: You're booked with ${name} on ${formatSlot(b.start, j.timeZone)}. We'll remind you the day before.` },
    {
      when: `Scheduled for ${formatSlot(reminderAt, j.timeZone)}`,
      body: `Legion: Your visit is tomorrow at ${formatSlot(b.start, j.timeZone)}. ${remaining ? `${remaining} item${remaining === 1 ? "" : "s"} left on your checklist.` : "You're all set."}`,
    },
    { when: `Scheduled for ${formatSlot(joinAt, j.timeZone)}`, body: "Legion: Your visit starts in 10 minutes. Tap your link to join by video." },
  ];
  return (
    <section aria-labelledby="texts-title">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="texts-title" className="text-lg font-semibold text-gray-900">
          Texts from Legion
        </h2>
        <SimulatedTag />
      </div>
      <ul className="mt-3 space-y-3">
        {texts.map((t) => (
          <li key={t.when} className="flex gap-3">
            <MessageSquare aria-hidden className="mt-1 size-4 shrink-0 text-gray-500" />
            <div>
              <p className="text-xs text-gray-600">{t.when}</p>
              <p className="mt-0.5 rounded-2xl rounded-tl-sm bg-gray-100 px-3 py-2 text-[15px] text-gray-900">{t.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
