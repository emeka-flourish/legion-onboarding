"use client";

import { Activity, CheckCircle2, CircleHelp, CloudRain, Ellipsis, Lock, Shield, Waves, Zap } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useJourney } from "@/components/journey/JourneyProvider";
import { StageScreen } from "@/components/journey/StageScreen";
import { AsideSection, StepLayout, StepProgress } from "@/components/layout/StepLayout";
import { Button } from "@/components/ui/Button";
import { ErrorText, Notice } from "@/components/ui/Status";
import { CONDITION_LABEL, CONDITION_ORDER, CONDITION_TILE } from "@/data/conditions";
import { BOOK_FAST_STEP_COUNT } from "@/domain/stages";
import type { ConditionCode } from "@/domain/types";
import { cx } from "@/lib/cx";
import { conditionExpectations } from "@/rules/expectations";

const ICON: Record<ConditionCode, ReactNode> = {
  anxiety: <Waves aria-hidden className="size-5" />,
  depression: <CloudRain aria-hidden className="size-5" />,
  adhd: <Zap aria-hidden className="size-5" />,
  bipolar: <Activity aria-hidden className="size-5" />,
  ptsd: <Shield aria-hidden className="size-5" />,
  other: <Ellipsis aria-hidden className="size-5" />,
  not_sure: <CircleHelp aria-hidden className="size-5" />,
};

export default function NeedsPage() {
  return <StageScreen stages={["needs"]}>{(state) => <Needs initial={state.journey.conditions} />}</StageScreen>;
}

function Needs({ initial }: { initial: ConditionCode[] }) {
  const { act, busy } = useJourney();
  const [chosen, setChosen] = useState<ConditionCode[]>(initial);
  const [error, setError] = useState<string>();
  const toggle = (c: ConditionCode) => setChosen((now) => (now.includes(c) ? now.filter((x) => x !== c) : [...now, c]));
  const expectations = conditionExpectations(chosen);

  const submit = async () => {
    setError(undefined);
    const r = await act({ type: "SET_CONDITIONS", conditions: chosen });
    if (!r.ok) setError(r.message);
  };

  return (
    <StepLayout
      title="What brings you to Legion?"
      subtitle="Choose all that apply."
      progress={<StepProgress n={1} of={BOOK_FAST_STEP_COUNT} />}
      onBack={() => void act({ type: "GO_BACK" })}
      aside={
        <>
          <AsideSection title="Why we ask" icon={<CheckCircle2 aria-hidden className="size-4 text-primary" />}>
            <p>It helps us show providers who focus on what you&apos;re facing, and set clear expectations about medication before you book.</p>
          </AsideSection>
          <AsideSection title="Your answers stay private" icon={<Lock aria-hidden className="size-4 text-primary" />}>
            <p>Your choices go to your care team. Our analytics only count how many you chose, never which ones.</p>
          </AsideSection>
        </>
      }
    >
      {initial.length === 0 && (
        <p className="-mt-2 mb-5 flex items-center gap-2 text-[15px] text-green-800">
          <CheckCircle2 aria-hidden className="size-5" />
          You&apos;re a fit for our care.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        {CONDITION_ORDER.map((c) => {
          const on = chosen.includes(c);
          return (
            <button
              key={c}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(c)}
              className={cx(
                "flex min-h-14 items-center gap-3 rounded-lg border-2 bg-white px-3 py-3 text-left transition-colors",
                on ? "border-primary bg-blue-50" : "border-gray-200 hover:border-gray-300",
              )}
            >
              <span
                className={cx(
                  "flex size-9 shrink-0 items-center justify-center rounded-full",
                  on ? "bg-primary text-white" : "bg-gray-100 text-gray-700",
                )}
              >
                {ICON[c]}
              </span>
              <span className="text-[15px] font-semibold text-gray-900">{CONDITION_TILE[c]}</span>
            </button>
          );
        })}
      </div>

      {expectations.length > 0 && (
        <div className="mt-5 space-y-3" aria-live="polite">
          {expectations.map((e) => (
            <Notice key={e.condition} title={`About ${CONDITION_LABEL[e.condition]} care`}>
              {e.lines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </Notice>
          ))}
        </div>
      )}

      <div className="mt-6 space-y-3">
        <Button full disabled={!chosen.length} loading={busy} onClick={() => void submit()}>
          Continue
        </Button>
        <ErrorText>{error}</ErrorText>
      </div>
    </StepLayout>
  );
}
