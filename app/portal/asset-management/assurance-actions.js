'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAssetAccess } from '../../../lib/asset-management';
import { createAdminClient } from '../../../lib/supabase/admin';
import { getOrganizationAccess } from '../../../lib/organization-access';
import { sameCompanyAccess } from '../../../lib/asset-assurance';
import { rcaReviewAccess } from '../../../lib/rca-review-access';
const ROOT='/portal/asset-management';
const uuid=value=>typeof value==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export async function linkAssetAssurance(formData) {
 const access=await requireAssetAccess('contribute');
 const assetId=formData.get('asset_id'), source=String(formData.get('source')||'');
 const [kind,id,...extra]=source.split(':');
 let errorMessage='';
 try {
  if(!uuid(assetId)||!uuid(id)||extra.length||!['finding','case'].includes(kind))throw Error('Select an asset and a controlled source record.');
  const admin=createAdminClient();
  const {data:asset,error:assetError}=await admin.from('organization_assets').select('id').eq('id',assetId).eq('organization_id',access.organization.id).maybeSingle();
  if(assetError||!asset)throw Error('The asset is unavailable in your company.');
  if(kind==='case') {
   const context=await getOrganizationAccess('capa_8d','contribute');
   if(!sameCompanyAccess(context,access))throw Error('CAPA / 8D create/edit access is required to link this case.');
   const checked=await rcaReviewAccess(id,'contribute');
   if(checked.rcaCase.organization_id!==access.organization.id || checked.ownerId!==access.organization.owner_id)throw Error('The case belongs to another company.');
  } else {
   // Current internal-audit detail routes are owner-scoped.
   if(access.user.id!==access.organization.owner_id)throw Error('The audit record owner must link this NC.');
   const {data:finding,error}=await admin.from('internal_audit_findings').select('*').eq('id',id).eq('owner_id',access.user.id).maybeSingle();
   if(error||!finding||(finding.organization_id && finding.organization_id!==access.organization.id)||!['major_nc','minor_nc'].includes(finding.finding_type))throw Error('Select a current major or minor audit NC.');
   const {data:audit,error:auditError}=await admin.from('internal_audits').select('id').eq('id',finding.audit_id).eq('organization_id',access.organization.id).eq('owner_id',access.user.id).maybeSingle();
   if(auditError||!audit)throw Error('The audit is unavailable in your company.');
  }
  const {error}=await admin.from('organization_asset_assurance_links').insert({organization_id:access.organization.id,asset_id:assetId,finding_id:kind==='finding'?id:null,rca_case_id:kind==='case'?id:null,created_by:access.user.id});
  if(error && error.code!=='23505')throw Error('The link could not be saved. Confirm the asset-assurance database migration has been applied.');
 } catch(error) { errorMessage=error instanceof Error ? error.message : 'The link could not be saved.'; }
 if(errorMessage)redirect(`${ROOT}?assurance_error=${encodeURIComponent(errorMessage)}#asset-assurance`);
 revalidatePath(ROOT);
 redirect(`${ROOT}?assurance_saved=1#asset-assurance`);
}
