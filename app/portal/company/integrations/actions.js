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
