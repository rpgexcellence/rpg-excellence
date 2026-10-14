import {
  integrationJson,
  recordIntegrationEvent,
  requireIntegrationClient,
} from "../../../../../lib/integration-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = new Set([
  "draft",
  "pending_approval",
  "approved",
  "conditionally_approved",
  "suspended",
]);
const ALLOWED_CRITICALITIES = new Set(["low", "medium", "high", "critical"]);
const ALLOWED_REVIEW_STATUSES = new Set(["due_30_days", "overdue"]);

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed)
    ? Math.min(maximum, Math.max(minimum, parsed))
    : fallback;
}

function dateOnly(date) {
  return date.toISOString().slice(0, 10);
}

export async function GET(request) {
  const authentication = await requireIntegrationClient(request, "suppliers:read");
  if (authentication.error) return authentication.error;

  const { admin, client, requestId } = authentication;
  const parameters = new URL(request.url).searchParams;
  const page = boundedInteger(parameters.get("page"), 1, 1, 100000);
  const pageSize = boundedInteger(parameters.get("page_size"), 25, 1, 100);
  const status = parameters.get("approval_status");
  const criticality = parameters.get("criticality");
  const reviewStatus = parameters.get("review_status");

  if (status && !ALLOWED_STATUSES.has(status)) {
    return integrationJson(
      { error: "invalid_approval_status", message: "The requested supplier approval status is not supported." },
      400,
      requestId
    );
  }
  if (criticality && !ALLOWED_CRITICALITIES.has(criticality)) {
    return integrationJson(
      { error: "invalid_criticality", message: "Use low, medium, high or critical." },
      400,
      requestId
    );
  }
  if (reviewStatus && !ALLOWED_REVIEW_STATUSES.has(reviewStatus)) {
    return integrationJson(
      { error: "invalid_review_status", message: "Use due_30_days or overdue." },
      400,
      requestId
    );
  }

  const today = dateOnly(new Date());
  const reviewLimitDate = new Date();
  reviewLimitDate.setUTCDate(reviewLimitDate.getUTCDate() + 30);
  const reviewLimit = dateOnly(reviewLimitDate);
  const firstRow = (page - 1) * pageSize;
  const lastRow = firstRow + pageSize - 1;
  let query = admin
    .from("suppliers")
    .select(
      `id,supplier_reference,legal_name,trading_name,country,supply_description,
       supplier_types,applicable_standards,sites_and_scope,uses_subtier_suppliers,
       criticality,risk_result,assurance_result,approval_status,approval_scope,
       approval_conditions,approved_at,approval_expiry,review_frequency_months,
       next_review_date,version,created_at,updated_at`,
      { count: "exact" }
    )
    .eq("organization_id", client.organization_id)
    .order("updated_at", { ascending: false });

  if (status) query = query.eq("approval_status", status);
  if (criticality) query = query.eq("criticality", criticality);
  if (reviewStatus === "due_30_days") {
    query = query.gte("next_review_date", today).lte("next_review_date", reviewLimit);
  }
  if (reviewStatus === "overdue") query = query.lt("next_review_date", today);

  const { data, count, error } = await query.range(firstRow, lastRow);
  if (error) {
    await recordIntegrationEvent({
      admin,
      client,
      request,
      requestId,
      eventType: "suppliers_read_failed",
      resourceType: "supplier",
      responseStatus: 500,
      errorSummary: error.message,
    });
    return integrationJson(
      {
        error: "suppliers_unavailable",
        message: "The supplier register could not be retrieved.",
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
    eventType: "suppliers_read",
    resourceType: "supplier",
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
        approval_status: status || null,
        criticality: criticality || null,
        review_status: reviewStatus || null,
      },
      request_id: requestId,
    },
    200,
    requestId
  );
}
