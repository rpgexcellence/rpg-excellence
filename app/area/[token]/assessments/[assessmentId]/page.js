import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requireZonePage,unwrap,displayDate} from '../../../../../lib/site-zones';
import {UUID,readableAssessment,assessmentDue,siteToday} from '../../../../../lib/zone-policy.mjs';
import '../../../../portal/company/sites/zones.css';
export const dynamic='force-dynamic';
export const metadata={title:'Area risk assessment | RPG Excellence',robots:{index:false,follow:false}};
export default async function AreaAssessment({params,searchParams}) {
 const {token,assessmentId}=await params,query=await searchParams;
 const {admin,zone,site,preview}=await requireZonePage(token,query?.preview==='1');
 if(!zone.show_assessments||!UUID.test(assessmentId))notFound();
 const links=unwrap(await admin.from('organization_zone_assessments').select('assessment_id').eq('zone_id',zone.id).eq('assessment_id',assessmentId));
 if(!links.length)notFound();
 const assessments=unwrap(await admin.from('hs_risk_assessments').select('id,title,assessment_reference,status,version,review_date').eq('id',assessmentId).eq('organization_id',zone.organization_id).eq('administration_location_id',zone.site_id));
 const a=assessments[0];if(!a||!readableAssessment(a))notFound();
 const hazards=unwrap(await admin.from('hs_risk_hazards').select('id,hazard_description,existing_controls,display_order').eq('assessment_id',a.id).eq('organization_id',zone.organization_id).order('display_order'));
 return <main className="zone-page"><div className="zone-employee"><header className="zone-brand">RPG EXCELLENCE · MY WORK AREA</header><Link href={`/area/${token}${preview?'?preview=1':''}`}>← {zone.reference}</Link><h1>Risk assessment</h1><h2>{a.title}</h2><p>{a.assessment_reference} · Version {a.version} · {a.status}<br/>Review {displayDate(a.review_date)}</p>{assessmentDue(a,siteToday(site.timezone))&&<p className="zone-restriction">Review is due. Confirm continued applicability with the area owner before work proceeds.</p>}<p className="zone-notice">Employee view of the approved record: hazards and existing controls. This page does not confirm additional actions are implemented. Confirm the full task requirements with the area owner.</p>{hazards.map(h=><section className="zone-panel" key={h.id}><h2>Hazard</h2><p className="zone-pre">{h.hazard_description||'Not recorded'}</p><h3>Existing controls</h3><p className="zone-pre">{h.existing_controls||'Not recorded. Contact the area owner.'}</p></section>)}{!hazards.length&&<p>No hazard details recorded. Contact the area owner.</p>}<small>Private attachments, personal details and action records are not published through this page.</small></div></main>;
}
