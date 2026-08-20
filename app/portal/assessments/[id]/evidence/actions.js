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

import {
  createAdminClient,
} from "../../../../../lib/supabase/admin";

const EVIDENCE_TYPES = [
  "Document",
  "Record",
  "Interview",
  "Observation",
  "Data",
  "Measurement",
  "Other",
];

const CONFIDENCE_LEVELS = [
  "Low",
  "Medium",
  "High",
];

const FINDING_TYPES = [
  "observation",
  "ofi",
  "minor_nc",
  "major_nc",
];

const RISK_LEVELS = [
  "High",
  "Medium",
  "Low",
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

async function getOwnedAssessment({
  supabase,
  assessmentId,
  userId,
}) {
  const {
    data: assessment,
    error,
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
      userId
    )
    .single();

  if (
    error ||
    !assessment
  ) {
    throw new Error(
      "Assessment not found."
    );
  }

  return assessment;
}

async function buildPayload({
  supabase,
  assessmentId,
  userId,
  formData,
}) {
  const questionNumber =
    cleanText(
      formData.get(
        "question_number"
      )
    );

  let clause = null;

  if (questionNumber) {
    const {
      data: question,
      error,
    } = await supabase
      .from(
        "assessment_questions"
      )
      .select(
        "question_number, clause"
      )
      .eq(
        "question_number",
        questionNumber
      )
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(
        error.message
      );
    }

    clause =
      question?.clause ??
      null;
  }

  const evidenceType =
    cleanText(
      formData.get(
        "evidence_type"
      )
    );

  if (
    evidenceType &&
    !EVIDENCE_TYPES.includes(
      evidenceType
    )
  ) {
    throw new Error(
      "Invalid evidence type."
    );
  }

  const confidence =
    cleanText(
      formData.get(
        "evidence_confidence"
      )
    );

  if (
    confidence &&
    !CONFIDENCE_LEVELS.includes(
      confidence
    )
  ) {
    throw new Error(
      "Invalid evidence confidence."
    );
  }

  const findingId =
    cleanText(
      formData.get(
        "finding_id"
      )
    );

  /*
   * The assessment has already been ownership-validated.
   *
   * Use the admin client to validate the finding because
   * assessment_findings may be protected by RLS.
   *
   * The assessment_id condition prevents a finding belonging
   * to another assessment from being linked.
   */
  if (findingId) {
    const admin =
      createAdminClient();

    const {
      data: finding,
      error: findingError,
    } = await admin
      .from(
        "assessment_findings"
      )
      .select(
        "id, assessment_id"
      )
      .eq(
        "id",
        findingId
      )
      .eq(
        "assessment_id",
        assessmentId
      )
      .maybeSingle();

    if (findingError) {
      throw new Error(
        findingError.message
      );
    }

    if (!finding) {
      throw new Error(
        "Linked finding not found for this assessment."
      );
    }
  }

  return {
    assessment_id:
      assessmentId,

    owner_id:
      userId,

    question_number:
      questionNumber,

    clause,

    process_activity:
      cleanText(
        formData.get(
          "process_activity"
        )
      ),

    location:
      cleanText(
        formData.get(
          "location"
        )
      ),

    evidence_type:
      evidenceType,

    evidence_reference:
      cleanText(
        formData.get(
          "evidence_reference"
        )
      ),

    evidence_period:
      cleanText(
        formData.get(
          "evidence_period"
        )
      ),

    sample_size:
      cleanText(
        formData.get(
          "sample_size"
        )
      ),

    sample_result:
      cleanText(
        formData.get(
          "sample_result"
        )
      ),

    exception_gap:
      cleanText(
        formData.get(
          "exception_gap"
        )
      ),

    evidence_confidence:
      confidence,

    assessor_notes:
      cleanText(
        formData.get(
          "assessor_notes"
        )
      ),

    finding_id:
      findingId,

    updated_at:
      new Date().toISOString(),
  };
}

