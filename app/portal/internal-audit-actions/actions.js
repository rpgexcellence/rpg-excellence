"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "../../../lib/supabase/admin";
import { createClient } from "../../../lib/supabase/server";

const clean = (value) => typeof value === "string" && value.trim() ? value.trim() : null;

const MANUAL_NC_TYPES = new Set(["major_nc", "minor_nc"]);
const MANUAL_NC_SOURCES = new Set(["operations", "supplier", "customer_complaint", "product_service", "process_monitoring", "incident", "management_review", "external_audit", "other"]);
const MANUAL_NC_RISKS = new Set(["low", "medium", "high", "critical"]);
const MAX_MANUAL_EVIDENCE_BYTES = 10 * 1024 * 1024;

export async function createManualNonconformity(formData) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/internal-audit-actions?raise=1");

  const findingType = clean(formData.get("finding_type"));
  const sourceCategory = clean(formData.get("source_category"));
  const title = clean(formData.get("title"));
  const criteria = clean(formData.get("criteria"));
  const objectiveEvidence = clean(formData.get("objective_evidence"));
  const failureStatement = clean(formData.get("failure_statement"));
  const riskLevel = clean(formData.get("risk_level")) || "medium";
  const supplierId = clean(formData.get("supplier_id"));
  if (!MANUAL_NC_TYPES.has(findingType) || !MANUAL_NC_SOURCES.has(sourceCategory) || !title || !criteria || !objectiveEvidence || !failureStatement || !MANUAL_NC_RISKS.has(riskLevel)) {
    redirect("/portal/internal-audit-actions?raise=1&error=manual_incomplete#raise-manual-nc");
  }

  const admin = createAdminClient();
  if (sourceCategory === "supplier") {
    if (!supplierId) redirect("/portal/internal-audit-actions?raise=1&error=manual_incomplete#raise-manual-nc");
    const { data: supplier, error: supplierError } = await admin.from("suppliers").select("id").eq("id", supplierId).eq("owner_id", user.id).maybeSingle();
    if (supplierError || !supplier) throw new Error(supplierError?.message || "The selected supplier is not available to this account.");
  }
  const now = new Date();
  const reference = `MNC-${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}-${randomUUID().slice(0, 6).toUpperCase()}`;
  const { data: finding, error: findingError } = await admin.from("internal_audit_findings").insert({
    owner_id: user.id,
    audit_id: null,
    supplier_id: sourceCategory === "supplier" ? supplierId : null,
    finding_reference: reference,
    finding_type: findingType,
    title,
    criteria,
    objective_evidence: objectiveEvidence,
    failure_statement: failureStatement,
    process_area: clean(formData.get("process_area")),
    responsible_owner_name: clean(formData.get("responsible_owner_name")),
    responsible_owner_email: clean(formData.get("responsible_owner_email")),
    agreed_date: clean(formData.get("agreed_date")),
    risk_level: riskLevel,
    status: "response_due",
    source_type: "manual",
    source_category: sourceCategory,
    source_reference: clean(formData.get("source_reference")),
    detected_at: clean(formData.get("detected_at")) || now.toISOString().slice(0, 10),
    requirement_source: clean(formData.get("requirement_source")) || "other_criteria",
    evidence_source: clean(formData.get("evidence_source")) || "multiple_sources",
  }).select("id,finding_reference").single();
  if (findingError || !finding) throw new Error(findingError?.message || "The manual nonconformity could not be created.");

  const evidenceFile = formData.get("evidence_file");
  if (evidenceFile instanceof File && evidenceFile.size > 0) {
    if (evidenceFile.size > MAX_MANUAL_EVIDENCE_BYTES) redirect("/portal/internal-audit-actions?raise=1&error=file_size#raise-manual-nc");
    const safeName = evidenceFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const storagePath = `${user.id}/manual-findings/${finding.id}/${randomUUID()}-${safeName}`;
    const { error: uploadError } = await admin.storage.from("internal-audit-evidence").upload(storagePath, evidenceFile, { contentType: evidenceFile.type || "application/octet-stream" });
    if (uploadError) throw new Error(`Manual NC created, but evidence upload failed: ${uploadError.message}`);
    const { error: attachmentError } = await admin.from("internal_audit_findings").update({
      evidence_attachment_path: storagePath,
      evidence_attachment_name: evidenceFile.name,
      evidence_attachment_type: evidenceFile.type || "application/octet-stream",
      evidence_attachment_size: evidenceFile.size,
      updated_at: new Date().toISOString(),
    }).eq("id", finding.id).eq("owner_id", user.id);
    if (attachmentError) throw new Error(`Manual NC created, but evidence metadata could not be saved: ${attachmentError.message}`);
  }

  revalidatePath("/portal/internal-audit-actions");
  revalidatePath("/portal/suppliers");
  redirect(`/portal/internal-audit-actions?manual_created=${encodeURIComponent(reference)}#all-ncs`);
}

export async function submitPortalAuditAction(formData) {
  const accessId = clean(formData.get("action_access_id"));
  if (!accessId) throw new Error("Assigned action is required.");
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/internal-audit-actions");
  const admin = createAdminClient();
  const { data: access, error } = await admin.from("internal_audit_action_access").select("*")
    .eq("id", accessId).eq("assignee_user_id", user.id).maybeSingle();
  if (error || !access) throw new Error(error?.message || "Assigned action not found.");
  const correction = clean(formData.get("correction_and_containment"));
  const rootCause = clean(formData.get("root_cause_response"));
  const plan = clean(formData.get("corrective_action_plan"));
  const effectiveness = clean(formData.get("effectiveness_measure"));
  if (!correction || !rootCause || !plan || !effectiveness) redirect(`/portal/internal-audit-actions?error=incomplete#action-${accessId}`);
  const evidenceFile = formData.get("evidence_file");
  if (evidenceFile instanceof File && evidenceFile.size > 0) {
    if (evidenceFile.size > 10 * 1024 * 1024) redirect(`/portal/internal-audit-actions?error=file_size#action-${accessId}`);
    const safeName = evidenceFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const storagePath = `${access.owner_id}/${access.audit_id}/action-owner/${access.id}/${randomUUID()}-${safeName}`;
    const { error: uploadError } = await admin.storage.from("internal-audit-evidence").upload(storagePath, evidenceFile, { contentType: evidenceFile.type || "application/octet-stream" });
    if (uploadError) throw new Error(uploadError.message);
    const { error: evidenceError } = await admin.from("internal_audit_action_evidence").insert({ owner_id: access.owner_id, action_access_id: access.id, storage_path: storagePath, original_file_name: evidenceFile.name, mime_type: evidenceFile.type, file_size_bytes: evidenceFile.size, evidence_description: clean(formData.get("evidence_description")), uploaded_by_user_id: user.id });
    if (evidenceError) throw new Error(evidenceError.message);
  }
  const now = new Date().toISOString();
  const { error: updateError } = await admin.from("internal_audit_action_access").update({
    correction_and_containment: correction, root_cause_response: rootCause,
    extent_and_systemic_review: clean(formData.get("extent_and_systemic_review")),
    corrective_action_plan: plan, effectiveness_measure: effectiveness,
    owner_submission_notes: clean(formData.get("owner_submission_notes")),
    status: "submitted", acknowledged_at: access.acknowledged_at || now,
    submitted_at: now, updated_at: now,
  }).eq("id", access.id).eq("assignee_user_id", user.id);
  if (updateError) throw new Error(updateError.message);
  revalidatePath("/portal/internal-audit-actions");
  redirect(`/portal/internal-audit-actions?saved=1#action-${access.id}`);
}
