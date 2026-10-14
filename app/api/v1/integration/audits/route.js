import {
  integrationJson,
  recordIntegrationEvent,
  requireIntegrationClient,
} from "../../../../../lib/integration-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set([
  "internal_system",
  "internal_process",
  "internal_compliance",
  "supplier",
  "second_party",
  "follow_up",
  "integrated",
]);

const ALLOWED_STATUSES = new Set([
  "draft",
  "active",
  "in_progress",
  "report_draft",
  "report_approved",
  "capa_monitoring",
  "effectiveness_review",
  "closed",
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

export async function GET(request) {
  const authentication = await requireIntegrationClient(request, "audits:read");
  if (authentication.error) return authentication.error;

  const { admin, client, requestId } = authentication;
  const parameters = new URL(request.url).searchParams;
  const page = boundedInteger(parameters.get("page"), 1, 1, 100000);
  const pageSize = boundedInteger(parameters.get("page_size"), 25, 1, 100);
  const status = parameters.get("status");
  const auditType = parameters.get("audit_type");
  const plannedFrom = validDate(parameters.get("planned_from"));
  const plannedTo = validDate(parameters.get("planned_to"));

  if (status && !ALLOWED_STATUSES.has(status)) {
    return integrationJson(
      { error: "invalid_status", message: "The requested audit status is not supported." },
      400,
      requestId
    );
  }
  if (auditType && !ALLOWED_TYPES.has(auditType)) {
    return integrationJson(
      { error: "invalid_audit_type", message: "The requested audit type is not supported." },
      400,
      requestId
    );
  }
  if (plannedFrom === undefined || plannedTo === undefined) {
    return integrationJson(
      { error: "invalid_date", message: "Use a valid ISO date for planned_from and planned_to." },
      400,
      requestId
    );
  }
  if (plannedFrom && plannedTo && plannedFrom > plannedTo) {
    return integrationJson(
      { error: "invalid_date_range", message: "planned_from must be before planned_to." },
      400,
      requestId
    );
  }

  const firstRow = (page - 1) * pageSize;
  const lastRow = firstRow + pageSize - 1;
  let query = admin
    .from("internal_audits")
    .select(
      `id,audit_reference,title,audit_type,audit_method,status,current_gate,
       planned_start_at,planned_end_at,updated_at`,
      { count: "exact" }
    )
    .eq("owner_id", client.owner_id)
    .order("updated_at", { ascending: false })
    .range(firstRow, lastRow);

  if (status) query = query.eq("status", status);
  if (auditType) query = query.eq("audit_type", auditType);
  if (plannedFrom) query = query.gte("planned_start_at", plannedFrom);
  if (plannedTo) query = query.lte("planned_start_at", plannedTo);

  const { data, count, error } = await query;
  if (error) {
    await recordIntegrationEvent({
      admin,
      client,
      request,
      requestId,
      eventType: "audits_read_failed",
      resourceType: "internal_audit",
      responseStatus: 500,
      errorSummary: error.message,
    });
    return integrationJson(
      {
        error: "audits_unavailable",
        message: "The internal audit register could not be retrieved.",
        diagnostic_code: error.code || "database_query_failed",
      },
      500,
      requestId
    );
  }

  await recordIntegrationEvent({
    admin,
    client,
    request,
    requestId,
    eventType: "audits_read",
    resourceType: "internal_audit",
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
        audit_type: auditType || null,
        planned_from: plannedFrom || null,
        planned_to: plannedTo || null,
      },
      request_id: requestId,
    },
    200,
    requestId
  );
}
