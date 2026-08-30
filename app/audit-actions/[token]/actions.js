"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "../../../lib/supabase/admin";

const clean = (value) => typeof value === "string" && value.trim() ? value.trim() : null;
const hash = (token) => createHash("sha256").update(token).digest("hex");

export async function submitExternalAuditAction(formData) {
  const token = clean(formData.get("token"));
  if (!token) throw new Error("Secure access token is required.");
  const supabase = createAdminClient();
  const { data: access, error } = await supabase.from("internal_audit_action_access").select("*")
    .eq("secure_token_hash", hash(token)).gt("secure_token_expires_at", new Date().toISOString()).maybeSingle();
  if (error || !access) redirect(`/audit-actions/${token}?error=expired`);
  const correction = clean(formData.get("correction_and_containment"));
  const rootCause = clean(formData.get("root_cause_response"));
  const plan = clean(formData.get("corrective_action_plan"));
  const effectiveness = clean(formData.get("effectiveness_measure"));
  if (!correction || !rootCause || !plan || !effectiveness) redirect(`/audit-actions/${token}?error=incomplete`);
  const evidenceFile = formData.get("evidence_file");
  if (evidenceFile instanceof File && evidenceFile.size > 0) {
    if (evidenceFile.size > 10 * 1024 * 1024) redirect(`/audit-actions/${token}?error=file_size`);
    const safeName = evidenceFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const storagePath = `${access.owner_id}/${access.audit_id}/action-owner/${access.id}/${randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("internal-audit-evidence").upload(storagePath, evidenceFile, { contentType: evidenceFile.type || "application/octet-stream" });
    if (uploadError) throw new Error(uploadError.message);
    const { error: evidenceError } = await supabase.from("internal_audit_action_evidence").insert({ owner_id: access.owner_id, action_access_id: access.id, storage_path: storagePath, original_file_name: evidenceFile.name, mime_type: evidenceFile.type, file_size_bytes: evidenceFile.size, evidence_description: clean(formData.get("evidence_description")), uploaded_by_external_name: access.assignee_name });
    if (evidenceError) throw new Error(evidenceError.message);
  }
  const now = new Date().toISOString();
  const { error: updateError } = await supabase.from("internal_audit_action_access").update({
    correction_and_containment: correction, root_cause_response: rootCause,
    extent_and_systemic_review: clean(formData.get("extent_and_systemic_review")),
    corrective_action_plan: plan, effectiveness_measure: effectiveness,
    owner_submission_notes: clean(formData.get("owner_submission_notes")),
    status: "submitted", acknowledged_at: access.acknowledged_at || now,
    submitted_at: now, updated_at: now,
  }).eq("id", access.id);
  if (updateError) throw new Error(updateError.message);
  revalidatePath(`/audit-actions/${token}`);
  redirect(`/audit-actions/${token}?submitted=1`);
}
