"use client";

import { ClipboardList, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useJourney, type JourneyState } from "@/components/journey/JourneyProvider";
import { StageScreen } from "@/components/journey/StageScreen";
import { AsideSection } from "@/components/layout/StepLayout";
import { TaskPage } from "@/components/ready/TaskPage";
import { SafetyPanel } from "@/components/safety/SafetyPanel";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/Status";
import { DIFFICULTY_OPTIONS, DIFFICULTY_QUESTION, FREQUENCY_OPTIONS, GAD7, PHQ9 } from "@/data/questionnaires";
import { cx } from "@/lib/cx";

export default function CheckInPage() {
  return <StageScreen stages={["home"]}>{(state) => <CheckIn state={state} />}</StageScreen>;
}

interface Item {
  instrument: "gad7" | "phq9";
  index: number;
  title: string;
  stem?: string;
  text: string;
  options: readonly string[];
}

// GAD-7 then PHQ-9, word for word, each followed by its difficulty question (principle 8).
const ITEMS: Item[] = [
  ...GAD7.items.map((text, index) => ({ instrument: "gad7" as const, index, title: GAD7.title, stem: GAD7.stem, text, options: FREQUENCY_OPTIONS })),
  { instrument: "gad7", index: 7, title: GAD7.title, text: DIFFICULTY_QUESTION, options: DIFFICULTY_OPTIONS },
  ...PHQ9.items.map((text, index) => ({ instrument: "phq9" as const, index, title: PHQ9.title, stem: PHQ9.stem, text, options: FREQUENCY_OPTIONS })),
  { instrument: "phq9", index: 9, title: PHQ9.title, text: DIFFICULTY_QUESTION, options: DIFFICULTY_OPTIONS },
];

function CheckIn({ state }: { state: JourneyState }) {
  const { act, busy } = useJourney();
  const router = useRouter();
  const r = state.journey.readiness;
  const answerOf = (it: Item) => (it.instrument === "gad7" ? r.gad7 : r.phq9)[it.index];
  const firstOpen = ITEMS.findIndex((it) => answerOf(it) === null);
  const [override, setOverride] = useState<number | null>(null);
  const [safety, setSafety] = useState(false);
  const [error, setError] = useState<string>();
  const done = r.tasks.check_in === "done" && override === null;
  const i = override ?? (firstOpen === -1 ? ITEMS.length - 1 : firstOpen);
  const item = ITEMS[i];

  const answer = async (value: number) => {
    setError(undefined);
    const res = await act({ type: "CHECKIN_ANSWER", instrument: item.instrument, index: item.index, value }, { navigate: false });
    if (!res.ok) return setError(res.message);
    // A fixed rule, not a model: any answer above "Not at all" to PHQ-9 item 9 shows help right away (L3).
    if (item.instrument === "phq9" && item.index === 8 && value > 0) setSafety(true);
    setOverride(override !== null && override < ITEMS.length - 1 ? override + 1 : null);
  };

  return (
    <TaskPage
      title={done ? "Thank you" : "Check-in questions"}
      subtitle={done ? "Your answers go to your provider." : "Two standard questionnaires your provider uses: the GAD-7 and the PHQ-9."}
      help
      aside={
        <>
          <AsideSection title="Why we ask" icon={<ClipboardList aria-hidden className="size-4 text-primary" />}>
            <p>These are the same questions used in clinics everywhere, word for word, so your provider can track how you&apos;re doing over time.</p>
          </AsideSection>
          <AsideSection title="Your answers stay private" icon={<Lock aria-hidden className="size-4 text-primary" />}>
            <p>Scores go to your provider only. Our analytics record that you finished, never your answers.</p>
          </AsideSection>
        </>
      }
    >
      {safety ? (
        <SafetyPanel>
          <p>Thank you for telling us. Your visit is still booked, and someone from our care team will check in with you today.</p>
          <Button className="mt-3" variant="outline" onClick={() => setSafety(false)}>
            Continue
          </Button>
        </SafetyPanel>
      ) : done ? (
        <div className="space-y-4">
          <p className="text-[15px] text-gray-800">You&apos;ve answered all the check-in questions.</p>
          <Button full onClick={() => router.push("/home")}>
            Back to your checklist
          </Button>
          <Button full variant="outline" onClick={() => setOverride(0)}>
            Review my answers
          </Button>
        </div>
      ) : (
        <section aria-labelledby="checkin-question" className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">
              {item.title} · question {i + 1} of {ITEMS.length}
            </p>
            <div aria-hidden className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
              <div className="h-full rounded-full bg-primary" style={{ width: `${((i + 1) / ITEMS.length) * 100}%` }} />
            </div>
          </div>
          {item.stem && <p className="text-[15px] text-gray-700">{item.stem}</p>}
          <h2 id="checkin-question" className="text-lg font-semibold text-gray-900">
            {item.text}
          </h2>
          <div className="grid gap-2" role="group" aria-labelledby="checkin-question">
            {item.options.map((label, value) => (
              <button
                key={label}
                type="button"
                disabled={busy}
                aria-pressed={answerOf(item) === value}
                onClick={() => void answer(value)}
                className={cx(
                  "min-h-12 rounded-md border px-4 text-left text-[15px] font-medium transition-colors disabled:opacity-60",
                  answerOf(item) === value ? "border-primary bg-blue-50 text-gray-900" : "border-gray-300 bg-white text-gray-800 hover:bg-gray-50",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {i > 0 && (
            <Button variant="quiet" onClick={() => setOverride(i - 1)}>
              Previous question
            </Button>
          )}
          <ErrorText>{error}</ErrorText>
        </section>
      )}
    </TaskPage>
  );
}
