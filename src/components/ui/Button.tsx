import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Spinner } from "./Status";

type Variant = "primary" | "outline" | "quiet" | "danger";

const BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md text-[15px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const VARIANT: Record<Variant, string> = {
  primary: "bg-primary px-5 text-white hover:bg-primary-strong",
  outline: "border border-gray-300 bg-white px-5 text-gray-800 hover:bg-gray-50",
  quiet: "px-2 text-gray-700 underline-offset-4 hover:text-gray-900 hover:underline",
  danger: "bg-red-700 px-5 text-white hover:bg-red-800",
};

export function buttonClass(variant: Variant = "primary", full = false) {
  return cx(BASE, VARIANT[variant], full && "w-full");
}

export function Button({
  variant = "primary",
  full,
  loading,
  className,
  children,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; full?: boolean; loading?: boolean }) {
  return (
    <button
      type={type}
      {...rest}
      disabled={rest.disabled || loading}
      aria-busy={loading || undefined}
      className={cx(buttonClass(variant, full), className)}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "primary",
  full,
  className,
  children,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; variant?: Variant; full?: boolean; children: ReactNode }) {
  return (
    <Link href={href} {...rest} className={cx(buttonClass(variant, full), className)}>
      {children}
    </Link>
  );
}
