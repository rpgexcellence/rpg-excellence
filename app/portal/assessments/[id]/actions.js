"use server";

import { redirect } from "next/navigation";

import { createClient } from "../../../../lib/supabase/server";
import { createAdminClient } from "../../../../lib/supabase/admin";

const VALID_CLAUSES = [
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
];

const VALID_FINDING_TYPES = [
  "conformity",
  "observation",
  "ofi",
  "minor_nc",
  "major_nc",
];

const VALID_RISK_LEVELS = [
  "High",
  "Medium",
  "Low",
];

const ADVANCED_ASSESSMENT_STANDARDS = [
  "ISO 14001:2026",
  "ISO 45001:2018",
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

function getFieldKey(questionNumber) {
  return questionNumber
    .replaceAll(".", "_")
    .replaceAll("-", "_");
}

async function saveFinding({
  admin,
  assessment,
  user,
  question,
  formData,
}) {
  const fieldKey =
    getFieldKey(
      question.question_number
    );

  const findingTypeRaw =
    formData.get(
      `finding_type_${fieldKey}`
    );

  // Finding controls are optional.
  // If the field was not rendered on
  // this page, leave existing findings
  // untouched.
  if (findingTypeRaw === null) {
    return;
  }

  const findingType =
    typeof findingTypeRaw === "string"
      ? findingTypeRaw.trim()
      : "";

  if (
    !VALID_FINDING_TYPES.includes(
      findingType
    )
  ) {
    throw new Error(
      `Invalid finding type for ${question.question_number}`
    );
  }

  // Check whether this assessment control
  // already has a historical finding.
  const {
    data: existingFinding,
    error: existingFindingError,
  } = await admin
    .from("assessment_findings")
    .select("id, finding_type, status")
    .eq(
      "assessment_id",
      assessment.id
    )
    .eq(
      "owner_id",
      user.id
    )
    .eq(
      "question_number",
      question.question_number
    )
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (existingFindingError) {
    throw new Error(
      existingFindingError.message
    );
  }

  // Conformity is an assessment conclusion,
  // not a finding.
  //
  // If no historical finding exists, do
  // nothing. If a previous NC / observation /
  // OFI existed and the assessor now concludes
  // conformity, retain that historical record
  // but close it rather than creating a green
  // "conformity finding".
  if (findingType === "conformity") {
    if (
      existingFinding &&
      existingFinding.finding_type !==
        "conformity"
    ) {
      const {
        error: closeError,
      } = await admin
        .from("assessment_findings")
        .update({
          status: "closed",
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          existingFinding.id
        )
        .eq(
          "owner_id",
          user.id
        );

      if (closeError) {
        throw new Error(
          closeError.message
        );
      }
    }

    return;
  }

  const objectiveEvidence =
    cleanText(
      formData.get(
        `finding_evidence_${fieldKey}`
      )
    );

  const findingStatement =
    cleanText(
      formData.get(
        `finding_statement_${fieldKey}`
      )
    );

  const riskImpactRaw =
    formData.get(
      `finding_risk_${fieldKey}`
    );

  const riskImpact =
    typeof riskImpactRaw ===
    "string"
      ? riskImpactRaw.trim()
      : "";

  // Risk is required only when an actual finding is raised.
  // Conformity does not require a High / Medium / Low risk rating.
  if (
    findingType !== "conformity" &&
    !VALID_RISK_LEVELS.includes(
      riskImpact
    )
  ) {
    throw new Error(
      `Select High, Medium or Low risk for ${question.question_number}`
    );
  }

  const assessorRationale =
    cleanText(
      formData.get(
        `finding_rationale_${fieldKey}`
      )
    );

  if (
    (
      findingType === "minor_nc" ||
      findingType === "major_nc"
    ) &&
    !findingStatement
  ) {
    throw new Error(
      `A finding statement is required for ${question.question_number}`
    );
  }

  const findingPayload = {
    assessment_id:
      assessment.id,

    owner_id:
      user.id,

    standard:
      assessment.standard,

    clause:
      question.clause,

    question_number:
      question.question_number,

    finding_type:
      findingType,

    requirement_summary:
      question.requirement_summary ??
      question.question,

    objective_evidence:
      objectiveEvidence,

    finding_statement:
      findingStatement,

    risk_impact:
      riskImpact,

    assessor_rationale:
      assessorRationale,

    status:
      existingFinding?.status ===
      "closed"
        ? "open"
        : existingFinding?.status ??
          "open",

    updated_at:
      new Date().toISOString(),
  };

  let findingId =
    existingFinding?.id ??
    null;

  if (existingFinding) {
    const {
      error: updateError,
    } = await admin
      .from(
        "assessment_findings"
      )
      .update(
        findingPayload
      )
      .eq(
        "id",
        existingFinding.id
      )
      .eq(
        "owner_id",
        user.id
      );

    if (updateError) {
      throw new Error(
        updateError.message
      );
    }
  } else {
    const {
      data: createdFinding,
      error: insertError,
    } = await admin
      .from(
        "assessment_findings"
      )
      .insert(
        findingPayload
      )
      .select("id")
      .single();

    if (insertError) {
      throw new Error(
        insertError.message
      );
    }

    findingId =
      createdFinding.id;
  }

  // Corrective-action fields are optional.
  // They are relevant primarily to formal NCs.
  if (
    findingType !== "minor_nc" &&
    findingType !== "major_nc"
  ) {
    return;
  }

  const correction =
    cleanText(
      formData.get(
        `correction_${fieldKey}`
      )
    );

  const containmentAction =
    cleanText(
      formData.get(
        `containment_${fieldKey}`
      )
    );

  const rootCause =
    cleanText(
      formData.get(
        `root_cause_${fieldKey}`
      )
    );

  const correctiveAction =
    cleanText(
      formData.get(
        `corrective_action_${fieldKey}`
      )
    );

  const actionOwner =
    cleanText(
      formData.get(
        `action_owner_${fieldKey}`
      )
    );

  const targetDate =
    cleanDate(
      formData.get(
        `target_date_${fieldKey}`
      )
    );

  const hasCorrectiveActionData =
    Boolean(
      correction ||
      containmentAction ||
      rootCause ||
      correctiveAction ||
      actionOwner ||
      targetDate
    );

  if (
    !hasCorrectiveActionData ||
    !findingId
  ) {
    return;
  }

  const {
    data: existingCorrectiveAction,
    error: existingActionError,
  } = await admin
    .from("corrective_actions")
    .select("id")
    .eq(
      "assessment_id",
      assessment.id
    )
    .eq(
      "finding_id",
      findingId
    )
    .eq(
      "owner_id",
      user.id
    )
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (existingActionError) {
    throw new Error(
      existingActionError.message
    );
  }

  const actionPayload = {
    assessment_id:
      assessment.id,

    finding_id:
      findingId,

    owner_id:
      user.id,

    correction,

    containment_action:
      containmentAction,

    root_cause:
      rootCause,

    corrective_action:
      correctiveAction,

    action_owner:
      actionOwner,

    target_date:
      targetDate,

    status:
      correctiveAction
        ? "in_progress"
        : "open",

    updated_at:
      new Date().toISOString(),
  };

  if (
    existingCorrectiveAction
  ) {
    const {
      error: actionUpdateError,
    } = await admin
      .from(
        "corrective_actions"
      )
      .update(
        actionPayload
      )
      .eq(
        "id",
        existingCorrectiveAction.id
      )
      .eq(
        "owner_id",
        user.id
      );

    if (actionUpdateError) {
      throw new Error(
        actionUpdateError.message
      );
    }
  } else {
    const {
      error: actionInsertError,
    } = await admin
      .from(
        "corrective_actions"
      )
      .insert(
        actionPayload
      );

    if (actionInsertError) {
      throw new Error(
        actionInsertError.message
      );
    }
  }
}

export async function saveAssessmentAnswers(
  formData
) {
  const supabase =
    await createClient();

  const admin =
    createAdminClient();

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

  const currentClause =
    formData.get(
      "current_clause"
    );

  const nextClause =
    formData.get(
      "next_clause"
    );

  if (!assessmentId) {
    throw new Error(
      "Missing assessment ID"
    );
  }

  // Verify ownership using the
  // authenticated user session before
  // any service-role write occurs.
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
      "Assessment not found"
    );
  }

  const {
    data: questions,
    error: questionsError,
  } = await supabase
    .from(
      "assessment_questions"
    )
    .select(
      `
        question_number,
        clause,
        question,
        requirement_summary
      `
    )
    .eq(
      "standard",
      assessment.standard
    )
    .eq(
      "active",
      true
    )
    .order(
      "display_order",
      {
        ascending: true,
      }
    );

  if (questionsError) {
    throw new Error(
      questionsError.message
    );
  }

  const answers = [];

  for (
    const question of
      questions ?? []
  ) {
    const fieldKey =
      getFieldKey(
        question.question_number
      );

    const scoreRaw =
      formData.get(
        `score_${fieldKey}`
      );

    const evidenceRaw =
      formData.get(
        `evidence_${fieldKey}`
      );

    // The question was not on this
    // submitted clause page.
    if (scoreRaw === null) {
      continue;
    }

    const score =
      Number(scoreRaw);

    if (
      !Number.isInteger(score) ||
      score < 0 ||
      score > 5
    ) {
      throw new Error(
        `Invalid score for question ${question.question_number}`
      );
    }

    answers.push({
      assessment_id:
        assessmentId,

      owner_id:
        user.id,

      clause:
        question.question_number,

      question:
        question.question,

      score,

      evidence:
        cleanText(
          evidenceRaw
        ),

      notes:
        null,

      ai_feedback:
        null,

      updated_at:
        new Date().toISOString(),
    });

    // Advanced assessments use the
    // formal findings workspace.
    if (
      ADVANCED_ASSESSMENT_STANDARDS.includes(
        assessment.standard
      )
    ) {
      await saveFinding({
        admin,
        assessment,
        user,
        question,
        formData,
      });
    }
  }

  if (
    answers.length === 0
  ) {
    throw new Error(
      "No assessment answers were submitted."
    );
  }

  const {
    error: saveError,
  } =
    await supabase
      .from(
        "assessment_answers"
      )
      .upsert(
        answers,
        {
          onConflict:
            "assessment_id,owner_id,clause",
        }
      );

  if (saveError) {
    throw new Error(
      saveError.message
    );
  }

  if (
    typeof nextClause ===
      "string" &&
    VALID_CLAUSES.includes(
      nextClause
    )
  ) {
    redirect(
      `/portal/assessments/${assessmentId}?clause=${nextClause}`
    );
  }

  if (
    currentClause === "10"
  ) {
    const {
      error: completionError,
    } = await supabase
      .from(
        "assessments"
      )
      .update({
        status:
          "completed",

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        assessmentId
      )
      .eq(
        "owner_id",
        user.id
      );

    if (
      completionError
    ) {
      throw new Error(
        completionError.message
      );
    }

    redirect(
      `/portal/assessments/${assessmentId}/summary`
    );
  }

  if (
    typeof currentClause ===
      "string" &&
    VALID_CLAUSES.includes(
      currentClause
    )
  ) {
    redirect(
      `/portal/assessments/${assessmentId}?clause=${currentClause}`
    );
  }

  redirect(
    `/portal/assessments/${assessmentId}`
  );
}
