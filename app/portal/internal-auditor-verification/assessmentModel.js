const criterion = (number, title, weight, critical, criteria, evidence, score2, score1, score0) => ({
  number, title, weight, critical, criteria, evidence, scores: { 2: score2, 1: score1, 0: score0 },
});

export const AUDITOR_ASSESSMENT_CRITERIA = [
  criterion(1, "Audit Scope", 4, true,
    "Confirm that the scope clearly defines processes, functions, locations, boundaries and controlled changes, and agrees with the audit plan.",
    "Approved mandate, scope statement, audit plan, programme entry and scope-change record.",
    "Scope is clear, complete and consistent with the approved plan; changes are controlled and recorded.",
    "Scope is incomplete or unclear, but its intended boundaries can be determined from the records.",
    "No reliable scope is identified, or the audit boundaries cannot be determined."),
  criterion(2, "Audit Criteria", 4, true,
    "Confirm that applicable standards, clauses, legal, contractual and internal requirements are clearly defined and appropriate to the scope.",
    "Selected standards and clauses, procedures, legal register, customer requirements and audit plan.",
    "All applicable criteria and requirement sources are clearly identified and appropriate.",
    "Criteria are incomplete or unclear, but the requirements used can be determined.",
    "No valid criteria are identified, or the assessment basis cannot be determined."),
  criterion(3, "Audit Plan / Audit Schedule", 2, false,
    "Determine whether a risk-based plan or schedule was prepared, approved and communicated before the audit.",
    "Approved plan, agenda, calendar invitation, auditee notification and change history.",
    "A formal, approved and communicated plan covers scope, timing, team and activities.",
    "No complete formal plan exists, but arrangements were sufficiently communicated.",
    "No evidence of an audit plan, schedule or communication exists."),
  criterion(4, "Opening Meeting", 2, false,
    "Confirm that the opening covered scope, objectives, criteria, methods, communication, confidentiality, safety, timing and reporting.",
    "Invitation, attendance record, presentation, meeting notes and action list.",
    "Formal evidence records attendees and the key matters communicated or agreed.",
    "An opening discussion occurred, but its record or coverage is incomplete.",
    "No objective evidence shows that an opening meeting or equivalent briefing occurred."),
  criterion(5, "Audit Checklist / Worksheet", 5, true,
    "Determine whether working documents appropriate to the scope and criteria were prepared and used without restricting professional judgement.",
    "Completed checklist, clause plan, process questions, interview prompts and working notes.",
    "A scope-specific checklist or worksheet was prepared, used and completed with traceable notes.",
    "Alternative notes or generic guidance exist, but coverage or suitability is incomplete.",
    "No objective evidence of a checklist, worksheet or equivalent working record exists."),
  criterion(6, "Audit Execution / Statements of Conformity", 5, true,
    "Confirm that the auditor executed the plan, tested the scope and recorded evidence-based conformity or nonconformity conclusions.",
    "Completed checklist, audit log, interviews, samples, conformity statements and evidence references.",
    "Records demonstrate adequate scope coverage and evidence-based conclusions.",
    "Execution evidence exists, but coverage, sampling or evidence-to-conclusion linkage is incomplete.",
    "No objective record demonstrates meaningful examination of the scope and criteria."),
  criterion(7, "Audit Finding Initiation & Assignment", 5, true,
    "Verify that all findings were formally recorded, linked to the audit and assigned to an accountable owner.",
    "Finding register, report, checklist cross-references, owner assignment and due dates.",
    "Every identified finding is recorded, linked and assigned with controlled ownership.",
    "Findings exist, but one or more links, assignments or traceability fields are incomplete.",
    "One or more findings identified in the audit records were not formally initiated."),
  criterion(8, "Audit Findings: Classification", 5, true,
    "Determine whether finding classifications follow approved definitions and are supported by the evidence.",
    "Finding statements, classification rules, evidence, reviewer decisions and report summary.",
    "All findings are consistently and correctly classified against approved rules.",
    "One or more classifications are questionable or weakly justified.",
    "One or more findings are clearly misclassified, including an observation used for an evidenced NC."),
  criterion(9, "Observation Writing", 2, false,
    "Assess whether observations explain the condition, associated risk or impact and a useful opportunity without presenting consultancy as a requirement.",
    "Observation text, supporting evidence, risk rationale and report.",
    "The issue, risk or impact and improvement opportunity are clear, balanced and supported.",
    "The observation is incomplete, but its relevance and value can be understood.",
    "The observation is vague, unsupported or its value cannot be determined."),
  criterion(10, "NC Writing: Source of Requirement", 5, true,
    "Confirm that each NC identifies the correct source of requirement: standard, law, contract or controlled procedure.",
    "NC statement, standard/clause, legal or customer requirement and procedure reference.",
    "The correct and most appropriate source is clearly identified for every sampled NC.",
    "A source is recorded, but it is imprecise or not the strongest applicable source.",
    "The source is absent, invalid or unrelated to the NC."),
  criterion(11, "NC Writing: Requirement", 5, true,
    "Confirm that the applicable requirement is accurately stated and precise enough to show what should have occurred.",
    "Exact clause or controlled requirement text and referenced document revision.",
    "The requirement is accurately quoted or faithfully stated with sufficient traceability.",
    "The requirement is paraphrased, incomplete or not the most appropriate, but its intent is clear.",
    "No valid requirement is stated, or the cited requirement does not apply."),
  criterion(12, "NC Writing: Source of Evidence", 5, true,
    "Confirm that the finding identifies where, when and from what sample the evidence was obtained.",
    "Location, process, record population, interview role, equipment/transaction sampled and date.",
    "The evidence source is specific and traceable, showing where and from what it was obtained.",
    "A source is mentioned but is vague, incomplete or difficult to reproduce.",
    "No source of evidence is identified."),
  criterion(13, "NC Writing: Evidence", 5, true,
    "Determine whether evidence is factual, clear, concise, reproducible and sufficient to demonstrate failure against the requirement.",
    "Document IDs/revisions, record numbers, orders, forms, equipment IDs, dates and samples.",
    "Specific, factual and traceable evidence clearly demonstrates the failure.",
    "Evidence is present but vague, incomplete, overly general or only partly supportive.",
    "No objective evidence is described, or it does not support the finding."),
  criterion(14, "NC Initiation: Business Alignment", 5, false,
    "Verify that each NC is assigned to the function or process owner with authority to address the cause.",
    "Organisation structure, process ownership, finding assignment and escalation route.",
    "All sampled findings are assigned to the correct accountable function or process owner.",
    "Assignments are broadly applicable, but one or more are not the best ownership route.",
    "One or more findings are assigned to a function that does not control the process or cause."),
  criterion(15, "NC Initiation: Finding Category", 5, false,
    "Confirm that categories accurately describe the failed control or process and support meaningful trend analysis.",
    "Controlled category taxonomy, NC record, failure mechanism and dashboard classification.",
    "All sampled findings use the most appropriate controlled category.",
    "Categories are relevant, but one or more are not the best fit.",
    "One or more findings use an incorrect or misleading category."),
  criterion(16, "Audit Conclusion", 2, true,
    "Determine whether the conclusion answers the objectives, reflects scope and sampling limitations and agrees with evidence and findings.",
    "Approved conclusion, results summary, finding profile, limitations and lead-auditor review.",
    "The conclusion is clear, balanced, evidence-based and directly addresses the objectives.",
    "A conclusion exists but is vague, overgeneralised or does not fully address evidence or limitations.",
    "No conclusion is documented, or it contradicts the evidence and findings."),
  criterion(17, "Audit Closing Meeting", 5, false,
    "Confirm that results, findings, conclusions, uncertainties, reporting and follow-up responsibilities were communicated at closure.",
    "Closing presentation, attendance record, meeting notes, acknowledgement and action summary.",
    "Formal closing evidence records attendees and communication of results and next actions.",
    "A closing discussion occurred, but attendance, content or acknowledgement is incomplete.",
    "No objective evidence shows that a closing meeting or equivalent communication occurred."),
  criterion(18, "Audit Final Report", 5, true,
    "Confirm that the report is complete, accurate, evidence-traceable, reviewed and issued under document control.",
    "Controlled report, approval/issue record, scope, criteria, team, methodology, findings, conclusion and distribution.",
    "A comprehensive, approved report accurately presents the audit and supports required action.",
    "A report exists but lacks important detail, traceability, attachments or recipient information.",
    "No final report or equivalent controlled summary is available."),
];

