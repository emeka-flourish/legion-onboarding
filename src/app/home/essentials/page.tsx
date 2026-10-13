"use client";

import { HeartPulse, Lock, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, type ReactNode } from "react";
import { useJourney, type JourneyState } from "@/components/journey/JourneyProvider";
import { StageScreen } from "@/components/journey/StageScreen";
import { AsideSection } from "@/components/layout/StepLayout";
import { TaskPage } from "@/components/ready/TaskPage";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { ErrorText } from "@/components/ui/Status";
import { SourceTag } from "@/components/ui/Tags";
import type { Essentials } from "@/domain/types";
import { cx } from "@/lib/cx";
import { mentionsControlled } from "@/rules/controlled";

export default function EssentialsPage() {
  return <StageScreen stages={["home"]}>{(state) => <EssentialHistory state={state} />}</StageScreen>;
}

type Frequency = Essentials["alcohol"];
const FREQUENCIES: [Frequency, string][] = [
  ["never", "Never"],
  ["occasionally", "Now and then"],
  ["weekly", "Weekly"],
  ["daily", "Daily"],
];

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
  note,
}: {
  label: ReactNode;
  value?: T;
  options: [T, string][];
  onChange: (v: T) => void;
  note?: ReactNode;
}) {
  const id = useId();
  return (
    <div className="space-y-2">
      <p id={id} className="text-[15px] font-medium text-gray-900">
        {label}
      </p>
      {note}
      <div role="radiogroup" aria-labelledby={id} className={cx("grid gap-2", options.length > 2 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2")}>
        {options.map(([v, text]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            onClick={() => onChange(v)}
            className={cx(
              "min-h-11 rounded-md border px-3 text-[15px] font-medium transition-colors",
              value === v ? "border-primary bg-blue-50 text-gray-900" : "border-gray-300 bg-white text-gray-800 hover:bg-gray-50",
            )}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

const digits = (s: string) => s.replace(/\D/g, "");

function EssentialHistory({ state }: { state: JourneyState }) {
  const { act, busy } = useJourney();
  const router = useRouter();
  const j = state.journey;
  const r = j.readiness;
  const saved = r.essentials;

  // Prefill from what the searches found and the patient confirmed (principle 3: confirm, don't type).
  const confirmedMeds = (r.foundMedications ?? []).filter((m) => r.confirmedMedicationIds?.includes(m.id));
  const controlledEvidence = [
    ...confirmedMeds.filter((m) => m.controlled).map((m) => m.name),
    ...(r.otherMedications ?? []).filter((t) => mentionsControlled(t)),
  ];
  const foundAllergies = (r.foundRecords ?? []).filter((x) => x.kind === "allergy" && r.confirmedRecordIds?.includes(x.id));

  const [hospitalizedEver, setHospitalizedEver] = useState<Essentials["hospitalizedEver"] | undefined>(saved?.hospitalizedEver);
  const [controlledNow, setControlledNow] = useState<Essentials["controlledNow"] | undefined>(
    saved?.controlledNow ?? (controlledEvidence.length ? "yes" : undefined),
  );
  const [otherAllergies, setOtherAllergies] = useState<string[]>(saved?.otherAllergies ?? []);
  const [allergyDraft, setAllergyDraft] = useState("");
  const [alcohol, setAlcohol] = useState<Frequency | undefined>(saved?.alcohol);
  const [cannabis, setCannabis] = useState<Frequency | undefined>(saved?.cannabis);
  const [otherSubstances, setOtherSubstances] = useState<Essentials["otherSubstances"] | undefined>(saved?.otherSubstances);
  const [contactName, setContactName] = useState(saved?.contactName ?? "");
  const [contactPhone, setContactPhone] = useState(saved?.contactPhone ?? "");
  const [errors, setErrors] = useState<{ form?: string; name?: string; phone?: string }>({});

  const addAllergy = () => {
    const v = allergyDraft.trim().slice(0, 60);
    if (v && !otherAllergies.includes(v)) setOtherAllergies([...otherAllergies, v]);
    setAllergyDraft("");
  };

  const save = async () => {
    const next: typeof errors = {};
    if (!hospitalizedEver || !controlledNow || !alcohol || !cannabis || !otherSubstances) next.form = "Please answer each question above.";
    if (!contactName.trim()) next.name = "Please add a name.";
    if (digits(contactPhone).length !== 10) next.phone = "Please enter a 10-digit phone number.";
    setErrors(next);
    if (next.form || next.name || next.phone) return;
    const res = await act(
      {
        type: "SET_ESSENTIALS",
        hospitalizedEver: hospitalizedEver!,
        controlledNow: controlledNow!,
        otherAllergies,
        alcohol: alcohol!,
        cannabis: cannabis!,
        otherSubstances: otherSubstances!,
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
      },
      { navigate: false },
    );
    if (!res.ok) setErrors({ form: res.message });
    else router.push("/home");
  };

  return (
    <TaskPage
      title="A few health basics"
      subtitle="Five short questions your provider needs. We've filled in what we already know."
      aside={
        <>
          <AsideSection title="Why we ask" icon={<HeartPulse aria-hidden className="size-4 text-primary" />}>
            <p>These answers help your provider prescribe safely. Family and social history come up in the visit instead of here.</p>
          </AsideSection>
          <AsideSection title="Your answers stay private" icon={<Lock aria-hidden className="size-4 text-primary" />}>
            <p>They go to your provider only. Our analytics record that you finished, never your answers.</p>
          </AsideSection>
        </>
      }
    >
      <div className="space-y-7">
        <Choice
          label="1. Have you ever been in the hospital for mental health or substance use?"
          note={
            j.fit.recent_hospitalization === false && (
              <p className="text-sm text-gray-700">You told us earlier: not in the past year.</p>
            )
          }
          value={hospitalizedEver}
          options={[
            ["no", "No"],
            ["yes", "Yes"],
          ]}
          onChange={setHospitalizedEver}
        />

        <Choice
          label="2. Are you taking any controlled substances now, such as stimulants, benzodiazepines, or opioids?"
          note={
            controlledEvidence.length > 0 && (
              <SourceTag source={`Filled in from the medications you confirmed: ${controlledEvidence.join(", ")}`} />
            )
          }
          value={controlledNow}
          options={[
            ["no", "No"],
            ["yes", "Yes"],
          ]}
          onChange={setControlledNow}
        />

        <div className="space-y-2">
          <p className="text-[15px] font-medium text-gray-900">3. Allergies</p>
          {foundAllergies.length > 0 ? (
            <ul className="space-y-2">
              {foundAllergies.map((a) => (
                <li key={a.id} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                  <span className="font-medium text-gray-900">{a.label}</span>
                  {a.detail && <span className="text-gray-700"> · {a.detail}</span>}
                  <SourceTag source={`You confirmed this from ${a.source}`} className="mt-1 flex" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-700">We didn&apos;t find any allergies on record.</p>
          )}
          <p className="text-sm text-gray-700">Any other allergies, including to medications?</p>
          {otherAllergies.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {otherAllergies.map((a) => (
                <li key={a}>
                  <button
                    type="button"
                    onClick={() => setOtherAllergies(otherAllergies.filter((x) => x !== a))}
                    aria-label={`Remove ${a}`}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-gray-100 px-3.5 text-sm text-gray-900 hover:bg-gray-200"
                  >
                    {a}
                    <X aria-hidden className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <label htmlFor="allergy" className="sr-only">
              Another allergy
            </label>
            <input
              id="allergy"
              value={allergyDraft}
              onChange={(e) => setAllergyDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addAllergy();
                }
              }}
              placeholder="For example: latex"
              maxLength={60}
              className="h-11 min-w-0 flex-1 rounded-md border border-gray-300 px-3 text-base text-gray-900 placeholder:text-gray-500 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
            />
            <Button variant="outline" disabled={!allergyDraft.trim()} onClick={addAllergy}>
              <Plus aria-hidden className="size-4" />
              Add
            </Button>
          </div>
        </div>

        <div className="space-y-5">
          <p className="text-[15px] font-medium text-gray-900">4. Substance use</p>
          <Choice label="Alcohol" value={alcohol} options={FREQUENCIES} onChange={setAlcohol} />
          <Choice label="Cannabis" value={cannabis} options={FREQUENCIES} onChange={setCannabis} />
          <Choice
            label="Any other substances, such as cocaine, opioids not prescribed to you, or methamphetamine?"
            value={otherSubstances}
            options={[
              ["no", "No"],
              ["yes", "Yes"],
            ]}
            onChange={setOtherSubstances}
          />
        </div>

        <div className="space-y-4">
          <p className="text-[15px] font-medium text-gray-900">5. Emergency contact</p>
          <TextField label="Name" autoComplete="off" value={contactName} onChange={(e) => setContactName(e.target.value)} error={errors.name} maxLength={60} />
          <TextField
            label="Phone"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            error={errors.phone}
            maxLength={20}
          />
        </div>

        <Button full loading={busy} onClick={() => void save()}>
          Save
        </Button>
        <ErrorText>{errors.form}</ErrorText>
      </div>
    </TaskPage>
  );
}
