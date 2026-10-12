import { describe, expect, it } from "vitest";
import { checkUsDate, maskUsDate } from "@/lib/dates";
import { mentionsControlled } from "@/rules/controlled";
import { DIFFICULTY_OPTIONS, DIFFICULTY_QUESTION, FREQUENCY_OPTIONS, GAD7, PHQ9 } from "@/data/questionnaires";
import { ageOn } from "@/rules/age";
import { changedFields, identityReview } from "@/rules/identity";
import { costLine, formatCents, typicalCostText } from "@/rules/cost";
import { detectCrisisLanguage } from "@/rules/crisis";
import { evaluateFit } from "@/rules/eligibility";
import { careTypeOptions, conditionExpectations } from "@/rules/expectations";
import { phq9Item9Positive, scoreGad7, scorePhq9 } from "@/rules/questionnaires";
import { readinessStatus } from "@/rules/readiness";
import { formatClock, formatSlot, timeZoneForTexasCity, windowOf, zonedTimeToUtc } from "@/rules/time";

const MAYA_ID = {
  legalName: "Maya Elena Torres",
  dob: "1997-03-14",
  sexAtBirth: "Female",
  addressLine: "2104 Elm Ridge Dr",
  city: "Austin",
  state: "TX",
  zip: "78704",
};
const ELIGIBLE = { texas: true, medicaid_medicare: false, risk_of_harm: false, recent_hospitalization: false, adult: true, virtual_only: true };

describe("evaluateFit", () => {
  it("is eligible when every answer fits", () => {
    expect(evaluateFit(ELIGIBLE)).toEqual({ outcome: "eligible" });
  });
  it.each([
    [{ texas: false }, "not_texas"],
    [{ medicaid_medicare: true }, "medicaid_medicare"],
    [{ recent_hospitalization: true }, "recent_hospitalization"],
    [{ adult: false }, "under_18"],
    [{ virtual_only: false }, "not_virtual"],
  ])("screens out %o with its own reason", (answer, reason) => {
    expect(evaluateFit({ ...ELIGIBLE, ...answer })).toEqual({ outcome: "screened_out", reasonCode: reason });
  });
  it("routes risk of harm to crisis, ahead of any other disqualifier", () => {
    expect(evaluateFit({ ...ELIGIBLE, texas: false, risk_of_harm: true })).toEqual({ outcome: "crisis" });
    expect(evaluateFit({ risk_of_harm: true })).toEqual({ outcome: "crisis" });
  });
  it("is incomplete until all six are answered", () => {
    expect(evaluateFit({ texas: true })).toEqual({ outcome: "incomplete" });
  });
});

describe("detectCrisisLanguage", () => {
  it.each([
    "I want to kill myself",
    "Sometimes I think about suicide",
    "i've had suicidal thoughts lately",
    "I just want to end my life",
    "I'm thinking of ending it all",
    "Honestly I'd be better off dead",
    "I wish I was dead",
    "I want to die",
    "There's no reason to live anymore",
    "I don't want to be alive",
    "I've been cutting myself",
    "I hurt myself last week",
    "I think about self-harm",
    "I took an overdose once",
    "I want to hurt someone",
    "I KILL MYSELF in my dreams",
    "i want to kil myself",
  ])("flags: %s", (text) => {
    expect(detectCrisisLanguage(text).match).toBe(true);
  });

  it.each([
    "This job is killing me",
    "I'm dead tired every day",
    "I could kill for a good night's sleep",
    "I'm dying to feel normal again",
    "My anxiety is through the roof",
    "I've been feeling down and unmotivated",
    "I stopped going to some classes",
    "Deadlines are crushing me",
    "I tried a meditation app",
    "My dad passed away last year",
  ])("does not flag everyday language: %s", (text) => {
    expect(detectCrisisLanguage(text).match).toBe(false);
  });
});

