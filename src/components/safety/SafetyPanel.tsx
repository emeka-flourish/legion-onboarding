import { MessageSquare, Phone } from "lucide-react";
import type { ReactNode } from "react";
import { buttonClass } from "@/components/ui/Button";

/**
 * Crisis resources (TRD 8.2, V8): 988 and 911 come first and fit above the fold on a phone.
 * The panel never offers booking. Rules decide when it appears; a model never does.
 */
export function SafetyPanel({ title = "Help is available right now", children }: { title?: string; children?: ReactNode }) {
  return (
    <section aria-labelledby="safety-title" className="rounded-lg border-2 border-red-200 bg-red-50 p-5">
      <h2 id="safety-title" className="text-lg font-semibold text-gray-900">
        {title}
      </h2>
      <p className="mt-1 text-[15px] text-gray-800">
        If you might hurt yourself or someone else, please reach out now. You don&apos;t have to wait for an appointment.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <a href="tel:988" className={buttonClass("danger", true)}>
          <Phone aria-hidden className="size-4" />
          Call 988
        </a>
        <a href="sms:988" className={buttonClass("outline", true)}>
          <MessageSquare aria-hidden className="size-4" />
          Text 988
        </a>
      </div>
      <ul className="mt-4 space-y-2 text-[15px] text-gray-800">
        <li>
          <strong>In immediate danger?</strong> Call{" "}
          <a href="tel:911" className="font-semibold text-red-800 underline">
            911
          </a>{" "}
          or go to the nearest emergency room.
        </li>
        <li>The 988 Suicide &amp; Crisis Lifeline is free and open 24 hours a day, every day.</li>
        <li>
          Prefer texting? Text HOME to{" "}
          <a href="sms:741741" className="font-semibold text-gray-900 underline">
            741741
          </a>{" "}
          to reach the Crisis Text Line.
        </li>
      </ul>
      {children && <div className="mt-4 border-t border-red-200 pt-4 text-[15px] text-gray-800">{children}</div>}
    </section>
  );
}

/** The always-visible help line on clinical screens (TRD 8.2, rule 9). */
export function HelpLine() {
  return (
    <p className="text-sm text-gray-700">
      Need help now?{" "}
      <a href="tel:988" className="font-semibold text-red-800 underline">
        Call or text 988
      </a>
    </p>
  );
}
