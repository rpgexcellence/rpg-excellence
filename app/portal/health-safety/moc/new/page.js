import { randomUUID } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import MocInitiationForm from "../../../../../components/MocInitiationForm";
import { requireOrganizationAccess } from "../../../../../lib/organization-access";
import { createAdminClient } from "../../../../../lib/supabase/admin";

export const metadata = { title: "New Management of Change | RPG Excellence" };
export const dynamic = "force-dynamic";

function clean(formData, name) {
  return String(formData.get(name) || "").trim();
}

function parseList(value, message) {
  try {
    const parsed = JSON.parse(value || "[]");
    if (!Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch {
    throw new Error(message);
  }
}

async function createMoc(formData) {
  "use server";

  const { user, organization } = await requireOrganizationAccess(
    "risk_management",
    "contribute",
    "/portal/health-safety/moc/new",
  );
  const admin = createAdminClient();
  const t = (name) => clean(formData, name);
  const screening = parseList(t("screening_answers"), "The MOC screening selections could not be read.");
  const pathAnswers = parseList(t("path_answers"), "The change-path selections could not be read.");
  const impactAreas = parseList(t("impact_areas"), "The impact-area selections could not be read.");
  const pathway = screening.some((answer) => answer.answer === "yes") ? "full" : "lite";

  if (
    !t("title") ||
    !t("requestor_name") ||
    !t("department") ||
    !t("change_description") ||
    !t("affected_area") ||
    !t("target_date") ||
    !t("implementation_plan")
  ) {
    throw new Error("Complete all mandatory MOC fields.");
  }
  if (t("duration_type") === "temporary" && !t("temporary_end_date")) {
    throw new Error("Enter an end date for the temporary change.");
  }
  if (!impactAreas.length) throw new Error("Select at least one impact area.");

  const linkedAssessmentId = t("linked_assessment_id") || null;
  if (pathway === "full" && !linkedAssessmentId) {
    throw new Error("A Full MOC must link to an approved risk assessment.");
  }
  if (linkedAssessmentId) {
    const { data: assessment } = await admin
      .from("hs_risk_assessments")
      .select("id")
      .eq("id", linkedAssessmentId)
      .eq("organization_id", organization.id)
      .in("status", ["approved", "communicated"])
      .maybeSingle();
    if (!assessment) throw new Error("Select an approved risk assessment belonging to this company.");
  }

  const organizationAssetId = t("organization_asset_id") || null;
  let asset = null;
  if (organizationAssetId) {
    const { data, error } = await admin
      .from("organization_assets")
      .select("id,asset_reference,asset_name,asset_type,site_location_id,site_location_label,area_department,asset_owner_person_id,criticality,ppm_required,next_maintenance_date,operational_status")
      .eq("id", organizationAssetId)
      .eq("organization_id", organization.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("The selected asset is not available in this company's Asset Register.");
    asset = data;
  }

  const mocReference = `MOC-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 6).toUpperCase()}`;
  const equipmentId = asset
    ? `${asset.asset_reference} — ${asset.asset_name}`
    : t("equipment_id") || null;

  const { data: created, error } = await admin
    .from("hs_moc_changes")
    .insert({
      owner_id: user.id,
      organization_id: organization.id,
      moc_reference: mocReference,
      title: t("title"),
      requestor_name: t("requestor_name"),
      department: t("department"),
      date_requested: t("date_requested"),
      change_description: t("change_description"),
      change_type: t("change_type"),
      duration_type: t("duration_type"),
      temporary_end_date: t("temporary_end_date") || null,
      affected_area: t("affected_area"),
      equipment_id: equipmentId,
      organization_asset_id: asset?.id || null,
      asset_snapshot: asset
        ? {
            asset_reference: asset.asset_reference,
            asset_name: asset.asset_name,
            asset_type: asset.asset_type,
            site_location_id: asset.site_location_id,
            site_location_label: asset.site_location_label,
            area_department: asset.area_department,
            asset_owner_person_id: asset.asset_owner_person_id,
            criticality: asset.criticality,
            ppm_required: asset.ppm_required,
            next_maintenance_date: asset.next_maintenance_date,
            captured_at: new Date().toISOString(),
          }
        : null,
      new_chemical: t("new_chemical") === "true",
      screening_answers: screening,
      pathway,
      hse_gate_status: "pending",
      path_answers: pathAnswers,
      impact_areas: impactAreas,
      risk_level: t("risk_level"),
      linked_assessment_id: linkedAssessmentId,
      hazard_analysis_required: t("hazard_analysis_required") === "true",
      hazard_analysis_type: t("hazard_analysis_type") || null,
      pssr_required: t("pssr_required") === "true",
      implementation_plan: t("implementation_plan"),
      target_date: t("target_date"),
      status: "hse_gate",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  redirect(`/portal/health-safety/moc/${created.id}`);
}

export default async function NewMoc({ searchParams }) {
  const { organization } = await requireOrganizationAccess(
    "risk_management",
    "contribute",
    "/portal/health-safety/moc/new",
  );
  const params = await searchParams;
  const requestedAssetId = String(params?.asset || "").trim();
  const admin = createAdminClient();

  const [{ data: assessments = [] }, { data: assets = [] }] = await Promise.all([
    admin
      .from("hs_risk_assessments")
      .select("id,assessment_reference,title")
      .eq("organization_id", organization.id)
      .in("status", ["approved", "communicated"])
      .order("updated_at", { ascending: false }),
    admin
      .from("organization_assets")
      .select("id,asset_reference,asset_name,asset_type,site_location_id,site_location_label,area_department,asset_owner_person_id,criticality,ppm_required,next_maintenance_date,operational_status")
      .eq("organization_id", organization.id)
      .eq("operational_status", "active")
      .order("asset_reference"),
  ]);

  const selectedAsset = assets.find((asset) => asset.id === requestedAssetId) || null;

  return (
    <main className="mn">
      <style>{`*{box-sizing:border-box}.mn{min-height:100vh;padding:32px 22px 90px;background:#edf4f8;color:#071d3a;font-family:Arial,sans-serif}.ms{max-width:1120px;margin:auto}.mh{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;flex-wrap:wrap;margin-bottom:22px}.mh small{color:#087f6c;font-weight:900;letter-spacing:.1em}.mh h1{margin:6px 0;font-size:34px}.mh p{margin:0;color:#657b91}.mb{padding:11px 15px;border:1px solid #cbd8e3;border-radius:9px;background:#fff;color:#173b59;text-decoration:none;font-weight:850}`}</style>
      <div className="ms">
        <header className="mh">
          <div>
            <small>H&amp;S HUB · CONTROLLED CHANGE</small>
            <h1>Start Management of Change</h1>
            <p>Screen, assess, approve, implement and verify organisational or operational change.</p>
          </div>
          <Link className="mb" href="/portal/health-safety/moc">← MOC Register</Link>
        </header>
        <MocInitiationForm
          action={createMoc}
          assessments={assessments}
          assets={assets}
          selectedAsset={selectedAsset}
          today={new Date().toISOString().slice(0, 10)}
        />
      </div>
    </main>
  );
}
