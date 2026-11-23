import Link from "next/link";
import {DocumentRecordTabs,DocumentRecordPanel,DocumentRecordTabButton,RecordIcon} from "../../../../../components/DocumentRecordTabs";
import {residualBand,riskMatrixPosition} from "../../../../../lib/health-safety-dashboard.mjs";
import {PowraFacts} from "../../powra/PowraUI";
import p from "../../powra/powra.module.css";
import styles from "./permit-record.module.css";
import {notFound,redirect} from "next/navigation";
import {createClient} from "../../../../../lib/supabase/server";
import {getPermitAccess,mayAcceptHandback,mayEditPermit,mayIssuePermit,mayReceivePermit,mayVerifyPermit} from "../../../../../lib/permitAccess";
import {effectivePermitStatus,permitAuthorityWithControls,permitControlEvidence,currentPermitControls,getCloseReadiness,getIssueReadiness,PERMIT_STATUSES,statusMessage} from "../../../../../lib/permitLifecycle";
import {COMMON_CONTROLS,getPermitRule} from "../../../../../lib/permitControlRules";
import {changePermitLifecycle} from "./actions";
import SubcontractorRequests from "./subcontractor/Requests";
import PermitValidityRefresh from "./PermitValidityRefresh";
import {permitWorkflowFeedback} from "../../../../../lib/permit-workflow-feedback.mjs";

export const dynamic="force-dynamic";
const title=value=>String(value||"").replaceAll("_"," ").replace(/\b\w/g,letter=>letter.toUpperCase());
const date=value=>value&&Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeStyle:"short",timeZone:"Europe/London"}).format(new Date(value)):"—";

const notRecorded = "Not recorded";
const show = value => value === null || value === undefined || value === "" ? notRecorded : value;
const list = value => Array.isArray(value) ? value : [];
const riskLabels = {acceptable:"Acceptable",adequate:"Adequate",inadequate:"Inadequate",unacceptable:"Unacceptable"};

function Action({id,intent,label,tone="blue",field,confirmation=false}){
  return <form action={changePermitLifecycle} className={styles.action}>
    <input type="hidden" name="id" value={id}/><input type="hidden" name="intent" value={intent}/>
    {field && <label>{field}<textarea name={confirmation ? "confirmation" : "reason"} required/></label>}
    {confirmation && <label className={styles.check}><input type="checkbox" required/>I confirm the details recorded above.</label>}
    <button className={tone==="red" ? p.stopButton : p.primary}>{label}</button>
  </form>;
}

function Panel({icon,title,children}){
  return <section className={p.panel}><h2><RecordIcon name={icon}/>{title}</h2>{children}</section>;
}

function DataTable({columns, rows, empty, failed=false}){
  if(failed)return <p role="status">These records could not be loaded.</p>;
  if(!rows.length)return <p>{empty}</p>;
  return <div className={styles.tableWrap}><table className={styles.table}><thead><tr>{columns.map(column=><th scope="col" key={column}>{column}</th>)}</tr></thead>
    <tbody>{rows.map(([key,...cells])=><tr key={key}>{cells.map((cell,index)=><td key={columns[index]}>{cell}</td>)}</tr>)}</tbody></table></div>;
}

function CheckRows({label,items,selected,missing="Not recorded"}){
  return <fieldset className={styles.checklist}><legend>{label}</legend>{items.map(({key,label:caption})=>{
    const checked=selected.has(key);
    return <label className={styles.check} key={key}><input type="checkbox" checked={checked} disabled/><span>{caption}</span>
      <small className={checked ? styles.positive : styles.muted}>{checked ? "Recorded" : missing}</small>
    </label>;
  })}</fieldset>;
}

function RiskScore({position}){
  return position ? <span className={styles[residualBand(position.score)]}>{position.score} · {riskLabels[residualBand(position.score)]}</span> : notRecorded;
}

