import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { requireOrganizationAccess } from "../../../../lib/organization-access";
import { briefingRoot, distributionRows } from "../../../../lib/risk-distribution";
import { acknowledgeAssessment } from "../../health-safety/risk-assessment/[id]/distribution-actions";
import PPERequirements from "../../../../components/PPERequirements";
import s from "../../documents/documents.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Risk assessment acknowledgement | RPG Excellence" };

const date = value => value ? new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium", timeZone: "Europe/London",
}).format(new Date(value)) : "—";

export default async function RiskBriefing({ params, searchParams }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) notFound();
  const access = await requireOrganizationAccess(null, "view", briefingRoot + "/" + id);
  const admin = createAdminClient();
  const org = access.organization.id;
  const user = access.user.id;
  const [people, assigned] = await Promise.all([
    admin.from("organization_people").select("id").eq("organization_id", org).eq("user_id", user)
      .eq("account_status", "active").eq("account_type", "system"),
    distributionRows(admin, org, request => request.eq("assessment_id", id).eq("recipient_user_id", user)
      .eq("hs_risk_assessments.status", "communicated"), true),
  ]);
  if (people.error) throw people.error;
  const activePeople = new Set((people.data ?? []).map(person => person.id));
  const task = assigned?.find(row => activePeople.has(row.person_id));
  if (!task) notFound();
  const [record, hazards] = await Promise.all([
    admin.from("hs_risk_assessments").select("id,assessment_reference,version,title,status,site_location,area_department,task_description,persons_at_risk")
      .eq("organization_id", org).eq("id", id).eq("status", "communicated").maybeSingle(),
    admin.from("hs_risk_hazards").select("id,hazard_description,hazard_category,existing_controls,additional_controls,residual_score,risk_decision,ppe_requirements")
      .eq("organization_id", org).eq("assessment_id", id).order("display_order"),
  ]);
  if (record.error || hazards.error) throw record.error || hazards.error;
  const assessment = record.data;
  if (!assessment) notFound();
  return <main className={`${s.page} ${s.registerPage} ${s.recordPage}`}><div className={s.shell}>
    <p className={s.recordBreadcrumb}><Link href="/portal/tasks">My Tasks &amp; Approvals</Link> / Risk assessment acknowledgement</p>
    <header className={`${s.hubHero} ${s.recordHero}`}><div>
      <small>{assessment.assessment_reference} · VERSION {assessment.version}</small>
      <h1>{assessment.title}</h1><p>{assessment.site_location || "Workplace risk assessment"}</p>
    </div><span className={s.recordStatus} data-status="current">Communicated</span></header>
    <section className={`${s.recordPanel} ${s.hubRegister}`}><h2>Purpose and scope</h2>
      <p className={s.recordProse}>{assessment.task_description || "No scope recorded."}</p>
      <p>People at risk: {assessment.persons_at_risk?.join(", ") || "Not recorded"}</p>
    </section>
    <section className={s.recordPanel}><h2>Hazards and controls</h2>
      {(hazards.data ?? []).map(hazard => <article key={hazard.id} className={s.recordPicker}>
        <h3>{hazard.hazard_description || hazard.hazard_category || "Hazard"}</h3>
        <p className={s.recordProse}>{hazard.existing_controls || "No existing controls recorded."}</p>
        {hazard.additional_controls && <p className={s.recordProse}>Additional controls: {hazard.additional_controls}</p>}
        <p>Residual score: {hazard.residual_score ?? "Unrated"}</p>
        {hazard.risk_decision && <p>Risk decision: {hazard.risk_decision.replaceAll("_", " ")}</p>}
        <PPERequirements requirements={hazard.ppe_requirements ?? []}/>
      </article>)}
      {!hazards.data?.length && <p>No hazards recorded.</p>}
    </section>
    <section className={s.recordPanel}><h2>Acknowledgement</h2>
      {query?.result === "error" && <p className={s.error} role="alert">Acknowledgement could not be recorded. Check the assessment version and try again.</p>}
      {task.acknowledged_at ? <p className={s.success} role="status">You acknowledged this version on {date(task.acknowledged_at)}.</p> :
        <form action={acknowledgeAssessment.bind(null, id)}>
          {task.acknowledgement_due && <p>Due {date(task.acknowledgement_due)}</p>}
          <p>Read the assessment and its controls before confirming.</p>
          <button type="submit" className={s.recordPrimary}>I have read and understood this version</button>
        </form>}
    </section>
  </div></main>;
}
