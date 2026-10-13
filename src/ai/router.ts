import {
  APICallError,
  generateText,
  JSONParseError,
  LoadAPIKeyError,
  NoObjectGeneratedError,
  NoOutputGeneratedError,
  Output,
  TypeValidationError,
} from "ai";
import { aiConfig, modelFor, type AiConfig, type ProviderName } from "@/config/ai.config";
import { detectCrisisLanguage } from "@/rules/crisis";
import { getModelFactory, hasKey, type ModelFactory } from "./providers";
import type { AiMeta, TaskSpec } from "./types";

// The provider router (TRD 4.3). It tries AI_PROVIDER first, then any other provider with a key, then the
// scripted fallback. An attempt fails over on a missing key, a timeout, a provider error, or output that fails
// the schema. The crisis rule runs before any of that, and on a match no model is called at all (TRD 4.4).

export type RunResult<O> =
  | { safety: "crisis"; category: string }
  | { safety?: undefined; output: O; meta: AiMeta; liveCalls: number };

export interface RouterDeps {
  config: AiConfig;
  factory: ModelFactory;
  hasKey: (provider: ProviderName) => boolean;
  clock: () => number;
}

const MIN_ATTEMPT_MS = 1_500;

function failureReason(e: unknown): string {
  if (LoadAPIKeyError.isInstance(e)) return "no_key";
  if (
    NoObjectGeneratedError.isInstance(e) ||
    NoOutputGeneratedError.isInstance(e) ||
    TypeValidationError.isInstance(e) ||
    JSONParseError.isInstance(e)
  ) {
    return "schema";
  }
  const name = e instanceof Error ? e.name : "";
  const message = e instanceof Error ? e.message : "";
  if (name === "TimeoutError" || name === "AbortError" || /time(d)? ?out|aborted/i.test(message)) return "timeout";
  if (APICallError.isInstance(e) && e.statusCode) return `provider_error_${e.statusCode}`;
  return "provider_error";
}

export async function runTask<I, G, O>(
  spec: TaskSpec<I, G, O>,
  input: I,
  opts: { forceScripted?: string } = {},
  deps: Partial<RouterDeps> = {},
): Promise<RunResult<O>> {
  for (const text of spec.freeText(input)) {
    const check = detectCrisisLanguage(text);
    if (check.match) return { safety: "crisis", category: check.category! };
  }

  const config = deps.config ?? aiConfig;
  const factory = deps.factory ?? getModelFactory();
  const keyed = deps.hasKey ?? hasKey;
  const clock = deps.clock ?? Date.now;
  const start = clock();
  const reasons: string[] = [];
  let liveCalls = 0;

  const scripted = (reason?: string): RunResult<O> => ({
    output: spec.scripted(input),
    meta: { mode: "scripted", latencyMs: clock() - start, fallbackReason: reason },
    liveCalls,
  });

  if (opts.forceScripted) return scripted(opts.forceScripted);
  if (config.activeProvider === "scripted") return scripted("configured");

  const order = [...new Set([config.activeProvider, ...config.fallbackOrder])].filter(keyed);
  if (!order.length) return scripted("no_keys");

  const task = config.tasks[spec.name];
  for (const provider of order) {
    const remaining = config.totalBudgetMs - (clock() - start);
    if (remaining < MIN_ATTEMPT_MS) {
      reasons.push(`${provider}: budget`);
      break;
    }
    const model = modelFor(config, provider, task.tier);
    liveCalls += 1;
    try {
      const result = await generateText({
        model: factory(provider, model),
        system: spec.system,
        prompt: spec.prompt(input),
        output: Output.object({ schema: spec.schema, name: spec.name }),
        maxRetries: 0,
        timeout: Math.min(task.timeoutMs, remaining),
        providerOptions: config.providerOptions[provider][task.tier],
      });
      const finalized = spec.finalize(result.output, input);
      if (finalized.ok) {
        return {
          output: finalized.output,
          meta: {
            mode: "live",
            provider,
            model,
            latencyMs: clock() - start,
            fallbackReason: reasons.length ? reasons.join("; ") : undefined,
          },
          liveCalls,
        };
      }
      reasons.push(`${provider}: ${finalized.reason}`);
      if (finalized.terminal) break;
    } catch (e) {
      // Only a reason code is kept. Provider errors can echo the request, so they are never logged or returned.
      reasons.push(`${provider}: ${failureReason(e)}`);
    }
  }
  return scripted(reasons.join("; "));
}

/** What the demo controls and the journey state show about the AI right now. */
export interface AiStatus {
  mode: "live" | "scripted";
  provider?: ProviderName;
  /** The quality-tier model, for the demo controls' status line. */
  model?: string;
  reason?: "configured" | "no_keys" | "journey_cap";
  liveCallsLeft?: number;
}

export function aiStatus(liveCallsUsed = 0, deps: Partial<Pick<RouterDeps, "config" | "hasKey">> = {}): AiStatus {
  const config = deps.config ?? aiConfig;
  const keyed = deps.hasKey ?? hasKey;
  if (config.activeProvider === "scripted") return { mode: "scripted", reason: "configured" };
  const provider = [...new Set([config.activeProvider, ...config.fallbackOrder])].find(keyed);
  if (!provider) return { mode: "scripted", reason: "no_keys" };
  const left = Math.max(0, config.liveCallsPerJourney - liveCallsUsed);
  if (!left) return { mode: "scripted", reason: "journey_cap", liveCallsLeft: 0 };
  return { mode: "live", provider, model: modelFor(config, provider, "quality"), liveCallsLeft: left };
}
