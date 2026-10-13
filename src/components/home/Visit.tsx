"use client";

import { CalendarCheck, ChevronDown, MessageSquare, Video } from "lucide-react";
import { useState } from "react";
import { useJourney, type JourneyState } from "@/components/journey/JourneyProvider";
import { ProviderPortrait } from "@/components/providers/ProviderPortrait";
import { Button } from "@/components/ui/Button";
import { ErrorText, Notice } from "@/components/ui/Status";
import { SimulatedTag, SourceTag } from "@/components/ui/Tags";
import { PLAN_LABEL } from "@/data/plans";
import { cx } from "@/lib/cx";
import { formatSlot, formatSlotLong } from "@/rules/time";

/**
 * The booked visit. Before the patient is ready it sits below the prep and joining is a quiet action; once
 * they're ready it leads the page and "Join visit" is the main button (walkthrough feedback, item 2).
 */
export function VisitCard({ state, prominent }: { state: JourneyState; prominent: boolean }) {
  const { act, busy } = useJourney();
  const b = state.journey.booking!;
  const p = state.derived.provider;
  return (
    <section
      aria-labelledby="visit-title"
      className={cx("rounded-lg border bg-white shadow-sm", prominent ? "border-blue-200 p-5 sm:p-6" : "border-gray-200 p-4 sm:p-5")}
    >
      <h2 id="visit-title" className={cx("font-semibold text-gray-900", prominent ? "text-lg" : "text-base")}>
        Your visit
      </h2>
      <div className="mt-3 flex items-center gap-3">
        {p && <ProviderPortrait portrait={p.portrait} size={48} />}
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
      <p className="mt-3 text-sm text-gray-700">First visit by secure video, about 60 minutes. {state.derived.costLine}.</p>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button variant={prominent ? "primary" : "outline"} full={prominent} loading={busy} onClick={() => void act({ type: "JOIN_VISIT" })}>
          <Video aria-hidden className="size-4" />
          Join visit
        </Button>
        <span className="text-sm text-gray-600">Opens 10 minutes before. In this demo you can join any time.</span>
      </div>
    </section>
  );
}

const PULSE = ["not at all sure", "a little sure", "somewhat sure", "quite sure", "very sure"];

/** One optional question after booking (goal 2): how sure the patient feels about their provider. */
export function TrustPulse({ state }: { state: JourneyState }) {
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
    <section aria-labelledby="pulse-title" className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 id="pulse-title" className="text-[15px] font-medium text-gray-900">
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
export function CoverageFollowThrough({ state }: { state: JourneyState }) {
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

/** The simulated texts: the confirmation, a day-before reminder listing what's left, and the join link. */
export function Texts({ state }: { state: JourneyState }) {
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
      body: `Legion: Your visit is tomorrow at ${formatSlot(b.start, j.timeZone)}. ${remaining ? "A few prep steps are still open." : "You're all set."}`,
    },
    { when: `Scheduled for ${formatSlot(joinAt, j.timeZone)}`, body: "Legion: Your visit starts in 10 minutes. Tap your link to join by video." },
  ];
  return (
    <section aria-labelledby="texts-title" className="rounded-lg border border-gray-200 bg-white">
      <details className="group">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 [&::-webkit-details-marker]:hidden">
          <MessageSquare aria-hidden className="size-4 text-gray-600" />
          <h2 id="texts-title" className="text-[15px] font-medium text-gray-900">
            Texts from Legion
          </h2>
          <SimulatedTag />
          <ChevronDown aria-hidden className="ml-auto size-4 text-gray-600 transition-transform group-open:rotate-180" />
        </summary>
        <ul className="space-y-3 border-t border-gray-100 px-4 py-3">
          {texts.map((t) => (
            <li key={t.when}>
              <p className="text-xs text-gray-600">{t.when}</p>
              <p className="mt-0.5 rounded-2xl rounded-tl-sm bg-gray-100 px-3 py-2 text-[15px] text-gray-900">{t.body}</p>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
