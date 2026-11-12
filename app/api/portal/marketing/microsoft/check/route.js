import {NextResponse} from 'next/server';
import {commercialContext} from '../../../../../../lib/commercial-store';
import {assertMicrosoftOrigin,microsoftAccessToken} from '../../../../../../lib/commercial-microsoft-store';
import {microsoftGraph,microsoftFailureDetails} from '../../../../../../lib/commercial-microsoft.mjs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function POST(request){
 try{const ctx=await commercialContext();assertMicrosoftOrigin(request);const token=await microsoftAccessToken(ctx);const folder=await microsoftGraph(token,'/me/mailFolders/drafts?$select=id',{timeoutMs:35000});if(!folder?.id)throw Error();return NextResponse.json({ok:true},{headers:{'Cache-Control':'private, no-store'}});}
 catch(e){return NextResponse.json({ok:false,...(e.status?{code:'WorkspaceUnavailable',message:'This workspace is unavailable.'}:microsoftFailureDetails(e))},{status:e.status||502,headers:{'Cache-Control':'private, no-store'}});}
}
