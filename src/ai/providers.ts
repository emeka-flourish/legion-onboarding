import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { PROVIDER_KEY_ENV, type ProviderName } from "@/config/ai.config";

// The provider packages read their keys from the environment when a call is made; nothing here touches a key value.

export type ModelFactory = (provider: ProviderName, modelId: string) => LanguageModel;

const realFactory: ModelFactory = (provider, modelId) => {
  if (provider === "anthropic") return anthropic(modelId);
  if (provider === "google") return google(modelId);
  return openai(modelId);
};

let factory: ModelFactory = realFactory;

export function getModelFactory(): ModelFactory {
  return factory;
}

/** Tests swap in mock models so they never reach a real provider. Pass nothing to restore the real one. */
export function setModelFactoryForTests(next?: ModelFactory): void {
  factory = next ?? realFactory;
}

export function hasKey(provider: ProviderName): boolean {
  return Boolean(process.env[PROVIDER_KEY_ENV[provider]]?.trim());
}
