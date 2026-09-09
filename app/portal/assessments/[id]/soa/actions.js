"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/server";
import { createAdminClient } from "../../../../../lib/supabase/admin";
import { requireAssessmentWriteAccess } from "../../../../../lib/assessment-access";

const VALID_REGISTER_STATUSES = [
  "draft",
  "under_review",
  "approved",
  "superseded",
];

const VALID_APPLICABILITY = [
  "pending",
  "applicable",
  "not_applicable",
];

const VALID_IMPLEMENTATION_STATUSES = [
  "not_assessed",
  "not_implemented",
  "planned",
  "partially_implemented",
  "implemented",
  "effective",
];

const VALID_INCLUSION_SOURCES = [
  "risk_treatment",
  "legal_regulatory",
  "contractual",
  "business_requirement",
  "interested_party",
  "good_practice",
];

const VALID_RESIDUAL_RISK_LEVELS = [
  "not_assessed",
  "low",
  "moderate",
  "high",
  "critical",
];

const VALID_TREATMENT_DECISIONS = [
  "pending",
  "monitor",
  "accept",
  "reduce",
  "avoid",
  "share",
];

function cleanText(value) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  return value.trim();
}

function cleanDate(value) {
  const text = cleanText(value);

  if (!text) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new Error("Enter dates in YYYY-MM-DD format.");
  }

  return text;
}

function requireChoice(value, allowed, label) {
  const text = cleanText(value);

  if (!text || !allowed.includes(text)) {
    throw new Error(`Select a valid ${label}.`);
  }

  return text;
}

function fieldKey(controlId) {
  return controlId.replaceAll(".", "_");
}

async function getOwnedIso27001Assessment(supabase, userId, assessmentId) {
  const { data: assessment, error } = await supabase
    .from("assessments")
    .select("id, owner_id, organization_id, standard")
    .eq("id", assessmentId)
    .eq("owner_id", userId)
    .single();

  if (error || !assessment) {
    throw new Error("Assessment not found.");
  }

  if (
    assessment.standard !== "ISO/IEC 27001:2022" &&
    assessment.standard !== "ISO/IEC 27001:2022/Amd 1:2024"
  ) {
    throw new Error("The Statement of Applicability is available only for ISO/IEC 27001 assessments.");
  }

  return assessment;
}

async function getContext(formData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/portal/login");
  }

  const assessmentId = cleanText(formData.get("assessment_id"));

  if (!assessmentId) {
    throw new Error("Missing assessment ID.");
  }

  const assessment = await getOwnedIso27001Assessment(
    supabase,
    user.id,
    assessmentId
  );

  await requireAssessmentWriteAccess(user.id, assessmentId);

  return {
    admin: createAdminClient(),
    assessment,
    assessmentId,
    user,
  };
}

async function provisionRegister(admin, assessment, userId) {
  const { data: registerId, error } = await admin.rpc(
    "provision_iso27001_soa",
    {
      p_assessment_id: assessment.id,
      p_owner_id: userId,
      p_organization_id: assessment.organization_id ?? null,
    }
  );

  if (error || !registerId) {
    throw new Error(error?.message ?? "Unable to create the Statement of Applicability.");
  }

  return registerId;
}

export async function provisionSoa(formData) {
  const { admin, assessment, assessmentId, user } = await getContext(formData);

  await provisionRegister(admin, assessment, user.id);

  revalidatePath(`/portal/assessments/${assessmentId}/soa`);
  redirect(`/portal/assessments/${assessmentId}/soa`);
}

