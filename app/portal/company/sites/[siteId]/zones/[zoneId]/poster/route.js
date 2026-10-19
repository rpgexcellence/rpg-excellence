import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import QRCode from 'qrcode';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {siteZoneContext,unwrap,zoneUrl} from '../../../../../../../../lib/site-zones';
import {UUID} from '../../../../../../../../lib/zone-policy.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
// ASCII normalization is intentional: the website retains the original Unicode labels.
const clean=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,' ').replace(/\s+/g,' ').trim();
export async function GET(request,{params}) {
 const {siteId,zoneId}=await params;
 if(!UUID.test(zoneId))return new Response('Zone not found',{status:404});
 const {admin,access,site}=await siteZoneContext(siteId);
 const zone=unwrap(await admin.from('organization_zones').select('*').eq('id',zoneId).eq('site_id',siteId).eq('organization_id',access.organization.id))[0];
 if(!zone)return new Response('Zone not found',{status:404});
 if(zone.status!=='published'||site.status!=='active')return new Response('Publish the zone at an active site before generating its poster.',{status:409});
 let url;try{url=zoneUrl(zone.public_token);}catch(e){return new Response(e.message,{status:409});}
 const size=new URL(request.url).searchParams.get('size')||'A4';
 if(!['A4','A3'].includes(size))return new Response('Choose A4 or A3.',{status:400});
 const pdf=await PDFDocument.create(),page=pdf.addPage([595.28,841.89]);
 pdf.setTitle(`${clean(zone.reference)} - ${clean(zone.name)}`);pdf.setAuthor('RPG Excellence');
 const regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const navy=rgb(.03,.14,.26),teal=rgb(0,.53,.60),white=rgb(1,1,1),grey=rgb(.32,.41,.48),pale=rgb(.94,.97,.98);
 const draw=(text,x,y,fontSize=12,font=regular,color=navy)=>page.drawText(clean(text),{x,y,size:fontSize,font,color});
 const lines=(text,maxWidth,fontSize,font=regular)=>{
  const result=[];let line='';for(const char of clean(text)){if(font.widthOfTextAtSize(line+char,fontSize)>maxWidth){result.push(line);line=char;}else line+=char;}if(line)result.push(line);return result;
 };
 page.drawRectangle({x:0,y:837,width:595.28,height:5,color:rgb(1,.79,.08)});
 page.drawRectangle({x:0,y:666,width:595.28,height:171,color:navy});
 try {const logo=await pdf.embedPng(await readFile(path.join(process.cwd(),'public/rpg-excellence-logo.png')));const factor=Math.min(180/logo.width,46/logo.height);page.drawRectangle({x:34,y:771,width:192,height:55,color:white});page.drawImage(logo,{x:40,y:775,width:logo.width*factor,height:logo.height*factor});}catch{draw('RPG EXCELLENCE',36,792,19,bold,white);}
 draw('MY WORK AREA',365,793,14,bold,white);
 let refSize=38;while(bold.widthOfTextAtSize(clean(zone.reference),refSize)>523&&refSize>14)refSize--;
 draw(zone.reference,36,737,refSize,bold,white);
 let nameSize=20;while(lines(zone.name,523,nameSize,bold).length>2&&nameSize>10)nameSize--;
 const nameLines=lines(zone.name,523,nameSize,bold);nameLines.forEach((line,i)=>draw(line,36,703-i*23,nameSize,bold,white));
 const siteLines=lines(`${site.site_name}${zone.floor_level?' / '+zone.floor_level:''}`,520,12);siteLines.slice(0,2).forEach((line,i)=>draw(line,36,642-i*15,12,regular,grey));
 draw('Your area. Your safety.',36,589,29,bold);
 draw('Scan for current workplace safety information.',36,560,15,regular,grey);
 const qr=await pdf.embedPng(await QRCode.toBuffer(url,{width:1000,margin:4,errorCorrectionLevel:'M'}));
 page.drawImage(qr,{x:177.64,y:300,width:240,height:240});
 draw('SCAN WITH YOUR PHONE CAMERA',143,285,14,bold,teal);
 draw(zone.access_mode==='company'?'Company sign-in required':'Published information available through this link',62,262,12,regular,grey);
 page.drawRectangle({x:36,y:150,width:523,height:91,color:pale});
 draw(zone.show_inspections?'Workplace inspections':'Area information',52,217,14,bold);draw(zone.show_assessments?'Risk assessments':'Local instructions',315,217,14,bold);
 draw('PPE & key controls',52,188,14,bold);draw('Emergency information',315,188,14,bold);
 draw('Report a concern through your company account.',52,164,11,regular,grey);
 lines(url,523,9).forEach((line,i)=>draw(line,36,130-i*12,9,regular,grey));
 page.drawRectangle({x:0,y:0,width:595.28,height:80,color:navy});
 draw('See an issue? Report it.',36,53,21,bold,white);
 draw('For immediate danger, follow site emergency procedures.',36,29,11,regular,white);
 if(size==='A3')page.scale(Math.SQRT2,Math.SQRT2);
 const bytes=await pdf.save();const filename=clean(zone.reference).replace(/[^A-Za-z0-9_-]/g,'_')||'zone';
 return new Response(Buffer.from(bytes),{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="RPG-${filename}-${size}-poster.pdf"`,'Cache-Control':'private, no-store'}});
}
