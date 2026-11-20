import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import ISMSWorkspaceShell from "../../../../components/ISMSWorkspaceShell";
import RiskHeatMap from "./RiskHeatMap";
import Board from "./Board";
import { managementReview } from "./leadership.mjs";
import { getOrganizationAccess } from "../../../../lib/organization-access";
import { loadSecurityBoard, readRows } from "./board-data";
import { boardDate, controlMetrics, percentage, securityMetrics, THEMES } from "./metrics.mjs";

export const metadata = { title: "Information Security Management Board | RPG Excellence" };
export const dynamic = "force-dynamic";

const riskLevel = (score) => score >= 17 ? "critical" : score >= 10 ? "high" : score >= 5 ? "moderate" : "low";

function percentText(numerator, denominator) {
  const percent = percentage(numerator, denominator);
  return percent === null ? null : percent + "%";
}

export default async function SoaManagementBoard({ searchParams }) {
  const filters = await searchParams;
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/soa/management-board");

  const [{ data: organisations, error: orgError }, { data: assessments, error: assessmentError }, { data: registers, error: registerError }, { data: entries, error: entryError }, { data: catalog, error: catalogError }, { data: findings, error: findingError }] = await Promise.all([
    supabase.from("organizations").select("id,name").eq("owner_id", user.id),
    supabase.from("assessments").select("id,organization_id,workspace_type").eq("owner_id", user.id),
    supabase.from("assessment_soa_registers").select("id,assessment_id,status,version,review_due_at,updated_at").eq("owner_id", user.id),
    supabase.from("assessment_soa_entries").select("assessment_id,control_id,applicability,implementation_status,residual_risk_level,residual_likelihood,residual_impact,residual_risk_score,treatment_decision,risk_owner,risk_review_due_at,action_required,target_date,finding_reference").eq("owner_id", user.id),
    supabase.from("iso27001_control_catalog").select("control_id,control_title,theme").eq("active", true),
    admin.from("assessment_findings").select("id,assessment_id,status,finding_type").eq("owner_id", user.id).neq("finding_type", "conformity"),
  ]);
  const error = orgError || assessmentError || registerError || entryError || catalogError || findingError;
  if (error) throw new Error(error.message);

  const requestedAssessment = typeof filters?.assessment === "string" ? filters.assessment : "all";
  const requestedTheme = typeof filters?.theme === "string" ? filters.theme : "all";
  const assessmentMap = new Map((assessments ?? []).map((item) => [item.id, item]));
  const orgMap = new Map((organisations ?? []).map((item) => [item.id, item.name]));
  const catalogMap = new Map((catalog ?? []).map((item) => [item.control_id, item]));
  const registerAssessmentIds = new Set((registers ?? []).map((item) => item.assessment_id));
  const scopedEntries = (entries ?? []).filter((entry) => registerAssessmentIds.has(entry.assessment_id) && (requestedAssessment === "all" || entry.assessment_id === requestedAssessment) && (requestedTheme === "all" || catalogMap.get(entry.control_id)?.theme === requestedTheme));
  const mapped = scopedEntries.filter((entry) => entry.residual_likelihood && entry.residual_impact);
  const heatRisks = mapped.map((entry) => { const assessment = assessmentMap.get(entry.assessment_id); const control = catalogMap.get(entry.control_id); const score = entry.residual_risk_score ?? entry.residual_likelihood * entry.residual_impact; return { assessmentId: entry.assessment_id, controlId: entry.control_id, title: control?.control_title ?? "Annex A control", theme: THEMES[control?.theme] ?? control?.theme ?? "Unclassified", organisation: orgMap.get(assessment?.organization_id) ?? "Organisation", likelihood: entry.residual_likelihood, impact: entry.residual_impact, score, level: riskLevel(score) }; });

  const access = await getOrganizationAccess("information_security", "view");
  const scopes = organisations?.length ? organisations : access.allowed && access.organization ? [access.organization] : [];
  const organization = scopes.find(row => row.id === filters?.org) ?? scopes.find(row => row.id === access.organization?.id) ?? scopes[0];
  const ownsOrganization = Boolean(organization && orgMap.has(organization.id));
  const today = boardDate();
  const year = typeof filters?.year === "string" && /^(19|20|21)\d{2}$/.test(filters.year) ? filters.year : today.slice(0, 4);
  const quarter = ["1", "2", "3", "4"].includes(filters?.quarter) ? filters.quarter : "all";
  const stored = await Promise.all([
    loadSecurityBoard(supabase, admin, organization, ownsOrganization, user.id),
    ownsOrganization ? readRows(
      () => supabase.from("assessment_soa_registers")
        .select("id,assessment_id,status,version,review_due_at,assessment:assessments!inner(organization_id)")
        .eq("owner_id", user.id).eq("assessment.organization_id", organization.id).order("id"),
      "assessment_soa_registers",
    ) : null,
    ownsOrganization ? readRows(
      () => supabase.from("assessment_soa_entries")
        .select("id,assessment_id,control_id,applicability,implementation_status,residual_risk_level,residual_likelihood,residual_impact,residual_risk_score,treatment_decision,risk_owner,risk_owner_person_id,action_status,action_required,target_date,assessment:assessments!inner(organization_id)")
        .eq("owner_id", user.id).eq("assessment.organization_id", organization.id).order("id"),
      "assessment_soa_entries",
    ) : null,
  ]);
  const [records, companyRegisters, companyEntries] = stored;
  const visibleRegisters = (companyRegisters ?? []).filter(row => requestedAssessment === "all" || row.assessment_id === requestedAssessment);
  const visibleAssessmentIds = new Set(visibleRegisters.map(row => row.assessment_id));
  const visibleEntries = (companyEntries ?? []).filter(row => visibleAssessmentIds.has(row.assessment_id) && (requestedTheme === "all" || catalogMap.get(row.control_id)?.theme === requestedTheme));
  const controls = companyEntries && companyRegisters ? controlMetrics(visibleEntries, catalogMap) : null;
  const security = securityMetrics(records, today, year, quarter);
  const review = managementReview({
    security, treatments: records.treatments, controls, today,
    entries: controls ? visibleEntries : null,
    registers: companyRegisters ? visibleRegisters : null,
  });
  const treatmentYears = records.treatments?.map(row => row.target_date?.slice(0, 4)).filter(Boolean) ?? [];
  const options = new Map();
  for (const row of [...(registers ?? []), ...(companyRegisters ?? [])]) {
    const assessedOrg = orgMap.get(assessmentMap.get(row.assessment_id)?.organization_id ?? row.assessment?.organization_id);
    options.set(row.assessment_id, { ...row, label: `${assessedOrg ?? "Organisation"} · v${row.version} · ${row.status}` });
  }
  const approved = visibleRegisters.filter(row => row.status === "approved").length;
  const visibleFindings = findings?.filter(row => visibleAssessmentIds.has(row.assessment_id) && !["closed", "withdrawn"].includes(row.status));
  const scores = visibleEntries.filter(row => row.residual_likelihood && row.residual_impact);
  const elevated = scores.filter(row => (row.residual_risk_score ?? row.residual_likelihood * row.residual_impact) >= 10).length;
  const missingOwners = controls?.applicable.filter(row => ["moderate", "high", "critical"].includes(row.residual_risk_level) && !row.risk_owner_person_id && !row.risk_owner);
  const actions = visibleEntries.filter(row => row.action_required && row.target_date && row.target_date < today && !["not_required", "verified", "cancelled"].includes(row.action_status));
  const legacy = [
    ["Approved SoA registers", companyRegisters ? `${approved} of ${visibleRegisters.length}` : null],
    ["Applicability decisions", controls ? percentText(controls.decided.length, visibleEntries.length) : null],
    ["Applicable controls implemented", controls ? percentText(controls.implemented.length, controls.applicable.length) : null],
    ["Elevated mapped SoA controls (score 10+)", controls ? elevated : null],
    ["Overdue SoA actions", controls ? actions.length : null],
    ["Open SoA findings (excluding conformity)", companyRegisters ? visibleFindings?.length : null],
    ["SoA accept / treat decisions", controls ? `${visibleEntries.filter(row => row.treatment_decision === "accept").length} / ${visibleEntries.filter(row => ["reduce", "avoid", "share"].includes(row.treatment_decision)).length}` : null],
    ["Unmapped controls / elevated controls without an owner", controls ? `${visibleEntries.length - scores.length} / ${missingOwners.length}` : null],
  ];

  return <ISMSWorkspaceShell active="soa-board"><main className="soaBoard"><style>{`
    *{box-sizing:border-box}.soaBoard{min-height:100vh;padding:32px 20px 72px;background:#edf3f8;color:#071a33;font-family:Arial,sans-serif}.soaBoardShell{max-width:1280px;margin:auto}.riskBoardHead span{color:#0b8e81;font-size:11px;font-weight:950;letter-spacing:.11em}.riskBoardHead p{margin:0;color:#62778e}.riskBoardPanel{padding:21px;border:1px solid #d7e2eb;border-radius:15px;background:#fff}.riskBoardPanel{margin-top:14px}.riskBoardHead{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.riskBoardHead h2{margin:5px 0}.riskBoardHead button{padding:10px 13px;border:1px solid #c8d7e3;border-radius:8px;background:#fff;font-weight:800}.riskBoardHead button:disabled{opacity:.45}.heatMapLayout{max-width:900px;margin:24px auto}.heatMapAxis{text-align:center;font-weight:900}.heatMap{display:grid;gap:5px}.heatRow,.likelihoodLabels{display:grid;grid-template-columns:115px repeat(5,1fr);gap:5px}.impactLabel{display:flex;flex-direction:column;justify-content:center;align-items:flex-end;padding-right:10px}.impactLabel small,.likelihoodLabels small{display:block;color:#6e8192;font-size:10px}.heatCell{position:relative;min-height:83px;border:3px solid transparent;border-radius:9px;cursor:pointer;display:grid;place-items:center;padding:7px}.heatCell.active{border-color:#071a33;box-shadow:0 0 0 3px #fff inset}.heatCell>b{position:absolute;left:7px;top:5px;font-size:11px}.heatCell>strong{font-size:27px}.heatCell>small{font-size:10px;font-weight:850}.likelihoodLabels{text-align:center;margin-top:3px}.likelihoodLabels span{font-weight:900}.likelihoodAxis{text-align:center;margin-left:115px;font-weight:900}.riskSelection{margin-top:22px;border-top:1px solid #e0e8ef;padding-top:16px}.riskRows{display:grid;gap:7px}.riskRows a{display:grid;grid-template-columns:1fr 110px 80px;gap:12px;align-items:center;padding:12px;border:1px solid #dce6ed;border-radius:9px;color:#163c55;text-decoration:none}.riskRows a:hover{background:#f3faf9}.riskRows small{display:block;margin-top:4px;color:#728698}.riskRows span,.riskRows b{text-align:right}.riskRows b{text-transform:capitalize}@media(max-width:900px){.heatCell{min-height:65px}.heatRow,.likelihoodLabels{grid-template-columns:85px repeat(5,1fr)}.impactLabel small,.likelihoodLabels small{display:none}.likelihoodAxis{margin-left:85px}}@media(max-width:620px){.heatCell{min-height:52px}.heatCell>small{display:none}.riskRows a{grid-template-columns:1fr auto}.riskRows a span{display:none}}
  `}</style><div className="soaBoardShell">
    <Board scopes={scopes} organization={organization} accessOrganizationId={access.organization?.id}
      today={today} security={security} review={review} controls={controls} registers={visibleRegisters} legacy={legacy}
      values={{ org: organization?.id ?? "", assessment: options.has(requestedAssessment) ? requestedAssessment : "all", theme: Object.hasOwn(THEMES, requestedTheme) ? requestedTheme : "all", year, quarter, detail: typeof filters?.detail === "string" ? filters.detail : "", page: Math.max(1, Number.parseInt(filters?.page, 10) || 1), treatmentYears, soaOptions: Array.from(options.values()) }}>
      <RiskHeatMap risks={heatRisks}/>
    </Board>
  </div></main></ISMSWorkspaceShell>;
}