export async function createEvidenceSample(
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

  await getOwnedAssessment({
    supabase,
    assessmentId,
    userId: user.id,
  });

  const payload =
    await buildPayload({
      supabase,
      assessmentId,
      userId: user.id,
      formData,
    });

  const {
    error,
  } = await supabase
    .from(
      "assessment_evidence_samples"
    )
    .insert(payload);

  if (error) {
    throw new Error(
      error.message
    );
  }

  revalidatePath(
    `/portal/assessments/${assessmentId}/evidence`
  );

  redirect(
    `/portal/assessments/${assessmentId}/evidence`
  );
}

export async function updateEvidenceSample(
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

  const sampleId =
    formData.get(
      "sample_id"
    );

  if (
    typeof assessmentId !==
      "string" ||
    typeof sampleId !==
      "string" ||
    assessmentId.trim() ===
      "" ||
    sampleId.trim() ===
      ""
  ) {
    throw new Error(
      "Invalid evidence sample."
    );
  }

  await getOwnedAssessment({
    supabase,
    assessmentId,
    userId: user.id,
  });

  const payload =
    await buildPayload({
      supabase,
      assessmentId,
      userId: user.id,
      formData,
    });

  const {
    error,
  } = await supabase
    .from(
      "assessment_evidence_samples"
    )
    .update(payload)
    .eq(
      "id",
      sampleId
    )
    .eq(
      "assessment_id",
      assessmentId
    )
    .eq(
      "owner_id",
      user.id
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  revalidatePath(
    `/portal/assessments/${assessmentId}/evidence`
  );

  revalidatePath(
    `/portal/assessments/${assessmentId}/summary`
  );

  revalidatePath(
    `/portal/assessments/${assessmentId}/findings`
  );

  redirect(
    `/portal/assessments/${assessmentId}/evidence`
  );
}

export async function deleteEvidenceSample(
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

  const sampleId =
    formData.get(
      "sample_id"
    );

  if (
    typeof assessmentId !==
      "string" ||
    typeof sampleId !==
      "string" ||
    assessmentId.trim() ===
      "" ||
    sampleId.trim() ===
      ""
  ) {
    throw new Error(
      "Invalid evidence sample."
    );
  }

  await getOwnedAssessment({
    supabase,
    assessmentId,
    userId: user.id,
  });

  const {
    error,
  } = await supabase
    .from(
      "assessment_evidence_samples"
    )
    .delete()
    .eq(
      "id",
      sampleId
    )
    .eq(
      "assessment_id",
      assessmentId
    )
    .eq(
      "owner_id",
      user.id
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  revalidatePath(
    `/portal/assessments/${assessmentId}/evidence`
  );

  revalidatePath(
    `/portal/assessments/${assessmentId}/summary`
  );

  redirect(
    `/portal/assessments/${assessmentId}/evidence`
  );
}

export async function raiseFindingFromEvidenceSample(
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

  const sampleId =
    formData.get(
      "sample_id"
    );

  const findingType =
    cleanText(
      formData.get(
        "finding_type"
      )
    );

  const riskLevel =
    cleanText(
      formData.get(
        "risk_level"
      )
    );

  const findingStatement =
    cleanText(
      formData.get(
        "finding_statement"
      )
    );

  const assessorRationale =
    cleanText(
      formData.get(
        "assessor_rationale"
      )
    );

  if (
    typeof assessmentId !==
      "string" ||
    typeof sampleId !==
      "string" ||
    assessmentId.trim() ===
      "" ||
    sampleId.trim() ===
      ""
  ) {
    throw new Error(
      "Invalid evidence sample."
    );
  }

  if (
    !findingType ||
    !FINDING_TYPES.includes(
      findingType
    )
  ) {
    throw new Error(
      "Select a valid finding classification."
    );
  }

  if (
    !riskLevel ||
    !RISK_LEVELS.includes(
      riskLevel
    )
  ) {
    throw new Error(
      "Select High, Medium or Low risk."
    );
  }

  if (
    (
      findingType ===
        "minor_nc" ||
      findingType ===
        "major_nc"
    ) &&
    !findingStatement
  ) {
    throw new Error(
      "A finding statement is required for Minor or Major Nonconformity."
    );
  }

  const assessment =
    await getOwnedAssessment({
      supabase,
      assessmentId,
      userId: user.id,
    });

  const {
    data: sample,
    error: sampleError,
  } = await supabase
    .from(
      "assessment_evidence_samples"
    )
    .select("*")
    .eq(
      "id",
      sampleId
    )
    .eq(
      "assessment_id",
      assessmentId
    )
    .eq(
      "owner_id",
      user.id
    )
    .single();

  if (
    sampleError ||
    !sample
  ) {
    throw new Error(
      "Evidence sample not found."
    );
  }

  if (sample.finding_id) {
    throw new Error(
      "This evidence sample is already linked to a finding."
    );
  }

  let requirementSummary =
    null;

  if (
    sample.question_number
  ) {
    const {
      data: question,
      error: questionError,
    } = await supabase
      .from(
        "assessment_questions"
      )
      .select(
        "question_number, question, requirement_summary"
      )
      .eq(
        "standard",
        assessment.standard
      )
      .eq(
        "question_number",
        sample.question_number
      )
      .eq(
        "active",
        true
      )
      .limit(1)
      .maybeSingle();

    if (questionError) {
      throw new Error(
        questionError.message
      );
    }

    requirementSummary =
      question
        ?.requirement_summary ??
      question?.question ??
      null;
  }

  const evidenceParts = [
    sample.evidence_type
      ? `Type: ${sample.evidence_type}`
      : null,

    sample.evidence_reference
      ? `Reference: ${sample.evidence_reference}`
      : null,

    sample.evidence_period
      ? `Period: ${sample.evidence_period}`
      : null,

    sample.sample_size
      ? `Sample size: ${sample.sample_size}`
      : null,

    sample.sample_result
      ? `Result: ${sample.sample_result}`
      : null,

    sample.exception_gap
      ? `Exception / gap: ${sample.exception_gap}`
      : null,

    sample.assessor_notes
      ? `Assessor notes: ${sample.assessor_notes}`
      : null,
  ].filter(Boolean);

  const objectiveEvidence =
    evidenceParts.length > 0
      ? evidenceParts.join(
          "\n"
        )
      : null;

  const admin =
    createAdminClient();

  const {
    data: createdFinding,
    error: findingError,
  } = await admin
    .from(
      "assessment_findings"
    )
    .insert({
      assessment_id:
        assessmentId,

      owner_id:
        user.id,

      standard:
        assessment.standard,

      clause:
        sample.clause,

      question_number:
        sample.question_number,

      finding_type:
        findingType,

      requirement_summary:
        requirementSummary,

      objective_evidence:
        objectiveEvidence,

      finding_statement:
        findingStatement,

      risk_impact:
        riskLevel,

      assessor_rationale:
        assessorRationale,

      status:
        "open",

      updated_at:
        new Date().toISOString(),
    })
    .select("id")
    .single();

  if (findingError) {
    throw new Error(
      findingError.message
    );
  }

  const {
    error: linkError,
  } = await supabase
    .from(
      "assessment_evidence_samples"
    )
    .update({
      finding_id:
        createdFinding.id,

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      sampleId
    )
    .eq(
      "assessment_id",
      assessmentId
    )
    .eq(
      "owner_id",
      user.id
    );

  if (linkError) {
    throw new Error(
      linkError.message
    );
  }

  revalidatePath(
    `/portal/assessments/${assessmentId}/evidence`
  );

  revalidatePath(
    `/portal/assessments/${assessmentId}/findings`
  );

  revalidatePath(
    `/portal/assessments/${assessmentId}/summary`
  );

  revalidatePath(
    `/portal/assessments/${assessmentId}/readiness`
  );

  redirect(
    `/portal/assessments/${assessmentId}/findings`
  );
}