describe("questionnaires", () => {
  it("keeps GAD-7 and PHQ-9 word for word", () => {
    expect(FREQUENCY_OPTIONS).toEqual(["Not at all", "Several days", "More than half the days", "Nearly every day"]);
    expect(GAD7.stem).toBe("Over the last 2 weeks, how often have you been bothered by the following problems?");
    expect(GAD7.items).toEqual([
      "Feeling nervous, anxious, or on edge",
      "Not being able to stop or control worrying",
      "Worrying too much about different things",
      "Trouble relaxing",
      "Being so restless that it is hard to sit still",
      "Becoming easily annoyed or irritable",
      "Feeling afraid as if something awful might happen",
    ]);
    expect(PHQ9.stem).toBe("Over the last 2 weeks, how often have you been bothered by any of the following problems?");
    expect(PHQ9.items).toHaveLength(9);
    expect(PHQ9.items[0]).toBe("Little interest or pleasure in doing things");
    expect(PHQ9.items[8]).toBe("Thoughts that you would be better off dead or of hurting yourself in some way");
    expect(DIFFICULTY_QUESTION).toMatch(/^If you checked off any problems, how difficult/);
    expect(DIFFICULTY_OPTIONS).toEqual(["Not difficult at all", "Somewhat difficult", "Very difficult", "Extremely difficult"]);
  });
  it("scores with the published cutoffs", () => {
    expect(scorePhq9([0, 0, 0, 0, 0, 0, 0, 0, 0])).toEqual({ total: 0, band: "minimal" });
    expect(scorePhq9([1, 1, 1, 1, 1, 0, 0, 0, 0]).band).toBe("mild");
    expect(scorePhq9([2, 2, 2, 2, 2, 0, 0, 0, 0]).band).toBe("moderate");
    expect(scorePhq9([2, 2, 2, 2, 2, 2, 2, 1, 0]).band).toBe("moderately_severe");
    expect(scorePhq9([3, 3, 3, 3, 3, 3, 2, 0, 0]).band).toBe("severe");
    expect(scoreGad7([1, 1, 1, 1, 1, 0, 0]).band).toBe("mild");
    expect(scoreGad7([3, 3, 3, 3, 3, 0, 0]).band).toBe("severe");
  });
  it("treats any answer above Not at all on item 9 as positive", () => {
    expect(phq9Item9Positive([0, 0, 0, 0, 0, 0, 0, 0, 0])).toBe(false);
    expect(phq9Item9Positive([0, 0, 0, 0, 0, 0, 0, 0, 1])).toBe(true);
  });
});

describe("expectations and care-type wording", () => {
  it("shows the benzodiazepine cap and the Texas monitoring rule for anxiety, and the stimulant rule for ADHD", () => {
    const text = conditionExpectations(["anxiety", "adhd"]).flatMap((e) => e.lines).join(" ");
    expect(text).toMatch(/benzodiazepines over 1 mg a day/);
    expect(text).toMatch(/Texas prescription monitoring record/);
    expect(text).toMatch(/Stimulant prescriptions need a verified ID/);
  });
  it("adapts care-type options to the conditions chosen", () => {
    expect(careTypeOptions(["adhd"])[0].title).toMatch(/diagnosed with ADHD/);
    expect(careTypeOptions(["anxiety", "depression"])[1].title).toBe("I'd like an evaluation for anxiety and depression");
  });
});

describe("cost", () => {
  it("formats self-pay and plan costs", () => {
    expect(formatCents(25_000)).toBe("$250");
    expect(typicalCostText("none")).toBe("Self-pay is $250 for your first visit and $150 for follow-ups.");
    expect(typicalCostText("bcbs_tx")).toMatch(/\$0 to \$40/);
    expect(costLine({ mode: "insured", plan: "bcbs_tx", status: "active", intakeCents: 4000, source: "x", confirmLater: false })).toBe(
      "$40 copay for this visit with Blue Cross Blue Shield of Texas",
    );
    expect(costLine({ mode: "self_pay", plan: "none", status: "not_started", source: "x", confirmLater: false })).not.toMatch(/insurance|copay/i);
  });
});

describe("time zones", () => {
  it("converts wall-clock time to UTC across daylight saving", () => {
    expect(zonedTimeToUtc(2026, 10, 13, 18, 30, "America/Chicago").toISOString()).toBe("2026-10-13T23:30:00.000Z");
    expect(zonedTimeToUtc(2026, 11, 10, 18, 30, "America/Chicago").toISOString()).toBe("2026-11-11T00:30:00.000Z");
  });
  it("puts El Paso on Mountain Time and Austin on Central", () => {
    expect(timeZoneForTexasCity("El Paso")).toBe("America/Denver");
    expect(timeZoneForTexasCity("Austin")).toBe("America/Chicago");
  });
  it("always shows a zone abbreviation", () => {
    expect(formatSlot("2026-10-13T23:30:00.000Z", "America/Chicago")).toMatch(/6:30 PM CDT$/);
    expect(formatSlot("2026-10-13T23:30:00.000Z", "America/Denver")).toMatch(/5:30 PM MDT$/);
  });
  it("keeps the bare clock time for buttons under a zone label", () => {
    expect(formatClock("2026-10-13T23:30:00.000Z", "America/Denver")).toBe("5:30 PM");
  });
  it("classifies windows in the patient's zone", () => {
    expect(windowOf("2026-10-13T22:30:00.000Z", "America/Chicago")).toBe("weekday_evening"); // 5:30 PM CT
    expect(windowOf("2026-10-13T22:30:00.000Z", "America/Denver")).toBe("weekday_afternoon"); // 4:30 PM MT
    expect(windowOf("2026-10-17T15:00:00.000Z", "America/Chicago")).toBe("weekend");
  });
});

