import { Check } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";

/** A large, full-width option. One tap answers the question. */
export function ChoiceButton({
  title,
  detail,
  selected,
  icon,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { title: ReactNode; detail?: ReactNode; selected?: boolean; icon?: ReactNode }) {
  return (
    <button
      type="button"
      {...rest}
      aria-pressed={selected ?? undefined}
      className={cx(
        "flex min-h-14 w-full items-start gap-3 rounded-lg border-2 bg-white px-4 py-3 text-left transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-60",
        selected ? "border-primary bg-blue-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
        className,
      )}
    >
      {icon && <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-gray-900">{title}</span>
        {detail && <span className="mt-0.5 block text-sm text-gray-600">{detail}</span>}
      </span>
      {selected && <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />}
    </button>
  );
}

/** A toggle chip, at least 44 px tall for touch. */
export function Chip({
  selected,
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      {...rest}
      aria-pressed={selected}
      className={cx(
        "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-60",
        selected ? "border-primary bg-primary text-white" : "border-gray-300 bg-white text-gray-800 hover:bg-gray-50",
        className,
      )}
    >
      {selected && <Check aria-hidden className="size-4" />}
      {children}
    </button>
  );
}

export function Checkbox({
  checked,
  onChange,
  children,
  name,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  name?: string;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md py-2 text-[15px] text-gray-800">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-5 shrink-0 accent-primary"
      />
      <span>{children}</span>
    </label>
  );
}
