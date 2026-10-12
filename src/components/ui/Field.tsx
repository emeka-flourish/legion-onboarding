"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { maskUsDate } from "@/lib/dates";
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

/** A date of birth typed as MM/DD/YYYY, with the slashes added as the patient types. */
export function DobField({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <TextField
      label="Date of birth"
      hint="MM/DD/YYYY"
      inputMode="numeric"
      autoComplete="bday"
      placeholder="MM/DD/YYYY"
      value={value}
      onChange={(e) => onChange(maskUsDate(e.target.value))}
      error={error}
      maxLength={10}
    />
  );
}

/** A labeled native select, styled like TextField. */
export function SelectField({
  label,
  options,
  className,
  ...select
}: SelectHTMLAttributes<HTMLSelectElement> & { label: ReactNode; options: readonly (readonly [string, string])[] }) {
  const id = useId();
  return (
    <div className={cx("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-900">
        {label}
      </label>
      <select
        id={id}
        {...select}
        className="block h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-base text-gray-900 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
      >
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </div>
  );
}
