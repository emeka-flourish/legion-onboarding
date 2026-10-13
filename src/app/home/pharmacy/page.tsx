"use client";

import { MapPin, Pill } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useJourney, type JourneyState } from "@/components/journey/JourneyProvider";
import { StageScreen } from "@/components/journey/StageScreen";
import { AsideSection } from "@/components/layout/StepLayout";
import { TaskPage } from "@/components/ready/TaskPage";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/Status";
import { SimulatedTag, SourceTag } from "@/components/ui/Tags";
import { PHARMACIES } from "@/data/pharmacies";
import { cx } from "@/lib/cx";

export default function PharmacyPage() {
  return <StageScreen stages={["home"]}>{(state) => <Pharmacy state={state} />}</StageScreen>;
}

function Pharmacy({ state }: { state: JourneyState }) {
  const { act, busy } = useJourney();
  const router = useRouter();
  const r = state.journey.readiness;
  const fromHistory = r.foundMedications?.find((m) => m.pharmacyId);
  const city = r.identity?.city;
  const [chosen, setChosen] = useState<string | undefined>(r.pharmacyId ?? fromHistory?.pharmacyId);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState<string>();
  const nearby = PHARMACIES.filter((p) => !city || p.city === city || p.id === chosen);
  const list = showAll ? PHARMACIES : nearby;

  const save = async () => {
    if (!chosen) return;
    const res = await act({ type: "SET_PHARMACY", pharmacyId: chosen }, { navigate: false });
    if (!res.ok) setError(res.message);
    else router.push("/home");
  };

  return (
    <TaskPage
      title="Choose your pharmacy"
      subtitle="Where your provider sends any prescription."
      aside={
        <>
          <AsideSection title="Why we ask now" icon={<Pill aria-hidden className="size-4 text-primary" />}>
            <p>If your provider prescribes something, it goes straight to this pharmacy after your visit.</p>
          </AsideSection>
          <AsideSection title="Simulated in this demo" icon={<MapPin aria-hidden className="size-4 text-primary" />}>
            <p>The pharmacies are invented.</p>
          </AsideSection>
        </>
      }
    >
      <div className="space-y-4">
        <div role="radiogroup" aria-label="Pharmacies" className="space-y-2">
          {list.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={chosen === p.id}
              onClick={() => setChosen(p.id)}
              className={cx(
                "w-full rounded-lg border-2 bg-white px-4 py-3 text-left transition-colors",
                chosen === p.id ? "border-primary bg-blue-50" : "border-gray-200 hover:border-gray-300",
              )}
            >
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-gray-900">{p.name}</span>
                <SimulatedTag />
              </span>
              <span className="block text-sm text-gray-700">{p.address}</span>
              {fromHistory?.pharmacyId === p.id && (
                <span className="mt-1 block text-sm text-gray-700">
                  Prefilled from your pharmacy history <SourceTag source={fromHistory.source} className="flex" />
                </span>
              )}
            </button>
          ))}
        </div>
        {!showAll && list.length < PHARMACIES.length && (
          <Button variant="quiet" onClick={() => setShowAll(true)}>
            Show pharmacies in other cities
          </Button>
        )}
        <Button full disabled={!chosen} loading={busy} onClick={() => void save()}>
          Use this pharmacy
        </Button>
        <ErrorText>{error}</ErrorText>
      </div>
    </TaskPage>
  );
}
