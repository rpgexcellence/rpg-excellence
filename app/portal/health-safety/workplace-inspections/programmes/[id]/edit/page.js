import Link from "next/link";
import { notFound } from "next/navigation";

import WorkplaceInspectionProgrammeForm from "../../../../../../../components/WorkplaceInspectionProgrammeForm";
import { requireOrganizationAccess } from "../../../../../../../lib/organization-access";
import { requirePlanAccess } from "../../../../../../../lib/plan-access";
import { createAdminClient } from "../../../../../../../lib/supabase/admin";
import {
  AREA_PROFILE_FIELDS,
  loadWorkplaceInspectionOptions,
} from "../../../../../../../lib/workplace-inspections";
import { updateInspectionProgramme } from "../../../actions";
import "../../../workplace-inspections.css";

export const metadata = { title: "Edit Workplace Inspection Programme | RPG Excellence" };
export const dynamic = "force-dynamic";

const ROOT = "/portal/health-safety/workplace-inspections";

export default async function EditWorkplaceInspectionProgrammePage({ params }) {
  const route = await params;
  const programmeId = route.id;
  const access = await requireOrganizationAccess(
    "risk_management",
    "contribute",
    ROOT + "/programmes/" + programmeId + "/edit",
  );
  await requirePlanAccess(access.user, "professional", "Health and Safety");

  const admin = createAdminClient();
  const [programmeResult, options] = await Promise.all([
    admin.from("hs_inspection_programmes")
      .select("*")
      .eq("id", programmeId)
      .eq("organization_id", access.organization.id)
      .maybeSingle(),
    loadWorkplaceInspectionOptions(access.organization.id),
  ]);

  if (programmeResult.error) throw new Error(programmeResult.error.message);
  if (!programmeResult.data) notFound();
  const programme = programmeResult.data;

  const selectedPeople = [
    programme.accountable_person_id,
    programme.lead_inspector_person_id,
    programme.reviewer_person_id,
  ];
  const missingPeople = selectedPeople.filter((id) => !options.people.some((person) => person.id === id));

  return <main className="wpiPage"><div className="wpiShell">
    <header className="wpiTop">
      <div><small>{programme.programme_reference} · CONTROLLED CHANGE</small><h1>Edit inspection programme</h1><p>Update the location, ownership, frequency or area profile. Saving recalculates the checklist packs and next inspection date.</p></div>
      <div className="wpiButtons"><Link className="wpiButton" href={ROOT + "/programmes/" + programme.id}>← Programme</Link></div>
    </header>

    {missingPeople.length ? <section className="wpiBlocker" role="alert"><strong>One or more previously assigned people are no longer active Company Users.</strong><p>Select current Company Users before saving. Historical inspections retain their recorded names and audit trail.</p></section> : null}

    <section className="wpiHero compact"><div><h2>Controlled programme revision</h2><p>Changes apply to future scheduled inspections. Existing inspection snapshots and evidence are preserved.</p></div><strong>{programme.risk_score}/100</strong></section>

    <WorkplaceInspectionProgrammeForm
      action={updateInspectionProgramme}
      programme={programme}
      sites={options.sites}
      people={options.people}
      templates={options.templates}
      profileFields={AREA_PROFILE_FIELDS}
    />
  </div></main>;
}
