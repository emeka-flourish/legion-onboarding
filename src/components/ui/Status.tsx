import { AlertCircle, AlertTriangle, CheckCircle2, Info, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 aria-hidden className={cx("animate-spin", className ?? "size-5")} />;
}

/** A waiting line that names what is happening and how long it has taken, so a wait never looks frozen. */
export function StatusLine({ children, seconds }: { children: ReactNode; seconds?: number }) {
  return (
    <p role="status" aria-live="polite" className="flex items-center gap-2 text-[15px] text-gray-700">
      <Spinner className="size-4 text-primary" />
      <span>
        {children}
        {seconds !== undefined && <span className="tabular-nums text-gray-600"> · {seconds} s</span>}
      </span>
    </p>
  );
}

/** Shown while a screen loads, so the page is never blank (V10). */
export function LoadingBlock({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3 py-2">
      <span className="sr-only">{label}…</span>
      <div className="h-6 w-2/3 animate-pulse rounded bg-gray-200" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
      <div className="h-24 w-full animate-pulse rounded-lg bg-gray-100" />
    </div>
  );
}

type Tone = "info" | "success" | "warning" | "error";
const TONE: Record<Tone, { box: string; icon: ReactNode }> = {
  info: { box: "border-blue-100 bg-blue-50", icon: <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" /> },
  success: { box: "border-green-200 bg-green-50", icon: <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-green-700" /> },
  warning: { box: "border-amber-200 bg-amber-50", icon: <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0 text-amber-700" /> },
  error: { box: "border-red-200 bg-red-50", icon: <AlertCircle aria-hidden className="mt-0.5 size-5 shrink-0 text-red-700" /> },
};

export function Notice({
  tone = "info",
  title,
  children,
  className,
  live,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  live?: boolean;
}) {
  return (
    <div role={live ? "status" : undefined} className={cx("flex gap-3 rounded-lg border p-4 text-[15px] text-gray-800", TONE[tone].box, className)}>
      {TONE[tone].icon}
      <div className="min-w-0 space-y-1">
        {title && <p className="font-semibold text-gray-900">{title}</p>}
        {children && <div className="space-y-2 text-gray-700">{children}</div>}
      </div>
    </div>
  );
}

/** A plain-language error under a form or action. Never a raw technical message (TRD 8.2). */
export function ErrorText({ children, id }: { children?: ReactNode; id?: string }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="flex items-start gap-1.5 text-sm text-red-700">
      <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
