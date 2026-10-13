import type { NextRequest } from "next/server";
import { readJson, respond, serviceCtx } from "@/server/http";
import { resumeVerify } from "@/server/journeyService";

export async function POST(req: NextRequest) {
  return respond(await resumeVerify(serviceCtx(), await readJson(req)));
}
