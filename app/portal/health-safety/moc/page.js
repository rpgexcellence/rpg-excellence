import { requireOrganizationAccess } from "../../../../lib/organization-access";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { siteToday } from "../../../../lib/zone-policy.mjs";
import MocRegister from "./MocRegister";

export const dynamic = "force-dynamic";
export const metadata = { title: "Management of Change Register | RPG Excellence" };

export default async function MocRegisterPage() {
  const { organization, level } = await requireOrganizationAccess("risk_management", "view", "/portal/health-safety/moc");
  const admin = createAdminClient();
  const [changes, assets] = await Promise.all([
    admin.from("hs_moc_changes")
      .select("id,moc_reference,title,department,affected_area,administration_location_snapshot,organization_asset_id,change_type,pathway,target_date,status")
      .eq("organization_id", organization.id).order("updated_at", { ascending: false }),
    admin.from("organization_assets").select("id,asset_reference,asset_name,site_location_label,operational_status")
      .eq("organization_id", organization.id),
  ]);
  if (changes.error) throw new Error(changes.error.message);
  const assetsById = new Map((assets.data || []).map(asset => [asset.id, asset]));
  const rows = (changes.data || []).map(({ organization_asset_id, administration_location_snapshot, ...row }) => ({
    ...row,
    location: administration_location_snapshot || assetsById.get(organization_asset_id)?.site_location_label || "",
    asset: assetsById.get(organization_asset_id) || null,
    assetUnavailable: Boolean(organization_asset_id && !assetsById.has(organization_asset_id)),
  }));
  const canCreate = ["contribute", "review", "approve", "admin", "owner"].includes(level);
  return <MocRegister rows={rows} today={siteToday("Europe/London")} canCreate={canCreate}/>;
}
