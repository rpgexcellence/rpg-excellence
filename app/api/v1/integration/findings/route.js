import {
  integrationJson,
  withIntegrationRequest,
  recordIntegrationEvent,
  requireIntegrationClient,
} from "../../../../../lib/integration-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(["major_nc", "minor_nc"]);
const ALLOWED_STATUSES = new Set([
  "open",
  "assigned",
  "in_progress",
  "action_in_progress",
  "submitted",
  "returned",
  "closed",
]);

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed)
    ? Math.min(maximum, Math.max(minimum, parsed))
    : fallback;
}

export const GET = withIntegrationRequest(async function GET(request) {
  const authentication = await requireIntegrationClient(request, "findings:read");
  if (authentication.error) return authentication.error;

  const { admin, client, requestId } = authentication;
  const parameters = new URL(request.url).searchParams;
  const page = boundedInteger(parameters.get("page"), 1, 1, 100000);
  const pageSize = boundedInteger(parameters.get("page_size"), 25, 1, 100);
  const status = parameters.get("status");
  const findingType = parameters.get("finding_type");

  if (status && !ALLOWED_STATUSES.has(status)) {
    return integrationJson(
      { error: "invalid_status", message: "The requested finding status is not supported." },
      400,
      requestId
    );
  }
  if (findingType && !ALLOWED_TYPES.has(findingType)) {
    return integrationJson(
      { error: "invalid_finding_type", message: "Use major_nc or minor_nc." },
      400,
      requestId
    );
  }

  const firstRow = (page - 1) * pageSize;
  const lastRow = firstRow + pageSize - 1;
  let query = admin
    .from("integration_finding_export")
    .select(
      "id,audit_id,supplier_id,finding_reference,finding_type,risk_level,title,failure_statement,criteria,process_area,responsible_owner_name,agreed_date,status,linked_rca_case_id,closure_verified,source_type,source_category,source_reference,detected_at,created_at,updated_at,closed_at,closure_verified_at",
      { count: "exact" }
    )
    .eq("organization_id", client.organization_id)
    .in("finding_type", ["major_nc", "minor_nc"])
    .order("created_at", { ascending: false })
    .order("id", { ascending: true }).range(firstRow, lastRow);

  if (status) query = query.eq("status", status);
  if (findingType) query = query.eq("finding_type", findingType);

  const { data, count, error } = await query;
  if (error) {
    await recordIntegrationEvent({
      admin,
      client,
      request,
      requestId,
      eventType: "findings_read_failed",
      resourceType: "internal_audit_finding",
      responseStatus: 500,
      errorSummary: error.message,
    });
    return integrationJson(
      { error: "findings_unavailable", message: "The findings register could not be retrieved." },
      500,
      requestId
    );
  }

  await recordIntegrationEvent({
    admin,
    client,
    request,
    requestId,
    eventType: "findings_read",
    resourceType: "internal_audit_finding",
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
        status: status || null,
        finding_type: findingType || null,
      },
      request_id: requestId,
    },
    200,
    requestId
  );
});
