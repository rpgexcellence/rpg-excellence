import {
  integrationJson,
  recordIntegrationEvent,
  requireIntegrationClient,
} from "../../../../../lib/integration-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = new Set([
  "planned",
  "due",
  "in_progress",
  "awaiting_review",
  "actions_open",
  "awaiting_verification",
  "completed",
  "closed",
  "cancelled",
]);

const ALLOWED_RISK_BANDS = new Set([
  "low",
  "moderate",
  "high",
  "critical",
]);

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed)
    ? Math.min(maximum, Math.max(minimum, parsed))
    : fallback;
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function invalidFilter(message, requestId) {
  return integrationJson(
    { error: "invalid_filter", message },
    400,
    requestId,
  );
}

export async function GET(request) {
  const authentication = await requireIntegrationClient(
    request,
    "workplace_inspections:read",
  );
  if (authentication.error) return authentication.error;

  const { admin, client, requestId } = authentication;
  const parameters = new URL(request.url).searchParams;
  const page = boundedInteger(parameters.get("page"), 1, 1, 100000);
  const pageSize = boundedInteger(parameters.get("page_size"), 25, 1, 100);
  const status = parameters.get("status");
  const riskBand = parameters.get("risk_band");
  const siteId = parameters.get("site_id");
  const programmeId = parameters.get("programme_id");
  const plannedFrom = parameters.get("planned_from");
  const plannedTo = parameters.get("planned_to");

  if (status && !ALLOWED_STATUSES.has(status)) {
    return invalidFilter(
      "Use planned, due, in_progress, awaiting_review, actions_open, awaiting_verification, completed, closed or cancelled for status.",
      requestId,
    );
  }
  if (riskBand && !ALLOWED_RISK_BANDS.has(riskBand)) {
    return invalidFilter(
      "Use low, moderate, high or critical for risk_band.",
      requestId,
    );
  }
  if (plannedFrom && !validDate(plannedFrom)) {
    return invalidFilter("planned_from must use YYYY-MM-DD.", requestId);
  }
  if (plannedTo && !validDate(plannedTo)) {
    return invalidFilter("planned_to must use YYYY-MM-DD.", requestId);
  }
  if (plannedFrom && plannedTo && plannedFrom > plannedTo) {
    return invalidFilter(
      "planned_from cannot be later than planned_to.",
      requestId,
    );
  }

  const firstRow = (page - 1) * pageSize;
  const lastRow = firstRow + pageSize - 1;
  let query = admin
    .from("hs_workplace_inspections")
    .select(
      "id,inspection_reference,title,inspection_type,programme_id,template_id," +
      "administration_location_id,administration_location_label,area_department," +
      "planned_start_at,planned_end_at,started_at,completed_at,status," +
      "lead_inspector_person_id,accountable_person_id,reviewer_person_id," +
      "planning_risk_score,planning_risk_band,planning_basis,scope,created_at,updated_at",
      { count: "exact" },
    )
    .eq("organization_id", client.organization_id)
    .order("planned_start_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (riskBand) query = query.eq("planning_risk_band", riskBand);
  if (siteId) query = query.eq("administration_location_id", siteId);
  if (programmeId) query = query.eq("programme_id", programmeId);
  if (plannedFrom) query = query.gte("planned_start_at", plannedFrom + "T00:00:00.000Z");
  if (plannedTo) query = query.lte("planned_start_at", plannedTo + "T23:59:59.999Z");

  const { data, count, error } = await query.range(firstRow, lastRow);
  if (error) {
    await recordIntegrationEvent({
      admin,
      client,
      request,
      requestId,
      eventType: "workplace_inspections_read_failed",
      resourceType: "workplace_inspection",
      responseStatus: 500,
      errorSummary: error.message,
    });
    return integrationJson(
      {
        error: "workplace_inspections_unavailable",
        message: "Workplace Inspection records could not be retrieved.",
        diagnostic_code: error.code || "database_query_failed",
      },
      500,
      requestId,
    );
  }

  await recordIntegrationEvent({
    admin,
    client,
    request,
    requestId,
    eventType: "workplace_inspections_read",
    resourceType: "workplace_inspection",
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
        risk_band: riskBand || null,
        site_id: siteId || null,
        programme_id: programmeId || null,
        planned_from: plannedFrom || null,
        planned_to: plannedTo || null,
      },
      request_id: requestId,
    },
    200,
    requestId,
  );
}
