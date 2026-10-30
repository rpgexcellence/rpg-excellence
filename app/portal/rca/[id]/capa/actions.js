"use server";
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { rcaReviewAccess } from '../../../../../lib/rca-review-access';
const STAGES=['correction','cause_analysis','corrective_action','effectiveness_review'];
const clean=v=>typeof v==='string'&&v.trim()?v.trim():null;
export async function saveCapaStageState(previousState,formData){
  try{return await saveCapaStage(formData);}catch(error){if(error?.digest?.startsWith('NEXT_REDIRECT'))throw error;return {error:error?.message||'The CAPA stage could not be saved.'};}
}
export async function saveCapaStage(formData){
  const caseId=clean(formData.get('case_id')),stage=clean(formData.get('stage')),intent=clean(formData.get('intent'))||'save';
  if(!caseId||!STAGES.includes(stage)||!['save','complete'].includes(intent))throw Error('Invalid CAPA stage or operation.');
  const {admin,user,ownerId,rcaCase}=await rcaReviewAccess(caseId,stage==='effectiveness_review'?'approve':'contribute');
  if(rcaCase.case_type!=='capa')throw Error('CAPA case not found.');
  if(rcaCase.status==='closed'||rcaCase.closed_at!=null||rcaCase.capa_current_stage==='closed')throw Error('This CAPA case is closed and cannot be changed through the stage form. Use controlled reopening.');
  if(ownerId!==user.id&&stage!=='effectiveness_review')throw Error('Investigation changes must be made through the case owner workspace.');
  const {data:stages,error:stageError}=await admin.from('rca_capa_stages').select('*').eq('case_id',caseId).eq('owner_id',ownerId).order('stage_order');
  if(stageError)throw Error(stageError.message);
  const index=STAGES.indexOf(stage),current=stages?.find(r=>r.stage===stage);
  if(!current||STAGES.slice(0,index).some(key=>!stages.some(r=>r.stage===key&&r.completed_at)))throw Error('Complete every preceding CAPA stage before continuing.');
  const narrative=clean(formData.get('narrative')),evidence=clean(formData.get('evidence_reference')),decision=clean(formData.get('decision'));
  if(intent==='complete'&&(!narrative||!evidence))throw Error('Narrative and objective evidence are required before completion.');
  const reviewData={method:clean(formData.get('review_method')),monitoring_period:clean(formData.get('monitoring_period'))};
  if(stage==='effectiveness_review'&&intent==='complete'){
    if(!['effective','ineffective'].includes(decision)||!reviewData.method||!reviewData.monitoring_period)throw Error('Record a decision, verification method and completed monitoring period.');
    if(stages.some(row=>row.stage!=='effectiveness_review'&&row.completed_by===user.id))throw Error('The person completing correction, cause analysis or corrective action cannot perform their own final effectiveness review. Appoint an independent company approver.');
  }
  const {error}=await admin.from('rca_capa_stages').update({narrative,evidence_reference:evidence,due_date:clean(formData.get('due_date')),decision:stage==='effectiveness_review'?decision:null,review_data:stage==='effectiveness_review'?reviewData:{},completed_at:intent==='complete'?new Date().toISOString():null,completed_by:intent==='complete'?user.id:null,updated_at:new Date().toISOString()}).eq('id',current.id).eq('case_id',caseId).eq('owner_id',ownerId);
  if(error)throw Error(error.message);
  if(intent==='complete'){
    const effective=stage==='effectiveness_review'&&decision==='effective',ineffective=stage==='effectiveness_review'&&decision==='ineffective';
    const {error:caseError}=await admin.from('rca_cases').update(effective?{capa_current_stage:'closed',status:'closed',closed_at:new Date().toISOString()}:ineffective?{capa_current_stage:'corrective_action',status:'active',closed_at:null}:{capa_current_stage:STAGES[index+1]||stage,status:index===2?'effectiveness_review':'active'}).eq('id',caseId).eq('owner_id',ownerId).is('closed_at',null);
    if(caseError)throw Error(caseError.message);
    const {error:eventError}=await admin.from('rca_case_events').insert({case_id:caseId,owner_id:ownerId,event_type:effective?'capa_closed':'capa_stage_completed',discipline:index+1,summary:effective?'CAPA independently verified effective and closed':stage.replaceAll('_',' ')+' completed',event_data:{stage,decision,actor_id:user.id,review_data:reviewData}});
    if(eventError)throw Error('The stage was saved, but its history entry could not be confirmed. Refresh before retrying.');
  }
  revalidatePath(`/portal/rca/${caseId}/capa`);revalidatePath('/portal/rca');redirect(`/portal/rca/${caseId}/capa`);
}
