"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { ErrorText } from "./Status";

/** A labeled input whose problems appear next to it in plain words (TRD 8.2, rule 7). */
export function TextField({
  label,
  hint,
  error,
  className,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; hint?: ReactNode; error?: ReactNode }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={cx("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-900">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-sm text-gray-600">
          {hint}
        </p>
      )}
      <input
        id={id}
        {...input}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        className={cx(
          "block h-11 w-full rounded-md border bg-white px-3 text-base text-gray-900 placeholder:text-gray-500",
          "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30",
          error ? "border-red-600" : "border-gray-300",
        )}
      />
      <ErrorText id={errorId}>{error}</ErrorText>
    </div>
  );
}
