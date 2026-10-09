"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {createAdminClient} from "../../../../../lib/supabase/admin";
import {requireAssessmentOrganizationAccess} from "../../../../../lib/assessment-organization-access";
import {loadAssessmentPeople,requirePerson} from "../../../../../lib/assessment-people";

const text=(fd,key)=>String(fd.get(key)||"").trim();
export async function saveAssessmentGovernance(formData){
 const assessmentId=text(formData,"assessment_id");
 const access=await requireAssessmentOrganizationAccess(assessmentId,"admin");
 const people=await loadAssessmentPeople(access.assessment.organization_id);
 const owner=requirePerson(people,text(formData,"assessment_owner_person_id"),"Assessment owner",{level:"contribute",functions:["assessment_owner"]});
 const lead=requirePerson(people,text(formData,"lead_assessor_person_id"),"Lead assessor",{level:"contribute",functions:["lead_assessor","auditor"]});
 const sponsor=requirePerson(people,text(formData,"executive_sponsor_person_id"),"Executive sponsor",{level:"view"});
 const approver=requirePerson(people,text(formData,"approver_person_id"),"Assessment approver",{level:"approve",functions:["approver"]});
 const verifier=requirePerson(people,text(formData,"effectiveness_verifier_person_id"),"Effectiveness verifier",{level:"review",functions:["effectiveness_verifier"]});
 if(lead.id===approver.id)throw new Error("The lead assessor cannot approve their own assessment.");
 if(lead.id===verifier.id)throw new Error("The lead assessor cannot be the nominated effectiveness verifier.");
 if(formData.get("approval_confirmation")!=="on")throw new Error("Confirm the governance and independence statement.");
 const admin=createAdminClient(),now=new Date().toISOString();
 const {error}=await admin.from("assessments").update({assessment_owner_person_id:owner.id,lead_assessor_person_id:lead.id,executive_sponsor_person_id:sponsor.id,approver_person_id:approver.id,effectiveness_verifier_person_id:verifier.id,governance_approved_at:now,governance_approved_by:access.user.id}).eq("id",assessmentId).eq("organization_id",access.assessment.organization_id);
 if(error)throw new Error(error.message);
 await admin.from("organization_access_events").insert({organization_id:access.assessment.organization_id,person_id:access.person?.id||null,actor_id:access.user.id,event_type:"assessment_governance_approved",event_summary:`Governance approved for ${access.assessment.standard}`,event_data:{assessment_id:assessmentId,assessment_owner_person_id:owner.id,lead_assessor_person_id:lead.id,executive_sponsor_person_id:sponsor.id,approver_person_id:approver.id,effectiveness_verifier_person_id:verifier.id}});
 revalidatePath(`/portal/assessments/${assessmentId}`);revalidatePath(`/portal/assessments/${assessmentId}/governance`);
 redirect(`/portal/assessments/${assessmentId}/governance?saved=1`);
}
