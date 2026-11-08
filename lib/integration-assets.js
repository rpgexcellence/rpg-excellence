import { integrationJson, recordIntegrationEvent } from "./integration-api";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function assetChildResponse(request, context, authentication, kind) {
 const {admin,client,requestId}=authentication;
 const {id}=await context.params;
 const fail=(error,status)=>integrationJson({error,request_id:requestId},status,requestId);
 if(!UUID.test(String(id)))return fail("asset_not_found",404);
 const params=new URL(request.url).searchParams;
 for(const name of params.keys())if(!["page","page_size","kind"].includes(name)||params.getAll(name).length!==1)return fail("invalid_parameters",400);
 const number=(name,fallback,max)=>{const value=params.get(name);if(value===null)return fallback;return /^[1-9][0-9]*$/.test(value)&&Number(value)<=max?Number(value):null;};
 const page=number("page",1,100000),size=number("page_size",25,100);
 if(!page||!size)return fail("invalid_pagination",400);
 const {data:asset,error:assetError}=await admin.from("organization_assets").select("id,owner_id").eq("id",id).eq("organization_id",client.organization_id).maybeSingle();
 if(assetError)return fail("asset_unavailable",503);
 if(!asset||asset.owner_id!==client.owner_id)return fail("asset_not_found",404);
 const sources={
  maintenance:["organization_asset_maintenance",MAINTENANCE_FIELDS,"asset_id"],
  documents:["organization_asset_document_links","id,asset_id,controlled_document_id,created_at","asset_id"],
  assurance:["organization_asset_assurance_links","id,asset_id,finding_id,rca_case_id,created_at","asset_id"],
  moc:["hs_moc_changes","id,organization_asset_id","organization_asset_id"],
 };
 const selected=kind==="maintenance"?"maintenance":params.get("kind")||"documents";
 if(!sources[selected]||(kind==="links"&&selected==="maintenance")||(kind==="maintenance"&&params.has("kind")))return fail("invalid_kind",400);
 const [table,fields,parent]=sources[selected];
 let query=admin.from(table).select(fields,{count:"exact"}).eq("organization_id",client.organization_id).eq(parent,id);
 // All sources except the association table retain their own owner binding.
 if(selected!=="assurance")query=query.eq("owner_id",client.owner_id);
 const {data,count,error}=await query.order("id").range((page-1)*size,page*size-1);
 if(error)return fail("asset_records_unavailable",503);
 await recordIntegrationEvent({admin,client,request,requestId,eventType:"asset_"+selected+"_read",resourceType:"organization_asset",resourceId:id,responseStatus:200});
 return integrationJson({data:data||[],kind:selected,asset_id:id,pagination:{page,page_size:size,total:count||0,total_pages:Math.ceil((count||0)/size)},request_id:requestId},200,requestId);
}
export const MAINTENANCE_FIELDS="id,asset_id,maintenance_reference,maintenance_type,scheduled_date,completed_date,status,maintenance_owner_type,responsible_person_id,supplier_id,performed_by,work_completed,evidence_reference,calibration_result,calibration_acceptance_criteria,next_due_date,created_at";
