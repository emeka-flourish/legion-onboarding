import type { NextRequest } from "next/server";
import { aiPreferenceNote } from "@/server/aiService";
import { journeyCookie, readJson, respond, serviceCtx } from "@/server/http";

// Model calls can take a few seconds, and the router may try more than one provider.
export const maxDuration = 30;

/** The optional preference note becomes chips that re-order the providers. */
export async function POST(req: NextRequest) {
  return respond(await aiPreferenceNote(serviceCtx(), journeyCookie(req), await readJson(req)));
}
