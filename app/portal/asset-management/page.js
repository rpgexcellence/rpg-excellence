import Link from "next/link";
import { requireAssetAccess, loadAssetRows } from "../../../lib/asset-management";
import { assetDashboard, assetLink, assetName, assetWords } from "../../../lib/asset-dashboard";
import { createAdminClient } from "../../../lib/supabase/admin";
import styles from "./asset-management.module.css";
import { loadAssetAssurance } from "../../../lib/asset-assurance";
import { assetAssurance, assuranceOpen } from "../../../lib/asset-assurance-model";
import { linkAssetAssurance } from "./assurance-actions";
export const metadata = { title: "Asset Management Dashboard | RPG Excellence" };
export const dynamic = "force-dynamic";
const ROOT="/portal/asset-management";
const dayLabel = value => value ? new Date(`${value}T12:00:00Z`).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) : "Not set";
function Icon({type}) {
 const paths={box:<><path d="m3 7 9-5 9 5v10l-9 5-9-5Z"/><path d="m3 7 9 5 9-5M12 12v10"/></>,layers:<><path d="m2 7 10-5 10 5-10 5ZM2 12l10 5 10-5M2 17l10 5 10-5"/></>,alert:<><path d="M12 3 2 21h20Z"/><path d="M12 9v5M12 17v1"/></>,calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6M17 2v6M3 11h18"/></>,tools:<><path d="m14 6 4-4 1 5 3 2-5 4L7 23l-5-5L13 8Z"/><path d="m3 3 4 1 2 4-3 3-4-4Z"/></>,missing:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6M17 2v6M3 11h18M10 14l4 4M14 14l-4 4"/></>,people:<><circle cx="9" cy="7" r="3"/><path d="M3 21v-5a6 6 0 0 1 12 0v5ZM17 4a3 3 0 0 1 0 6M18 13a5 5 0 0 1 4 5v3"/></>};
 return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[type]||paths.box}</svg>;
}
export default async function AssetDashboardPage({ searchParams }) {
 const query=await searchParams || {};
 const access=await requireAssetAccess(), {organization,canWrite}=access;
 const admin=createAdminClient();
 const [assets,maintenance,people]=await Promise.all([
  loadAssetRows(admin,"organization_assets",organization.id),
  loadAssetRows(admin,"organization_asset_maintenance",organization.id),
  loadAssetRows(admin,"organization_people",organization.id,"id,first_name,last_name,email"),
 ]);
 const d=assetDashboard(assets,maintenance,people,query);
 const source=await loadAssetAssurance(access,maintenance);
 const assurance=assetAssurance(d,source);
 const uniqueCount=rows=>new Set(rows.map(r=>r.source_id)).size;
 const assuranceTiles=[
  ['Open audit NCs',source.canFindings && source.linksReady ? uniqueCount(assurance.openFindings) : '—',source.canFindings ? (source.linksReady ? `${uniqueCount(assurance.overdueFindings)} past target date` : 'Link setup required') : 'Audit-owner access required','#assurance-records'],
  ['Open CAPA / 8D',source.canCapa && source.linksReady ? uniqueCount(assurance.openCases) : '—',source.canCapa ? (source.linksReady ? `${uniqueCount(assurance.overdueCases)} overdue · ${uniqueCount(assurance.awaitingVerification)} at effectiveness review` : 'Link setup required') : 'Source access required','#assurance-records'],
  ['Open asset MOCs',source.canMoc ? uniqueCount(assurance.openMocs) : '—',source.canMoc ? `${uniqueCount(assurance.awaitingApproval)} at approval · ${uniqueCount(assurance.mocVerification)} at verification` : 'Risk Management access required','#assurance-records'],
  ['Calibration overdue',d.calibrationOverdue.length,`${d.calibrationDue.length} due in next ${d.filters.days} days · ${d.calibrationMissing.length} dates missing`,'#asset-calibration-schedule'],
  ['Examinations / inspections overdue',assurance.overdueInspections.length,`${assurance.upcomingInspections.length} scheduled in next ${d.filters.days} days`,'#asset-controls'],
  ['Critical assets needing attention',assurance.criticalAttention.length,`${assurance.critical.length} high / critical assets in this selection`,'#asset-interventions'],
 ];
 const register=(extra={})=>assetLink(`${ROOT}/register`,d.filters,extra);
 const work=(extra={})=>assetLink(`${ROOT}/maintenance`,d.filters,extra);
 const canManagePeople=Boolean(access.isOwner || (access.isCompanyAdministrator && access.permissions?.some(p=>p.module_key==='people_access' && p.access_level==='admin')));
 const delivery=[['Completed',d.completed.length,'teal'],['Planned',d.planned.length,'blue'],['Overdue',d.overdueRecords.length,'red']];
 const maxDelivery=Math.max(1,...delivery.map(([,value])=>value));
 const tickStep=Math.max(1,Math.ceil(maxDelivery/4));
 const chartMax=Math.ceil(maxDelivery/tickStep)*tickStep;
 const ticks=Array.from({length:Math.round(chartMax/tickStep)+1},(_,i)=>i*tickStep);
 const metricCards=[
  ['Total assets',d.filtered.length,'assets','gold',register(),'All controlled assets'],
  ['Active assets',d.active.length,'active','teal',register({focus:'active'}),'Operational assets'],
  ['PPM overdue',d.overdue.length,'overdue','red',register({focus:'overdue'}),'Recurring PPM past due'],
  [`Due in ${d.filters.days} days`,d.due.length,'due','gold',register({focus:'due'}),'Recurring PPM due soon'],
  ['Out of service',d.out.length,'unavailable','slate',register({focus:'out_of_service'}),'Unavailable assets'],
  ['Planned jobs',d.planned.length,'planned','teal',work(),`Scheduled in next ${d.filters.days} days`],
 ];
 return <main className={styles.page}>
  <header className={styles.hero}>
   <div className={styles.heroCopy}><span>CONTROL THROUGH EVIDENCE</span><h1>ASSET<br/>MANAGEMENT</h1><i aria-hidden="true"/><strong>RPG EXCELLENCE</strong></div>
   {canWrite && <Link className={styles.heroAction} href={`${ROOT}/new`}>＋ Create New Asset</Link>}
  </header>
  <form className={styles.filters} method="get" aria-label="Dashboard filters">
   <label><span>Site / location</span><select name="site" defaultValue={d.filters.site}><option value="">All sites</option>{d.sites.map(([value,text])=><option key={value} value={value}>{text}</option>)}</select></label>
   <label><span>Asset type</span><select name="type" defaultValue={d.filters.type}><option value="">All types</option>{d.types.map(type=><option key={type} value={type}>{assetWords(type)}</option>)}</select></label>
   <label><span>Accountable owner</span><select name="owner" defaultValue={d.filters.owner}><option value="">All owners</option>{d.owners.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
   <label><span>Maintenance window</span><select name="days" defaultValue={d.filters.days}>{[7,30,90].map(days=><option key={days} value={days}>Next {days} days</option>)}</select></label>
   <div className={styles.filterActions}><button type="submit">Apply</button><Link href={ROOT}>Reset</Link></div>
  </form>
  <p className={styles.recordNote}>Authorised company records · {dayLabel(d.today)} · Site, asset type and owner filters apply across the dashboard.</p>
  <section className={styles.metrics} aria-label="Asset summary">{metricCards.map(([name,value,photo,tone,href,note])=><Link key={name} href={href} className={`${styles.metric} ${styles[tone]}`} style={{backgroundImage:`linear-gradient(90deg,rgba(6,30,49,.95),rgba(6,30,49,.42)),url('/images/asset-management/${photo}.png')`}}><span>{name}</span><strong>{value}</strong><small>{note}</small></Link>)}</section>
  {d.missing.length>0 && <Link className={styles.warning} href={register({focus:'missing'})}>{d.missing.length} active PPM {d.missing.length===1?'asset has':'assets have'} no next due date. Review maintenance dates →</Link>}
  <div className={styles.chartGrid}>
   <section className={styles.panel} aria-labelledby="asset-delivery-heading"><div className={styles.panelHeading}><h2 id="asset-delivery-heading">Maintenance delivery</h2><Link href={work()}>Explore →</Link></div><p>Recorded work within the selected window.</p>
    <svg className={styles.deliveryChart} viewBox="0 0 560 245" role="img" aria-labelledby="asset-delivery-chart-title asset-delivery-chart-desc"><title id="asset-delivery-chart-title">Maintenance delivery counts</title><desc id="asset-delivery-chart-desc">{delivery.map(([name,count])=>`${name}: ${count}`).join('. ')}. Completed in the past {d.filters.days} days; planned in the next {d.filters.days} days; overdue is all open planned work before today.</desc>
     {ticks.map(value=>{const y=190-value/chartMax*150;return <g key={value}><line x1="48" y1={y} x2="535" y2={y} stroke="#dbe4eb"/><text x="35" y={y+4} textAnchor="end" fontSize="12" fill="#5f7387">{value}</text></g>})}
     <line x1="48" y1="30" x2="48" y2="190" stroke="#7c91a3"/><line x1="48" y1="190" x2="535" y2="190" stroke="#7c91a3"/>
     {delivery.map(([name,count,tone],index)=>{const x=100+index*155,height=count/chartMax*150;return <g key={name}><rect x={x} y={190-height} width="80" height={height} fill={tone==='teal'?'#159a9c':tone==='red'?'#c83e4b':'#123b55'}/><text x={x+40} y={Math.max(24,181-height)} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#13364e">{count}</text><text x={x+40} y="218" textAnchor="middle" fontSize="12" fill="#173a54">{name}</text></g>})}
     <text x="14" y="112" transform="rotate(-90 14 112)" textAnchor="middle" fontSize="11" fill="#5f7387">Count</text>
    </svg>
    <p className={styles.chartNote}>Completed: past {d.filters.days} days · Planned: next {d.filters.days} days · Overdue: all open planned work before today.</p>
   </section>
   <section className={styles.panel} aria-labelledby="asset-portfolio-heading"><div className={styles.panelHeading}><h2 id="asset-portfolio-heading">Asset portfolio</h2><Link href={register()}>View register →</Link></div><p>Distribution of assets in the current selection.</p>
    <div className={styles.portfolio}>{d.portfolio.map(([type,count])=><Link key={type} href={assetLink(`${ROOT}/register`,d.filters,{type})}><span>{assetWords(type)}</span><div role="img" aria-label={`${assetWords(type)}: ${count} assets`}><i style={{width:`${d.filtered.length?count/d.filtered.length*100:0}%`}}/></div><strong>{count}</strong></Link>)}</div>
    {d.portfolio.length>0 ? <div className={styles.axis}><span>0</span><span>{d.filtered.length} assets</span></div> : <p className={styles.empty}>No assets match these filters.</p>}
    <div className={styles.portfolioFooter}><Link href={register({focus:'active'})}>Active <b>{d.active.length}</b></Link><Link href={register({focus:'out_of_service'})}>Out of service <b>{d.out.length}</b></Link><Link href={register({status:'retired'})}>Retired <b>{d.filtered.filter(a=>a.operational_status==='retired').length}</b></Link></div>
   </section>
  </div>

  <section id="asset-assurance" className={styles.assuranceSection} aria-labelledby="assurance-heading">
   <div className={styles.panelHeading}><h2 id="assurance-heading">Asset assurance &amp; business exposure</h2></div>
   <p className={styles.assuranceIntro}>Live source status for the selected sites, asset types and accountable owners. NC, CAPA and MOC counts cover all open linked records, regardless of maintenance window. Counts include only records you can access.</p>
   {source.issues.map(message=><p key={message} role="status" className={styles.warning}>{message}</p>)}
   {query.assurance_error && <p role="alert" className={styles.warning}>{String(query.assurance_error).slice(0,250)}</p>}
   {query.assurance_saved==='1' && <p role="status" className={styles.success}>Asset link saved. The source record keeps its existing owner, approvals and closure workflow.</p>}
   <div className={styles.assuranceMetrics}>{assuranceTiles.map(([name,count,note,href])=><a key={name} href={href} className={styles.assuranceMetric}><span>{name}</span><strong>{count}</strong><small>{note}</small></a>)}</div>
   <div className={styles.exposureStrip}><span><b>{assurance.defects.length}</b> open repair / breakdown jobs</span><span><b>{source.canMoc?uniqueCount(assurance.overdueMocs):'—'}</b> {source.canMoc?'MOCs past target date':'MOC count unavailable'}</span><span><b>{source.canCapa && source.linksReady && source.actionsReady ? new Set(assurance.overdueActions.map(r=>r.id)).size : '—'}</b> overdue corrective-action tasks</span><span>Operational status and source approvals remain separate controls.</span></div>
   {access.canWrite && source.linksReady && (source.canLinkFindings || source.canLinkCases) && <details className={styles.linkDetails}><summary>Link an existing NC or CAPA / 8D case to an asset</summary><p>Choose a controlled source record. Linking does not create a new finding, grant source access or change its status. MOCs use their existing affected-asset field.</p><form action={linkAssetAssurance} className={styles.linkForm}>
    <label>Asset in this selection<select name="asset_id" required defaultValue=""><option value="" disabled>Select an asset</option>{d.filtered.map(a=><option key={a.id} value={a.id}>{a.asset_reference} — {a.asset_name}</option>)}</select></label>
    <label>Controlled source record<select name="source" required defaultValue=""><option value="" disabled>Select an NC or case</option>{source.canLinkFindings && <optgroup label="Internal audit nonconformities">{source.findingOptions.map(r=><option key={r.id} value={`finding:${r.id}`}>{r.reference} — {r.title} ({assetWords(r.status)})</option>)}</optgroup>}{source.canLinkCases && <optgroup label="CAPA / 8D cases">{source.caseOptions.map(r=><option key={r.id} value={`case:${r.id}`}>{r.reference} — {r.title} ({assetWords(r.status)})</option>)}</optgroup>}</select></label><button type="submit" disabled={!d.filtered.length}>Save asset link</button>
   </form></details>}
   <section id="asset-interventions" className={styles.panel} aria-labelledby="intervention-heading"><div className={styles.panelHeading}><h2 id="intervention-heading">Assets requiring intervention</h2><span className={styles.badge}>{assurance.interventions.length} assets</span></div><p>One row per asset. Overdue work is prioritised, followed by high / critical asset exposure. This is an attention list, not a declaration of fitness for service.</p>
    <div className={styles.tableScroll}><table><thead><tr><th>Asset / site</th><th>Criticality</th><th>Accountable owner</th><th>Attention required</th><th>Review</th></tr></thead><tbody>{assurance.interventions.map(item=><tr key={item.asset.id}><td><Link href={register({q:item.asset.asset_reference})}>{item.asset.asset_reference} — {item.asset.asset_name}</Link><small>{item.asset.site_location_label||'Unassigned site'}</small></td><td>{assetWords(item.asset.criticality)}</td><td>{assetName(d.peopleById.get(item.asset.asset_owner_person_id))}</td><td><div className={styles.reasonList}>{item.reasons.map(reason=><span className={`${styles.badge} ${item.overdue?styles.red:styles.amber}`} key={reason}>{reason}</span>)}</div></td><td><Link href={work({q:item.asset.asset_reference})}>Asset &amp; maintenance →</Link>{item.links.map(link=><small key={link.href}><Link href={link.href}>{link.reason} →</Link></small>)}</td></tr>)}</tbody></table>{!assurance.interventions.length && <p className={styles.empty}>No intervention items were found in the records available to you.</p>}</div>
   </section>
   <section id="asset-calibration-schedule" className={styles.panel} aria-labelledby="calibration-schedule-heading"><div className={styles.panelHeading}><h2 id="calibration-schedule-heading">Calibration schedule &amp; result review</h2></div><p>Independent of PPM. Due-date counts exclude retired assets. Due dates do not constitute approval for use. Certificate and historical records are available through each asset's maintenance history.</p><div className={styles.tableScroll}><table><thead><tr><th>Asset</th><th>Last calibration</th><th>Next calibration</th><th>Recorded result</th><th>Review</th></tr></thead><tbody>{d.filtered.filter(a=>a.calibration_required||['out_of_tolerance','conditional'].includes(a.calibration_result)).map(a=><tr key={a.id}><td><Link href={register({q:a.asset_reference})}>{a.asset_reference} — {a.asset_name}</Link></td><td>{dayLabel(a.last_calibration_date)}</td><td>{a.calibration_required?dayLabel(a.next_calibration_date):'Not currently required'}</td><td>{assetWords(a.calibration_result||'not_assessed')}</td><td><Link href={work({q:a.asset_reference})}>Records / certificate →</Link></td></tr>)}</tbody></table>{!d.filtered.some(a=>a.calibration_required||['out_of_tolerance','conditional'].includes(a.calibration_result))&&<p className={styles.empty}>No calibration-required or result-review assets in this selection.</p>}</div></section>
   <section id="asset-controls" className={styles.panel} aria-labelledby="controls-heading"><div className={styles.panelHeading}><h2 id="controls-heading">Calibration, examinations &amp; defects</h2><Link href={work()}>Plan or record work →</Link></div><p>Open calibration, inspection, statutory, repair and breakdown jobs overdue or scheduled through {dayLabel(d.end)}. These are recorded jobs; absence of a job does not establish compliance or non-applicability.</p>
    <div className={styles.tableScroll}><table><thead><tr><th>Asset / job</th><th>Control type</th><th>Owner</th><th>Scheduled date</th><th>Status</th></tr></thead><tbody>{assurance.controlRows.map(r=>{const a=assurance.assets.get(r.asset_id);return <tr key={r.id}><td><Link href={`${work({q:a.asset_reference,record:r.id})}#maintenance-${encodeURIComponent(r.id)}`}>{a.asset_reference} — {a.asset_name}<small>{r.maintenance_reference}</small></Link></td><td>{assetWords(r.maintenance_type)}</td><td>{assetName(d.peopleById.get(r.responsible_person_id||a.maintenance_owner_person_id||a.asset_owner_person_id))}</td><td>{dayLabel(r.scheduled_date)}</td><td><span className={`${styles.badge} ${r.scheduled_date<d.today?styles.red:styles.blue}`}>{r.scheduled_date<d.today?'Overdue · ':''}{assetWords(r.status)}</span></td></tr>})}</tbody></table>{!assurance.controlRows.length && <p className={styles.empty}>No matching open control jobs. Add required work through Maintenance &amp; PPM.</p>}</div>
   </section>
   <section id="assurance-records" className={styles.panel} aria-labelledby="linked-heading"><div className={styles.panelHeading}><h2 id="linked-heading">Linked NCs, corrective actions &amp; changes</h2></div><p>Each row is an asset-to-source link; summary counts count each source record once. Closed records remain traceable. Audit NCs are currently limited to the audit owner's records; CAPA and MOC follow their own access rules.</p>
    <div className={styles.tableScroll}><table><thead><tr><th>Asset</th><th>Source / reference</th><th>Issue or change</th><th>Target date</th><th>Source status</th></tr></thead><tbody>{assurance.linkedRows.map(r=><tr key={`${r.kind}:${r.asset_id}:${r.source_id}`}><td><Link href={register({q:assurance.assets.get(r.asset_id).asset_reference})}>{assurance.assets.get(r.asset_id).asset_reference}</Link></td><td><Link href={r.href}>{r.reference||'Open record'}<small>{r.kind}</small></Link></td><td>{r.title}</td><td>{dayLabel(r.due)}</td><td><span className={`${styles.badge} ${assuranceOpen(r)&&r.due&&r.due<d.today?styles.red:styles.blue}`}>{assetWords(r.status)}</span>{r.capa_current_stage && <small>{assetWords(r.capa_current_stage)}</small>}</td></tr>)}</tbody></table>{!assurance.linkedRows.length && <p className={styles.empty}>{source.linksReady?'No linked source records are available in this selection. Link an existing NC or case above; select the affected asset on MOC records.':'NC / CAPA link setup is required. MOC links are shown where available.'}</p>}</div>
   </section>
   {assurance.overdueActions.length>0 && <section className={styles.panel} aria-labelledby="overdue-action-heading"><div className={styles.panelHeading}><h2 id="overdue-action-heading">Overdue corrective-action tasks</h2></div><p>Linked CAPA / 8D actions past their due date and not verified or cancelled. Task completion alone does not establish verified closure.</p><div className={styles.tableScroll}><table><thead><tr><th>Asset</th><th>Case</th><th>Action</th><th>Due date</th><th>Status</th></tr></thead><tbody>{assurance.overdueActions.map(r=><tr key={`${r.asset_id}:${r.id}`}><td>{assurance.assets.get(r.asset_id).asset_reference}</td><td><Link href={r.href}>{r.case_reference||'Open case'} →</Link></td><td>{r.action_description||r.description||r.action_required||'Open the controlled case to review this action'}</td><td>{dayLabel(r.due_date)}</td><td><span className={`${styles.badge} ${styles.red}`}>{assetWords(r.status)}</span></td></tr>)}</tbody></table></div></section>}
  </section>
  <section className={styles.panel} aria-labelledby="asset-maintenance-heading"><div className={styles.panelHeading}><h2 id="asset-maintenance-heading">Upcoming &amp; overdue maintenance</h2><Link href={work()}>Open Maintenance &amp; PPM →</Link></div><p>Scheduled jobs and recurring PPM shown together · {d.maintenanceAttention.length} matching items.</p>
   <div className={styles.tableScroll}><table><thead><tr><th>Asset / reference</th><th>Site</th><th>Maintenance owner</th><th>Scheduled date</th><th>Status</th></tr></thead><tbody>{d.maintenanceAttention.slice(0,10).map(item=>{const a=item.asset;const tone=item.status==='Overdue'?'red':item.status==='Planned'?'blue':'amber';return <tr key={item.key}><td><Link href={item.record ? `${work({q:a.asset_reference,record:item.record.id})}#maintenance-${encodeURIComponent(item.record.id)}` : register({q:a.asset_reference})}>{a.asset_name}<small>{a.asset_reference} · {item.record?.maintenance_reference || item.kind}</small></Link></td><td>{a.site_location_label||'Unassigned'}</td><td>{assetName(d.peopleById.get(item.ownerId))}</td><td>{dayLabel(item.due)}</td><td><span className={`${styles.badge} ${styles[tone]}`}>{item.status}</span></td></tr>})}</tbody></table>{!d.maintenanceAttention.length && <div className={styles.empty}><Icon type="calendar"/><strong>No scheduled maintenance or PPM attention items in this selection</strong><p>Try another site, owner or maintenance window.</p></div>}</div>
   <p className={styles.maintenanceNote}>Planned maintenance remains visible even when recurring PPM is not required.</p>
   {d.maintenanceAttention.length>10 && <p className={styles.chartNote}>Showing the first 10 of {d.maintenanceAttention.length} matching maintenance items. <Link href={work()}>View all maintenance →</Link></p>}
  </section>
  <nav className={styles.shortcuts} aria-label="Asset Management actions">{canWrite && <Link href={`${ROOT}/new`}>Create New Asset →</Link>}<Link href={register()}>Asset Register →</Link><Link href={work()}>Maintenance &amp; PPM →</Link></nav>
  <footer className={styles.footerNote}><span>Company-scoped records · Professional and above{!canWrite?' · Read-only access':''}</span>{canManagePeople && <Link href="/portal/company/people">People, Roles &amp; Access · Super Administrator allocation →</Link>}</footer>
 </main>;
}
