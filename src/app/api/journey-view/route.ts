import type { NextRequest } from "next/server";
import { journeyCookie, respond, serviceCtx } from "@/server/http";
import { journeyView } from "@/server/viewService";

/** The journey view's five panels, computed when it opens (demo mode only). */
export async function GET(req: NextRequest) {
  return respond(await journeyView(serviceCtx(), journeyCookie(req)));
}
