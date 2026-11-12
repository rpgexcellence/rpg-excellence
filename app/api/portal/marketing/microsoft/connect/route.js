import {NextResponse} from 'next/server';
import {commercialContext} from '../../../../../../lib/commercial-store';
import {assertMicrosoftOrigin,microsoftStatus} from '../../../../../../lib/commercial-microsoft-store';
import {requireMicrosoftConfiguration,createMicrosoftAuthorization,MS_COOKIE,MS_ORIGIN} from '../../../../../../lib/commercial-microsoft.mjs';
export const dynamic='force-dynamic';
export async function POST(request){
 try{const ctx=await commercialContext();assertMicrosoftOrigin(request);const config=requireMicrosoftConfiguration();const status=await microsoftStatus(ctx);if(!status.databaseReady)throw Error();
  const flow=createMicrosoftAuthorization(config,ctx.user.id),response=NextResponse.redirect(flow.url,303);
  response.cookies.set(MS_COOKIE,flow.cookie,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:600});response.headers.set('Cache-Control','private, no-store');response.headers.set('Referrer-Policy','no-referrer');return response;
 }catch(e){if(e.status)return new NextResponse(null,{status:e.status});return NextResponse.redirect(`${MS_ORIGIN}/portal/marketing?microsoft=setup`,303);}
}
