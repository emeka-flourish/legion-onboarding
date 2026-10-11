import { Database, FlaskConical, Sparkles } from "lucide-react";
import type { AiMeta } from "@/ai/types";
import { PROVIDER_LABEL } from "@/config/ai.config";
import { cx } from "@/lib/cx";

const PILL = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap";

/** On every simulated result: nothing here is a real vendor call (TRD 8.2). */
export function SimulatedTag({ label = "Simulated", className }: { label?: string; className?: string }) {
  return (
    <span className={cx(PILL, "bg-gray-100 text-gray-700 ring-1 ring-gray-200", className)}>
      <FlaskConical aria-hidden className="size-3" />
      {label}
    </span>
  );
}

/** On every AI-produced item: whether a live model or the scripted fallback produced it. */
export function AiTag({ meta, className }: { meta?: Pick<AiMeta, "mode" | "provider">; className?: string }) {
  const text = !meta ? "AI" : meta.mode === "live" && meta.provider ? `AI · live (${PROVIDER_LABEL[meta.provider]})` : "AI · scripted";
  return (
    <span className={cx(PILL, "bg-violet-50 text-violet-800 ring-1 ring-violet-200", className)}>
      <Sparkles aria-hidden className="size-3" />
      {text}
    </span>
  );
}

/** On every prefilled fact: where it came from. */
export function SourceTag({ source, className }: { source: string; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1 text-xs text-gray-600", className)}>
      <Database aria-hidden className="size-3 shrink-0" />
      <span>{source}</span>
    </span>
  );
}
