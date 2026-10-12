import type { FollowUpId, PromptId } from "./intake";
import type {
  CareType,
  ConditionCode,
  Essentials,
  FitQuestionId,
  FoundMedication,
  FoundRecord,
  PersonaId,
  PlanCode,
  PreferenceChip,
  StoryItem,
  TimeWindow,
} from "@/domain/types";

// Three invented demo patients (PRODUCT_BRIEF section 6). Every detail is made up; phone numbers use the
// fictional 555-01xx range. Safe to ship to the browser: the demo controls use these presets.

export interface Persona {
  id: PersonaId;
  firstName: string;
  lastName: string;
  age: number;
  city: "Austin" | "Houston" | "El Paso";
  timeZone: string;
  oneLiner: string;
  phone: string;
  fit: Record<FitQuestionId, boolean>;
  conditions: ConditionCode[];
  careType: CareType;
  plan: PlanCode;
  windows: TimeWindow[];
  preferenceNote?: string;
  preferenceChips: PreferenceChip[];
  coverage: {
    memberId: string;
    dob: string;
    lookup: "found" | "not_found";
    verify: "active" | "inactive";
    intakeCents?: number;
    followUpCents?: number;
    inactiveSince?: string;
  };
  identity: { legalName: string; dob: string; sexAtBirth: string; addressLine: string; city: string; zip: string };
  records: FoundRecord[];
  medications: FoundMedication[];
  pharmacyFromHistory?: string;
  pharmacyChoice: string;
  otherMedications: string[];
  story: {
    answers: Record<PromptId, string>;
    extract: Record<PromptId, { items: StoryItem[]; followUpId: FollowUpId | null }>;
    followUpAnswers: Partial<Record<FollowUpId, string>>;
    followUpExtract: Partial<Record<FollowUpId, StoryItem[]>>;
    summary: string;
  };
  checkIn: { gad7: number[]; phq9: number[] };
  essentials: Essentials;
  visit: VisitOutcome;
}

/** A simulated e-prescription written at the first visit. */
export interface Prescription {
  name: string;
  strength: string;
  directions: string;
  change: "new" | "renewed" | "changed";
  quantity: string;
  refills: number;
  controlled: boolean;
  note?: string;
}

/** What the first visit produced, written ahead of time for each demo patient (TRD 6.4). */
export interface VisitOutcome {
  talkedAbout: string[];
  /** The provider's recommendations, apart from the prescription. */
  plan: string[];
  prescription?: Prescription;
  /** Medications the patient already takes, and what happens to them. */
  continuing: { name: string; note: string }[];
  nextSteps: string[];
  watchFor: string[];
  followUpWeeks: number;
}

// Journeys without a demo patient get a plain invented outcome, with no prescription (TRD 6.4).
export const GENERIC_VISIT: VisitOutcome = {
  talkedAbout: ["What's been going on, in your own words", "How you've been sleeping and feeling day to day"],
  plan: ["Try the sleep and stress strategies you talked through", "Consider therapy alongside your visits"],
  continuing: [],
  nextSteps: ["Read through your visit summary", "Book your follow-up so it's on your calendar"],
  watchFor: ["Message your care team if things get harder before your next visit", "Call or text 988 any time, day or night, if you have thoughts of harming yourself"],
  followUpWeeks: 4,
};

const ELIGIBLE_FIT: Record<FitQuestionId, boolean> = {
  texas: true,
  medicaid_medicare: false,
  risk_of_harm: false,
  recent_hospitalization: false,
  adult: true,
  virtual_only: true,
};

const RECORDS_NETWORK = "records network (simulated)";
const FILL_HISTORY = "Fill history · Surescripts via DoseSpot (simulated)";

