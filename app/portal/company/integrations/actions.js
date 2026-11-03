"use server";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { validateIntegrationPermissions } from "../../../../lib/integration-policy.mjs";
import { canonicalIntegrationIp, integrationOwnerEntitled } from "../../../../lib/integration-api";
import { requirePeopleAdmin } from "../people/actions";


function clean(value, maximum = 160) {
  return String(value || "").trim().slice(0, maximum);
}

function keyDigest(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function futureExpiry(value) {
  const candidate = clean(value, 30);
  if (!candidate) return null;
  const date = new Date(candidate);
  if (Number.isNaN(date.getTime()) || date <= new Date()) return undefined;
  return date.toISOString();
}

export async function createIntegrationApiKey(_previousState, formData) {
  const { user, admin, organization } = await requirePeopleAdmin();

  const { data: controlledOrganization } = await admin
    .from("organizations")
    .select("id,owner_id")
    .eq("id", organization.id)
    .single();

  if (!controlledOrganization?.owner_id) {
    return { error: "The controlled organisation could not be verified." };
  }

  const clientName = clean(formData.get("client_name"), 120);
  const environment =
    clean(formData.get("environment"), 10) === "test" ? "test" : "live";
  const expiresAt = futureExpiry(formData.get("expires_at"));
  let permissions;
  try { permissions=validateIntegrationPermissions(formData.getAll("permissions").map(String)); }
  catch(error){return {error:error.message};}
  if(!await integrationOwnerEntitled(controlledOrganization.owner_id,organization.id)) return {error:"This organisation needs an active Consultant subscription or protected RPG platform-administrator entitlement. Existing keys can still be revoked."};
  const rawAddresses=String(formData.get("allowed_ips")||"").split(/[\s,]+/).filter(Boolean);
  const allowedIps=[...new Set(rawAddresses.map(canonicalIntegrationIp))];
  if(allowedIps.some(ip=>!ip)||allowedIps.length>32) return {error:"Enter up to 32 exact IPv4 / IPv6 addresses. CIDR ranges are not supported."};
  if(allowedIps.length&&!process.env.INTEGRATION_TRUSTED_IP_HEADER) return {error:"Configure a verified hosting ingress IP header before restricting source addresses."};


  if (clientName.length < 3) {
    return {
      error: "Enter a client name containing at least three characters.",
    };
  }
  if (!permissions.length) {
    return { error: "Select at least one controlled API permission." };
  }
  if (expiresAt === undefined) {
    return {
      error: "Select a future expiry date or leave the expiry blank.",
    };
  }

  const publicId = randomBytes(6).toString("hex");
  const secret = randomBytes(32).toString("base64url");
  const apiKey =
    "rpg_" + environment + "_" + publicId + "_" + secret;
  const keyPrefix = "rpg_" + environment + "_" + publicId;

  const { data, error } = await admin
    .from("integration_api_clients")
    .insert({
      owner_id: controlledOrganization.owner_id,
      organization_id: organization.id,
      client_name: clientName,
      environment,
      key_prefix: keyPrefix,
      secret_hash: keyDigest(apiKey),
      permissions,
      allowed_ip_ranges: allowedIps,
      expires_at: expiresAt,
      created_by: user.id,
    })
    .select(
      "id,client_name,key_prefix,environment,permissions,expires_at,created_at",
    )
    .single();

  if (error || !data) {
    return { error: error?.message || "The API key could not be created." };
  }

  const audit=await admin.from("integration_events").insert({organization_id:organization.id,api_client_id:data.id,direction:"inbound",event_type:"key_created",request_id:randomUUID(),http_method:"POST",endpoint:"/portal/company/integrations",response_status:201});
  if(audit.error){
    const revoked=await admin.from("integration_api_clients").update({active:false,revoked_at:new Date().toISOString(),revoked_by:user.id}).eq("id",data.id).eq("organization_id",organization.id);
    console.error("INTEGRATION_KEY_AUDIT_FAILED",{client_id:data.id,revocation_failed:Boolean(revoked.error)});
    return {error:"Credential auditing failed. No API secret has been released; contact the platform administrator before retrying."};
  }
  revalidatePath("/portal/company/integrations");
  return {
    success:
      "API key created. Copy it now; RPG Excellence will not display it again.",
    apiKey,
    client: data,
  };
}

export async function revokeIntegrationApiKey(_previousState, formData) {
  const { user, admin, organization } = await requirePeopleAdmin();

  const clientId = clean(formData.get("client_id"), 80);
  if (!clientId) return { error: "The API client was not identified." };

  const { data, error } = await admin
    .from("integration_api_clients")
    .update({
      active: false,
      revoked_at: new Date().toISOString(),
      revoked_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", clientId)
    .eq("organization_id", organization.id)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return {
      error:
        error?.message ||
        "The API key is already revoked or is not available.",
    };
  }

  const audit=await admin.from("integration_events").insert({organization_id:organization.id,api_client_id:data.id,direction:"inbound",event_type:"key_revoked",request_id:randomUUID(),http_method:"POST",endpoint:"/portal/company/integrations",response_status:200});
  if(audit.error) console.error("INTEGRATION_KEY_REVOCATION_AUDIT_FAILED",{client_id:data.id});
  revalidatePath("/portal/company/integrations");
  return {
    success: "API key revoked. Requests using it will now be rejected."+(audit.error?" The audit log needs administrator review; revocation remains effective.":""),
  };
}

// Phase 2: use the existing key register and integration event history.
// Starting rotation NEVER revokes the working key. The replacement secret is
// returned once, only after its creation and rotation audit have been recorded.
export async function startIntegrationApiKeyRotation(_previousState, formData) {
  const { user, admin, organization } = await requirePeopleAdmin();
  const sourceId = clean(formData.get("client_id"), 80);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sourceId)) {
    return { error: "Select the existing key to replace." };
  }
  const controlled = await admin.from("organizations").select("id,owner_id")
    .eq("id", organization.id).single();
  if (controlled.error || !controlled.data?.owner_id) {
    return { error: "The controlled organisation could not be verified." };
  }
  const ownerId = controlled.data.owner_id;
  if (!await integrationOwnerEntitled(ownerId, organization.id)) {
    return { error: "An active integration entitlement is required to create a replacement key. Existing keys can still be revoked." };
  }
  const source = await admin.from("integration_api_clients")
    .select("id,client_name,environment,permissions,allowed_ip_ranges,expires_at,requests_per_minute,active,revoked_at")
    .eq("id", sourceId).eq("organization_id", organization.id)
    .eq("owner_id", ownerId).maybeSingle();
  const old = source.data;
  if (source.error || !old || !old.active || old.revoked_at ||
      (old.expires_at && (!Number.isFinite(Date.parse(old.expires_at)) || Date.parse(old.expires_at) <= Date.now()))) {
    return { error: "Choose a current, active key. Revoked or expired keys cannot be rotated." };
  }
  if (old.environment !== "live") {
    return { error: "This rotation workflow requires a live key. Test credentials remain health checks only." };
  }
  let permissions;
  try { permissions = validateIntegrationPermissions(old.permissions || []); }
  catch { return { error: "Review the existing key permissions before rotating it." }; }
  if (!permissions.length) return { error: "The existing key has no usable permissions." };
  const rawIps = old.allowed_ip_ranges || [];
  const allowedIps = rawIps.map(canonicalIntegrationIp);
  if (allowedIps.length > 32 || allowedIps.some(ip => !ip) ||
      (allowedIps.length && !process.env.INTEGRATION_TRUSTED_IP_HEADER)) {
    return { error: "Review the existing key's source-IP restrictions before rotating it." };
  }
  const publicId = randomBytes(6).toString("hex");
  const keyPrefix = "rpg_live_" + publicId;
  const apiKey = keyPrefix + "_" + randomBytes(32).toString("base64url");
  const inserted = await admin.from("integration_api_clients").insert({
    owner_id: ownerId, organization_id: organization.id,
    client_name: clean(old.client_name, 100) + " (replacement)",
    environment: "live", key_prefix: keyPrefix, secret_hash: keyDigest(apiKey),
    permissions, allowed_ip_ranges: allowedIps, expires_at: old.expires_at || null,
    ...(old.requests_per_minute == null ? {} : { requests_per_minute: old.requests_per_minute }),
    created_by: user.id,
  }).select("id,client_name,key_prefix,environment,permissions,expires_at,created_at").single();
  if (inserted.error || !inserted.data) {
    return { error: "The replacement could not be created. The original key remains unchanged." };
  }
  const replacement = inserted.data;
  const audit = await admin.from("integration_events").insert({
    organization_id: organization.id, api_client_id: replacement.id,
    direction: "inbound", event_type: "key_rotation_started",
    resource_type: "integration_api_client", resource_id: old.id,
    request_id: randomUUID(), http_method: "POST",
    endpoint: "/portal/company/integrations", response_status: 201,
  });
  if (audit.error) {
    const revoked = await admin.from("integration_api_clients").update({
      active: false, revoked_at: new Date().toISOString(), revoked_by: user.id,
    }).eq("id", replacement.id).eq("organization_id", organization.id);
    console.error("INTEGRATION_ROTATION_AUDIT_FAILED", {
      client_id: replacement.id, revocation_failed: Boolean(revoked.error),
    });
    return { error: "Replacement auditing failed. No secret has been released. The original key remains unchanged; contact the administrator before retrying." };
  }
  revalidatePath("/portal/company/integrations");
  return {
    success: "Replacement created. Copy it now, update the connected system and make a successful data request. The original key remains active until you complete rotation.",
    apiKey, client: replacement, rotationSourceId: old.id,
  };
}

