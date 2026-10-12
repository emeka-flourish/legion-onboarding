# Deploying the demo

> **At a glance**
> - The demo deploys to Vercel from the feature branch, `feat/ai-native-onboarding`, and the pull request into `main` stays open for review, as the submission asks.
> - It needs three things on Vercel: an Upstash Redis store (so journeys survive across requests and devices), a `SESSION_SECRET`, and at least one AI key (without one, the AI runs in scripted mode).
> - Keys never go into chat, code, or git. Each one is typed into the Vercel CLI prompt or the dashboard.
> - Steps marked **(needs Emeka's go)** are outward-facing and wait for an explicit go.

## 1. Before anything leaves this machine

1. **Verify.** `npm run verify` passes: typecheck, lint, unit and integration tests, and the end-to-end suite against a production build.
2. **Export the AI history.** `python3 scripts/export-ai-history.py`, then commit `ai_history/raw/` and `ai_history/REDACTIONS.md`.
3. **Re-author the early commits.** The two commits from before the no-reply address was set are re-authored once, locally, before the first push (STATUS.md, A6). Nothing has been pushed yet, so this rewrites no shared history.

## 2. The repository and pull request (needs Emeka's go)

1. Create the private repository under `emeka-flourish` (L7). Reviewers need access: either add Legion's reviewers or make the repository public at submission. That choice is Emeka's.
2. Push `main` (the baseline) and `feat/ai-native-onboarding`.
3. Open the pull request from `feat/ai-native-onboarding` into `main`, with the deployed URL in its description.

## 3. The Vercel project (needs Emeka's go)

```bash
vercel link
```

Link (or create) the project from the repository folder. The `.vercelignore` file keeps recordings, voice notes, transcripts, test output, and every `.env*` file out of each upload.

**Storage.** Add Upstash Redis from the Vercel Marketplace (dashboard: Storage, then Upstash). It sets `KV_REST_API_URL` and `KV_REST_API_TOKEN` on the project; the app reads either that pair or `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. On Vercel the app refuses to run without them, because memory would lose journeys between server instances.

**Environment variables** (Production). Add each with `vercel env add <NAME> production` and type the value at the prompt:

| Variable | Value | Notes |
|---|---|---|
| `SESSION_SECRET` | A new long random string, for example from `openssl rand -base64 32` | Signs the journey cookie and hashes phone numbers. Not the local one. |
| `OPENAI_API_KEY` | Emeka's key | At least one AI key for live AI |
| `ANTHROPIC_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY` | Optional | Used if OpenAI fails |
| `AI_PROVIDER` | `openai` | |
| `AI_DAILY_LIVE_CALLS` | `1500`, or lower | Caps live AI calls per day across everyone; after that, scripted |
| `DEMO_MODE` | `true` | The banner, demo controls, and on-screen codes |
| `RXNORM_URL` | Leave unset | NLM's public API |

Leave `DEMO_FAST` unset in production; it shortens waits for the automated tests only.

## 4. Deploy the feature branch (needs Emeka's go)

From the feature branch:

```bash
vercel deploy --prod
```

This serves the feature branch at the project's public production address while the pull request stays open. Preview deployments stay behind Vercel's login, which is why the reviewer link is the production one.

## 5. Smoke test the live URL

| Check | What proves it |
|---|---|
| The welcome loads with the demo banner | The page and "How this demo works" |
| Live AI | As Maya, the note on the provider screen shows "AI · live (OpenAI)" |
| Live RxNorm | In the conversation, hydroxyzine shows "Recognized as hydroxyzine" and "Live · RxNorm" |
| Storage across devices (TAC-31) | Hold a time on a laptop, then "Continue with your phone" on a phone resumes the same journey |
| The whole journey | Maya from the fit check through the visit, the care handoff, and the ongoing-care home |
| The safety path | As Sam, PHQ-9 item 9 shows help at once; "Mark reviewed" in `/journey` records the review |
| The journey view | `/journey` shows the timeline, both funnels, data quality, and people in progress |
| No errors | `vercel logs` for the deployment shows no errors |

Then put the URL in the README's "Try it" section and in the pull request description.

## 6. If something goes wrong

- **Roll back:** `vercel rollback`, or promote the previous deployment in the dashboard.
- **AI misbehaving or costly:** set `AI_PROVIDER=scripted` (or lower `AI_DAILY_LIVE_CALLS`) and redeploy; the demo keeps working with scripted answers.
- **Storage missing or down:** journeys can't be saved, and the app says so instead of quietly keeping them in one server's memory. Check the Upstash store and its variables in the Vercel dashboard.
- **A key exposed:** rotate it with the provider, update it with `vercel env`, and redeploy.
