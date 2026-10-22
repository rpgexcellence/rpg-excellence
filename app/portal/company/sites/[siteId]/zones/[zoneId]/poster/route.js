import {loadZonePPE} from '../../../../../../../../lib/zone-ppe';
import {ppeScopeText} from '../../../../../../../../lib/ppe-engine.mjs';
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
 const derivedPPE=await loadZonePPE(admin,zone,site);
 if(derivedPPE.needsReview)return new Response('Assessment-derived PPE changed or needs review. Review the zone and publish a new poster revision.',{status:409});
 const ppeRequirements=zone.ppe_source_mode==='assessment'?[...(zone.ppe_snapshot?.requirements||[])].sort((a,b)=>Number(b.scope==='zone')-Number(a.scope==='zone')):[];
 const signs=zone.safety_signs||[],sourceIds=signs.map(s=>s.assessment_id).filter(Boolean);
 const sources=sourceIds.length?unwrap(await admin.from('hs_risk_assessments').select('id,status,version').eq('organization_id',zone.organization_id).eq('administration_location_id',siteId).in('id',sourceIds)):[];
 if(signsNeedReview(zone,sources,siteToday(site.timezone)))return new Response('Review and confirm the safety signs and current assessment links before generating a new poster.',{status:409});
 let url;try{url=zoneUrl(zone.public_token);}catch(e){return new Response(e.message,{status:409});}
 const posterQuery=new URL(request.url).searchParams;
 const size=posterQuery.get('size')||'A4';
 if(!['A4','A3'].includes(size))return new Response('Choose A4 or A3.',{status:400});
 const pdf=await PDFDocument.create();pdf.setTitle(`${clean(zone.reference)} - ${clean(zone.name)}`);pdf.setAuthor('RPG Excellence');
 const regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const navy=rgb(.025,.12,.23),teal=rgb(0,.61,.68),white=rgb(1,1,1),grey=rgb(.31,.40,.48),pale=rgb(.94,.98,.99),red=rgb(.72,.12,.10),yellow=rgb(1,.77,.03),border=rgb(.78,.87,.90);
 const W=595.28,H=841.89,left=30,contentWidth=322,right=370,rightWidth=195,bottom=115;
 let page,y;const pages=[];
 const draw=(text,x,baseline,fontSize=12,font=regular,color=navy)=>page.drawText(clean(text),{x,y:baseline,size:fontSize,font,color});
 const lines=(text,maxWidth,fontSize,font=regular)=>{
  const result=[];let line='';for(const word of clean(text).split(' ')){
   if(!word)continue;const candidate=line?line+' '+word:word;
   if(font.widthOfTextAtSize(candidate,fontSize)<=maxWidth){line=candidate;continue;}
   if(line)result.push(line);line='';
   for(const char of word){if(font.widthOfTextAtSize(line+char,fontSize)>maxWidth){result.push(line);line=char;}else line+=char;}
  }if(line)result.push(line);return result;
 };
 const fit=(text,width,start,min=8)=>{let size=start;while(bold.widthOfTextAtSize(clean(text),size)>width&&size>min)size-=.5;return size;};
 const qr=await pdf.embedPng(await QRCode.toBuffer(url,{width:1000,margin:4,errorCorrectionLevel:'M'}));
 let photo,logo;
 try{photo=await pdf.embedPng(await readFile(path.join(process.cwd(),'public/hs-journey/identify.png')));}catch{}
 try{logo=await pdf.embedPng(await readFile(path.join(process.cwd(),'public/rpg-excellence-logo.png')));}catch{}
 const sidebar=()=>{
  page.drawRectangle({x:right,y:bottom,width:rightWidth,height:y-bottom+6,color:pale,borderColor:border,borderWidth:.7});
  let sy=y-17;
  draw('ONE CONNECTION',right+14,sy,13,bold,teal);sy-=24;
  page.drawRectangle({x:right+12,y:sy-169,width:171,height:171,color:white,borderColor:teal,borderWidth:1.5});
  page.drawImage(qr,{x:right+16,y:sy-165,width:163,height:163});sy-=190;
  draw('SCAN HERE',right+14,sy,22,bold);sy-=19;
  for(const l of lines('Open your phone camera and scan the code.',167,10.5)){draw(l,right+14,sy,10.5);sy-=14;}sy-=9;
  for(const label of [zone.show_inspections?'Workplace inspections':null,zone.show_assessments?'Approved risk assessments':null,'Area safety information','Report an incident or concern'].filter(Boolean)){
   draw('>',right+14,sy,11,bold,teal);for(const l of lines(label,149,10,bold)){draw(l,right+28,sy,10,bold);sy-=14;}sy-=5;
  }
  const accessLines=lines(zone.access_mode==='company'?'Company sign-in required.':'Published area information.',167,9);
  for(const l of accessLines){draw(l,right+14,sy,9,regular,grey);sy-=12;}
  sy-=9;for(const l of lines(url,167,7)){draw(l,right+14,sy,7,regular,grey);sy-=10;}
 };
 const newPage=(first=false)=>{
  page=pdf.addPage([W,H]);pages.push(page);
  page.drawRectangle({x:0,y:H-7,width:W,height:7,color:yellow});
  const headerBottom=first?654:683,headerHeight=H-7-headerBottom;
  page.drawRectangle({x:0,y:headerBottom,width:W,height:headerHeight,color:navy});
  // Keep the entire graphic visible at its original colours on every sheet.
  // The solid text panel is separate, so no tint or text covers the photo.
  const textWidth=255;
  if(photo){
   const photoLeft=305,photoWidth=W-photoLeft;
   const scale=Math.min(photoWidth/photo.width,headerHeight/photo.height);
   const imageWidth=photo.width*scale,imageHeight=photo.height*scale;
   page.drawRectangle({x:photoLeft,y:headerBottom,width:photoWidth,height:headerHeight,color:white});
   page.drawImage(photo,{x:photoLeft+(photoWidth-imageWidth)/2,y:headerBottom+(headerHeight-imageHeight)/2,width:imageWidth,height:imageHeight});
  }
  if(logo){page.drawRectangle({x:left,y:785,width:155,height:36,color:white});const scale=Math.min(139/logo.width,28/logo.height);page.drawImage(logo,{x:left+8,y:789,width:logo.width*scale,height:logo.height*scale});}else draw('RPG EXCELLENCE',left,797,19,bold,white);
  draw('MY WORK AREA',195,799,8,bold,white);
  const refSize=fit(zone.reference,textWidth,first?57:34,10);draw(zone.reference,left,first?738:739,refSize,bold,white);
  let nameSize=first?23:17;while(lines(zone.name,textWidth,nameSize,bold).length>(first?2:1)&&nameSize>8)nameSize-=.5;
  let ny=first?701:713;for(const l of lines(zone.name,textWidth,nameSize,bold)){draw(l,left,ny,nameSize,bold,white);ny-=nameSize+4;}
  page.drawRectangle({x:left,y:headerBottom+12,width:58,height:4,color:teal});
  let locationY=headerBottom-18;
  for(const l of lines(`${site.site_name}${zone.floor_level?' / '+zone.floor_level:''}`,535,9.5)){draw(l,left,locationY,9.5,regular,grey);locationY-=13;}
  const sloganY=locationY-20;
  draw('Your area. Your safety.',left,sloganY,25,bold);
  draw('One connection.',left,sloganY-26,24,bold,teal);
  y=sloganY-53;
  sidebar();
 };
 const ensure=height=>{if(y-height<bottom)newPage();};
 const section=(text,title,color=navy,icon=null)=>{
  if(!clean(text))return;
  const body=lines(text,contentWidth-24,11),headerHeight=icon?61:40;let index=0,part=0;
  while(index<body.length){ensure(headerHeight+36);const capacity=Math.max(1,Math.floor((y-bottom-headerHeight-5)/15)),chunk=body.slice(index,index+capacity),height=headerHeight+chunk.length*15;
   page.drawRectangle({x:left,y:y-height,width:contentWidth,height,color:color===red?rgb(1,.96,.95):pale,borderColor:border,borderWidth:.7});
   page.drawRectangle({x:left,y:y-height,width:3,height,color:color===red?red:teal});
   if(icon)page.drawImage(icon,{x:left+12,y:y-49,width:34,height:34});
   draw(title+(part?' / CONTINUED':''),left+(icon?54:12),y-23,fit(title+(part?' / CONTINUED':''),contentWidth-(icon?66:24),11),bold,color);
   let ty=y-headerHeight+1;for(const l of chunk){draw(l,left+12,ty,11,regular,color);ty-=15;}
   y-=height+12;index+=chunk.length;part++;
  }
 };
 newPage(true);
 section(zone.restriction,'RESTRICTIONS / URGENT INSTRUCTIONS',red);
 for(const sign of signs){const def=signDefinition(sign.code);if(!def)continue;
  const textWidth=contentWidth-87,title=lines(def.title,textWidth,12,bold),scope=lines(signScopeText(sign),textWidth,9.5),instruction=lines(sign.instruction,textWidth,10.5);
  const height=Math.max(82,20+title.length*15+scope.length*12+instruction.length*14+10);
  ensure(height+12);const top=y;
  page.drawRectangle({x:left,y:top-height,width:contentWidth,height,borderColor:border,borderWidth:.7,color:pale});
  const icon=await pdf.embedPng(Buffer.from(def.png,'base64'));page.drawImage(icon,{x:left+10,y:top-67,width:56,height:56});
  let ty=top-19;for(const l of title){draw(l,left+77,ty,12,bold);ty-=15;}for(const l of scope){draw(l,left+77,ty,9.5,bold,grey);ty-=12;}ty-=4;for(const l of instruction){draw(l,left+77,ty,10.5);ty-=14;}y=top-height-12;
 }
 for(const requirement of ppeRequirements){const def=signDefinition(requirement.code);if(!def)continue;const icon=await pdf.embedPng(Buffer.from(def.png,'base64'));const refs=[...new Set((requirement.sources||[]).map(source=>`${source.reference||'RA'} v${source.version}`))];section(`${ppeScopeText(requirement)}. Specification: ${requirement.specification}. ${requirement.instruction}${requirement.limitations?' Limitations: '+requirement.limitations:''}. Sources: ${refs.join('; ')}.`,def.title,navy,icon);}
 section(zone.key_controls,'PPE & KEY CONTROLS');
 section(zone.emergency_information,'EMERGENCY INFORMATION');
 if(!signs.length&&!ppeRequirements.length&&!zone.key_controls)section('Confirm applicable approved task controls with the area owner before starting work.','BEFORE WORK STARTS');
 for(let i=0;i<pages.length;i++){
  page=pages[i];page.drawRectangle({x:0,y:0,width:W,height:95,color:navy});page.drawRectangle({x:0,y:91,width:W,height:4,color:teal});
  draw('See an issue? Report it here.',left,68,21,bold,white);
  draw('Scan to report. No sign-in required.',left,51,10,regular,white);
  draw('For immediate danger, follow site emergency procedures.',left,36,9,regular,white);
  draw(`Rev ${zone.poster_revision||1} | Issued ${new Date().toISOString().slice(0,10)} | Sheet ${i+1} of ${pages.length}`,left,16,8,bold,white);
  const review=((signs.length||ppeRequirements.length||zone.ppe_source_mode==='assessment')?`Review by ${zone.signs_review_date}. `:'')+(pages.length>1?'Display all sheets.':'Replace outdated copies.');draw(review,307,16,fit(review,258,8,6),regular,white);
  if(size==='A3')page.scale(Math.SQRT2,Math.SQRT2);
 }
 const bytes=await pdf.save();const filename=clean(zone.reference).replace(/[^A-Za-z0-9_-]/g,'_')||'zone';
 return new Response(Buffer.from(bytes),{headers:{'Content-Type':'application/pdf','Content-Disposition':`${posterQuery.get('inline')==='1'?'inline':'attachment'}; filename="RPG-${filename}-rev${zone.poster_revision||1}-${size}-poster.pdf"`,'Cache-Control':'private, no-store'}});
}
