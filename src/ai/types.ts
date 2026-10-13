import type { z } from "zod";
import type { ProviderName, TaskName } from "@/config/ai.config";

/** Shown to the patient as an "AI · live (OpenAI)" or "AI · scripted" tag, and to Emeka in the demo controls. */
export interface AiMeta {
  mode: "live" | "scripted";
  provider?: ProviderName;
  model?: string;
  latencyMs: number;
  /** Why an earlier provider, or every provider, was skipped. Reason codes only, never content. */
  fallbackReason?: string;
}

export type Finalized<O> = { ok: true; output: O } | { ok: false; reason: "schema" | "post_filter"; terminal?: boolean };

export interface TaskSpec<I, G, O> {
  name: TaskName;
  /** What the model must return. It has no length limits, which some providers reject; `finalize` enforces them. */
  schema: z.ZodType<G>;
  system: string;
  prompt(input: I): string;
  /** Every free-text field in the input, for the crisis check that runs before any model call. */
  freeText(input: I): string[];
  /** Normalizes and validates the model's output against the app's limits. */
  finalize(raw: G, input: I): Finalized<O>;
  /** The deterministic fallback: canned output for a demo patient's canned answer, otherwise keyword rules. */
  scripted(input: I): O;
}
