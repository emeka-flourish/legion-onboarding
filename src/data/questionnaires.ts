// GAD-7 and PHQ-9, word for word (L10, principle 8). Public-domain instruments (Pfizer).
// Do not edit this wording; a test compares it with the canonical text.

export const FREQUENCY_OPTIONS = ["Not at all", "Several days", "More than half the days", "Nearly every day"] as const;

export const DIFFICULTY_QUESTION =
  "If you checked off any problems, how difficult have these problems made it for you to do your work, take care of things at home, or get along with other people?";
export const DIFFICULTY_OPTIONS = ["Not difficult at all", "Somewhat difficult", "Very difficult", "Extremely difficult"] as const;

export const GAD7 = {
  id: "gad7" as const,
  title: "GAD-7",
  stem: "Over the last 2 weeks, how often have you been bothered by the following problems?",
  items: [
    "Feeling nervous, anxious, or on edge",
    "Not being able to stop or control worrying",
    "Worrying too much about different things",
    "Trouble relaxing",
    "Being so restless that it is hard to sit still",
    "Becoming easily annoyed or irritable",
    "Feeling afraid as if something awful might happen",
  ],
};

export const PHQ9 = {
  id: "phq9" as const,
  title: "PHQ-9",
  stem: "Over the last 2 weeks, how often have you been bothered by any of the following problems?",
  items: [
    "Little interest or pleasure in doing things",
    "Feeling down, depressed, or hopeless",
    "Trouble falling or staying asleep, or sleeping too much",
    "Feeling tired or having little energy",
    "Poor appetite or overeating",
    "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
    "Trouble concentrating on things, such as reading the newspaper or watching television",
    "Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual",
    "Thoughts that you would be better off dead or of hurting yourself in some way",
  ],
};
