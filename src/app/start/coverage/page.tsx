"use client";

import { FlaskConical, Search, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { useJourney, type JourneyState } from "@/components/journey/JourneyProvider";
import { StageScreen } from "@/components/journey/StageScreen";
import { AsideSection, StepLayout, StepProgress } from "@/components/layout/StepLayout";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { ErrorText, Notice, StatusLine } from "@/components/ui/Status";
import { SimulatedTag, SourceTag } from "@/components/ui/Tags";
import { PLAN_LABEL } from "@/data/plans";
import { BOOK_FAST_STEP_COUNT } from "@/domain/stages";
import { checkUsDate, maskUsDate } from "@/lib/dates";
import { formatCents } from "@/rules/cost";

export default function CoveragePage() {
  return <StageScreen stages={["coverage"]}>{(state) => <Coverage state={state} />}</StageScreen>;
}

function Coverage({ state }: { state: JourneyState }) {
  const { act } = useJourney();
  const coverage = state.journey.coverage!;
  const plan = PLAN_LABEL[coverage.plan];
  return (
    <StepLayout
      title="Let's confirm your coverage and cost"
      subtitle={`${plan}. You'll see your exact cost before you add a card.`}
      progress={<StepProgress n={6} of={BOOK_FAST_STEP_COUNT} />}
      onBack={coverage.status === "pending" ? undefined : () => void act({ type: "GO_BACK" })}
      aside={
        <>
          <AsideSection title="Cost before commitment" icon={<Wallet aria-hidden className="size-4 text-primary" />}>
            <p>We check your plan now, so you know your exact cost before you add a card.</p>
            <p>
              If your plan is slow to answer, you can book with the typical cost, and we&apos;ll confirm before your visit. If coverage
              falls through, you can cancel for free.
            </p>
          </AsideSection>
          <AsideSection title="Simulated in this demo" icon={<FlaskConical aria-hidden className="size-4 text-primary" />}>
            <p>The insurance check is simulated. No real plan is contacted.</p>
          </AsideSection>
        </>
      }
    >
      {coverage.status === "not_started" && <CoverageForm state={state} />}
      {coverage.status === "pending" && <Pending state={state} />}
      {coverage.status === "active" && <Active state={state} />}
      {coverage.status === "inactive" && <Inactive state={state} />}
      {coverage.status === "not_found" && <NotFound />}
    </StepLayout>
  );
}

function DobField({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <TextField
      label="Date of birth"
      hint="MM/DD/YYYY"
      inputMode="numeric"
      autoComplete="bday"
      placeholder="MM/DD/YYYY"
      value={value}
      onChange={(e) => onChange(maskUsDate(e.target.value))}
      error={error}
      maxLength={10}
    />
  );
}

function CoverageForm({ state }: { state: JourneyState }) {
  const { act, busy } = useJourney();
  const [method, setMethod] = useState<"member_id" | "lookup">("member_id");
  const [memberId, setMemberId] = useState("");
  const [dob, setDob] = useState("");
  const [errors, setErrors] = useState<{ memberId?: string; dob?: string; form?: string }>({});
  // Checked as it's typed: a problem shows next to the field as soon as it's certain.
  const typeDob = (value: string) => {
    setDob(value);
    setErrors((e) => ({ ...e, dob: checkUsDate(value, new Date()).error }));
  };

  const submit = async () => {
    const final = checkUsDate(dob, new Date(), true);
    const next: typeof errors = {};
    if (method === "member_id" && memberId.trim().length < 5) next.memberId = "Please enter the member ID from your insurance card.";
    if (final.error) next.dob = final.error;
    setErrors(next);
    if (next.memberId || next.dob || !final.iso) return;
    const r = await act(
      method === "member_id"
        ? { type: "COVERAGE_SUBMIT", method, memberId: memberId.trim(), dob: final.iso }
        : { type: "COVERAGE_SUBMIT", method, dob: final.iso },
      { navigate: false },
    );
    if (!r.ok) setErrors({ form: r.message });
  };

  const firstName = state.journey.person?.firstName;
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {method === "member_id" ? (
        <>
          <TextField
            label="Member ID"
            hint="It's on the front of your insurance card."
            autoComplete="off"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            error={errors.memberId}
            maxLength={24}
          />
          <DobField value={dob} onChange={typeDob} error={errors.dob} />
          <Button type="submit" full loading={busy}>
            Check my coverage
          </Button>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-[15px] font-medium text-gray-900">Don&apos;t have your card handy?</p>
            <Button variant="outline" className="mt-2" onClick={() => setMethod("lookup")}>
              <Search aria-hidden className="size-4" />
              Look it up for me
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* Consent before retrieval (TRD 8.2, rule 6): say what is shared, and with whom, before anything runs. */}
          <div className="rounded-lg border-2 border-blue-100 bg-blue-50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[15px] font-semibold text-gray-900">Look up your plan</p>
              <SimulatedTag />
            </div>
            <p className="mt-1 text-[15px] text-gray-800">
              To find your plan, we&apos;ll share your first name{firstName ? ` (${firstName})` : ""}, date of birth, and state (Texas) with
              our insurance check service. We use them only to find your coverage. Nothing is shared until you tap the button.
            </p>
          </div>
          <DobField value={dob} onChange={typeDob} error={errors.dob} />
          <Button type="submit" full loading={busy}>
            Share and look up my plan
          </Button>
          <Button variant="quiet" onClick={() => setMethod("member_id")}>
            Enter my member ID instead
          </Button>
        </>
      )}
      <ErrorText>{errors.form}</ErrorText>
    </form>
  );
}

