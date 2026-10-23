import { redirect } from "next/navigation";
import HealthSafetyHubDashboard from "../../../components/HealthSafetyHubDashboard";
import { createAdminClient } from "../../../lib/supabase/admin";
import { requireOrganizationAccess } from "../../../lib/organization-access";

export const metadata = { title: "Health & Safety Hub | RPG Excellence" };
export const dynamic = "force-dynamic";

export default async function HealthSafetyDashboard() {
  const access = await requireOrganizationAccess(
    "risk_management",
    "view",
    "/portal/health-safety",
  );
  const { user, organization: organisation } = access;
  const admin = createAdminClient();

  const [assessmentsResult, hazardsResult, actionsResult, enrolmentsResult, powraResult, permitsResult, mocResult] = await Promise.all([
    admin.from("hs_risk_assessments").select("id,assessment_reference,title,status,assessment_type,site_location,area_department,assessor_name,assessment_date,review_date,updated_at").eq("organization_id", organisation.id).order("updated_at", { ascending: false }),
    admin.from("hs_risk_hazards").select("id,assessment_id,hazard_category,hazard_description,current_score,current_band,residual_score,residual_band").eq("organization_id", organisation.id),
    admin.from("hs_risk_actions").select("id,assessment_id,action_reference,action_required,responsible_name,target_date,priority,status,effectiveness_result").eq("organization_id", organisation.id).order("target_date"),
    admin.from("hs_training_enrolments").select("id,status,progress_percent").eq("learner_id", user.id),
    admin.from("hs_powra_assessments").select("id,status,decision,assessment_date").eq("organization_id", organisation.id),
    admin.from("hs_permits").select("id,status,valid_until").eq("organization_id", organisation.id),
    admin.from("hs_moc_changes").select("id,status,pathway,target_date").eq("organization_id", organisation.id),
  ]);

  for (const result of [assessmentsResult, hazardsResult, actionsResult, enrolmentsResult, powraResult, permitsResult, mocResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  return <HealthSafetyHubDashboard
    organisationName={organisation?.name}
    assessments={assessmentsResult.data || []}
    hazards={hazardsResult.data || []}
    actions={actionsResult.data || []}
    enrolments={enrolmentsResult.data || []}
    powras={powraResult.data || []}
    permits={permitsResult.data || []}
    changes={mocResult.data || []}
  />;
}
