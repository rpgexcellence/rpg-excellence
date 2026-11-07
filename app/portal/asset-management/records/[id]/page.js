import Link from "next/link";
import { requireAssetRecord, recordAssetAccess, recordPath, evidencePath } from "../../../../../lib/asset-record";
import { loadAssetRows } from "../../../../../lib/asset-management";
import { getOrganizationAccess } from "../../../../../lib/organization-access";
import { loadAssetAssurance, sameCompanyAccess } from "../../../../../lib/asset-assurance";
import { assuranceOpen } from "../../../../../lib/asset-assurance-model";
import { assetCategories, categoryLabel, CALIBRATION_RESULTS } from "../../../../../lib/asset-catalog";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Asset record | RPG Excellence", robots: { index: false, follow: false }, referrer: "no-referrer" };
const words = value => String(value || "Not recorded").replaceAll("_", " ");
const date = value => {
const day = String(value || "").slice(0,10);
return /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(day))
? new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeZone:"UTC"}).format(new Date(${day}T12:00:00Z)) : "Not recorded";
};
const text = value => value || "Not recorded";
function Fields({ rows }) { return <dl className="arcFields">{rows.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{text(value)}</dd></div>)}</dl>; }
const interval = (value,unit) => value && unit ? Every ${value} ${unit} : "Not recorded";
export default async function AssetRecord({ params }) {
const { id } = await params;
const context = await requireAssetRecord(id), {asset, access, admin}=context;
const [people, allMaintenance, documentAccess] = await Promise.all([
loadAssetRows(admin,"organization_people",access.organization.id,"id,first_name,last_name,account_status"),
loadAssetRows(admin,"organization_asset_maintenance",access.organization.id),
getOrganizationAccess("documents","view"),
]);
const maintenance=allMaintenance.filter(r=>r.asset_id===asset.id && r.owner_id===access.organization.owner_id)
.sort((a,b)=>String(b.completed_date||b.scheduled_date||"").localeCompare(String(a.completed_date||a.scheduled_date||"")));
const person = id => {const p=people.find(p=>p.id===id);return p ? ([p.first_name,p.last_name].filter(Boolean).join(" ")||"Name not recorded")+(p.account_status!=="active"?" (inactive)":"") : "Not recorded";};
const canDocuments = sameCompanyAccess(documentAccess,access);
let documents=[];
if(canDocuments){
const {data,error}=await admin.from("organization_asset_document_links").select("controlled_document_id")
.eq("organization_id",access.organization.id).eq("asset_id",asset.id).eq("owner_id",access.organization.owner_id);
if(error)throw new Error("Linked document information is unavailable. Please try again later.");
const ids=[...new Set((links||[]).map(r=>r.controlled_document_id))];
for(let offset=0;offset<ids.length;offset+=100){
const {data,error}=await admin.from("controlled_documents").select("id,document_number,title,revision,document_type")
.in("id",ids.slice(offset,offset+100)).eq("status","Current").in("audience",["Customer","Both"]);
if(documentError)throw new Error("Linked document information is unavailable. Please try again later.");
documents.push(...(data||[]));
}
}
const assurance=await loadAssetAssurance(access,maintenance);
const linked=[...assurance.findings,...assurance.cases,...assurance.mocs].filter(row=>row.asset_id===asset.id);
const today=new Date().toISOString().slice(0,10);
const openWork=maintenance.filter(r=>!["completed","cancelled"].includes(r.status));
const alerts=[];
if(asset.operational_status==="out_of_service")alerts.push("Recorded as out of service. Follow the company isolation and release process.");
if(asset.operational_status==="retired")alerts.push("Recorded as retired. This record is retained for history.");
if(asset.ppm_required && !asset.next_maintenance_date)alerts.push("PPM is required but its next due date is missing.");
if(asset.ppm_required && asset.next_maintenance_date && asset.next_maintenance_date<today)alerts.push("The recorded PPM due date has passed.");
if(asset.calibration_required && !asset.next_calibration_date)alerts.push("Calibration is required but its next due date is missing.");
if(asset.calibration_required && asset.next_calibration_date && asset.next_calibration_date<today)alerts.push("The recorded calibration due date has passed.");
if(["out_of_tolerance","conditional"].includes(asset.calibration_result))alerts.push("The calibration result requires review before any decision about use.");
if(asset.calibration_required && (!asset.calibration_result || asset.calibration_result==="not_assessed"))alerts.push("Calibration acceptance has not been assessed in this record.");
const workOverdue=openWork.filter(r=>r.scheduled_date && r.scheduled_date<today);
if(workOverdue.length)alerts.push(${workOverdue.length} open maintenance or inspection record(s) have a scheduled date before today.);
const latestService=maintenance.find(r=>r.status==="completed" && r.maintenance_type!=="calibration");
const statutory=maintenance.filter(r=>["inspection","statutory"].includes(r.maintenance_type));
await recordAssetAccess(context,"record_view");
return <main className="arcPage"><style>{css}</style>

  <header className="arcHero"><div><p className="arcEyebrow">ASSET MANAGEMENT · AUTHENTICATED RECORD</p><h1>{asset.asset_reference} — {asset.asset_name}</h1><p>{assetCategories(asset).map(categoryLabel).join(" · ")}</p><p>{text(asset.site_location_label)}{asset.area_department?` · ${asset.area_department}`:""}</p></div><div className="arcBadges"><strong>{words(asset.operational_status)}</strong><span>{words(asset.criticality)} criticality</span></div></header>
  <div className="arcNotice"><strong>Current recorded information — not authorisation to use equipment</strong><p>Check the equipment, task controls, isolation and local instructions before use. A future due date or an uploaded certificate does not establish safe condition or legal compliance.</p><small>Loaded {new Date().toISOString().replace("T"," ").slice(0,19)} UTC · Refresh to obtain updated information.</small></div>
  {!!alerts.length && <section className="arcAlert" aria-label="Recorded conditions requiring attention"><h2>Attention required</h2><ul>{alerts.map(message=><li key={message}>{message}</li>)}</ul></section>}
  <nav className="arcNav" aria-label="Asset record sections"><a href="#identity">Identity and ownership</a><a href="#maintenance">Maintenance and calibration</a><a href="#assurance">NC CAPA and MOC</a><a href="#compliance">Documented controls</a><a href="#history">Work history</a></nav>
  <section id="identity" className="arcSection"><h2>What it is and who is responsible</h2><Fields rows={[["Accountable asset owner",person(asset.asset_owner_person_id)],["Maintenance coordinator",person(asset.maintenance_owner_person_id)],["Location",asset.site_location_label],["Area or department",asset.area_department],["Manufacturer",asset.manufacturer],["Model",asset.model],["Serial number",asset.serial_number],["Maintenance delivery",words(asset.maintenance_owner_type)],["Maintenance provider",asset.maintenance_provider],["Asset last updated",date(asset.updated_at)]]}/>{asset.description&&<p>{asset.description}</p>}</section>
  <div id="maintenance" className="arcGrid"><section className="arcSection"><h2>Maintenance and PPM</h2><Fields rows={[["PPM requirement",asset.ppm_required?"Required":"Not marked as required"],["Recurring interval",interval(asset.ppm_frequency_value,asset.ppm_frequency_unit)],["Last recorded service",date(asset.last_maintenance_date)],["Latest completed work type",latestService?words(latestService.maintenance_type):"Not recorded"],["Next recurring due date",date(asset.next_maintenance_date)],["Open work records",String(openWork.length)]]}/><p>Scheduled jobs and recurring PPM dates are shown separately. Check work history for individual job dates and evidence.</p></section>
  <section className="arcSection"><h2>Calibration</h2><Fields rows={[["Calibration requirement",asset.calibration_required?"Required":"Not marked as required"],["Last calibration",date(asset.last_calibration_date)],["Next calibration due",date(asset.next_calibration_date)],["Interval",interval(asset.calibration_frequency_value,asset.calibration_frequency_unit)],["Interval basis",asset.calibration_interval_basis],["Provider",asset.calibration_provider],["Certificate reference",asset.calibration_certificate_reference],["Recorded result",CALIBRATION_RESULTS.find(([key])=>key===asset.calibration_result)?.[1]||"Not assessed"],["Scope",asset.calibration_scope],["Acceptance criteria and decision rule",asset.calibration_acceptance_criteria]]}/><p>The recorded calibration result is limited to its scope and criteria. It is not a general release for use.</p></section></div>
  <section id="assurance" className="arcSection"><h2>Linked NC CAPA and Management of Change</h2><p>Only source records you are authorised to view are listed. An empty list is not confirmation that there are no outstanding issues.</p>{!assurance.canMoc&&<p>MOC information unavailable or source permission required.</p>}{!assurance.canCapa&&<p>CAPA information unavailable or source permission required.</p>}{!assurance.canFindings&&<p>Audit NC information is restricted by the audit source access rules.</p>}{assurance.issues.map(issue=><p key={issue} className="arcWarning">{issue}</p>)}<div className="arcTableWrap"><table><thead><tr><th>Source</th><th>Record</th><th>Status</th><th>Target date</th></tr></thead><tbody>{linked.map((row,i)=><tr key={`${row.kind}-${row.source_id}-${i}`}><td>{row.kind}</td><td><Link href={row.href} prefetch={false}>{row.reference} — {row.title}</Link></td><td>{words(row.status)}{assuranceOpen(row)?" · open":""}</td><td>{date(row.due)}</td></tr>)}</tbody></table></div>{!linked.length&&<p>No linked records available within your current permissions.</p>}</section>
  <section id="compliance" className="arcSection"><h2>Documented controls and legal review</h2><Fields rows={[["Change screening requirement",asset.change_control_required?"Material changes require MOC screening":"Not marked as required"],["Inspection and statutory work records",String(statutory.length)],["PUWER applicability and assessment", "A separate structured PUWER assessment is not recorded by this feature"]]}/><p>Relevant inspection records and instructions support review by a competent person. This page does not determine which legislation applies or certify compliance. Missing or inaccessible evidence must be investigated.</p><h3>Current linked documented information</h3>{!canDocuments?<p>Document module permission is required to view linked information.</p>:documents.length?<ul>{documents.map(document=><li key={document.id}><Link href="/portal/documents" prefetch={false}>{document.document_number} — {document.title}</Link> · revision {text(document.revision)} · {text(document.document_type)}</li>)}</ul>:<p>No current customer-facing document is available through the linked register entries.</p>}</section>
  <section id="history" className="arcSection"><h2>Scheduled work and retained evidence</h2><div className="arcTableWrap"><table><thead><tr><th>Record and work</th><th>Responsible person</th><th>Dates</th><th>Status and result</th><th>Evidence</th></tr></thead><tbody>{maintenance.map(record=><tr key={record.id}><td><strong>{record.maintenance_reference}</strong><br/>{words(record.maintenance_type)}<p>{record.work_completed}</p>{record.performed_by&&<p>Performed by {record.performed_by}</p>}</td><td>{person(record.responsible_person_id)}</td><td>Scheduled {date(record.scheduled_date)}<br/>Completed {date(record.completed_date)}{record.next_due_date&&<><br/>Next due {date(record.next_due_date)}</>}</td><td>{words(record.status)}{record.maintenance_type==="calibration"&&<p>{CALIBRATION_RESULTS.find(([key])=>key===record.calibration_result)?.[1]||"Not assessed"}</p>}</td><td>{record.evidence_reference&&<p>{record.evidence_reference}</p>}{record.evidence_storage_path?<a href={evidencePath(asset.id,record.id)}>Download evidence</a>:"No file recorded"}</td></tr>)}</tbody></table></div>{!maintenance.length&&<p>No work records recorded for this asset.</p>}</section>
  <footer className="arcActions"><Link href="/portal/asset-management/register" prefetch={false}>Back to Asset Register</Link>{access.canWrite&&<><Link href={`/portal/asset-management/register?edit=${asset.id}`} prefetch={false}>Edit asset</Link><Link href="/portal/asset-management/maintenance" prefetch={false}>Record maintenance or calibration</Link><a href={`${recordPath(asset.id)}/label`}>Download printable QR label</a></>}</footer>
  <p className="arcPrivacy">The printed label contains its owner and location. Display it only where that information may be seen. Reprint after ownership or location changes; the QR record address remains the same.</p>
 </main>;
}
const css=`.arcPage{padding:24px clamp(16px,3vw,44px) 60px;background:#edf4fa;color:#102d4e;font:15px/1.6 Arial,sans-serif;min-width:0}.arcPage *{box-sizing:border-box}.arcPage h1{font-size:clamp(25px,3vw,38px);line-height:1.2;margin:8px 0}.arcPage h2{font-size:22px;line-height:1.3;margin:0 0 16px}.arcPage h3{font-size:18px}.arcPage a{color:#0750b9;text-underline-offset:3px}.arcHero{background:linear-gradient(110deg,#0c2947,#07565f);color:white;display:flex;gap:24px;justify-content:space-between;padding:28px;border-radius:16px}.arcHero p{margin:8px 0}.arcEyebrow{font-size:11px;letter-spacing:.13em;font-weight:bold}.arcBadges{display:flex;flex-direction:column;gap:10px;min-width:140px}.arcBadges strong,.arcBadges span{border:1px solid #a6ccd3;border-radius:8px;padding:8px 12px;text-transform:capitalize}.arcNotice,.arcAlert,.arcSection{padding:24px;margin-top:18px;border:1px solid #d4e2ef;border-radius:13px;background:white;scroll-margin-top:110px}.arcNotice{border-left:5px solid #078b93;background:#f3fcfc}.arcNotice p{margin:6px 0}.arcAlert{background:#fff5f3;border-left:5px solid #b73227}.arcAlert ul{margin-bottom:0}.arcNav,.arcActions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}.arcNav a,.arcActions a{background:white;border:1px solid #c4d8e8;padding:9px 14px;border-radius:8px;text-decoration:none;font-weight:bold}.arcFields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px 24px;margin:0}.arcFields dt{font-size:12px;font-weight:bold;color:#4c6780}.arcFields dd{margin:3px 0 0;overflow-wrap:anywhere}.arcGrid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.arcGrid .arcFields{grid-template-columns:repeat(2,minmax(0,1fr))}.arcTableWrap{overflow-x:auto}.arcPage table{border-collapse:collapse;width:100%;min-width:620px;text-align:left}.arcPage th{background:#edf5fc;font-size:12px}.arcPage td,.arcPage th{padding:12px;vertical-align:top;border-bottom:1px solid #dbe6ed}.arcPage td p{margin:5px 0}.arcWarning{background:#fff3d6;padding:12px}.arcPrivacy{font-size:12px;color:#526c82}.arcPage a:focus-visible{outline:3px solid #e9a91d;outline-offset:3px}@media(max-width:850px){.arcGrid{grid-template-columns:1fr}.arcFields{grid-template-columns:repeat(2,minmax(0,1fr))}.arcHero{flex-direction:column}}@media(max-width:520px){.arcFields,.arcGrid .arcFields{grid-template-columns:1fr}.arcSection{padding:18px}}`;
