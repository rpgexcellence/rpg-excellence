import Link from 'next/link';
import {redirect,notFound} from 'next/navigation';
import ZoneSmallForm from '../../../../components/ZoneSmallForm';
import {requireZonePage} from '../../../../lib/site-zones';
import {reportZoneConcern} from './actions';
import '../../../portal/company/sites/zones.css';
export const dynamic='force-dynamic';
export const metadata={title:'Report an area concern | RPG Excellence',robots:{index:false,follow:false}};
export default async function ConcernPage({params}) {
 const {token}=await params;const {zone,access}=await requireZonePage(token);
 if(!access.user)redirect('/portal/login?next='+encodeURIComponent(`/area/${token}/concerns`));
 if(access.organization?.id!==zone.organization_id)notFound();
 return <main className="zone-page"><div className="zone-employee"><header className="zone-brand">RPG EXCELLENCE · MY WORK AREA</header><Link href={`/area/${token}`}>← {zone.reference}</Link><h1>Report a concern</h1><h2>{zone.name}</h2><p className="zone-restriction">For immediate danger, follow site emergency procedures and contact your supervisor directly.</p><section className="zone-panel"><ZoneSmallForm action={reportZoneConcern} label="Submit concern"><input type="hidden" name="token" value={token}/><label>What have you noticed?<textarea name="description" required minLength={10} maxLength={3000} placeholder="Describe the location, condition and any immediate action taken. Avoid unnecessary personal information."/></label><p>Your report is associated with your company account and visible to company administrators. It is not anonymous. Photos and automatic notifications are not included in this release.</p></ZoneSmallForm></section></div></main>;
}
