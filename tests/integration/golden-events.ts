// Golden event sequences (TAC-36): each demo patient's full approved journey must record exactly these events,
// in this order. A missing, extra, or reordered event fails the test, so telemetry gaps can't slip in unnoticed.
// Checked by hand against the journey design on 2026-10-10 before being frozen.

const BOOK_FAST_START = [
  "onboarding_started",
  "eligibility_evaluated",
  "care_need_captured",
  "care_need_captured",
  "coverage_selected",
  "providers_presented",
];

const BOOKING = ["consents_signed", "payment_method_added", "appointment_confirmed", "reminder_sent", "trust_pulse_answered"];

const SEARCHES = ["identity_verified", "records_requested", "records_received", "med_history_received"];

const READY = [
  "intake_task_completed", // story
  "intake_task_completed", // check-in
  "intake_task_completed", // confirm found
  "intake_task_completed", // pharmacy
  "intake_task_completed", // essential history
  "visit_ready",
];

const VISIT_START = ["reminder_sent", "visit_join_attempted", "visit_started", "first_visit_completed"];

export const GOLDEN: Record<"maya" | "jordan" | "sam", string[]> = {
  maya: [
    ...BOOK_FAST_START,
    "slot_selected",
    "reservation_created",
    "account_created",
    "coverage_check_started",
    "coverage_verified", // active
    ...BOOKING,
    ...SEARCHES,
    ...READY,
    ...VISIT_START,
    "prescription_sent",
    "visit_summary_viewed",
    "follow_up_booked",
  ],
  jordan: [
    ...BOOK_FAST_START,
    "earlier_opening_alert_set", // no openings in his times
    "slot_selected",
    "reservation_created",
    "account_created", // self-pay: no coverage events
    ...BOOKING,
    ...SEARCHES,
    ...READY,
    ...VISIT_START,
    "prescription_sent",
    "visit_summary_viewed",
    "follow_up_booked",
  ],
  sam: [
    ...BOOK_FAST_START,
    "slot_selected",
    "reservation_created",
    "account_created",
    "coverage_check_started", // lookup
    "coverage_verified", // not found
    "coverage_check_started", // member ID
    "coverage_verified", // inactive
    "coverage_selected", // switches to self-pay
    ...BOOKING,
    ...SEARCHES,
    "intake_task_completed", // story
    "safety_flag_raised", // PHQ-9 item 9
    "crisis_resources_shown",
    "intake_task_completed", // check-in
    "intake_task_completed", // confirm found
    "intake_task_completed", // pharmacy
    "intake_task_completed", // essential history
    "visit_ready",
    ...VISIT_START,
    "visit_summary_viewed", // no prescription for Sam
    "follow_up_booked",
  ],
};
