import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import { getOrganizationAccess } from "../../../../lib/organization-access";
import { UUID } from "../../../../lib/zone-policy.mjs";
import { permitControlEvidence } from "../../../../lib/permitLifecycle";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { PERMITS_ROOT, permitMatchesZone } from "../../../../lib/permit-register.mjs";
import PermitRegister from "./PermitRegister";

export const metadata = { title: "Permit Control Centre | RPG Excellence" };
export const dynamic = "force-dynamic";

const fields = "id,organization_id,administration_location_id,organization_asset_id,permit_reference,permit_type,task_description,site_location,work_area,asset_reference,contractor_company,issuer_name,receiver_name,valid_from,valid_until,status,issued_at,issuer_declaration,receiver_declaration,verification_completed_at,emergency_arrangements,permit_specific_controls,hazards";

async function evidenceByPermit(supabase, rows, table, columns) {
  const groups = new Map();
  for (let start = 0; start < rows.length; start += 100) {
    const batch = rows.slice(start, start + 100).map(row => row.id);
    const result = await supabase.from(table).select(columns).in("permit_id", batch);
    if (result.error) return null;
    for (const item of result.data || []) {
      if (!groups.has(item.permit_id)) groups.set(item.permit_id, []);
      groups.get(item.permit_id).push(item);
    }
  }
  return groups;
}

async function publishedZone(admin, organizationId, token) {
  if (!organizationId || !token) return null;
  const { data: zone, error } = await admin.from("organization_zones").select("id,organization_id,site_id,reference,name")
    .eq("organization_id", organizationId).eq("public_token", token).eq("status", "published").maybeSingle();
  if (error || !zone) return null;
  const [site, siblings] = await Promise.all([
    admin.from("organization_sites").select("id").eq("id", zone.site_id)
      .eq("organization_id", organizationId).eq("status", "active").maybeSingle(),
    admin.from("organization_zones").select("id,reference,name").eq("site_id", zone.site_id).eq("organization_id", organizationId),
  ]);
  if (!site.data || site.error || siblings.error) return null;
  const normalize = value => value.trim().replace(/\s+/g, " ").toLowerCase();
  const duplicates = (siblings.data || []).filter(peer => peer.id !== zone.id);
  return {
    ...zone, matches: [zone.reference, zone.name].filter(label =>
      !duplicates.some(peer => [peer.reference, peer.name].some(value => normalize(value) === normalize(label)))),
  };
}

export default async function PermitRegisterPage({ searchParams }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=" + encodeURIComponent(PERMITS_ROOT));
  const token = typeof params?.zone === "string" && UUID.test(params.zone) ? params.zone : "";
  const admin = createAdminClient();
  const access = token ? await getOrganizationAccess() : null;
  const zone = await publishedZone(admin, access?.organization?.id, token);
  const rejectedZone = Boolean(params?.zone && !zone);
  let result = { data: [] };
  if (!rejectedZone) {
    let query = supabase.from("hs_permits").select(fields).order("created_at", { ascending: false });
    if (zone) query = query.eq("organization_id", zone.organization_id).eq("administration_location_id", zone.site_id);
    result = await query;
  }
  if (result.error) throw new Error(result.error.message);
  const rows = (result.data || []).filter(row => !zone || permitMatchesZone(row, zone));
  const relevant = rows.filter(row => !["closed", "cancelled", "draft"].includes(row.status));
  // Read only evidence for permit IDs already returned by the signed-in RLS query.
  const [isolations, tests] = await Promise.all([
    evidenceByPermit(admin, relevant, "hs_permit_isolations", "permit_id,applied_by,applied_by_name,applied_at,verified_by,verified_by_name,verified_at,verification_method,reinstated_at"),
    evidenceByPermit(admin, relevant, "hs_permit_atmosphere_tests", "permit_id,parameter,result,tested_at,created_at,expires_at,calibration_due"),
  ]);
  const permits = rows.map(row => {
    const evidence = permitControlEvidence(row, isolations?.get(row.id), tests?.get(row.id), Boolean(isolations && tests));
    const { hazards, permit_specific_controls, emergency_arrangements, ...summary } = row;
    return { ...summary, evidence };
  });
  return <PermitRegister permits={permits} initialTime={Date.now()} zone={zone ? { reference: zone.reference, name: zone.name } : null} rejectedZone={rejectedZone}/>;
}
