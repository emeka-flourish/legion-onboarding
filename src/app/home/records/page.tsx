"use client";

import { AlertTriangle, CheckCircle2, ChevronDown, FileSearch, FlaskConical, Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useJourney, type JourneyState } from "@/components/journey/JourneyProvider";
import { StageScreen } from "@/components/journey/StageScreen";
import { AsideSection } from "@/components/layout/StepLayout";
import { TaskPage } from "@/components/ready/TaskPage";
import { Button, LinkButton } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Choice";
import { ErrorText, Notice, StatusLine } from "@/components/ui/Status";
import { SimulatedTag, SourceTag } from "@/components/ui/Tags";
import { pharmacyById } from "@/data/pharmacies";
import type { FoundMedication, FoundRecord } from "@/domain/types";
import { isoToShort } from "@/lib/dates";
import { routeAfter } from "@/rules/prep";

export default function RecordsPage() {
  return <StageScreen stages={["home"]}>{(state) => <Records state={state} />}</StageScreen>;
}

const ASIDE = (
  <>
    <AsideSection title="Why we look first" icon={<FileSearch aria-hidden className="size-4 text-primary" />}>
      <p>Your provider sees your history before you meet, and you don&apos;t have to remember dates, doses, or past clinics.</p>
      <p>You choose what your provider sees: anything you uncheck stays out of your chart.</p>
    </AsideSection>
    <AsideSection title="Simulated in this demo" icon={<FlaskConical aria-hidden className="size-4 text-primary" />}>
      <p>The record networks (through Metriport) and pharmacy fill history (Surescripts, through DoseSpot) are simulated.</p>
    </AsideSection>
  </>
);

function Records({ state }: { state: JourneyState }) {
  const j = state.journey;
  const status = j.readiness.tasks.records;
  if (j.readiness.tasks.identity !== "done") {
    return (
      <TaskPage title="Find your health information automatically" aside={ASIDE}>
        <Notice title="Verify your identity first">
          <p>The search uses the name, date of birth, and address from your ID, so we find your records and only yours.</p>
          <Link href="/home/id" className="font-medium text-primary underline underline-offset-4">
            Verify your identity
          </Link>
        </Notice>
      </TaskPage>
    );
  }
  if (status === "todo") return <Consent />;
  if (status === "in_progress") return <Searching state={state} />;
  return <Review state={state} />;
}

/**
 * Consent before retrieval (TRD 8.2, rule 6), led by what it saves the patient (walkthrough feedback, item 6).
 * Where we look and what we share sit one tap away, and nothing runs until "Find my records".
 */
function Consent() {
  const { act, busy } = useJourney();
  const [error, setError] = useState<string>();
  const run = async (type: "RECORDS_CONSENT" | "RECORDS_SKIP") => {
    const r = await act({ type }, { navigate: false });
    if (!r.ok) setError(r.message);
  };
  return (
    <TaskPage
      title="Find your health information automatically"
      subtitle="We can look for recent visits, medications, allergies, and conditions so you can review what we find instead of typing everything again."
      aside={ASIDE}
    >
      <div className="space-y-3">
        <Button full loading={busy} onClick={() => void run("RECORDS_CONSENT")}>
          Find my records
        </Button>
        <Button full variant="outline" disabled={busy} onClick={() => void run("RECORDS_SKIP")}>
          I&apos;ll enter them myself
        </Button>
        <ErrorText>{error}</ErrorText>
        <p className="text-sm text-gray-700">Nothing is shared until you tap &ldquo;Find my records.&rdquo;</p>
      </div>
      <details className="group mt-5 rounded-lg border border-gray-200 bg-white">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 text-[15px] font-medium text-gray-900 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            How this works <SimulatedTag />
          </span>
          <ChevronDown aria-hidden className="size-4 text-gray-600 transition-transform group-open:rotate-180" />
        </summary>
        <dl className="space-y-2 border-t border-gray-100 px-4 py-3 text-[15px] text-gray-800">
          <div>
            <dt className="font-medium text-gray-900">Where we look</dt>
            <dd>Health record networks that connect clinics and hospitals, and pharmacy fill history.</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-900">What we share to find you</dt>
            <dd>The name, date of birth, and address from your verified ID.</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-900">What we may find</dt>
            <dd>Past visits, conditions, allergies, recent labs, and medications filled in the last year.</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-900">What your provider sees</dt>
            <dd>Only what you confirm. Anything you uncheck stays out of your chart.</dd>
          </div>
        </dl>
      </details>
    </TaskPage>
  );
}

