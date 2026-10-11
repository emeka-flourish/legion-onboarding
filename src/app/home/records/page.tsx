"use client";

import { CheckCircle2, FileSearch, FlaskConical, Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useJourney, type JourneyState } from "@/components/journey/JourneyProvider";
import { StageScreen } from "@/components/journey/StageScreen";
import { AsideSection } from "@/components/layout/StepLayout";
import { TaskPage } from "@/components/ready/TaskPage";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Choice";
import { ErrorText, Notice, StatusLine } from "@/components/ui/Status";
import { SimulatedTag, SourceTag } from "@/components/ui/Tags";
import { pharmacyById } from "@/data/pharmacies";

export default function RecordsPage() {
  return <StageScreen stages={["home"]}>{(state) => <Records state={state} />}</StageScreen>;
}

const KIND_LABEL = { condition: "Condition", allergy: "Allergy", hospitalization: "Hospital stay", visit: "Visit" } as const;
const usDate = (iso?: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
};

function Records({ state }: { state: JourneyState }) {
  const j = state.journey;
  const status = j.readiness.tasks.records;
  return (
    <TaskPage
      title="Your records and medications"
      subtitle="We look first, so you confirm instead of typing."
      aside={
        <>
          <AsideSection title="Why we look first" icon={<FileSearch aria-hidden className="size-4 text-primary" />}>
            <p>Your provider sees your history before you meet, and you don&apos;t have to remember dates, doses, or past clinics.</p>
            <p>You choose what your provider sees: anything you uncheck stays out of your chart.</p>
          </AsideSection>
          <AsideSection title="Simulated in this demo" icon={<FlaskConical aria-hidden className="size-4 text-primary" />}>
            <p>The record networks (through Metriport) and pharmacy fill history (Surescripts, through DoseSpot) are simulated.</p>
          </AsideSection>
        </>
      }
    >
      {j.readiness.tasks.identity !== "done" ? (
        <Notice title="Verify your ID first">
          <p>The records search uses the name, date of birth, and address from your ID.</p>
          <Link href="/home/id" className="font-medium text-primary underline underline-offset-4">
            Verify your ID
          </Link>
        </Notice>
      ) : status === "todo" ? (
        <Consent />
      ) : status === "in_progress" ? (
        <Searching state={state} />
      ) : (
        <Confirm state={state} />
      )}
    </TaskPage>
  );
}

/** Consent before retrieval (TRD 8.2, rule 6): purpose, sources, and what is retrieved, then an explicit tap. */
function Consent() {
  const { act, busy } = useJourney();
  const [error, setError] = useState<string>();
  const run = async (type: "RECORDS_CONSENT" | "RECORDS_SKIP") => {
    const r = await act({ type }, { navigate: false });
    if (!r.ok) setError(r.message);
  };
  return (
    <div className="space-y-4">
      <section aria-labelledby="consent-title" className="rounded-lg border-2 border-blue-100 bg-blue-50 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="consent-title" className="text-[15px] font-semibold text-gray-900">
            Can we look for your records?
          </h2>
          <SimulatedTag />
        </div>
        <dl className="mt-3 space-y-2 text-[15px] text-gray-800">
          <div>
            <dt className="font-medium text-gray-900">Why</dt>
            <dd>So your provider has your history and you can confirm it instead of typing it.</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-900">Where we look</dt>
            <dd>Health record networks that connect clinics and hospitals, and pharmacy fill history.</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-900">What we get</dt>
            <dd>Past visits, conditions, allergies, and medications filled in the last year.</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-900">What we share to find you</dt>
            <dd>The name, date of birth, and address from your ID.</dd>
          </div>
        </dl>
      </section>
      <Button full loading={busy} onClick={() => void run("RECORDS_CONSENT")}>
        Allow the search
      </Button>
      <Button full variant="outline" disabled={busy} onClick={() => void run("RECORDS_SKIP")}>
        Not now, I&apos;ll tell you myself
      </Button>
      <ErrorText>{error}</ErrorText>
    </div>
  );
}

function Searching({ state }: { state: JourneyState }) {
  const jobs = state.journey.jobs;
  const line = (done: boolean, pending: string, finished: string) =>
    done ? (
      <p className="flex items-center gap-2 text-[15px] text-gray-800">
        <CheckCircle2 aria-hidden className="size-4 text-green-700" />
        {finished}
      </p>
    ) : (
      <StatusLine>{pending}</StatusLine>
    );
  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-5">
      {line(jobs.records?.status === "complete", "Searching health record networks", "Health record networks searched")}
      {line(jobs.med_history?.status === "complete", "Checking pharmacy fill history", "Pharmacy fill history checked")}
      <p className="text-sm text-gray-700">
        This can take a minute. You can keep going with{" "}
        <Link href="/home" className="font-medium text-primary underline underline-offset-4">
          other items
        </Link>{" "}
        while we search.
      </p>
    </div>
  );
}

