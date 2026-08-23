"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/server";

const ISO_14001_DIMENSIONS = [
  { key: "leadership", name: "Leadership", order: 1 },
  { key: "governance", name: "Governance", order: 2 },
  { key: "environmental_context", name: "Environmental Context", order: 3 },
  { key: "risk_management", name: "Risk Management", order: 4 },
  { key: "operational_control", name: "Operational Control", order: 5 },
  { key: "compliance_assurance", name: "Compliance Assurance", order: 6 },
  { key: "environmental_performance", name: "Environmental Performance", order: 7 },
  { key: "internal_assurance", name: "Internal Assurance", order: 8 },
  { key: "improvement_capability", name: "Improvement Capability", order: 9 },
];

const ISO_45001_DIMENSIONS = [
  { key: "ohs_leadership_culture", name: "Leadership & OH&S Culture", order: 1 },
  { key: "ohs_governance", name: "Governance & Accountability", order: 2 },
  { key: "ohs_context", name: "OH&S Context & Worker Needs", order: 3 },
  { key: "hazard_risk_management", name: "Hazard & Risk Management", order: 4 },
  { key: "worker_participation", name: "Worker Consultation & Participation", order: 5 },
  { key: "ohs_operational_control", name: "Operational & Contractor Control", order: 6 },
  { key: "ohs_compliance_assurance", name: "Legal & Compliance Assurance", order: 7 },
  { key: "ohs_performance_assurance", name: "OH&S Performance & Internal Assurance", order: 8 },
  { key: "ohs_improvement_learning", name: "Improvement & Organisational Learning", order: 9 },
];

const ISO_9001_DIMENSIONS = [
  { key: "qms_leadership_culture", name: "Leadership & Quality Culture", order: 1 },
  { key: "qms_governance", name: "Governance & Accountability", order: 2 },
  { key: "customer_focus", name: "Customer Focus", order: 3 },
  { key: "process_management", name: "Process Management", order: 4 },
  { key: "qms_risk_change", name: "Risk & Change Management", order: 5 },
  { key: "qms_operational_supplier_control", name: "Operational & Supplier Control", order: 6 },
  { key: "quality_performance_data", name: "Quality Performance & Data", order: 7 },
  { key: "qms_internal_assurance", name: "Internal Assurance & Management Review", order: 8 },
  { key: "qms_improvement_learning", name: "Improvement & Organisational Learning", order: 9 },
];

const ISO_17024_DIMENSIONS = [
  { key: "pcb_leadership_impartiality", name: "Leadership, Impartiality & Certification Integrity", order: 1 },
  { key: "pcb_governance_structure", name: "Governance, Structure & Impartiality Safeguards", order: 2 },
  { key: "pcb_scheme_governance", name: "Certification Scheme Governance", order: 3 },
  { key: "pcb_competence_resources", name: "Personnel Competence & Resource Control", order: 4 },
  { key: "pcb_information_records", name: "Confidentiality, Security, Records & Public Information", order: 5 },
  { key: "pcb_assessment_examination", name: "Application, Assessment & Examination Control", order: 6 },
  { key: "pcb_certification_lifecycle", name: "Certification Decisions & Lifecycle Control", order: 7 },
  { key: "pcb_appeals_complaints", name: "Appeals, Complaints & Stakeholder Confidence", order: 8 },
  { key: "pcb_internal_assurance_improvement", name: "Internal Assurance, Corrective Action & Improvement", order: 9 },
];

const READINESS_RATINGS = [
  "Not Ready",
  "Developing",
  "Established",
  "Ready",
];

const CONFIDENCE_LEVELS = [
  "Low",
  "Medium",
  "High",
];

function cleanText(value) {
  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    return null;
  }

  return value.trim();
}

function cleanDate(value) {
  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    return null;
  }

  return value.trim();
}

function getDimensions(standard) {
  switch (standard) {
    case "ISO 9001:2015/Amd 1:2024":
      return ISO_9001_DIMENSIONS;

    case "ISO 14001:2026":
      return ISO_14001_DIMENSIONS;

    case "ISO 45001:2018":
      return ISO_45001_DIMENSIONS;

    case "ISO/IEC 17024:2026":
      return ISO_17024_DIMENSIONS;

    default:
      throw new Error(
        `Management readiness is not configured for ${standard}.`
      );
  }
}

export async function saveManagementReadiness(
  formData
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/portal/login");
  }

  const assessmentId =
    formData.get("assessment_id");

  if (
    typeof assessmentId !== "string" ||
    assessmentId.trim() === ""
  ) {
    throw new Error("Missing assessment ID.");
  }

  const {
    data: assessment,
    error: assessmentError,
  } = await supabase
    .from("assessments")
    .select("id, standard")
    .eq("id", assessmentId)
    .eq("owner_id", user.id)
    .single();

  if (assessmentError || !assessment) {
    throw new Error("Assessment not found.");
  }

  const dimensions =
    getDimensions(assessment.standard);

  const rows = [];

  for (const dimension of dimensions) {
    const readiness = cleanText(
      formData.get(
        `readiness_rating_${dimension.key}`
      )
    );

    const confidence = cleanText(
      formData.get(
        `evidence_confidence_${dimension.key}`
      )
    );

    if (
      readiness &&
      !READINESS_RATINGS.includes(readiness)
    ) {
      throw new Error(
        `Invalid readiness rating for ${dimension.name}.`
      );
    }

    if (
      confidence &&
      !CONFIDENCE_LEVELS.includes(confidence)
    ) {
      throw new Error(
        `Invalid evidence confidence for ${dimension.name}.`
      );
    }

    rows.push({
      assessment_id: assessmentId,
      owner_id: user.id,
      dimension_key: dimension.key,
      dimension_name: dimension.name,
      display_order: dimension.order,
      readiness_rating: readiness,
      evidence_confidence: confidence,
      objective_evidence: cleanText(
        formData.get(
          `objective_evidence_${dimension.key}`
        )
      ),
      assessor_commentary: cleanText(
        formData.get(
          `assessor_commentary_${dimension.key}`
        )
      ),
      management_concern: cleanText(
        formData.get(
          `management_concern_${dimension.key}`
        )
      ),
      management_action: cleanText(
        formData.get(
          `management_action_${dimension.key}`
        )
      ),
      action_owner: cleanText(
        formData.get(
          `action_owner_${dimension.key}`
        )
      ),
      target_date: cleanDate(
        formData.get(
          `target_date_${dimension.key}`
        )
      ),
      updated_at: new Date().toISOString(),
    });
  }

  const { error: saveError } = await supabase
    .from("management_readiness")
    .upsert(rows, {
      onConflict:
        "assessment_id,owner_id,dimension_key",
    });

  if (saveError) {
    throw new Error(saveError.message);
  }

  revalidatePath(
    `/portal/assessments/${assessmentId}/management-readiness`
  );

  revalidatePath(
    `/portal/assessments/${assessmentId}/summary`
  );

  revalidatePath(
    `/portal/assessments/${assessmentId}/readiness`
  );

  redirect(
    `/portal/assessments/${assessmentId}/management-readiness`
  );
}
