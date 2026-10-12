"use client";

import { Pencil, Sparkles, X } from "lucide-react";
import { useRef, useState, type FocusEvent } from "react";
import type { AiMeta } from "@/ai/types";
import { useJourney } from "@/components/journey/JourneyProvider";
import { SafetyPanel } from "@/components/safety/SafetyPanel";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/Status";
import { AiTag } from "@/components/ui/Tags";
import type { PreferenceChip } from "@/domain/types";
import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import { mergeChips } from "@/rules/preferences";

type Reply = { chips: PreferenceChip[]; meta: AiMeta } | { safety: "crisis" };

const EXAMPLES = ["A woman provider", "Speaks Spanish", "Experience with work stress"];
const MAX = 300;

/**
 * The optional note, in the matching controls above the results (walkthrough feedback, items 2 to 4; it was
 * after the results under L14). AI turns it into chips that re-order the list; chips never remove anyone. The
 * field opens up when tapped, and once the note is read it folds into a short "Your preferences" summary.
 */
export function PreferenceNote({ chips, onChange }: { chips: PreferenceChip[]; onChange: (message: string) => void }) {
  const { act, busy } = useJourney();
  const [note, setNote] = useState("");
  const [meta, setMeta] = useState<AiMeta>();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [working, setWorking] = useState(false);
  const [crisis, setCrisis] = useState(false);
  const [unmatched, setUnmatched] = useState(false);
  const [error, setError] = useState<string>();
  const box = useRef<HTMLTextAreaElement>(null);

  const showSummary = chips.length > 0 && !editing;
  const expanded = open || note.length > 0;

  const apply = async (next: PreferenceChip[], mode: AiMeta["mode"], message: string) => {
    const r = await act({ type: "APPLY_PREFERENCE_CHIPS", chips: next, mode }, { navigate: false });
    if (!r.ok) {
      setError(r.message);
      return false;
    }
    onChange(message);
    return true;
  };

  const submit = async () => {
    setError(undefined);
    setUnmatched(false);
    setWorking(true);
    const r = await api<Reply>("/api/ai/preference-note", { body: { note } });
    setWorking(false);
    if (!r.ok) return setError(r.message);
    if ("safety" in r.data) return setCrisis(true);
    setMeta(r.data.meta);
    if (r.data.chips.length === 0) return setUnmatched(true); // keep the words, so they can be rephrased
    const next = editing ? mergeChips(chips, r.data.chips) : r.data.chips;
    if (await apply(next, r.data.meta.mode, "Re-ranked for your preferences")) {
      setNote("");
      setOpen(false);
      setEditing(false);
    }
  };

  // Folds back to one line when focus leaves an empty field.
  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null) && !note) setOpen(false);
  };

  return (
    <div aria-labelledby="note-title" role="group">
      <h3 id="note-title" className="text-[15px] font-semibold text-gray-900">
        Anything else that matters to you? <span className="font-normal text-gray-600">(optional)</span>
      </h3>

      {showSummary ? (
        <div className="mt-2 rounded-md bg-violet-50/60 p-3 ring-1 ring-violet-100" role="status">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-gray-900">Your preferences</p>
            <AiTag meta={meta} />
          </div>
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Your preferences">
            {chips.map((c) => (
              <li key={`${c.kind}:${c.value}`} className="rounded-full bg-white px-3 py-1 text-sm font-medium text-violet-900 ring-1 ring-violet-200">
                {c.label}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              setEditing(true);
              setOpen(true);
              setTimeout(() => box.current?.focus(), 0);
            }}
            className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            <Pencil aria-hidden className="size-4" />
            Edit preferences
          </button>
        </div>
      ) : (
        <div className="mt-2" onFocus={() => setOpen(true)} onBlur={onBlur}>
          {editing && chips.length > 0 && (
            <ul className="mb-2 flex flex-wrap gap-2" aria-label="Your preferences">
              {chips.map((c) => (
                <li key={`${c.kind}:${c.value}`}>
                  <button
                    type="button"
                    onClick={() => void apply(chips.filter((x) => x !== c), meta?.mode ?? "scripted", "Re-ranked for your preferences")}
                    aria-label={`Remove ${c.label}`}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-violet-50 px-3.5 text-sm font-medium text-violet-900 ring-1 ring-violet-200 hover:bg-violet-100"
                  >
                    {c.label}
                    <X aria-hidden className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <label htmlFor="pref-note" className="sr-only">
            Anything else that matters to you
          </label>
          <div className="relative">
            <Sparkles aria-hidden className="pointer-events-none absolute top-3 left-3 size-4 text-violet-600" />
            <textarea
              id="pref-note"
              ref={box}
              value={note}
              maxLength={MAX}
              rows={expanded ? 3 : 1}
              onChange={(e) => setNote(e.target.value)}
              placeholder={editing ? "Add something else, in your own words" : "Tell us in your own words, like “a woman who speaks Spanish”"}
              className={cx(
                "block w-full resize-none rounded-md border border-gray-300 py-2.5 pr-3 pl-9 text-base text-gray-900 transition-[height] placeholder:text-gray-500",
                "focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none",
              )}
            />
          </div>
          {expanded && (
            <>
              <div className="mt-2 flex flex-wrap gap-2">
                {EXAMPLES.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setNote((n) => (n ? `${n.replace(/[.\s]+$/, "")}. ${e}` : e).slice(0, MAX))}
                    className="min-h-11 rounded-full border border-dashed border-gray-400 px-3.5 text-sm text-gray-800 hover:bg-gray-50"
                  >
                    + {e}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button disabled={!note.trim() || busy} loading={working} onClick={() => void submit()}>
                  Update my matches
                </Button>
                {editing && (
                  <Button
                    variant="quiet"
                    onClick={() => {
                      setEditing(false);
                      setOpen(false);
                      setNote("");
                      setUnmatched(false);
                    }}
                  >
                    Done
                  </Button>
                )}
                <span className="ml-auto text-xs text-gray-600">
                  {note.length}/{MAX}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-600">AI reads your note and re-ranks the list. No one is hidden.</p>
            </>
          )}
        </div>
      )}

      <div className="mt-2">
        <ErrorText>{error}</ErrorText>
      </div>
      {unmatched && (
        <p className="mt-2 text-sm text-gray-700" role="status">
          We couldn&apos;t match on that note, so the list stays as it was. Try naming a language, a gender, or a focus.
        </p>
      )}
      {crisis && (
        <div className="mt-4">
          <SafetyPanel>
            <p>Whenever you&apos;re ready, you can keep choosing a time below.</p>
          </SafetyPanel>
        </div>
      )}
    </div>
  );
}
