const pct = (value, total) => total ? Math.round((value / total) * 100) : 0;

const riskScore = (row) =>
  Number(row.residual_risk_score) ||
  (Number(row.residual_likelihood) * Number(row.residual_impact)) ||
  0;

const riskLevel = (score) =>
  score >= 17 ? "Critical" : score >= 10 ? "High" : score >= 5 ? "Moderate" : "Low";

const formatDate = (value) => value
  ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
  : "—";

export async function loadSoaBoardReportData(admin, userId, organizationId) {
  const { data: organisation, error: organisationError } = await admin
    .from("organizations")
    .select("id,name")
    .eq("id", organizationId)
    .eq("owner_id", userId)
    .single();

  if (organisationError || !organisation) throw new Error("Organisation not found or access denied.");

  const [assessmentResult, registerResult, entryResult, catalogueResult, findingResult, reportResult] = await Promise.all([
    admin.from("assessments").select("id,organization_id,standard,workspace_type,status").eq("owner_id", userId).eq("organization_id", organizationId),
    admin.from("assessment_soa_registers").select("id,assessment_id,status,version,review_due_at,updated_at").eq("owner_id", userId),
    admin.from("assessment_soa_entries").select("assessment_id,control_id,applicability,implementation_status,residual_risk_level,residual_likelihood,residual_impact,residual_risk_score,treatment_decision,risk_owner,risk_review_due_at,action_required,target_date,finding_reference").eq("owner_id", userId),
    admin.from("iso27001_control_catalog").select("control_id,control_title,theme").eq("active", true),
    admin.from("assessment_findings").select("id,assessment_id,status,finding_type").eq("owner_id", userId).neq("finding_type", "conformity"),
    admin.from("soa_management_reports").select("*").eq("owner_id", userId).eq("organization_id", organizationId).maybeSingle(),
  ]);

  const error = assessmentResult.error || registerResult.error || entryResult.error || catalogueResult.error || findingResult.error || reportResult.error;
  if (error) throw new Error(error.message);

  const assessments = assessmentResult.data ?? [];
  const assessmentIds = new Set(assessments.map((item) => item.id));
  const registers = (registerResult.data ?? []).filter((item) => assessmentIds.has(item.assessment_id));
  const registeredAssessmentIds = new Set(registers.map((item) => item.assessment_id));
  const entries = (entryResult.data ?? []).filter((item) => registeredAssessmentIds.has(item.assessment_id));
  const findings = (findingResult.data ?? []).filter((item) => registeredAssessmentIds.has(item.assessment_id));
  const catalogue = new Map((catalogueResult.data ?? []).map((item) => [item.control_id, item]));

  const total = entries.length;
  const decided = entries.filter((item) => item.applicability !== "pending").length;
  const applicable = entries.filter((item) => item.applicability === "applicable").length;
  const excluded = entries.filter((item) => item.applicability === "not_applicable").length;
  const implemented = entries.filter((item) => ["implemented", "effective"].includes(item.implementation_status)).length;
  const effective = entries.filter((item) => item.implementation_status === "effective").length;
  const mapped = entries.filter((item) => Number(item.residual_likelihood) && Number(item.residual_impact));
  const elevated = mapped.filter((item) => riskScore(item) >= 10);
  const critical = mapped.filter((item) => riskScore(item) >= 17);
  const accepted = entries.filter((item) => item.treatment_decision === "accept").length;
  const treatment = entries.filter((item) => ["reduce", "avoid", "share"].includes(item.treatment_decision)).length;
  const unassigned = entries.filter((item) => item.applicability === "applicable" && riskScore(item) >= 5 && !item.risk_owner).length;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const overdue = entries.filter((item) => item.action_required && item.target_date && new Date(`${item.target_date}T00:00:00Z`) < today).length;
  const openFindings = findings.filter((item) => !["closed", "withdrawn"].includes(item.status)).length;
  const approvedRegisters = registers.filter((item) => item.status === "approved").length;

  const topRisks = [...elevated]
    .sort((a, b) => riskScore(b) - riskScore(a))
    .slice(0, 10)
    .map((item) => ({
      controlId: item.control_id,
      title: catalogue.get(item.control_id)?.control_title ?? "Annex A control",
      theme: catalogue.get(item.control_id)?.theme ?? "unclassified",
      score: riskScore(item),
      level: riskLevel(riskScore(item)),
      owner: item.risk_owner || "Unassigned",
      targetDate: formatDate(item.target_date),
    }));

  const metrics = {
    soaCount: registers.length,
    approvedRegisters,
    total,
    decided,
    decisionCompletion: pct(decided, total),
    applicable,
    excluded,
    implemented,
    implementationRate: pct(implemented, applicable),
    effective,
    mapped: mapped.length,
    elevated: elevated.length,
    critical: critical.length,
    accepted,
    treatment,
    unassigned,
    overdue,
    openFindings,
  };

  const ready = total > 0 && decided === total && elevated.length === 0 && overdue === 0 && openFindings === 0;
  const generated = buildSoaBoardNarrative(organisation.name, metrics, topRisks, ready);

  return {
    organisation,
    assessments,
    registers,
    report: reportResult.data ?? null,
    metrics,
    topRisks,
    ready,
    generated,
  };
}

