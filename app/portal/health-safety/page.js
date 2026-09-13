import { redirect } from "next/navigation";
import HealthSafetyHubDashboard from "../../../components/HealthSafetyHubDashboard";
import { createClient } from "../../../lib/supabase/server";
import { createAdminClient } from "../../../lib/supabase/admin";

export const metadata = { title: "Health & Safety Hub | RPG Excellence" };
export const dynamic = "force-dynamic";

export default async function HealthSafetyDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/health-safety");

  // Establish the tenant with the authenticated client before using the server-only
  // client. Every administrative query below remains constrained to this tenant.
  const orgResult = await supabase
    .from("organizations")
    .select("id,name")
    .eq("owner_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (orgResult.error) throw new Error(orgResult.error.message);

  const organisation = orgResult.data;
  const admin = createAdminClient();
  const ownedOrOrganisation = organisation
    ? `owner_id.eq.${user.id},organization_id.eq.${organisation.id}`
    : `owner_id.eq.${user.id}`;
  const learnerOrOrganisation = organisation
    ? `learner_id.eq.${user.id},organization_id.eq.${organisation.id}`
    : `learner_id.eq.${user.id}`;

  const [assessmentsResult, hazardsResult, actionsResult, enrolmentsResult, powraResult, permitsResult, mocResult] = await Promise.all([
    admin.from("hs_risk_assessments").select("id,assessment_reference,title,status,assessment_type,site_location,area_department,assessor_name,assessment_date,review_date,updated_at").or(ownedOrOrganisation).order("updated_at", { ascending: false }),
    admin.from("hs_risk_hazards").select("id,assessment_id,hazard_category,hazard_description,current_score,current_band,residual_score,residual_band").or(ownedOrOrganisation),
    admin.from("hs_risk_actions").select("id,assessment_id,action_reference,action_required,responsible_name,target_date,priority,status,effectiveness_result").or(ownedOrOrganisation).order("target_date"),
    admin.from("hs_training_enrolments").select("id,status,progress_percent").or(learnerOrOrganisation),
    admin.from("hs_powra_assessments").select("id,status,decision,assessment_date").or(ownedOrOrganisation),
    admin.from("hs_permits").select("id,status,valid_until").or(ownedOrOrganisation),
    admin.from("hs_moc_changes").select("id,status,pathway,target_date").or(ownedOrOrganisation),
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
