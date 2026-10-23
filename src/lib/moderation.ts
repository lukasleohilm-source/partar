export const REPORT_REASONS = {
  stolid: "Grunur um stolinn hlut",
  svik: "Svik eða tilraun til svika",
  rangar_upplysingar: "Rangar eða villandi upplýsingar",
  othaeft: "Óviðeigandi efni",
  annad: "Annað",
} as const;
export type ReportReason = keyof typeof REPORT_REASONS;
