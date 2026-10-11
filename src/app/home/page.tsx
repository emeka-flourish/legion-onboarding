"use client";

import { CalendarCheck } from "lucide-react";
import { StageScreen } from "@/components/journey/StageScreen";
import { StepLayout } from "@/components/layout/StepLayout";
import { Notice } from "@/components/ui/Status";
import { formatSlotLong } from "@/rules/time";

// The booked home page. Milestone 5 adds the "Get ready" checklist, texts, and the coverage outcome here.
export default function HomePage() {
  return (
    <StageScreen stages={["home"]}>
      {(state) => {
        const b = state.journey.booking!;
        return (
          <StepLayout title={`You're booked, ${state.journey.person?.firstName ?? "and all set"}`}>
            <Notice tone="success" title="Your visit is booked">
              <p className="flex items-center gap-2">
                <CalendarCheck aria-hidden className="size-4" />
                {state.derived.provider?.name}, {formatSlotLong(b.start, b.timeZone)}
              </p>
            </Notice>
          </StepLayout>
        );
      }}
    </StageScreen>
  );
}
