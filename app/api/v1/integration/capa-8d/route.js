import {
  integrationJson,
  withIntegrationRequest,
  recordIntegrationEvent,
  requireIntegrationClient,
} from "../../../../../lib/integration-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_CASE_TYPES = new Set(["capa", "8d"]);
const ALLOWED_STATUSES = new Set([
  "draft",
  "active",
  "effectiveness_review",
  "closed",
  "cancelled",
]);
const ALLOWED_SEVERITIES = new Set(["critical", "high", "medium", "low"]);
const ALLOWED_SOURCE_TYPES = new Set([
  "assessment_finding",
  "audit",
  "complaint",
  "incident",
  "defect",
  "supplier",
  "standalone",
]);

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed)
    ? Math.min(maximum, Math.max(minimum, parsed))
    : fallback;
}

function validDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export const GET = withIntegrationRequest(async function GET(request) {
  const authentication = await requireIntegrationClient(request, "capa:read");
  if (authentication.error) return authentication.error;

  const { admin, client, requestId } = authentication;
  const parameters = new URL(request.url).searchParams;
  const page = boundedInteger(parameters.get("page"), 1, 1, 100000);
  const pageSize = boundedInteger(parameters.get("page_size"), 25, 1, 100);
  const caseType = parameters.get("case_type");
  const status = parameters.get("status");
  const severity = parameters.get("severity");
  const sourceType = parameters.get("source_type");
  const targetBefore = validDate(parameters.get("target_before"));

  if (caseType && !ALLOWED_CASE_TYPES.has(caseType)) {
    return integrationJson(
      { error: "invalid_case_type", message: "Use capa or 8d." },
      400,
      requestId
    );
  }
  if (status && !ALLOWED_STATUSES.has(status)) {
    return integrationJson(
      { error: "invalid_status", message: "The requested CAPA-8D status is not supported." },
      400,
      requestId
    );
  }
  if (severity && !ALLOWED_SEVERITIES.has(severity)) {
    return integrationJson(
      { error: "invalid_severity", message: "Use critical, high, medium or low." },
      400,
      requestId
    );
  }
  if (sourceType && !ALLOWED_SOURCE_TYPES.has(sourceType)) {
    return integrationJson(
      { error: "invalid_source_type", message: "The requested CAPA-8D source type is not supported." },
      400,
      requestId
    );
  }
  if (targetBefore === undefined) {
    return integrationJson(
      { error: "invalid_date", message: "Use a valid ISO date for target_before." },
      400,
      requestId
    );
  }

  const firstRow = (page - 1) * pageSize;
  const lastRow = firstRow + pageSize - 1;
  let query = admin
    .from("rca_cases")
    .select(
      `id,case_reference,title,problem_statement,case_type,source_type,severity,
       status,current_discipline,capa_current_stage,target_close_date,detected_at,
       created_at,closed_at,updated_at`,
      { count: "exact" }
    )
    .eq("organization_id", client.organization_id)
    .order("updated_at", { ascending: false })
    .order("id", { ascending: true }).range(firstRow, lastRow);

  if (caseType) query = query.eq("case_type", caseType);
  if (status) query = query.eq("status", status);
  if (severity) query = query.eq("severity", severity);
  if (sourceType) query = query.eq("source_type", sourceType);
  if (targetBefore) query = query.lte("target_close_date", targetBefore);

  const { data, count, error } = await query;
  if (error) {
    await recordIntegrationEvent({
      admin,
      client,
      request,
      requestId,
      eventType: "capa_8d_read_failed",
      resourceType: "rca_case",
      responseStatus: 500,
      errorSummary: error.message,
    });
    return integrationJson(
      { error: "capa_8d_unavailable", message: "The CAPA-8D register could not be retrieved." },
      500,
      requestId
    );
  }

  await recordIntegrationEvent({
    admin,
    client,
    request,
    requestId,
    eventType: "capa_8d_read",
    resourceType: "rca_case",
    responseStatus: 200,
  });

  const total = count || 0;
  return integrationJson(
    {
      data: data || [],
      pagination: {
        page,
        page_size: pageSize,
        total,
        total_pages: total ? Math.ceil(total / pageSize) : 0,
      },
      filters: {
        case_type: caseType || null,
        status: status || null,
        severity: severity || null,
        source_type: sourceType || null,
        target_before: targetBefore || null,
      },
      request_id: requestId,
    },
    200,
    requestId
  );
});
