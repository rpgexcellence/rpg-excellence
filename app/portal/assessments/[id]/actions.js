"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";

export async function saveClause4(formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/portal/login");
  }

  const assessmentId = formData.get("assessment_id");

  const answers = [
    {
      assessment_id: assessmentId,
      owner_id: user.id,
      clause: "4.1",
      question:
        "Has the organization determined the internal and external issues relevant to its purpose and strategic direction?",
      score: Number(formData.get("score_4_1")),
      evidence: formData.get("evidence_4_1") || null,
      notes: null,
      ai_feedback: null,
      updated_at: new Date().toISOString(),
    },
    {
      assessment_id: assessmentId,
      owner_id: user.id,
      clause: "4.2",
      question:
        "Has the organization identified relevant interested parties and their applicable requirements?",
      score: Number(formData.get("score_4_2")),
      evidence: formData.get("evidence_4_2") || null,
      notes: null,
      ai_feedback: null,
      updated_at: new Date().toISOString(),
    },
  ];

  const { error } = await supabase
    .from("assessment_answers")
    .upsert(answers, {
      onConflict: "assessment_id,owner_id,clause",
    });

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/portal/assessments/${assessmentId}`);
}
