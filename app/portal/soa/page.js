import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import { createAdminClient } from "../../../lib/supabase/admin";
import { getAvailableStandaloneSoaPasses, getUserSubscription, hasActiveSubscription } from "../../../lib/subscription";
import { createStandaloneSoa } from "../actions";
import ISMSWorkspaceShell from "../../../components/ISMSWorkspaceShell";
import SoaRegister from "./SoaRegister";
import { summarizeControls } from "./soa-register.mjs";
import s from "../documents/documents.module.css";

export const metadata = { title: "Statement of Applicability Register | RPG Intelligence" };
export const dynamic = "force-dynamic";

async function readRows(query, source) {
  const size = 500;
  const rows = [];
  for (let offset = 0; ; offset += size) {
    const { data, error } = await query().range(offset, offset + size - 1);
    if (error) throw new Error("The SoA register could not load " + source + ".");
    rows.push(...(data ?? []));
    if (!data || data.length < size) return rows;
  }
}

function byAssessment(items) {
  const groups = new Map();
  for (const item of items) {
    if (!groups.has(item.assessment_id)) groups.set(item.assessment_id, []);
    groups.get(item.assessment_id).push(item);
  }
  return groups;
}

export default async function SoaRegisterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/soa");

  const [organisations, assessments, registers, subscription, passes] = await Promise.all([
    readRows(() => supabase.from("organizations").select("id,name").eq("owner_id", user.id).order("created_at").order("id"), "organisations"),
    readRows(() => supabase.from("assessments").select("id,organization_id,standard,workspace_type,created_at")
      .eq("owner_id", user.id).in("standard", ["ISO/IEC 27001:2022", "ISO/IEC 27001:2022/Amd 1:2024"])
      .order("created_at", { ascending: false }).order("id"), "assessments"),
    readRows(() => supabase.from("assessment_soa_registers").select("id,assessment_id,status,version,updated_at,approved_at")
      .eq("owner_id", user.id).order("assessment_id"), "statements"),
    getUserSubscription(user.id),
    getAvailableStandaloneSoaPasses(user.id),
  ]);
  const registerByAssessment = new Map(registers.map(register => [register.assessment_id, register]));
  const statements = assessments.filter(assessment => registerByAssessment.has(assessment.id));
  const organisation = organisations[0];
  const orgNames = new Map(organisations.map(item => [item.id, item.name]));
  const catalog = statements.length ? await readRows(
    () => supabase.from("iso27001_control_catalog").select("control_id,control_title").eq("active", true).order("control_order").order("control_id"),
    "the Annex A catalogue",
  ) : [];
  const admin = statements.length ? createAdminClient() : null;
  const rows = [];
  for (let start = 0; start < statements.length; start += 50) {
    const batch = statements.slice(start, start + 50);
    const ids = batch.map(assessment => assessment.id);
    // Scope service queries to assessments already returned by the signed-in owner's session.
    const scoped = (table, columns) => admin.from(table).select(columns)
      .eq("owner_id", user.id).in("assessment_id", ids).order("assessment_id").order("control_id");
    const [entryRows, fileRows, linkRows] = await Promise.all([
      readRows(() => scoped("assessment_soa_entries", "assessment_id,soa_register_id,control_id,applicability,applicability_justification,implementation_status,implementation_evidence,inclusion_source"), "control decisions"),
      readRows(() => scoped("soa_control_evidence", "assessment_id,control_id,evidence_kind").order("id"), "evidence metadata"),
      readRows(() => scoped("isms_risk_controls", "assessment_id,control_id,risk_id,organization_id").order("risk_id"), "risk-treatment links"),
    ]);
    const riskIds = [...new Set(linkRows.map(link => link.risk_id))];
    const risks = [];
    for (let offset = 0; offset < riskIds.length; offset += 100) {
      const chunk = riskIds.slice(offset, offset + 100);
      risks.push(...await readRows(() => supabase.from("isms_risks").select("id,organization_id,risk_reference,title,status")
        .eq("owner_id", user.id).in("id", chunk).order("id"), "linked risks"));
    }
    const riskById = new Map(risks.map(risk => [risk.id, risk]));
    const entries = byAssessment(entryRows);
    const files = byAssessment(fileRows);
    const links = byAssessment(linkRows);
    for (const assessment of batch) {
      const register = registerByAssessment.get(assessment.id);
      const standalone = assessment.workspace_type === "soa_only";
      const assessmentLinks = (links.get(assessment.id) ?? []).filter(link => link.organization_id === assessment.organization_id);
      const assessmentRisks = assessmentLinks.map(link => riskById.get(link.risk_id))
        .filter(risk => risk && risk.organization_id === assessment.organization_id);
      const summary = summarizeControls(catalog,
        (entries.get(assessment.id) ?? []).filter(entry => entry.soa_register_id === register.id),
        files.get(assessment.id) ?? [], assessmentLinks, assessmentRisks);
      rows.push({
        id: assessment.id,
        reference: "SOA-" + register.id.toUpperCase(),
        type: standalone ? "standalone" : "assessment",
        title: standalone ? "Standalone Statement of Applicability" : "Assessment-linked Statement of Applicability",
        organization: orgNames.get(assessment.organization_id) ?? "Organisation",
        version: register.version || "1.0",
        updatedAt: register.updated_at,
        approvedAt: register.approved_at,
        status: register.status || "draft",
        assessmentReference: standalone ? null : assessment.id,
        summary,
      });
    }
  }

  const activePlan = hasActiveSubscription(subscription);
  return <ISMSWorkspaceShell active="soa">
    <SoaRegister rows={rows}>
      {organisation && (activePlan || passes.length > 0) && <form action={createStandaloneSoa}>
        <input type="hidden" name="organization_id" value={organisation.id}/>
        <button className={s.recordButton}>Create 93-control SoA</button>
        {passes.length > 0 && <p>{passes.length} purchased workspace{passes.length === 1 ? "" : "s"} available</p>}
      </form>}
      {!activePlan && passes.length === 0 && <Link href="/en/pricing" className={s.recordButton}>View standalone offer</Link>}
    </SoaRegister>
  </ISMSWorkspaceShell>;
}
