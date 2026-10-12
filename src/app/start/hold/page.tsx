"use client";

import { FlaskConical, Smartphone, UserRound } from "lucide-react";
import { useState } from "react";
import { useJourney, type JourneyState } from "@/components/journey/JourneyProvider";
import { StageScreen } from "@/components/journey/StageScreen";
import { inventedPhone } from "@/components/layout/demoFill";
import { AsideSection, StepLayout, StepProgress } from "@/components/layout/StepLayout";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { ErrorText, Notice } from "@/components/ui/Status";
import { SimulatedTag } from "@/components/ui/Tags";
import { BOOK_FAST_STEP_COUNT } from "@/domain/stages";
import { formatSlotLong } from "@/rules/time";

export default function HoldPage() {
  return <StageScreen stages={["hold"]}>{(state) => <Hold state={state} />}</StageScreen>;
}

const digits = (s: string) => s.replace(/\D/g, "");

function Hold({ state }: { state: JourneyState }) {
  const { act, busy } = useJourney();
  const j = state.journey;
  const [firstName, setFirstName] = useState(j.pendingPerson?.firstName ?? "");
  const [lastName, setLastName] = useState(j.pendingPerson?.lastName ?? "");
  const [phone, setPhone] = useState("");
  const [demoNumber] = useState(() => j.demoPhone ?? inventedPhone());
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [demoCode, setDemoCode] = useState<string>();
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<{ name?: string; last?: string; phone?: string; code?: string; form?: string }>({});

  const send = async () => {
    const next: typeof errors = {};
    if (!firstName.trim()) next.name = "Please enter your first name.";
    if (!lastName.trim()) next.last = "Please enter your last name.";
    const d = digits(phone);
    if (!(d.length === 10 || (d.length === 11 && d.startsWith("1")))) next.phone = "Please enter a 10-digit US mobile number.";
    setErrors(next);
    if (next.name || next.last || next.phone) return;
    const r = await act({ type: "HOLD_START", firstName: firstName.trim(), lastName: lastName.trim(), phone }, { navigate: false });
    if (!r.ok) return setErrors({ form: r.message });
    setSentTo(phone);
    setDemoCode(r.demoCode);
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(code)) return setErrors({ code: "Please enter the 6-digit code." });
    setErrors({});
    const r = await act({ type: "HOLD_VERIFY", code });
    if (!r.ok) setErrors({ code: r.message });
  };

  const slot = j.selection?.slotStart;
  return (
    <StepLayout
      title="We'll hold this time for you"
      progress={<StepProgress n={5} of={BOOK_FAST_STEP_COUNT} />}
      onBack={() => void act({ type: "GO_BACK" })}
      aside={
        <>
          <AsideSection title="Why we ask for this" icon={<UserRound aria-hidden className="size-4 text-primary" />}>
            <p>Your name and mobile number are all it takes to hold this time and create your account.</p>
            <p>We don&apos;t ask for your email, address, or date of birth until we need them.</p>
          </AsideSection>
          <AsideSection title="Come back from any device" icon={<Smartphone aria-hidden className="size-4 text-primary" />}>
            <p>Enter this number on any phone or computer and we&apos;ll text you a code to pick up where you left off.</p>
          </AsideSection>
          <AsideSection title="Simulated in this demo" icon={<FlaskConical aria-hidden className="size-4 text-primary" />}>
            <p>No texts are sent. The code appears on screen instead.</p>
          </AsideSection>
        </>
      }
    >
      {slot && state.derived.provider && (
        <div className="mb-6 rounded-lg border border-blue-100 bg-blue-50 p-4">
          <p className="text-[15px] font-semibold text-gray-900">
            {state.derived.provider.name}, {state.derived.provider.credential}
          </p>
          <p className="text-[15px] text-gray-800">{formatSlotLong(slot, j.timeZone)}</p>
          <p className="mt-1 text-sm text-gray-700">We&apos;re holding this time while you finish.</p>
        </div>
      )}

      {!sentTo ? (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="First name"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              error={errors.name}
              maxLength={40}
            />
            <TextField
              label="Last name"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              error={errors.last}
              maxLength={40}
            />
          </div>
          <TextField
            label="Mobile number"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="(512) 555-0100"
            hint="We'll text you a code to confirm it's you."
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={errors.phone}
            maxLength={20}
          />
          <div className="flex flex-wrap items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950">
            <span>Demo: use an invented number.</span>
            <button type="button" onClick={() => setPhone(demoNumber)} className="min-h-9 font-semibold underline underline-offset-4">
              Use {demoNumber}
            </button>
          </div>
          <Button type="submit" full loading={busy}>
            Text me a code
          </Button>
          <ErrorText>{errors.form}</ErrorText>
        </form>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void verify();
          }}
        >
          <p className="text-[15px] text-gray-800">
            We sent a 6-digit code to <strong>{sentTo}</strong>.
          </p>
          <TextField
            label="Code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(digits(e.target.value).slice(0, 6))}
            error={errors.code}
          />
          {demoCode && (
            <Notice title="Demo code">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-lg tracking-widest text-gray-900">{demoCode}</span>
                <SimulatedTag label="Shown instead of a text" />
                <button type="button" onClick={() => setCode(demoCode)} className="min-h-9 font-semibold text-primary underline underline-offset-4">
                  Use this code
                </button>
              </div>
            </Notice>
          )}
          <Button type="submit" full loading={busy}>
            Verify and continue
          </Button>
          <button
            type="button"
            onClick={() => {
              setSentTo(null);
              setCode("");
              setErrors({});
            }}
            className="min-h-11 text-sm text-gray-700 underline underline-offset-4"
          >
            Use a different number
          </button>
        </form>
      )}
    </StepLayout>
  );
}