function Confirm({ state }: { state: JourneyState }) {
  const { act, busy } = useJourney();
  const router = useRouter();
  const r = state.journey.readiness;
  const records = r.foundRecords ?? [];
  const meds = r.foundMedications ?? [];
  const skipped = r.tasks.records === "skipped";
  const [recordIds, setRecordIds] = useState<string[]>(r.confirmedRecordIds ?? records.map((x) => x.id));
  const [medIds, setMedIds] = useState<string[]>(r.confirmedMedicationIds ?? meds.map((x) => x.id));
  const [other, setOther] = useState<string[]>(r.otherMedications ?? []);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();
  const toggle = (list: string[], set: (v: string[]) => void, id: string, on: boolean) => set(on ? [...list, id] : list.filter((x) => x !== id));
  const add = () => {
    const v = draft.trim().slice(0, 80);
    if (v && !other.includes(v)) setOther([...other, v]);
    setDraft("");
  };
  const confirm = async () => {
    setError(undefined);
    const res = await act({ type: "CONFIRM_FOUND", recordIds, medicationIds: medIds, otherMedications: other }, { navigate: false });
    if (!res.ok) setError(res.message);
    else router.push("/home");
  };

  return (
    <div className="space-y-6">
      {!skipped && (
        <section aria-labelledby="found-records">
          <h2 id="found-records" className="text-base font-semibold text-gray-900">
            Records we found
          </h2>
          {records.length === 0 ? (
            <p className="mt-2 text-[15px] text-gray-700">
              We didn&apos;t find records in the networks we searched. That&apos;s common. You can bring anything that matters to your visit.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {records.map((rec) => (
                <li key={rec.id} className="rounded-lg border border-gray-200 bg-white px-3">
                  <Checkbox checked={recordIds.includes(rec.id)} onChange={(on) => toggle(recordIds, setRecordIds, rec.id, on)}>
                    <span className="font-medium text-gray-900">
                      {KIND_LABEL[rec.kind]}: {rec.label}
                    </span>
                    {rec.detail && <span className="block text-sm text-gray-700">{rec.detail}</span>}
                    {rec.date && <span className="block text-sm text-gray-600">{usDate(rec.date)}</span>}
                    <SourceTag source={rec.source} className="mt-1" />
                  </Checkbox>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {!skipped && (
        <section aria-labelledby="found-meds">
          <h2 id="found-meds" className="text-base font-semibold text-gray-900">
            Medications from your pharmacy history
          </h2>
          {meds.length === 0 ? (
            <p className="mt-2 text-[15px] text-gray-700">No fills showed up in the last year.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {meds.map((m) => (
                <li key={m.id} className="rounded-lg border border-gray-200 bg-white px-3">
                  <Checkbox checked={medIds.includes(m.id)} onChange={(on) => toggle(medIds, setMedIds, m.id, on)}>
                    <span className="font-medium text-gray-900">{m.name}</span>
                    {m.dose && <span className="block text-sm text-gray-700">{m.dose}</span>}
                    {m.lastFilled && (
                      <span className="block text-sm text-gray-600">
                        Last filled {usDate(m.lastFilled)}
                        {m.pharmacyId ? ` at ${pharmacyById(m.pharmacyId)?.name}` : ""}
                      </span>
                    )}
                    <SourceTag source={m.source} className="mt-1" />
                  </Checkbox>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section aria-labelledby="other-meds" className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 id="other-meds" className="text-base font-semibold text-gray-900">
          {skipped ? "What medications do you take?" : "Anything else you take?"}
        </h2>
        <p className="mt-1 text-[15px] text-gray-700">
          {skipped
            ? "Include prescriptions, over-the-counter medicines, and supplements. Add each one separately."
            : "Pharmacy history misses medications paid for in cash, samples, and over-the-counter medicines."}
        </p>
        {other.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {other.map((o) => (
              <li key={o}>
                <button
                  type="button"
                  onClick={() => setOther(other.filter((x) => x !== o))}
                  aria-label={`Remove ${o}`}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-gray-100 px-3.5 text-sm text-gray-900 hover:bg-gray-200"
                >
                  {o}
                  <X aria-hidden className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex gap-2">
          <label htmlFor="other-med" className="sr-only">
            Medication name and dose
          </label>
          <input
            id="other-med"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder="For example: sertraline 50 mg"
            maxLength={80}
            className="h-11 min-w-0 flex-1 rounded-md border border-gray-300 px-3 text-base text-gray-900 placeholder:text-gray-500 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
          />
          <Button variant="outline" disabled={!draft.trim()} onClick={add}>
            <Plus aria-hidden className="size-4" />
            Add
          </Button>
        </div>
      </section>

      <Button full loading={busy} onClick={() => void confirm()}>
        {other.length || medIds.length || recordIds.length ? "Confirm" : "Confirm, nothing to add"}
      </Button>
      <ErrorText>{error}</ErrorText>
    </div>
  );
}
