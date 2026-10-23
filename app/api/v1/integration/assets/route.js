import {
  integrationJson,
  withIntegrationRequest,
  recordIntegrationEvent,
  requireIntegrationClient,
} from "../../../../../lib/integration-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set([
  "plant",
  "equipment",
  "room_area",
  "electrical_system",
  "process_system",
  "vehicle",
  "other",
]);
const ALLOWED_STATUSES = new Set(["active", "out_of_service", "retired"]);
const ALLOWED_CRITICALITIES = new Set(["low", "medium", "high", "critical"]);
const ALLOWED_PPM_STATUSES = new Set(["required", "not_required", "due_30_days", "overdue"]);

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed)
    ? Math.min(maximum, Math.max(minimum, parsed))
    : fallback;
}

function dateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function ppmStatus(asset, today, dueLimit) {
  if (!asset.ppm_required) return "not_required";
  if (asset.operational_status === "active" && asset.next_maintenance_date < today) return "overdue";
  if (
    asset.operational_status === "active" &&
    asset.next_maintenance_date >= today &&
    asset.next_maintenance_date <= dueLimit
  ) return "due_30_days";
  return "required";
}

export const GET = withIntegrationRequest(async function GET(request) {
  const authentication = await requireIntegrationClient(request, "assets:read");
  if (authentication.error) return authentication.error;

  const { admin, client, requestId } = authentication;
  const parameters = new URL(request.url).searchParams;
  const page = boundedInteger(parameters.get("page"), 1, 1, 100000);
  const pageSize = boundedInteger(parameters.get("page_size"), 25, 1, 100);
  const assetType = parameters.get("asset_type");
  const status = parameters.get("status");
  const criticality = parameters.get("criticality");
  const ppm = parameters.get("ppm_status");

  if (assetType && !ALLOWED_TYPES.has(assetType)) {
    return integrationJson(
      { error: "invalid_asset_type", message: "The requested asset type is not supported." },
      400,
      requestId
    );
  }
  if (status && !ALLOWED_STATUSES.has(status)) {
    return integrationJson(
      { error: "invalid_status", message: "The requested operational status is not supported." },
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
  if (ppm && !ALLOWED_PPM_STATUSES.has(ppm)) {
    return integrationJson(
      { error: "invalid_ppm_status", message: "Use required, not_required, due_30_days or overdue." },
      400,
      requestId
    );
  }

  const today = dateOnly(new Date());
  const dueDate = new Date();
  dueDate.setUTCDate(dueDate.getUTCDate() + 30);
  const dueLimit = dateOnly(dueDate);
  const firstRow = (page - 1) * pageSize;
  const lastRow = firstRow + pageSize - 1;
  let query = admin
    .from("organization_assets")
    .select(
      `id,asset_reference,asset_name,asset_type,site_location_id,site_location_label,
       area_department,manufacturer,model,serial_number,asset_owner_person_id,
       criticality,operational_status,ppm_required,ppm_frequency_value,
       ppm_frequency_unit,last_maintenance_date,next_maintenance_date,
       maintenance_owner_type,maintenance_owner_person_id,maintenance_supplier_id,
       change_control_required,created_at,updated_at`,
      { count: "exact" }
    )
    .eq("organization_id", client.organization_id)
    .order("asset_reference", { ascending: true });

  if (assetType) query = query.eq("asset_type", assetType);
  if (status) query = query.eq("operational_status", status);
  if (criticality) query = query.eq("criticality", criticality);
  if (ppm === "required") query = query.eq("ppm_required", true);
  if (ppm === "not_required") query = query.eq("ppm_required", false);
  if (ppm === "due_30_days") {
    query = query
      .eq("ppm_required", true)
      .eq("operational_status", "active")
      .gte("next_maintenance_date", today)
      .lte("next_maintenance_date", dueLimit);
  }
  if (ppm === "overdue") {
    query = query
      .eq("ppm_required", true)
      .eq("operational_status", "active")
      .lt("next_maintenance_date", today);
  }

  const { data, count, error } = await query.order("id", { ascending: true }).range(firstRow, lastRow);
  if (error) {
    await recordIntegrationEvent({
      admin,
      client,
      request,
      requestId,
      eventType: "assets_read_failed",
      resourceType: "organization_asset",
      responseStatus: 500,
      errorSummary: error.message,
    });
    return integrationJson(
      {
        error: "assets_unavailable",
        message: "The company asset register could not be retrieved.",
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
    eventType: "assets_read",
    resourceType: "organization_asset",
    responseStatus: 200,
  });

  const total = count || 0;
  return integrationJson(
    {
      data: (data || []).map((asset) => ({
        ...asset,
        ppm_status: ppmStatus(asset, today, dueLimit),
      })),
      pagination: {
        page,
        page_size: pageSize,
        total,
        total_pages: total ? Math.ceil(total / pageSize) : 0,
      },
      filters: {
        asset_type: assetType || null,
        status: status || null,
        criticality: criticality || null,
        ppm_status: ppm || null,
      },
      request_id: requestId,
    },
    200,
    requestId
  );
});
