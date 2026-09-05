"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";

const cleanId = (value) => typeof value === "string" ? value.trim() : "";

async function ownedAssessment(supabase, userId, assessmentId) {
  const { data, error } = await supabase
    .from("assessments")
    .select("id,status,archived_at")
    .eq("id", assessmentId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

function finish(message, type = "saved", view = "register") {
  revalidatePath("/portal");
  revalidatePath("/portal/history");
  redirect(`/portal/history?view=${view}&${type}=${encodeURIComponent(message)}`);
}

export async function archiveAssessment(formData) {
  const assessmentId = cleanId(formData.get("assessment_id"));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/history");
  const assessment = await ownedAssessment(supabase, user.id, assessmentId);
  if (!assessment) finish("Assessment was not found.", "error");
  const { error } = await supabase.from("assessments").update({ archived_at: new Date().toISOString() }).eq("id", assessment.id).eq("owner_id", user.id);
  if (error) finish(error.message, "error");
  finish("Assessment archived.");
}

export async function restoreAssessment(formData) {
  const assessmentId = cleanId(formData.get("assessment_id"));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/history");
  const assessment = await ownedAssessment(supabase, user.id, assessmentId);
  if (!assessment) finish("Assessment was not found.", "error", "archived");
  const { error } = await supabase.from("assessments").update({ archived_at: null }).eq("id", assessment.id).eq("owner_id", user.id);
  if (error) finish(error.message, "error", "archived");
  finish("Assessment restored.", "saved", "archived");
}

export async function deleteDraftAssessment(formData) {
  const assessmentId = cleanId(formData.get("assessment_id"));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/history");
  const assessment = await ownedAssessment(supabase, user.id, assessmentId);
  if (!assessment) finish("Assessment was not found.", "error");
  if (assessment.status === "completed") finish("Completed assessments cannot be deleted. Archive the record instead.", "error");

  const relatedTables = [
    "assessment_answers",
    "assessment_evidence_samples",
    "assessment_findings",
    "management_action_plan",
    "management_readiness",
  ];
  for (const table of relatedTables) {
    const { count, error } = await supabase.from(table).select("assessment_id", { count: "exact", head: true }).eq("assessment_id", assessment.id);
    if (error) finish(`Deletion check failed: ${error.message}`, "error");
    if ((count ?? 0) > 0) finish("This draft contains controlled assessment records. Archive it instead of deleting it.", "error");
  }

  const { error } = await supabase.from("assessments").delete().eq("id", assessment.id).eq("owner_id", user.id).neq("status", "completed");
  if (error) finish(error.message, "error");
  finish("Empty draft permanently deleted.");
}
