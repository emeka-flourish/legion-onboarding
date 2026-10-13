// Controlled substances (Schedule II to V) a patient might name. Used to prefill "controlled substances taken now"
// and to show the prescription-monitoring check at the visit. The provider confirms; this only prefills (L3).
const CONTROLLED = [
  "amphetamine", "adderall", "dextroamphetamine", "lisdexamfetamine", "vyvanse", "methylphenidate", "ritalin", "concerta",
  "dexmethylphenidate", "focalin", "methamphetamine", "alprazolam", "xanax", "clonazepam", "klonopin", "lorazepam", "ativan",
  "diazepam", "valium", "temazepam", "zolpidem", "ambien", "eszopiclone", "lunesta", "oxycodone", "hydrocodone", "codeine",
  "tramadol", "morphine", "buprenorphine", "suboxone", "methadone", "carisoprodol", "soma", "pregabalin", "lyrica", "modafinil",
  "armodafinil", "phenobarbital", "butalbital",
];
const RE = new RegExp(`\\b(${CONTROLLED.join("|")})\\b`, "i");

export function mentionsControlled(text: string): boolean {
  return RE.test(text);
}
