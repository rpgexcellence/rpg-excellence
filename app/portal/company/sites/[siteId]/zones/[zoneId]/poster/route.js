import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import QRCode from 'qrcode';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {siteZoneContext,unwrap,zoneUrl} from '../../../../../../../../lib/site-zones';
import {UUID,siteToday} from '../../../../../../../../lib/zone-policy.mjs';
import {signDefinition,signScopeText,signsNeedReview} from '../../../../../../../../lib/safety-signs.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const clean=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,' ').replace(/\s+/g,' ').trim();
export async function GET(request,{params}) {
 const {siteId,zoneId}=await params;
 if(!UUID.test(zoneId))return new Response('Zone not found',{status:404});
 const {admin,access,site}=await siteZoneContext(siteId);
 const zone=unwrap(await admin.from('organization_zones').select('*').eq('id',zoneId).eq('site_id',siteId).eq('organization_id',access.organization.id))[0];
 if(!zone)return new Response('Zone not found',{status:404});
 if(zone.status!=='published'||site.status!=='active')return new Response('Publish the zone at an active site before generating its poster.',{status:409});
 const signs=zone.safety_signs||[],sourceIds=signs.map(s=>s.assessment_id).filter(Boolean);
 const sources=sourceIds.length?unwrap(await admin.from('hs_risk_assessments').select('id,status,version').eq('organization_id',zone.organization_id).eq('administration_location_id',siteId).in('id',sourceIds)):[];
 if(signsNeedReview(zone,sources,siteToday(site.timezone)))return new Response('Review and confirm the safety signs and current assessment links before generating a new poster.',{status:409});
 let url;try{url=zoneUrl(zone.public_token);}catch(e){return new Response(e.message,{status:409});}
 const size=new URL(request.url).searchParams.get('size')||'A4';
 if(!['A4','A3'].includes(size))return new Response('Choose A4 or A3.',{status:400});
 const pdf=await PDFDocument.create();pdf.setTitle(`${clean(zone.reference)} - ${clean(zone.name)}`);pdf.setAuthor('RPG Excellence');
 const regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const navy=rgb(.03,.14,.26),teal=rgb(0,.53,.60),white=rgb(1,1,1),grey=rgb(.32,.41,.48),pale=rgb(.94,.97,.98),red=rgb(.70,.10,.08);
 let page,y;const pages=[];
 const draw=(text,x,baseline,fontSize=12,font=regular,color=navy)=>page.drawText(clean(text),{x,y:baseline,size:fontSize,font,color});
 const lines=(text,maxWidth,fontSize,font=regular)=>{
  const result=[];let line='';for(const word of clean(text).split(' ')){
   let candidate=line?line+' '+word:word;
   if(font.widthOfTextAtSize(candidate,fontSize)<=maxWidth){line=candidate;continue;}
   if(line)result.push(line);line='';
   for(const char of word){if(font.widthOfTextAtSize(line+char,fontSize)>maxWidth){result.push(line);line=char;}else line+=char;}
  }if(line)result.push(line);return result;
 };
 const newPage=(first=false)=>{
  page=pdf.addPage([595.28,841.89]);pages.push(page);
  page.drawRectangle({x:0,y:837,width:595.28,height:5,color:rgb(1,.79,.08)});
  page.drawRectangle({x:0,y:first?700:751,width:595.28,height:first?137:86,color:navy});
  draw(first?'MY WORK AREA':`${zone.reference} | AREA SAFETY INSTRUCTIONS`,36,first?793:797,first?15:16,bold,white);
  if(first){let r=38;while(bold.widthOfTextAtSize(clean(zone.reference),r)>523&&r>12)r--;draw(zone.reference,36,760,r,bold,white);let n=20;while(lines(zone.name,523,n,bold).length>2&&n>10)n--;lines(zone.name,523,n,bold).forEach((l,i)=>draw(l,36,728-i*23,n,bold,white));y=680;}else{lines(zone.name,523,13).slice(0,2).forEach((l,i)=>draw(l,36,776-i*15,13,regular,white));y=727;}
 };
 const ensure=height=>{if(y-height<100)newPage();};
 const paragraph=(text,title,color=navy)=>{
  if(!text)return;ensure(62);y-=6;draw(title,36,y,15,bold,color);y-=24;
  for(const line of lines(text,523,11)){ensure(15);draw(line,36,y,11,regular,color);y-=15;}y-=16;
 };
 newPage(true);
 try {const logo=await pdf.embedPng(await readFile(path.join(process.cwd(),'public/rpg-excellence-logo.png')));const factor=Math.min(180/logo.width,42/logo.height);page.drawRectangle({x:348,y:773,width:210,height:54,color:white});page.drawImage(logo,{x:357,y:779,width:logo.width*factor,height:logo.height*factor});}catch{draw('RPG EXCELLENCE',348,793,17,bold,white);}
 for(const line of lines(`${site.site_name}${zone.floor_level?' / '+zone.floor_level:''}`,350,11)){draw(line,36,y,11,regular,grey);y-=14;}
 y-=14;draw('Your area. Your safety.',36,y,25,bold);y-=27;
 for(const line of lines('Scan for live inspections, approved assessments and updates.',320,12)){draw(line,36,y,12,regular,grey);y-=16;}
 draw(zone.access_mode==='company'?'Company sign-in required':'Published information available through this link',36,y-12,10,regular,grey);
 const qr=await pdf.embedPng(await QRCode.toBuffer(url,{width:1000,margin:4,errorCorrectionLevel:'M'}));
 page.drawImage(qr,{x:410,y:530,width:145,height:145});
 let linkY=y-35;for(const line of lines(url,350,8)){draw(line,36,linkY,8,regular,grey);linkY-=11;}
 y=Math.min(linkY-25,510);
 paragraph(zone.restriction,'RESTRICTION / URGENT INSTRUCTION',red);
 if(signs.length){ensure(45);draw('AREA SIGNS & PPE REQUIREMENTS',36,y,15,bold);y-=27;}
 for(const sign of signs){const def=signDefinition(sign.code);if(!def)continue;
  const title=lines(def.title,430,13,bold),scope=lines(signScopeText(sign),430,10),instruction=lines(sign.instruction,430,11),height=Math.max(76,title.length*16+scope.length*13+instruction.length*15+25);
  ensure(height+12);const top=y;
  page.drawRectangle({x:36,y:top-height,width:523,height,borderColor:rgb(.78,.85,.89),borderWidth:1,color:pale});
  const icon=await pdf.embedPng(Buffer.from(def.png,'base64'));page.drawImage(icon,{x:46,y:top-70,width:58,height:58});
  let ty=top-20;for(const l of title){draw(l,118,ty,13,bold);ty-=16;}for(const l of scope){draw(l,118,ty,10,bold,grey);ty-=13;}ty-=3;for(const l of instruction){draw(l,118,ty,11);ty-=15;}y=top-height-12;
 }
 paragraph(zone.key_controls,'PPE & KEY CONTROLS');
 paragraph(zone.emergency_information,'EMERGENCY INFORMATION');
 if(!signs.length&&!zone.key_controls)paragraph('Confirm applicable approved task controls with the area owner before starting work.','BEFORE WORK STARTS');
 for(let i=0;i<pages.length;i++){page=pages[i];page.drawRectangle({x:0,y:0,width:595.28,height:80,color:navy});draw(`Revision ${zone.poster_revision||1} | Issued ${new Date().toISOString().slice(0,10)} | Sheet ${i+1} of ${pages.length}`,36,56,10,bold,white);draw((signs.length?`Review by ${zone.signs_review_date}. `:'')+(pages.length>1?'Display all sheets together.':'Replace outdated copies.'),36,38,11,regular,white);draw('For immediate danger, follow site emergency procedures.',36,20,10,regular,white);if(size==='A3')page.scale(Math.SQRT2,Math.SQRT2);}
 const bytes=await pdf.save();const filename=clean(zone.reference).replace(/[^A-Za-z0-9_-]/g,'_')||'zone';
 return new Response(Buffer.from(bytes),{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="RPG-${filename}-rev${zone.poster_revision||1}-${size}-poster.pdf"`,'Cache-Control':'private, no-store'}});
}