export const PERSONAS: Record<PersonaId, Persona> = {
  maya: {
    id: "maya",
    firstName: "Maya",
    lastName: "Torres",
    age: 29,
    city: "Austin",
    timeZone: "America/Chicago",
    oneLiner: "Anxiety and depression · wants an evaluation · evenings · Blue Cross Blue Shield PPO",
    phone: "(512) 555-0142",
    fit: ELIGIBLE_FIT,
    conditions: ["anxiety", "depression"],
    careType: "new_evaluation",
    plan: "bcbs_tx",
    windows: ["weekday_evening"],
    preferenceNote: "I'd feel most comfortable with a woman, ideally someone who also speaks Spanish.",
    preferenceChips: [
      { kind: "gender", value: "woman", label: "Woman provider" },
      { kind: "language", value: "spanish", label: "Speaks Spanish" },
    ],
    coverage: { memberId: "XKB903318842", dob: "1997-03-14", lookup: "found", verify: "active", intakeCents: 4_000, followUpCents: 4_000 },
    identity: {
      legalName: "Maya Elena Torres",
      dob: "1997-03-14",
      sexAtBirth: "Female",
      addressLine: "2104 Elm Ridge Dr",
      city: "Austin",
      zip: "78704",
    },
    records: [
      {
        id: "rec-maya-3",
        kind: "visit",
        label: "Urgent care visit",
        detail: "Insomnia; no medication changes",
        date: "2026-02-07",
        source: `Hill Country Urgent Care · ${RECORDS_NETWORK}`,
      },
      {
        id: "rec-maya-1",
        kind: "visit",
        label: "Primary care visit",
        detail: "Anxiety and trouble sleeping discussed; hydroxyzine started as needed",
        date: "2025-11-18",
        source: `Lakeside Family Medicine · ${RECORDS_NETWORK}`,
      },
      {
        id: "rec-maya-4",
        kind: "condition",
        label: "Anxiety",
        detail: "On your primary care problem list",
        date: "2025-11-18",
        source: `Lakeside Family Medicine · ${RECORDS_NETWORK}`,
      },
      {
        id: "rec-maya-5",
        kind: "condition",
        label: "Insomnia",
        date: "2026-02-07",
        source: `Hill Country Urgent Care · ${RECORDS_NETWORK}`,
      },
      { id: "rec-maya-2", kind: "allergy", label: "Penicillin", detail: "Rash", source: `Lakeside Family Medicine · ${RECORDS_NETWORK}` },
      {
        id: "rec-maya-6",
        kind: "lab",
        label: "Thyroid test (TSH)",
        detail: "Normal",
        date: "2025-11-18",
        source: `Lakeside Family Medicine · ${RECORDS_NETWORK}`,
      },
      {
        id: "rec-maya-7",
        kind: "lab",
        label: "Blood pressure and heart rate",
        detail: "118/76, 72 beats a minute",
        date: "2026-02-07",
        source: `Hill Country Urgent Care · ${RECORDS_NETWORK}`,
      },
    ],
    medications: [
      {
        id: "med-maya-1",
        name: "Hydroxyzine HCl",
        dose: "25 mg tablet, as needed",
        lastFilled: "2026-08-14",
        pharmacyId: "riverside-austin",
        controlled: false,
        source: FILL_HISTORY,
        needsConfirmation: "Last filled two months ago. Uncheck it if you've stopped taking it.",
      },
    ],
    pharmacyFromHistory: "riverside-austin",
    pharmacyChoice: "riverside-austin",
    otherMedications: [],
    story: {
      answers: {
        1: "For about six months I've been anxious most days, and it's gotten worse since I started a new job. I lie awake worrying and I'm exhausted at work.",
        2: "It started around March. It got noticeably worse over the last two months, when my team grew and the deadlines piled up.",
        3: "My primary care doctor gave me hydroxyzine to take as needed. It helps me sleep sometimes, but I feel groggy the next day. I also tried a meditation app.",
        4: "I want to understand what's going on and talk about whether a daily medication could help. Maybe find a therapist too.",
      },
      extract: {
        1: {
          items: [
            { kind: "concern", text: "Anxious most days" },
            { kind: "concern", text: "Lying awake worrying" },
            { kind: "concern", text: "Exhausted at work" },
            { kind: "trigger", text: "Started a new job" },
          ],
          followUpId: "sleep_impact",
        },
        2: {
          items: [
            { kind: "onset", text: "Around March" },
            { kind: "duration", text: "About six months" },
            { kind: "trigger", text: "Bigger team and deadlines in the last two months" },
          ],
          followUpId: null,
        },
        3: {
          items: [
            { kind: "prior_treatment", text: "Hydroxyzine as needed, from primary care" },
            { kind: "medication_mentioned", text: "Hydroxyzine" },
            { kind: "prior_treatment", text: "Meditation app" },
          ],
          followUpId: "med_side_effects",
        },
        4: {
          items: [
            { kind: "goal", text: "Understand what's going on" },
            { kind: "goal", text: "Discuss whether a daily medication could help" },
            { kind: "goal", text: "Find a therapist" },
          ],
          followUpId: null,
        },
      },
      followUpAnswers: {
        sleep_impact: "Two or three nights a week I can't fall asleep until after 2 a.m.",
        med_side_effects: "Mostly grogginess the next morning, nothing else.",
      },
      followUpExtract: {
        sleep_impact: [{ kind: "concern", text: "Can't fall asleep until after 2 a.m., two or three nights a week" }],
        med_side_effects: [{ kind: "prior_treatment", text: "Hydroxyzine causes next-morning grogginess" }],
      },
      summary:
        "Maya, 29, describes about six months of anxiety most days, worse over the last two months as work demands grew after starting a new job. They lie awake worrying and cannot fall asleep until after 2 a.m. two or three nights a week, with daytime exhaustion. Their primary care clinician prescribed hydroxyzine as needed; it sometimes helps them sleep but leaves them groggy the next morning. They have also tried a meditation app. They hope to understand what is going on, discuss whether a daily medication could help, and find a therapist.",
    },
    checkIn: { gad7: [2, 2, 2, 1, 1, 1, 1, 1], phq9: [1, 1, 2, 2, 1, 1, 1, 0, 0, 1] },
    essentials: { hospitalizedEver: "no", controlledNow: "no", otherAllergies: [], alcohol: "occasionally", cannabis: "never", otherSubstances: "no", contactName: "Daniel Torres", contactPhone: "(512) 555-0177" },
    visit: {
      talkedAbout: [
        "About six months of daily anxiety, worse with work stress",
        "Trouble falling asleep two or three nights a week",
        "Next-morning grogginess from hydroxyzine",
      ],
      plan: [
        "Start a daily medication for anxiety at a low starting dose",
        "Use hydroxyzine only on nights you need it",
        "Start therapy alongside medication: your provider sent a list of therapists who see adults with anxiety",
      ],
      prescription: {
        name: "Sertraline",
        strength: "25 mg tablet",
        directions: "Take 1 tablet each morning with food",
        change: "new",
        quantity: "30 tablets (30 days)",
        refills: 1,
        controlled: false,
      },
      continuing: [{ name: "Hydroxyzine HCl 25 mg", note: "As needed for sleep. No change." }],
      nextSteps: [
        "Pick up sertraline at your pharmacy. They'll text you when it's ready.",
        "Start it tomorrow morning. Mild nausea or headaches in the first week or two are common and usually fade.",
        "Contact one therapist from the list this week.",
      ],
      watchFor: [
        "Message your care team if side effects bother you or haven't eased after two weeks",
        "Call or text 988 any time, day or night, if you have thoughts of harming yourself",
      ],
      followUpWeeks: 4,
    },
  },
  jordan: {
    id: "jordan",
    firstName: "Jordan",
    lastName: "Ellis",
    age: 34,
    city: "Houston",
    timeZone: "America/Chicago",
    oneLiner: "ADHD, diagnosed years ago · medication management · self-pay · mornings or weekends only",
    phone: "(713) 555-0186",
    fit: ELIGIBLE_FIT,
    conditions: ["adhd"],
    careType: "existing_dx_medication",
    plan: "none",
    windows: ["weekday_morning", "weekend"],
    preferenceChips: [],
    coverage: { memberId: "", dob: "1992-07-02", lookup: "not_found", verify: "inactive" },
    identity: {
      legalName: "Jordan Michael Ellis",
      dob: "1992-07-02",
      sexAtBirth: "Male",
      addressLine: "811 Heights Blvd",
      city: "Houston",
      zip: "77008",
    },
    records: [],
    medications: [], // his recent fills were paid in cash, so they never reach the fill history
    pharmacyChoice: "heights-houston",
    otherMedications: ["Amphetamine salts XR 20 mg, each morning (paid cash)"],
    story: {
      answers: {
        1: "I was diagnosed with ADHD in college and took medication for years. My psychiatrist retired this summer and I'm almost out. Without it I can't focus at work.",
        2: "Since my refills ran low about three weeks ago. Before that it was well controlled.",
        3: "Extended-release amphetamine salts, 20 milligrams every morning, for about eight years. I paid cash for the last few fills.",
        4: "Get back on a stable prescription with someone I can keep seeing.",
      },
      extract: {
        1: {
          items: [
            { kind: "concern", text: "ADHD, diagnosed in college" },
            { kind: "concern", text: "Almost out of medication" },
            { kind: "concern", text: "Hard to focus at work without it" },
            { kind: "trigger", text: "Previous psychiatrist retired" },
          ],
          followUpId: "work_impact",
        },
        2: {
          items: [
            { kind: "onset", text: "About three weeks ago, when refills ran low" },
            { kind: "duration", text: "Well controlled for years before that" },
          ],
          followUpId: null,
        },
        3: {
          items: [
            { kind: "medication_mentioned", text: "Amphetamine salts XR 20 mg each morning" },
            { kind: "prior_treatment", text: "About eight years on the same medication" },
            { kind: "prior_treatment", text: "Recent fills paid in cash" },
          ],
          followUpId: null,
        },
        4: {
          items: [
            { kind: "goal", text: "Restart a stable prescription" },
            { kind: "goal", text: "Ongoing care with one provider" },
          ],
          followUpId: null,
        },
      },
      followUpAnswers: { work_impact: "I'm missing deadlines, and it takes me twice as long to get through my email." },
      followUpExtract: { work_impact: [{ kind: "concern", text: "Missing deadlines at work" }] },
      summary:
        "Jordan, 34, was diagnosed with ADHD in college and has taken extended-release amphetamine salts 20 mg each morning for about eight years, which they describe as well controlled. Their previous psychiatrist retired this summer, and their supply ran low about three weeks ago; since then they report trouble focusing and missed deadlines at work. Recent fills were paid in cash, so they may not appear in pharmacy history. They are looking for an ongoing prescriber and a stable prescription.",
    },
    checkIn: { gad7: [1, 0, 1, 1, 1, 1, 0, 1], phq9: [0, 1, 1, 1, 0, 0, 2, 1, 0, 1] },
    essentials: { hospitalizedEver: "no", controlledNow: "yes", otherAllergies: [], alcohol: "weekly", cannabis: "occasionally", otherSubstances: "no", contactName: "Alex Ellis", contactPhone: "(713) 555-0151" },
    visit: {
      talkedAbout: [
        "ADHD diagnosed in college, well controlled on the same medication for years",
        "Running low since your last psychiatrist retired",
        "Missed deadlines at work while you've been without it",
      ],
      plan: [
        "Continue your ADHD medication at the same dose",
        "Monthly visits while you take a controlled medication, so each prescription is renewed on time",
      ],
      prescription: {
        name: "Mixed amphetamine salts, extended-release",
        strength: "20 mg capsule",
        directions: "Take 1 capsule each morning",
        change: "renewed",
        quantity: "30 capsules (30 days)",
        refills: 0,
        controlled: true,
        note: "A controlled medication: sent electronically after your provider checked your Texas prescription monitoring record. Each month needs a new prescription.",
      },
      continuing: [],
      nextSteps: [
        "Pick up your prescription at your pharmacy. Bring your ID: controlled medications need it at pickup.",
        "Take it each morning, as before.",
      ],
      watchFor: [
        "Message your care team about trouble sleeping, a racing heart, or a poor appetite",
        "Keep your medication somewhere safe, and never share it",
      ],
      followUpWeeks: 4,
    },
  },
  sam: {
    id: "sam",
    firstName: "Sam",
    lastName: "Rivera",
    age: 22,
    city: "El Paso",
    timeZone: "America/Denver",
    oneLiner: "Depression · wants an evaluation · afternoons · Aetna plan that turns out inactive",
    phone: "(915) 555-0127",
    fit: ELIGIBLE_FIT,
    conditions: ["depression"],
    careType: "new_evaluation",
    plan: "aetna",
    windows: ["weekday_afternoon"],
    preferenceChips: [],
    coverage: { memberId: "W4429108573", dob: "2004-05-21", lookup: "not_found", verify: "inactive", inactiveSince: "2026-09-30" },
    identity: {
      legalName: "Samuel Rivera",
      dob: "2004-05-21",
      sexAtBirth: "Male",
      addressLine: "1220 N Oregon St",
      city: "El Paso",
      zip: "79902",
    },
    records: [
      {
        id: "rec-sam-2",
        kind: "visit",
        label: "Student health visit",
        detail: "Low mood and trouble focusing discussed; referred to campus counseling",
        date: "2026-03-04",
        source: `Sun City Student Health · ${RECORDS_NETWORK}`,
      },
      {
        id: "rec-sam-1",
        kind: "visit",
        label: "Urgent care visit",
        detail: "Sinus infection, treated",
        date: "2025-06-12",
        source: `Desert View Urgent Care · ${RECORDS_NETWORK}`,
      },
    ],
    medications: [],
    pharmacyChoice: "mesa-elpaso",
    otherMedications: [],
    story: {
      answers: {
        1: "I've felt down and unmotivated for a while. I moved to El Paso for school last year and I don't really have friends here yet. I've stopped going to some classes.",
        2: "Probably since last winter. It got worse this semester.",
        3: "Nothing really. I talked to a school counselor once.",
        4: "I just want to feel like myself again and figure out what would help.",
      },
      extract: {
        1: {
          items: [
            { kind: "concern", text: "Feeling down and unmotivated" },
            { kind: "concern", text: "Skipping some classes" },
            { kind: "trigger", text: "Moved for school last year; few friends nearby" },
          ],
          followUpId: null,
        },
        2: {
          items: [
            { kind: "onset", text: "Since last winter" },
            { kind: "trigger", text: "Worse this semester" },
          ],
          followUpId: null,
        },
        3: {
          items: [{ kind: "prior_treatment", text: "One conversation with a school counselor" }],
          followUpId: "therapy_history",
        },
        4: {
          items: [
            { kind: "goal", text: "Feel like myself again" },
            { kind: "goal", text: "Figure out what would help" },
          ],
          followUpId: null,
        },
      },
      followUpAnswers: { therapy_history: "Just once. It was fine, but I didn't go back." },
      followUpExtract: { therapy_history: [{ kind: "prior_treatment", text: "Didn't continue with counseling" }] },
      summary:
        "Sam, 22, describes feeling down and unmotivated since last winter, worse this semester, after moving to El Paso for school with few friends nearby. They have started skipping some classes. They spoke with a school counselor once and did not continue. They hope to feel like themselves again and to understand what would help.",
    },
    checkIn: { gad7: [1, 1, 1, 1, 0, 1, 1, 1], phq9: [2, 2, 1, 2, 1, 2, 2, 0, 1, 2] },
    essentials: { hospitalizedEver: "no", controlledNow: "no", otherAllergies: [], alcohol: "occasionally", cannabis: "never", otherSubstances: "no", contactName: "Rosa Rivera", contactPhone: "(915) 555-0133" },
    visit: {
      talkedAbout: [
        "Feeling down and unmotivated since last winter",
        "Moving for school and missing some classes",
        "Your answer about thoughts of being better off dead, which your provider talked through with you",
      ],
      plan: [
        "Weekly therapy with a counselor who sees students (referral sent)",
        "No medication for now. You'll talk about it again at your next visit.",
        "The safety plan you made together during the visit",
      ],
      continuing: [],
      nextSteps: [
        "The counseling team will call you this week to set up your first session.",
        "Keep your safety plan somewhere easy to find, like your phone's notes.",
      ],
      watchFor: [
        "Call or text 988 any time, day or night, if you have thoughts of harming yourself",
        "If you're in danger right now, call 911",
      ],
      followUpWeeks: 2,
    },
  },
};

export const PERSONA_IDS: PersonaId[] = ["maya", "jordan", "sam"];

/** The first visit's outcome for a journey: the demo patient's, or the generic one. */
export const visitFor = (personaId?: PersonaId): VisitOutcome => (personaId ? PERSONAS[personaId].visit : GENERIC_VISIT);
