import { describe, expect, it } from "vitest";

describe("test setup", () => {
  it("runs with scripted AI and no live keys", () => {
    expect(process.env.AI_PROVIDER).toBe("scripted");
    expect(process.env.OPENAI_API_KEY).toBeUndefined();
  });
});
