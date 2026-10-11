import type { NextRequest } from "next/server";
import { aiIntake } from "@/server/aiService";
import { journeyCookie, readJson, respond, serviceCtx } from "@/server/http";

// Model calls can take a few seconds, and the router may try more than one provider.
export const maxDuration = 30;

/** One answer in the guided conversation becomes items the patient reviews. */
export async function POST(req: NextRequest) {
  return respond(await aiIntake(serviceCtx(), journeyCookie(req), await readJson(req)));
}
