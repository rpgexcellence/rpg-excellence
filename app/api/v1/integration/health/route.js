import { INTEGRATION_PERMISSIONS } from "../../../../../lib/integration-policy.mjs";
import {
  integrationJson,
  withIntegrationRequest,
  recordIntegrationEvent,
  requireIntegrationClient,
} from "../../../../../lib/integration-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withIntegrationRequest(async function GET(request) {
  const authentication = await requireIntegrationClient(request, null);
  if (authentication.error) return authentication.error;

  const { admin, client, requestId } = authentication;

  const response = {
    status: "available",
    service: "RPG Excellence Enterprise Integration API",
    api_version: "v1",
    environment: client.environment,
    client: {
      id: client.id,
      name: client.client_name,
    },
    organisation: {
      id: client.organization_id,
    },
    permissions: (client.permissions || []).filter(value=>INTEGRATION_PERMISSIONS.includes(value)),
    capabilities: {read_exports:client.environment==='live',inbound_writes:false,outbound_webhooks:false,sandbox_data:false},
    checked_at: new Date().toISOString(),
    request_id: requestId,
  };

  await recordIntegrationEvent({
    admin,
    client,
    request,
    requestId,
    eventType: "integration_health_checked",
    resourceType: "integration_api",
    responseStatus: 200,
  });

  return integrationJson(response, 200, requestId);
});
