"use client";

import { Wallet } from "lucide-react";
import { useState } from "react";
import { useJourney } from "@/components/journey/JourneyProvider";
import { StageScreen } from "@/components/journey/StageScreen";
import { AsideSection, StepLayout, StepProgress } from "@/components/layout/StepLayout";
import { Button } from "@/components/ui/Button";
import { ErrorText, Notice } from "@/components/ui/Status";
import { PLAN_LABEL, PLAN_ORDER } from "@/data/plans";
import { BOOK_FAST_STEP_COUNT } from "@/domain/stages";
import type { PlanCode } from "@/domain/types";
import { cx } from "@/lib/cx";
import { typicalCostText } from "@/rules/cost";

export default function PayPage() {
  return <StageScreen stages={["pay"]}>{(state) => <Pay initial={state.journey.plan} />}</StageScreen>;
}

function Pay({ initial }: { initial?: PlanCode }) {
  const { act, busy } = useJourney();
  const [plan, setPlan] = useState<PlanCode | undefined>(initial);
  const [error, setError] = useState<string>();
  const submit = async () => {
    if (!plan) return;
    setError(undefined);
    const r = await act({ type: "SET_PLAN", plan });
    if (!r.ok) setError(r.message);
  };
  return (
    <StepLayout
      title="How will you pay for your visits?"
      subtitle="Choose your insurance plan, or no insurance. You'll see your typical cost right away."
      progress={<StepProgress n={3} of={BOOK_FAST_STEP_COUNT} />}
      onBack={() => void act({ type: "GO_BACK" })}
      aside={
        <AsideSection title="Cost before commitment" icon={<Wallet aria-hidden className="size-4 text-primary" />}>
          <p>You&apos;ll see what you&apos;re likely to pay before you choose a provider, and your exact cost before you add a card.</p>
        </AsideSection>
      }
    >
      <div role="radiogroup" aria-label="How you'll pay" className="grid grid-cols-2 gap-3">
        {PLAN_ORDER.map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={plan === p}
            onClick={() => setPlan(p)}
            className={cx(
              "min-h-14 rounded-lg border-2 bg-white px-3 py-3 text-left text-[15px] font-semibold text-gray-900 transition-colors",
              p === "none" && "col-span-2",
              plan === p ? "border-primary bg-blue-50" : "border-gray-200 hover:border-gray-300",
            )}
          >
            {PLAN_LABEL[p]}
          </button>
        ))}
      </div>
      {plan && (
        <Notice className="mt-5" live title={plan === "none" ? "Self-pay" : PLAN_LABEL[plan]}>
          <p>{typicalCostText(plan)}</p>
        </Notice>
      )}
      <div className="mt-6 space-y-3">
        <Button full disabled={!plan} loading={busy} onClick={() => void submit()}>
          See providers
        </Button>
        <ErrorText>{error}</ErrorText>
      </div>
    </StepLayout>
  );
}
