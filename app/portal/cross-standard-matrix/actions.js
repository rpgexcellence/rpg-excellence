"use server";

import { revalidatePath } from "next/cache";
import { requireOrganizationAccess } from "../../../lib/organization-access";
import { createAdminClient } from "../../../lib/supabase/admin";

const clean = (value, max = 3000) => String(value || "").trim().slice(0, max);
const STATUSES = new Set(["not_reviewed", "gap", "developing", "implemented", "effective"]);

async function matrixContext(minimumLevel = "contribute") {
  const access = await requireOrganizationAccess(
    "assessments",
    minimumLevel,
    "/portal/cross-standard-matrix",
  );
  return { ...access, admin: createAdminClient() };
}

async function currentGroup(admin, groupId) {
  const { data, error } = await admin
    .from("cross_standard_control_groups")
    .select("id,group_code,title")
    .eq("id", groupId)
    .eq("active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("The selected cross-standard control is no longer active.");
  return data;
}

async function currentPerson(admin, organizationId, personId) {
  if (!personId) return null;
  const { data, error } = await admin
    .from("organization_people")
    .select("id")
    .eq("id", personId)
    .eq("organization_id", organizationId)
    .eq("account_status", "active")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Select an active accountable owner from the Company User list.");
  return data;
}

export async function saveCrossStandardControl(_previousState, formData) {
  try {
    const { user, organization, admin } = await matrixContext("contribute");
    const groupId = clean(formData.get("control_group_id"), 80);
    const personId = clean(formData.get("accountable_person_id"), 80) || null;
    const status = clean(formData.get("implementation_status"), 40) || "not_reviewed";
    const lastReviewDate = clean(formData.get("last_review_date"), 10) || null;
    const nextReviewDate = clean(formData.get("next_review_date"), 10) || null;

    if (!groupId) return { error: "The cross-standard control reference is missing." };
    if (!STATUSES.has(status)) return { error: "Select a valid implementation status." };
    if (["implemented", "effective"].includes(status) && !personId) {
      return { error: "Assign an accountable Company User before marking this control implemented or effective." };
    }
    if (lastReviewDate && nextReviewDate && nextReviewDate < lastReviewDate) {
      return { error: "The next review date cannot be earlier than the last review date." };
    }

    const [group] = await Promise.all([
      currentGroup(admin, groupId),
      currentPerson(admin, organization.id, personId),
    ]);

    const values = {
      organization_id: organization.id,
      owner_id: organization.owner_id,
      control_group_id: group.id,
      accountable_person_id: personId,
      implementation_status: status,
      implementation_summary: clean(formData.get("implementation_summary"), 3000) || null,
      applicability_notes: clean(formData.get("applicability_notes"), 3000) || null,
      last_review_date: lastReviewDate,
      next_review_date: nextReviewDate,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    const { error } = await admin
      .from("organization_cross_standard_controls")
      .upsert(
        { ...values, created_by: user.id },
        { onConflict: "organization_id,control_group_id" },
      );
    if (error) throw new Error(error.message);

    revalidatePath("/portal/cross-standard-matrix");
    return { success: `${group.group_code} saved. Evidence remains subject to each standard's own conformity decision.` };
  } catch (error) {
    return { error: error?.message || "The cross-standard control could not be saved." };
  }
}

export async function linkCrossStandardEvidence(_previousState, formData) {
  try {
    const { user, organization, admin } = await matrixContext("contribute");
    const groupId = clean(formData.get("control_group_id"), 80);
    const documentId = clean(formData.get("controlled_document_id"), 80);
    if (!groupId || !documentId) return { error: "Select a current controlled document." };

    const { data: control, error: controlError } = await admin
      .from("organization_cross_standard_controls")
      .select("id")
      .eq("organization_id", organization.id)
      .eq("control_group_id", groupId)
      .maybeSingle();
    if (controlError) throw new Error(controlError.message);
    if (!control) return { error: "Save the control assessment before linking evidence." };

    const { data: document, error: documentError } = await admin
      .from("controlled_documents")
      .select("id")
      .eq("id", documentId)
      .eq("status", "Current")
      .maybeSingle();
    if (documentError) throw new Error(documentError.message);
    if (!document) return { error: "The selected document is no longer current." };

    const { data: existing } = await admin
      .from("cross_standard_evidence_links")
      .select("id")
      .eq("organization_control_id", control.id)
      .eq("controlled_document_id", document.id)
      .maybeSingle();
    if (existing) return { success: "That controlled document is already linked." };

    const { error } = await admin.from("cross_standard_evidence_links").insert({
      organization_id: organization.id,
      owner_id: organization.owner_id,
      organization_control_id: control.id,
      controlled_document_id: document.id,
      source_type: "controlled_document",
      evidence_purpose: clean(formData.get("evidence_purpose"), 500) || null,
      created_by: user.id,
    });
    if (error) throw new Error(error.message);

    revalidatePath("/portal/cross-standard-matrix");
    return { success: "Controlled evidence linked without changing its document status or revision." };
  } catch (error) {
    return { error: error?.message || "The evidence link could not be saved." };
  }
}

