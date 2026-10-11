"use client";

import { PhoneCall } from "lucide-react";
import { StageScreen } from "@/components/journey/StageScreen";
import { AsideSection, StepLayout } from "@/components/layout/StepLayout";
import { SafetyPanel } from "@/components/safety/SafetyPanel";

// Crisis at the fit check (exception 1): resources only, and no way to continue to booking (TAC-01).
export default function CrisisPage() {
  return (
    <StageScreen stages={["crisis"]}>
      {() => (
        <StepLayout
          title="Let's get you support right now"
          aside={
            <AsideSection title="What happens when you call or text 988" icon={<PhoneCall aria-hidden className="size-4 text-primary" />}>
              <p>A trained crisis counselor answers, listens, and helps you find support that fits. It&apos;s free and confidential.</p>
            </AsideSection>
          }
        >
          <SafetyPanel />
          <p className="mt-5 text-[15px] text-gray-700">
            Video visits with Legion aren&apos;t the right level of support during a crisis. These services can help right now, any
            time of day.
          </p>
        </StepLayout>
      )}
    </StageScreen>
  );
}