/** Retrieval takes time, so waiting here is optional (walkthrough feedback, item 7). */
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
    <TaskPage
      title="Finding your records…"
      subtitle="We're checking health record networks and your pharmacy history. You don't need to wait here."
      aside={ASIDE}
    >
      <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
        {line(jobs.records?.status === "complete", "Searching health record networks", "Health record networks searched")}
        {line(jobs.med_history?.status === "complete", "Checking pharmacy fill history", "Pharmacy fill history checked")}
      </div>
      <LinkButton href="/home" full className="mt-5">
        Continue with other steps while we search
      </LinkButton>
      <p className="mt-3 text-sm text-gray-700">We&apos;ll let you know on your home screen when they&apos;re ready. Or stay here: they&apos;ll appear on this page.</p>
    </TaskPage>
  );
}

// The health summary's sections, in reading order. Medications sit after visits, from the pharmacy history.
const SECTIONS: { id: string; title: string; kinds: FoundRecord["kind"][] | "meds" }[] = [
  { id: "visits", title: "Recent visits", kinds: ["visit", "hospitalization"] },
  { id: "meds", title: "Medications", kinds: "meds" },
  { id: "conditions", title: "Conditions", kinds: ["condition"] },
  { id: "allergies", title: "Allergies", kinds: ["allergy"] },
  { id: "other", title: "Other relevant history", kinds: ["lab"] },
];
const KIND_LABEL: Record<FoundRecord["kind"], string> = {
  visit: "Visit",
  hospitalization: "Hospital stay",
  condition: "Condition",
  allergy: "Allergy",
  lab: "Lab or vital sign",
};

const clinicOf = (source: string) => source.split(" · ")[0];

function Item({ checked, onChange, title, detail, meta, source, flag }: {
  checked: boolean;
  onChange: (on: boolean) => void;
  title: ReactNode;
  detail?: string;
  meta?: string;
  source: string;
  flag?: string;
}) {
  return (
    <li className="px-3">
      <Checkbox checked={checked} onChange={onChange}>
        <span className="font-medium text-gray-900">{title}</span>
        {detail && <span className="block text-sm text-gray-800">{detail}</span>}
        {meta && <span className="block text-sm text-gray-600">{meta}</span>}
        {flag && (
          <span className="mt-1 flex items-start gap-1.5 text-sm text-amber-900">
            <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            {flag}
          </span>
        )}
        <SourceTag source={source} className="mt-1" />
      </Checkbox>
    </li>
  );
}

/**
 * What the searches found, as a health summary to confirm rather than a history to retype (walkthrough
 * feedback, item 8). Everything starts checked; unchecking keeps an item out of the chart.
 */
