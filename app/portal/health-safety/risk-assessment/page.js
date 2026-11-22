import { createAdminClient } from "../../../../lib/supabase/admin";
import { requireOrganizationAccess } from "../../../../lib/organization-access";
import RiskAssuranceCentre from "./RiskAssuranceCentre";
import { buildRegister, registerPath, validViews } from "./register-data.mjs";

export const metadata = { title: "H&S Risk Assurance Centre | RPG Excellence" };
export const dynamic = "force-dynamic";

async function registerRows(admin, organisationId, table, columns, revisionEvents = false) {
  const rows = [];
  const size = 500;
  for (let start = 0; ; start += size) {
    let query = admin.from(table).select(columns).eq("organization_id", organisationId).order("id");
    if (revisionEvents) query = query.eq("event_type", "revision_created");
    const { data, error } = await query.range(start, start + size - 1);
    if (error) throw new Error("The risk assessment register could not be loaded: " + error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < size) return rows;
  }
}

export default async function RiskAssurancePage({ searchParams }) {
  const [query, access] = await Promise.all([
    searchParams, requireOrganizationAccess("risk_management", "view", registerPath),
  ]);
  const admin = createAdminClient();
  const orgId = access.organization.id;
  const [assessments, hazards, actions, events] = await Promise.all([
    registerRows(admin, orgId, "hs_risk_assessments",
      "id,assessment_reference,title,version,status,assessment_type,site_location,area_department,assessor_name,review_date,updated_at"),
    registerRows(admin, orgId, "hs_risk_hazards",
      "id,assessment_id,hazard_description,hazard_category,current_score,current_likelihood,current_severity,residual_score,residual_likelihood,residual_severity"),
    registerRows(admin, orgId, "hs_risk_actions",
      "id,assessment_id,action_reference,action_required,status,target_date,priority"),
    registerRows(admin, orgId, "hs_risk_events", "id,assessment_id,event_data", true),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  return <RiskAssuranceCentre
    data={buildRegister(assessments, hazards, actions, events, today)}
    initialView={validViews.includes(query?.view) ? query.view : "all"}
    initialQuery={typeof query?.q === "string" ? query.q.trim() : ""}
    canContribute={["contribute", "review", "approve", "admin", "owner"].includes(access.level)}
  />;
}
