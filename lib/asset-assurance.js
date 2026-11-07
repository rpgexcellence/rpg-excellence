import { createAdminClient } from './supabase/admin';
import { createClient } from './supabase/server';
import { getOrganizationAccess } from './organization-access';
import { rcaReviewAccess } from './rca-review-access';
import { loadAssetRows } from './asset-management';

const ranks={none:0,view:1,contribute:2,review:3,approve:4,admin:5,owner:6};
export function sameCompanyAccess(context, access) {
 return Boolean(context?.allowed && context.user?.id===access.user.id && context.organization?.id===access.organization.id && context.organization?.owner_id===access.organization.owner_id);
}
const sourceRow=(row, kind, href)=>({...row,kind,source_id:row.id,reference:row.finding_reference||row.case_reference||row.moc_reference,title:row.title||'Controlled record',due:row.target_close_date||row.target_date||row.due_date||null,href});
export async function loadAssetAssurance(access, maintenance=[]) {
 const admin=createAdminClient(), client=await createClient();
 const organizationId=access.organization.id;
 const [risk,capa]=await Promise.all([getOrganizationAccess('risk_management'),getOrganizationAccess('capa_8d')]);
 const state={maintenance,actions:[],actionsReady:true,findings:[],cases:[],mocs:[],findingOptions:[],caseOptions:[],linksReady:true,issues:[],canMoc:sameCompanyAccess(risk,access),canCapa:sameCompanyAccess(capa,access),canFindings:access.user.id===access.organization.owner_id};
 let links=[];
 try { links=await loadAssetRows(admin,'organization_asset_assurance_links',organizationId); }
 catch { state.linksReady=false;state.issues.push('NC/CAPA asset links could not be loaded. Check the supplied database migration and database availability; existing maintenance remains available.'); }
 const attach=(rows,key)=>links.flatMap(link=>{
  const row=rows.find(r=>r.source_id===link[key]);
  return row ? [{...row,asset_id:link.asset_id,link_id:link.id}] : [];
 });
 if(state.canMoc) {
  try { state.mocs=(await loadAssetRows(admin,'hs_moc_changes',organizationId)).filter(r=>r.organization_asset_id).map(r=>({...sourceRow(r,'MOC',`/portal/health-safety/moc/${r.id}`),asset_id:r.organization_asset_id})); }
  catch { state.canMoc=false;state.issues.push('MOC records could not be loaded. Their counts are unavailable.'); }
 }
 if(state.canCapa) {
  try {
   const candidates=(await loadAssetRows(admin,'rca_cases',organizationId)).filter(r=>r.owner_id===access.organization.owner_id);
   // Reuse per-case assessment/entitlement checks; module access alone is insufficient.
   const allowed=[];
   for(let offset=0;offset<candidates.length;offset+=10) {
    const batch=await Promise.all(candidates.slice(offset,offset+10).map(async row=>{
     try { await rcaReviewAccess(row.id,'view');return sourceRow(row,'CAPA / 8D',`/portal/rca/${row.id}`); } catch { return null; }
    })); allowed.push(...batch.filter(Boolean));
   }
   state.caseOptions=allowed;state.cases=attach(allowed,'rca_case_id');
  } catch { state.canCapa=false;state.issues.push('CAPA / 8D records could not be loaded. Their counts are unavailable.'); }
 }
 if(state.canFindings) {
  try {
   const audits=(await loadAssetRows(admin,'internal_audits',organizationId,'id,owner_id')).filter(r=>r.owner_id===access.user.id);
   const findings=[];
   // The existing audit-detail route is owner-scoped. Do not expose audit NCs to other users.
   for(let offset=0;offset<audits.length;offset+=100) {
    const ids=audits.slice(offset,offset+100).map(a=>a.id);
    for(let page=0;;page+=500) {
     const {data,error}=await client.from('internal_audit_findings').select('*').eq('owner_id',access.user.id).in('audit_id',ids).in('finding_type',['major_nc','minor_nc']).order('id').range(page,page+499);
     if(error)throw error;
     findings.push(...(data||[]));if(!data||data.length<500)break;
    }
   }
   state.findingOptions=findings.filter(r=>!r.organization_id||r.organization_id===organizationId).map(r=>sourceRow(r,'Audit NC',`/portal/internal-audits/${r.audit_id}?gate=closing#closure-${r.id}`));
   state.findings=attach(state.findingOptions,'finding_id');
  } catch {state.canFindings=false;state.issues.push('Audit NC records could not be loaded. Their counts are unavailable.');}
 }
 // NC-linked CAPA cases inherit the explicit asset association, after source authorisation.
 const caseById=new Map(state.caseOptions.map(row=>[row.source_id,row]));
 const caseKeys=new Set(state.cases.map(row=>`${row.asset_id}:${row.source_id}`));
 for(const finding of state.findings) {
  const row=caseById.get(finding.linked_rca_case_id), key=`${finding.asset_id}:${finding.linked_rca_case_id}`;
  if(row && !caseKeys.has(key)){state.cases.push({...row,asset_id:finding.asset_id});caseKeys.add(key);}
 }
 if(state.canCapa && state.cases.length) {
  try {
   const ids=[...new Set(state.cases.map(row=>row.source_id))];
   const actions=[];
   for(let offset=0;offset<ids.length;offset+=100)for(let page=0;;page+=500){
    const {data,error}=await admin.from('rca_actions').select('*').eq('owner_id',access.organization.owner_id).in('case_id',ids.slice(offset,offset+100)).order('id').range(page,page+499);
    if(error)throw error;actions.push(...(data||[]));if(!data||data.length<500)break;
   }
   state.actions=state.cases.flatMap(row=>actions.filter(action=>action.case_id===row.source_id).map(action=>({...action,asset_id:row.asset_id,href:row.href,case_reference:row.reference})));
  } catch {state.actionsReady=false;state.issues.push('Corrective-action tasks could not be loaded. Their overdue count is unavailable.');}
 }
 state.canLinkFindings=access.canWrite && state.canFindings;
 state.canLinkCases=access.canWrite && state.canCapa && sameCompanyAccess(capa,access) && (ranks[capa.level]||0)>=ranks.contribute;
 return state;
}
