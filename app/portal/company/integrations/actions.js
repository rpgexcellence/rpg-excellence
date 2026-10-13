"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requirePeopleAdmin } from "../people/actions";

const ALLOWED_PERMISSIONS = new Set([
  "audits:read",
  "audits:write",
  "findings:read",
  "findings:write",
  "capa:read",
  "capa:write",
  "assets:read",
  "assets:write",
  "suppliers:read",
  "suppliers:write",
  "people:read",
  "webhooks:manage",
]);

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
  const environment = clean(formData.get("environment"), 10) === "test" ? "test" : "live";
  const expiresAt = futureExpiry(formData.get("expires_at"));
  const permissions = Array.from(
    new Set(
      formData
        .getAll("permissions")
        .map(String)
        .filter((permission) => ALLOWED_PERMISSIONS.has(permission))
    )
  );

  if (clientName.length < 3) {
    return { error: "Enter a client name containing at least three characters." };
  }
  if (!permissions.length) {
    return { error: "Select at least one controlled API permission." };
  }
  if (expiresAt === undefined) {
    return { error: "Select a future expiry date or leave the expiry blank." };
  }

  const publicId = randomBytes(6).toString("hex");
  const secret = randomBytes(32).toString("base64url");
  const apiKey = `rpg_${environment}_${publicId}_${secret}`;
  const keyPrefix = `rpg_${environment}_${publicId}`;

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
      expires_at: expiresAt,
      created_by: user.id,
    })
    .select("id,client_name,key_prefix,environment,permissions,expires_at,created_at")
    .single();

  if (error || !data) {
    return { error: error?.message || "The API key could not be created." };
  }

  revalidatePath("/portal/company/integrations");
  return {
    success: "API key created. Copy it now; RPG Excellence will not display it again.",
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
    return { error: error?.message || "The API key is already revoked or is not available." };
  }

  revalidatePath("/portal/company/integrations");
  return { success: "API key revoked. Requests using it will now be rejected." };
}
