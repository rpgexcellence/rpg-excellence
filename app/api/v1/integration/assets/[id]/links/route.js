import { withIntegrationRequest, requireIntegrationClient } from "../../../../../../../lib/integration-api";
import { assetChildResponse } from "../../../../../../../lib/integration-assets";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export const GET=withIntegrationRequest(async function GET(request,context){
 const authentication=await requireIntegrationClient(request,"assets:links:read");
 if(authentication.error)return authentication.error;
 return assetChildResponse(request,context,authentication,"links");
});
