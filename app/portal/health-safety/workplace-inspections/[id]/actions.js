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

function assignedPerson(access, personId, roleLabel) {
  if (!access.person?.id || access.person.id !== personId) {
    throw new Error("Only the assigned " + roleLabel + " can complete this decision.");
  }
}

function refreshControlledViews(inspectionId) {
  revalidatePath(ROOT + "/" + inspectionId);
  revalidatePath(ROOT);
  revalidatePath("/portal/health-safety/management-board");
  revalidatePath("/portal/tasks");
  revalidatePath("/portal/management-oversight");
}

export async function reviewInspection(previousState, formData) {
  try {
    const access = await context("contribute");
    const organizationId = access.organization.id;
    const inspectionId = required(formData, "inspection_id", "Inspection", 80);
    const decision = required(formData, "review_decision", "Review decision", 20);
    const comment = text(formData, "review_comment", 3000);
    if (!["approved", "returned"].includes(decision)) {
      throw new Error("Select approve or return for correction.");
    }
    if (decision === "returned" && !comment) {
      throw new Error("Explain what must be corrected before resubmission.");
    }

    const admin = createAdminClient();
    const inspection = await loadInspection(admin, organizationId, inspectionId);
    assignedPerson(access, inspection.reviewer_person_id, "independent reviewer");
    if (inspection.status !== "awaiting_review") {
      throw new Error("This inspection is not awaiting independent review.");
    }

    const [actionResult, findingResult] = await Promise.all([
      admin
        .from("hs_workplace_inspection_actions")
        .select("id,finding_id,status")
        .eq("organization_id", organizationId)
        .eq("inspection_id", inspectionId)
        .neq("status", "cancelled"),
      admin
        .from("hs_workplace_inspection_findings")
        .select("id,finding_type,status")
        .eq("organization_id", organizationId)
        .eq("inspection_id", inspectionId)
        .neq("status", "cancelled"),
    ]);
    if (actionResult.error) throw new Error(actionResult.error.message);
    if (findingResult.error) throw new Error(findingResult.error.message);
    const actions = actionResult.data || [];
    const assignedFindingIds = new Set(actions.map((item) => item.finding_id));
    const findingsWithoutAction = (findingResult.data || []).filter(
      (finding) =>
        finding.finding_type !== "positive_practice" &&
        !assignedFindingIds.has(finding.id),
    );
    if (decision === "approved" && findingsWithoutAction.length) {
      throw new Error(
        "Assign a controlled action to every applicable finding before approval.",
      );
    }

    const now = new Date().toISOString();
    const hasActions = actions.length > 0;
    const nextStatus =
      decision === "returned"
        ? "in_progress"
        : hasActions
          ? "actions_open"
          : "completed";
    const { error } = await admin
      .from("hs_workplace_inspections")
      .update({
        status: nextStatus,
        review_decision: decision,
        review_comment: comment || null,
        reviewed_at: now,
        reviewed_by_user_id: access.user.id,
        reviewed_by_person_id: access.person.id,
        returned_at: decision === "returned" ? now : null,
        closed_at: nextStatus === "completed" ? now : null,
        closed_by_user_id: nextStatus === "completed" ? access.user.id : null,
        updated_by_user_id: access.user.id,
        updated_at: now,
      })
      .eq("id", inspectionId)
      .eq("organization_id", organizationId);
    if (error) throw new Error(error.message);

    refreshControlledViews(inspectionId);
    return {
      success:
        decision === "returned"
          ? "Inspection returned to the assigned inspector for correction."
          : hasActions
            ? "Inspection approved. Assigned actions must now be completed and verified."
            : "Inspection approved and closed; no corrective actions remain.",
    };
  } catch (error) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    return { error: error.message || "The review decision could not be saved." };
  }
}

