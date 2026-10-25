import { redirect } from "next/navigation";
import InternalAuditHubDashboard from "../../../components/InternalAuditHubDashboard";
import { createClient } from "../../../lib/supabase/server";

export const metadata = { title: "Internal Audit Hub | RPG Excellence" };
export const dynamic = "force-dynamic";

// Keep the existing signed-in Supabase client and owner scope. Row-level
// security continues to apply; this page does not use a service-role client.
// Keyset pagination avoids the former latest-50 limit and accommodates
// a database API row limit smaller than the requested page size.
async function loadOwnedRows(supabase, ownerId, table, columns) {
  const rows = [];
  let cursor = null;

  while (true) {
    let query = supabase
      .from(table)
      .select(columns)
      .eq("owner_id", ownerId)
      .order("id", { ascending: true })
      .limit(500);

    if (cursor) query = query.gt("id", cursor);

    const { data, error } = await query;
    if (error) {
      // Fail visibly instead of displaying incomplete data as zero findings.
      console.error("INTERNAL_AUDIT_HUB_READ_FAILED", {
        table,
        code: error.code || "database_query_failed",
      });
      throw new Error("The Internal Audit Hub could not load its records. Please refresh or contact your administrator.");
    }

    const page = data || [];
    if (!page.length) break;

    const nextCursor = page[page.length - 1]?.id;
    if (!nextCursor || (cursor && nextCursor <= cursor)) {
      throw new Error("The Internal Audit Hub could not complete its record loading. Please refresh or contact your administrator.");
    }

    rows.push(...page);
    cursor = nextCursor;
  }

  return rows;
}

export default async function InternalAuditHubPage() {
  const supabase = await createClient();
  const { data: { user }, error: authenticationError } = await supabase.auth.getUser();
  if (authenticationError || !user) {
    redirect("/portal/login?next=/portal/internal-audit");
  }

  const [organisations, audits, findings, actions] = await Promise.all([
    loadOwnedRows(supabase, user.id, "organizations", "id,name"),
    loadOwnedRows(supabase, user.id, "internal_audits", `
      id,audit_reference,title,audit_type,audit_method,status,current_gate,
      planned_start_at,planned_end_at,updated_at,
      internal_audit_selected_standards (
        internal_audit_standard_catalogue (display_name)
      )
    `),
    loadOwnedRows(supabase, user.id, "internal_audit_findings", `
      id,audit_id,finding_reference,title,finding_type,risk_level,status,
      process_area,agreed_date,closure_verified,linked_rca_case_id,updated_at
    `),
    loadOwnedRows(supabase, user.id, "internal_audit_action_access",
      "id,finding_id,status,submitted_at,updated_at"),
  ]);

  const organisationName = organisations.length === 1
    ? organisations[0].name
    : organisations.length > 1
      ? `Your audit portfolio · ${organisations.length} organisations`
      : "Your organisation";

  return <InternalAuditHubDashboard
    organisationName={organisationName}
    audits={audits}
    findings={findings}
    actions={actions}
    dataComplete={true}
    snapshotAt={new Date().toISOString()}
  />;
}
