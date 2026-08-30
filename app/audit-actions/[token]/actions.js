"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "../../../lib/supabase/admin";

const clean = (value) => typeof value === "string" && value.trim() ? value.trim() : null;
const hash = (token) => createHash("sha256").update(token).digest("hex");

async function getSecureAssignment(supabase, token) {
  const { data, error } = await supabase.from("internal_audit_action_access").select("*")
    .eq("secure_token_hash", hash(token)).gt("secure_token_expires_at", new Date().toISOString()).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function submitExternal8DDiscipline(formData) {
  const token = clean(formData.get("token"));
  const discipline = Number(formData.get("discipline"));
  const narrative = clean(formData.get("narrative"));
  if (!token || !Number.isInteger(discipline) || discipline < 0 || discipline > 8) {
    throw new Error("A valid secure 8D stage is required.");
  }
  if (!narrative) redirect(`/audit-actions/${token}?error=narrative&d=${discipline}#d${discipline}`);
  const supabase = createAdminClient();
  const access = await getSecureAssignment(supabase, token);
  if (!access?.rca_case_id) redirect(`/audit-actions/${token}?error=expired`);
  const { data: rcaCase, error: caseError } = await supabase.from("rca_cases")
    .select("id, owner_id, current_discipline, status").eq("id", access.rca_case_id).maybeSingle();
  if (caseError || !rcaCase) throw new Error(caseError?.message || "Linked 8D case not found.");
  if (discipline > Number(rcaCase.current_discipline || 0)) {
    redirect(`/audit-actions/${token}?error=locked&d=${discipline}#d${discipline}`);
  }
  const { data: existing, error: existingError } = await supabase.from("rca_8d_disciplines")
    .select("id, status").eq("case_id", rcaCase.id).eq("discipline", discipline).maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (access.status === "submitted" || access.status === "accepted") {
    redirect(`/audit-actions/${token}?error=frozen&d=${discipline}#d${discipline}`);
  }
  const isFinalSubmission = discipline === 8;
  const stagePayload = {
    owner_id: access.owner_id,
    case_id: rcaCase.id,
    discipline,
    narrative,
    status: isFinalSubmission ? "ready_for_review" : "in_progress",
    completion_score: 100,
    human_approved: false,
    approved_by: null,
    approved_at: null,
  };
  const stageResult = existing
    ? await supabase.from("rca_8d_disciplines").update(stagePayload).eq("id", existing.id)
    : await supabase.from("rca_8d_disciplines").insert(stagePayload);
  if (stageResult.error) throw new Error(stageResult.error.message);

  const evidenceFile = formData.get("evidence_file");
  if (evidenceFile instanceof File && evidenceFile.size > 0) {
    if (evidenceFile.size > 10 * 1024 * 1024) redirect(`/audit-actions/${token}?error=file_size&d=${discipline}#d${discipline}`);
    const safeName = evidenceFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const storagePath = `${access.owner_id}/${access.audit_id}/action-owner/${access.id}/d${discipline}/${randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("internal-audit-evidence").upload(storagePath, evidenceFile, { contentType: evidenceFile.type || "application/octet-stream" });
    if (uploadError) throw new Error(uploadError.message);
    const { error: evidenceError } = await supabase.from("internal_audit_action_evidence").insert({
      owner_id: access.owner_id,
      action_access_id: access.id,
      discipline,
      storage_path: storagePath,
      original_file_name: evidenceFile.name,
      mime_type: evidenceFile.type,
      file_size_bytes: evidenceFile.size,
      evidence_description: clean(formData.get("evidence_description")),
      uploaded_by_external_name: access.assignee_name,
    });
    if (evidenceError) throw new Error(evidenceError.message);
  }
  const now = new Date().toISOString();
  const nextDiscipline = Math.min(discipline + 1, 8);
  const { error: caseProgressError } = await supabase.from("rca_cases").update({
    current_discipline: Math.max(Number(rcaCase.current_discipline || 0), nextDiscipline),
    updated_at: now,
  }).eq("id", rcaCase.id);
  if (caseProgressError) throw new Error(caseProgressError.message);

  let finalSummary = {};
  if (isFinalSubmission) {
    const { data: completedStages, error: stagesError } = await supabase.from("rca_8d_disciplines")
      .select("discipline, narrative").eq("case_id", rcaCase.id).order("discipline");
    if (stagesError) throw new Error(stagesError.message);
    const byNumber = new Map((completedStages || []).map((item) => [item.discipline, item.narrative]));
    const missing = Array.from({ length: 9 }, (_, number) => number).filter((number) => !byNumber.get(number)?.trim());
    if (missing.length) redirect(`/audit-actions/${token}?error=incomplete_8d&missing=${missing.join(",")}#d8`);
    finalSummary = {
      correction_and_containment: [byNumber.get(0), byNumber.get(3)].filter(Boolean).join("\n\n"),
      root_cause_response: byNumber.get(4),
      corrective_action_plan: [byNumber.get(5), byNumber.get(6), byNumber.get(7)].filter(Boolean).join("\n\n"),
      effectiveness_measure: byNumber.get(8),
      owner_submission_notes: "Complete D0-D8 response submitted for auditor review",
      submitted_at: now,
    };
  }
  const { error: accessError } = await supabase.from("internal_audit_action_access").update({
    status: isFinalSubmission ? "submitted" : "response_draft",
    acknowledged_at: access.acknowledged_at || now,
    ...finalSummary,
    updated_at: now,
  }).eq("id", access.id);
  if (accessError) throw new Error(accessError.message);
  await supabase.from("rca_case_events").insert({
    case_id: rcaCase.id,
    owner_id: access.owner_id,
    event_type: isFinalSubmission ? "action_owner_8d_submitted" : "action_owner_discipline_completed",
    discipline,
    summary: isFinalSubmission
      ? `Complete D0-D8 response submitted by ${access.assignee_name}`
      : `D${discipline} completed by ${access.assignee_name}`,
    event_data: { action_access_id: access.id, assignee_email: access.assignee_email },
  });
  revalidatePath(`/audit-actions/${token}`);
  redirect(`/audit-actions/${token}?${isFinalSubmission ? "final_submitted=1" : `completed=${discipline}`}#d${discipline}`);
}

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
