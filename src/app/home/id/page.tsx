"use client";

import { Camera, FlaskConical, IdCard, Pencil, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useJourney, type JourneyState } from "@/components/journey/JourneyProvider";
import { StageScreen } from "@/components/journey/StageScreen";
import { AsideSection } from "@/components/layout/StepLayout";
import { TaskPage } from "@/components/ready/TaskPage";
import { Button } from "@/components/ui/Button";
import { DobField, SelectField, TextField } from "@/components/ui/Field";
import { ErrorText, Notice, StatusLine } from "@/components/ui/Status";
import { SimulatedTag, SourceTag } from "@/components/ui/Tags";
import { US_STATES } from "@/data/states";
import type { Action } from "@/domain/actions";
import type { IdentityField, IdentityReviewReason, Journey } from "@/domain/types";
import { cx } from "@/lib/cx";
import { checkUsDate, isoToUs } from "@/lib/dates";
import { changedFields, SEX_AT_BIRTH } from "@/rules/identity";
import { routeAfter } from "@/rules/prep";

export default function IdPage() {
  return <StageScreen stages={["home"]}>{(state) => <IdCheck state={state} />}</StageScreen>;
}

type Identity = NonNullable<Journey["readiness"]["identity"]>;
type Correction = Omit<Extract<Action, { type: "ID_CORRECT" }>, "type">;

const ROWS: { field: IdentityField; label: string }[] = [
  { field: "legal_name", label: "Legal name" },
  { field: "dob", label: "Date of birth" },
  { field: "sex_at_birth", label: "Sex at birth" },
  { field: "address", label: "Address" },
];

function shown(field: IdentityField, id: Identity): string {
  if (field === "legal_name") return id.legalName;
  if (field === "dob") return isoToUs(id.dob);
  if (field === "sex_at_birth") return id.sexAtBirth;
  return `${id.addressLine}, ${id.city}, ${id.state} ${id.zip}`;
}

const BIRTH_DATE_MISMATCH = "Your date of birth doesn't match what we had, so someone on our team will check it.";
const REVIEW_LINE: Record<IdentityReviewReason, string> = {
  under_18: BIRTH_DATE_MISMATCH,
  dob_mismatch: BIRTH_DATE_MISMATCH,
  name_changed: "You changed your legal name from what your ID shows, so someone on our team will check it against your ID.",
  dob_changed: "You changed your date of birth from what your ID shows, so someone on our team will check it against your ID.",
  outside_texas:
    "Your address is outside Texas. Our clinicians can see you only while you're in Texas, so someone on our team will confirm where you'll be for your visit.",
};

/** One plain sentence per reason, without saying the same thing twice. */
function reviewLines(reasons: IdentityReviewReason[]): string[] {
  const shownReasons = reasons.includes("dob_changed") ? reasons.filter((r) => r !== "dob_mismatch" && r !== "under_18") : reasons;
  return [...new Set(shownReasons.map((r) => REVIEW_LINE[r]))];
}

