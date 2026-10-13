import type { NextRequest } from "next/server";
import { rxnormLookup } from "@/server/aiService";
import { journeyCookie, respond, serviceCtx } from "@/server/http";

/** Live RxNorm match for a medication name mentioned in the conversation (stretch, TAC-35). */
export async function GET(req: NextRequest) {
  return respond(await rxnormLookup(serviceCtx(), journeyCookie(req), { term: req.nextUrl.searchParams.get("term") ?? "" }));
}
