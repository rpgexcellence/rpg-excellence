"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireOrganizationAccess } from "../../../../../lib/organization-access";
import { requirePlanAccess } from "../../../../../lib/plan-access";
import { createAdminClient } from "../../../../../lib/supabase/admin";
import { calculateActionDueDate, validateCompanyPeople } from "../../../../../lib/workplace-inspections";

const ROOT = "/portal/health-safety/workplace-inspections";
const RESPONSES = ["not_assessed", "yes", "no", "not_applicable"];
const PRIORITIES = ["low", "medium", "high", "critical"];
const FINDING_TYPES = ["immediate_danger", "unsafe_condition", "unsafe_act", "nonconformity", "environmental", "positive_practice", "opportunity_for_improvement"];

function text(formData, name, maximum = 3000) {
  const value = String(formData.get(name) || "").trim();
  if (value.length > maximum) throw new Error(name.replaceAll("_", " ") + " is too long.");
  return value;
}

function required(formData, name, label, maximum = 3000) {
  const value = text(formData, name, maximum);
  if (!value) throw new Error(label + " is required.");
  return value;
}

function scale(formData, name, label) {
  const value = Number.parseInt(String(formData.get(name) || ""), 10);
  if (!Number.isInteger(value) || value < 1 || value > 5) throw new Error(label + " must be between 1 and 5.");
  return value;
}

function reference(prefix) {
  return prefix + "-" + new Date().getUTCFullYear() + "-" + randomUUID().slice(0, 8).toUpperCase();
}

async function context(minimumLevel = "contribute") {
  const access = await requireOrganizationAccess("risk_management", minimumLevel, ROOT);
  await requirePlanAccess(access.user, "professional", "Health and Safety");
  return access;
}

