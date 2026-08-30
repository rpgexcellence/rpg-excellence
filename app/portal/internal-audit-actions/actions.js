"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "../../../lib/supabase/admin";
import { createClient } from "../../../lib/supabase/server";

const clean = (value) => typeof value === "string" && value.trim() ? value.trim() : null;

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
