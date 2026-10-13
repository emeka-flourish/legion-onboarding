// Today's onboarding funnel, from the PostHog table in the assignment brief (discovery/funnel-analysis.md).
// Counted per browser session, and it stops at reaching the payment page.
export const TODAY_SOURCE =
  "Legion's PostHog funnel in the assignment brief: production, 30 days to Aug 29, 2026, counted per browser session.";

export const TODAY_FUNNEL: { label: string; sessions: number; note?: string }[] = [
  { label: "Start", sessions: 5_898 },
  { label: "Fit check page reached", sessions: 5_490, note: "reach, not completion" },
  { label: "Conditions page", sessions: 3_578 },
  { label: "Insurance page", sessions: 3_338 },
  { label: "Needs page", sessions: 3_095 },
  { label: "Match page", sessions: 3_013 },
  { label: "Provider selected", sessions: 1_909 },
  { label: "Reservation created", sessions: 1_764 },
  { label: "Patient details page", sessions: 1_763 },
  { label: "Account created", sessions: 1_403 },
  { label: "Payment page reached", sessions: 1_403, note: "reach, not payment; measurement stops here" },
];