export async function completeInspectionAction(previousState, formData) {
  try {
    const access = await context("contribute");
    const organizationId = access.organization.id;
    const inspectionId = required(formData, "inspection_id", "Inspection", 80);
    const actionId = required(formData, "action_id", "Action", 80);
    const completionEvidence = required(
      formData,
      "completion_evidence",
      "Completion evidence",
      3000,
    );
    const completionComment = text(formData, "completion_comment", 3000);
    const admin = createAdminClient();
    const inspection = await loadInspection(admin, organizationId, inspectionId);
    if (!["actions_open", "awaiting_verification"].includes(inspection.status)) {
      throw new Error("The inspection actions are not open for completion.");
    }

    const { data: action, error: actionError } = await admin
      .from("hs_workplace_inspection_actions")
      .select("*")
      .eq("id", actionId)
      .eq("inspection_id", inspectionId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (actionError) throw new Error(actionError.message);
    if (!action) throw new Error("The assigned action was not found.");
    assignedPerson(access, action.responsible_person_id, "action owner");
    if (["closed", "cancelled"].includes(action.status)) {
      throw new Error("This action is already closed or cancelled.");
    }

    const now = new Date().toISOString();
    const { error } = await admin
      .from("hs_workplace_inspection_actions")
      .update({
        status: "awaiting_verification",
        completion_evidence: completionEvidence,
        completion_comment: completionComment || null,
        completed_at: now,
        completed_by_user_id: access.user.id,
        effectiveness_result: null,
        verification_comment: null,
        verified_at: null,
        verified_by_user_id: null,
        updated_by_user_id: access.user.id,
        updated_at: now,
      })
      .eq("id", actionId)
      .eq("organization_id", organizationId);
    if (error) throw new Error(error.message);

    await admin
      .from("hs_workplace_inspections")
      .update({
        status: "awaiting_verification",
        closure_requested_at: now,
        updated_by_user_id: access.user.id,
        updated_at: now,
      })
      .eq("id", inspectionId)
      .eq("organization_id", organizationId);

    refreshControlledViews(inspectionId);
    return {
      success: "Action submitted to the assigned independent verifier.",
    };
  } catch (error) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    return { error: error.message || "The action could not be completed." };
  }
}

export async function verifyInspectionAction(previousState, formData) {
  try {
    const access = await context("contribute");
    const organizationId = access.organization.id;
    const inspectionId = required(formData, "inspection_id", "Inspection", 80);
    const actionId = required(formData, "action_id", "Action", 80);
    const result = required(
      formData,
      "effectiveness_result",
      "Effectiveness result",
      30,
    );
    const verificationComment = required(
      formData,
      "verification_comment",
      "Verification comment",
      3000,
    );
    if (!["effective", "not_effective"].includes(result)) {
      throw new Error("Select effective or not effective.");
    }

    const admin = createAdminClient();
    const inspection = await loadInspection(admin, organizationId, inspectionId);
    const { data: action, error: actionError } = await admin
      .from("hs_workplace_inspection_actions")
      .select("*")
      .eq("id", actionId)
      .eq("inspection_id", inspectionId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (actionError) throw new Error(actionError.message);
    if (!action) throw new Error("The action awaiting verification was not found.");
    assignedPerson(access, action.verifier_person_id, "independent verifier");
    if (action.responsible_person_id === action.verifier_person_id) {
      throw new Error("The action owner cannot verify their own action.");
    }
    if (action.status !== "awaiting_verification") {
      throw new Error("This action is not awaiting effectiveness verification.");
    }

    const now = new Date().toISOString();
    const actionStatus = result === "effective" ? "closed" : "open";
    const { error } = await admin
      .from("hs_workplace_inspection_actions")
      .update({
        status: actionStatus,
        effectiveness_result: result,
        verification_comment: verificationComment,
        verified_at: now,
        verified_by_user_id: access.user.id,
        updated_by_user_id: access.user.id,
        updated_at: now,
      })
      .eq("id", actionId)
      .eq("organization_id", organizationId);
    if (error) throw new Error(error.message);

    if (result === "effective") {
      await admin
        .from("hs_workplace_inspection_findings")
        .update({ status: "closed", updated_at: now })
        .eq("id", action.finding_id)
        .eq("organization_id", organizationId);
    } else {
      await admin
        .from("hs_workplace_inspection_findings")
        .update({ status: "assigned", updated_at: now })
        .eq("id", action.finding_id)
        .eq("organization_id", organizationId);
    }

    const { data: remaining, error: remainingError } = await admin
      .from("hs_workplace_inspection_actions")
      .select("id,status")
      .eq("inspection_id", inspectionId)
      .eq("organization_id", organizationId)
      .neq("status", "cancelled")
      .neq("status", "closed");
    if (remainingError) throw new Error(remainingError.message);
    const allEffective = result === "effective" && !(remaining || []).length;
    const hasOpenAction = (remaining || []).some((item) => item.status === "open");
    const nextInspectionStatus = allEffective
      ? "completed"
      : result === "not_effective" || hasOpenAction
        ? "actions_open"
        : "awaiting_verification";
    const { error: inspectionError } = await admin
      .from("hs_workplace_inspections")
      .update({
        status: nextInspectionStatus,
        closed_at: allEffective ? now : null,
        closed_by_user_id: allEffective ? access.user.id : null,
        updated_by_user_id: access.user.id,
        updated_at: now,
      })
      .eq("id", inspection.id)
      .eq("organization_id", organizationId);
    if (inspectionError) throw new Error(inspectionError.message);

    refreshControlledViews(inspectionId);
    return {
      success: allEffective
        ? "Action verified effective. All actions are closed and the inspection is complete."
        : result === "effective"
          ? "Action verified effective. Other actions still require completion or verification."
          : "Action assessed as not effective and returned to its assigned owner.",
    };
  } catch (error) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    return {
      error: error.message || "The effectiveness decision could not be saved.",
    };
  }
}
