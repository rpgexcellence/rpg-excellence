import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import ISMSWorkspaceShell from "../../../../components/ISMSWorkspaceShell";
import RiskHeatMap from "./RiskHeatMap";
import { soaBoardMetrics } from "./soa-board-metrics.mjs";
import Board from "./Board";
import styles from "./board.module.css";
import ISMSDashboardRiskHeatMap from "../../../../components/ISMSDashboardRiskHeatMap";
import { managementReview } from "./leadership.mjs";
import { getOrganizationAccess } from "../../../../lib/organization-access";
import { loadPortfolioHeatMap, loadSecurityBoard, readRows } from "./board-data";
import { boardDate, controlMetrics, securityMetrics, THEMES } from "./metrics.mjs";

export const metadata = { title: "Information Security Management Board | RPG Excellence" };
export const dynamic = "force-dynamic";

export default async function SoaManagementBoard({ searchParams }) {
  const filters = await searchParams;
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/soa/management-board");

  const [{ data: organisations, error: orgError }, { data: catalog, error: catalogError }] = await Promise.all([
    supabase.from("organizations").select("id,name").eq("owner_id", user.id),
    supabase.from("iso27001_control_catalog").select("control_id,control_title,theme").eq("active", true),
  ]);
  if (orgError || catalogError) throw new Error((orgError || catalogError).message);

  const requestedAssessment = typeof filters?.assessment === "string" ? filters.assessment : "all";
  const theme = Object.hasOwn(THEMES, filters?.theme) ? filters.theme : "all";
  const orgMap = new Map((organisations ?? []).map(item => [item.id, item.name]));
  const catalogMap = new Map((catalog ?? []).map(item => [item.control_id, item]));
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
    loadPortfolioHeatMap(supabase, organization, user.id, ownsOrganization),
  ]);
  const [records, companyRegisters, companyEntries, portfolio] = stored;
  const assessment = companyRegisters?.some(row => row.assessment_id === requestedAssessment) ? requestedAssessment : "all";
  const visibleRegisters = (companyRegisters ?? []).filter(row => assessment === "all" || row.assessment_id === assessment);
  const visibleAssessmentIds = new Set(visibleRegisters.map(row => row.assessment_id));
  const visibleEntries = (companyEntries ?? []).filter(row => visibleAssessmentIds.has(row.assessment_id) && (theme === "all" || catalogMap.get(row.control_id)?.theme === theme));
  const entries = companyEntries && companyRegisters ? visibleEntries : null;
  const controls = entries ? controlMetrics(entries, catalogMap) : null;
  const security = securityMetrics(records, today, year, quarter);
  const review = managementReview({ security, treatments: records.treatments, controls, today,
    entries, registers: companyRegisters ? visibleRegisters : null });
  const overviewReview = managementReview({ security, treatments: records.treatments, today, includeSoa: false });
  const findings = theme === "all" && visibleRegisters.length
    ? await readRows(() => admin.from("assessment_findings")
        .select("id,assessment_id,status,finding_type")
        .eq("owner_id", user.id).in("assessment_id", [...visibleAssessmentIds])
        .not("status", "in", "(closed,withdrawn)").neq("finding_type", "conformity").order("id"), "SoA findings")
    : theme === "all" && companyRegisters ? [] : null;
  const soa = soaBoardMetrics({ entries, controls, registers: companyRegisters ? visibleRegisters : null, review, findings, catalog: catalogMap });
  const treatmentYears = records.treatments?.map(row => row.target_date?.slice(0, 4)).filter(Boolean) ?? [];
  const soaOptions = (companyRegisters ?? []).map(row => ({ ...row, label: `${organization.name} · v${row.version} · ${row.status} · ${row.assessment_id.slice(0, 8)}` }));
  return <ISMSWorkspaceShell active="soa-board"><main className={styles.boardPage}><div className={styles.boardShell}>
    <Board scopes={scopes} organization={organization} accessOrganizationId={access.organization?.id}
      portfolioHeatMap={portfolio.risks
        ? <ISMSDashboardRiskHeatMap key={organization.id} risks={portfolio.risks} appetite={portfolio.appetite} canOpenRisks={ownsOrganization}/>
        : <p>Risk positions are unavailable for this organisation.</p>}
      today={today} security={security} review={review} overviewReview={overviewReview} controls={controls} soa={soa}
      values={{ org: organization?.id ?? "", assessment, theme, year, quarter,
        view: filters?.view, detail: typeof filters?.detail === "string" ? filters.detail : "",
        page: Math.max(1, Number.parseInt(filters?.page, 10) || 1), treatmentYears, soaOptions }}>
      {entries ? <RiskHeatMap key={[organization?.id, assessment, theme].join(":")} risks={soa.mapped}/> : <p>SoA control records are unavailable for this scope.</p>}
    </Board>
  </div></main></ISMSWorkspaceShell>;
}