function IdCheck({ state }: { state: JourneyState }) {
  const { act } = useJourney();
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
      title="Verify your identity"
      subtitle="Verify your identity so we can securely find your records and save you from re-entering information."
      aside={
        <>
          <AsideSection title="Why we ask" icon={<ShieldCheck aria-hidden className="size-4 text-primary" />}>
            <p>
              Your ID gives us your legal name, date of birth, and address, which record networks need to find you. It also confirms
              your age, and pharmacies need it for some prescriptions.
            </p>
            <p>
              If your ID shows an old address, update it here. A change to your legal name or date of birth goes to a person to check
              against your ID.
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
        <Details state={state} id={id} />
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

/**
 * What the ID check read, for the patient to check and correct (Emeka's direction, L21). Each row edits on its own;
 * changed rows say "Edited by you," and fixed rules decide whether a person double-checks the change.
 */
function Details({ state, id }: { state: JourneyState; id: Identity }) {
  const { act } = useJourney();
  const router = useRouter();
  const [editing, setEditing] = useState<IdentityField | null>(null);
  const edited = changedFields(id.fromId, id);
  const lines = reviewLines(id.reviewReasons);

  const close = (field: IdentityField) => {
    setEditing(null);
    requestAnimationFrame(() => document.getElementById(`edit-${field}`)?.focus());
  };
  const save = async (field: IdentityField, change: Correction) => {
    const r = await act({ type: "ID_CORRECT", ...change }, { navigate: false });
    if (!r.ok) return r.message;
    close(field);
  };

  return (
    <div className="space-y-5">
      <Notice tone="success" title="Your ID is verified">
        <p>Please check these details from your ID. If anything is wrong or out of date, like your address, you can edit it.</p>
      </Notice>
      <dl className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
        {ROWS.map(({ field, label }) => (
          <div key={field} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:gap-4">
            <dt className={cx("w-32 shrink-0 text-sm text-gray-600 sm:pt-0.5", editing === field && "sr-only")}>{label}</dt>
            <dd className="flex min-w-0 flex-1 items-start justify-between gap-3">
              {editing === field ? (
                <EditForm field={field} id={id} onSave={(change) => save(field, change)} onCancel={() => close(field)} />
              ) : (
                <>
                  <span className="min-w-0 text-[15px] text-gray-900">
                    {shown(field, id)}
                    {edited.includes(field) && (
                      <span className="mt-1 flex items-center gap-1 text-xs text-gray-600">
                        <Pencil aria-hidden className="size-3" />
                        Edited by you
                      </span>
                    )}
                  </span>
                  <button
                    id={`edit-${field}`}
                    type="button"
                    disabled={editing !== null}
                    onClick={() => setEditing(field)}
                    aria-label={`Edit ${label.toLowerCase()}`}
                    className="-my-2.5 min-h-11 shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline disabled:opacity-40"
                  >
                    Edit
                  </button>
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <SourceTag source={id.source} />
      {lines.length > 0 && (
        <Notice title={lines.length > 1 ? "A person will double-check a few details" : "A person will double-check one detail"}>
          {lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <p>Your visit stays booked while we check.</p>
        </Notice>
      )}
      <Button full disabled={editing !== null} onClick={() => router.push(routeAfter("identity", state.journey))}>
        Looks right
      </Button>
    </div>
  );
}

function EditForm({
  field,
  id,
  onSave,
  onCancel,
}: {
  field: IdentityField;
  id: Identity;
  onSave: (change: Correction) => Promise<string | undefined>;
  onCancel: () => void;
}) {
  const { busy } = useJourney();
  const form = useRef<HTMLFormElement>(null);
  const [name, setName] = useState(id.legalName);
  const [dob, setDob] = useState(isoToUs(id.dob));
  const [sex, setSex] = useState(id.sexAtBirth);
  const [addr, setAddr] = useState({ line: id.addressLine, city: id.city, state: id.state, zip: id.zip });
  const [errors, setErrors] = useState<Partial<Record<"name" | "dob" | "sex" | "line" | "city" | "zip" | "form", string>>>({});

  useEffect(() => {
    form.current?.querySelector<HTMLElement>("input, select")?.focus();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    let change: Correction;
    if (field === "legal_name") {
      if (name.trim().length < 2) return setErrors({ name: "Please enter your full legal name." });
      change = { legalName: name.trim() };
    } else if (field === "dob") {
      const checked = checkUsDate(dob, new Date(), true);
      if (!checked.iso) return setErrors({ dob: checked.error });
      change = { dob: checked.iso };
    } else if (field === "sex_at_birth") {
      const choice = SEX_AT_BIRTH.find((s) => s === sex);
      if (!choice) return setErrors({ sex: "Please choose one." });
      change = { sexAtBirth: choice };
    } else {
      const next: typeof errors = {};
      if (addr.line.trim().length < 3) next.line = "Please enter your street address.";
      if (addr.city.trim().length < 2) next.city = "Please enter your city.";
      if (!/^\d{5}$/.test(addr.zip)) next.zip = "Please enter a 5-digit ZIP code.";
      if (Object.keys(next).length) return setErrors(next);
      const state = US_STATES.find(([code]) => code === addr.state)?.[0] ?? "TX";
      change = { address: { line: addr.line.trim(), city: addr.city.trim(), state, zip: addr.zip } };
    }
    setErrors({});
    const message = await onSave(change);
    if (message) setErrors({ form: message });
  };

  return (
    <form
      ref={form}
      noValidate
      onSubmit={(e) => void submit(e)}
      onKeyDown={(e) => e.key === "Escape" && onCancel()}
      className="w-full space-y-3"
    >
      {field === "legal_name" && (
        <TextField
          label="Legal name"
          hint="As it appears on your ID"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          maxLength={80}
        />
      )}
      {field === "dob" && <DobField value={dob} onChange={setDob} error={errors.dob} />}
      {field === "sex_at_birth" && (
        <fieldset aria-describedby={errors.sex ? "sex-error" : undefined}>
          <legend className="text-sm font-medium text-gray-900">Sex at birth</legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {SEX_AT_BIRTH.map((option) => (
              <label
                key={option}
                className={cx(
                  "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-[15px] text-gray-900",
                  sex === option ? "border-primary bg-blue-50" : "border-gray-300 bg-white",
                )}
              >
                <input type="radio" name="sex-at-birth" value={option} checked={sex === option} onChange={() => setSex(option)} className="size-4 accent-primary" />
                {option}
              </label>
            ))}
          </div>
          <ErrorText id="sex-error">{errors.sex}</ErrorText>
        </fieldset>
      )}
      {field === "address" && (
        <>
          <TextField
            label="Street address"
            autoComplete="address-line1"
            value={addr.line}
            onChange={(e) => setAddr((a) => ({ ...a, line: e.target.value }))}
            error={errors.line}
            maxLength={80}
          />
          <TextField
            label="City"
            autoComplete="address-level2"
            value={addr.city}
            onChange={(e) => setAddr((a) => ({ ...a, city: e.target.value }))}
            error={errors.city}
            maxLength={40}
          />
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="State"
              autoComplete="address-level1"
              value={addr.state}
              onChange={(e) => setAddr((a) => ({ ...a, state: e.target.value }))}
              options={US_STATES}
            />
            <TextField
              label="ZIP code"
              autoComplete="postal-code"
              inputMode="numeric"
              value={addr.zip}
              onChange={(e) => setAddr((a) => ({ ...a, zip: e.target.value.replace(/\D/g, "").slice(0, 5) }))}
              error={errors.zip}
              maxLength={5}
            />
          </div>
        </>
      )}
      <ErrorText>{errors.form}</ErrorText>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={busy}>
          Save
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
