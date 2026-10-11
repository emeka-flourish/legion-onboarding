"use client";

import { Check, FlaskConical, Lock, MessageSquareText, Pencil, Plus, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AiMeta } from "@/ai/types";
import { useJourney, type JourneyState } from "@/components/journey/JourneyProvider";
import { StageScreen } from "@/components/journey/StageScreen";
import { AsideSection } from "@/components/layout/StepLayout";
import { RxLine, useRxMatches, withRx } from "@/components/ready/RxMatch";
import { TaskPage } from "@/components/ready/TaskPage";
import { SafetyPanel } from "@/components/safety/SafetyPanel";
import { Button } from "@/components/ui/Button";
import { ErrorText, Notice, StatusLine } from "@/components/ui/Status";
import { AiTag } from "@/components/ui/Tags";
import { FOLLOW_UPS, INTAKE_PROMPTS, STORY_KIND_LABEL, type FollowUpId, type PromptId } from "@/data/intake";
import type { StoryItem, StoryItemKind } from "@/domain/types";
import { api } from "@/lib/api";
import type { RxMatch } from "@/services/rxnorm";

export default function StoryPage() {
  return <StageScreen stages={["home"]}>{(state) => <Story state={state} />}</StageScreen>;
}

type Turn = { promptId: PromptId; followUpOf?: FollowUpId; items: StoryItem[]; meta?: AiMeta };
type Asking = { promptId: PromptId; followUpOf?: FollowUpId };
type IntakeReply = { items: StoryItem[]; followUpId: FollowUpId | null; meta: AiMeta } | { safety: "crisis" };
type SummaryReply = { text: string; meta: AiMeta } | { safety: "crisis" };

const KIND_ORDER = Object.keys(STORY_KIND_LABEL) as StoryItemKind[];
const MAX_ANSWER = 1200;

function Aside() {
  return (
    <>
      <AsideSection title="Why we ask" icon={<MessageSquareText aria-hidden className="size-4 text-primary" />}>
        <p>These four questions replace the long intake forms. Your provider reads your notes before you meet.</p>
      </AsideSection>
      <AsideSection title="What we keep" icon={<Lock aria-hidden className="size-4 text-primary" />}>
        <p>We don&apos;t save what you type. We save only the short notes and the summary you confirm.</p>
      </AsideSection>
      <AsideSection title="In this demo" icon={<FlaskConical aria-hidden className="size-4 text-primary" />}>
        <p>Answers go to a live AI model when one is switched on, otherwise to a scripted stand-in. The tag on each result says which.</p>
      </AsideSection>
    </>
  );
}

function Story({ state }: { state: JourneyState }) {
  const r = state.journey.readiness;
  if (r.tasks.story === "done" && r.story && r.clinicianSummary) {
    return (
      <TaskPage title="Your story is saved" subtitle="This is what your provider will read before you meet." aside={<Aside />} help>
        <ItemsByKind items={r.story} />
        <SummaryCard text={r.clinicianSummary.text} meta={{ mode: r.clinicianSummary.mode, provider: r.clinicianSummary.provider as AiMeta["provider"] }} />
      </TaskPage>
    );
  }
  return <Conversation />;
}

