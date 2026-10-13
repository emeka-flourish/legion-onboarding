// Browser-side calls to the app's own API. Errors come back as plain sentences, never raw technical messages.

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error?: string; message: string };

const OFFLINE = "We couldn't reach Legion just now. Please check your connection and try again.";
const GENERIC = "Something went wrong on our side. Please try again.";

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: init.method ?? (init.body === undefined ? "GET" : "POST"),
      headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 0, message: OFFLINE };
  }
  const json = (await res.json().catch(() => null)) as (T & { error?: string; message?: string }) | null;
  if (!res.ok) {
    const plain = res.status < 500 && typeof json?.message === "string" ? json.message : GENERIC;
    return { ok: false, status: res.status, error: json?.error, message: plain };
  }
  return { ok: true, status: res.status, data: json as T };
}
