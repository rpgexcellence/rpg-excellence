import {
  integrationJson,
  recordIntegrationEvent,
  requireIntegrationClient,
} from "../../../../../lib/integration-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = new Set(["directory", "invited", "active", "suspended", "closed"]);

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed)
    ? Math.min(maximum, Math.max(minimum, parsed))
    : fallback;
}

function cleanFilter(value, maximum = 180) {
  const cleaned = String(value || "").trim();
  return cleaned ? cleaned.slice(0, maximum) : null;
}

export async function GET(request) {
  const authentication = await requireIntegrationClient(request, "people:read");
  if (authentication.error) return authentication.error;

  const { admin, client, requestId } = authentication;
  const parameters = new URL(request.url).searchParams;
  const page = boundedInteger(parameters.get("page"), 1, 1, 100000);
  const pageSize = boundedInteger(parameters.get("page_size"), 25, 1, 100);
  const status = parameters.get("account_status");
  const site = cleanFilter(parameters.get("site"));
  const department = cleanFilter(parameters.get("department"));

  if (status && !ALLOWED_STATUSES.has(status)) {
    return integrationJson(
      { error: "invalid_account_status", message: "The requested Company User status is not supported." },
      400,
      requestId
    );
  }

  const firstRow = (page - 1) * pageSize;
  const lastRow = firstRow + pageSize - 1;
  let query = admin
    .from("organization_people")
    .select(
      `id,first_name,last_name,email,position,department,site,account_type,
       account_status,manager_person_id,functional_manager_person_id,
       deputy_person_id,created_at,updated_at`,
      { count: "exact" }
    )
    .eq("organization_id", client.organization_id)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (status) query = query.eq("account_status", status);
  if (site) query = query.ilike("site", site);
  if (department) query = query.ilike("department", department);

  const { data, count, error } = await query.range(firstRow, lastRow);
  if (error) {
    await recordIntegrationEvent({
      admin,
      client,
      request,
      requestId,
      eventType: "people_read_failed",
      resourceType: "organization_person",
      responseStatus: 500,
      errorSummary: error.message,
    });
    return integrationJson(
      {
        error: "people_unavailable",
        message: "The Company User directory could not be retrieved.",
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
    eventType: "people_read",
    resourceType: "organization_person",
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
        account_status: status || null,
        site,
        department,
      },
      request_id: requestId,
    },
    200,
    requestId
  );
}
