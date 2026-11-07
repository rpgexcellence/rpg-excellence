import 'server-only';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { requireAssetAccess } from './asset-management';
import { createAdminClient } from './supabase/admin';
import { loadAdministrationLocations } from './rcaCompanyLinks';
import { parseAssetControls } from './asset-catalog';
const uuid=value=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value||'');
const ALLOWED=new Set(['application/pdf','image/png','image/jpeg','text/plain','text/csv','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
export async function saveControlledAsset(form){
 let admin,uploaded=[],rpcStarted=false;
 try{
  const access=await requireAssetAccess('contribute');const {organization,user}=access;admin=createAdminClient();
  const text=(key,max=2000)=>String(form.get(key)||'').trim().slice(0,max);
  const id=text('id',80),request=text('asset_request_id',80);if(!uuid(request))throw Error('Refresh the form before saving this asset.');if(id&&!uuid(id))throw Error('The asset identity is invalid.');
  const assetId=id||randomUUID();let existing={};
  if(id){const {data,error}=await admin.from('organization_assets').select('*').eq('id',id).eq('organization_id',organization.id).maybeSingle();if(error||!data)throw Error('Asset unavailable in your company.');existing=data;}
  const controls=parseAssetControls(form,existing);
  const name=text('asset_name',180);if(!name)throw Error('Enter the asset name.');
  const status=text('operational_status',30)||'active',criticality=text('criticality',20)||'medium',ownerType=text('maintenance_owner_type',20)||'internal';
  if(!['active','out_of_service','retired'].includes(status)||!['low','medium','high','critical'].includes(criticality)||!['internal','supplier'].includes(ownerType))throw Error('Review asset status, criticality and maintenance delivery.');
  const locations=await loadAdministrationLocations(organization),location=locations.find(r=>r.id===text('site_location_id',180));if(!location)throw Error('Select a current company Site Profile.');
  const ownerId=text('asset_owner_person_id',80),maintenanceOwnerId=text('maintenance_owner_person_id',80);if(!uuid(ownerId)||!uuid(maintenanceOwnerId))throw Error('Select current company owners.');
  const {data:owners,error:ownerError}=await admin.from('organization_people').select('id,first_name,last_name,email').eq('organization_id',organization.id).eq('account_status','active').in('id',[...new Set([ownerId,maintenanceOwnerId])]);if(ownerError||owners?.length!==new Set([ownerId,maintenanceOwnerId]).size)throw Error('The selected company owners are no longer active.');
  const internal=owners.find(p=>p.id===maintenanceOwnerId);const internalName=[internal.first_name,internal.last_name].filter(Boolean).join(' ')||internal.email;
  const supplierId=ownerType==='supplier'?text('maintenance_supplier_id',80):null;
  if(supplierId){const {data,error}=await admin.from('suppliers').select('id').eq('id',supplierId).eq('organization_id',organization.id).in('approval_status',['approved','conditionally_approved']).maybeSingle();if(error||!data)throw Error('Select an approved supplier in this company.');}else if(ownerType==='supplier')throw Error('Select the approved maintenance supplier.');
  const documentIds=[...new Set(form.getAll('controlled_document_ids').map(String).filter(Boolean))];if(documentIds.some(id=>!uuid(id)))throw Error('Review the selected document links.');
  const files=controls.records.map(r=>[r,form.get(r.kind==='service'?'initial_service_file':'calibration_file')]);
  for(const [,file]of files)if(file&&typeof file!=='string'&&file.size&&(file.size>2*1024*1024||!ALLOWED.has(file.type)))throw Error('Each evidence file must be 2 MB or smaller, using PDF, image, text, CSV, Word or Excel.');
  const records=[];
  for(const [record,file]of files){const row={...record,maintenance_reference:`${record.kind==='calibration'?'CAL':'PPM'}-${new Date().getUTCFullYear()}-${randomUUID().slice(0,8).toUpperCase()}`,performed_by:record.performed_by||'Not recorded'};
   if(file&&typeof file!=='string'&&file.size){const fileName=String(file.name).replace(/[^a-zA-Z0-9._-]/g,'_').slice(-120)||'evidence';const path=`${organization.id}/${assetId}/${randomUUID()}-${fileName}`;const {error}=await admin.storage.from('asset-maintenance-evidence').upload(path,file,{contentType:file.type,upsert:false});if(error)throw Error('Evidence upload failed; no asset was saved.');uploaded.push(path);Object.assign(row,{evidence_storage_path:path,evidence_file_name:fileName,evidence_mime_type:file.type,evidence_size_bytes:file.size});}records.push(row);
  }
  const values={...controls.values,asset_reference:id?existing.asset_reference:text('asset_reference',100)||null,asset_name:name,site_location_id:location.id,site_location_label:location.label,asset_owner_person_id:ownerId,maintenance_owner_person_id:maintenanceOwnerId,maintenance_owner_type:ownerType,maintenance_supplier_id:supplierId,maintenance_provider:null,operational_status:status,criticality,change_control_required:form.get('change_control_required')==='true'};
  for(const [key,max]of [['area_department',180],['description',2000],['manufacturer',180],['model',180],['serial_number',180],['maintenance_notes',2000]])values[key]=text(key,max)||null;
  rpcStarted=true;
  const {data,error}=await admin.rpc('save_asset_with_initial_history',{p_company:organization.id,p_actor:user.id,p_request:request,p_asset_id:assetId,p_create:!id,p_values:values,p_document_ids:documentIds,p_records:records});
  if(error){if(/^[0-9A-Z]{5}$/.test(error.code||'')){rpcStarted=false;throw Error(error.code==='23505'?'That asset reference already exists in this company.':error.message);}throw Error('Save confirmation was unavailable. Retry this same form to check the original request; do not create a second asset.');}
  if(!data?.id)throw Error('Save confirmation was unavailable. Retry this same form to check the original request.');
  const retained=new Set(data?.retained_paths||[]),unused=uploaded.filter(path=>!retained.has(path));if(unused.length)await admin.storage.from('asset-maintenance-evidence').remove(unused);
  for(const path of ['/portal/asset-management','/portal/company/assets','/portal/health-safety/moc/new','/portal/health-safety/permits/new'])revalidatePath(path,'layout');
  return{error:'',success:data?.reused?'This submission was already saved. Open the asset register to review it.':id?'Asset details and history saved.':'Asset created with its service / calibration history.',assetId:data.id};
 }catch(error){if(error?.digest?.startsWith('NEXT_REDIRECT'))throw error;if(!rpcStarted&&uploaded.length&&admin)await admin.storage.from('asset-maintenance-evidence').remove(uploaded);return{error:error?.message||'The asset could not be saved.',success:''};}
}
