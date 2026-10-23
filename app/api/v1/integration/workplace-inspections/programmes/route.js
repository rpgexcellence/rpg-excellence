import { INSPECTION_RISK_BANDS, normaliseInspectionBand, integrationDateOnly } from "../../../../../../lib/integration-policy.mjs";
import {
  integrationJson,
  withIntegrationRequest,
  recordIntegrationEvent,
  requireIntegrationClient,
} from "../../../../../../lib/integration-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = new Set(["active", "paused", "closed", "archived"]);
const ALLOWED_RISK_BANDS = new Set(INSPECTION_RISK_BANDS);
const ALLOWED_DUE = new Set(["overdue", "due_30_days", "future"]);

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed)
    ? Math.min(maximum, Math.max(minimum, parsed))
    : fallback;
}

function dateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function invalidFilter(message, requestId) {
  return integrationJson(
    { error: "invalid_filter", message },
    400,
    requestId,
  );
}

export const GET = withIntegrationRequest(async function GET(request) {
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
  const riskBand = normaliseInspectionBand(parameters.get("risk_band"));
  const siteId = parameters.get("site_id");
  const due = parameters.get("due");

  if (status && !ALLOWED_STATUSES.has(status)) {
    return invalidFilter(
      "Use active, paused, closed or archived for status.",
      requestId,
    );
  }
  if (riskBand && !ALLOWED_RISK_BANDS.has(riskBand)) {
    return invalidFilter(
      "Use routine, medium, high or critical for risk_band (legacy low/moderate aliases are accepted).",
      requestId,
    );
  }
  if (due && !ALLOWED_DUE.has(due)) {
    return invalidFilter(
      "Use overdue, due_30_days or future for due.",
      requestId,
    );
  }

  const today = dateOnly(new Date());
  const thirtyDays = new Date();
  thirtyDays.setUTCDate(thirtyDays.getUTCDate() + 30);
  const dueLimit = dateOnly(thirtyDays);
  const firstRow = (page - 1) * pageSize;
  const lastRow = firstRow + pageSize - 1;

  let query = admin
    .from("hs_inspection_programmes")
    .select(
      "id,programme_reference,title,template_id,administration_location_id," +
      "administration_location_label,area_department,accountable_person_id," +
      "lead_inspector_person_id,reviewer_person_id,frequency_amount,frequency_unit," +
      "last_inspection_date,next_inspection_date,risk_score,risk_band,planning_basis," +
      "area_profile,status,signals_last_synchronised_at," +
      "signals_synchronisation_summary,created_at,updated_at",
      { count: "exact" },
    )
    .eq("organization_id", client.organization_id)
    .order("next_inspection_date", { ascending: true });

  if (status) query = query.eq("status", status);
  if (riskBand) query = query.eq("risk_band", riskBand);
  if (siteId) query = query.eq("administration_location_id", siteId);
  if (due === "overdue") query = query.lt("next_inspection_date", today);
  if (due === "due_30_days") {
    query = query.gte("next_inspection_date", today).lte("next_inspection_date", dueLimit);
  }
  if (due === "future") query = query.gt("next_inspection_date", dueLimit);

  const { data, count, error } = await query.order("id", { ascending: true }).range(firstRow, lastRow);
  if (error) {
    await recordIntegrationEvent({
      admin,
      client,
      request,
      requestId,
      eventType: "workplace_inspection_programmes_read_failed",
      resourceType: "workplace_inspection_programme",
      responseStatus: 500,
      errorSummary: error.message,
    });
    return integrationJson(
      {
        error: "workplace_inspection_programmes_unavailable",
        message: "Workplace Inspection programmes could not be retrieved.",
        diagnostic_code: error.code || "database_query_failed",
      },
      500,
      requestId,
    );
  }

  const programmes = data || [];
  const programmeIds = programmes.map((programme) => programme.id);
  let packLinks = [];
  if (programmeIds.length) {
    const packResult = await admin
      .from("hs_inspection_programme_packs")
      .select(
        "programme_id,selection_source,selection_reason," +
        "pack:hs_inspection_question_packs(pack_code)",
        {count:"exact"},
      )
      .eq("organization_id", client.organization_id)
      .in("programme_id", programmeIds).order("programme_id").order("pack_id").limit(1000);
    if (packResult.error) {
      await recordIntegrationEvent({
        admin,
        client,
        request,
        requestId,
        eventType: "workplace_inspection_programmes_read_failed",
        resourceType: "workplace_inspection_programme",
        responseStatus: 500,
        errorSummary: packResult.error.message,
      });
      return integrationJson(
        {
          error: "workplace_inspection_packs_unavailable",
          message: "Dynamic checklist selections could not be retrieved.",
          diagnostic_code: packResult.error.code || "database_query_failed",
        },
        500,
        requestId,
      );
    }
    if(packResult.count!==null&&packResult.count>(packResult.data||[]).length) return integrationJson({error:'inspection_packs_too_large',message:'Checklist pack selections exceed the bounded export. Reduce page_size; no partial pack list is returned.'},413,requestId);
    packLinks = packResult.data || [];
  }

  const packsByProgramme = new Map();
  for (const link of packLinks) {
    const current = packsByProgramme.get(link.programme_id) || [];
    current.push({
      pack_code: link.pack?.pack_code || null,
      selection_source: link.selection_source,
      selection_reason: link.selection_reason,
    });
    packsByProgramme.set(link.programme_id, current);
  }

  await recordIntegrationEvent({
    admin,
    client,
    request,
    requestId,
    eventType: "workplace_inspection_programmes_read",
    resourceType: "workplace_inspection_programme",
    responseStatus: 200,
  });

  const total = count || 0;
  return integrationJson(
    {
      data: programmes.map((programme) => ({
        ...programme,
        checklist_packs: packsByProgramme.get(programme.id) || [],
      })),
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
        due: due || null,
      },
      request_id: requestId,
    },
    200,
    requestId,
  );
});
