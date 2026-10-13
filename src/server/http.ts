import { NextResponse, type NextRequest } from "next/server";
import { getStore } from "@/store";
import { demoMode } from "./env";
import type { Result, ServiceCtx } from "./journeyService";
import { COOKIE_MAX_AGE, JOURNEY_COOKIE } from "./session";

export function serviceCtx(): ServiceCtx {
  return { store: getStore(), now: new Date(), demoMode: demoMode() };
}

export const journeyCookie = (req: NextRequest) => req.cookies.get(JOURNEY_COOKIE)?.value;

export async function readJson(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}

export function respond<T>(result: Result<T>): NextResponse {
  const res = NextResponse.json(result.body, { status: result.status, headers: { "Cache-Control": "no-store" } });
  if (result.cookie === null) {
    res.cookies.delete(JOURNEY_COOKIE);
  } else if (result.cookie !== undefined) {
    res.cookies.set({
      name: JOURNEY_COOKIE,
      value: result.cookie,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });
  }
  return res;
}
