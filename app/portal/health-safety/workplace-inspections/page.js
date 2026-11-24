import Link from "next/link";
import { RecordIcon } from "../../../../components/DocumentRecordTabs";
import { requireOrganizationAccess } from "../../../../lib/organization-access";
import { requirePlanAccess } from "../../../../lib/plan-access";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { resolveInspectionAccess } from "../../../../lib/workplace-inspection-access";
import { canStartInspection } from "../../../../lib/workplace-inspection-policy.mjs";
import { OPEN_ACTIONS, actionOverdue, fieldworkOverdue, fieldworkState, inspectionPerformance, openFinding, programmeDue } from "../../../../lib/workplace-inspection-overview.mjs";
import { siteToday, UUID } from "../../../../lib/zone-policy.mjs";
import InspectionZoneForm from "./InspectionZoneForm";
import StartInspectionButton from "./StartInspectionButton";
import p from "../powra/powra.module.css";
import shared from "../permits/permit-register.module.css";
import s from "./inspection-overview.module.css";

export const metadata = { title: "Workplace Inspections | RPG Excellence" };
export const dynamic = "force-dynamic";

const ROOT = "/portal/health-safety/workplace-inspections";
const INSPECTION_VIEWS = [
  ["programmes", "Inspection programmes", "clipboard", s.programmes],
  ["fieldwork", "Scheduled fieldwork", "calendar", s.fieldwork],
  ["findings", "Findings requiring action", "alert", s.findings],
  ["performance", "Inspection performance", "matrix", s.performanceView],
];
const OTHER_VIEWS = [["overview", "Overview", "overview"], ["zones", "Zone QR & PPE", "qr"]];
const queues = [["planned","Planned"],["active","In progress"],["completed","Fieldwork completed"]];
const when = new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeStyle:"short",timeZone:"Europe/London"});
const day = new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeZone:"UTC"});
const date = (value,time=false)=>value&&Number.isFinite(Date.parse(value))?(time?when:day).format(new Date(value)):"Not recorded";
const title = value => value ? String(value).replaceAll("_"," ").replace(/^\w/,letter=>letter.toUpperCase()) : "Not recorded";
const tone = value => ["critical","high"].includes(value) ? "red" : value==="medium" ? "amber" : "blue";
const sources = {
  workplace_inspection:"Workplace inspection",internal_audit:"Internal audit",accident:"Accident",incident:"Incident",
  risk_assessment:"Risk assessment",powra:"POWRA",permit:"Permit to Work",moc:"Management of Change",asset:"Asset",manual:"Manual",
};

async function allRows(query){
  const rows=[];
  for(let from=0;;from+=500){
    const {data,error}=await query().range(from,from+499);
    if(error)throw new Error(error.message);
    rows.push(...(data||[]));
    if((data||[]).length<500)return rows;
  }
}
function Badge({children,tone="blue"}){
  return <span className={s.badge+" "+shared[tone]}>{children}</span>;
}
function Panel({id,icon,label,children,className=""}){
  return <section id={id} className={p.panel+" "+className}><h2><RecordIcon name={icon}/>{label}</h2>{children}</section>;
}
function Table({columns,rows,empty}){
  return rows.length ? <div className={p.tableWrap}><table className={p.table+" "+s.table}>
    <thead><tr>{columns.map(label=><th key={label} scope="col">{label}</th>)}</tr></thead>
    <tbody>{rows.map(([id,...cells])=><tr key={id}>{cells.map((cell,index)=>
      <td data-label={columns[index]} key={columns[index]}>{cell}</td>)}</tr>)}</tbody>
  </table></div> : <p className={shared.notice}>{empty}</p>;
}
const cleanLocation = value => String(value || "").replace(/Â[\s\u00a0]*(?=·)|Â\u00a0/g,"").trim();
function location(row,zone,site){
  const full = cleanLocation(row.administration_location_label);
  const short = [site?.site_reference,site?.site_name].map(cleanLocation).filter(Boolean).join(" · ") ||
    full.split(/\s+·\s+/).slice(0,2).join(" · ");
  const label = full || short || "Site not recorded";
  const area = cleanLocation(row.area_department);
  const zoneName = cleanLocation(zone?.name);
  return <><span className={s.siteLabel} title={full||undefined}>
    {zone ? <Link href={"/portal/company/sites/"+zone.site_id+"/zones"}>{label}</Link> : label}
  </span>
    {(area||zoneName) && <small>{area&&area.toLowerCase()!==zoneName.toLowerCase() && area}
      {zoneName && <>{area&&area.toLowerCase()!==zoneName.toLowerCase() && " · "}<Link href={href("zones",{zone:zone.public_token})}>{zoneName}</Link></>}
    </small>}</>;
}
function href(view,filters={}){
  const params=new URLSearchParams({view});
  for(const [key,value] of Object.entries(filters))if(value)params.set(key,value);
  return ROOT+"?"+params;
}

