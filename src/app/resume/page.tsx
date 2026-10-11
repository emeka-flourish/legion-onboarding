"use client";

import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useJourney } from "@/components/journey/JourneyProvider";
import { AsideSection, StepLayout } from "@/components/layout/StepLayout";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { ErrorText, Notice } from "@/components/ui/Status";
import { SimulatedTag } from "@/components/ui/Tags";
import type { ClientState } from "@/domain/client";
import { STAGE_ROUTE } from "@/domain/stages";
import { api } from "@/lib/api";

// Resume by phone (decision L14, item 3). Nothing on this screen shows a health detail; the patient only
// sees their journey after the code checks out (TRD 8.1).
export default function ResumePage() {
  const { adopt, refresh } = useJourney();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);
  const [demoCode, setDemoCode] = useState<string>();
  const [code, setCode] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string>();

  const send = async () => {
    setError(undefined);
    setWorking(true);
    const r = await api<{ sent: true; demoCode?: string }>("/api/resume/start", { body: { phone } });
    setWorking(false);
    if (!r.ok) return setError(r.message);
    setSent(true);
    setDemoCode(r.data.demoCode);
  };

  const verify = async () => {
    setError(undefined);
    setWorking(true);
    const r = await api<ClientState>("/api/resume/verify", { body: { phone, code } });
    setWorking(false);
    if (!r.ok) return setError(r.message);
    adopt(r.data);
    void refresh();
    router.replace(STAGE_ROUTE[r.data.journey.stage]);
  };

  return (
    <StepLayout
      title="Continue where you left off"
      subtitle="Enter the mobile number you used, and we'll text you a code."
      aside={
        <AsideSection title="Why a code" icon={<ShieldCheck aria-hidden className="size-4 text-primary" />}>
          <p>The code makes sure only you can open your progress. We show nothing about your care until it checks out.</p>
        </AsideSection>
      }
    >
      {!sent ? (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <TextField
            label="Mobile number"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="(512) 555-0100"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={20}
          />
          <Button type="submit" full loading={working} disabled={!phone.trim()}>
            Text me a code
          </Button>
          <ErrorText>{error}</ErrorText>
        </form>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void verify();
          }}
        >
          <p className="text-[15px] text-gray-800">If that number has a Legion account, we sent it a 6-digit code.</p>
          <TextField
            label="Code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
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
          <Button type="submit" full loading={working} disabled={code.length !== 6}>
            Continue
          </Button>
          <ErrorText>{error}</ErrorText>
        </form>
      )}
    </StepLayout>
  );
}
