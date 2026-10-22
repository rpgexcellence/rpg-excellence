import {
  integrationJson,
  withIntegrationRequest,
  recordIntegrationEvent,
  requireIntegrationClient,
} from "../../../../../lib/integration-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = new Set([
  "reported",
  "triage",
  "contained",
  "investigating",
  "recovery",
  "action_required",
  "awaiting_verification",
  "closed",
  "cancelled",
]);

const ALLOWED_SEVERITIES = new Set([
  "low",
  "medium",
  "high",
  "critical",
]);

const ALLOWED_VERIFICATION_RESULTS = new Set([
  "pending",
  "effective",
  "not_effective",
]);

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(value || "", 10);

  return Number.isFinite(parsed)
    ? Math.min(maximum, Math.max(minimum, parsed))
    : fallback;
}

export const GET = withIntegrationRequest(async function GET(request) {
  const authentication = await requireIntegrationClient(
    request,
    "security_incidents:read",
  );

  if (authentication.error) {
    return authentication.error;
  }

  const { admin, client, requestId } = authentication;
  const parameters = new URL(request.url).searchParams;

  const page = boundedInteger(
    parameters.get("page"),
    1,
    1,
    100000,
  );

  const pageSize = boundedInteger(
    parameters.get("page_size"),
    25,
    1,
    100,
  );

  const status = parameters.get("status");
  const severity = parameters.get("severity");
  const verificationResult = parameters.get(
    "verification_result",
  );

  if (status && !ALLOWED_STATUSES.has(status)) {
    return integrationJson(
      {
        error: "invalid_status",
        message:
          "The requested security-incident status is not supported.",
      },
      400,
      requestId,
    );
  }

  if (severity && !ALLOWED_SEVERITIES.has(severity)) {
    return integrationJson(
      {
        error: "invalid_severity",
        message:
          "Use low, medium, high or critical.",
      },
      400,
      requestId,
    );
  }

  if (
    verificationResult &&
    !ALLOWED_VERIFICATION_RESULTS.has(verificationResult)
  ) {
    return integrationJson(
      {
        error: "invalid_verification_result",
        message:
          "Use pending, effective or not_effective.",
      },
      400,
      requestId,
    );
  }

  const detailValue=parameters.get("include_details");
  if(detailValue&&!['true','false'].includes(detailValue)) return integrationJson({error:'invalid_filter',message:'include_details must be true or false.'},400,requestId);
  const includeDetails=detailValue==='true';
  if(includeDetails&&!(client.permissions||[]).includes('security_incidents:detail')) return integrationJson({error:'insufficient_scope',message:'Sensitive security narratives require security_incidents:detail in addition to security_incidents:read.'},403,requestId);
  const firstRow = (page - 1) * pageSize;
  const lastRow = firstRow + pageSize - 1;

  let query = admin
    .from("isms_security_incidents")
    .select(
      includeDetails ? [
        "id",
        "incident_reference",
        "title",
        "description",
        "incident_type",
        "severity",
        "status",
        "detected_at",
        "awareness_at",
        "administration_location_id",
        "administration_location_label",
        "affected_service",
        "affected_organization",
        "affected_data",
        "immediate_impact",
        "continuing_risk",
        "incident_lead_person_id",
        "technical_lead_person_id",
        "privacy_lead_person_id",
        "communications_lead_person_id",
        "verifier_person_id",
        "verification_result",
        "verification_summary",
        "verified_at",
        "verified_by_user_id",
        "personal_data_involved",
        "notification_assessment",
        "ico_notification_required",
        "ico_notified_at",
        "affected_people_notification_required",
        "affected_people_notified_at",
        "ncsc_reported_at",
        "containment_summary",
        "investigation_summary",
        "recovery_summary",
        "root_cause_summary",
        "lessons_learned",
        "linked_finding_id",
        "linked_rca_case_id",
        "linked_moc_id",
        "linked_bcp_incident_id",
        "target_recovery_date",
        "closure_approved_by_person_id",
        "closure_approval_comment",
        "closure_approved_at",
        "closure_approved_by_user_id",
        "closed_at",
        "created_at",
        "updated_at",
      ].join(",") : ["id","incident_reference","title","incident_type","severity","status","detected_at","awareness_at","administration_location_id","verification_result","verified_at","closed_at","created_at","updated_at"].join(","),
      { count: "exact" },
    )
    .eq("organization_id", client.organization_id)
    .order("created_at", {
      ascending: false,
    })
    .order("id", { ascending: true }).range(firstRow, lastRow);

  if (status) {
    query = query.eq("status", status);
  }

  if (severity) {
    query = query.eq("severity", severity);
  }

  if (verificationResult) {
    query = query.eq(
      "verification_result",
      verificationResult,
    );
  }

  const { data, count, error } = await query;

  if (error) {
    await recordIntegrationEvent({
      admin,
      client,
      request,
      requestId,
      eventType:
        "security_incidents_read_failed",
      resourceType:
        "isms_security_incident",
      responseStatus: 500,
      errorSummary: error.message,
    });

    return integrationJson(
      {
        error:
          "security_incidents_unavailable",
        message:
          "The security incident register could not be retrieved.",
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
    eventType: "security_incidents_read",
    resourceType: "isms_security_incident",
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
        total_pages: total
          ? Math.ceil(total / pageSize)
          : 0,
      },
      filters: {
        status: status || null,
        severity: severity || null,
        verification_result:
          verificationResult || null,
        include_details: includeDetails,
      },
      request_id: requestId,
    },
    200,
    requestId,
  );
});
