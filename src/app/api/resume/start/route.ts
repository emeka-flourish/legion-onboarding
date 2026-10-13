import type { NextRequest } from "next/server";
import { readJson, respond, serviceCtx } from "@/server/http";
import { resumeStart } from "@/server/journeyService";

export async function POST(req: NextRequest) {
  return respond(await resumeStart(serviceCtx(), await readJson(req)));
}
