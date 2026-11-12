import {NextResponse} from "next/server";
import {soaContext} from "../../../../../../../lib/soa-access";
export const dynamic="force-dynamic";
export async function GET(_request,{params}){
 const {id,evidenceId}=await params;
 try{
  const ctx=await soaContext(id);
  const {data:file,error}=await ctx.admin.from("soa_control_evidence").select("storage_path,file_name").eq("id",evidenceId).eq("assessment_id",id).eq("organization_id",ctx.assessment.organization_id).eq("owner_id",ctx.ownerId).maybeSingle();
  if(error||!file)return new NextResponse("Evidence unavailable",{status:404});
  const {data,error:signError}=await ctx.admin.storage.from("soa-control-evidence").createSignedUrl(file.storage_path,60,{download:file.file_name});
  if(signError||!data?.signedUrl)return new NextResponse("Evidence unavailable",{status:404});
  const response=NextResponse.redirect(data.signedUrl);response.headers.set("Cache-Control","private, no-store");return response;
 }catch{return new NextResponse("Evidence unavailable",{status:404,headers:{"Cache-Control":"no-store"}});}
}
