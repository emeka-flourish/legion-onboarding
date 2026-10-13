// Unit and integration tests never call live AI or Redis, whatever is set in the developer's environment.
for (const key of [
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
]) {
  delete process.env[key];
}
process.env.AI_PROVIDER = "scripted";
process.env.DEMO_MODE = "true";
process.env.DEMO_FAST = "1";
process.env.SESSION_SECRET = "test-secret-not-for-production";
// No live RxNorm calls in tests: an unreachable address proves the flow survives an outage (TAC-35).
process.env.RXNORM_URL = "http://127.0.0.1:9/REST";
