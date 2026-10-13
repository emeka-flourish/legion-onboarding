import type { NextRequest } from "next/server";
import { aiSummary } from "@/server/aiService";
import { journeyCookie, readJson, respond, serviceCtx } from "@/server/http";

// Model calls can take a few seconds, and the router may try more than one provider.
export const maxDuration = 30;

/** The reviewed items become the clinician summary the patient confirms. */
export async function POST(req: NextRequest) {
  return respond(await aiSummary(serviceCtx(), journeyCookie(req), await readJson(req)));
}
