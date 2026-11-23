import "server-only";
import { createAdminClient } from "./supabase/admin";
import { UUID } from "./zone-policy.mjs";

export async function listPowraZones(organizationId, siteIds) {
  if (!siteIds.length) return [];
  const { data, error } = await createAdminClient().from("organization_zones").select("id,site_id,reference,name")
    .eq("organization_id", organizationId).eq("status", "published").in("site_id", siteIds).order("reference");
  if (error) throw error;
  return data ?? [];
}

export async function resolvePowraZone(organizationId, selector, siteIds, byToken = false) {
  if (typeof selector !== "string" || !UUID.test(selector) || !siteIds.length) return null;
  const { data, error } = await createAdminClient().from("organization_zones").select("id,site_id,reference,name")
    .eq(byToken ? "public_token" : "id", selector).eq("organization_id", organizationId).eq("status", "published")
    .in("site_id", siteIds).maybeSingle();
  if (error) throw error;
  return data;
}
