import {
  integrationJson,
  withIntegrationRequest,
  requireIntegrationClient,
  recordIntegrationEvent,
} from "../../../../../../lib/integration-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Reuse the installed authentication, entitlement, IP, budget and audit controls.
// These exports intentionally retain the existing released read-field lists.
const RESOURCES = new Map([
  ["audits", "audits:read"],
  ["findings", "findings:read"],
  ["capa-8d", "capa:read"],
  ["assets", "assets:read"],
  ["suppliers", "suppliers:read"],
  ["people", "people:read"],
  ["security-incidents", "security_incidents:read"],
  ["workplace-inspections", "workplace_inspections:read"],
  ["inspection-programmes", "workplace_inspections:read"],
]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PARAMETERS = new Set(["cursor", "page_size"]);
const DATABASE_ERRORS = new Map([
  ["export_key_unavailable", [401, "api_key_unavailable", "The API key is no longer available. Check its status in Administration."]],
  ["export_scope_required", [403, "insufficient_scope", "The API key no longer has permission for this export."]],
  ["export_cursor_invalid", [400, "invalid_cursor", "Use the cursor returned for this resource and organisation."]],
  ["export_cursor_page_size_mismatch", [400, "cursor_page_size_mismatch", "Omit page_size when resuming, or use the original page size."]],
  ["export_invalid_page_size", [400, "invalid_page_size", "page_size must be a whole number from 1 to 100."]],
  ["export_cursor_expired_full_resync_required", [410, "full_resync_required", "The export cursor has expired. Start a new full snapshot and reconcile the destination."]],
  ["export_resource_unavailable", [503, "export_unavailable", "The export foundation is not ready. Contact the administrator and quote the request ID."]],
  ["export_capture_initialising", [503, "export_initialising", "Export capture is initialising. Retry shortly."]],
]);

export const GET = withIntegrationRequest(async function GET(request, context) {
  const { resource } = await context.params;
  const permission = RESOURCES.get(resource);
  const authentication = await requireIntegrationClient(request, permission || null);
  if (authentication.error) return authentication.error;
  const { admin, client, requestId } = authentication;
  const fail = (error, message, status = 400) =>
    integrationJson({ error, message, request_id: requestId }, status, requestId);

  if (!permission) return fail("unknown_export_resource", "This export resource is not supported.", 404);
  const parameters = new URL(request.url).searchParams;
  for (const name of parameters.keys()) {
    if (!PARAMETERS.has(name) || parameters.getAll(name).length !== 1) {
      return fail("invalid_parameters", "Use only one cursor and one optional page_size. Export filters and page numbers are not supported.");
    }
  }
  const cursor = parameters.get("cursor");
  const size = parameters.get("page_size");
  if (cursor !== null && !UUID.test(cursor)) {
    return fail("invalid_cursor", "Provide the complete cursor returned by the previous export response.");
  }
  if (size !== null && (!/^[1-9][0-9]{0,2}$/.test(size) || Number(size) > 100)) {
    return fail("invalid_page_size", "page_size must be a whole number from 1 to 100.");
  }

  const { data, error } = await admin.rpc("read_integration_export_page", {
    p_client: client.id,
    p_resource: resource,
    p_cursor: cursor,
    p_page_size: size === null ? null : Number(size),
  });
  if (error || !data) {
    const known = DATABASE_ERRORS.get(error?.message);
    const [status, code, message] = known || [503, "export_unavailable", "The export could not be completed safely. Retry later and quote the request ID."];
    // Never log keys, cursor tokens, source records or raw database messages.
    console.error("INTEGRATION_EXPORT_FAILED", {
      request_id: requestId,
      resource,
      code: known ? code : "database_operation_failed",
    });
    await recordIntegrationEvent({ admin, client, request, requestId,
      eventType: "export_read_failed", resourceType: resource,
      responseStatus: status, errorSummary: code });
    const response = fail(code, message, status);
    if (code === "export_initialising") response.headers.set("retry-after", "5");
    return response;
  }

  await recordIntegrationEvent({ admin, client, request, requestId,
    eventType: "export_read", resourceType: resource, responseStatus: 200 });
  // Save a checkpoint only AFTER every page has been durably applied.
  // Retry the same cursor after interruption. Apply change_id as a per-record
  // version (a decimal string); never use a global sequence watermark.
  return integrationJson({ ...data, request_id: requestId }, 200, requestId);
});
