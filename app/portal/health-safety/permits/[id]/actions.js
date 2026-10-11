"use server";

import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {createClient} from "../../../../../lib/supabase/server";
import {requirePlanAccess} from "../../../../../lib/plan-access";
import {getPermitAccess,mayAcceptHandback,mayEditPermit,mayIssuePermit,mayReceivePermit,mayVerifyPermit} from "../../../../../lib/permitAccess";
import {effectivePermitStatus,getCloseReadiness,getIssueReadiness,requireTransition} from "../../../../../lib/permitLifecycle";
import {getPermitRule} from "../../../../../lib/permitControlRules";

const clean=value=>String(value||"").trim();
const personName=person=>[person?.first_name,person?.last_name].filter(Boolean).join(" ").trim()||person?.email||"Authorised user";
const workflowPrompt=(id,message)=>redirect(`/portal/health-safety/permits/${id}?workflowError=${encodeURIComponent(message)}`);

async function context(formData){
  const id=clean(formData.get("id"));
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();

  if(!user)redirect(`/portal/login?next=/portal/health-safety/permits/${id}`);

  await requirePlanAccess(user.id,"professional","Permit to Work");

  const access=await getPermitAccess(user.id,id);

  if(!access.allowed||!access.permit){
    throw new Error("You do not have access to this permit.");
  }

  return {
    id,
    user,
    access,
    admin:access.admin,
    permit:access.permit,
    actorName:personName(access.person)||user.email||"Authorised user"
  };
}

async function event(admin,{permit,user,actorName},fromStatus,toStatus,eventType,reason="",eventData={}){
  const {error}=await admin.from("hs_permit_events").insert({
    permit_id:permit.id,
    owner_id:permit.owner_id,
    organization_id:permit.organization_id,
    event_type:eventType,
    from_status:fromStatus,
    to_status:toStatus,
    reason:reason||null,
    actor_id:user.id,
    actor_name:actorName,
    permit_version:permit.version||1,
    event_data:eventData,
  });

  if(error)throw new Error(error.message);
}

async function relatedRecords(admin,permit){
  const [
    isolationsResult,
    testsResult,
    conflictsResult
  ]=await Promise.all([
    admin
      .from("hs_permit_isolations")
      .select("*")
      .eq("permit_id",permit.id),

    admin
      .from("hs_permit_atmosphere_tests")
      .select("*")
      .eq("permit_id",permit.id)
      .order("tested_at",{ascending:false}),

    admin
      .from("hs_permits")
      .select("id,permit_reference,status,task_description")
      .eq("organization_id",permit.organization_id)
      .eq("site_location",permit.site_location)
      .eq("asset_reference",permit.asset_reference)
      .neq("id",permit.id)
      .in("status",[
        "awaiting_verification",
        "awaiting_acceptance",
        "issued",
        "handover_required"
      ]),
  ]);

  for(const result of [
    isolationsResult,
    testsResult,
    conflictsResult
  ]){
    if(result.error)throw new Error(result.error.message);
  }

  return {
    isolations:isolationsResult.data||[],
    atmosphereTests:testsResult.data||[],
    relatedConflicts:conflictsResult.data||[]
  };
}

