// The one place to switch AI providers or models (TRD 4.3 and 6.5). Change AI_PROVIDER in the environment to
// switch provider, or AI_MODEL_QUALITY / AI_MODEL_FAST to try another model of the active provider, with no
// code changes. Keys are read from the environment by the provider packages and never appear here.
import type { JSONValue } from "ai";

export type ProviderName = "openai" | "anthropic" | "google";
export type ActiveProvider = ProviderName | "scripted";
export type Tier = "quality" | "fast";
export type TaskName = "preferenceNote" | "intakeExtract" | "clinicianSummary";

export const PROVIDER_KEY_ENV: Record<ProviderName, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
};

export const PROVIDER_LABEL: Record<ProviderName, string> = { openai: "OpenAI", anthropic: "Anthropic", google: "Google" };

function parseProvider(value: string | undefined): ActiveProvider {
  return value === "anthropic" || value === "google" || value === "scripted" ? value : "openai";
}

export const aiConfig = {
  /** Read on every call, so a change to AI_PROVIDER takes effect without a rebuild. */
  get activeProvider(): ActiveProvider {
    return parseProvider(process.env.AI_PROVIDER);
  },
  /** After the active provider, any other provider with a key is tried in this order, then the scripted fallback. */
  fallbackOrder: ["openai", "anthropic", "google"] as ProviderName[],
  models: {
    openai: { quality: "gpt-6.1-sol", fast: "gpt-6-luna" },
    anthropic: { quality: "claude-opus-5-5", fast: "claude-haiku-5-5" },
    google: { quality: "gemini-3.8-flash", fast: "gemini-3.5-flash-lite" },
  } as Record<ProviderName, Record<Tier, string>>,
  /** Short structured tasks need little reasoning, so each tier asks for low effort to keep the patient waiting less. */
  providerOptions: {
    openai: {
      quality: { openai: { reasoningEffort: "low", reasoningSummary: null } },
      fast: { openai: { reasoningEffort: "none" } },
    },
    anthropic: {
      quality: { anthropic: { effort: "low" } },
      fast: { anthropic: { effort: "low", thinking: { type: "disabled" } } },
    },
    google: {
      quality: { google: { thinkingConfig: { thinkingLevel: "low" } } },
      fast: { google: { thinkingConfig: { thinkingLevel: "minimal" } } },
    },
  } as Record<ProviderName, Record<Tier, Record<string, Record<string, JSONValue>>>>,
  tasks: {
    preferenceNote: { tier: "fast", timeoutMs: 8_000 },
    intakeExtract: { tier: "quality", timeoutMs: 15_000 },
    clinicianSummary: { tier: "quality", timeoutMs: 20_000 },
  } as Record<TaskName, { tier: Tier; timeoutMs: number }>,
  /** Stays under the routes' 30-second limit on Vercel, however many providers are tried. */
  totalBudgetMs: 25_000,
  /** Hosted-demo protection (TAC-52): after this many live calls, a journey uses the scripted fallback. */
  liveCallsPerJourney: 40,
  /** And across all journeys in a UTC day, so a script creating many journeys can't run up the bill. */
  get liveCallsPerDay(): number {
    return Number(process.env.AI_DAILY_LIVE_CALLS) || 1_500;
  },
};

export type AiConfig = Omit<typeof aiConfig, "activeProvider" | "liveCallsPerDay"> & {
  activeProvider: ActiveProvider;
  liveCallsPerDay: number;
};

/** The model for a provider and tier. The overrides apply to the active provider only, since IDs are provider-specific. */
export function modelFor(config: AiConfig, provider: ProviderName, tier: Tier): string {
  if (provider === config.activeProvider) {
    const override = tier === "quality" ? process.env.AI_MODEL_QUALITY : process.env.AI_MODEL_FAST;
    if (override) return override;
  }
  return config.models[provider][tier];
}