function Pending({ state }: { state: JourneyState }) {
  const { act, busy } = useJourney();
  const job = state.journey.jobs.coverage_verify ?? state.journey.jobs.coverage_discover;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(t);
  }, []);
  const seconds = job ? Math.max(0, Math.floor((now - Date.parse(job.startedAt)) / 1_000)) : 0;
  const plan = PLAN_LABEL[state.journey.coverage!.plan];
  return (
    <div className="space-y-5">
      <StatusLine seconds={seconds}>
        {state.journey.jobs.coverage_discover?.status === "pending" ? `Looking for your ${plan} plan` : `Checking your coverage with ${plan}`}
      </StatusLine>
      {state.derived.canConfirmLater && (
        <Notice tone="info" title="Your plan is taking longer than usual">
          <p>
            You can book now with the typical cost, and we&apos;ll confirm your coverage before your visit. If it falls through, you can
            cancel for free.
          </p>
          <Button loading={busy} onClick={() => void act({ type: "COVERAGE_CONFIRM_LATER" })}>
            Book now, confirm later
          </Button>
        </Notice>
      )}
    </div>
  );
}

function Active({ state }: { state: JourneyState }) {
  const { act, busy } = useJourney();
  const c = state.journey.coverage!;
  return (
    <div className="space-y-5">
      <Notice tone="success" title="You're covered" live>
        <p>In network with {PLAN_LABEL[c.plan]} · verified</p>
        {c.intakeCents !== undefined && (
          <p className="text-base font-semibold text-gray-900">Your cost for this visit: {formatCents(c.intakeCents)} copay</p>
        )}
        <SourceTag source={c.source} />
      </Notice>
      <Button full loading={busy} onClick={() => void act({ type: "COVERAGE_CONTINUE" })}>
        Continue to booking
      </Button>
    </div>
  );
}

function Inactive({ state }: { state: JourneyState }) {
  const { act, busy } = useJourney();
  const c = state.journey.coverage!;
  const since = c.inactiveSince
    ? new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(c.inactiveSince))
    : undefined;
  return (
    <div className="space-y-5">
      <Notice tone="warning" title={`Your ${PLAN_LABEL[c.plan]} plan isn't active`} live>
        <p>{since ? `Your plan shows it ended on ${since}.` : "Your plan shows as not active right now."}</p>
        <p>You can switch to self-pay ($250 for the first visit, $150 for follow-ups), try a different member ID, or choose another plan.</p>
        <SourceTag source={c.source} />
      </Notice>
      <div className="space-y-3">
        <Button full loading={busy} onClick={() => void act({ type: "COVERAGE_USE_SELF_PAY" })}>
          Use self-pay
        </Button>
        <Button full variant="outline" disabled={busy} onClick={() => void act({ type: "COVERAGE_TRY_AGAIN" }, { navigate: false })}>
          Try a different member ID
        </Button>
        <Button full variant="outline" disabled={busy} onClick={() => void act({ type: "CHANGE_PLAN" })}>
          Choose a different plan
        </Button>
      </div>
    </div>
  );
}

function NotFound() {
  const { act, busy } = useJourney();
  return (
    <div className="space-y-5">
      <Notice tone="warning" title="We couldn't find your plan with those details" live>
        <p>That happens. Your member ID will find it directly.</p>
      </Notice>
      <Button full loading={busy} onClick={() => void act({ type: "COVERAGE_TRY_AGAIN" }, { navigate: false })}>
        Enter my member ID instead
      </Button>
      <Button full variant="outline" disabled={busy} onClick={() => void act({ type: "COVERAGE_USE_SELF_PAY" })}>
        Use self-pay instead
      </Button>
    </div>
  );
}
