import { createHash, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "./supabase/admin";

const API_KEY_PATTERN = /^rpg_(test|live)_([a-f0-9]{12})_([A-Za-z0-9_-]{32,})$/;

function digest(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && timingSafeEqual(a, b);
}

function sourceIp(request) {
  return (request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "")
    .split(",")[0].trim() || null;
}

export function integrationJson(body, status = 200, requestId = null) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...(requestId ? { "x-request-id": requestId } : {}),
    },
  });
}

export async function recordIntegrationEvent({ admin, client, request, requestId, eventType, resourceType = null, resourceId = null, responseStatus, errorSummary = null, payloadDigest = null }) {
  await admin.from("integration_events").insert({
    organization_id: client.organization_id,
    api_client_id: client.id,
    direction: "inbound",
    event_type: eventType,
    resource_type: resourceType,
    resource_id: resourceId,
    request_id: requestId,
    http_method: request.method,
    endpoint: new URL(request.url).pathname,
    response_status: responseStatus,
    payload_digest: payloadDigest,
    error_summary: errorSummary ? String(errorSummary).slice(0, 500) : null,
    source_ip: sourceIp(request),
  });
}

export async function requireIntegrationClient(request, requiredPermission) {
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  const match = token.match(API_KEY_PATTERN);
  if (!match) return { error: integrationJson({ error: "invalid_api_key", message: "Provide a valid RPG Bearer API key." }, 401, requestId) };

  const [, environment, publicId] = match;
  const keyPrefix = `rpg_${environment}_${publicId}`;
  const admin = createAdminClient();
  const { data: client, error } = await admin.from("integration_api_clients")
    .select("id,owner_id,organization_id,client_name,environment,key_prefix,secret_hash,permissions,allowed_ip_ranges,active,expires_at,revoked_at")
    .eq("key_prefix", keyPrefix).maybeSingle();

  if (error || !client || !safeEqual(digest(token), client.secret_hash)) {
    return { error: integrationJson({ error: "invalid_api_key", message: "The API key is invalid." }, 401, requestId) };
  }
  if (!client.active || client.revoked_at) {
    return { error: integrationJson({ error: "api_key_revoked", message: "The API key has been revoked." }, 401, requestId) };
  }
  if (client.expires_at && new Date(client.expires_at) <= new Date()) {
    return { error: integrationJson({ error: "api_key_expired", message: "The API key has expired." }, 401, requestId) };
  }
  if (requiredPermission && !(client.permissions || []).includes(requiredPermission)) {
    await recordIntegrationEvent({ admin, client, request, requestId, eventType: "permission_denied", responseStatus: 403, errorSummary: `Missing ${requiredPermission}` });
    return { error: integrationJson({ error: "insufficient_scope", message: `This API key requires ${requiredPermission}.` }, 403, requestId) };
  }
  const ip = sourceIp(request);
  if ((client.allowed_ip_ranges || []).length && (!ip || !client.allowed_ip_ranges.includes(ip))) {
    await recordIntegrationEvent({ admin, client, request, requestId, eventType: "ip_denied", responseStatus: 403, errorSummary: "Source IP is not allowlisted" });
    return { error: integrationJson({ error: "ip_not_allowed", message: "The request source is not permitted for this API key." }, 403, requestId) };
  }

  await admin.from("integration_api_clients").update({ last_used_at: new Date().toISOString(), last_used_ip: ip }).eq("id", client.id);
  return { admin, client, requestId, sourceIp: ip };
}

export function integrationPayloadDigest(payload) {
  return digest(typeof payload === "string" ? payload : JSON.stringify(payload));
}