export default async function PermitRecordPage({params,searchParams}){
  const {id}=await params,query=await searchParams,supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();
  if(!user)redirect(`/portal/login?next=/portal/health-safety/permits/${id}`);
  const access=await getPermitAccess(user.id,id);if(!access.allowed||!access.permit)notFound();
  const {admin}=access;
  const [permitResult,isolationResult,testResult,handoverResult,eventResult,conflictResult,peopleResult,documentsResult]=await Promise.all([
    admin.from("hs_permits").select("*,hs_risk_assessments!hs_permits_linked_assessment_id_fkey(assessment_reference,title,status)").eq("id",id).single(),
    admin.from("hs_permit_isolations").select("*").eq("permit_id",id).order("created_at"),
    admin.from("hs_permit_atmosphere_tests").select("*").eq("permit_id",id).order("tested_at",{ascending:false}),
    admin.from("hs_permit_handovers").select("*").eq("permit_id",id).order("handed_over_at",{ascending:false}),
    admin.from("hs_permit_events").select("*").eq("permit_id",id).order("created_at",{ascending:false}),
    admin.from("hs_permits").select("id,permit_reference,task_description,status").eq("organization_id",access.permit.organization_id).eq("site_location",access.permit.site_location).eq("asset_reference",access.permit.asset_reference).neq("id",id).in("status",["awaiting_verification","awaiting_acceptance","issued","handover_required"]),
    admin.from("hs_permit_documents").select("id,title,document_reference,revision,file_name").eq("permit_id",id).eq("is_current",true).order("created_at",{ascending:false}),
    admin.from("organization_people").select("id,first_name,last_name,email,position").eq("organization_id",access.permit.organization_id),
  ]);
  if(permitResult.error)throw new Error(permitResult.error.message);
  const item=permitResult.data,isolations=isolationResult.data||[],tests=testResult.data||[],handovers=handoverResult.data||[],events=eventResult.data||[],conflicts=conflictResult.data||[],people=peopleResult.data||[];
  const [powraResult,relatedPermits,riskResult]=await Promise.all([
    item.organization_id ? supabase.from("hs_powra_assessments").select("id,powra_reference,task,end_review")
      .eq("organization_id",item.organization_id).contains("end_review",{point_of_work:{permit_id:id}}).order("created_at",{ascending:false}) : {data:[]},
    item.organization_id && item.linked_permit_ids?.length ? supabase.from("hs_permits").select("id,permit_reference,task_description")
      .eq("organization_id",item.organization_id).in("id",item.linked_permit_ids) : {data:[]},
    item.organization_id && item.linked_assessment_id ? supabase.from("hs_risk_hazards").select("id,hazard_description,current_likelihood,current_severity,residual_likelihood,residual_severity")
      .eq("organization_id",item.organization_id).eq("assessment_id",item.linked_assessment_id).order("display_order") : {data:[]},
  ]);
  const peopleById=new Map(people.map(person=>[person.id,person]));
  const displayControlValue=value=>{const person=peopleById.get(String(value||""));if(!person)return String(value);const display=[person.first_name,person.last_name].filter(Boolean).join(" ").trim()||person.email;return `${display}${person.position?` — ${person.position}`:""}`};
  const status=effectivePermitStatus(item),authorityStatus=permitAuthorityWithControls(item,currentPermitControls(permitControlEvidence(item,isolations,tests,!isolationResult.error&&!testResult.error))),definition=PERMIT_STATUSES[authorityStatus],rule=getPermitRule(item.permit_type);
  const issue=getIssueReadiness({permit:item,rule,isolations,atmosphereTests:tests,relatedConflicts:conflicts});
  const close=getCloseReadiness({permit:item,isolations});

  const workflowFeedback=permitWorkflowFeedback(query,{id,canEditDefinition:mayEditPermit(access)&&status==="draft"});

  const route = "/portal/health-safety/permits/" + id;
  const hazards = list(item.hazards);
  const controls = new Set([...list(item.precautions),...list(item.permit_specific_controls?.selected)]);
  const decisions = list(riskResult.data).map(row => ({
    id:row.id, name:row.hazard_description,
    initial:riskMatrixPosition(row.current_likelihood,row.current_severity),
    residual:riskMatrixPosition(row.residual_likelihood,row.residual_severity),
  }));
  const highest = key => decisions.reduce((top,row) => row[key] && (!top || row[key].score>top.score) ? row[key] : top,null);
  const documents = list(documentsResult.data);
  const relatedCount = documents.length + list(powraResult.data).length + list(relatedPermits.data).length + Number(Boolean(item.linked_assessment_id));
  const tabs = [
    ["overview","Overview"],["hazards","Hazards & controls"],["isolations",`Isolations (${isolationResult.error?"—":isolations.length})`],
    ["testing",`Atmospheric testing (${testResult.error?"—":tests.length})`],["handover",`Handover (${handoverResult.error?"—":handovers.length})`],
    ["documents",`Documents & evidence${documentsResult.error||powraResult.error||relatedPermits.error ? "" : ` (${relatedCount})`}`],
    ["workflow","Workflow & handback"],["history","History & audit"],
  ];
  const initial = query?.subcontractor ? "documents" : workflowFeedback ? "workflow" :
    tabs.some(([key])=>key===query?.tab) ? query.tab : "overview";
  const permitType = title(item.permit_type);
  const authority = definition ?? {label:"Status requires review",tone:"neutral"};
  const workArea = [item.work_area,item.asset_reference||item.equipment_asset].filter(Boolean).join(" · ");
  const linkedRisk = item.linked_assessment_id && <Link href={`/portal/health-safety/risk-assessment/${item.linked_assessment_id}`}>{item.hs_risk_assessments?.assessment_reference || "Open risk assessment"}</Link>;
  const archived = ["closed","cancelled"].includes(status);
  const overviewFacts = [["Activity",item.task_description],["Permit type",permitType],["Site",item.site_location],["Work area / asset",workArea],
    ["Person in charge",item.receiver_name],["Contractor",item.contractor_company||"Internal work party"],["Risk assessment",linkedRisk]];
  const checkpoints = [["Permit prepared",item.created_at],["Controls verified",item.verification_completed_at],
    ["Accepted by person in charge",item.receiver_accepted_at],["Permit issued",item.issued_at],["Handback requested",item.completion_declared_at],
    ["Handback accepted",item.handback_accepted_at],["Permit closed",item.closed_at]];
  const controlsLink = <Link className={p.button} href={route+"/controls"}><RecordIcon name="scope"/>Open safety controls</Link>;
  const editLink = status==="draft"&&mayEditPermit(access) && <Link className={p.primary} href={route+"/edit"}>Edit draft permit</Link>;

  return <main className={p.page}>
    <PermitValidityRefresh checkedAt={Date.now()} boundaries={item.status==="issued" ? [item.valid_from,item.valid_until,...tests.map(test=>test.expires_at)] : []}/>
    <p className={p.crumb}><Link href="/portal/health-safety">Health &amp; Safety Hub</Link> / <Link href="/portal/health-safety/permits">Permit Control Centre</Link> / {item.permit_reference}</p>
    <header className={p.hero}>
      <div className={p.identity}><span className={p.iconBox}><RecordIcon name="permit"/></span><div>
        <strong>{item.permit_reference} · {permitType} · VERSION {item.version||1}</strong>
        <h1>{item.task_description}</h1><p>{[item.site_location,workArea].filter(Boolean).join(" · ")}</p>
      </div></div>
      <div className={p.actions}>
        <Link className={p.button} href="/portal/health-safety/permits"><RecordIcon name="clipboard"/>Permit register</Link>
        <Link className={p.button} href={route+"/print"}><RecordIcon name="download"/>Print / PDF</Link>
        {editLink}
      </div>
    </header>

    <section className={styles.summary} aria-label="Permit summary">
      <article className={styles[authority.tone]}><RecordIcon name="checkCircle"/><div><small>Status</small><strong>{authority.label}</strong><span>{statusMessage(authorityStatus,item)}</span></div></article>
      {[["calendar","Valid from",date(item.valid_from)],["calendar","Valid until",date(item.valid_until)],
        ["pin","Location",workArea||item.site_location],["person","Issuer",item.issuer_name]].map(([icon,label,value])=>
        <article key={label}><RecordIcon name={icon}/><div><small>{label}</small><strong>{show(value)}</strong></div></article>)}
    </section>

    {workflowFeedback && <section className={styles.feedback} role="alert">
      <h2>Action required before continuing</h2><p>{workflowFeedback.message}</p>
      {workflowFeedback.blockers.length>0 && <ul>{workflowFeedback.blockers.map(blocker=><li key={blocker}>{blocker}</li>)}</ul>}
      <p>{workflowFeedback.instruction}</p><Link className={p.button} href={workflowFeedback.href}>{workflowFeedback.label}</Link>
    </section>}

    <DocumentRecordTabs tabs={tabs} initial={initial} sectionLabel="Permit record sections">
      <DocumentRecordPanel name="overview">
        <div className={styles.overview}>
          <Panel icon="workflow" title="Permit lifecycle">
            <ol className={styles.timeline}>{checkpoints.map(([label,value])=><li key={label}>
              <RecordIcon name={value?"checkCircle":"circle"}/><span>{label}</span><small>{value ? date(value) : notRecorded}</small>
            </li>)}</ol>
            <DocumentRecordTabButton name="workflow">Open permit workflow</DocumentRecordTabButton>
          </Panel>
          <Panel icon="clipboard" title="Work details"><PowraFacts rows={overviewFacts}/></Panel>
          <div className={styles.stack}>
            <Panel icon="matrix" title="Risk profile">
              {riskResult.error ? <p>The linked risk scores could not be loaded.</p> : highest("initial")||highest("residual") ?
                <><div className={styles.scores}><div>Initial risk<br/><RiskScore position={highest("initial")}/></div>
                  <div>Residual risk<br/><RiskScore position={highest("residual")}/></div></div>
                  <p className={styles.muted}>Highest scores recorded in the linked risk assessment.</p>
                  <DocumentRecordTabButton name="hazards">View linked risk scores</DocumentRecordTabButton></> :
                <p>No linked risk scores are available to display.</p>}
            </Panel>
            <Panel icon="scope" title="Key information"><PowraFacts rows={[
              ["Competence briefing",controls.has("work_party_briefed")?"Recorded":notRecorded],
              ["Emergency arrangements",item.emergency_arrangements?"Recorded":notRecorded],
              ["Receiver acceptance",item.receiver_accepted_at?date(item.receiver_accepted_at):item.receiver_declaration?"Declaration recorded":notRecorded],
              ["Handback accepted",item.handback_accepted_at?date(item.handback_accepted_at):notRecorded],
            ]}/></Panel>
          </div>
        </div>
        <Panel icon="hazards" title="Hazards & controls">
          <DataTable columns={["Recorded hazards"]} rows={hazards.map((value,index)=>[index,value])} empty="No permit hazards recorded."/>
          <DocumentRecordTabButton name="hazards">View controls and risk scores</DocumentRecordTabButton>
        </Panel>
        <div className={styles.quick}>
          {[["isolations","Isolations",isolationResult.error?null:isolations.length],["testing","Atmospheric testing",testResult.error?null:tests.length],
            ["handover","Handovers",handoverResult.error?null:handovers.length],["documents","Documents & evidence",documentsResult.error?null:documents.length]]
            .map(([key,label,count])=><Panel key={key} icon={key} title={label}><p>{count===null ? "Records unavailable" : `${count} recorded`}</p><DocumentRecordTabButton name={key}>View {label.toLowerCase()}</DocumentRecordTabButton></Panel>)}
        </div>
      </DocumentRecordPanel>

      <DocumentRecordPanel name="hazards">
        <Panel icon="hazards" title="Linked hazard risk scores">
          <DataTable columns={["Hazard in linked assessment","Initial risk","Residual risk"]} rows={decisions.map(row=>[
            row.id,show(row.name),<RiskScore position={row.initial}/>,<RiskScore position={row.residual}/>,
          ])} empty="No linked hazard scores are available to display." failed={Boolean(riskResult.error)}/>
        </Panel>
        <Panel icon="scope" title="Recorded checklists">
          {editLink}
          <div className={styles.two}>
            <div>
              <CheckRows label="Common precautions" items={COMMON_CONTROLS} selected={controls}/>
              <CheckRows label={rule.title} items={rule.controls} selected={controls}/>
            </div>
            <div>
              <CheckRows label="Permit hazards" items={hazards.map(value=>({key:value,label:value}))} selected={new Set(hazards)}/>
              <PowraFacts rows={Object.entries(item.permit_specific_controls?.values||{}).map(([key,value])=>[
                rule.fields.find(field=>field.key===key)?.label||title(key),show(displayControlValue(value ?? "")),
              ])}/>
            </div>
          </div>
        </Panel>
        <Panel icon="pin" title="Scope, exclusions & emergency arrangements"><PowraFacts rows={[
          ["Scope limits",item.scope_limits],["Prohibited work",item.prohibited_work],["Stop-work conditions",item.stop_work_conditions],
          ["Emergency arrangements",item.emergency_arrangements],
        ]}/></Panel>
      </DocumentRecordPanel>

      <DocumentRecordPanel name="isolations">
        <Panel icon="isolations" title="Isolation verification">
          <DataTable columns={["Isolation point","Applied by","Independently verified by","Reinstatement"]}
            rows={isolations.map(row=>[row.id,[row.energy_type,row.isolation_point].filter(Boolean).join(" · ")||notRecorded,
              <>{show(row.applied_by_name)}<small>{date(row.applied_at)}</small></>,
              <>{show(row.verified_by_name)}<small>{date(row.verified_at)}</small></>,
              row.reinstated_at ? <>{show(row.reinstated_by_name)}<small>{row.reinstatement_verified_at ? `Verified by ${show(row.reinstatement_verified_by_name)} · ${date(row.reinstatement_verified_at)}` : "Independent verification not recorded"}</small></> : notRecorded,
            ])} empty="No isolation evidence recorded." failed={Boolean(isolationResult.error)}/>
          {controlsLink}
        </Panel>
      </DocumentRecordPanel>

      <DocumentRecordPanel name="testing">
        <Panel icon="testing" title="Atmospheric test records">
          <DataTable columns={["Parameter","Reading","Recorded result","Tester / time","Test expiry"]}
            rows={tests.map(row=>[row.id,show(row.parameter),[row.actual_reading,row.unit].filter(value=>value!=null).join(" ")||notRecorded,
              title(row.result)||notRecorded,<>{show(row.tested_by_name)}<small>{date(row.tested_at)}</small></>,date(row.expires_at),
            ])} empty="No atmospheric test records." failed={Boolean(testResult.error)}/>
          {tests.length>0 && <p className={styles.muted}>Results are shown as recorded at the time of testing.</p>}
          {controlsLink}
        </Panel>
      </DocumentRecordPanel>

      <DocumentRecordPanel name="handover">
        <Panel icon="handover" title="Handovers & revised validity">
          <DataTable columns={["Outgoing","Incoming","Recorded","Authorised by","Revised expiry","Work status"]}
            rows={handovers.map(row=>[row.id,show(row.outgoing_person_name),show(row.incoming_person_name),date(row.handed_over_at),show(row.authorised_by_name),date(row.revised_valid_until),show(row.work_status)])}
            empty="No handovers recorded." failed={Boolean(handoverResult.error)}/>
          {status==="handover_required" ? controlsLink : <DocumentRecordTabButton name="workflow">View available workflow actions</DocumentRecordTabButton>}
        </Panel>
      </DocumentRecordPanel>

      <DocumentRecordPanel name="documents">
        <Panel icon="documents" title="Linked safety records">
          {(powraResult.error||relatedPermits.error) && <p role="status">Some related records could not be loaded.</p>}
          <ul className={styles.links}>
            {linkedRisk && <li><RecordIcon name="scope"/>{linkedRisk}</li>}
            {list(powraResult.data).map(row=><li key={row.id}><RecordIcon name="clipboard"/><span>
              <Link href={`/portal/health-safety/powra/${row.id}`}>{row.powra_reference} · {row.task}</Link>{row.end_review?.point_of_work?.inspection_id &&
                <> · <Link href={`/portal/health-safety/workplace-inspections/${encodeURIComponent(row.end_review.point_of_work.inspection_id)}`}>Inspection linked through POWRA</Link></>}
            </span></li>)}
            {list(relatedPermits.data).map(row=><li key={row.id}><RecordIcon name="permit"/><Link href={`/portal/health-safety/permits/${row.id}`}>{row.permit_reference} · {row.task_description}</Link></li>)}
          </ul>
        </Panel>
        <Panel icon="documents" title="Supporting evidence">
          <DataTable columns={["Title","Reference","Revision","File"]} rows={documents.map(row=>[row.id,show(row.title),show(row.document_reference),show(row.revision),show(row.file_name)])}
            empty="No current supporting evidence recorded." failed={Boolean(documentsResult.error)}/>
          <Link className={p.button} href={route+"/documents"}><RecordIcon name="open"/>Open evidence register</Link>
        </Panel>
        {item.organization_id && mayIssuePermit(access) && <SubcontractorRequests admin={admin} permit={item} organization={access.organization} feedback={query?.subcontractor}/>}
      </DocumentRecordPanel>

      <DocumentRecordPanel name="workflow">
        <div className={styles.two}>
          <Panel icon="workflow" title="Available actions">
            <p className={styles.muted}>{archived ? "This permit is closed to lifecycle changes." : "Actions follow your role and the permit’s current status."}</p>
            <div className={styles.actions}>
        {status==="draft"&&mayEditPermit(access)&& <Link className={p.primary} href={`/portal/health-safety/permits/${id}/edit`}>Edit draft permit</Link>}
        {status==="draft"&&mayEditPermit(access)&&
          <Action id={id} intent="submit_verification" label="Submit for verification"/>
        }

        {status==="awaiting_verification"&&mayVerifyPermit(access)&&
          <Action id={id} intent="verify" label="Complete verification" tone="green"/>
        }

        {status==="awaiting_acceptance"&&mayReceivePermit(access)&&!item.receiver_accepted_at&&
          <Action id={id} intent="accept_receiver" label="Accept control of work" tone="green"/>
        }

        {status==="awaiting_acceptance"&&mayIssuePermit(access)&&
          <Action id={id} intent="issue" label="Issue permit" tone="green"/>
        }

        {status==="issued"&&mayEditPermit(access)&&
          <Action id={id} intent="suspend" label="Suspend permit" tone="amber" field="Reason and safe condition"/>
        }

        {status==="issued"&&mayEditPermit(access)&&
          <Action id={id} intent="request_handover" label="Start handover" tone="amber" field="Work state and outstanding controls"/>
        }

        {["issued","expired"].includes(status)&&mayReceivePermit(access)&&
          <Action id={id} intent="complete_work" label={status==="expired"?"Request handback after expiry":"Declare work ended and request handback"} tone="dark" field="Work outcome and safe condition" confirmation/>
        }

        {status==="awaiting_handback"&&mayAcceptHandback(access)&&
          <Action id={id} intent="accept_handback" label="Accept hand-back and close" tone="dark" field="Reinstatement confirmation" confirmation/>
        }

        {["draft","awaiting_verification","awaiting_acceptance","suspended","handover_required"].includes(status)&&mayIssuePermit(access)&&
          <Action id={id} intent="cancel" label="Cancel permit" tone="red" field="Cancellation reason"/>
        }            </div>
            {status==="handover_required" && controlsLink}
          </Panel>
          <Panel icon="scope" title="Readiness & coordination">
            <CheckRows label="Declarations" items={[{key:"issuer",label:"Issuer declaration"},{key:"receiver",label:"Receiver acceptance"}]}
              selected={new Set([item.issuer_declaration&&"issuer",item.receiver_declaration&&"receiver"])} />
            {["draft","awaiting_verification","awaiting_acceptance"].includes(status) &&
              (issue.ready ? <p>Applicable issue checks are satisfied.</p> : <ul>{issue.blockers.map((value,index)=><li key={index}>{value}</li>)}</ul>)}
            {status==="awaiting_handback" && !close.ready && <ul>{close.blockers.map(value=><li key={value}>{value}</li>)}</ul>}
            {!archived && conflicts.length>0 && <ul>{conflicts.map(row=><li key={row.id}>Potential conflict: {row.permit_reference} · {row.task_description}</li>)}</ul>}
          </Panel>
        </div>
        {(item.closeout_notes||item.reinstatement_confirmation||item.suspension_reason||item.cancellation_reason) &&
          <Panel icon="scope" title="Decision and handback notes"><PowraFacts rows={[
            ["Work outcome and safe condition",item.closeout_notes],["Reinstatement confirmation",item.reinstatement_confirmation],
            ["Suspension reason",item.suspension_reason],["Cancellation reason",item.cancellation_reason],
          ]}/></Panel>}
      </DocumentRecordPanel>

      <DocumentRecordPanel name="history">
        <Panel icon="history" title="Permit history & audit">
          <DataTable columns={["Recorded time","Responsible person","Event","Notes"]}
            rows={events.map(row=>[row.id,date(row.created_at),show(row.actor_name),title(row.event_type),show(row.reason)])}
            empty="No lifecycle events recorded." failed={Boolean(eventResult.error)}/>
        </Panel>
      </DocumentRecordPanel>
    </DocumentRecordTabs>
  </main>;
}
