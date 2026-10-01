import Link from "next/link";
import { redirect } from "next/navigation";
import BCPIncidentManagement from "../../../../components/BCPIncidentManagement";
import { createClient } from "../../../../lib/supabase/server";
import { saveIncidentManagement } from "./actions";

export const metadata = { title: "Incident Management, Response & Recovery | RPG Excellence" };
export const dynamic = "force-dynamic";

export default async function IncidentManagementPage({ searchParams }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/business-continuity/incident-management");
  const { data: organization } = await supabase.from("organizations").select("id,name").eq("owner_id", user.id).order("created_at").limit(1).maybeSingle();
  let profiles = [], contexts = [], roles = [], hazards = [], bias = [], strategies = [], people = [], initial = null;
  if (organization) {
    const load = (table) => supabase.from(table).select("*").eq("organization_id", organization.id).neq("status", "archived").order("updated_at", { ascending: false });
    const results = await Promise.all([
      load("bcp_site_profiles"), load("bcp_context_assessments"), load("bcp_role_assessments"),
      load("bcp_hazard_assessments"), load("bcp_bia_assessments"), load("bcp_strategy_assessments"),
      supabase.from("organization_people").select("id,first_name,last_name,email,position,account_status").eq("organization_id", organization.id).not("account_status", "in", "(suspended,closed)").order("last_name"),
    ]);
    [profiles, contexts, roles, hazards, bias, strategies, people] = results.map((result) => result.data || []);
    if (params?.new !== "1") {
      let query = supabase.from("bcp_incident_management_assessments").select("*").eq("organization_id", organization.id).neq("status", "archived");
      if (params?.id) query = query.eq("id", params.id);
      ({ data: initial } = await query.order("updated_at", { ascending: false }).limit(1).maybeSingle());
    }
  }
  return <main style={{ minHeight: "100vh", padding: "26px 2vw 80px", background: "#edf3f8", fontFamily: "Arial,sans-serif" }}><div style={{ maxWidth: 1840, margin: "auto" }}>
    <header style={{ display: "flex", justifyContent: "space-between", gap: 20, marginBottom: 20 }}><div><small style={{ color: "#6845d1", fontWeight: 900, letterSpacing: ".1em" }}>BCP HUB · MODULE 9 · ISO 22301 CLAUSE 8.4</small><h1 style={{ margin: "7px 0", color: "#071d3a", fontSize: 42 }}>Incident Management, Response &amp; Recovery</h1><p style={{ margin: 0, color: "#62788e" }}>Turn approved risks and continuity solutions into an actionable response structure, communication system and controlled recovery process.</p></div><div style={{ display: "flex", gap: 8 }}><Link href="/portal/business-continuity/incident-management?new=1" style={{ padding: "11px 14px", borderRadius: 8, background: "#315fe6", color: "#fff", textDecoration: "none", fontWeight: 850 }}>+ New assessment</Link><Link href="/portal/business-continuity" style={{ padding: "11px 14px", border: "1px solid #c5d3e0", borderRadius: 8, background: "#fff", color: "#173b60", textDecoration: "none", fontWeight: 850 }}>← BCP Hub</Link></div></header>
    <BCPIncidentManagement action={saveIncidentManagement} profiles={profiles} contexts={contexts} roles={roles} hazards={hazards} bias={bias} strategies={strategies} people={people} initial={initial} organisationName={organization?.name || ""} startStep={params?.step || 0}/>
  </div></main>;
}
