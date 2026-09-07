export const AUDITOR_ASSESSMENT_CRITERIA = [
  [1, "Audit Scope", 4, true],
  [2, "Audit Criteria", 4, true],
  [3, "Audit Plan / Audit Schedule", 2, false],
  [4, "Opening Meeting", 2, false],
  [5, "Audit Checklist / Worksheet", 5, true],
  [6, "Audit Execution / Statements of Conformity", 5, true],
  [7, "Audit Finding Initiation & Assignment", 5, true],
  [8, "Audit Findings: Classification", 5, true],
  [9, "Observation Writing", 2, false],
  [10, "NC Writing: Source of Requirement", 5, true],
  [11, "NC Writing: Requirement", 5, true],
  [12, "NC Writing: Source of Evidence", 5, true],
  [13, "NC Writing: Evidence", 5, true],
  [14, "NC Initiation: Business Alignment", 5, false],
  [15, "NC Initiation: Finding Category", 5, false],
  [16, "Audit Conclusion", 2, true],
  [17, "Audit Closing Meeting", 5, false],
  [18, "Audit Final Report", 5, true],
].map(([number, title, weight, critical]) => ({ number, title, weight, critical }));

export const SCORE_GUIDANCE = {
  2: "Fully demonstrated by suitable objective evidence",
  1: "Partially demonstrated, incomplete or improvement needed",
  0: "Not demonstrated, incorrect or unsupported",
  na: "Not applicable, with a recorded justification",
};