export default async function WorkplaceInspectionsPage({searchParams}){
  const params=await searchParams;
  const base=await requireOrganizationAccess("risk_management","view",ROOT);
  await requirePlanAccess(base.user,"professional","Health and Safety");
  const admin=createAdminClient();
  const org=base.organization.id;
  const now=Date.now(),today=siteToday("Europe/London",new Date(now));
  const view=[...INSPECTION_VIEWS, ...OTHER_VIEWS].some(([key])=>key===params?.view)?params.view:"overview";
  const queue=queues.some(([key])=>key===params?.queue)?params.queue:"planned";
  const search=typeof params?.q==="string"?params.q.trim().slice(0,160):"";
  const zoneToken=typeof params?.zone==="string"&&UUID.test(params.zone)?params.zone:"";
  const [access,programmes,inspections,findings,actions,people,zones,sites,buildings]=await Promise.all([
    resolveInspectionAccess(admin,base),
    allRows(()=>admin.from("hs_inspection_programmes")
      .select("id,programme_reference,title,administration_location_id,administration_location_label,area_department,zone_id,next_inspection_date,frequency_amount,frequency_unit,planning_basis,risk_score,risk_band,status,lead_inspector_person_id,accountable_person_id")
      .eq("organization_id",org).neq("status","archived").order("next_inspection_date").order("id")),
    allRows(()=>admin.from("hs_workplace_inspections")
      .select("id,programme_id,template_id,inspection_reference,title,administration_location_id,administration_location_label,area_department,zone_id,planned_start_at,planned_end_at,completed_at,status,lead_inspector_person_id")
      .eq("organization_id",org).order("planned_start_at").order("id")),
    allRows(()=>admin.from("hs_workplace_inspection_findings")
      .select("id,inspection_id,finding_reference,title,finding_type,priority,severity,status,created_at,response:hs_workplace_inspection_responses(question_code,question_text)")
      .eq("organization_id",org).order("created_at",{ascending:false}).order("id")),
    allRows(()=>admin.from("hs_workplace_inspection_actions")
      .select("id,inspection_id,finding_id,action_reference,action_text,priority,responsible_person_id,verifier_person_id,target_date,status,verification_result")
      .eq("organization_id",org).order("target_date").order("id")),
    allRows(()=>admin.from("organization_people").select("id,first_name,last_name,email").eq("organization_id",org).order("id")),
    allRows(()=>admin.from("organization_zones").select("id,site_id,building_id,reference,name,public_token,show_assessments")
      .eq("organization_id",org).eq("status","published").order("reference").order("id")),
    allRows(()=>admin.from("organization_sites").select("id,site_reference,site_name").eq("organization_id",org).eq("status","active").order("id")),
    allRows(()=>admin.from("organization_buildings").select("id,name").eq("organization_id",org).order("id")),
  ]);
  const peopleById=new Map(people.map(row=>[row.id,[row.first_name,row.last_name].filter(Boolean).join(" ")||row.email]));
  const person=id=>peopleById.get(id)||(id?"Company user unavailable":"Unassigned");
  const sitesById=new Map(sites.map(row=>[row.id,row]));
  const published=zones.filter(zone=>sitesById.has(zone.site_id));
  const zoneById=new Map(published.map(zone=>[zone.id,zone]));
  const buildingNames=new Map(buildings.map(row=>[row.id,row.name]));
  const zone=published.find(row=>row.public_token===zoneToken);
  const inspectionById=new Map(inspections.map(row=>[row.id,row]));
  const activeProgrammes=programmes.filter(row=>row.status==="active");
  const overdueProgrammes=activeProgrammes.filter(row=>programmeDue(row,today));
  const ongoing=inspections.filter(row=>fieldworkState(row)==="active");
  const findingsOpen=findings.filter(openFinding);
  const actionsOpen=actions.filter(row=>OPEN_ACTIONS.includes(row.status));
  const overdueActions=actionsOpen.filter(row=>actionOverdue(row,today));
  const awaiting=actionsOpen.filter(row=>row.status==="awaiting_verification");
  const next=activeProgrammes.find(row=>row.next_inspection_date);
  const [signals,packs]=next && view==="overview" ? await Promise.all([
    admin.from("hs_inspection_risk_signals").select("id,source_module,source_reference,summary,signal_score,occurred_at")
      .eq("organization_id",org).eq("programme_id",next.id).eq("active",true).or("expires_at.is.null,expires_at.gt."+new Date(now).toISOString())
      .order("signal_score",{ascending:false}).limit(8),
    admin.from("hs_inspection_programme_packs").select("selection_reason,pack:hs_inspection_question_packs(id,title)")
      .eq("organization_id",org).eq("programme_id",next.id).limit(10),
  ]) : [{data:[]},{data:[]}];
  const term=search.toLowerCase();
  const programmeRows=programmes.filter(row=>!term || [row.programme_reference,row.title,row.administration_location_label,row.area_department,
    zoneById.get(row.zone_id)?.name,person(row.accountable_person_id),person(row.lead_inspector_person_id)].join(" ").toLowerCase().includes(term));
  const fieldworkRows=inspections.filter(row=>fieldworkState(row)===queue);
  const scopedZoneRows=zone?inspections.filter(row=>row.zone_id===zone.id&&["planned","active"].includes(fieldworkState(row))):[];
  const actionsByFinding=new Map();
  for(const row of actions){
    if(!actionsByFinding.has(row.finding_id))actionsByFinding.set(row.finding_id,[]);
    actionsByFinding.get(row.finding_id).push(row);
  }
  const metrics=[
    ["Active programmes",activeProgrammes.length,"blue","clipboard",href("programmes",{active:"1"})],
    ["Inspections due",overdueProgrammes.length,"red","calendar",href("programmes",{due:"1"})],
    ["In progress",ongoing.length,"green","play",href("fieldwork",{queue:"active"})],
    ["Open findings",findingsOpen.length,"amber","alert",href("findings",{focus:"findings"})],
    ["Overdue actions",overdueActions.length,"amber","calendar",href("findings",{focus:"overdue"})],
    ["Awaiting verification",awaiting.length,"blue","scope",href("findings",{focus:"verification"})],
  ];
  const programmeTable=(rows)=><Table columns={["Programme","Location / scope","Owner / lead","Frequency","Next inspection","Programme status"]}
    rows={rows.map(row=>[row.id,<><Link href={ROOT+"/programmes/"+row.id}>{row.title}</Link><small>{row.programme_reference}</small></>,
      location(row,zoneById.get(row.zone_id),sitesById.get(row.administration_location_id)),<>{person(row.accountable_person_id)}<small>Lead · {person(row.lead_inspector_person_id)}</small></>,
      row.frequency_amount&&row.frequency_unit?`Every ${row.frequency_amount} ${row.frequency_amount===1?row.frequency_unit.replace(/s$/,""):row.frequency_unit}`:"Not recorded",
      <>{date(row.next_inspection_date)}{programmeDue(row,today)&&<small><Badge tone="red">Overdue</Badge></small>}</>,
      <Badge tone={row.status==="active"?"green":"neutral"}>{title(row.status)}</Badge>,
    ])} empty="No programmes match this view."/>;
  const fieldworkTable=(rows,{showInspector=false}={})=><Table columns={[
    "Inspection",...(showInspector?["Inspector"]:[]),"Location","Scheduled / completed","Status","Open",
  ]}
    rows={rows.map(row=>{
      const editable=["contribute","review","approve","admin","owner"].includes(access.level);
      const start=editable&&canStartInspection(access,row);
      const continuing=editable&&row.status==="in_progress"&&access.person?.id===row.lead_inspector_person_id;
      const inspector=person(row.lead_inspector_person_id);
      return [row.id,<><Link href={ROOT+"/"+row.id}>{row.title}</Link><small>{row.inspection_reference}</small>
        {!showInspector&&<small>{inspector}</small>}</>,...(showInspector?[inspector]:[]),
        location(row,zoneById.get(row.zone_id),sitesById.get(row.administration_location_id)),<>{row.planned_start_at?<time dateTime={row.planned_start_at}>{date(row.planned_start_at,true)}</time>:date(null)}{row.completed_at&&<small>Submitted · {date(row.completed_at,true)}</small>}
        {fieldworkOverdue(row,now)&&<small><Badge tone="red">Overdue</Badge></small>}</>,
        <Badge tone={row.status==="in_progress"?"green":"blue"}>{title(row.status)}</Badge>,
        start ? <StartInspectionButton inspectionId={row.id}/> :
          <Link className={continuing?p.primary:p.button} href={ROOT+"/"+row.id+(continuing?"#inspection-checklist":"")}>
            {continuing?"Continue checklist":"Open record"}</Link>];
    })} empty="No inspections in this queue."/>;
  const actionTable=(rows)=><Table columns={["Corrective action","Priority","Owner / verifier","Target","Status"]}
    rows={rows.map(row=>[row.id,<><Link href={ROOT+"/"+row.inspection_id+"#inspection-review-actions"}>{row.action_text}</Link><small>{row.action_reference}</small></>,
      <Badge tone={tone(row.priority)}>{title(row.priority)}</Badge>,
      <>{person(row.responsible_person_id)}<small>Verifier · {person(row.verifier_person_id)}</small></>,
      <>{date(row.target_date)}{actionOverdue(row,today)&&<small><Badge tone="red">Overdue</Badge></small>}</>,
      <>{title(row.status)}{row.verification_result&&row.verification_result!=="pending"&&<small>{title(row.verification_result)}</small>}</>,
    ])} empty="No corrective actions in this view."/>;
  const performance=view==="performance"?inspectionPerformance(inspections,findings,now):null;
  const measured=performance?performance.onTime+performance.late:0;
  const onTimePercent=measured?Math.round(performance.onTime/measured*100):null;

  return <main className={p.page}>
    <p className={p.crumb}><Link href="/portal/health-safety">Health &amp; Safety Hub</Link> / Workplace Inspections</p>
    <header className={p.hero}>
      <div className={p.identity}><span className={p.iconBox}><RecordIcon name="clipboard"/></span>
        <div><h1>Workplace Inspections</h1><p>Plan inspections, complete fieldwork and track findings through verification.</p></div></div>
      <div className={p.actions}>
        <Link className={p.button} href="/portal/tasks?view=mine&module=inspection"><RecordIcon name="person"/>My inspection work</Link>
        <Link className={p.button} href={href("zones")}><RecordIcon name="qr"/>Zone QR</Link>
        <Link className={p.button} href="/portal/company/sites"><RecordIcon name="pin"/>Sites &amp; zones</Link>
        {["contribute","review","approve","admin","owner"].includes(access.level) &&
          <Link className={p.primary} href={ROOT+"/programmes/new"}><RecordIcon name="documents"/>New programme</Link>}
      </div>
    </header>
    <section className={shared.tiles} aria-label="Inspection indicators">
      {metrics.map(([label,value,color,icon,target])=><Link key={label} href={target} className={p.metric+" "+shared[color]}>
        <span className={p.metricIcon}><RecordIcon name={icon}/></span><span className={p.metricContent}><strong>{value}</strong>{label}</span></Link>)}
    </section>
    <nav className={s.viewPicker} aria-label="Inspection views">
      <div className={s.viewUtilities}>
        {OTHER_VIEWS.map(([key,label,icon])=><Link key={key} href={href(key)} aria-current={view===key?"page":undefined}>
          <RecordIcon name={icon}/>{label}</Link>)}
      </div>
      <div className={s.viewCards}>
        {INSPECTION_VIEWS.map(([key,label,icon,color])=><Link key={key} href={href(key)} className={s.viewCard+" "+color}
          aria-current={view===key?"page":undefined}>
          <span className={s.viewIcon}><RecordIcon name={icon}/></span>
          <span>{label}</span>
          {view===key && <span className={s.selectedIcon}><RecordIcon name="checkCircle"/></span>}
        </Link>)}
      </div>
    </nav>

    {view==="overview" &&
      <Panel icon="scope" label="Dynamic inspection planning">
        <div className={s.planning}>
          <div className={s.planningSummary}>{next?<><h3><Link href={ROOT+"/programmes/"+next.id}>{next.title}</Link></h3>
            <p>Earliest programme due date · <strong>{date(next.next_inspection_date)}</strong> {programmeDue(next,today)&&<Badge tone="red">Overdue</Badge>}</p>
            <p>{next.planning_basis||"No planning explanation recorded for this programme."}</p>
            <Link href={ROOT+"/programmes/"+next.id}>View full planning evidence</Link>
          </>:<p>No active programme has a scheduled inspection date.</p>}</div>
          {next&&<div className={s.planningEvidence}>
            <details><summary>Planning signals{!signals.error&&<span>{(signals.data||[]).length}</span>}</summary>{signals.error?<p>Planning signals could not be loaded.</p>:
              (signals.data||[]).length?<ul>{signals.data.map(row=><li key={row.id}><strong>{sources[row.source_module]||title(row.source_module)}</strong>
                {row.source_reference&&<> · {row.source_reference}</>} <span className={s.signalScore}>{row.signal_score} points</span><small>{row.summary}</small></li>)}</ul>:<p>No active programme signals recorded.</p>}</details>
            <details><summary>Checklist packs and selection reasons{!packs.error&&<span>{(packs.data||[]).length}</span>}</summary>{packs.error?<p>Checklist packs could not be loaded.</p>:
              (packs.data||[]).length?<ul>{packs.data.map(row=><li key={row.pack?.id||row.selection_reason}><strong>{row.pack?.title||"Checklist pack"}</strong>
                {row.selection_reason&&<> · {row.selection_reason}</>}</li>)}</ul>:<p>No additional checklist packs recorded.</p>}</details>
          </div>}
        </div>
      </Panel>
    }

    {view==="programmes" && <Panel icon="clipboard" label={params?.due==="1"?"Overdue programme inspections":params?.active==="1"?"Active inspection programmes":"Inspection programmes"}>
      <form className={s.filters} action={ROOT}><input type="hidden" name="view" value="programmes"/>
        {params?.due==="1"&&<input type="hidden" name="due" value="1"/>}
        {params?.active==="1"&&<input type="hidden" name="active" value="1"/>}
        <label>Search programmes<input type="search" name="q" defaultValue={search} placeholder="Reference, site, area or owner"/></label>
        <button className={p.primary}>Search</button><Link className={p.button} href={href("programmes")}>Clear filters</Link>
      </form>
      {programmeTable(programmeRows.filter(row=>(params?.due!=="1"||programmeDue(row,today))&&(params?.active!=="1"||row.status==="active")))}
    </Panel>}

    {view==="fieldwork" && <Panel icon="calendar" label="Scheduled fieldwork">
      <nav className={p.tabs} aria-label="Fieldwork queues">{queues.map(([key,label])=><Link key={key} href={href("fieldwork",{queue:key})}
        aria-current={key===queue?"page":undefined}>{label} ({inspections.filter(row=>fieldworkState(row)===key).length})</Link>)}</nav>
      {fieldworkTable(fieldworkRows,{showInspector:true})}
    </Panel>}

    {view==="findings" && <>
      <Panel icon="alert" label="Inspection findings">
        <form action={ROOT} className={s.filters}><input type="hidden" name="view" value="findings"/>
          <label>Finding status<select name="focus" defaultValue={params?.focus==="all"?"all":"findings"}><option value="findings">Open</option><option value="all">All findings</option></select></label>
          <button className={p.button}>Apply</button></form>
        <Table columns={["Finding","Inspection","Severity / priority","Corrective actions","Status"]}
          rows={(params?.focus==="all"?findings:findingsOpen).map(row=>[row.id,<><strong>{row.title}</strong><small>{row.finding_reference}</small></>,
            <Link href={ROOT+"/"+row.inspection_id}>{inspectionById.get(row.inspection_id)?.inspection_reference||"Inspection record"}</Link>,
            <><Badge tone={tone(row.priority)}>{title(row.priority)}</Badge><small>Severity {row.severity??"not recorded"}</small></>,
            actionsByFinding.get(row.id)?.length ? <Link href={ROOT+"/"+row.inspection_id+"#inspection-review-actions"}>{actionsByFinding.get(row.id).length} recorded</Link> : "Not recorded",
            title(row.status)])} empty="No findings in this view."/>
      </Panel>
      <Panel icon="scope" label={params?.focus==="overdue"?"Overdue corrective actions":params?.focus==="verification"?"Actions awaiting verification":"Corrective actions"}>
        <nav className={p.tabs} aria-label="Action views">
          {[["","Open"],["overdue","Overdue"],["verification","Awaiting verification"],["all","All actions"]].map(([key,label])=><Link key={key} href={href("findings",{focus:key})}>{label}</Link>)}
        </nav>
        {actionTable(params?.focus==="overdue"?overdueActions:params?.focus==="verification"?awaiting:params?.focus==="all"?actions:actionsOpen)}
      </Panel>
    </>}

    {view==="performance"&&<div className={s.queues}>
      <Panel icon="matrix" label="Inspection performance · last six months">
        {(()=>{
          const percent=onTimePercent;
          return <><div className={s.performance}><div><strong>{percent===null?"Not available":percent+"%"}</strong><p>On-time fieldwork</p>
            {percent!==null&&<div className={s.track} aria-hidden="true"><span style={{width:percent+"%"}}/></div>}</div>
            <ul className={s.compact}><li>On time · {performance.onTime}</li><li>Late · {performance.late}</li>
              <li>Submitted without a scheduled end · {performance.unmeasured}</li>
              <li>Overdue fieldwork now · {inspections.filter(row=>fieldworkOverdue(row,now)).length}</li></ul></div>
            <p className={shared.muted}>On-time measures fieldwork submission against its recorded scheduled end. Submissions without a finish time are excluded from the rate.</p></>;
        })()}
      </Panel>
      <Panel icon="alert" label="Recurring findings · last six months">
        <p className={shared.muted}>The same checklist question raised in separate inspections within a programme or zone.</p>
        <Table columns={["Checklist question","Site","Inspections"]} rows={performance.repeats.map(row=>[row.key,row.label,row.scope,row.count])}
          empty="No recurring checklist findings recorded in this period."/>
      </Panel>
      <Panel icon="scope" label="Findings by status">
        <ul className={s.compact}><li>Open · {findingsOpen.length}</li><li>Closed · {findings.filter(row=>row.status==="closed").length}</li>
          <li>Cancelled · {findings.filter(row=>row.status==="cancelled").length}</li></ul>
      </Panel>
    </div>}

    {view==="zones" && <>
      <Panel icon="qr" label="Zone QR and location controls">
        <p className={shared.muted}>Scan the workplace QR poster with your phone or paste its link to find scheduled inspections for that zone.</p>
        <InspectionZoneForm/>
        {params?.zone&&!zone&&<p role="status">This zone is unavailable for this organisation.</p>}
        {zone&&<div className={s.links}><strong>{zone.reference} · {zone.name}</strong>
          {zone.show_assessments&&<Link href={"/area/"+zone.public_token+"#assessments"}>Applicable risk assessments</Link>}
          <Link href={"/area/"+zone.public_token+"#controls"}>PPE &amp; key controls</Link>
          <Link href={"/portal/company/sites/"+zone.site_id+"/zones"}>Site buildings &amp; zones</Link></div>}
      </Panel>
      {zone?<Panel icon="calendar" label="Fieldwork in this zone">{fieldworkTable(scopedZoneRows)}</Panel>:
        <Panel icon="pin" label="Published zones"><Table columns={["Zone","Site / building","Fieldwork","Controls"]}
          rows={published.map(row=>[row.id,row.reference+" · "+row.name,<>{cleanLocation(sitesById.get(row.site_id)?.site_name)}<small>{buildingNames.get(row.building_id)||"No building recorded"}</small></>,
            <Link href={href("zones",{zone:row.public_token})}>Find zone inspections</Link>,
            <Link href={"/area/"+row.public_token+"#controls"}>PPE &amp; key controls</Link>])} empty="No published zones for active sites."/>
          <Link href="/portal/company/sites">Open site profiles</Link>
        </Panel>}
    </>}
    <footer className={shared.muted}>Fieldwork records include the checklist and photograph evidence. Answers entered on the inspection page are retained on the device during a connection loss.</footer>
  </main>;
}
