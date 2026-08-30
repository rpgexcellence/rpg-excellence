"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "../../../lib/supabase/admin";

const clean = (value) =>
  typeof value === "string" && value.trim()
    ? value.trim()
    : null;

const hash = (token) =>
  createHash("sha256").update(token).digest("hex");

async function getSecureAssignment(supabase, token) {
  const { data, error } = await supabase
    .from("internal_audit_action_access")
    .select("*")
    .eq("secure_token_hash", hash(token))
    .gt("secure_token_expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function submitExternal8DDiscipline(formData) {
  const token = clean(formData.get("token"));
  const discipline = Number(formData.get("discipline"));
  const narrative = clean(formData.get("narrative"));

  if (
    !token ||
    !Number.isInteger(discipline) ||
    discipline < 0 ||
    discipline > 8
  ) {
    throw new Error("A valid secure 8D stage is required.");
  }

  if (!narrative) {
    redirect(
      `/audit-actions/${token}?error=narrative&d=${discipline}#d${discipline}`
    );
  }

  const supabase = createAdminClient();
  const access = await getSecureAssignment(supabase, token);

  if (!access) {
    redirect(`/audit-actions/${token}?error=expired`);
  }

  if (!access.rca_case_id) {
    throw new Error(
      "The assigned nonconformity is not linked to a controlled 8D case."
    );
  }

  const { data: rcaCase, error: caseError } = await supabase
    .from("rca_cases")
    .select("id, owner_id, current_discipline, status")
    .eq("id", access.rca_case_id)
    .maybeSingle();

  if (caseError || !rcaCase) {
    throw new Error(
      caseError?.message || "Linked 8D case not found."
    );
  }

  if (discipline > Number(rcaCase.current_discipline || 0)) {
    redirect(
      `/audit-actions/${token}?error=locked&d=${discipline}#d${discipline}`
    );
  }

  const { data: existing, error: existingError } = await supabase
    .from("rca_8d_disciplines")
    .select("id, status")
    .eq("case_id", rcaCase.id)
    .eq("discipline", discipline)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing?.status === "approved") {
    redirect(
      `/audit-actions/${token}?error=approved&d=${discipline}#d${discipline}`
    );
  }

  const stagePayload = {
    owner_id: access.owner_id,
    case_id: rcaCase.id,
    discipline,
    narrative,
    status: "ready_for_review",
    completion_score: 60,
    human_approved: false,
    approved_by: null,
    approved_at: null,
  };

  const stageResult = existing
    ? await supabase
        .from("rca_8d_disciplines")
        .update(stagePayload)
        .eq("id", existing.id)
    : await supabase
        .from("rca_8d_disciplines")
        .insert(stagePayload);

  if (stageResult.error) {
    throw new Error(stageResult.error.message);
  }

  const evidenceFile = formData.get("evidence_file");

  if (evidenceFile instanceof File && evidenceFile.size > 0) {
    if (evidenceFile.size > 10 * 1024 * 1024) {
      redirect(
        `/audit-actions/${token}?error=file_size&d=${discipline}#d${discipline}`
      );
    }

    const safeName = evidenceFile.name.replace(
      /[^a-zA-Z0-9._-]/g,
      "-"
    );

    const storagePath =
      `${access.owner_id}/${access.audit_id}/action-owner/` +
      `${access.id}/d${discipline}/${randomUUID()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("internal-audit-evidence")
      .upload(storagePath, evidenceFile, {
        contentType:
          evidenceFile.type || "application/octet-stream",
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { error: evidenceError } = await supabase
      .from("internal_audit_action_evidence")
      .insert({
        owner_id: access.owner_id,
        action_access_id: access.id,
        discipline,
        storage_path: storagePath,
        original_file_name: evidenceFile.name,
        mime_type:
          evidenceFile.type || "application/octet-stream",
        file_size_bytes: evidenceFile.size,
        evidence_description: clean(
          formData.get("evidence_description")
        ),
        uploaded_by_external_name: access.assignee_name,
      });

    if (evidenceError) {
      throw new Error(evidenceError.message);
    }
  }

  const now = new Date().toISOString();

  const { error: accessError } = await supabase
    .from("internal_audit_action_access")
    .update({
      status: "submitted",
      acknowledged_at: access.acknowledged_at || now,
      submitted_at: now,
      owner_submission_notes:
        `D${discipline} submitted for auditor review`,
      updated_at: now,
    })
    .eq("id", access.id);

  if (accessError) {
    throw new Error(accessError.message);
  }

  const { error: eventError } = await supabase
    .from("rca_case_events")
    .insert({
      case_id: rcaCase.id,
      owner_id: access.owner_id,
      event_type: "action_owner_discipline_submitted",
      discipline,
      summary:
        `D${discipline} submitted by ` +
        `${access.assignee_name || "action owner"}`,
      event_data: {
        action_access_id: access.id,
        assignee_email: access.assignee_email,
      },
    });

  if (eventError) {
    console.error(
      "Unable to record the 8D submission event:",
      eventError.message
    );
  }

  revalidatePath(`/audit-actions/${token}`);

  redirect(
    `/audit-actions/${token}?submitted=${discipline}#d${discipline}`
  );
}
