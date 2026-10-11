"use client";

import { Camera, FlaskConical, IdCard, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useJourney, type JourneyState } from "@/components/journey/JourneyProvider";
import { StageScreen } from "@/components/journey/StageScreen";
import { AsideSection } from "@/components/layout/StepLayout";
import { TaskPage } from "@/components/ready/TaskPage";
import { Button } from "@/components/ui/Button";
import { ErrorText, Notice, StatusLine } from "@/components/ui/Status";
import { SimulatedTag, SourceTag } from "@/components/ui/Tags";

export default function IdPage() {
  return <StageScreen stages={["home"]}>{(state) => <IdCheck state={state} />}</StageScreen>;
}

const usDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
};

function IdCheck({ state }: { state: JourneyState }) {
  const { act } = useJourney();
  const router = useRouter();
  const id = state.journey.readiness.identity;
  const [phase, setPhase] = useState<"intro" | "scanning">("intro");
  const [error, setError] = useState<string>();

  const scan = async () => {
    setError(undefined);
    setPhase("scanning");
    await new Promise((r) => setTimeout(r, 1_200)); // the simulated capture and check
    const r = await act({ type: "ID_VERIFY" }, { navigate: false });
    if (!r.ok) {
      setError(r.message);
      setPhase("intro");
    }
  };

  return (
    <TaskPage
      title="Verify your ID"
      subtitle="Verify once, and we'll fill in the details your records search needs."
      aside={
        <>
          <AsideSection title="Why we ask" icon={<ShieldCheck aria-hidden className="size-4 text-primary" />}>
            <p>
              Your ID gives us your legal name, date of birth, and address, which record networks need to find you. It also confirms
              your age, and pharmacies need it for some prescriptions.
            </p>
            <p>The ID check blocks nothing except the records search. Your visit stays booked either way.</p>
          </AsideSection>
          <AsideSection title="Simulated in this demo" icon={<FlaskConical aria-hidden className="size-4 text-primary" />}>
            <p>No camera is used and no image is stored. The check returns invented details.</p>
          </AsideSection>
        </>
      }
    >
      {id ? (
        <div className="space-y-5">
          <Notice tone="success" title="Your ID is verified">
            <p>Please check these details. They come from your ID.</p>
          </Notice>
          <dl className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
            {[
              ["Legal name", id.legalName],
              ["Date of birth", usDate(id.dob)],
              ["Sex at birth", id.sexAtBirth],
              ["Address", `${id.addressLine}, ${id.city}, TX ${id.zip}`],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:gap-4">
                <dt className="w-32 shrink-0 text-sm text-gray-600">{k}</dt>
                <dd className="text-[15px] text-gray-900">{v}</dd>
              </div>
            ))}
          </dl>
          <SourceTag source={id.source} />
          {id.reviewFlag && (
            <Notice title="A person will double-check one detail">
              <p>Your date of birth doesn&apos;t match what we had, so someone on our team will check it. Nothing changes for your visit.</p>
            </Notice>
          )}
          <Button full onClick={() => router.push("/home")}>
            Looks right
          </Button>
        </div>
      ) : phase === "scanning" ? (
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-5">
          <div aria-hidden className="mx-auto flex aspect-[1.6] w-full max-w-xs items-center justify-center rounded-xl border-2 border-dashed border-primary/50 bg-blue-50">
            <IdCard className="size-16 text-primary" />
          </div>
          <StatusLine>Checking your ID</StatusLine>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[15px] font-semibold text-gray-900">Take a photo of your driver&apos;s license or state ID</p>
              <SimulatedTag />
            </div>
            <p className="mt-1 text-[15px] text-gray-700">We read your name, date of birth, sex at birth, and address, and you check them.</p>
            <Button full className="mt-4" onClick={() => void scan()}>
              <Camera aria-hidden className="size-4" />
              Start ID check
            </Button>
          </div>
          <ErrorText>{error}</ErrorText>
        </div>
      )}
    </TaskPage>
  );
}