export async function changePermitLifecycle(formData){
  const ctx=await context(formData);
  const {
    id,
    user,
    access,
    admin,
    permit,
    actorName
  }=ctx;

  const intent=clean(formData.get("intent"));
  const reason=clean(formData.get("reason"));
  const confirmation=clean(formData.get("confirmation"));

  const now=new Date().toISOString();
  const fromStatus=effectivePermitStatus(permit);
  const records=await relatedRecords(admin,permit);

  let toStatus=fromStatus;
  let values={updated_at:now};
  let eventType=intent;
  let eventData={};

  if(intent==="submit_verification"){
    if(!mayEditPermit(access)){
      throw new Error("Contributor access is required to submit this permit.");
    }

    requireTransition(fromStatus,"awaiting_verification");
    toStatus="awaiting_verification";

  }else if(intent==="verify"){
    if(!mayVerifyPermit(access)){
      throw new Error("A permit verifier or issuer must complete verification.");
    }

    requireTransition(fromStatus,"awaiting_acceptance");

    const rule=getPermitRule(permit.permit_type);

    if(rule.requiresIsolation&&!records.isolations.length){
      workflowPrompt(
        id,
        "Verification cannot be completed yet. Record and verify every required isolation in Safety controls, then return here and complete verification."
      );
    }

    if(rule.requiresAtmosphere&&!records.atmosphereTests.length){
      workflowPrompt(
        id,
        "Verification cannot be completed yet. Record an acceptable atmospheric test in Safety controls, then return here and complete verification."
      );
    }

    toStatus="awaiting_acceptance";
    values.verification_completed_at=now;

  }else if(intent==="accept_receiver"){
    if(!mayReceivePermit(access)){
      throw new Error("Only the nominated receiver or a company administrator may accept control of the work.");
    }

    if(fromStatus!=="awaiting_acceptance"){
      throw new Error("The permit must complete verification before receiver acceptance.");
    }

    values.receiver_declaration=true;
    values.receiver_accepted_at=now;
    toStatus=fromStatus;

  }else if(intent==="issue"){
    if(!mayIssuePermit(access)){
      throw new Error("An authorised permit issuer is required.");
    }

    requireTransition(fromStatus,"issued");

    const readiness=getIssueReadiness({
      permit:{...permit,...values},
      rule:getPermitRule(permit.permit_type),
      ...records
    });

    if(!readiness.ready){
      workflowPrompt(
        id,
        `The permit cannot be issued yet. ${readiness.blockers.join(" ")} Open Safety controls, complete the outstanding checks and then return to issue the permit.`
      );
    }

    toStatus="issued";

    values={
      ...values,
      status:toStatus,
      issued_at:now,
      issuer_declaration:true,
      issuer_accepted_at:now,
      suspended_at:null,
      suspension_reason:null
    };

  }else if(intent==="suspend"){
    if(!mayEditPermit(access)){
      throw new Error("You do not have permission to suspend this permit.");
    }

    requireTransition(fromStatus,"suspended");

    if(!reason){
      throw new Error("Record why work is being suspended and how the area was left safe.");
    }

    toStatus="suspended";

    values={
      ...values,
      status:toStatus,
      suspended_at:now,
      suspension_reason:reason
    };

  }else if(intent==="request_handover"){
    if(!mayEditPermit(access)){
      throw new Error("You do not have permission to initiate handover.");
    }

    requireTransition(fromStatus,"handover_required");

    if(!reason){
      throw new Error("Record the current work state, remaining hazards and isolations for handover.");
    }

    toStatus="handover_required";

    values={
      ...values,
      status:toStatus,
      handover_required:true
    };

  }else if(intent==="complete_work"){
    if(!mayReceivePermit(access)){
      throw new Error("The nominated person in charge must declare the work complete.");
    }

    requireTransition(fromStatus,"awaiting_handback");

    if(!confirmation){
      throw new Error("Confirm how the worksite was left safe and account for people, tools and materials.");
    }

    toStatus="awaiting_handback";

    values={
      ...values,
      status:toStatus,
      completion_declared_at:now,
      closeout_notes:confirmation
    };

  }else if(intent==="accept_handback"){
    if(!mayAcceptHandback(access)){
      throw new Error("An authorised operations or issuing authority must accept hand-back.");
    }

    requireTransition(fromStatus,"closed");

    if(!confirmation){
      throw new Error("Confirm reinstatement, inspection and safe return to service.");
    }

    const candidate={
      ...permit,
      completion_declared_at:permit.completion_declared_at,
      handback_accepted_at:now,
      reinstatement_confirmation:confirmation
    };

    const readiness=getCloseReadiness({
      permit:candidate,
      isolations:records.isolations
    });

    if(!readiness.ready){
      throw new Error(
        `Permit cannot be closed: ${readiness.blockers.join(" ")}`
      );
    }

    toStatus="closed";

    values={
      ...values,
      status:toStatus,
      handback_accepted_at:now,
      handback_accepted_by:access.person?.id||null,
      reinstatement_confirmation:confirmation,
      closed_at:now
    };

  }else if(intent==="cancel"){
    if(!mayIssuePermit(access)){
      throw new Error("An issuer or approver must cancel this permit.");
    }

    requireTransition(fromStatus,"cancelled");

    if(!reason){
      throw new Error("Record why the permit is being cancelled.");
    }

    toStatus="cancelled";

    values={
      ...values,
      status:toStatus,
      cancelled_at:now,
      cancellation_reason:reason
    };

  }else{
    throw new Error("Unsupported permit action.");
  }

  if(intent!=="issue"&&!["accept_receiver"].includes(intent)){
    values.status=toStatus;
  }

  const {error}=await admin
    .from("hs_permits")
    .update(values)
    .eq("id",id);

  if(error)throw new Error(error.message);

  await event(
    admin,
    ctx,
    fromStatus,
    toStatus,
    eventType,
    reason||confirmation,
    eventData
  );

  revalidatePath(`/portal/health-safety/permits/${id}`);
  revalidatePath("/portal/health-safety/permits");
}
