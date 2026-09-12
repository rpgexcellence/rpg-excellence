import { redirect } from "next/navigation";
import InternalAuditHubDashboard from "../../../components/InternalAuditHubDashboard";
import { createClient } from "../../../lib/supabase/server";

export const metadata = { title: "Internal Audit Hub | RPG Excellence" };
export const dynamic = "force-dynamic";

export default async function InternalAuditHubPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/internal-audit");

  const [organisationResult, auditsResult, findingsResult, actionsResult] = await Promise.all([
    supabase.from("organizations").select("id,name").eq("owner_id", user.id).order("created_at").limit(1),
    supabase.from("internal_audits").select("id,audit_reference,title,audit_type,audit_method,status,current_gate,planned_start_at,planned_end_at,updated_at").eq("owner_id", user.id).order("updated_at", { ascending: false }).limit(50),
    supabase.from("internal_audit_findings").select("id,audit_id,finding_reference,finding_type,risk_level,status,closure_verified,linked_rca_case_id,updated_at").eq("owner_id", user.id),
    supabase.from("internal_audit_action_access").select("id,finding_id,status,submitted_at,reviewed_at,updated_at").eq("owner_id", user.id),
  ]);

  for (const result of [organisationResult, auditsResult, findingsResult, actionsResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  return <InternalAuditHubDashboard
    organisationName={organisationResult.data?.[0]?.name}
    audits={auditsResult.data || []}
    findings={findingsResult.data || []}
    actions={actionsResult.data || []}
  />;
}
