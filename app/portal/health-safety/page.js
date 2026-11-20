import Link from "next/link";
import HealthSafetyHubDashboard from "../../../components/HealthSafetyHubDashboard";
import WorkplaceInspectionBoardPanel, { loadWorkplaceInspectionBoard } from "../../../components/WorkplaceInspectionBoardPanel";
import { createAdminClient } from "../../../lib/supabase/admin";
import { requireOrganizationAccess } from "../../../lib/organization-access";
import { getUserSubscription, hasPlanAccess } from "../../../lib/subscription";

export const metadata = { title: "Health & Safety Dashboard | RPG Excellence" };
export const dynamic = "force-dynamic";

async function readDashboardRows(admin, table, fields, scopeColumn, scopeId) {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await admin.from(table).select(fields).eq(scopeColumn, scopeId).order("id").range(offset, offset + 499);
    if (error) throw new Error(error.message);
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}

export default async function HealthSafetyDashboard({ searchParams }) {
  const access = await requireOrganizationAccess("risk_management", "view", "/portal/health-safety");
  const { user, organization } = access;
  const admin = createAdminClient();
  const read = (table, fields) => readDashboardRows(admin, table, fields, "organization_id", organization.id);
  const inspectionData = getUserSubscription(user.id).then(subscription =>
    hasPlanAccess(subscription, "professional")
      ? loadWorkplaceInspectionBoard({ organizationId: organization.id, access, admin })
      : undefined
  ).catch(error => {
    console.error("Health and safety inspection calendar unavailable", error.message);
    return null;
  });
  const [query, assessments, hazards, actions, enrolments, powras, permits, changes, inspections] = await Promise.all([
    searchParams,
    read("hs_risk_assessments", "id,assessment_reference,title,status,site_location,area_department,review_date,updated_at"),
    read("hs_risk_hazards", "id,assessment_id,hazard_category,hazard_description,residual_score,residual_likelihood,residual_severity"),
    read("hs_risk_actions", "id,assessment_id,action_reference,action_required,target_date,priority,status,effectiveness_result"),
    readDashboardRows(admin, "hs_training_enrolments", "id,status", "learner_id", user.id),
    read("hs_powra_assessments", "id,status"),
    read("hs_permits", "id,status,valid_until"),
    read("hs_moc_changes", "id,status"),
    inspectionData,
  ]);
  const calendar = inspections ? <WorkplaceInspectionBoardPanel data={inspections}/>
    : <section className="wibPanel" id="inspection-calendar">
      <h2>Workplace Inspection calendar</h2>
      {inspections === null
        ? <p>Inspection planning is currently unavailable.</p>
        : <p>Workplace Inspection planning is available on the Professional plan. <Link href="/en/pricing#subscriptions">View access options</Link></p>}
    </section>;

  return <HealthSafetyHubDashboard organisationName={organization.name} assessments={assessments} hazards={hazards}
    actions={actions} enrolments={enrolments} powras={powras} permits={permits} changes={changes} inspections={inspections}
    selection={typeof query?.insight === "string" ? query.insight : ""} recordPage={typeof query?.records === "string" ? query.records : ""}>
    {calendar}
  </HealthSafetyHubDashboard>;
}
