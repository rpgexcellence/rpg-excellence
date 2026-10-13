import {
  integrationJson,
  recordIntegrationEvent,
  requireIntegrationClient,
} from "../../../../../lib/integration-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
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
    permissions: client.permissions || [],
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
}
