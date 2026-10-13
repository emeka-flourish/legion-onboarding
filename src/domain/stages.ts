import type { Stage } from "./types";

export const BOOK_FAST: Stage[] = ["fit", "needs", "help", "pay", "providers", "hold", "coverage", "book"];

export const STAGE_ROUTE: Record<Stage, string> = {
  fit: "/start/fit",
  needs: "/start/needs",
  help: "/start/help",
  pay: "/start/pay",
  providers: "/start/providers",
  hold: "/start/hold",
  coverage: "/start/coverage",
  book: "/start/book",
  home: "/home",
  visit: "/visit",
  after: "/after",
  crisis: "/start/crisis",
  not_a_fit: "/start/not-a-fit",
};

/** Step number shown in the "Book fast" progress bar (fit check has its own question counter). */
export function bookFastStep(stage: Stage): number | null {
  const steps: Stage[] = ["needs", "help", "pay", "providers", "hold", "coverage", "book"];
  const i = steps.indexOf(stage);
  return i === -1 ? null : i + 1;
}
export const BOOK_FAST_STEP_COUNT = 7;

/** Where "Back" goes before booking. After booking, earlier stages can't be changed. */
export function previousStage(j: { stage: Stage; coverage?: { mode: "insured" | "self_pay" } }): Stage | null {
  switch (j.stage) {
    case "needs":
      return "fit";
    case "help":
      return "needs";
    case "pay":
      return "help";
    case "providers":
      return "pay";
    case "hold":
    case "coverage":
      return "providers";
    case "book":
      return j.coverage?.mode === "insured" ? "coverage" : "providers";
    case "not_a_fit":
      return "fit";
    default:
      return null;
  }
}

/** How the welcome-back screen names where the patient left off. Never a health detail (TRD 8.1). */
export const STAGE_LABEL: Record<Stage, string> = {
  fit: "the fit check",
  needs: "telling us what you need",
  help: "choosing the kind of help",
  pay: "choosing how you'll pay",
  providers: "choosing a provider and time",
  hold: "holding your time",
  coverage: "confirming your coverage",
  book: "booking your visit",
  home: "getting ready for your visit",
  visit: "your visit",
  after: "after your visit",
  crisis: "the resources we shared",
  not_a_fit: "the resources we shared",
};
