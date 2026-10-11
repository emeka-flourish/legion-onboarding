import type { NextRequest } from "next/server";
import { readJson, respond, serviceCtx } from "@/server/http";
import { reviewFlag } from "@/server/viewService";

/** "Mark reviewed" for a safety flag in the people-in-progress panel (demo mode only). */
export async function POST(req: NextRequest) {
  return respond(await reviewFlag(serviceCtx(), await readJson(req)));
}
