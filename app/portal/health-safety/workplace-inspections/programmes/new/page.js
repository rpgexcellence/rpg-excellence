import Link from "next/link";

import WorkplaceInspectionProgrammeForm from "../../../../../../components/WorkplaceInspectionProgrammeForm";
import { requireOrganizationAccess } from "../../../../../../lib/organization-access";
import { requirePlanAccess } from "../../../../../../lib/plan-access";
import {
  AREA_PROFILE_FIELDS,
  loadWorkplaceInspectionOptions,
} from "../../../../../../lib/workplace-inspections";
import { createInspectionProgramme } from "../../actions";
import "../../workplace-inspections.css";

export const metadata = { title: "New Workplace Inspection Programme | RPG Excellence" };
export const dynamic = "force-dynamic";

const ROOT = "/portal/health-safety/workplace-inspections";

export default async function NewWorkplaceInspectionProgrammePage() {
  const access = await requireOrganizationAccess(
    "risk_management",
    "contribute",
    ROOT + "/programmes/new",
  );
  await requirePlanAccess(access.user, "professional", "Health and Safety");

  const options = await loadWorkplaceInspectionOptions(access.organization.id);
  const blockers = [];
  if (!options.sites.length) blockers.push("Add at least one active location in Administration → Site Profile.");
  if (options.people.length < 2) blockers.push("Add at least two active Company Users so the inspector and independent reviewer can be different people.");
  if (!options.templates.length) blockers.push("Activate a controlled Workplace Inspection template.");

  return <main className="wpiPage"><div className="wpiShell">
    <header className="wpiTop">
      <div><small>H&amp;S HUB · WORKPLACE INSPECTION</small><h1>Create inspection programme</h1><p>Define the controlled location, responsible people, recurring frequency and area characteristics used by the dynamic inspection engine.</p></div>
      <div className="wpiButtons"><Link className="wpiButton" href={ROOT}>← Workplace Inspections</Link></div>
    </header>

    <section className="wpiHero compact">
      <div><h2>One programme for each inspection area</h2><p>The core workplace checklist always applies. Specialist packs are added for gas cylinders, hazardous substances, machinery, lifting equipment, pressure systems and other selected conditions.</p></div>
      <strong>4 steps</strong>
    </section>

    {blockers.length ? <section className="wpiBlocker" role="alert"><strong>Complete the following before creating a programme:</strong><ol>{blockers.map((item) => <li key={item}>{item}</li>)}</ol><div className="wpiButtons"><Link className="wpiButton" href="/portal/company/sites">Open Site Profile</Link><Link className="wpiButton" href="/portal/company/people">Open Company Users</Link></div></section> : null}

    {!blockers.length ? <WorkplaceInspectionProgrammeForm
      action={createInspectionProgramme}
      sites={options.sites}
      zones={options.zones}
      people={options.people}
      templates={options.templates}
      profileFields={AREA_PROFILE_FIELDS}
    /> : null}
  </div></main>;
}
