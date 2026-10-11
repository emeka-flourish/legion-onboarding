import type { NextRequest } from "next/server";
import { journeyCookie, readJson, respond, serviceCtx } from "@/server/http";
import { act } from "@/server/journeyService";

export async function POST(req: NextRequest) {
  return respond(await act(serviceCtx(), journeyCookie(req), await readJson(req)));
}
