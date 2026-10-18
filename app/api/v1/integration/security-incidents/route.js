import {
  integrationJson,
  recordIntegrationEvent,
  requireIntegrationClient,
} from "../../../../../lib/integration-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES = new Set(["security_event","unauthorised_access","data_breach","malware","phishing","service_disruption","api_integration","supplier_incident","vulnerability","other"]);
const SEVERITIES = new Set(["low","medium","high","critical"]);
const STATUSES = new Set(["reported","triage","contained","investigating","recovery","action_required","awaiting_verification","closed","cancelled"]);

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}

function invalidFilter(name, values, requestId) {
  return integrationJson({
    error: `invalid_${name}`,
    message: `Unsupported ${name.replaceAll("_", " ")}. Use: ${[...values].join(", ")}.`,
  }, 400, requestId);
}

export async function GET(request) {
  const authentication = await requireIntegrationClient(request, "security_incidents:read");
  if (authentication.error) return authentication.error;

  const { admin, client, requestId } = authentication;
  const parameters = new URL(request.url).searchParams;
  const page = boundedInteger(parameters.get("page"), 1, 1, 100000);
  const pageSize = boundedInteger(parameters.get("page_size"), 25, 1, 100);
  const status = parameters.get("status");
  const severity = parameters.get("severity");
  const incidentType = parameters.get("incident_type");
  const targetBefore = parameters.get("target_before");

  if (status && !STATUSES.has(status)) return invalidFilter("status", STATUSES, requestId);
  if (severity && !SEVERITIES.has(severity)) return invalidFilter("severity", SEVERITIES, requestId);
  if (incidentType && !TYPES.has(incidentType)) return invalidFilter("incident_type", TYPES, requestId);
  if (targetBefore && !/^\d{4}-\d{2}-\d{2}$/.test(targetBefore)) {
    return integrationJson({ error:"invalid_target_before", message:"Use target_before in YYYY-MM-DD format." }, 400, requestId);
  }

  const firstRow = (page - 1) * pageSize;
  const lastRow = firstRow + pageSize - 1;
  let query = admin.from("isms_security_incidents").select(
    `id,incident_reference,title,description,incident_type,severity,status,detected_at,awareness_at,
     administration_location_id,administration_location_label,affected_service,affected_organization,
     immediate_impact,continuing_risk,incident_lead_person_id,technical_lead_person_id,privacy_lead_person_id,
     communications_lead_person_id,verifier_person_id,personal_data_involved,ico_notification_required,
     ico_notified_at,affected_people_notification_required,affected_people_notified_at,ncsc_reported_at,
     containment_summary,investigation_summary,recovery_summary,root_cause_summary,lessons_learned,
     linked_finding_id,linked_rca_case_id,linked_moc_id,linked_bcp_incident_id,target_recovery_date,
     closed_at,closure_approved_by_person_id,created_at,updated_at`,
    { count:"exact" }
  ).eq("organization_id", client.organization_id).order("updated_at", { ascending:false });

  if (status) query = query.eq("status", status);
  if (severity) query = query.eq("severity", severity);
  if (incidentType) query = query.eq("incident_type", incidentType);
  if (targetBefore) query = query.lte("target_recovery_date", targetBefore);

  const { data, count, error } = await query.range(firstRow, lastRow);
  if (error) {
    await recordIntegrationEvent({ admin, client, request, requestId, eventType:"security_incidents_read_failed", resourceType:"isms_security_incident", responseStatus:500, errorSummary:error.message });
    return integrationJson({ error:"security_incidents_unavailable", message:"The Security Incident Register could not be retrieved.", diagnostic_code:error.code || "database_query_failed" }, 500, requestId);
  }

  await recordIntegrationEvent({ admin, client, request, requestId, eventType:"security_incidents_read", resourceType:"isms_security_incident", responseStatus:200 });
  const total = count || 0;
  return integrationJson({
    data:data || [],
    pagination:{ page, page_size:pageSize, total, total_pages:total ? Math.ceil(total / pageSize) : 0 },
    filters:{ status:status || null, severity:severity || null, incident_type:incidentType || null, target_before:targetBefore || null },
    request_id:requestId,
  }, 200, requestId);
}
