import "server-only";
import { createAdminClient } from "./supabase/admin";
import { getOrganizationAccess } from "./organization-access";
import { redirect, notFound } from "next/navigation";
import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import {
  UUID,
  canReadIncident,
  isIncidentAdministrator,
} from "./incident-policy.mjs";
export const INCIDENT_ROOT = "/portal/incidents";
export const checkResult = (r) => {
  if (r.error) throw Error(r.error.message);
  return r.data;
};
export function reportSecret() {
  const secret =
    process.env.INCIDENT_REPORT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret)
    throw Error("Public reporting is not configured. Contact the site team.");
  return secret;
}
const mac = (value) =>
  createHmac("sha256", reportSecret()).update(value).digest("base64url");
export function issueReportTicket(token, now = Date.now()) {
  const data = Buffer.from(
    JSON.stringify({ token, issued: now, submission: randomUUID() }),
  ).toString("base64url");
  return data + "." + mac("incident-ticket:" + data);
}
export function verifyReportTicket(ticket, token, now = Date.now()) {
  const [data, signature] = String(ticket || "").split(".");
  const expected = mac("incident-ticket:" + data);
  if (
    !signature ||
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  )
    throw Error("This form expired. Refresh and try again.");
  let value;
  try {
    value = JSON.parse(Buffer.from(data, "base64url").toString());
  } catch {
    throw Error("Invalid reporting form.");
  }
  if (
    !Number.isFinite(value.issued) ||
    value.token !== token ||
    !UUID.test(value.submission) ||
    now - value.issued < 2000 ||
    now - value.issued > 7200000
  )
    throw Error("Refresh the form, complete it and try again.");
  return { ...value, receipt: mac("incident-receipt:" + ticket) };
}
export function intakeFingerprint(ip, token, now = Date.now()) {
  return mac(
    "incident-rate:" +
      Math.floor(now / 3600000) +
      ":" +
      token +
      ":" +
      String(ip || "unknown").slice(0, 160),
  );
}
export async function publicReportZone(token) {
  if (!UUID.test(String(token || ""))) notFound();
  const admin = createAdminClient();
  const zone = checkResult(
    await admin
      .from("organization_zones")
      .select(
        "id,organization_id,site_id,building_id,public_token,reference,name,status,access_mode",
      )
      .eq("public_token", token)
      .eq("status", "published")
      .maybeSingle(),
  );
  if (!zone) notFound();
  const site = checkResult(
    await admin
      .from("organization_sites")
      .select("id,site_name,timezone")
      .eq("id", zone.site_id)
      .eq("organization_id", zone.organization_id)
      .eq("status", "active")
      .maybeSingle(),
  );
  if (!site) notFound();
  return { admin, zone, site };
}
export async function incidentContext() {
  const access = await getOrganizationAccess("incidents", "view");
  if (!access.user) redirect("/portal/login?next=/portal/incidents");
  if (
    !access.organization ||
    (!access.allowed && !isIncidentAdministrator(access))
  )
    redirect("/portal/my-access?error=incident_access");
  return {
    ...access,
    admin: createAdminClient(),
    incidentAdministrator: isIncidentAdministrator(access),
  };
}
export async function incidentCase(id) {
  const context = await incidentContext();
  if (!UUID.test(id)) notFound();
  const report = checkResult(
    await context.admin
      .from("incident_reports")
      .select("*")
      .eq("id", id)
      .eq("organization_id", context.organization.id)
      .maybeSingle(),
  );
  if (!report || !canReadIncident(context, report)) notFound();
  return { ...context, report };
}
export async function loadIncidentRegister(context) {
  const reports = [];
  for (let start = 0; ; start += 500) {
    const rows =
      checkResult(
        await context.admin
          .from("incident_reports")
          .select("*")
          .eq("organization_id", context.organization.id)
          .order("created_at", { ascending: false })
          .order("id")
          .range(start, start + 499),
      ) || [];
    reports.push(...rows.filter((r) => canReadIncident(context, r)));
    if (rows.length < 500) break;
  }
  return reports;
}
export async function incidentPeople(context) {
  return (
    checkResult(
      await context.admin
        .from("organization_people")
        .select("id,first_name,last_name,email,user_id")
        .eq("organization_id", context.organization.id)
        .eq("account_status", "active")
        .order("last_name"),
    ) || []
  );
}
export async function refreshIncidentInspectionPlans(context, report) {
  if (!report.triaged_at) return;
  const [
    { synchroniseWorkplaceInspectionSignals },
    { loadProgrammeRiskSignals, buildInspectionPlan },
  ] = await Promise.all([
    import("./workplace-inspection-signal-sync"),
    import("./workplace-inspections"),
  ]);
  let query = context.admin
    .from("hs_inspection_programmes")
    .select("*")
    .eq("organization_id", report.organization_id)
    .eq("administration_location_id", String(report.site_id))
    .eq("status", "active");
  if (report.zone_id)
    query = query.or("zone_id.is.null,zone_id.eq." + report.zone_id);
  const programmes = checkResult(await query) || [];
  for (const p of programmes) {
    await synchroniseWorkplaceInspectionSignals(report.organization_id, p.id);
    const signals = await loadProgrammeRiskSignals(report.organization_id, {
      programmeId: p.id,
    });
    const plan = buildInspectionPlan({
      areaProfile: p.area_profile || {},
      signals,
      frequencyAmount: p.frequency_amount,
      frequencyUnit: p.frequency_unit,
      lastInspectionDate: p.last_inspection_date,
    });
    checkResult(
      await context.admin
        .from("hs_inspection_programmes")
        .update({
          risk_score: plan.riskScore,
          risk_band: plan.riskBand,
          next_inspection_date: plan.nextInspectionDate,
          planning_basis: plan.planningBasis,
          updated_at: new Date().toISOString(),
        })
        .eq("id", p.id)
        .eq("organization_id", report.organization_id),
    );
    const packs =
      checkResult(
        await context.admin
          .from("hs_inspection_question_packs")
          .select("id,pack_code")
          .in("pack_code", plan.packCodes)
          .eq("active", true)
          .or(
            "organization_id.is.null,organization_id.eq." +
              report.organization_id,
          ),
      ) || [];
    if (packs.length)
      checkResult(
        await context.admin.from("hs_inspection_programme_packs").upsert(
          packs.map((pack) => ({
            organization_id: report.organization_id,
            programme_id: p.id,
            pack_id: pack.id,
            selection_source: "incident",
            selection_reason:
              "Recalculated following triaged incident " + report.reference,
          })),
          { onConflict: "programme_id,pack_id", ignoreDuplicates: true },
        ),
      );
  }
}

export async function synchroniseIncidentPlanning(context, report) {
  if (!report.triaged_at) return;
  try {
    await refreshIncidentInspectionPlans(context, report);
    checkResult(
      await context.admin
        .from("incident_reports")
        .update({
          planning_sync_status: "succeeded",
          planning_sync_message:
            "Inspection signals and applicable programme plans refreshed.",
          planning_synced_at: new Date().toISOString(),
        })
        .eq("id", report.id)
        .eq("organization_id", context.organization.id)
        .eq("version", report.version),
    );
  } catch (error) {
    await context.admin
      .from("incident_reports")
      .update({
        planning_sync_status: "failed",
        planning_sync_message:
          "Inspection planning needs a retry. Check inspection migrations and question packs.",
      })
      .eq("id", report.id)
      .eq("organization_id", context.organization.id)
      .eq("version", report.version);
    throw error;
  }
}
