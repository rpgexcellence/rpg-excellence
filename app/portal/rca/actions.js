"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import {
  getUserSubscription,
  hasActiveSubscription,
  hasPlanAccess,
} from "../../../lib/subscription";

import {loadRcaCompanyLinks,resolveRcaSource} from "../../../lib/rcaCompanyLinks";

import { requirePlanAccess } from "../../../lib/plan-access";
import { rcaDate, rcaExplorerRows, rcaExecutiveBrief } from "../../../lib/rca-reporting.mjs";

const SOURCE_TYPES = [
  "assessment_finding",
  "audit",
  "complaint",
  "incident",
  "defect",
  "supplier",
  "standalone",
];

const SEVERITIES = [
  "critical",
  "high",
  "medium",
  "low",
];

const clean = (value) =>
  typeof value === "string" && value.trim()
    ? value.trim()
    : null;

export async function createRcaCase(previousState,formData) {
  try {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/portal/login");
  }

  const subscription =
    await getUserSubscription(user.id);

  if (!hasActiveSubscription(subscription)) {
    redirect("/en/pricing?subscription=required");
  }

  const organizationId = clean(
    formData.get("organization_id")
  );
  const title = clean(formData.get("title"));
  const problemStatement = clean(
    formData.get("problem_statement")
  );
  const rawSourceType = clean(
    formData.get("source_type")
  );
  const rawSeverity = clean(
    formData.get("severity")
  );
  const sourceType = rawSourceType?.toLowerCase();
  const severity = rawSeverity?.toLowerCase();
  const caseType = clean(formData.get("case_type"))?.toLowerCase();

  if (!organizationId) {
    throw new Error("Organisation is required.");
  }

  if (!title) {
    throw new Error("8D case title is required.");
  }

  if (!SOURCE_TYPES.includes(sourceType)) {
    throw new Error("Invalid case source.");
  }

  if (!SEVERITIES.includes(severity)) {
    throw new Error("Invalid severity.");
  }
  if (!['capa','8d'].includes(caseType)) throw new Error("Select CAPA or 8D.");

  const {
    data: organization,
    error: organizationError,
  } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", organizationId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (organizationError || !organization) {
    throw new Error("Organisation not found.");
  }

  if (["audit","supplier"].includes(sourceType)) {
    const options=await loadRcaCompanyLinks(organization);
    const link=resolveRcaSource(options,formData);
    const {data:caseId,error}=await supabase.rpc("rca_open_linked_nc_case",{
      p_organization_id:organizationId,p_source_type:sourceType,p_audit_id:link.audit?.id || null,
      p_supplier_id:link.supplier?.id || null,p_finding_id:link.finding.id,p_title:title,p_problem:problemStatement,p_severity:severity
    });
    if(error || !caseId)throw new Error(error?.message || "Unable to open the linked NC case.");
    await supabase.from("rca_cases").update({case_type:caseType,capa_current_stage:caseType==="capa"?"correction":null}).eq("id",caseId).eq("owner_id",user.id);
    revalidatePath("/portal/rca");redirect(`/portal/rca/${caseId}`);
  }

  const {
    data: rcaCase,
    error: caseError,
  } = await supabase
    .from("rca_cases")
    .insert({
      owner_id: user.id,
      organization_id: organizationId,
      method: "8d",
      case_type: caseType,
      capa_current_stage: caseType === "capa" ? "correction" : null,
      source_type: sourceType,
      title,
      problem_statement: problemStatement,
      severity,
      status: "draft",
      current_discipline: 0,
      detected_at: new Date().toISOString(),
    })
    .select("id, case_reference")
    .single();

  if (caseError || !rcaCase) {
    throw new Error(
      caseError?.message ?? "Unable to create 8D case."
    );
  }

  const { error: eventError } = await supabase
    .from("rca_case_events")
    .insert({
      case_id: rcaCase.id,
      owner_id: user.id,
      event_type: "case_created",
      discipline: 0,
      summary: `${rcaCase.case_reference} created`,
      event_data: {
        source_type: sourceType,
        severity,
        case_type: caseType,
      },
    });

  if (eventError) {
    throw new Error(eventError.message);
  }

  revalidatePath("/portal/rca");
  redirect(`/portal/rca/${rcaCase.id}`);
  } catch(error) {if(error?.digest?.startsWith("NEXT_REDIRECT"))throw error;return {error:error.message || "Unable to create case."};}
}

