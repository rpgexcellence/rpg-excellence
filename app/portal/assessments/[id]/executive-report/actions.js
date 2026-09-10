"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/server";
import { createAdminClient } from "../../../../../lib/supabase/admin";
import { requireAssessmentWriteAccess } from "../../../../../lib/assessment-access";
import { calculateProgress, calculateSimpleOverallScore } from "../scoring";

const clean = (value) => typeof value === "string" && value.trim() ? value.trim() : null;
const statuses = ["draft", "under_review", "approved", "issued"];
const maturity = (score) => score === null ? "Not assessed" : score <= 20 ? "Initial" : score <= 40 ? "Developing" : score <= 60 ? "Managed" : score <= 80 ? "Controlled" : "Optimised";
const systemName = (standard) => ({
  "ISO 9001:2015/Amd 1:2024": "quality management system",
  "ISO 14001:2026": "environmental management system",
  "ISO 45001:2018": "OH&S management system",
  "ISO/IEC 27001:2022": "information security management system",
  "ISO/IEC 17024:2026": "certification-of-persons management system",
}[standard] || "management system");

async function context(formData) {
  const assessmentId = clean(formData.get("assessment_id"));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");
  if (!assessmentId) throw new Error("Missing assessment ID.");
  await requireAssessmentWriteAccess(user.id, assessmentId);
  const { data: assessment } = await supabase.from("assessments").select("*").eq("id", assessmentId).eq("owner_id", user.id).single();
  if (!assessment) throw new Error("Assessment not found.");
  return { assessmentId, assessment, user, supabase, admin: createAdminClient() };
}

async function upsertReport(admin, assessmentId, userId, values) {
  const { error } = await admin.from("assessment_executive_reports").upsert({ assessment_id: assessmentId, owner_id: userId, ...values, updated_at: new Date().toISOString() }, { onConflict: "assessment_id" });
  if (error) throw new Error(error.message);
}

export async function saveAssessmentExecutiveReport(formData) {
  const { assessmentId, user, admin } = await context(formData);
  const reportStatus = clean(formData.get("report_status")) || "draft";
  if (!statuses.includes(reportStatus)) throw new Error("Select a valid report status.");
  const executiveSummary = clean(formData.get("executive_summary"));
  const overallConclusion = clean(formData.get("overall_conclusion"));
  if (["approved", "issued"].includes(reportStatus) && (!executiveSummary || !overallConclusion || !clean(formData.get("approved_by")))) {
    throw new Error("Executive summary, overall conclusion and approver are required before approval or issue.");
  }
  await upsertReport(admin, assessmentId, user.id, {
    report_reference: clean(formData.get("report_reference")), confidentiality: clean(formData.get("confidentiality")) || "Internal", report_status: reportStatus,
    executive_summary: executiveSummary, methodology_and_sampling: clean(formData.get("methodology_and_sampling")), limitations_and_exclusions: clean(formData.get("limitations_and_exclusions")),
    priority_actions: clean(formData.get("priority_actions")), overall_conclusion: overallConclusion, distribution_list: clean(formData.get("distribution_list")),
    prepared_by: clean(formData.get("prepared_by")), reviewed_by: clean(formData.get("reviewed_by")), approved_by: clean(formData.get("approved_by")),
    approved_at: ["approved", "issued"].includes(reportStatus) ? new Date().toISOString() : null,
  });
  revalidatePath(`/portal/assessments/${assessmentId}/executive-report`);
  redirect(`/portal/assessments/${assessmentId}/executive-report?saved=1`);
}

