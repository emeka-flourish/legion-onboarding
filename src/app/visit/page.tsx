"use client";

import { FlaskConical, PhoneOff, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { useJourney, type JourneyState } from "@/components/journey/JourneyProvider";
import { StageScreen } from "@/components/journey/StageScreen";
import { AsideSection, StepLayout } from "@/components/layout/StepLayout";
import { ProviderHas } from "@/components/ready/ProviderHas";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/Status";
import { SimulatedTag } from "@/components/ui/Tags";
import { formatSlotLong } from "@/rules/time";

export default function VisitPage() {
  return <StageScreen stages={["visit"]}>{(state) => <Visit state={state} />}</StageScreen>;
}

function Visit({ state }: { state: JourneyState }) {
  const { act, busy } = useJourney();
  const [inVideo, setInVideo] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string>();
  const p = state.derived.provider;
  const b = state.journey.booking!;

  useEffect(() => {
    if (!inVideo) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1_000);
    return () => clearInterval(t);
  }, [inVideo]);

  const end = async () => {
    const r = await act({ type: "END_VISIT" });
    if (!r.ok) setError(r.message);
  };
  const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <StepLayout
      title={inVideo ? `In your visit with ${p?.name}` : "Your visit is about to start"}
      subtitle={inVideo ? undefined : `${p?.name}, ${formatSlotLong(b.start, b.timeZone)}`}
      aside={
        <AsideSection title="Simulated in this demo" icon={<FlaskConical aria-hidden className="size-4 text-primary" />}>
          <p>The video visit is a stand-in. In the real product it records joining, the start, and completion from the visit system.</p>
        </AsideSection>
      }
    >
      <div className="space-y-6">
        {inVideo ? (
          <div className="overflow-hidden rounded-xl bg-gray-900 text-white">
            <div className="flex aspect-video flex-col items-center justify-center gap-3">
              <span aria-hidden className="flex size-20 items-center justify-center rounded-full bg-white/10 text-2xl font-semibold">
                {p?.initials}
              </span>
              <p className="text-[15px]">{p?.name}</p>
              <p role="timer" aria-live="off" className="font-mono text-sm tabular-nums text-white/80">
                {clock}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 bg-black/40 px-4 py-3">
              <SimulatedTag label="Simulated video" className="bg-white/90" />
              <Button variant="danger" loading={busy} onClick={() => void end()}>
                <PhoneOff aria-hidden className="size-4" />
                End visit
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
            <p className="text-[15px] text-gray-800">Your provider has reviewed what you shared. When you&apos;re ready, start the video.</p>
            <Button full className="mt-4" onClick={() => setInVideo(true)}>
              <Video aria-hidden className="size-4" />
              Start video
            </Button>
          </div>
        )}
        <ErrorText>{error}</ErrorText>
        <ProviderHas state={state} />
      </div>
    </StepLayout>
  );
}
