"use client";

import { Stethoscope } from "lucide-react";
import { useState } from "react";
import { useJourney } from "@/components/journey/JourneyProvider";
import { StageScreen } from "@/components/journey/StageScreen";
import { AsideSection, StepLayout, StepProgress } from "@/components/layout/StepLayout";
import { ChoiceButton } from "@/components/ui/Choice";
import { ErrorText } from "@/components/ui/Status";
import { BOOK_FAST_STEP_COUNT } from "@/domain/stages";
import type { CareType } from "@/domain/types";
import { careTypeOptions } from "@/rules/expectations";

export default function HelpPage() {
  const { act, busy } = useJourney();
  const [error, setError] = useState<string>();
  const choose = async (careType: CareType) => {
    setError(undefined);
    const r = await act({ type: "SET_CARE_TYPE", careType });
    if (!r.ok) setError(r.message);
  };
  return (
    <StageScreen stages={["help"]}>
      {(state) => (
        <StepLayout
          title="What kind of help are you looking for?"
          progress={<StepProgress n={2} of={BOOK_FAST_STEP_COUNT} />}
          onBack={() => void act({ type: "GO_BACK" })}
          aside={
            <AsideSection title="Why we ask" icon={<Stethoscope aria-hidden className="size-4 text-primary" />}>
              <p>
                Some providers do new evaluations and some focus on ongoing medication. Your answer narrows the list to providers who
                offer what you need.
              </p>
            </AsideSection>
          }
        >
          <div className="space-y-3">
            {careTypeOptions(state.journey.conditions).map((o) => (
              <ChoiceButton
                key={o.value}
                title={o.title}
                detail={o.detail}
                selected={state.journey.careType === o.value}
                disabled={busy}
                onClick={() => void choose(o.value)}
              />
            ))}
          </div>
          <div className="mt-3">
            <ErrorText>{error}</ErrorText>
          </div>
        </StepLayout>
      )}
    </StageScreen>
  );
}