export async function generateAssessmentExecutiveDraft(formData) {
  const { assessmentId, assessment, user, supabase, admin } = await context(formData);
  const [{ data: questions }, { data: answers }, { data: findings }, { data: existing }] = await Promise.all([
    supabase.from("assessment_questions").select("question_number,clause,question").eq("standard", assessment.standard).eq("active", true),
    supabase.from("assessment_answers").select("clause,score,notes").eq("assessment_id", assessmentId).eq("owner_id", user.id),
    admin.from("assessment_findings").select("finding_type,status,risk_impact,question_number,finding_statement").eq("assessment_id", assessmentId).eq("owner_id", user.id).neq("finding_type", "conformity"),
    admin.from("assessment_executive_reports").select("*").eq("assessment_id", assessmentId).eq("owner_id", user.id).maybeSingle(),
  ]);
  const qs = questions || [], ans = answers || [], fs = findings || [];
  const progress = calculateProgress(qs, ans), score = calculateSimpleOverallScore(ans), open = fs.filter((x) => !["closed", "withdrawn"].includes(x.status));
  const major = open.filter((x) => x.finding_type === "major_nc").length, minor = open.filter((x) => x.finding_type === "minor_nc").length;
  const high = open.filter((x) => ["High", "high", "Critical", "critical"].includes(x.risk_impact)).length;
  const sys = systemName(assessment.standard), level = maturity(score);
  const replace = formData.get("replace_existing") === "on";
  const choose = (key, value) => replace || !existing?.[key] ? value : existing[key];
  const executive = `This gap assessment evaluated ${progress.total} requirements against ${assessment.standard}. ${progress.answered} requirements have been assessed (${progress.percentage}% complete) and the current Business Assurance Score is ${score === null ? "not yet available" : `${score}% (${level})`}. ${open.length} open finding(s) require management attention, including ${major} Major NC and ${minor} Minor NC. Results remain provisional until all requirements are assessed and supported by representative objective evidence.`;
  const methodology = `The assessment was performed requirement by requirement using the controlled RPG Intelligence question bank. Conclusions considered recorded scores, assessor notes, objective evidence, interviews, operational records and sampling across the declared scope. The review is a gap assessment of the ${sys}; it supports readiness planning but does not replace accredited certification or a complete independent audit.`;
  const limitations = `${progress.total - progress.answered} requirement(s) remain unanswered. Confidence is limited where evidence, sampling, locations, functions, shifts, suppliers or interested-party interfaces have not been examined. A score represents the evidence available at the assessment date and does not by itself demonstrate sustained conformity.`;
  const priorities = open.length ? open.slice(0, 8).map((x) => `${x.question_number || "Requirement"}: ${x.finding_statement || x.finding_type} (${x.risk_impact || "risk not rated"})`).join("\n") : "Complete unanswered requirements, validate evidence and maintain effective controls through internal audit and management review.";
  const conclusion = progress.percentage < 100 ? `The assessment is incomplete and no final readiness conclusion should be issued. Complete the remaining ${progress.total - progress.answered} requirements, address open findings and verify corrective-action effectiveness before management determines readiness.` : major || high ? `The ${sys} is not ready for a positive readiness decision because ${major} open Major NC(s) and ${high} high-risk finding(s) require controlled correction, root-cause action and effectiveness verification.` : score !== null && score >= 80 ? `The assessment indicates potential readiness, subject to closure of remaining findings, confirmation of scope-wide evidence and accountable management review.` : `Material improvement remains necessary before readiness can be confirmed. Prioritise weak clauses, open findings and evidence gaps through a controlled action plan.`;
  await upsertReport(admin, assessmentId, user.id, {
    report_reference: existing?.report_reference || `GAR-${assessmentId.replaceAll("-", "").slice(0, 8).toUpperCase()}-RPT`, confidentiality: existing?.confidentiality || "Internal", report_status: existing?.report_status || "draft",
    executive_summary: choose("executive_summary", executive), methodology_and_sampling: choose("methodology_and_sampling", methodology), limitations_and_exclusions: choose("limitations_and_exclusions", limitations),
    priority_actions: choose("priority_actions", priorities), overall_conclusion: choose("overall_conclusion", conclusion), distribution_list: choose("distribution_list", "Top management; management-system owner; process owners; internal audit; relevant risk and compliance stakeholders."),
    prepared_by: existing?.prepared_by || user.email,
  });
  revalidatePath(`/portal/assessments/${assessmentId}/executive-report`);
  redirect(`/portal/assessments/${assessmentId}/executive-report?generated=1`);
}
