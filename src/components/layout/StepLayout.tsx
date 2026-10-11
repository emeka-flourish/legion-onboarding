import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

/**
 * Every step: the step on the left and a calm context panel on the right from 1,024 px. On a phone the
 * context sits below the primary action, never above it (TRD 8.2, rule 10; V12).
 */
export function StepLayout({
  title,
  subtitle,
  progress,
  onBack,
  backLabel = "Back",
  aside,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  progress?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={cx("flex flex-1 flex-col", Boolean(aside) && "lg:grid lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_440px]")}>
      <main id="main" className="flex-1 bg-linear-to-b from-white to-blue-50 px-4 pt-5 pb-10 sm:px-6 lg:px-12 lg:pt-10">
        <div className="mx-auto w-full max-w-xl">
          {(onBack || progress) && (
            <div className="mb-5 space-y-3">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm text-gray-700 hover:text-gray-900"
                >
                  <ArrowLeft aria-hidden className="size-4" />
                  {backLabel}
                </button>
              )}
              {progress}
            </div>
          )}
          <h1 className="text-[22px] leading-tight font-semibold text-balance text-gray-900 sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-2 text-base text-gray-600">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </main>
      {aside && (
        <aside
          aria-label="About this step"
          className={cx(
            "border-t border-line bg-slate-100 px-4 py-8 text-[15px] text-gray-700 sm:px-6",
            "lg:sticky lg:top-14 lg:h-[calc(100dvh-3.5rem)] lg:overflow-y-auto lg:border-t-0 lg:border-l lg:px-8 lg:py-10",
          )}
        >
          <div className="mx-auto max-w-xl space-y-6">{aside}</div>
        </aside>
      )}
    </div>
  );
}

export function AsideSection({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-gray-900">
        {icon}
        {title}
      </h2>
      <div className="space-y-2 text-gray-700">{children}</div>
    </section>
  );
}

export function FitProgress({ n, of }: { n: number; of: number }) {
  return (
    <div>
      <p className="text-sm text-gray-600">
        Question {n} of {of}
      </p>
      <div aria-hidden className="mt-2 flex max-w-md gap-1">
        {Array.from({ length: of }, (_, i) => (
          <span key={i} className={cx("h-1.5 flex-1 rounded-full", i < n - 1 ? "bg-green-600" : i === n - 1 ? "bg-primary" : "bg-gray-200")} />
        ))}
      </div>
    </div>
  );
}

export function StepProgress({ n, of }: { n: number; of: number }) {
  return (
    <div>
      <p className="text-sm text-gray-600">
        Step {n} of {of}
      </p>
      <div aria-hidden className="mt-2 h-1.5 max-w-md overflow-hidden rounded-full bg-gray-200">
        <div className="h-full rounded-full bg-primary" style={{ width: `${(n / of) * 100}%` }} />
      </div>
    </div>
  );
}
