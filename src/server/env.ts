// Server-side settings. Secrets are read here and nowhere else.
export function demoMode(): boolean {
  return process.env.DEMO_MODE !== "false";
}

export function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (process.env.VERCEL) throw new Error("SESSION_SECRET must be set (at least 16 characters) on Vercel");
  return "local-development-secret-only";
}
