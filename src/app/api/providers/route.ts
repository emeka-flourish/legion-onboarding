import type { NextRequest } from "next/server";
import { journeyCookie, respond, serviceCtx } from "@/server/http";
import { providers } from "@/server/journeyService";

/** The three best fits (and everyone eligible) for the current journey. Records providers_presented. */
export async function POST(req: NextRequest) {
  return respond(await providers(serviceCtx(), journeyCookie(req)));
}
