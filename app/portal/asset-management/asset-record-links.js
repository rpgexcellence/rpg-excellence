import { loadAssetRows } from "../../../lib/asset-management";
import { effectivePermitStatus } from "../../../lib/permitLifecycle";

export async function loadAssetControls(admin, organizationId, ids, allowed) {
  if (!allowed) return { permits: null, risks: null };
  const permits = [];
  try {
    for (let start = 0; start < ids.length; start += 80) {
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await admin.from("hs_permits").select("id,permit_reference,task_description,status,valid_from,valid_until,linked_assessment_id,organization_asset_id")
          .eq("organization_id", organizationId).in("organization_asset_id", ids.slice(start, start + 80)).order("id").range(offset, offset + 499);
        if (error) throw error;
        permits.push(...(data ?? []));
        if (!data || data.length < 500) break;
      }
    }
  } catch {
    return { permits: null, risks: null };
  }
  const permitted = permits.map(row => ({ ...row, status: effectivePermitStatus(row), href: "/portal/health-safety/permits/" + row.id }));
  const linked = new Set(permits.map(row => row.linked_assessment_id).filter(Boolean));
  if (!linked.size) return { permits: permitted, risks: [] };
  try {
    const records = await loadAssetRows(admin, "hs_risk_assessments", organizationId, "id,assessment_reference,title,status,review_date");
    return { permits: permitted, risks: records.filter(row => linked.has(row.id)).map(row => ({ ...row, href: "/portal/health-safety/risk-assessment/" + row.id })) };
  } catch {
    return { permits: permitted, risks: null };
  }
}
