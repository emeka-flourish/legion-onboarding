"use client";

import { Plus, Sparkles, X } from "lucide-react";
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

const EXAMPLES = ["A woman provider", "Speaks Spanish", "Experience with work stress", "Sees BIPOC patients"];
const MAX = 300;

/**
 * The optional note, in the matching controls above the results (L19, L20). One line until tapped; once AI reads
 * it, it becomes a row of preference chips that re-rank the list, each removable, with "Add" for more. Chips never
 * hide a provider.
 */
export function PreferenceNote({ chips, onChange }: { chips: PreferenceChip[]; onChange: (message: string) => void }) {
  const { act, busy } = useJourney();
  const [note, setNote] = useState("");
  const [meta, setMeta] = useState<AiMeta>();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [working, setWorking] = useState(false);
  const [crisis, setCrisis] = useState(false);
  const [unmatched, setUnmatched] = useState(false);
  const [error, setError] = useState<string>();
  const box = useRef<HTMLTextAreaElement>(null);

  const showChips = chips.length > 0;
  const showInput = !showChips || adding;
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
    if (await apply(mergeChips(chips, r.data.chips), r.data.meta.mode, "Re-ranked for your preferences")) {
      setNote("");
      setOpen(false);
      setAdding(false);
    }
  };

  // Folds back to one line when focus leaves an empty field.
  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null) && !note) {
      setOpen(false);
      setAdding(false);
    }
  };

  return (
    <div role="group" aria-labelledby="note-title">
      <h3 id="note-title" className="sr-only">
        Anything else that matters to you
      </h3>

      {showChips && (
        <div className="flex flex-wrap items-center gap-1.5" role="status">
          <span className="mr-0.5 text-sm font-medium text-gray-700">Your preferences</span>
          <ul className="flex flex-wrap items-center gap-1.5" aria-label="Your preferences">
            {chips.map((c) => (
              <li key={`${c.kind}:${c.value}`}>
                <button
                  type="button"
                  onClick={() => void apply(chips.filter((x) => x !== c), meta?.mode ?? "scripted", "Re-ranked for your preferences")}
                  aria-label={`Remove ${c.label}`}
                  className="inline-flex min-h-9 items-center gap-1 rounded-full bg-violet-50 py-1 pr-2 pl-3 text-sm font-medium text-violet-900 ring-1 ring-violet-200 hover:bg-violet-100"
                >
                  {c.label}
                  <X aria-hidden className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
          {!adding && (
            <button
              type="button"
              aria-label="Add a preference"
              onClick={() => {
                setAdding(true);
                setOpen(true);
                setTimeout(() => box.current?.focus(), 0);
              }}
              className="inline-flex min-h-9 items-center gap-1 rounded-full px-2.5 text-sm font-medium text-primary hover:bg-blue-50"
            >
              <Plus aria-hidden className="size-4" />
              Add
            </button>
          )}
          <AiTag meta={meta} className="ml-auto" />
        </div>
      )}

      {showInput && (
        <div className={cx(showChips && "mt-2")} onFocus={() => setOpen(true)} onBlur={onBlur}>
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
              placeholder={adding ? "Add something else, in your own words" : "Anything else that matters? (optional)"}
              className="block w-full resize-none rounded-md border border-gray-300 bg-white py-2.5 pr-3 pl-9 text-base text-gray-900 placeholder:text-gray-500 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
            />
          </div>
          {expanded && (
            <>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {EXAMPLES.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setNote((n) => (n ? `${n.replace(/[.\s]+$/, "")}. ${e}` : e).slice(0, MAX))}
                    className="min-h-9 rounded-full border border-dashed border-gray-400 px-3 text-sm text-gray-800 hover:bg-gray-50"
                  >
                    + {e}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-3">
                <Button disabled={!note.trim() || busy} loading={working} onClick={() => void submit()}>
                  Update my matches
                </Button>
                <span className="text-xs text-gray-600">AI turns your words into preferences. No one is hidden.</span>
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="mt-2">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
      {unmatched && (
        <p className="mt-2 text-sm text-gray-700" role="status">
          We couldn&apos;t match on that note, so the list stays as it was. Try a language, a gender, or a focus.
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
