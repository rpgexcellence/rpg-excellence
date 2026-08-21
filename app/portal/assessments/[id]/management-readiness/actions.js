"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "../../../../../lib/supabase/server";

const ISO_14001_DIMENSIONS = [
  {
    key: "leadership",
    name: "Leadership",
    order: 1,
  },
  {
    key: "governance",
    name: "Governance",
    order: 2,
  },
  {
    key: "environmental_context",
    name: "Environmental Context",
    order: 3,
  },
  {
    key: "risk_management",
    name: "Risk Management",
    order: 4,
  },
  {
    key: "operational_control",
    name: "Operational Control",
    order: 5,
  },
  {
    key: "compliance_assurance",
    name: "Compliance Assurance",
    order: 6,
  },
  {
    key: "environmental_performance",
    name: "Environmental Performance",
    order: 7,
  },
  {
    key: "internal_assurance",
    name: "Internal Assurance",
    order: 8,
  },
  {
    key: "improvement_capability",
    name: "Improvement Capability",
    order: 9,
  },
];

const ISO_45001_DIMENSIONS = [
  {
    key: "ohs_leadership_culture",
    name: "Leadership & OH&S Culture",
    order: 1,
  },
  {
    key: "ohs_governance",
    name: "Governance & Accountability",
    order: 2,
  },
  {
    key: "ohs_context",
    name: "OH&S Context & Worker Needs",
    order: 3,
  },
  {
    key: "hazard_risk_management",
    name: "Hazard & Risk Management",
    order: 4,
  },
  {
    key: "worker_participation",
    name: "Worker Consultation & Participation",
    order: 5,
  },
  {
    key: "ohs_operational_control",
    name: "Operational & Contractor Control",
    order: 6,
  },
  {
    key: "ohs_compliance_assurance",
    name: "Legal & Compliance Assurance",
    order: 7,
  },
  {
    key: "ohs_performance_assurance",
    name: "OH&S Performance & Internal Assurance",
    order: 8,
  },
  {
    key: "ohs_improvement_learning",
    name: "Improvement & Organisational Learning",
    order: 9,
  },
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
  if (
    standard === "ISO 45001:2018"
  ) {
    return ISO_45001_DIMENSIONS;
  }

  return ISO_14001_DIMENSIONS;
}

export async function saveManagementReadiness(
  formData
) {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/portal/login"
    );
  }

  const assessmentId =
    formData.get(
      "assessment_id"
    );

  if (
    typeof assessmentId !==
      "string" ||
    assessmentId.trim() ===
      ""
  ) {
    throw new Error(
      "Missing assessment ID."
    );
  }

  const {
    data: assessment,
    error: assessmentError,
  } = await supabase
    .from("assessments")
    .select(
      "id, standard"
    )
    .eq(
      "id",
      assessmentId
    )
    .eq(
      "owner_id",
      user.id
    )
    .single();

  if (
    assessmentError ||
    !assessment
  ) {
    throw new Error(
      "Assessment not found."
    );
  }

  const dimensions =
    getDimensions(
      assessment.standard
    );

  const rows = [];

  for (
    const dimension of
      dimensions
  ) {
    const readinessRaw =
      formData.get(
        `readiness_rating_${dimension.key}`
      );

    const confidenceRaw =
      formData.get(
        `evidence_confidence_${dimension.key}`
      );

    const readiness =
      cleanText(
        readinessRaw
      );

    const confidence =
      cleanText(
        confidenceRaw
      );

    if (
      readiness &&
      !READINESS_RATINGS.includes(
        readiness
      )
    ) {
      throw new Error(
        `Invalid readiness rating for ${dimension.name}.`
      );
    }

    if (
      confidence &&
      !CONFIDENCE_LEVELS.includes(
        confidence
      )
    ) {
      throw new Error(
        `Invalid evidence confidence for ${dimension.name}.`
      );
    }

    rows.push({
      assessment_id:
        assessmentId,

      owner_id:
        user.id,

      dimension_key:
        dimension.key,

      dimension_name:
        dimension.name,

      display_order:
        dimension.order,

      readiness_rating:
        readiness,

      evidence_confidence:
        confidence,

      objective_evidence:
        cleanText(
          formData.get(
            `objective_evidence_${dimension.key}`
          )
        ),

      assessor_commentary:
        cleanText(
          formData.get(
            `assessor_commentary_${dimension.key}`
          )
        ),

      management_concern:
        cleanText(
          formData.get(
            `management_concern_${dimension.key}`
          )
        ),

      management_action:
        cleanText(
          formData.get(
            `management_action_${dimension.key}`
          )
        ),

      action_owner:
        cleanText(
          formData.get(
            `action_owner_${dimension.key}`
          )
        ),

      target_date:
        cleanDate(
          formData.get(
            `target_date_${dimension.key}`
          )
        ),

      updated_at:
        new Date().toISOString(),
    });
  }

  const {
    error: saveError,
  } = await supabase
    .from(
      "management_readiness"
    )
    .upsert(
      rows,
      {
        onConflict:
          "assessment_id,owner_id,dimension_key",
      }
    );

  if (saveError) {
    throw new Error(
      saveError.message
    );
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
