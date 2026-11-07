import "server-only";
import { notFound } from "next/navigation";
import { requireAssetAccess } from "./asset-management";
import { createAdminClient } from "./supabase/admin";
export const ASSET_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const recordPath = id => "/portal/asset-management/records/".concat(id, "");
export const evidencePath = (id, recordId) => "".concat(recordPath(id), "/evidence/").concat(recordId, "");
export const PRIVATE_ASSET_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "Pragma": "no-cache",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive"
};
export async function requireAssetRecord(id, minimum = "view") {
  // Authenticate before lookup, including malformed identifiers. A UUID is not a credential.
  const access = await requireAssetAccess(minimum, ASSET_UUID.test(String(id)) ? recordPath(id) : "/portal/asset-management/register");
  if (!ASSET_UUID.test(String(id))) notFound();
  const admin = createAdminClient();
  const {
    data: asset,
    error
  } = await admin.from("organization_assets").select("*").eq("id", id).eq("organization_id", access.organization.id).eq("owner_id", access.organization.owner_id).maybeSingle();
  if (error) throw new Error("The asset record is unavailable. Please try again later.");
  if (!asset) notFound();
  return {
    access,
    admin,
    asset
  };
}
export async function recordAssetAccess(context, event, maintenanceId = null) {
  const {
    error
  } = await context.admin.from("organization_asset_access_events").insert({
    organization_id: context.access.organization.id,
    asset_id: context.asset.id,
    actor_id: context.access.user.id,
    event_type: event,
    maintenance_id: maintenanceId
  });
  // Do not return sensitive content if the required access event cannot be written.
  if (error) throw new Error("Access could not be recorded. Please try again later or contact your company Super Administrator.");
}
export function safeEvidencePath(path, organizationId, assetId) {
  if (typeof path !== "string" || path.length > 1024) return false;
  const invalidCharacter = Array.from(path).some(character => {
    const code = character.charCodeAt(0);
    return code === 92 || code < 32;
  });
  if (invalidCharacter) return false;
  if (!path.startsWith(organizationId + "/" + assetId + "/")) return false;
  return !path.split("/").some(part => !part || part === "." || part === "..");
}

export function attachmentName(value, fallback = "asset-evidence") {
  return String(value || fallback).replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 120) || fallback;
}
