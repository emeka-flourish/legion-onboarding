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
