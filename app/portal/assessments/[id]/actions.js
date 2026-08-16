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
    },
  ];

  for (const answer of answers) {
    const { data: existing } = await supabase
      .from("assessment_answers")
      .select("id")
      .eq("assessment_id", assessmentId)
      .eq("owner_id", user.id)
      .eq("clause", answer.clause)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("assessment_answers")
        .update({
          score: answer.score,
          evidence: answer.evidence,
          question: answer.question,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .eq("owner_id", user.id);

      if (error) {
        throw new Error(error.message);
      }
    } else {
      const { error } = await supabase
        .from("assessment_answers")
        .insert(answer);

      if (error) {
        throw new Error(error.message);
      }
    }
  }

  redirect(`/portal/assessments/${assessmentId}`);
}
