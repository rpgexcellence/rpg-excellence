import {loadZonePPE} from '../../../../../../lib/zone-ppe';
import Link from 'next/link';
import QRCode from 'qrcode';
import ZoneSmallForm from '../../../../../../components/ZoneSmallForm';
import ZoneConnectionPanel from '../../../../../../components/ZoneConnectionPanel';
import {siteZoneContext,unwrap,zoneRoot,zoneUrl,loadZoneSafety,personName,displayDate} from '../../../../../../lib/site-zones';
import {siteToday} from '../../../../../../lib/zone-policy.mjs';
import {signsNeedReview} from '../../../../../../lib/safety-signs.mjs';
import {createBuilding} from '../../zones-actions';
import '../../zones.css';
export const dynamic='force-dynamic';
export const metadata={title:'Buildings & Zones | RPG Excellence'};
function Icon({kind}) {
 const paths={building:'M4 21V5h10v16M14 10h6v11M8 9h2M8 13h2M8 17h2M17 14h1M17 18h1M2 21h20',inspection:'M8 4H5v17h14V4h-3M9 2h6v4H9zM8 11h8M8 15h8',assessment:'M6 2h8l5 5v15H6zM14 2v6h5M9 13h7M9 17h7',restriction:'M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0M6.4 6.4l11.2 11.2',person:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-2a8 8 0 0 1 16 0v2',poster:'M5 2h14v20H5zM8 6h8M8 10h8M8 14h3M14 14h2M8 18h8'};
 return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind]||paths.building}/></svg>;
}
export default async function ZonesPage({params,searchParams}) {
 const {siteId}=await params,query=await searchParams||{},context=await siteZoneContext(siteId),{admin,site,access}=context,org=access.organization.id;
 const [buildings,zones,people]=(await Promise.all([
  admin.from('organization_buildings').select('*').eq('organization_id',org).eq('site_id',siteId).order('name'),
  admin.from('organization_zones').select('*').eq('organization_id',org).eq('site_id',siteId).order('reference'),
  admin.from('organization_people').select('id,first_name,last_name').eq('organization_id',org),
 ])).map(unwrap);
 const safety=await Promise.all(zones.map(z=>loadZoneSafety(admin,{...z,show_inspections:true,show_assessments:true})));
 const overview=new Map(zones.map((z,i)=>[z.id,safety[i]])),buildingNames=new Map(buildings.map(b=>[b.id,b.name])),owners=new Map(people.map(p=>[p.id,personName(p)]));
 const filter=query.building==='outdoor'||buildings.some(b=>b.id===query.building)?query.building:'all';
 const visible=zones.filter(z=>filter==='all'||(filter==='outdoor'?!z.building_id:z.building_id===filter));
 const selected=visible.find(z=>z.id===query.zone)||visible[0],root=zoneRoot(siteId),today=siteToday(site.timezone);
 const link=(building,zone)=>root+'?'+new URLSearchParams({building,...(zone?{zone}:{})}).toString();
 let url=null,qr=null,posterHref=null,blockedReason='';
 if(selected){
  try{url=zoneUrl(selected.public_token);qr=await QRCode.toDataURL(url,{width:360,margin:4,errorCorrectionLevel:'M'});}catch(e){blockedReason=e.message;}
  if(site.status!=='active')blockedReason='Activate this site before generating its zone posters.';
  else if(selected.status!=='published')blockedReason='Save your changes and publish this zone in Manage zone to generate its poster.';
  else if(signsNeedReview(selected,overview.get(selected.id).assessments,today)||(await loadZonePPE(admin,selected,site)).needsReview)blockedReason='Review the safety signs and current assessment links in Manage zone before generating a new poster.';
  if(url&&!blockedReason)posterHref=`${root}/${selected.id}/poster`;
 }
 return <main className="zone-page zone-register"><div className="zone-shell">
  <header className="zone-header"><div><small>ADMINISTRATION / SITE PROFILE / {site.site_name}</small><h1>Buildings &amp; Zones</h1><p>Connect each work area to its safety information.</p></div><div className="zone-buttons"><Link className="zone-link" href="/portal/company/sites">← Back to sites</Link>{site.status==='active'&&<Link className="zone-button" href={`${root}/new`}>+ Create zone</Link>}</div></header>
  {site.status!=='active'&&<p className="zone-restriction">This site is {site.status}. Employee zone pages are unavailable. Activate the site to create or publish zones.</p>}
  <div className="zr-site-strip"><Icon kind="building"/><strong>{site.site_name}</strong><span>{site.site_reference}</span><span>{zones.length} {zones.length===1?'zone':'zones'} · {buildings.length} {buildings.length===1?'building':'buildings'}</span>{site.status==='active'&&<Link href={link(filter,selected?.id)+'&addBuilding=1#zone-add-building'}>+ Add building</Link>}</div>
  <div className="zr-layout"><section aria-label="Site zones">
   <nav className="zr-filters" aria-label="Filter zones by building">{[{id:'all',name:'All locations'},...buildings,{id:'outdoor',name:'External / no building'}].map(b=><Link key={b.id} href={link(b.id)} aria-current={filter===b.id?'page':undefined}>{b.name}</Link>)}</nav>
   <p className="zr-results">{visible.length} {visible.length===1?'zone':'zones'} shown · Select a zone to preview its poster.</p>
   {visible.map(z=>{const data=overview.get(z.id),due=data.programmes.map(p=>p.next_inspection_date).filter(Boolean).sort()[0],inspectionText=data.actions.length?`${data.actions.length} ${data.actions.length===1?'action':'actions'} open`:due?`${due<today?'Overdue':'Due'} ${displayDate(due)}`:data.inspections.length?`${data.inspections.length} recorded`:'No inspections linked';
    return <article className={`zr-card${selected?.id===z.id?' is-selected':''}`} key={z.id}>
     <div className="zr-zone-identity"><div className="zr-badges"><span className="zr-badge">{z.reference}</span><span className={`zr-state zr-state-${z.status}`}>{z.status.replaceAll('_',' ')}</span></div><h2>{z.name}</h2><p>{buildingNames.get(z.building_id)||'External area / no building'}{z.floor_level?' · '+z.floor_level:''}</p><p className="zr-owner"><Icon kind="person"/>Area owner: {owners.get(z.owner_person_id)||'Not assigned'}</p></div>
     <div className="zr-zone-safety"><div className="zr-metrics"><div><Icon kind="inspection"/><span>Inspections<strong className={data.actions.length||due<today?'zr-attention':''}>{inspectionText}</strong></span></div><div><Icon kind="assessment"/><span>Risk assessments<strong>{data.assessments.length} approved / communicated</strong></span></div><div><Icon kind="restriction"/><span>Restrictions<strong className={z.restriction?'zr-attention':''}>{z.restriction?'Recorded':'None recorded'}</strong></span></div></div>
      {z.restriction&&<p className="zr-restriction"><Icon kind="restriction"/><span>{z.restriction}</span></p>}
      <div className="zone-buttons zr-card-actions">{z.status==='published'&&site.status==='active'&&<Link className="zone-link" href={`/area/${z.public_token}`}>View zone ↗</Link>}<Link className="zone-link" href={`${root}/${z.id}`}>Manage zone</Link><Link className={selected?.id===z.id?'zone-button':'zone-link'} href={link(filter,z.id)+'#zone-poster-panel'} aria-current={selected?.id===z.id?'true':undefined}><Icon kind="poster"/>Poster &amp; QR</Link></div>
     </div>
    </article>;
   })}
   {!visible.length&&<div className="zone-panel"><h2>{zones.length?'No zones in this location':'Create your first zone'}</h2><p>Add a workshop, laboratory, office or outdoor area. Save it as a draft, then link its safety records before publication.</p>{site.status==='active'&&<Link className="zone-button" href={`${root}/new`}>+ Create zone</Link>}</div>}
   <div className="zr-how"><strong>How it works</strong><span>Create zone → Link records → Publish page → Print poster</span></div>
   {site.status==='active'&&<details className="zr-add-building" id="zone-add-building" open={query.addBuilding==='1'}><summary><Icon kind="building"/>Add building</summary><p>Group zones within this site. External areas do not need a building.</p><ZoneSmallForm action={createBuilding} label="+ Add building"><input type="hidden" name="site_id" value={siteId}/><label>Building name *<input name="name" required maxLength={120}/></label></ZoneSmallForm></details>}
  </section><aside id="zone-poster-panel" className="zr-poster-aside">{selected?<ZoneConnectionPanel key={selected.id} name={selected.name} reference={selected.reference} url={url} qr={qr} posterHref={posterHref} blockedReason={blockedReason} revision={selected.poster_revision||1} employeeHref={selected.status==='archived'?null:`/area/${selected.public_token}${selected.status==='published'&&site.status==='active'?'':'?preview=1'}`}/>:<div className="zone-connection-panel zr-empty-preview"><Icon kind="poster"/><h2>Your zone poster</h2><p>Select or create a zone to see its permanent connection and poster here.</p></div>}</aside></div>
 </div></main>;
}
