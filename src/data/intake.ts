// The guided conversation's fixed questions and follow-up bank (TRD 4.4). The AI never writes questions;
// it extracts confirmable items and may pick at most one follow-up per prompt, by ID, from this bank.

export const INTAKE_PROMPTS = [
  { id: 1, text: "What's been going on lately that made you reach out?", hint: "A few sentences is plenty." },
  { id: 2, text: "How long has this been happening, and has anything changed recently?", hint: "Rough timing is fine." },
  {
    id: 3,
    text: "What have you tried so far? That can include medications, therapy, or anything else.",
    hint: "Include anything that helped or didn't.",
  },
  { id: 4, text: "What would you most like to get out of your first visit?", hint: "There are no wrong answers." },
] as const;

export type PromptId = (typeof INTAKE_PROMPTS)[number]["id"];

export const FOLLOW_UPS = {
  sleep_impact: "How is this affecting your sleep?",
  work_impact: "How is this affecting work, school, or daily life?",
  onset_trigger: "Was there anything that seemed to set this off?",
  med_dose: "Do you remember the dose and how often you took it?",
  med_side_effects: "Did you notice any side effects?",
  therapy_history: "Have you worked with a therapist or counselor before? How did it go?",
  goal_clarify: "Is there one thing that would make this visit feel worthwhile?",
} as const;

export type FollowUpId = keyof typeof FOLLOW_UPS;
export const FOLLOW_UP_IDS = Object.keys(FOLLOW_UPS) as FollowUpId[];

export const STORY_KIND_LABEL = {
  concern: "What's going on",
  onset: "When it started",
  duration: "How long",
  trigger: "What set it off",
  prior_treatment: "What you've tried",
  medication_mentioned: "Medications mentioned",
  goal: "What you hope for",
  preference: "Preferences",
} as const;