export function buildSoaBoardNarrative(organisationName, metrics, topRisks, ready) {
  const riskList = topRisks.length
    ? topRisks.map((risk) => `A.${risk.controlId} ${risk.title} (${risk.level}, score ${risk.score}, owner: ${risk.owner})`).join("; ")
    : "No High or Critical residual risks are currently recorded.";

  return {
    executiveSummary: `${organisationName}'s SoA portfolio contains ${metrics.soaCount} controlled Statement${metrics.soaCount === 1 ? "" : "s"} of Applicability covering ${metrics.total} Annex A control records. Applicability decisions are ${metrics.decisionCompletion}% complete, with ${metrics.applicable} controls applicable and ${metrics.excluded} excluded. ${metrics.implemented} applicable controls are implemented or effective. Management attention is required for ${metrics.elevated} High or Critical residual risks, ${metrics.overdue} overdue treatment actions and ${metrics.openFindings} open findings.`,
    portfolioScope: `This report consolidates ${metrics.soaCount} assessment-linked and standalone ISO/IEC 27001:2022 Statements of Applicability owned by ${organisationName}. It covers applicability, implementation, effectiveness, residual-risk decisions, risk ownership, treatment actions and related formal findings.`,
    methodology: `The dynamic engine evaluated ${metrics.total} Annex A control records against the live SoA register. It calculated decision completion, implementation coverage, mapped residual risk, risk-treatment position, overdue actions, ownership gaps and open findings. High risk begins at a residual score of 10 and Critical risk at 17 on the 5 × 5 matrix. Results must be validated against current objective evidence and the approved information-security risk assessment.`,
    principalRisks: riskList,
    treatmentPriorities: `${metrics.treatment} controls have a reduce, avoid or share/transfer decision. Priority should be given to ${metrics.critical} Critical risks, ${metrics.elevated} total High or Critical risks, ${metrics.overdue} overdue actions and ${metrics.unassigned} applicable Moderate-or-higher risks without a named owner. Risk acceptance must be authorised, evidence-based and time-bound.`,
    limitations: `This report reflects records available at the generation date. It does not independently prove that controls operate continuously or that evidence remains current. Missing risk mapping, incomplete applicability decisions, absent owners, outdated review dates and unrecorded findings may reduce assurance. The report must be read with the ISMS scope, risk assessment, risk-treatment plan and controlled SoA records.`,
    conclusion: ready
      ? `The consolidated SoA portfolio has complete applicability decisions and no recorded High or Critical residual risks, overdue actions or open findings. Subject to accountable review of supporting evidence and confirmation of continued control operation, the portfolio is positioned for management approval.`
      : `The consolidated SoA portfolio is not yet ready for unqualified management approval. Management action is required to address incomplete decisions, elevated residual risks, overdue treatments, ownership gaps and open findings identified in this report before controlled issue.`,
  };
}
