// Core domain types for "Book fast, arrive ready" (TRD section 5.2).

export type PersonaId = "maya" | "jordan" | "sam";

export type Stage =
  | "fit" | "needs" | "help" | "pay" | "providers" | "hold" | "coverage" | "book" // book fast
  | "home" | "visit" | "after" // arrive ready
  | "crisis" | "not_a_fit"; // exits

export type FitQuestionId =
  | "texas" | "medicaid_medicare" | "risk_of_harm" | "recent_hospitalization" | "adult" | "virtual_only";
export type EligibilityReason =
  | "not_texas" | "medicaid_medicare" | "recent_hospitalization" | "under_18" | "not_virtual";

export type ConditionCode = "adhd" | "depression" | "anxiety" | "bipolar" | "ptsd" | "not_sure" | "other";
export type CareType = "existing_dx_medication" | "new_evaluation" | "not_sure";
export type PlanCode = "aetna" | "bcbs_tx" | "cigna" | "uhc" | "oscar" | "other" | "none";
export type TimeWindow = "weekday_morning" | "weekday_afternoon" | "weekday_evening" | "weekend";

export type ReadinessTaskId =
  | "identity" | "records" | "story" | "check_in" | "confirm_found" | "pharmacy" | "essentials";
export type TaskStatus = "todo" | "in_progress" | "done";

export interface Reason {
  code: string;
  label: string;
  source: string;
  shared: boolean;
}

export interface PreferenceChip {
  kind: "gender" | "language" | "focus" | "time" | "other";
  value: string;
  label: string;
}

export type JobKind = "coverage_verify" | "coverage_discover" | "records" | "med_history";
export interface ServiceJob {
  kind: JobKind;
  startedAt: string;
  readyAt: string;
  status: "pending" | "complete";
}

export interface SafetyFlag {
  id: string;
  type: "phq9_item9" | "crisis_language";
  raisedAt: string;
  reviewedAt?: string;
}

export type StoryItemKind =
  | "concern" | "onset" | "duration" | "trigger" | "prior_treatment" | "medication_mentioned" | "goal" | "preference";
export interface StoryItem {
  kind: StoryItemKind;
  text: string;
}

export interface FoundRecord {
  id: string;
  kind: "condition" | "allergy" | "hospitalization" | "visit";
  label: string;
  detail?: string;
  date?: string;
  source: string;
}

export interface FoundMedication {
  id: string;
  name: string;
  dose?: string;
  lastFilled?: string;
  pharmacyId?: string;
  controlled: boolean;
  source: string;
}

export interface CoverageState {
  mode: "insured" | "self_pay";
  plan: PlanCode;
  method?: "member_id" | "lookup";
  status: "not_started" | "pending" | "active" | "inactive" | "not_found";
  intakeCents?: number;
  followUpCents?: number;
  memberIdLast4?: string;
  dobGiven?: string;
  inactiveSince?: string;
  source: string;
  confirmLater: boolean;
}

export interface Essentials {
  hospitalizedEver: "no" | "yes";
  controlledNow: "no" | "yes";
  otherAllergies: string[];
  alcohol: "never" | "occasionally" | "weekly" | "daily";
  cannabis: "never" | "occasionally" | "weekly" | "daily";
  otherSubstances: "no" | "yes";
  contactName: string;
  contactPhone: string;
}

export interface Journey {
  id: string;
  createdAt: string;
  updatedAt: string;
  personaId?: PersonaId;
  demoPhone?: string; // demo patients only: a fictional 555-01xx number, randomized per journey
  timeZone: string;
  stage: Stage;
  sessions: number;
  fit: Partial<Record<FitQuestionId, boolean>>;
  eligibility?: { outcome: "eligible" | "screened_out" | "crisis"; reasonCode?: EligibilityReason };
  conditions: ConditionCode[];
  careType?: CareType;
  plan?: PlanCode;
  preferences: { windows: TimeWindow[]; chips: PreferenceChip[]; earlierOpeningAlert: boolean };
  selection?: { providerId: string; slotStart: string; rank: number };
  pendingPerson?: { firstName: string; phoneHash: string };
  person?: { personId: string; firstName: string; phoneHash: string; createdAt: string };
  coverage?: CoverageState;
  booking?: {
    appointmentId: string;
    providerId: string;
    start: string;
    end: string;
    timeZone: string;
    cardLast4: string;
    confirmedAt: string;
  };
  readiness: {
    tasks: Record<ReadinessTaskId, TaskStatus>;
    identity?: {
      legalName: string;
      dob: string;
      sexAtBirth: string;
      addressLine: string;
      city: string;
      zip: string;
      ageVerified: boolean;
      reviewFlag: boolean;
      source: string;
    };
    story?: StoryItem[];
    clinicianSummary?: { text: string; mode: "live" | "scripted"; provider?: string };
    foundRecords?: FoundRecord[];
    foundMedications?: FoundMedication[];
    confirmedRecordIds?: string[];
    confirmedMedicationIds?: string[];
    otherMedications?: string[];
    pharmacyId?: string;
    gad7: (number | null)[]; // 7 items, then the difficulty question at index 7
    phq9: (number | null)[]; // 9 items, then the difficulty question at index 9
    essentials?: Essentials;
    safetyFlags: SafetyFlag[];
    readyAt?: string;
  };
  visit?: { status: "in_progress" | "completed"; startedAt: string; completedAt?: string };
  after?: { summaryViewed: boolean; followUpStart?: string; prescriptionPharmacyId?: string };
  trustPulse?: number; // optional 1-5 answer after booking (goal 2)
  jobs: Partial<Record<JobKind, ServiceJob>>;
  counters: { typed: number; taps: number; aiCalls: number; rejectedEvents: number };
  demo: { slowInsurer: boolean; takeChosenSlot: boolean; takenSlots: string[] };
}

export interface JourneyEvent {
  id: string;
  v: 1;
  name: string;
  journeyId: string;
  personId?: string;
  session: number;
  ts: string;
  source: "patient_action" | "system_of_record";
  props: Record<string, string | number | boolean>;
}