describe("readiness and age", () => {
  it("sets the deadline 24 hours before the visit", () => {
    const status = readinessStatus({
      booking: { appointmentId: "a", providerId: "p", start: "2026-10-14T23:00:00.000Z", end: "", timeZone: "", cardLast4: "", confirmedAt: "" },
      readiness: {
        tasks: { identity: "done", records: "done", story: "todo", check_in: "todo", confirm_found: "todo", pharmacy: "todo", essentials: "todo" },
        gad7: [],
        phq9: [],
        safetyFlags: [],
      },
    });
    expect(status.deadline).toBe("2026-10-13T23:00:00.000Z");
    expect(status.remaining).toEqual(["story", "check_in", "confirm_found", "pharmacy", "essentials"]);
  });
  it("flags a date-of-birth mismatch for a person instead of deciding eligibility", () => {
    const at = new Date("2026-10-12");
    const id = (dob: string) => ({ ...MAYA_ID, dob });
    expect(ageOn("2004-05-21", at)).toBe(22);
    expect(identityReview(MAYA_ID, MAYA_ID, { fitAdult: true, coverageDob: "1997-03-14", at })).toEqual({ ageVerified: true, reasons: [] });
    expect(identityReview(MAYA_ID, MAYA_ID, { fitAdult: true, coverageDob: "1997-04-14", at }).reasons).toEqual(["dob_mismatch"]);
    expect(identityReview(id("2010-01-01"), id("2010-01-01"), { fitAdult: true, at })).toEqual({ ageVerified: false, reasons: ["under_18"] });
  });
});

describe("correcting the details an ID check read (L21)", () => {
  const at = new Date("2026-10-12");
  const review = (current: typeof MAYA_ID) => identityReview(MAYA_ID, current, { fitAdult: true, coverageDob: MAYA_ID.dob, at });

  it("saves a new Texas address without a review", () => {
    const moved = { ...MAYA_ID, addressLine: "48 Barton Springs Rd", zip: "78746" };
    expect(changedFields(MAYA_ID, moved)).toEqual(["address"]);
    expect(review(moved).reasons).toEqual([]);
  });
  it("sends an address outside Texas to a person, who confirms where the visit will happen", () => {
    expect(review({ ...MAYA_ID, city: "Santa Fe", state: "NM", zip: "87501" }).reasons).toEqual(["outside_texas"]);
  });
  it("sends a changed legal name or date of birth to a person, and keeps age from the ID", () => {
    expect(review({ ...MAYA_ID, legalName: "Maya Torres-Vega" }).reasons).toEqual(["name_changed"]);
    const older = review({ ...MAYA_ID, dob: "1990-03-14" });
    expect(older.reasons).toEqual(["dob_changed"]);
    expect(older.ageVerified).toBe(true);
    // Editing a 17-year-old's birth date to look older never verifies age.
    const teen = { ...MAYA_ID, dob: "2010-01-01" };
    expect(identityReview(teen, { ...teen, dob: "2000-01-01" }, { fitAdult: true, at })).toEqual({
      ageVerified: false,
      reasons: ["under_18", "dob_changed"],
    });
  });
  it("ignores differences in case and spacing, and records the sex marker without a review", () => {
    const tidied = { ...MAYA_ID, legalName: "  maya  elena TORRES ", city: "AUSTIN" };
    expect(changedFields(MAYA_ID, tidied)).toEqual([]);
    expect(changedFields(MAYA_ID, { ...MAYA_ID, sexAtBirth: "Intersex" })).toEqual(["sex_at_birth"]);
    expect(review({ ...MAYA_ID, sexAtBirth: "Intersex" }).reasons).toEqual([]);
  });
});

describe("date-of-birth typing (TRD 8.1, guards)", () => {
  const today = new Date("2026-10-12T15:00:00Z");
  it("formats digits as they're typed", () => {
    expect(maskUsDate("0")).toBe("0");
    expect(maskUsDate("0314")).toBe("03/14");
    expect(maskUsDate("03141997")).toBe("03/14/1997");
    expect(maskUsDate("03/14/1997 extra 12")).toBe("03/14/1997");
  });

  it("reports only input problems, in plain words, and never mentions age or eligibility", () => {
    expect(checkUsDate("03/14/1997", today)).toEqual({ iso: "1997-03-14" });
    expect(checkUsDate("03/1", today)).toEqual({});
    expect(checkUsDate("03/1", today, true).error).toMatch(/real date/);
    expect(checkUsDate("13", today).error).toMatch(/month/);
    expect(checkUsDate("02/30/1997", today).error).toMatch(/real date/);
    expect(checkUsDate("01/01/2030", today).error).toMatch(/future/);
    expect(checkUsDate("", today, true).error).toMatch(/date of birth/);
    for (const input of ["13", "02/30/1997", "01/01/2030", "01/01/2015", "", "03/1"]) {
      const error = checkUsDate(input, today, true).error ?? "";
      expect(error).not.toMatch(/age|eligib|18|old|young|cover/i);
    }
    expect(checkUsDate("01/01/2015", today)).toEqual({ iso: "2015-01-01" }); // a minor's date is valid input; age is checked elsewhere
  });
});

describe("controlled-substance mentions", () => {
  it("spots stimulants and benzodiazepines by generic or brand name, and ignores the rest", () => {
    expect(mentionsControlled("Amphetamine salts XR 20 mg, each morning (paid cash)")).toBe(true);
    expect(mentionsControlled("xanax 0.5 as needed")).toBe(true);
    expect(mentionsControlled("Hydroxyzine HCl 25 mg")).toBe(false);
    expect(mentionsControlled("Sertraline 50 mg")).toBe(false);
  });
});