function Review({ state }: { state: JourneyState }) {
  const { act, busy } = useJourney();
  const router = useRouter();
  const j = state.journey;
  const r = j.readiness;
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
  const next = routeAfter("confirm_found", j);
  const confirm = async () => {
    setError(undefined);
    const res = await act({ type: "CONFIRM_FOUND", recordIds, medicationIds: medIds, otherMedications: other }, { navigate: false });
    if (!res.ok) setError(res.message);
    else router.push(next);
  };

  const recordItem = (rec: FoundRecord, withKind = false) => (
    <Item
      key={rec.id}
      checked={recordIds.includes(rec.id)}
      onChange={(on) => toggle(recordIds, setRecordIds, rec.id, on)}
      title={withKind ? `${KIND_LABEL[rec.kind]}: ${rec.label}` : rec.label}
      detail={rec.detail}
      meta={rec.date ? isoToShort(rec.date) : undefined}
      source={rec.source}
      flag={rec.needsConfirmation}
    />
  );
  const medItem = (m: FoundMedication) => (
    <Item
      key={m.id}
      checked={medIds.includes(m.id)}
      onChange={(on) => toggle(medIds, setMedIds, m.id, on)}
      title={m.name}
      detail={m.dose}
      meta={m.lastFilled ? `Last filled ${isoToShort(m.lastFilled)}${m.pharmacyId ? ` at ${pharmacyById(m.pharmacyId)?.name}` : ""}` : undefined}
      source={m.source}
      flag={m.needsConfirmation}
    />
  );

  const flaggedRecords = records.filter((x) => x.needsConfirmation);
  const flaggedMeds = meds.filter((m) => m.needsConfirmation);
  const clinics = new Set(records.map((x) => clinicOf(x.source))).size;
  const found = records.length + meds.length;
  const group = (title: string, id: string, children: ReactNode) => (
    <section aria-labelledby={`sec-${id}`}>
      <h2 id={`sec-${id}`} className="text-base font-semibold text-gray-900">
        {title}
      </h2>
      <ul className="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">{children}</ul>
    </section>
  );

  return (
    <TaskPage
      title={skipped ? "Tell us your medications" : found ? "Review the health information we found" : "We searched, and nothing turned up"}
      subtitle={
        skipped
          ? "Include prescriptions, over-the-counter medicines, and supplements."
          : found
            ? "Uncheck anything that's wrong. It stays out of your chart."
            : undefined
      }
      aside={ASIDE}
    >
      <div className="space-y-6">
        {!skipped && found > 0 && (
          <p className="flex items-start gap-2 rounded-lg bg-green-50 px-3 py-2.5 text-[15px] text-gray-900 ring-1 ring-green-100">
            <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-green-700" />
            <span>
              We found {found} item{found === 1 ? "" : "s"}
              {clinics > 0 && ` from ${clinics} clinic${clinics === 1 ? "" : "s"}`}
              {meds.length > 0 && `${clinics > 0 ? " and" : " in"} your pharmacy history`}, so you don&apos;t have to type them.
            </span>
          </p>
        )}

        {!skipped && records.length === 0 && (
          <p className="text-[15px] text-gray-700">
            We didn&apos;t find records in the networks we searched. That&apos;s common. You can bring anything that matters to your visit.
          </p>
        )}

        {!skipped && flaggedRecords.length + flaggedMeds.length > 0 &&
          group("Needs your confirmation", "check", [...flaggedMeds.map(medItem), ...flaggedRecords.map((x) => recordItem(x, true))])}

        {!skipped &&
          SECTIONS.map((sec) => {
            if (sec.kinds === "meds") {
              if (meds.length === 0) {
                return (
                  <section key={sec.id} aria-labelledby="sec-meds">
                    <h2 id="sec-meds" className="text-base font-semibold text-gray-900">
                      Medications
                    </h2>
                    <p className="mt-2 text-[15px] text-gray-700">No fills showed up in the last year.</p>
                  </section>
                );
              }
              const rest = meds.filter((m) => !m.needsConfirmation);
              return rest.length ? <div key={sec.id}>{group(sec.title, sec.id, rest.map(medItem))}</div> : null;
            }
            const kinds = sec.kinds;
            const items = records.filter((x) => kinds.includes(x.kind) && !x.needsConfirmation);
            return items.length ? <div key={sec.id}>{group(sec.title, sec.id, items.map((x) => recordItem(x)))}</div> : null;
          })}

        <section aria-labelledby="other-meds" className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 id="other-meds" className="text-base font-semibold text-gray-900">
            {skipped ? "What medications do you take?" : "Anything else you take?"}
          </h2>
          <p className="mt-1 text-[15px] text-gray-700">
            {skipped
              ? "Add each one separately, with the dose if you know it."
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
          {next === "/home" ? "Confirm" : "Confirm and continue"}
        </Button>
        <ErrorText>{error}</ErrorText>
      </div>
    </TaskPage>
  );
}
