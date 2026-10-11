import { z } from "zod";

// Every patient action, validated at the boundary (TRD 6.1).
const condition = z.enum(["adhd", "depression", "anxiety", "bipolar", "ptsd", "not_sure", "other"]);
const careType = z.enum(["existing_dx_medication", "new_evaluation", "not_sure"]);
const plan = z.enum(["aetna", "bcbs_tx", "cigna", "uhc", "oscar", "other", "none"]);
const window = z.enum(["weekday_morning", "weekday_afternoon", "weekday_evening", "weekend"]);
const frequency = z.enum(["never", "occasionally", "weekly", "daily"]);

export const preferenceChipSchema = z.object({
  kind: z.enum(["gender", "language", "focus", "time", "other"]),
  value: z.string().trim().min(1).max(30),
  label: z.string().trim().min(1).max(40),
});

export const storyItemSchema = z.object({
  kind: z.enum(["concern", "onset", "duration", "trigger", "prior_treatment", "medication_mentioned", "goal", "preference"]),
  text: z.string().trim().min(1).max(120),
});

export const actionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("ANSWER_FIT"),
    questionId: z.enum(["texas", "medicaid_medicare", "risk_of_harm", "recent_hospitalization", "adult", "virtual_only"]),
    answer: z.boolean(),
  }),
  z.object({ type: z.literal("GO_BACK") }),
  z.object({ type: z.literal("SET_CONDITIONS"), conditions: z.array(condition).min(1).max(7) }),
  z.object({ type: z.literal("SET_CARE_TYPE"), careType }),
  z.object({ type: z.literal("SET_PLAN"), plan }),
  z.object({ type: z.literal("SET_TIME_WINDOWS"), windows: z.array(window).max(4) }),
  z.object({ type: z.literal("APPLY_PREFERENCE_CHIPS"), chips: z.array(preferenceChipSchema).max(5), mode: z.enum(["live", "scripted"]) }),
  z.object({ type: z.literal("SET_EARLIER_ALERT"), on: z.boolean() }),
  z.object({ type: z.literal("SELECT_SLOT"), providerId: z.string().max(40), slotStart: z.iso.datetime() }),
  z.object({ type: z.literal("HOLD_START"), firstName: z.string().trim().min(1).max(40), phone: z.string().trim().min(7).max(24) }),
  z.object({ type: z.literal("HOLD_VERIFY"), code: z.string().regex(/^\d{6}$/) }),
  z.object({
    type: z.literal("COVERAGE_SUBMIT"),
    method: z.enum(["member_id", "lookup"]),
    memberId: z.string().trim().max(24).optional(),
    dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  z.object({ type: z.literal("COVERAGE_CONTINUE") }),
  z.object({ type: z.literal("COVERAGE_USE_SELF_PAY") }),
  z.object({ type: z.literal("COVERAGE_TRY_AGAIN") }),
  z.object({ type: z.literal("CHANGE_PLAN") }),
  z.object({ type: z.literal("COVERAGE_CONFIRM_LATER") }),
  z.object({
    type: z.literal("BOOK"),
    consents: z.object({ terms: z.literal(true), treatment: z.literal(true), recording: z.literal(true) }),
    cardLast4: z.string().regex(/^\d{4}$/),
  }),
  z.object({ type: z.literal("ID_VERIFY") }),
  z.object({ type: z.literal("RECORDS_CONSENT") }),
  z.object({
    type: z.literal("STORY_CONFIRM"),
    items: z.array(storyItemSchema).max(30),
    summary: z.object({
      text: z.string().trim().min(1).max(1500),
      mode: z.enum(["live", "scripted"]),
      provider: z.string().max(20).optional(),
    }),
    typedAnswers: z.number().int().min(0).max(12),
  }),
  z.object({
    type: z.literal("CHECKIN_ANSWER"),
    instrument: z.enum(["gad7", "phq9"]),
    index: z.number().int().min(0).max(9),
    value: z.number().int().min(0).max(3),
  }),
  z.object({
    type: z.literal("CONFIRM_FOUND"),
    recordIds: z.array(z.string().max(40)).max(30),
    medicationIds: z.array(z.string().max(40)).max(30),
    otherMedications: z.array(z.string().trim().min(1).max(80)).max(10),
  }),
  z.object({ type: z.literal("SET_PHARMACY"), pharmacyId: z.string().max(40) }),
  z.object({
    type: z.literal("SET_ESSENTIALS"),
    hospitalizedEver: z.enum(["no", "yes"]),
    controlledNow: z.enum(["no", "yes"]),
    otherAllergies: z.array(z.string().trim().min(1).max(60)).max(10),
    alcohol: frequency,
    cannabis: frequency,
    otherSubstances: z.enum(["no", "yes"]),
    contactName: z.string().trim().min(1).max(60),
    contactPhone: z.string().trim().min(7).max(24),
  }),
  z.object({ type: z.literal("TRUST_PULSE"), score: z.number().int().min(1).max(5) }),
  z.object({ type: z.literal("JOIN_VISIT") }),
  z.object({ type: z.literal("END_VISIT") }),
  z.object({ type: z.literal("VIEW_SUMMARY") }),
  z.object({ type: z.literal("BOOK_FOLLOW_UP"), slotStart: z.iso.datetime() }),
  z.object({ type: z.literal("DEMO_SET"), slowInsurer: z.boolean().optional(), takeChosenSlot: z.boolean().optional() }),
  z.object({ type: z.literal("DEMO_REVIEW_FLAG"), flagId: z.string().max(40) }),
]);

export type Action = z.infer<typeof actionSchema>;