export async function saveSoaRegister(formData) {
  const { admin, assessment, assessmentId, user } = await getContext(formData);
  const registerId = await provisionRegister(admin, assessment, user.id);
  const status = requireChoice(
    formData.get("status"),
    VALID_REGISTER_STATUSES,
    "SoA status"
  );

  const approvedBy = cleanText(formData.get("approved_by"));

  if (status === "approved" && !approvedBy) {
    throw new Error("Approved by is required before approving the Statement of Applicability.");
  }

  const { error } = await admin
    .from("assessment_soa_registers")
    .update({
      version: cleanText(formData.get("version")) ?? "1.0",
      status,
      isms_scope: cleanText(formData.get("isms_scope")),
      risk_assessment_reference: cleanText(
        formData.get("risk_assessment_reference")
      ),
      risk_treatment_plan_reference: cleanText(
        formData.get("risk_treatment_plan_reference")
      ),
      prepared_by: cleanText(formData.get("prepared_by")),
      reviewed_by: cleanText(formData.get("reviewed_by")),
      approved_by: approvedBy,
      approved_at: status === "approved" ? new Date().toISOString() : null,
      review_due_at: cleanDate(formData.get("review_due_at")),
      approval_statement: cleanText(formData.get("approval_statement")),
      updated_at: new Date().toISOString(),
    })
    .eq("id", registerId)
    .eq("assessment_id", assessmentId)
    .eq("owner_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/portal/assessments/${assessmentId}/soa`);
}

export async function saveSoaControl(formData) {
  const { admin, assessment, assessmentId, user } = await getContext(formData);
  const registerId = await provisionRegister(admin, assessment, user.id);
  const controlId = cleanText(formData.get("control_id"));

  if (!controlId || !/^([5-8])\.\d{1,2}$/.test(controlId)) {
    throw new Error("Invalid Annex A control.");
  }

  const key = fieldKey(controlId);
  const applicability = requireChoice(
    formData.get(`applicability_${key}`),
    VALID_APPLICABILITY,
    "applicability conclusion"
  );
  const implementationStatus = requireChoice(
    formData.get(`implementation_status_${key}`),
    VALID_IMPLEMENTATION_STATUSES,
    "implementation status"
  );
  const justification = cleanText(
    formData.get(`applicability_justification_${key}`)
  );

  if (applicability !== "pending" && !justification) {
    throw new Error("Record a justification for the applicability decision.");
  }

  const inclusionSource = formData
    .getAll(`inclusion_source_${key}`)
    .filter(
      (value) =>
        typeof value === "string" &&
        VALID_INCLUSION_SOURCES.includes(value)
    );

  const residualRiskLevel = requireChoice(
    formData.get(`residual_risk_level_${key}`),
    VALID_RESIDUAL_RISK_LEVELS,
    "residual-risk level"
  );
  const treatmentDecision = requireChoice(
    formData.get(`treatment_decision_${key}`),
    VALID_TREATMENT_DECISIONS,
    "risk-treatment decision"
  );
  const residualRiskRationale = cleanText(
    formData.get(`residual_risk_rationale_${key}`)
  );
  const riskOwner = cleanText(formData.get(`risk_owner_${key}`));
  const acceptanceAuthority = cleanText(
    formData.get(`risk_acceptance_authority_${key}`)
  );
  const acceptedAt = cleanDate(formData.get(`risk_accepted_at_${key}`));
  const riskReviewDueAt = cleanDate(
    formData.get(`risk_review_due_at_${key}`)
  );
  const actionRequired = cleanText(formData.get(`action_required_${key}`));

  if (residualRiskLevel !== "not_assessed" && !residualRiskRationale) {
    throw new Error("Explain the evidence and reasoning supporting the residual-risk level.");
  }

  if (["moderate", "high", "critical"].includes(residualRiskLevel) && !riskOwner) {
    throw new Error("A risk owner is required for Moderate, High or Critical residual risk.");
  }

  if (["high", "critical"].includes(residualRiskLevel)) {
    if (!["reduce", "avoid", "share", "accept"].includes(treatmentDecision)) {
      throw new Error("High or Critical residual risk requires a controlled treatment decision.");
    }

    if (!actionRequired) {
      throw new Error("High or Critical residual risk requires a recorded action.");
    }

    if (!acceptanceAuthority || !acceptedAt || !riskReviewDueAt) {
      throw new Error("High or Critical residual risk requires acceptance authority, acceptance date and review date.");
    }

    if (implementationStatus === "effective") {
      throw new Error("A control with High or Critical residual risk cannot be concluded Effective.");
    }
  }

  if (treatmentDecision === "accept" && (!acceptanceAuthority || !acceptedAt)) {
    throw new Error("Accepted residual risk requires the acceptance authority and acceptance date.");
  }

  const payload = {
    soa_register_id: registerId,
    assessment_id: assessmentId,
    owner_id: user.id,
    control_id: controlId,
    applicability,
    applicability_justification: justification,
    inclusion_source: inclusionSource,
    implementation_status: implementationStatus,
    control_description: cleanText(formData.get(`control_description_${key}`)),
    control_owner: cleanText(formData.get(`control_owner_${key}`)),
    implementation_evidence: cleanText(
      formData.get(`implementation_evidence_${key}`)
    ),
    effectiveness_evidence: cleanText(
      formData.get(`effectiveness_evidence_${key}`)
    ),
    residual_risk: residualRiskRationale,
    residual_risk_level: residualRiskLevel,
    residual_risk_rationale: residualRiskRationale,
    risk_owner: riskOwner,
    treatment_decision: treatmentDecision,
    risk_acceptance_authority: acceptanceAuthority,
    risk_accepted_at: acceptedAt,
    risk_review_due_at: riskReviewDueAt,
    action_required: actionRequired,
    target_date: cleanDate(formData.get(`target_date_${key}`)),
    assessor_conclusion: cleanText(
      formData.get(`assessor_conclusion_${key}`)
    ),
    finding_reference: cleanText(formData.get(`finding_reference_${key}`)),
    last_reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin
    .from("assessment_soa_entries")
    .upsert(payload, { onConflict: "assessment_id,control_id" });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/portal/assessments/${assessmentId}/soa`);
}
