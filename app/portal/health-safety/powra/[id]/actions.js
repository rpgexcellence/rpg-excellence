"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/server";
import { requirePlanAccess } from "../../../../../lib/plan-access";
import { closureOptions, POWRA_ROOT, powraDecision } from "../../../../../lib/powra-workflow.mjs";
import { UUID } from "../../../../../lib/zone-policy.mjs";

async function actionRecord(id) {
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data:{user} } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=" + POWRA_ROOT + "/" + id);
  await requirePlanAccess(user.id,"professional","POWRA");
  const { data:record,error } = await supabase.from("hs_powra_assessments").select("id,decision,decision_reason,end_review,status,updated_at")
    .eq("id",id).eq("owner_id",user.id).maybeSingle();
  if (error) throw error;
  if (!record) notFound();
  return {supabase,user,record};
}

async function updateRecord({supabase,user,record}, changes) {
  const {data,error} = await supabase.from("hs_powra_assessments").update(changes).eq("id",record.id)
    .eq("owner_id",user.id).eq("updated_at",record.updated_at).select("id").maybeSingle();
  if (error) throw error;
  revalidatePath(POWRA_ROOT);
  revalidatePath(POWRA_ROOT + "/" + record.id);
  if (!data) redirect(POWRA_ROOT + "/" + record.id + "?notice=changed");
  redirect(POWRA_ROOT + "/" + record.id);
}

export async function stopPowra(id, form) {
  const context = await actionRecord(id);
  const {record} = context;
  if (!["open","supervisor_review"].includes(record.status)) redirect(POWRA_ROOT + "/" + id + "?notice=changed");
  const reason = String(form.get("reason") || "").trim();
  if (!reason || reason.length > 3000) redirect(POWRA_ROOT + "/" + id + "?notice=stop");
  const now = new Date().toISOString();
  await updateRecord(context, {
    decision:"stop_work", decision_reason:reason, status:"stopped", updated_at:now,
    end_review:{...record.end_review,stop_event:{at:now,previous_decision:powraDecision(record),previous_reason:record.decision_reason}},
  });
}

export async function closePowra(id, form) {
  const context = await actionRecord(id);
  const {record} = context;
  if (!["open","supervisor_review","stopped"].includes(record.status)) redirect(POWRA_ROOT + "/" + id + "?notice=changed");
  const text = name => String(form.get(name) || "").trim();
  const outcome = text("outcome");
  const comments = text("comments");
  const checks = Object.fromEntries(["conditions_changed","new_hazards","controls_effective","incident"].map(name => [name,text(name)]));
  if (!closureOptions(powraDecision(record)).includes(outcome) || !comments || comments.length > 3000 ||
      Object.values(checks).some(value => !["","yes","no","na"].includes(value)) ||
      text("follow_up").length > 3000 || text("evidence_reference").length > 300 || text("incident_reference").length > 100) {
    redirect(POWRA_ROOT + "/" + id + "?tab=learning&notice=closure");
  }
  const now = new Date().toISOString();
  await updateRecord(context,{
    status:"closed", closed_at:now, updated_at:now,
    end_review:{...record.end_review,...checks,outcome,comments,follow_up:text("follow_up"),
      evidence_reference:text("evidence_reference"),incident_reference:text("incident_reference")},
  });
}
