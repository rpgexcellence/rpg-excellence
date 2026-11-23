import "server-only";
import { createAdminClient } from "./supabase/admin";
import { UUID } from "./zone-policy.mjs";

export const permitRoot = "/portal/health-safety/permits";
export const inspectionRoot = "/portal/health-safety/workplace-inspections";
export const riskAssessmentRoot = "/portal/health-safety/risk-assessment";

export async function loadPowraLinkOptions(organizationId, siteIds) {
  if (!siteIds.length) return {permits: [], inspections: []};
  const admin = createAdminClient();
  const [permits, inspections] = await Promise.all([
    admin.from("hs_permits").select("id,permit_reference,task_description,administration_location_id")
      .eq("organization_id", organizationId).in("administration_location_id", siteIds).order("permit_reference"),
    admin.from("hs_workplace_inspections").select("id,inspection_reference,title,administration_location_id")
      .eq("organization_id", organizationId).in("administration_location_id", siteIds).order("inspection_reference"),
  ]);
  if (permits.error || inspections.error) throw permits.error || inspections.error;
  return {
    permits: (permits.data ?? []).map(row => ({id:row.id, reference:row.permit_reference, title:row.task_description, siteId:row.administration_location_id})),
    inspections: (inspections.data ?? []).map(row => ({id:row.id, reference:row.inspection_reference, title:row.title, siteId:row.administration_location_id})),
  };
}

export async function resolvePowraLink(kind, organizationId, siteId, { id, reference }) {
  if (!organizationId || !siteId || (id ? !UUID.test(id) : !reference)) return null;
  const [table, field] = kind === "permit" ? ["hs_permits","permit_reference"] : ["hs_workplace_inspections","inspection_reference"];
  const query = createAdminClient().from(table).select(`id,${field}`)
    .eq("organization_id",organizationId).eq("administration_location_id",siteId);
  const {data,error} = await (id ? query.eq("id",id) : query.eq(field,reference)).maybeSingle();
  if (error) throw error;
  return data && {id:data.id, reference:data[field]};
}