// Management board reads and executive reporting are read-only. They retain
// the register's owner scope and the signed-in Supabase client's RLS checks.
async function rcaReportingContext(requiredPlan = "professional") {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/portal/login?next=/portal/rca?view=management-board");
  const subscription = await requirePlanAccess(user, requiredPlan, "CAPA 8D");
  return { supabase, user, subscription };
}

async function ownedReportingRows(context, table, { field, ids, order = ["id"] } = {}) {
  if (field && (!Array.isArray(ids) || !ids.length)) return [];
  const chunks = field
    ? Array.from({ length: Math.ceil(ids.length / 100) }, (_, index) => ids.slice(index * 100, index * 100 + 100))
    : [null];
  const rows = [];
  for (const chunk of chunks) {
    let offset = 0;
    let lastKey = null;
    while (true) {
      // Raw rows stay on the server. rcaExplorerRows below explicitly projects
      // only chart/report fields and excludes causal narratives and contacts.
      let query = context.supabase.from(table).select("*").eq("owner_id", context.user.id);
      if (field) query = query.in(field, chunk);
      for (const column of order) query = query.order(column, { ascending: true });
      const { data, error } = await query.range(offset, offset + 499);
      if (error) {
        console.error("RCA_MANAGEMENT_READ_FAILED", { table, code: error.code || "database_query_failed" });
        throw new Error("The CAPA-8D records could not be fully loaded. Please refresh or contact your administrator.");
      }
      const page = data || [];
      if (!page.length) break;
      const nextKey = order.map((column) => String(page[page.length - 1]?.[column] ?? "")).join("|");
      if (!nextKey.replaceAll("|", "") || nextKey === lastKey) {
        throw new Error("CAPA-8D record loading could not complete safely. Please refresh or contact your administrator.");
      }
      rows.push(...page);
      // Advance by the returned size, so a lower API row cap does not skip
      // records. A stable, unique ordering is supplied for every table.
      offset += page.length;
      lastKey = nextKey;
    }
  }
  return rows;
}

async function rcaManagementData(context) {
  const [cases, organisations] = await Promise.all([
    ownedReportingRows(context, "rca_cases"),
    ownedReportingRows(context, "organizations"),
  ]);
  const caseIds = cases.map((row) => row.id);
  const [causes, actions, disciplines, capaStages, findings] = await Promise.all([
    ownedReportingRows(context, "rca_causes", { field: "case_id", ids: caseIds }),
    ownedReportingRows(context, "rca_actions", { field: "case_id", ids: caseIds }),
    ownedReportingRows(context, "rca_8d_disciplines", { field: "case_id", ids: caseIds, order: ["case_id", "discipline"] }),
    ownedReportingRows(context, "rca_capa_stages", { field: "case_id", ids: caseIds, order: ["case_id", "stage_order"] }),
    ownedReportingRows(context, "internal_audit_findings", { field: "linked_rca_case_id", ids: caseIds }),
  ]);
  const authorisedCases = new Set(caseIds);
  const children = (rows) => rows.filter((row) => authorisedCases.has(row.case_id));
  const linkedFindings = findings.filter((row) => authorisedCases.has(row.linked_rca_case_id));
  const findingRanks = { major: 3, major_nc: 3, major_nonconformity: 3, minor: 2, minor_nc: 2, minor_nonconformity: 2 };
  const primaryFinding = new Map();
  for (const finding of linkedFindings) {
    const previous = primaryFinding.get(finding.linked_rca_case_id);
    if (!previous || (findingRanks[finding.finding_type] || 0) > (findingRanks[previous.finding_type] || 0)
      || ((findingRanks[finding.finding_type] || 0) === (findingRanks[previous.finding_type] || 0) && finding.id < previous.id)) {
      primaryFinding.set(finding.linked_rca_case_id, finding);
    }
  }
  const decoratedCases = cases.map((row) => ({ ...row, linked_finding_id: primaryFinding.get(row.id)?.id || row.linked_finding_id || null }));
  const rows = rcaExplorerRows(decoratedCases, {
    organizations: organisations,
    causes: children(causes), actions: children(actions),
    disciplines: children(disciplines), capaStages: children(capaStages),
    findings: linkedFindings,
  });
  const areas = new Map();
  for (const row of rows) {
    if (!areas.has(row.scopeKey)) areas.set(row.scopeKey, {
      key: row.scopeKey, label: row.location, organizationId: row.organizationId,
      organizationName: row.organizationName,
    });
  }
  return {
    rows,
    organizations: organisations.map((row) => ({ id: row.id, name: row.name || "Organisation" })),
    areas: [...areas.values()].sort((a, b) => a.organizationName.localeCompare(b.organizationName) || a.label.localeCompare(b.label)),
    snapshotAt: new Date().toISOString(),
    canGenerateExecutive: hasPlanAccess(context.subscription, "consultant"),
    ncClassificationBasis: "One case counted once, using the highest recorded linked NC classification. Linked findings are not added to the case total.",
    accessBasis: "Current signed-in user, existing owner scope and database row-level security.",
  };
}

