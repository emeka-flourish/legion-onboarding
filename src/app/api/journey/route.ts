import type { NextRequest } from "next/server";
import { journeyCookie, readJson, respond, serviceCtx } from "@/server/http";
import { createJourney, forget, getJourney } from "@/server/journeyService";

/** Start a journey (optionally as a demo patient). */
export async function POST(req: NextRequest) {
  return respond(await createJourney(serviceCtx(), await readJson(req)));
}

/** The current journey, after resolving any simulated service whose answer is due. */
export async function GET(req: NextRequest) {
  return respond(await getJourney(serviceCtx(), journeyCookie(req)));
}

/** Demo control: forget this device's cookie to simulate a return visit. */
export async function DELETE() {
  return respond(forget());
}