async function loadInspection(admin, organizationId, inspectionId) {
  const { data, error } = await admin.from("hs_workplace_inspections")
    .select("*").eq("id", inspectionId).eq("organization_id", organizationId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("The Workplace Inspection was not found in your organisation.");
  return data;
}

export async function saveInspectionFieldwork(previousState, formData) {
  try {
    const access = await context("contribute");
    const organizationId = access.organization.id;
    const inspectionId = required(formData, "inspection_id", "Inspection", 80);
    const admin = createAdminClient();
    const inspection = await loadInspection(admin, organizationId, inspectionId);
    if (["completed", "cancelled"].includes(inspection.status)) throw new Error("This inspection is read-only.");

    let submitted;
    try {
      submitted = JSON.parse(required(formData, "responses_json", "Inspection responses", 200000));
    } catch {
      throw new Error("The inspection responses could not be read.");
    }
    if (!Array.isArray(submitted)) throw new Error("The inspection responses are invalid.");

    const { data: controlled, error: controlledError } = await admin
      .from("hs_workplace_inspection_responses")
      .select("id,response")
      .eq("inspection_id", inspectionId)
      .eq("organization_id", organizationId);
    if (controlledError) throw new Error(controlledError.message);
    if (submitted.length !== (controlled || []).length) throw new Error("The question set changed. Refresh the inspection before saving.");

    const controlledIds = new Set((controlled || []).map((item) => item.id));
    const seen = new Set();
    const rows = submitted.map((item) => {
      if (!item?.id || !controlledIds.has(item.id) || seen.has(item.id)) throw new Error("The submitted question set is invalid.");
      seen.add(item.id);
      const response = String(item.response || "not_assessed");
      if (!RESPONSES.includes(response)) throw new Error("A response contains an invalid selection.");
      const comments = String(item.comments_actions || "").trim();
      const justification = String(item.not_applicable_justification || "").trim();
      if (response === "no" && !comments) throw new Error("Every No response requires an observation and action note.");
      if (response === "not_applicable" && !justification) throw new Error("Every N/A response requires a justification.");
      if (comments.length > 4000 || justification.length > 2000) throw new Error("A response comment is too long.");
      return {
        id: item.id,
        response,
        comments_actions: comments || null,
        not_applicable_justification: justification || null,
        finding_required: response === "no" || Boolean(item.finding_required),
        assessed_by_person_id: access.person?.id || null,
        assessed_at: response === "not_assessed" ? null : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    const results = await Promise.all(rows.map((row) => admin
      .from("hs_workplace_inspection_responses")
      .update({
        response: row.response,
        comments_actions: row.comments_actions,
        not_applicable_justification: row.not_applicable_justification,
        finding_required: row.finding_required,
        assessed_by_person_id: row.assessed_by_person_id,
        assessed_at: row.assessed_at,
        updated_at: row.updated_at,
      })
      .eq("id", row.id)
      .eq("inspection_id", inspectionId)
      .eq("organization_id", organizationId)));
    const failed = results.find((result) => result.error);
    if (failed?.error) throw new Error(failed.error.message);

    const nextStatus = ["draft", "planned", "due"].includes(inspection.status) ? "in_progress" : inspection.status;
    const { error: inspectionError } = await admin.from("hs_workplace_inspections").update({
      status: nextStatus,
      started_at: inspection.started_at || new Date().toISOString(),
      updated_by_user_id: access.user.id,
      updated_at: new Date().toISOString(),
    }).eq("id", inspectionId).eq("organization_id", organizationId);
    if (inspectionError) throw new Error(inspectionError.message);

    revalidatePath(ROOT + "/" + inspectionId);
    revalidatePath(ROOT);
    return { success: "Responses saved to the controlled inspection record." };
  } catch (error) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    return { error: error.message || "Fieldwork could not be saved." };
  }
}

export async function createInspectionFinding(previousState, formData) {
  try {
    const access = await context("contribute");
    const organizationId = access.organization.id;
    const inspectionId = required(formData, "inspection_id", "Inspection", 80);
    const responseId = text(formData, "response_id", 80) || null;
    const findingType = required(formData, "finding_type", "Finding type", 80);
    const priority = required(formData, "priority", "Priority", 20);
    if (!FINDING_TYPES.includes(findingType)) throw new Error("Select a valid finding type.");
    if (!PRIORITIES.includes(priority)) throw new Error("Select a valid priority.");

    const admin = createAdminClient();
    await loadInspection(admin, organizationId, inspectionId);
    if (responseId) {
      const { data: response, error } = await admin.from("hs_workplace_inspection_responses")
        .select("id").eq("id", responseId).eq("inspection_id", inspectionId).eq("organization_id", organizationId).maybeSingle();
      if (error) throw new Error(error.message);
      if (!response) throw new Error("The selected inspection response was not found.");
    }

    const { error } = await admin.from("hs_workplace_inspection_findings").insert({
      organization_id: organizationId,
      inspection_id: inspectionId,
      response_id: responseId,
      finding_reference: reference("WPI-F"),
      title: required(formData, "title", "Finding title", 180),
      description: required(formData, "description", "Finding description"),
      finding_type: findingType,
      priority,
      severity: scale(formData, "severity", "Severity"),
      likelihood: scale(formData, "likelihood", "Likelihood"),
      immediate_action_taken: text(formData, "immediate_action_taken") || null,
      stop_work_applied: formData.get("stop_work_applied") === "true",
      status: "open",
    });
    if (error) throw new Error(error.message);

    revalidatePath(ROOT + "/" + inspectionId);
    revalidatePath(ROOT);
    return { success: "Finding created and added to the inspection action workflow." };
  } catch (error) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    return { error: error.message || "The finding could not be created." };
  }
}

export async function createInspectionAction(previousState, formData) {
  try {
    const access = await context("contribute");
    const organizationId = access.organization.id;
    const inspectionId = required(formData, "inspection_id", "Inspection", 80);
    const findingId = required(formData, "finding_id", "Finding", 80);
    const priority = required(formData, "priority", "Priority", 20);
    if (!PRIORITIES.includes(priority)) throw new Error("Select a valid priority.");
    const responsiblePersonId = required(formData, "responsible_person_id", "Responsible owner", 80);
    const verifierPersonId = required(formData, "verifier_person_id", "Independent verifier", 80);
    if (responsiblePersonId === verifierPersonId) throw new Error("The action owner cannot verify their own action.");
    await validateCompanyPeople(organizationId, [responsiblePersonId, verifierPersonId]);

    const admin = createAdminClient();
    await loadInspection(admin, organizationId, inspectionId);
    const { data: finding, error: findingError } = await admin.from("hs_workplace_inspection_findings")
      .select("id").eq("id", findingId).eq("inspection_id", inspectionId).eq("organization_id", organizationId).maybeSingle();
    if (findingError) throw new Error(findingError.message);
    if (!finding) throw new Error("The selected finding was not found.");

    const requestedDate = text(formData, "target_date", 10);
    const targetDate = requestedDate || calculateActionDueDate(priority);
    const { error } = await admin.from("hs_workplace_inspection_actions").insert({
      organization_id: organizationId,
      inspection_id: inspectionId,
      finding_id: findingId,
      action_reference: reference("WPI-A"),
      action_text: required(formData, "action_text", "Required action"),
      priority,
      responsible_person_id: responsiblePersonId,
      verifier_person_id: verifierPersonId,
      target_date: targetDate,
      status: "open",
      created_by_user_id: access.user.id,
      updated_by_user_id: access.user.id,
    });
    if (error) throw new Error(error.message);
    await admin.from("hs_workplace_inspection_findings").update({ status: "assigned", updated_at: new Date().toISOString() }).eq("id", findingId);

    revalidatePath(ROOT + "/" + inspectionId);
    revalidatePath(ROOT);
    revalidatePath("/portal/tasks");
    return { success: "Action assigned to the selected Company User." };
  } catch (error) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    return { error: error.message || "The action could not be created." };
  }
}

export async function submitInspectionForReview(previousState, formData) {
  try {
    const access = await context("contribute");
    const organizationId = access.organization.id;
    const inspectionId = required(formData, "inspection_id", "Inspection", 80);
    const admin = createAdminClient();
    const inspection = await loadInspection(admin, organizationId, inspectionId);

    const [{ data: responses, error: responseError }, { data: findings, error: findingError }] = await Promise.all([
      admin.from("hs_workplace_inspection_responses").select("id,response,finding_required").eq("inspection_id", inspectionId).eq("organization_id", organizationId),
      admin.from("hs_workplace_inspection_findings").select("id,response_id,status").eq("inspection_id", inspectionId).eq("organization_id", organizationId).neq("status", "cancelled"),
    ]);
    if (responseError) throw new Error(responseError.message);
    if (findingError) throw new Error(findingError.message);
    if ((responses || []).some((item) => item.response === "not_assessed")) throw new Error("Assess every question before submitting the inspection.");
    const findingResponseIds = new Set((findings || []).map((item) => item.response_id).filter(Boolean));
    const unresolved = (responses || []).filter((item) => item.finding_required && !findingResponseIds.has(item.id));
    if (unresolved.length) throw new Error("Create a finding for every response marked as requiring a finding.");

    const { error } = await admin.from("hs_workplace_inspections").update({
      status: "awaiting_review",
      completed_at: inspection.completed_at || new Date().toISOString(),
      updated_by_user_id: access.user.id,
      updated_at: new Date().toISOString(),
    }).eq("id", inspectionId).eq("organization_id", organizationId);
    if (error) throw new Error(error.message);

    revalidatePath(ROOT + "/" + inspectionId);
    revalidatePath(ROOT);
    revalidatePath("/portal/tasks");
    return { success: "Inspection submitted to the assigned independent reviewer." };
  } catch (error) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    return { error: error.message || "The inspection could not be submitted." };
  }
}