export async function getRcaManagementSnapshot() {
  const context = await rcaReportingContext("professional");
  return rcaManagementData(context);
}

function reportingValue(formData, field, maximum = 220) {
  const value = formData.get(field);
  if (value == null || value === "") return null;
  if (typeof value !== "string" || value.length > maximum) throw new Error(`Invalid ${field} filter.`);
  return value.trim() || null;
}

function reportingValues(formData, field) {
  const values = formData.getAll(field);
  if (values.length > 100 || values.some((value) => typeof value !== "string" || value.length > 220)) {
    throw new Error(`Too many or invalid ${field} filters.`);
  }
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export async function generateRcaExecutiveReport(previousState, formData) {
  try {
    // Server actions are directly callable: never rely on a hidden button or
    // the parent layout alone for report entitlement or authentication.
    const context = await rcaReportingContext("consultant");
    if (!formData || typeof formData.get !== "function" || typeof formData.getAll !== "function") {
      throw new Error("Choose the executive-report scope.");
    }
    const from = reportingValue(formData, "from", 10);
    const to = reportingValue(formData, "to", 10);
    if (!from || !to || rcaDate(from) !== from || rcaDate(to) !== to || from > to) {
      throw new Error("Choose a valid From and To date, with From before To.");
    }
    const organizations = reportingValues(formData, "organizations");
    const areas = reportingValues(formData, "areas");
    const department = reportingValue(formData, "department");
    const source = reportingValue(formData, "source");
    const severity = reportingValue(formData, "severity");
    const type = reportingValue(formData, "type");
    if (source && ![...SOURCE_TYPES, "not_recorded"].includes(source)) throw new Error("Choose a recognised case source.");
    if (severity && ![...SEVERITIES, "unknown"].includes(severity)) throw new Error("Choose a recognised severity.");
    if (type && !["capa", "8d", "unknown"].includes(type)) throw new Error("Choose CAPA, 8D or all case types.");

    // Refresh on generation so amended classifications, reopened cases and
    // verification decisions are reflected in the report.
    const data = await rcaManagementData(context);
    const allowedOrganizations = new Set(data.organizations.map((row) => row.id));
    const allowedAreas = new Map(data.areas.map((row) => [row.key, row]));
    if (organizations.some((id) => !allowedOrganizations.has(id)) || areas.some((key) => !allowedAreas.has(key))) {
      throw new Error("The requested company or area is not available in your CAPA-8D portfolio.");
    }
    if (organizations.length && areas.some((key) => !organizations.includes(allowedAreas.get(key).organizationId))) {
      throw new Error("Choose areas belonging to the selected companies.");
    }
    if (department && !data.rows.some((row) => row.department === department)) throw new Error("Choose an available department.");
    const scope = { from, to, organizations, areas, department, source, severity, type };
    const report = rcaExecutiveBrief(data.rows, scope, data.snapshotAt);
    const selectedOrganizationIds = organizations.length ? organizations : areas.length
      ? [...new Set(areas.map((key) => allowedAreas.get(key).organizationId))]
      : [];
    const selectedOrganizations = data.organizations.filter((row) => !selectedOrganizationIds.length || selectedOrganizationIds.includes(row.id));
    return {
      report: {
        ...report,
        generatedAt: data.snapshotAt,
        companyName: selectedOrganizations.length === 1 ? selectedOrganizations[0].name : "CAPA-8D portfolio",
        organizations: selectedOrganizations,
        areas: data.areas.filter((row) => (!selectedOrganizationIds.length || selectedOrganizationIds.includes(row.organizationId))
          && (!areas.length || areas.includes(row.key))),
        ncClassificationBasis: data.ncClassificationBasis,
      },
      error: null,
    };
  } catch (error) {
    if (error?.digest?.startsWith("NEXT_REDIRECT") || error?.digest?.startsWith("NEXT_NOT_FOUND")) throw error;
    return { error: error?.message || "The CAPA-8D executive report could not be generated.", report: null };
  }
}
