import { createAdminClient } from './supabase/admin';
import { createClient } from './supabase/server';
import { getOrganizationAccess } from './organization-access';
import { getUserSubscription, hasPlanAccess } from './subscription';
import { requireAssessmentRemediationAccess } from './assessment-access';

// Authorised company scope first; administrative client only after that check.
export async function rcaReviewAccess(caseId,minimum='view') {
  const client=await createClient();const {data:{user},error}=await client.auth.getUser();
  if(error||!user)throw Error('Sign in before reviewing a controlled case.');
  const admin=createAdminClient();
  const {data:candidate,error:caseError}=await admin.from('rca_cases').select('*').eq('id',caseId).maybeSingle();
  if(caseError||!candidate)throw Error('The case is unavailable in your authorised company.');
  let access;
  if(candidate.owner_id===user.id){
    const {data:organization,error:orgError}=await admin.from('organizations').select('*').eq('id',candidate.organization_id).eq('owner_id',user.id).maybeSingle();
    if(orgError||!organization)throw Error('The case company could not be verified.');
    access={allowed:true,user,organization,level:'owner',isOwner:true};
  }else access=await getOrganizationAccess('capa_8d',minimum);
  if(!access?.allowed||access.user?.id!==user.id||access.organization?.id!==candidate.organization_id||access.organization?.owner_id!==candidate.owner_id)throw Error('Your company role does not permit this CAPA-8D operation.');
  const rcaCase=candidate;
  const subscription=await getUserSubscription(user.id);
  if(subscription?.access_source==='organization_subscription'&&subscription.organization_id!==access.organization.id)throw Error('Company entitlement mismatch.');
  if(rcaCase.access_scope==='single_assessment')await requireAssessmentRemediationAccess(user.id,rcaCase.assessment_id);
  else if(!hasPlanAccess(subscription,'professional'))throw Error('CAPA-8D requires the existing Professional or administrator entitlement.');
  return {admin,user,access,rcaCase,ownerId:rcaCase.owner_id};
}
