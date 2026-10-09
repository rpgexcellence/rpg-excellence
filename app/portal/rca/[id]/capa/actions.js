"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/server";
import { requireAssessmentRemediationAccess } from "../../../../../lib/assessment-access";

const STAGES = ["correction","cause_analysis","corrective_action","effectiveness_review"];
const clean = value => typeof value === "string" && value.trim() ? value.trim() : null;

export async function saveCapaStage(formData) {
  const supabase = await createClient();
  const {data:{user}} = await supabase.auth.getUser();
  if(!user) redirect("/portal/login");
  const caseId=clean(formData.get("case_id"));
  const stage=clean(formData.get("stage"));
  const intent=clean(formData.get("intent")) || "save";
  if(!caseId || !STAGES.includes(stage)) throw new Error("Invalid CAPA stage.");

  const {data:rcaCase,error:caseError}=await supabase.from("rca_cases").select("*").eq("id",caseId).eq("owner_id",user.id).maybeSingle();
  if(caseError || !rcaCase || rcaCase.case_type!=="capa") throw new Error("CAPA case not found.");
  if(rcaCase.access_scope==="single_assessment") await requireAssessmentRemediationAccess(user.id,rcaCase.assessment_id);

  const {data:stages,error:stagesError}=await supabase.from("rca_capa_stages").select("*").eq("case_id",caseId).eq("owner_id",user.id).order("stage_order");
  if(stagesError) throw new Error(stagesError.message);
  const index=STAGES.indexOf(stage);
  const blocker=(stages||[]).find(row=>row.stage_order<index+1 && !row.completed_at);
  if(blocker) throw new Error(`Complete ${blocker.stage.replaceAll("_"," ")} first.`);

  const narrative=clean(formData.get("narrative"));
  const evidenceReference=clean(formData.get("evidence_reference"));
  const decision=clean(formData.get("decision"));
  if(intent==="complete" && (!narrative || !evidenceReference)) throw new Error("Narrative and objective evidence are required before completion.");
  if(stage==="effectiveness_review" && intent==="complete" && !["effective","ineffective"].includes(decision)) throw new Error("Record an effectiveness decision.");

  const payload={narrative,evidence_reference:evidenceReference,due_date:clean(formData.get("due_date")),decision:stage==="effectiveness_review"?decision:null,updated_at:new Date().toISOString()};
  if(intent==="complete") Object.assign(payload,{completed_at:new Date().toISOString(),completed_by:user.id});
  const {error}=await supabase.from("rca_capa_stages").update(payload).eq("case_id",caseId).eq("owner_id",user.id).eq("stage",stage);
  if(error) throw new Error(error.message);

  if(intent==="complete") {
    const next=STAGES[index+1];
    const ineffective=stage==="effectiveness_review" && decision==="ineffective";
    const closed=stage==="effectiveness_review" && decision==="effective";
    const update=closed
      ? {capa_current_stage:"closed",status:"closed",closed_at:new Date().toISOString()}
      : ineffective
        ? {capa_current_stage:"corrective_action",status:"active",closed_at:null}
        : {capa_current_stage:next || stage,status:next==="effectiveness_review"?"effectiveness_review":"active"};
    await supabase.from("rca_cases").update(update).eq("id",caseId).eq("owner_id",user.id);
    await supabase.from("rca_case_events").insert({case_id:caseId,owner_id:user.id,event_type:closed?"capa_closed":"capa_stage_completed",discipline:index+1,summary:closed?"CAPA effectiveness verified and case closed":`${stage.replaceAll("_"," ")} completed`,event_data:{stage,decision:decision||null}});
  }
  revalidatePath(`/portal/rca/${caseId}/capa`);
  revalidatePath("/portal/rca");
  redirect(`/portal/rca/${caseId}/capa`);
}