export const SCORE_GUIDANCE = {
  2: "Fully demonstrated by suitable objective evidence",
  1: "Partially demonstrated, incomplete or improvement needed",
  0: "Not demonstrated, incorrect or unsupported",
  na: "Only where genuinely inapplicable; justification is mandatory",
};

export function calculateAuditorAssessment(scores) {
  let total = 0;
  let maximum = 0;
  let criticalZeros = 0;
  let complete = true;
  const strengths = [];
  const partial = [];
  const failed = [];
  const excluded = [];

  for (const item of AUDITOR_ASSESSMENT_CRITERIA) {
    const score = scores[item.number];
    if (score === undefined || score === null || score === "") complete = false;
    if (score === "na") {
      excluded.push(item.title);
      continue;
    }
    if (score !== undefined && score !== null && score !== "") {
      const numeric = Number(score);
      total += numeric * item.weight;
      maximum += 2 * item.weight;
      if (numeric === 2) strengths.push(item.title);
      if (numeric === 1) partial.push(item.title);
      if (numeric === 0) failed.push(item.title);
      if (item.critical && numeric === 0) criticalZeros += 1;
    }
  }

  const percentage = maximum ? Math.round((total / maximum) * 1000) / 10 : 0;
  const outcome = complete
    ? percentage >= 50 && criticalZeros === 0
      ? "verified"
      : percentage >= 50
        ? "conditional"
        : "not_verified"
    : "pending";
  const thresholdMargin = Math.round((percentage - 50) * 10) / 10;
  const list = (items) => items.length ? items.join("; ") : "None";
  const explanation = complete
    ? [
        `The weighted result is ${percentage}% (${total} of ${maximum}), ${Math.abs(thresholdMargin)} percentage point${Math.abs(thresholdMargin) === 1 ? "" : "s"} ${thresholdMargin >= 0 ? "above" : "below"} the 50% minimum.`,
        outcome === "verified"
          ? "The calculated outcome is Verified because the minimum score is achieved and no applicable critical criterion scored zero."
          : outcome === "conditional"
            ? `The calculated outcome is Conditional because ${criticalZeros} applicable critical criterion${criticalZeros === 1 ? " has" : "s have"} scored zero; coaching, restriction and reassessment are required before unrestricted assignment.`
            : "The calculated outcome is Not verified because the weighted score is below the minimum requirement.",
        `Fully demonstrated controls: ${list(strengths)}.`,
        `Partially demonstrated controls requiring improvement: ${list(partial)}.`,
        `Controls not demonstrated: ${list(failed)}.`,
        `Criteria excluded as N/A: ${list(excluded)}.`,
      ].join("\n")
    : "Complete all 18 criteria to generate the controlled score explanation.";

  return { total, maximum, percentage, criticalZeros, outcome, complete, strengths, partial, failed, excluded, explanation };
}
