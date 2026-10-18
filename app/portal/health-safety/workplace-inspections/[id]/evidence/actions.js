"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireOrganizationAccess } from "../../../../../../lib/organization-access";
import { requirePlanAccess } from "../../../../../../lib/plan-access";
import { createAdminClient } from "../../../../../../lib/supabase/admin";

const ROOT = "/portal/health-safety/workplace-inspections";
const BUCKET = "hs-workplace-inspection-evidence";
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const TYPES = ["photograph", "document", "record", "interview", "observation", "measurement", "test_result", "other"];

function text(formData, name, maximum = 2000) {
  const value = String(formData.get(name) || "").trim();
  if (value.length > maximum) throw new Error(name.replaceAll("_", " ") + " is too long.");
  return value;
}

function required(formData, name, label, maximum = 2000) {
  const value = text(formData, name, maximum);
  if (!value) throw new Error(label + " is required.");
  return value;
}

function safeFileName(name) {
  return String(name || "evidence")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 140);
}

function secureExternalUrl(value) {
  if (!value) return null;
  let url;
  try { url = new URL(value); } catch { throw new Error("Enter a valid secure external link."); }
  if (url.protocol !== "https:") throw new Error("External evidence links must use HTTPS.");
  return url.toString();
}

async function context() {
  const access = await requireOrganizationAccess("risk_management", "contribute", ROOT);
  await requirePlanAccess(access.user, "professional", "Health and Safety");
  return access;
}

async function inspectionRecord(admin, organizationId, inspectionId, allowReadOnly = false) {
  const { data, error } = await admin.from("hs_workplace_inspections")
    .select("id,status").eq("id", inspectionId).eq("organization_id", organizationId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("The Workplace Inspection was not found in your organisation.");
  if (!allowReadOnly && ["completed", "cancelled"].includes(data.status)) throw new Error("This inspection is read-only.");
  return data;
}

async function validateLinkTarget(admin, organizationId, inspectionId, table, id) {
  if (!id) return null;
  const { data, error } = await admin.from(table).select("id")
    .eq("id", id).eq("inspection_id", inspectionId).eq("organization_id", organizationId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("The selected evidence link target is invalid.");
  return id;
}

export async function addInspectionEvidence(previousState, formData) {
  let uploadedPath = null;
  try {
    const access = await context();
    const organizationId = access.organization.id;
    const inspectionId = required(formData, "inspection_id", "Inspection", 80);
    const evidenceType = required(formData, "evidence_type", "Evidence type", 40);
    if (!TYPES.includes(evidenceType)) throw new Error("Select a valid evidence type.");
    const admin = createAdminClient();
    await inspectionRecord(admin, organizationId, inspectionId);

    const responseId = await validateLinkTarget(admin, organizationId, inspectionId, "hs_workplace_inspection_responses", text(formData, "response_id", 80));
    const findingId = await validateLinkTarget(admin, organizationId, inspectionId, "hs_workplace_inspection_findings", text(formData, "finding_id", 80));
    const actionId = await validateLinkTarget(admin, organizationId, inspectionId, "hs_workplace_inspection_actions", text(formData, "action_id", 80));
    const externalUrl = secureExternalUrl(text(formData, "external_url", 2000));
    const file = formData.get("evidence_file");
    const hasFile = file && typeof file === "object" && Number(file.size) > 0;
    if (!hasFile && !externalUrl) throw new Error("Upload a file or provide a secure external link.");
    if (hasFile && file.size > MAX_FILE_BYTES) throw new Error("Evidence files must not exceed 10 MB.");

    let originalFileName = null;
    let mimeType = null;
    let fileSizeBytes = null;
    if (hasFile) {
      originalFileName = safeFileName(file.name);
      mimeType = String(file.type || "application/octet-stream").slice(0, 150);
      fileSizeBytes = file.size;
      uploadedPath = organizationId + "/" + inspectionId + "/" + randomUUID() + "-" + originalFileName;
      const bytes = Buffer.from(await file.arrayBuffer());
      const { error: uploadError } = await admin.storage.from(BUCKET).upload(uploadedPath, bytes, {
        contentType: mimeType,
        upsert: false,
      });
      if (uploadError) throw new Error(uploadError.message);
    }

    const { error } = await admin.from("hs_workplace_inspection_evidence").insert({
      organization_id: organizationId,
      inspection_id: inspectionId,
      response_id: responseId,
      finding_id: findingId,
      action_id: actionId,
      evidence_type: evidenceType,
      title: required(formData, "title", "Evidence title", 180),
      description: text(formData, "description", 2000) || null,
      storage_path: uploadedPath,
      original_file_name: originalFileName,
      mime_type: mimeType,
      file_size_bytes: fileSizeBytes,
      external_url: externalUrl,
      captured_offline: formData.get("captured_offline") === "true",
      uploaded_by_user_id: access.user.id,
    });
    if (error) {
      if (uploadedPath) await admin.storage.from(BUCKET).remove([uploadedPath]);
      throw new Error(error.message);
    }

    revalidatePath(ROOT + "/" + inspectionId);
    revalidatePath(ROOT + "/" + inspectionId + "/evidence");
    return { success: "Evidence added to the controlled inspection record." };
  } catch (error) {
    return { error: error.message || "The evidence could not be added." };
  }
}

export async function createInspectionEvidenceDownload(formData) {
  const access = await context();
  const organizationId = access.organization.id;
  const inspectionId = required(formData, "inspection_id", "Inspection", 80);
  const evidenceId = required(formData, "evidence_id", "Evidence", 80);
  const admin = createAdminClient();
  await inspectionRecord(admin, organizationId, inspectionId, true);

  const { data: evidence, error } = await admin.from("hs_workplace_inspection_evidence")
    .select("storage_path,external_url").eq("id", evidenceId).eq("inspection_id", inspectionId).eq("organization_id", organizationId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!evidence) throw new Error("Evidence was not found.");
  if (evidence.external_url && !evidence.storage_path) return { externalUrl: evidence.external_url };
  if (!evidence.storage_path) throw new Error("This evidence item does not contain a file.");

  const { data, error: signedError } = await admin.storage.from(BUCKET).createSignedUrl(evidence.storage_path, 60);
  if (signedError) throw new Error(signedError.message);
  return { signedUrl: data.signedUrl };
}
