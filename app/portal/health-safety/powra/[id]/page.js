import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/server";
import { closureLabels, closureOptions, decisionDetails, POWRA_ROOT, powraDate, powraDecision, powraStatus, powraTime } from "../../../../../lib/powra-workflow.mjs";
import { UUID } from "../../../../../lib/zone-policy.mjs";
import { RecordIcon } from "../../../../../components/DocumentRecordTabs";
import { DecisionBadge, PowraFacts, PowraHero } from "../PowraUI";
import { closePowra, stopPowra } from "./actions";
import PrintPowra from "./PrintPowra";
import PowraRecordContext from "./PowraRecordContext";
import styles from "../powra.module.css";

export const dynamic = "force-dynamic";
const tabs = {
  overview:["Overview","overview"],
  details:["Assessment details","details"],
  hazards:["Hazards & controls","scope"],
  learning:["Verification & learning","checkCircle"],
  links:["Documents & Applicability","documents"],
  history:["Decision history","history"],
};
const reviewFields = [
  ["conditions_changed", "Did conditions change?", "history"],
  ["new_hazards", "Were new hazards identified?", "alert"],
  ["controls_effective", "Were controls effective?", "scope"],
  ["incident", "Incident or near miss?", "alert"],
];
const reviewNotes = [
  ["Closure notes", "comments", "conversation"],
  ["Follow-up action", "follow_up", "clipboard"],
  ["Evidence reference", "evidence_reference", "documents"],
  ["Incident reference", "incident_reference", "overview"],
];
const decisionFacts = (item) => [
  ["Decision notes", item.decision_reason, "conversation"],
  ["Supervisor", item.supervisor_name, "person"],
  ["Supervisor review recorded", item.supervisor_approved_at ? powraTime(item.supervisor_approved_at) : null, "approval"],
  ["Closed at", item.closed_at ? powraTime(item.closed_at) : null, "calendar"],
];
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
  const tab = typeof query?.tab === "string" && Object.hasOwn(tabs,query.tab) ? query.tab : "overview";
  const status = powraStatus(item);
  const outcome = closureLabels[review.outcome] || "Not recorded";
  const [decisionLabel, tone] = decisionDetails[decision];
  const workplace = [item.site_location,item.work_area].filter(Boolean).join(" · ");
  const milestones = [
    ["Assessment recorded",item.created_at],
    ["Supervisor review",item.supervisor_approved_at],
    ...(decision === "stop_work" ? [["Stop Work recorded",stop?.at || item.created_at]] : []),
    [item.status === "cancelled" ? "Record cancelled" : "Record closed",item.closed_at],
  ];
  const currentMilestone = milestones.findLastIndex(([, date]) => Boolean(date));
  const assessmentFacts = [
    ["Reference",item.powra_reference,"overview"],["Task",item.task,"permit"],
    ["Assessor",item.completed_by,"person"],["Team",item.team_members,"distribution"],
    ["Location",item.site_location,"pin"],["Work area",item.work_area,"pin"],
    ["Assessment date",powraDate(item.assessment_date),"calendar"],["Recorded at",powraTime(item.created_at),"history"],
  ];
  return <main className={styles.page}>
    <PowraHero title={item.task} reference={[item.powra_reference,"Point of Work Risk Assessment"].filter(Boolean).join(" · ")} description={workplace || "Workplace not recorded"}>
      <span className={styles.recordStatus}>{status}</span>
      <Link className={styles.button} href={POWRA_ROOT}>POWRA register</Link>
      <PrintPowra/>
      {decision !== "safe_to_start" && <Link className={styles.primary} href={POWRA_ROOT+"/new?reassess="+id}>Start reassessment</Link>}
    </PowraHero>
    {!!notices[query?.notice] && Object.hasOwn(notices,query.notice) && <p className={styles.notice} role="alert">{notices[query.notice]}</p>}
    <nav className={styles.tabs+" "+styles.recordTabs} aria-label="POWRA record views">
      {Object.entries(tabs).map(([key,[label,icon]]) => <Link key={key} href={href+"?tab="+key} aria-current={tab===key ? "page" : undefined}><RecordIcon name={icon}/>{label}</Link>)}
    </nav>
    {tab==="overview" && <div className={styles.recordOverview}>
      <section className={styles.panel}>
        <h2>Decision profile</h2>
        <div className={styles.decisionTiles}>
          <div className={styles.decisionTile+" "+styles.recordedDecision+" "+styles[tone]}>
            <span>{decision === "safe_to_start" && <RecordIcon name="check"/>}Recorded decision</span><strong>{decisionLabel}</strong>
          </div>
          <div className={styles.decisionTile}><span>Record status</span><strong>{status}</strong></div>
        </div>
        <p>Closure outcome <strong>{outcome}</strong></p>
        <Link href={href+"?tab=history"}>View decision history</Link>
      </section>
      <section className={styles.panel}>
        <h2>Assessment details</h2>
        <PowraFacts rows={[["Reference",item.powra_reference],["Assessor",item.completed_by],["Location",item.site_location],
          ["Work area",item.work_area],["Assessment date",powraDate(item.assessment_date)]]}/>
      </section>
      <section className={styles.panel}>
        <h2>Lifecycle &amp; compliance</h2>
        <ol className={styles.timeline}>
          {milestones.map(([label,date], index) => <li key={label} aria-current={index === currentMilestone ? "step" : undefined}>
            <span className={styles.lifecycleMarker} data-recorded={Boolean(date)} aria-hidden="true">{date && <RecordIcon name="check"/>}</span>
            <strong>{label}</strong><span>{date ? <time dateTime={date}>{powraTime(date)}</time> : "Not recorded"}</span>
          </li>)}
        </ol>
      </section>
      <section className={styles.panel}>
        <h2>Hazards &amp; controls</h2>
        <p>{checks.length} pre-start {checks.length === 1 ? "check" : "checks"} · {hazards.length} {hazards.length === 1 ? "hazard" : "hazards"} recorded</p>
        <Link href={href+"?tab=hazards"}>Open hazards and controls</Link>
      </section>
      <section className={styles.panel}>
        <h2>Verification &amp; learning</h2>
        <p>Closure outcome <strong>{outcome}</strong></p>
        <Link href={href+"?tab=learning"}>View verification and close-out</Link>
      </section>
      <section className={styles.panel}>
        <h2>Documents &amp; Applicability</h2>
        <p>{workplace || "Workplace not recorded"}</p>
        <Link href={href+"?tab=links"}>View documents and applicability</Link>
      </section>
      <section className={styles.panel+" "+styles.recordScope}>
        <h2>Task and scope</h2><p>{[item.task,workplace].filter(Boolean).join(" · ") || "Not recorded"}</p>
      </section>
    </div>}
    {tab==="details" && <section className={styles.panel}>
      <h2><RecordIcon name="overview"/>Assessment details</h2>
      <div className={styles.recordGroups}>
        <section className={styles.recordGroup}><h3>Assessment context</h3>
          <PowraFacts rows={assessmentFacts.filter(([label])=>["Task","Team","Location","Work area"].includes(label))}/>
        </section>
        <section className={styles.recordGroup}><h3>Record information</h3>
          <PowraFacts rows={assessmentFacts.filter(([label])=>!["Task","Team","Location","Work area"].includes(label))}/>
        </section>
        <section className={styles.recordGroup}><h3>Decision and review</h3><PowraFacts rows={decisionFacts(item)}/></section>
      </div>
    </section>}
    {(tab==="hazards" || tab==="links") && <PowraRecordContext tab={tab} item={item} hazards={hazards} checks={checks} work={work} review={review}/>}
    {tab==="learning" && <section className={styles.panel}><h2><RecordIcon name="checkCircle"/>Verification and end-of-job learning</h2>
      {!open ? <PowraFacts rows={[...reviewFields.map(([name,label,icon])=>[label,display[review[name]],icon]),
        ...reviewNotes.map(([label,name,icon])=>[label,review[name],icon])]}/>
        : <form action={closePowra.bind(null,id)}>
          <label className={styles.field}><span className={styles.factIcon}><RecordIcon name="checkCircle"/>Closure outcome</span><select name="outcome" required defaultValue=""><option value="" disabled>Select actual outcome</option>
            {closureOptions(decision).map(key=><option key={key} value={key}>{closureLabels[key]}</option>)}
          </select></label>
          <div className={styles.grid}>{reviewFields.map(([key,label,icon])=><label className={styles.field} key={key}><span className={styles.factIcon}><RecordIcon name={icon}/>{label}</span>
            <select name={key} defaultValue={review[key] || ""}><option value="">Not recorded</option>{Object.entries(display).map(([value,name])=><option key={value} value={value}>{name}</option>)}</select>
          </label>)}</div>
          <label className={styles.field}><span className={styles.factIcon}><RecordIcon name="conversation"/>Closure notes and interventions</span><textarea name="comments" required maxLength={3000} defaultValue={review.comments}/></label>
          <label className={styles.field}><span className={styles.factIcon}><RecordIcon name="clipboard"/>Follow-up action</span><textarea name="follow_up" maxLength={3000}/></label>
          <label className={styles.field}><span className={styles.factIcon}><RecordIcon name="documents"/>Evidence reference</span><input name="evidence_reference" maxLength={300}/></label>
          <label className={styles.field}><span className={styles.factIcon}><RecordIcon name="overview"/>Incident or near-miss reference</span><input name="incident_reference" maxLength={100}/></label>
          <button className={styles.primary}>Record closure</button>
        </form>}
    </section>}
    {tab==="history" && <section className={styles.panel}><h2><RecordIcon name="history"/>Decision history</h2>
      <PowraFacts rows={[
        ["Initial decision",decisionDetails[stop?.previous_decision || decision]?.[0],"scope"],
        ["Assessment recorded",powraTime(item.created_at),"calendar"],
        ["Initial decision notes",stop ? stop.previous_reason : item.decision_reason,"conversation"],
        ["Stop Work recorded",stop?.at ? powraTime(stop.at) : null,"alert"],
        ["Stop Work reason",decision === "stop_work" ? item.decision_reason : null,"conversation"],
        ["Closed",item.closed_at ? powraTime(item.closed_at) : null,"history"],
        ["Closure outcome",closureLabels[review.outcome],"checkCircle"],
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
