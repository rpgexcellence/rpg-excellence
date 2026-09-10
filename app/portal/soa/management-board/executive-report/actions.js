"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "../../../../../lib/supabase/server";
import { createAdminClient } from "../../../../../lib/supabase/admin";
import { loadSoaBoardReportData } from "./report-data";

const REPORT_PATH = "/portal/soa/management-board/executive-report";
const allowedStatuses = new Set(["draft", "under_review", "approved", "issued"]);
const allowedConfidentiality = new Set(["Internal", "Confidential", "Restricted", "Client controlled"]);

const text = (formData, name, max = 20000) =>
  String(formData.get(name) ?? "").trim().slice(0, max);

async function getContext(formData) {
  const organizationId = text(formData, "organization_id", 100);
  if (!organizationId) throw new Error("Organisation is required.");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/portal/login?next=${encodeURIComponent(REPORT_PATH)}`);

  const admin = createAdminClient();
  const data = await loadSoaBoardReportData(admin, user.id, organizationId);
  return { admin, user, organizationId, data };
}

function reportReference(organizationId) {
  const month = new Date().toISOString().slice(0, 7).replace("-", "");
  return `SOA-MB-${month}-${organizationId.replaceAll("-", "").slice(0, 6).toUpperCase()}`;
}

export async function generateSoaBoardGuidedDraft(formData) {
  const { admin, user, organizationId, data } = await getContext(formData);
  const replaceExisting = formData.get("replace_existing") === "on";
  const existing = data.report ?? {};
  const generated = data.generated;

  const preserve = (current, replacement) =>
    !replaceExisting && String(current ?? "").trim() ? current : replacement;

  const payload = {
    owner_id: user.id,
    organization_id: organizationId,
    report_reference: existing.report_reference || reportReference(organizationId),
    report_status: existing.report_status || "draft",
    report_confidentiality: existing.report_confidentiality || "Internal",
    executive_summary: preserve(existing.executive_summary, generated.executiveSummary),
    portfolio_scope: preserve(existing.portfolio_scope, generated.portfolioScope),
    methodology_and_sampling: preserve(existing.methodology_and_sampling, generated.methodology),
    principal_risks: preserve(existing.principal_risks, generated.principalRisks),
    treatment_priorities: preserve(existing.treatment_priorities, generated.treatmentPriorities),
    limitations_and_exclusions: preserve(existing.limitations_and_exclusions, generated.limitations),
    overall_conclusion: preserve(existing.overall_conclusion, generated.conclusion),
    prepared_by: existing.prepared_by || user.email || "",
    reviewed_by: existing.reviewed_by || "",
    approved_by: existing.approved_by || "",
    approved_at: existing.approved_at || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin
    .from("soa_management_reports")
    .upsert(payload, { onConflict: "owner_id,organization_id" });

  if (error) throw new Error(error.message);
  revalidatePath(REPORT_PATH);
  revalidatePath("/portal/soa/management-board");
  redirect(`${REPORT_PATH}?organization=${encodeURIComponent(organizationId)}&generated=1`);
}

export async function saveSoaBoardExecutiveReport(formData) {
  const { admin, user, organizationId, data } = await getContext(formData);
  const statusValue = text(formData, "report_status", 30);
  const confidentialityValue = text(formData, "report_confidentiality", 40);
  const status = allowedStatuses.has(statusValue) ? statusValue : "draft";
  const confidentiality = allowedConfidentiality.has(confidentialityValue) ? confidentialityValue : "Internal";
  const approvedBy = text(formData, "approved_by", 300);
  const previouslyApprovedAt = data.report?.approved_at ?? null;
  const approvalRequired = status === "approved" || status === "issued";

  if (approvalRequired && !approvedBy) {
    throw new Error("Approved by is required before the report can be approved or issued.");
  }

  const payload = {
    owner_id: user.id,
    organization_id: organizationId,
    report_reference: text(formData, "report_reference", 120) || reportReference(organizationId),
    report_status: status,
    report_confidentiality: confidentiality,
    executive_summary: text(formData, "executive_summary"),
    portfolio_scope: text(formData, "portfolio_scope"),
    methodology_and_sampling: text(formData, "methodology_and_sampling"),
    principal_risks: text(formData, "principal_risks"),
    treatment_priorities: text(formData, "treatment_priorities"),
    limitations_and_exclusions: text(formData, "limitations_and_exclusions"),
    overall_conclusion: text(formData, "overall_conclusion"),
    prepared_by: text(formData, "prepared_by", 300),
    reviewed_by: text(formData, "reviewed_by", 300),
    approved_by: approvedBy,
    approved_at: approvalRequired ? (previouslyApprovedAt || new Date().toISOString()) : null,
    updated_at: new Date().toISOString(),
  };

  const required = [payload.executive_summary, payload.portfolio_scope, payload.overall_conclusion, payload.prepared_by];
  if (required.some((value) => !value)) {
    throw new Error("Executive summary, portfolio scope, overall conclusion and prepared by are required.");
  }

  const { error } = await admin
    .from("soa_management_reports")
    .upsert(payload, { onConflict: "owner_id,organization_id" });

  if (error) throw new Error(error.message);
  revalidatePath(REPORT_PATH);
  revalidatePath("/portal/soa/management-board");
  redirect(`${REPORT_PATH}?organization=${encodeURIComponent(organizationId)}&saved=1`);
}
