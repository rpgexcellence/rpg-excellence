import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {commercialContext} from '../../../../../../lib/commercial-store';
import {requireMicrosoftConfiguration,verifyMicrosoftAuthorization,microsoftToken,microsoftGraph,verifyMicrosoftMailbox,sealMicrosoft,MS_COOKIE,MS_ORIGIN,MS_MAILBOX} from '../../../../../../lib/commercial-microsoft.mjs';
export const dynamic='force-dynamic';
export async function GET(request){
 let outcome='failed';
 try{const ctx=await commercialContext(),config=requireMicrosoftConfiguration(),url=new URL(request.url),cookie=(await cookies()).get(MS_COOKIE)?.value;
  const flow=verifyMicrosoftAuthorization(cookie,url.searchParams.get('state'),ctx.user.id,config.key);
  if(url.searchParams.has('error')){outcome='cancelled';throw Error();}
  const code=url.searchParams.get('code');if(!code||code.length>5000)throw Error();
  const token=await microsoftToken(config,{grant_type:'authorization_code',code,code_verifier:flow.verifier});
  const profile=await microsoftGraph(token.access_token,'/me?$select=id,mail,userPrincipalName');
  let id;try{id=verifyMicrosoftMailbox(profile);}catch{outcome='mailbox';throw Error();}
  if(!token.refresh_token)throw Error();
  const now=new Date().toISOString();const {error}=await ctx.admin.from('commercial_microsoft_connection').upsert({id:'primary',mailbox:MS_MAILBOX,microsoft_user_id:id,tokens:sealMicrosoft({access_token:token.access_token,refresh_token:token.refresh_token},config.key,'tokens'),expires_at:new Date(Date.now()+token.expires_in*1000).toISOString(),connected_by:ctx.user.id,connected_at:now,updated_at:now,lease_id:null,lease_until:null});
  if(error)throw Error();outcome='connected';
 }catch{/* Codes, token responses and Microsoft error descriptions must never enter logs or redirects. */}
 const response=NextResponse.redirect(`${MS_ORIGIN}/portal/marketing?microsoft=${outcome}`,303);response.cookies.set(MS_COOKIE,'',{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:0});response.headers.set('Cache-Control','private, no-store');response.headers.set('Referrer-Policy','no-referrer');return response;
}
