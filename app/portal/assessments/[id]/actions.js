"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";

const VALID_CLAUSES = [
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
];

export async function saveAssessmentAnswers(formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/portal/login");
  }

  const assessmentId = formData.get("assessment_id");
  const currentClause = formData.get("current_clause");
  const nextClause = formData.get("next_clause");

  if (!assessmentId) {
    throw new Error("Missing assessment ID");
  }

  // Verify that this assessment belongs to the signed-in user.
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
    throw new Error("Assessment not found");
  }

  // Load the question bank for this standard.
  const {
    data: questions,
    error: questionsError,
  } = await supabase
    .from("assessment_questions")
    .select("question_number, question")
    .eq("standard", assessment.standard)
    .eq("active", true)
    .order("display_order", {
      ascending: true,
    });

  if (questionsError) {
    throw new Error(
      questionsError.message
    );
  }

  const answers = [];

  for (const question of questions ?? []) {
    const fieldKey =
      question.question_number.replaceAll(
        ".",
        "_"
      );

    const scoreRaw = formData.get(
      `score_${fieldKey}`
    );

    const evidenceRaw = formData.get(
      `evidence_${fieldKey}`
    );

    // If the question was not on the submitted page,
    // leave its existing answer untouched.
    if (scoreRaw === null) {
      continue;
    }

    const score = Number(scoreRaw);

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
      assessment_id: assessmentId,
      owner_id: user.id,
      clause: question.question_number,
      question: question.question,
      score,
      evidence:
        typeof evidenceRaw === "string" &&
        evidenceRaw.trim() !== ""
          ? evidenceRaw.trim()
          : null,
      notes: null,
      ai_feedback: null,
      updated_at: new Date().toISOString(),
    });
  }

  if (answers.length === 0) {
    throw new Error(
      "No assessment answers were submitted."
    );
  }

  const { error: saveError } =
    await supabase
      .from("assessment_answers")
      .upsert(answers, {
        onConflict:
          "assessment_id,owner_id,clause",
      });

  if (saveError) {
    throw new Error(
      saveError.message
    );
  }

  // If a valid next clause was supplied,
  // automatically continue there.
  if (
    typeof nextClause === "string" &&
    VALID_CLAUSES.includes(nextClause)
  ) {
    redirect(
      `/portal/assessments/${assessmentId}?clause=${nextClause}`
    );
  }

  // Otherwise return to the clause just saved.
  if (
    typeof currentClause === "string" &&
    VALID_CLAUSES.includes(currentClause)
  ) {
    redirect(
      `/portal/assessments/${assessmentId}?clause=${currentClause}`
    );
  }

  redirect(
    `/portal/assessments/${assessmentId}`
  );
}
