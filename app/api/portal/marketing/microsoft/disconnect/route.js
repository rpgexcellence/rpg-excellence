import {NextResponse} from 'next/server';
import {commercialContext} from '../../../../../../lib/commercial-store';
import {assertMicrosoftOrigin} from '../../../../../../lib/commercial-microsoft-store';
export const dynamic='force-dynamic';
export async function POST(request){try{const ctx=await commercialContext();assertMicrosoftOrigin(request);const {error}=await ctx.admin.from('commercial_microsoft_connection').delete().eq('id','primary');if(error)throw Error();return NextResponse.json({disconnected:true},{headers:{'Cache-Control':'private, no-store'}});}catch(e){return NextResponse.json({error:'The mailbox connection could not be removed.'},{status:e.status||400,headers:{'Cache-Control':'private, no-store'}});}}
