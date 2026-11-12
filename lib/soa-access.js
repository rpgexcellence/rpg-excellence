import {createClient} from './supabase/server';
import {createAdminClient} from './supabase/admin';
import {getOrganizationAccess} from './organization-access';
import {getAssessmentAccessState} from './assessment-access';
export async function soaContext(assessmentId,write=false){
 const client=await createClient(),{data:{user},error}=await client.auth.getUser();
 if(error||!user)throw Error('Sign in before opening a Statement of Applicability.');
 const admin=createAdminClient();
 const {data:assessment,error:readError}=await admin.from('assessments').select('id,owner_id,organization_id,standard,status,workspace_type').eq('id',assessmentId).maybeSingle();
 if(readError||!assessment||!['ISO/IEC 27001:2022','ISO/IEC 27001:2022/Amd 1:2024'].includes(assessment.standard))throw Error('This Statement of Applicability is unavailable.');
 let level='owner';
 if(assessment.owner_id!==user.id){
  const access=await getOrganizationAccess('information_security',write?'contribute':'view');
  if(!access.allowed||access.user?.id!==user.id||access.organization?.id!==assessment.organization_id)throw Error('This Statement of Applicability is unavailable in your company.');
  level=access.level;
 }
 const entitlement=await getAssessmentAccessState(user.id,assessmentId);
 const canEdit=entitlement.canEditAssessment&&['owner','admin','contribute','review','approve'].includes(level);
 if(write&&!canEdit)throw Error('Your current access does not allow editing this Statement of Applicability.');
 return {client,admin,user,assessment,assessmentId,ownerId:assessment.owner_id,canEdit,canApprove:entitlement.canEditAssessment&&['owner','admin','approve'].includes(level),access:{...entitlement,canEditAssessment:canEdit}};
}
export async function soaPeople(ctx){
 const {data,error}=await ctx.admin.from('organization_people').select('id,first_name,last_name,email,user_id,account_status').eq('organization_id',ctx.assessment.organization_id).eq('account_status','active').order('last_name');
 if(error)throw Error('The company user directory could not be loaded.');
 return data||[];
}
