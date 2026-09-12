import { redirect } from "next/navigation";
import HealthSafetyHubDashboard from "../../../components/HealthSafetyHubDashboard";
import { createClient } from "../../../lib/supabase/server";

export const metadata = { title: "Health & Safety Hub | RPG Excellence" };
export const dynamic = "force-dynamic";

export default async function HealthSafetyDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/health-safety");

  const [orgResult, assessmentsResult, hazardsResult, actionsResult, enrolmentsResult] = await Promise.all([
    supabase.from("organizations").select("id,name").eq("owner_id", user.id).order("created_at").limit(1),
    supabase.from("hs_risk_assessments").select("id,assessment_reference,title,status,assessment_type,site_location,area_department,assessor_name,assessment_date,review_date,updated_at").eq("owner_id", user.id).order("updated_at", { ascending: false }),
    supabase.from("hs_risk_hazards").select("id,assessment_id,hazard_category,hazard_description,current_score,current_band,residual_score,residual_band").eq("owner_id", user.id),
    supabase.from("hs_risk_actions").select("id,assessment_id,action_reference,action_required,responsible_name,target_date,priority,status,effectiveness_result").eq("owner_id", user.id).order("target_date"),
    supabase.from("hs_training_enrolments").select("id,status,progress_percent").eq("learner_id", user.id),
  ]);

  for (const result of [orgResult, assessmentsResult, hazardsResult, actionsResult, enrolmentsResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  return <HealthSafetyHubDashboard
    organisationName={orgResult.data?.[0]?.name}
    assessments={assessmentsResult.data || []}
    hazards={hazardsResult.data || []}
    actions={actionsResult.data || []}
    enrolments={enrolmentsResult.data || []}
  />;
}
