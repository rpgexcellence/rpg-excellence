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

function cleanText(value) {
  if (
    typeof value !==
      "string" ||
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

  if (findingId) {
    const {
      data: finding,
      error: findingError,
    } = await supabase
      .from(
        "assessment_findings"
      )
      .select("id")
      .eq(
        "id",
        findingId
      )
      .eq(
        "assessment_id",
        assessmentId
      )
      .eq(
        "owner_id",
        userId
      )
      .maybeSingle();

    if (
      findingError ||
      !finding
    ) {
      throw new Error(
        "Linked finding not found."
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

  redirect(
    `/portal/assessments/${assessmentId}/evidence`
  );
}
