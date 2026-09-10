"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../../../../../lib/supabase/server";
import { createAdminClient } from "../../../../../../lib/supabase/admin";
import { requireAssessmentWriteAccess } from "../../../../../../lib/assessment-access";

const REPORT_STATUSES = ["draft", "under_review", "approved", "issued"];

function clean(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function context(formData) {
  const assessmentId = clean(formData.get("assessment_id"));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");
  if (!assessmentId) throw new Error("Missing assessment ID.");
  await requireAssessmentWriteAccess(user.id, assessmentId);
  const admin = createAdminClient();
  return { assessmentId, user, admin };
}

export async function saveSoaExecutiveSummary(formData) {
  const { assessmentId, user, admin } = await context(formData);
  const reportStatus = clean(formData.get("report_status")) ?? "draft";
  if (!REPORT_STATUSES.includes(reportStatus)) throw new Error("Select a valid report status.");
  const overallConclusion = clean(formData.get("overall_conclusion"));
  const executiveSummary = clean(formData.get("executive_summary"));
  if (["approved", "issued"].includes(reportStatus) && (!executiveSummary || !overallConclusion)) {
    throw new Error("Executive summary and overall conclusion are required before approval or issue.");
  }
  const { error } = await admin.from("assessment_soa_registers").update({
    report_reference: clean(formData.get("report_reference")),
    report_confidentiality: clean(formData.get("report_confidentiality")) ?? "Internal",
    executive_summary: executiveSummary,
    methodology_and_sampling: clean(formData.get("methodology_and_sampling")),
    limitations_and_exclusions: clean(formData.get("limitations_and_exclusions")),
    distribution_list: clean(formData.get("distribution_list")),
    unresolved_matters: clean(formData.get("unresolved_matters")),
    overall_conclusion: overallConclusion,
    prepared_by: clean(formData.get("prepared_by")),
    reviewed_by: clean(formData.get("reviewed_by")),
    approved_by: clean(formData.get("approved_by")),
    report_status: reportStatus,
    approved_at: reportStatus === "approved" || reportStatus === "issued" ? new Date().toISOString() : null,
    report_updated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("assessment_id", assessmentId).eq("owner_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath(`/portal/assessments/${assessmentId}/soa/summary`);
  redirect(`/portal/assessments/${assessmentId}/soa/summary?saved=1`);
}

export async function generateSoaExecutiveDraft(formData) {
  const { assessmentId, user, admin } = await context(formData);
  const [{ data: register }, { data: entries }, { data: findings }] = await Promise.all([
    admin.from("assessment_soa_registers").select("*").eq("assessment_id", assessmentId).eq("owner_id", user.id).single(),
    admin.from("assessment_soa_entries").select("*").eq("assessment_id", assessmentId).eq("owner_id", user.id),
    admin.from("assessment_findings").select("finding_type, status").eq("assessment_id", assessmentId).eq("owner_id", user.id).neq("finding_type", "conformity"),
  ]);
  if (!register) throw new Error("Statement of Applicability not found.");
  const rows = entries ?? [];
  const total = rows.length;
  const applicable = rows.filter((x) => x.applicability === "applicable").length;
  const excluded = rows.filter((x) => x.applicability === "not_applicable").length;
  const pending = rows.filter((x) => x.applicability === "pending").length;
  const effective = rows.filter((x) => x.implementation_status === "effective").length;
  const incomplete = rows.filter((x) => ["not_assessed", "not_implemented", "planned", "partially_implemented"].includes(x.implementation_status)).length;
  const elevated = rows.filter((x) => ["high", "critical"].includes(x.residual_risk_level)).length;
  const openFindings = (findings ?? []).filter((x) => x.status !== "closed").length;
  const decisionCompletion = total ? Math.round(((total - pending) / total) * 100) : 0;
  const replace = formData.get("replace_existing") === "on";
  const choose = (key, generated) => replace || !register[key] ? generated : register[key];
  const executiveSummary = `This Statement of Applicability evaluates ${total} ISO/IEC 27001:2022 Annex A controls. Applicability decisions are complete for ${total - pending} controls (${decisionCompletion}%): ${applicable} applicable, ${excluded} not applicable and ${pending} pending. ${effective} controls are concluded effective, while ${incomplete} require further implementation or assessment. ${elevated} High or Critical residual-risk decision(s) and ${openFindings} open formal finding(s) require management attention. The report must be read with the approved ISMS scope, information-security risk assessment and risk-treatment plan.`;
  const methodology = `The review examined all 93 Annex A controls across organisational, people, physical and technological themes. Applicability, implementation status, control ownership, implementation evidence, effectiveness evidence, residual risk and treatment decisions were evaluated. ISO/IEC 27002:2022 was used as implementation guidance. Conclusions rely on the records, interviews, system evidence and samples entered in the controlled assessment and do not replace certification-body judgement.`;
  const limitations = `Assurance is limited to the declared ISMS scope, information available at the review date and the samples recorded for each control. Pending applicability decisions, incomplete implementation evidence, untested effectiveness, overdue treatment and unresolved findings reduce confidence. Excluded controls remain subject to documented justification and review whenever risk, legal, contractual, technological or organisational conditions change.`;
  const conclusion = pending || elevated || openFindings
    ? `The SoA is not yet ready for final approval. Management must resolve ${pending} pending applicability decision(s), control ${elevated} High or Critical residual-risk decision(s), and close or formally control ${openFindings} open finding(s). Approval should occur only after the SoA is consistent with the current risk assessment, treatment plan and operating evidence.`
    : `The SoA contains complete applicability decisions with no recorded High or Critical residual risk or open formal findings. Subject to accountable review of the supporting evidence, it may progress to approval as the controlled record of necessary information-security controls.`;
  const { error } = await admin.from("assessment_soa_registers").update({
    executive_summary: choose("executive_summary", executiveSummary),
    methodology_and_sampling: choose("methodology_and_sampling", methodology),
    limitations_and_exclusions: choose("limitations_and_exclusions", limitations),
    overall_conclusion: choose("overall_conclusion", conclusion),
    report_updated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("assessment_id", assessmentId).eq("owner_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath(`/portal/assessments/${assessmentId}/soa/summary`);
  redirect(`/portal/assessments/${assessmentId}/soa/summary?generated=1`);
}
