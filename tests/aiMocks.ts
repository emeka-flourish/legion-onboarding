// Mock language models for the AI tests. They never reach a real provider.
import { MockLanguageModelV4 } from "ai/test";

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 20, text: 20, reasoning: undefined },
};

/** A model that answers with this JSON, optionally after `wait` resolves. */
export function answers(value: unknown, wait?: Promise<void>) {
  return new MockLanguageModelV4({
    doGenerate: async () => {
      if (wait) await wait;
      return {
        content: [{ type: "text", text: JSON.stringify(value) }],
        finishReason: { unified: "stop", raw: undefined },
        usage,
        warnings: [],
      };
    },
  });
}

/** A model that never answers until the router gives up on it. */
export function hangs() {
  return new MockLanguageModelV4({
    doGenerate: ({ abortSignal }) =>
      new Promise((_, reject) => {
        abortSignal?.addEventListener("abort", () => reject(abortSignal.reason ?? new Error("aborted")));
      }),
  });
}

export function fails() {
  return new MockLanguageModelV4({
    doGenerate: async () => {
      throw new Error("provider unavailable");
    },
  });
}