export async function completeIntegrationApiKeyRotation(_previousState, formData) {
  const { user, admin, organization } = await requirePeopleAdmin();
  const sourceId = clean(formData.get("client_id"), 80);
  const replacementId = clean(formData.get("replacement_id"), 80);
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(sourceId) || !uuid.test(replacementId) || sourceId === replacementId) {
    return { error: "Select the original key and its recorded replacement." };
  }
  if (formData.get("confirm_rotation") !== "yes") {
    return { error: "Confirm that all connected systems have been switched to the replacement key." };
  }
  const controlled = await admin.from("organizations").select("id,owner_id")
    .eq("id", organization.id).single();
  if (controlled.error || !controlled.data?.owner_id) return { error: "The controlled organisation could not be verified." };
  const keys = await admin.from("integration_api_clients")
    .select("id,active,revoked_at,expires_at,environment")
    .eq("organization_id", organization.id).eq("owner_id", controlled.data.owner_id)
    .in("id", [sourceId, replacementId]);
  if (keys.error) return { error: "The key status could not be checked. No key has been changed." };
  const original = keys.data?.find(key => key.id === sourceId);
  const replacement = keys.data?.find(key => key.id === replacementId);
  if (!original || !replacement || !replacement.active || replacement.revoked_at || replacement.environment !== "live" ||
      (replacement.expires_at && (!Number.isFinite(Date.parse(replacement.expires_at)) || Date.parse(replacement.expires_at) <= Date.now()))) {
    return { error: "The replacement must be a current, active live key in this organisation." };
  }
  if (original.revoked_at || !original.active) return { success: "The original key is already disabled. It has not been reactivated." };
  const link = await admin.from("integration_events").select("id,created_at")
    .eq("organization_id", organization.id).eq("api_client_id", replacementId)
    .eq("event_type", "key_rotation_started").eq("resource_type", "integration_api_client")
    .eq("resource_id", sourceId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (link.error || !link.data) return { error: "These keys do not have a recorded rotation link. No key has been changed." };
  const proof = await admin.from("integration_events").select("id")
    .eq("organization_id", organization.id).eq("api_client_id", replacementId)
    .eq("event_type", "request_completed").eq("response_status", 200)
    .like("endpoint", "/api/v1/integration/%").neq("endpoint", "/api/v1/integration/health")
    .gte("created_at", link.data.created_at).limit(1).maybeSingle();
  if (proof.error || !proof.data) {
    return { error: "First make a successful data request with the replacement key. A health check alone does not complete this check. The original key remains active." };
  }
  const revoked = await admin.from("integration_api_clients").update({
    active: false, revoked_at: new Date().toISOString(), revoked_by: user.id,
    updated_at: new Date().toISOString(),
  }).eq("id", sourceId).eq("organization_id", organization.id)
    .eq("owner_id", controlled.data.owner_id).is("revoked_at", null).select("id").maybeSingle();
  if (revoked.error || !revoked.data) return { error: "The original key could not be revoked. Refresh the key list and check its status before retrying." };
  const audit = await admin.from("integration_events").insert({
    organization_id: organization.id, api_client_id: replacementId,
    direction: "inbound", event_type: "key_rotation_completed",
    resource_type: "integration_api_client", resource_id: sourceId,
    request_id: randomUUID(), http_method: "POST",
    endpoint: "/portal/company/integrations", response_status: 200,
  });
  if (audit.error) console.error("INTEGRATION_ROTATION_COMPLETION_AUDIT_FAILED", { client_id: sourceId });
  revalidatePath("/portal/company/integrations");
  return { success: "Rotation completed. The original key is revoked." +
    (audit.error ? " The audit log needs administrator review; revocation remains effective." : "") };
}