function Conversation() {
  const { act } = useJourney();
  const router = useRouter();
  const [phase, setPhase] = useState<"intro" | "asking" | "review" | "summary">("intro");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [asking, setAsking] = useState<Asking>({ promptId: 1 });
  const [draft, setDraft] = useState("");
  const [typed, setTyped] = useState(0);
  const [working, setWorking] = useState(false);
  const [crisis, setCrisis] = useState(false);
  const [items, setItems] = useState<StoryItem[]>([]);
  const [summary, setSummary] = useState<{ text: string; meta: AiMeta }>();
  const [error, setError] = useState<string>();
  const usedFollowUps = turns.flatMap((t) => (t.followUpOf ? [t.followUpOf] : []));
  const medications = (phase === "asking" ? turns.flatMap((t) => t.items) : items).filter((i) => i.kind === "medication_mentioned");
  const rx = useRxMatches(medications.map((i) => i.text));
  const lastMeta = [...turns].reverse().find((t) => t.meta)?.meta;

  const advance = (allTurns: Turn[], from: Asking) => {
    if (from.promptId < 4) {
      setAsking({ promptId: (from.promptId + 1) as PromptId });
    } else {
      // A patient may say the same thing twice across answers; the review shows each note once.
      const seen = new Set<string>();
      setItems(
        allTurns.flatMap((t) => t.items).filter((i) => {
          const key = `${i.kind}|${i.text.trim().toLowerCase()}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }),
      );
      setPhase("review");
    }
  };

  const send = async () => {
    setError(undefined);
    setWorking(true);
    const res = await api<IntakeReply>("/api/ai/intake", {
      body: { promptId: asking.promptId, answer: draft, followUpOf: asking.followUpOf, usedFollowUps },
    });
    setWorking(false);
    if (!res.ok) return setError(res.message);
    setTyped((n) => n + 1);
    setDraft("");
    if ("safety" in res.data) {
      // Rules caught crisis language: the safety panel shows at once, a person is flagged, and no model was called.
      setCrisis(true);
      return;
    }
    const turn: Turn = { ...asking, items: res.data.items, meta: res.data.meta };
    const all = [...turns, turn];
    setTurns(all);
    if (!asking.followUpOf && res.data.followUpId) setAsking({ promptId: asking.promptId, followUpOf: res.data.followUpId });
    else advance(all, asking);
  };

  const summarize = async () => {
    setError(undefined);
    const clean = items.map((i) => ({ ...i, text: i.text.trim() })).filter((i) => i.text);
    if (!clean.length) return setError("Add at least one note for your provider.");
    setItems(clean);
    setWorking(true);
    const res = await api<SummaryReply>("/api/ai/summary", { body: { items: clean } });
    setWorking(false);
    if (!res.ok) return setError(res.message);
    if ("safety" in res.data) return setCrisis(true);
    setSummary(res.data);
    setPhase("summary");
  };

  const save = async () => {
    if (!summary) return;
    setError(undefined);
    const res = await act(
      {
        type: "STORY_CONFIRM",
        items: withRx(items, rx),
        summary: { text: summary.text, mode: summary.meta.mode, provider: summary.meta.provider },
        typedAnswers: Math.min(typed, 12),
      },
      { navigate: false },
    );
    if (!res.ok) setError(res.message);
    else router.push("/home");
  };

  const question = asking.followUpOf ? FOLLOW_UPS[asking.followUpOf] : INTAKE_PROMPTS.find((p) => p.id === asking.promptId)!.text;
  const hint = asking.followUpOf ? "One more detail, if you'd like." : INTAKE_PROMPTS.find((p) => p.id === asking.promptId)!.hint;
  const lastTurn = turns.at(-1);

  return (
    <TaskPage title="Tell us what's going on" subtitle="Four short questions, in your own words." aside={<Aside />} help>
      <div className="space-y-5">
        {crisis ? (
          <SafetyPanel>
            <p>Your visit is still booked. Someone from our care team will check in with you today.</p>
            <Button
              className="mt-3"
              variant="outline"
              onClick={() => {
                setCrisis(false);
                if (phase === "asking") advance(turns, asking);
              }}
            >
              Continue
            </Button>
          </SafetyPanel>
        ) : phase === "intro" ? (
          <>
            <Notice title="About the AI assistant">
              <p>
                An AI assistant organizes your answers for your provider. It doesn&apos;t give medical advice or make decisions, and your
                provider reviews everything.
              </p>
            </Notice>
            <p className="text-[15px] text-gray-800">Answer in your own words. You&apos;ll check every note before anything is saved.</p>
            <Button full onClick={() => setPhase("asking")}>
              Start
            </Button>
          </>
        ) : phase === "asking" ? (
          <>
            <p className="text-sm text-gray-600">{asking.followUpOf ? "A quick follow-up" : `Question ${asking.promptId} of 4`}</p>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (draft.trim()) void send();
              }}
            >
              <label htmlFor="answer" className="block text-lg font-semibold text-gray-900">
                {question}
              </label>
              <p className="text-sm text-gray-600">{hint}</p>
              <textarea
                id="answer"
                value={draft}
                rows={5}
                maxLength={MAX_ANSWER}
                readOnly={working} // nothing typed while an answer is being noted can be lost
                aria-busy={working || undefined}
                onChange={(e) => setDraft(e.target.value)}
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
              />
              {working ? (
                <StatusLine>Noting this down</StatusLine>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={!draft.trim()}>
                    Next
                  </Button>
                  {asking.followUpOf && (
                    <Button variant="outline" onClick={() => advance(turns, asking)}>
                      Skip
                    </Button>
                  )}
                </div>
              )}
            </form>
            {lastTurn && lastTurn.items.length > 0 && (
              <div className="rounded-lg border border-violet-100 bg-violet-50/60 p-4" role="status">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">Here&apos;s what I noted</p>
                  <AiTag meta={lastTurn.meta} />
                </div>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {lastTurn.items.map((i) => (
                    <li key={`${i.kind}:${i.text}`} className="rounded-full bg-white px-3 py-1 text-sm text-gray-900 ring-1 ring-violet-200">
                      {i.text}
                    </li>
                  ))}
                </ul>
                {lastTurn.items
                  .filter((i) => i.kind === "medication_mentioned" && rx[i.text.trim()])
                  .map((i) => (
                    <RxLine key={i.text} match={rx[i.text.trim()]!} prefix={`${i.text}: recognized as`} />
                  ))}
                <p className="mt-2 text-xs text-gray-700">You can change any of these before saving.</p>
              </div>
            )}
          </>
        ) : phase === "review" ? (
          <Review items={items} setItems={setItems} meta={lastMeta} rx={rx} onDone={() => void summarize()} working={working} />
        ) : (
          summary && (
            <>
              <p className="text-[15px] text-gray-800">Here&apos;s the summary your provider will read. Does it sound right?</p>
              <SummaryCard text={summary.text} meta={summary.meta} />
              <Button full loading={working} onClick={() => void save()}>
                <Check aria-hidden className="size-4" />
                Confirm and save
              </Button>
              <Button full variant="outline" onClick={() => setPhase("review")}>
                Go back and edit my notes
              </Button>
            </>
          )
        )}
        <ErrorText>{error}</ErrorText>
      </div>
    </TaskPage>
  );
}

function Review({
  items,
  setItems,
  meta,
  rx,
  onDone,
  working,
}: {
  items: StoryItem[];
  setItems: (items: StoryItem[]) => void;
  meta?: AiMeta;
  rx: Record<string, RxMatch | null>;
  onDone: () => void;
  working: boolean;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const update = (index: number, text: string) => setItems(items.map((it, i) => (i === index ? { ...it, text } : it)));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-gray-900">Here&apos;s what I noted</h2>
        <AiTag meta={meta} />
      </div>
      <p className="text-[15px] text-gray-700">Change or remove anything that isn&apos;t right. Only what you keep is saved.</p>
      {KIND_ORDER.filter((k) => items.some((i) => i.kind === k)).map((kind) => (
        <section key={kind}>
          <h3 className="text-sm font-semibold text-gray-700">{STORY_KIND_LABEL[kind]}</h3>
          <ul className="mt-2 space-y-2">
            {items.map((item, index) =>
              item.kind !== kind ? null : (
                <li key={index} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5">
                  {editing === index ? (
                    <>
                      <label htmlFor={`item-${index}`} className="sr-only">
                        Edit note
                      </label>
                      <input
                        id={`item-${index}`}
                        autoFocus
                        value={item.text}
                        maxLength={120}
                        onChange={(e) => update(index, e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && setEditing(null)}
                        className="h-10 min-w-0 flex-1 rounded-md border border-gray-300 px-2 text-base text-gray-900 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
                      />
                      <Button variant="quiet" onClick={() => setEditing(null)}>
                        Done
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="min-w-0 flex-1 text-[15px] text-gray-900">
                        {item.text || "(empty)"}
                        {item.kind === "medication_mentioned" && rx[item.text.trim()] && <RxLine match={rx[item.text.trim()]!} />}
                      </span>
                      <button type="button" onClick={() => setEditing(index)} aria-label={`Edit “${item.text}”`} className="flex size-11 items-center justify-center rounded-md text-gray-700 hover:bg-gray-100">
                        <Pencil aria-hidden className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setItems(items.filter((_, i) => i !== index))}
                        aria-label={`Remove “${item.text}”`}
                        className="flex size-11 items-center justify-center rounded-md text-gray-700 hover:bg-gray-100"
                      >
                        <X aria-hidden className="size-4" />
                      </button>
                    </>
                  )}
                </li>
              ),
            )}
          </ul>
        </section>
      ))}
      <Button
        variant="outline"
        onClick={() => {
          setItems([...items, { kind: "concern", text: "" }]);
          setEditing(items.length);
        }}
      >
        <Plus aria-hidden className="size-4" />
        Add something I missed
      </Button>
      <Button full loading={working} onClick={onDone}>
        Looks right
      </Button>
    </div>
  );
}

function ItemsByKind({ items }: { items: StoryItem[] }) {
  return (
    <div className="space-y-4">
      {KIND_ORDER.filter((k) => items.some((i) => i.kind === k)).map((kind) => (
        <section key={kind}>
          <h3 className="text-sm font-semibold text-gray-700">{STORY_KIND_LABEL[kind]}</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-[15px] text-gray-900">
            {items.filter((i) => i.kind === kind).map((i, n) => (
              <li key={n}>{i.text}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function SummaryCard({ text, meta }: { text: string; meta?: Pick<AiMeta, "mode" | "provider"> }) {
  return (
    <section aria-label="Summary for your provider" className="mt-5 rounded-lg border border-violet-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Sparkles aria-hidden className="size-4 text-violet-700" />
        <p className="text-sm font-semibold text-gray-900">For your provider</p>
        <AiTag meta={meta} />
      </div>
      <p className="mt-2 text-[15px] leading-relaxed text-gray-900">{text}</p>
    </section>
  );
}
