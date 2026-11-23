import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/server";
import { closureLabels, closureOptions, decisionDetails, POWRA_ROOT, powraDate, powraDecision, powraStatus, powraTime } from "../../../../../lib/powra-workflow.mjs";
import { UUID } from "../../../../../lib/zone-policy.mjs";
import { RecordIcon } from "../../../../../components/DocumentRecordTabs";
import { DecisionBadge, PowraFacts, PowraHero } from "../PowraUI";
import { closePowra, stopPowra } from "./actions";
import PrintPowra from "./PrintPowra";
import styles from "../powra.module.css";

export const dynamic = "force-dynamic";
const tabs = {overview:"Overview",hazards:"Hazards & controls",learning:"Verification & learning",links:"Linked records",history:"Decision history"};
const reviewFields = [["conditions_changed","Did conditions change?"],["new_hazards","Were new hazards identified?"],["controls_effective","Were controls effective?"],["incident","Incident or near miss?"]];
const display = {yes:"Yes",no:"No",na:"Not applicable"};
const notices = {changed:"This record changed. Check the latest decision before continuing.", stop:"Record the Stop Work reason and any escalation.",closure:"Select an eligible outcome and record the closure notes."};

export default async function PowraRecordPage({params,searchParams}) {
  const [{id},query] = await Promise.all([params,searchParams]);
  if (!UUID.test(id)) notFound();
  const href = POWRA_ROOT + "/" + id;
  const supabase = await createClient();
  const {data:{user}} = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=" + href);
  const {data:item,error} = await supabase.from("hs_powra_assessments").select("*").eq("id",id).eq("owner_id",user.id).maybeSingle();
  if (error) throw error;
  if (!item) notFound();
  const open = !["closed","cancelled"].includes(item.status);
  const decision = powraDecision(item);
  const checks = Array.isArray(item.prestart_checks) ? item.prestart_checks : [];
  const hazards = Array.isArray(item.hazards) ? item.hazards : [];
  const review = item.end_review || {};
  const work = review.point_of_work ?? {};
  const stop = review.stop_event;
  const tab = Object.hasOwn(tabs,query?.tab) ? query.tab : "overview";
  const related = [
    ["Risk assessment",item.linked_assessment_id ? "/portal/health-safety/risk-assessment/"+item.linked_assessment_id : "/portal/health-safety/risk-assessment",item.linked_assessment_id ? "Open linked assessment" : "Browse assessments"],
    ["Permit to work","/portal/health-safety/permits",item.linked_permit_reference],
    ["Workplace inspection","/portal/health-safety/workplace-inspections",work.inspection_reference],
    ["Incident reporting","/portal/incidents",review.incident_reference],
  ];
  const assessmentFacts = [["Assessor",item.completed_by],["Team",item.team_members],["Location",item.site_location],["Work area",item.work_area],
    ["Assessment date",powraDate(item.assessment_date)],["Recorded at",powraTime(item.created_at)]];
  return <main className={styles.page}>
    <PowraHero title={item.task} reference={item.powra_reference} description="Point of Work Risk Assessment">
      <Link className={styles.button} href={POWRA_ROOT}>POWRA register</Link>
      <PrintPowra/>
      {decision !== "safe_to_start" && <Link className={styles.primary} href={POWRA_ROOT+"/new?reassess="+id}>Start reassessment</Link>}
    </PowraHero>
    {!!notices[query?.notice] && Object.hasOwn(notices,query.notice) && <p className={styles.notice} role="alert">{notices[query.notice]}</p>}
    <section className={styles.summary} aria-label="Decision and closure">
      <div className={styles.panel}><h2>Recorded decision</h2><DecisionBadge decision={decision}/></div>
      <div className={styles.panel}><h2>Record status</h2>{powraStatus(item)}</div>
      <div className={styles.panel}><h2>Closure outcome</h2>{closureLabels[review.outcome] || "Not recorded"}</div>
    </section>
    <nav className={styles.tabs+" "+styles.recordTabs} aria-label="POWRA record views">
      {Object.entries(tabs).map(([key,label]) => <Link key={key} href={href+"?tab="+key} aria-current={tab===key ? "page" : undefined}>{label}</Link>)}
    </nav>
    {tab==="overview" && <div className={styles.grid}>
      <section className={styles.panel}><h2><RecordIcon name="overview"/>Assessment details</h2><PowraFacts rows={assessmentFacts}/></section>
      <section className={styles.panel}><h2><RecordIcon name="scope"/>Decision and review</h2><PowraFacts rows={[
        ["Decision notes",item.decision_reason],["Supervisor",item.supervisor_name],["Supervisor review recorded",item.supervisor_approved_at ? powraTime(item.supervisor_approved_at) : null],
        ["Closed at",item.closed_at ? powraTime(item.closed_at) : null],
      ]}/></section>
    </div>}
    {tab==="hazards" && <div className={styles.grid}>
      <section className={styles.panel}><h2>Pre-start checks</h2><PowraFacts rows={checks.map(row => [row.question,display[row.answer]])}/></section>
      <section className={styles.panel}><h2>Hazards and controls</h2>
        {hazards.length ? <ul className={styles.questions}>{hazards.map((hazard,i) => <li key={i}>
          <strong>{hazard.name}</strong><p>{hazard.control || "Control not recorded"}</p><p>Remaining risk: {hazard.remaining_risk || "Not recorded"}</p>
          <span className={styles.label+" "+(hazard.verified === true ? styles.safe : styles.controls)}>{hazard.verified === true ? "Control verified" : hazard.verified === false ? "Verification outstanding" : "Verification not recorded"}</span>
          {hazard.changed && <p>New or significantly changed hazard</p>}
        </li>)}</ul> : <p>{work.no_additional_hazards ? "No additional hazards identified at the point of work." : "No hazards recorded."}</p>}
      </section>
    </div>}
    {tab==="learning" && <section className={styles.panel}><h2>Verification and end-of-job learning</h2>
      {!open ? <PowraFacts rows={[...reviewFields.map(([name,label])=>[label,display[review[name]]]),["Closure notes",review.comments],
        ["Follow-up action",review.follow_up],["Evidence reference",review.evidence_reference],["Incident reference",review.incident_reference]]}/>
        : <form action={closePowra.bind(null,id)}>
          <label className={styles.field}>Closure outcome<select name="outcome" required defaultValue=""><option value="" disabled>Select actual outcome</option>
            {closureOptions(decision).map(key=><option key={key} value={key}>{closureLabels[key]}</option>)}
          </select></label>
          <div className={styles.grid}>{reviewFields.map(([key,label])=><label className={styles.field} key={key}>{label}
            <select name={key} defaultValue={review[key] || ""}><option value="">Not recorded</option>{Object.entries(display).map(([value,name])=><option key={value} value={value}>{name}</option>)}</select>
          </label>)}</div>
          <label className={styles.field}>Closure notes and interventions<textarea name="comments" required maxLength={3000} defaultValue={review.comments}/></label>
          <label className={styles.field}>Follow-up action<textarea name="follow_up" maxLength={3000}/></label>
          <label className={styles.field}>Evidence reference<input name="evidence_reference" maxLength={300}/></label>
          <label className={styles.field}>Incident or near-miss reference<input name="incident_reference" maxLength={100}/></label>
          <button className={styles.primary}>Record closure</button>
        </form>}
    </section>}
    {tab==="links" && <section className={styles.panel}><h2>Linked records</h2><ul className={styles.questions}>
      {related.map(([label,url,reference])=><li key={url}><strong>{label}</strong><p><Link href={url}>{reference || "Open module"}</Link></p></li>)}
      {work.reassessment_of && UUID.test(work.reassessment_of) && <li><Link href={POWRA_ROOT+"/"+work.reassessment_of}>Open earlier POWRA</Link></li>}
    </ul></section>}
    {tab==="history" && <section className={styles.panel}><h2>Decision history</h2>
      <PowraFacts rows={[
        ["Initial decision",decisionDetails[stop?.previous_decision || decision]?.[0]],["Assessment recorded",powraTime(item.created_at)],
        ["Initial decision notes",stop ? stop.previous_reason : item.decision_reason],["Stop Work recorded",stop?.at ? powraTime(stop.at) : null],
        ["Stop Work reason",decision === "stop_work" ? item.decision_reason : null],
        ["Closed",item.closed_at ? powraTime(item.closed_at) : null],["Closure outcome",closureLabels[review.outcome]],
      ]}/>
    </section>}
    {open && <div className={styles.dock}>
      {decision!=="stop_work" ? <a className={styles.stopButton} href="#stop-work">Stop Work</a> : <DecisionBadge decision={decision}/>}
      <Link className={styles.button} href={href+"?tab=learning"}>Close &amp; learn</Link>
    </div>}
    {open && decision!=="stop_work" && <section id="stop-work" className={styles.panel+" "+styles.noPrint}>
      <h2>Record Stop Work</h2><form action={stopPowra.bind(null,id)}>
        <label className={styles.field}>Reason and escalation<textarea name="reason" required maxLength={3000}/></label>
        <button className={styles.stopButton}>Record Stop Work</button>
      </form>
    </section>}
  </main>;
}
