"use client";

import { HeartHandshake, Lock } from "lucide-react";
import { useState } from "react";
import { useJourney } from "@/components/journey/JourneyProvider";
import { StageScreen } from "@/components/journey/StageScreen";
import { AsideSection, FitProgress, StepLayout } from "@/components/layout/StepLayout";
import { ErrorText } from "@/components/ui/Status";
import { cx } from "@/lib/cx";
import { FIT_QUESTIONS } from "@/rules/eligibility";

export default function FitPage() {
  return <StageScreen stages={["fit"]}>{(state) => <Fit answers={state.journey.fit} />}</StageScreen>;
}

function Fit({ answers }: { answers: Partial<Record<(typeof FIT_QUESTIONS)[number]["id"], boolean>> }) {
  const { act, busy } = useJourney();
  const [override, setOverride] = useState<number | null>(null);
  const [error, setError] = useState<string>();
  const firstOpen = FIT_QUESTIONS.findIndex((q) => answers[q.id] === undefined);
  const index = override ?? (firstOpen === -1 ? FIT_QUESTIONS.length - 1 : firstOpen);
  const q = FIT_QUESTIONS[index];
  const previous = answers[q.id];

  const answer = async (value: boolean) => {
    setError(undefined);
    const r = await act({ type: "ANSWER_FIT", questionId: q.id, answer: value });
    if (!r.ok) setError(r.message);
    else setOverride(null);
  };

  // The answer that lets a patient continue always sits first, whatever its wording (Gate 1: fix the flipping polarity).
  const options = [q.continueWith, !q.continueWith];

  return (
    <StepLayout
      title="Let's make sure we're the right fit"
      progress={<FitProgress n={index + 1} of={FIT_QUESTIONS.length} />}
      onBack={index > 0 ? () => setOverride(index - 1) : undefined}
      aside={
        <>
          <AsideSection title="Why we ask" icon={<HeartHandshake aria-hidden className="size-4 text-primary" />}>
            <p>These questions make sure care by video with Legion is right for you, and point you to better options if it isn&apos;t.</p>
            <p>
              If any of these don&apos;t apply to you, it doesn&apos;t mean you don&apos;t deserve care. It means you deserve the right
              kind of care.
            </p>
          </AsideSection>
          <AsideSection title="Your answers stay private" icon={<Lock aria-hidden className="size-4 text-primary" />}>
            <p>They&apos;re used only to check fit. Our analytics record the outcome, never your answers.</p>
          </AsideSection>
        </>
      }
    >
      <section aria-labelledby="fit-question" className="rounded-lg border-2 border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 id="fit-question" className="text-lg font-semibold text-balance text-gray-900">
          {q.text}
        </h2>
        <p className="mt-2 text-[15px] text-gray-600">{q.detail}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {options.map((value) => (
            <button
              key={String(value)}
              type="button"
              disabled={busy}
              onClick={() => void answer(value)}
              aria-pressed={previous === value}
              className={cx(
                "min-h-12 rounded-md border px-4 text-[15px] font-medium transition-colors disabled:opacity-60",
                previous === value ? "border-primary bg-blue-50 text-gray-900" : "border-gray-300 bg-white text-gray-800 hover:bg-gray-50",
              )}
            >
              {value ? "Yes" : "No"}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <ErrorText>{error}</ErrorText>
        </div>
      </section>
    </StepLayout>
  );
}
