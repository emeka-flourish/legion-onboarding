"use client";

import { ExternalLink, LifeBuoy } from "lucide-react";
import { useJourney } from "@/components/journey/JourneyProvider";
import { StageScreen } from "@/components/journey/StageScreen";
import { AsideSection, StepLayout } from "@/components/layout/StepLayout";
import { Button } from "@/components/ui/Button";
import type { EligibilityReason } from "@/domain/types";

const FIND_TREATMENT = { href: "https://findtreatment.gov", label: "FindTreatment.gov" };

// A non-safety screen-out (exception 7): resources matched to the reason, and a way to fix a mis-tap.
const CONTENT: Record<EligibilityReason, { title: string; body: string; resources: string[] }> = {
  not_texas: {
    title: "Our providers can only see patients in Texas right now",
    body: "Our clinicians are licensed in Texas, so we can't care for you where you are. Here are good places to start instead.",
    resources: [
      "FindTreatment.gov, a free federal directory, lists mental health services in every state.",
      "The member services number on your insurance card can point you to psychiatrists in your plan.",
    ],
  },
  medicaid_medicare: {
    title: "We can't see patients who have Medicaid or Medicare",
    body: "That's true even with self-pay. Here are good places to start instead.",
    resources: [
      "The member services number on your Medicaid or Medicare card can point you to psychiatrists in your plan.",
      "FindTreatment.gov lists services that accept Medicaid and Medicare.",
    ],
  },
  recent_hospitalization: {
    title: "You may need more support than video visits can give right now",
    body: "After a recent hospital stay, a more intensive level of care is often the right next step.",
    resources: [
      "The team that cared for you can recommend step-down care, such as an intensive outpatient program.",
      "FindTreatment.gov lists programs near you.",
    ],
  },
  under_18: {
    title: "Our care is for adults 18 and older",
    body: "We're not able to see patients under 18. You still deserve good care.",
    resources: [
      "A parent, guardian, school counselor, or pediatrician can help you find care for young people.",
      "Teens can call or text 988 any time, day or night.",
    ],
  },
  not_virtual: {
    title: "Legion only offers care by secure video",
    body: "If you'd rather be seen in person, here's where to look.",
    resources: ["FindTreatment.gov lists in-person mental health services near you."],
  },
};

export default function NotAFitPage() {
  const { act, busy } = useJourney();
  return (
    <StageScreen stages={["not_a_fit"]}>
      {(state) => {
        const c = CONTENT[state.journey.eligibility?.reasonCode ?? "not_texas"];
        return (
          <StepLayout
            title={c.title}
            subtitle={c.body}
            aside={
              <AsideSection title="If you ever feel unsafe" icon={<LifeBuoy aria-hidden className="size-4 text-primary" />}>
                <p>
                  Call or text{" "}
                  <a href="tel:988" className="font-semibold text-red-800 underline">
                    988
                  </a>{" "}
                  any time, or call{" "}
                  <a href="tel:911" className="font-semibold text-red-800 underline">
                    911
                  </a>{" "}
                  in an emergency.
                </p>
              </AsideSection>
            }
          >
            <ul className="space-y-3">
              {c.resources.map((r) => (
                <li key={r} className="rounded-lg border border-gray-200 bg-white p-4 text-[15px] text-gray-800">
                  {r}
                </li>
              ))}
            </ul>
            <a
              href={FIND_TREATMENT.href}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex min-h-11 items-center gap-1.5 font-medium text-primary underline underline-offset-4"
            >
              Open {FIND_TREATMENT.label}
              <ExternalLink aria-hidden className="size-4" />
            </a>
            <div className="mt-8 border-t border-gray-200 pt-6">
              <p className="text-[15px] text-gray-700">Tapped the wrong answer?</p>
              <Button variant="outline" className="mt-2" disabled={busy} onClick={() => void act({ type: "GO_BACK" })}>
                Change my answer
              </Button>
            </div>
          </StepLayout>
        );
      }}
    </StageScreen>
  );
}
