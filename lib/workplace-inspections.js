import { createAdminClient } from "./supabase/admin";

export const WORKPLACE_INSPECTION_PACKS = Object.freeze({
  core: "CORE_WORKPLACE",
  gas_cylinders: "COMPRESSED_GASES",
  hazardous_substances: "CHEMICALS_COSHH",
  machinery: "MACHINERY_PUWER",
  lifting_equipment: "LIFTING_LOLER",
  pressure_systems: "PRESSURE_SYSTEMS",
  welding_hot_work: "WELDING_HOT_WORK",
  radiation_lasers: "RADIATION_LASER",
  biological_hazards: "BIOLOGICAL",
  noise_vibration: "NOISE_VIBRATION",
  work_at_height: "WORK_AT_HEIGHT",
  confined_spaces: "CONFINED_SPACES",
  enhanced_fire_risk: "FIRE_EMERGENCY",
  material_environmental_aspects: "ENVIRONMENTAL",
  office_welfare: "OFFICE_WELFARE",
});

export const AREA_PROFILE_FIELDS = Object.freeze([
  ["gas_cylinders", "Compressed or liquefied gas cylinders"],
  ["hazardous_substances", "Hazardous substances or COSHH controls"],
  ["machinery", "Machinery, work equipment or guarding"],
  ["lifting_equipment", "Lifting equipment or accessories"],
  ["pressure_systems", "Pressure systems or pressure vessels"],
  ["welding_hot_work", "Welding, cutting or hot work"],
  ["radiation_lasers", "Ionising radiation, UV or lasers"],
  ["biological_hazards", "Biological materials or biohazards"],
  ["noise_vibration", "Material noise or vibration exposure"],
  ["work_at_height", "Work at height"],
  ["confined_spaces", "Confined spaces"],
  ["enhanced_fire_risk", "Enhanced fire or explosion risk"],
  ["material_environmental_aspects", "Material environmental aspects"],
  ["office_welfare", "Office, display-screen or welfare facilities"],
]);

const SEVERITY_DUE_DAYS = Object.freeze({
  critical: 1,
  high: 7,
  medium: 31,
  low: 62,
});

function assertOrganizationId(organizationId) {
  if (!organizationId) throw new Error("An organisation is required.");
}

function asDate(value = new Date()) {
  const date = value instanceof Date ? new Date(value) : new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new Error("A valid date is required.");
  return date;
}

function dateOnly(value) {
  return asDate(value).toISOString().slice(0, 10);
}

function addCalendarMonths(date, amount) {
  const result = new Date(date);
  const originalDay = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + amount);
  const lastDay = new Date(Date.UTC(
    result.getUTCFullYear(),
    result.getUTCMonth() + 1,
    0,
  )).getUTCDate();
  result.setUTCDate(Math.min(originalDay, lastDay));
  return result;
}

export function addFrequency(date, amount = 1, unit = "months") {
  const result = asDate(date);
  const count = Math.max(1, Number.parseInt(amount, 10) || 1);

  if (unit === "years") return addCalendarMonths(result, count * 12);
  if (unit === "months") return addCalendarMonths(result, count);
  if (unit === "weeks") result.setUTCDate(result.getUTCDate() + count * 7);
  else if (unit === "days") result.setUTCDate(result.getUTCDate() + count);
  else throw new Error("Frequency unit must be days, weeks, months or years.");

  return result;
}

export function calculateSignalScore(signals = []) {
  return Math.min(
    100,
    signals
      .filter((signal) => signal?.active !== false)
      .reduce((total, signal) => {
        const supplied = Number(signal.signal_score);
        if (Number.isFinite(supplied)) return total + supplied;

        const severity = Math.min(5, Math.max(1, Number(signal.severity) || 1));
        const likelihood = Math.min(5, Math.max(1, Number(signal.likelihood) || 1));
        const weighting = Math.min(5, Math.max(1, Number(signal.weighting) || 1));
        return total + Math.min(100, severity * likelihood * weighting);
      }, 0),
  );
}

export function riskBandForScore(score) {
  if (score >= 60) return "critical";
  if (score >= 40) return "high";
  if (score >= 20) return "medium";
  return "routine";
}

export function buildInspectionPlan({
  areaProfile = {},
  signals = [],
  frequencyAmount = 1,
  frequencyUnit = "months",
  lastInspectionDate,
  startDate = new Date(),
} = {}) {
  const packCodes = [WORKPLACE_INSPECTION_PACKS.core];
  const reasons = [{
    packCode: WORKPLACE_INSPECTION_PACKS.core,
    source: "dynamic_engine",
    reason: "Core workplace inspection requirements apply to every programme.",
  }];

  for (const [profileKey] of AREA_PROFILE_FIELDS) {
    if (!areaProfile?.[profileKey]) continue;
    const packCode = WORKPLACE_INSPECTION_PACKS[profileKey];
    if (!packCodes.includes(packCode)) packCodes.push(packCode);
    reasons.push({
      packCode,
      source: "customer",
      reason: `Selected because the inspected area profile includes ${profileKey.replaceAll("_", " ")}.`,
    });
  }

  const activeSignals = signals.filter((signal) => signal?.active !== false);
  for (const signal of activeSignals) {
    const suggestedPack = signal.pack_code || signal.suggested_pack_code;
    if (!suggestedPack || !Object.values(WORKPLACE_INSPECTION_PACKS).includes(suggestedPack)) continue;
    if (!packCodes.includes(suggestedPack)) packCodes.push(suggestedPack);
    reasons.push({
      packCode: suggestedPack,
      source: signal.source_module || "dynamic_engine",
      reason: signal.summary || "Added from a connected risk signal.",
    });
  }

  const riskScore = calculateSignalScore(activeSignals);
  const riskBand = riskBandForScore(riskScore);
  const anchor = lastInspectionDate ? asDate(lastInspectionDate) : asDate(startDate);
  const routineDate = addFrequency(anchor, frequencyAmount, frequencyUnit);
  const acceleratedDays = { critical: 7, high: 30, medium: 90 }[riskBand];
  const acceleratedDate = acceleratedDays
    ? addFrequency(startDate, acceleratedDays, "days")
    : routineDate;
  const nextInspection = acceleratedDate < routineDate ? acceleratedDate : routineDate;

  return {
    packCodes,
    reasons,
    riskScore,
    riskBand,
    nextInspectionDate: dateOnly(nextInspection),
    planningBasis: activeSignals.length
      ? `${activeSignals.length} active connected risk signal(s); score ${riskScore}/100 (${riskBand}). The earlier of the normal cycle and risk-triggered date applies.`
      : `No active connected risk signals. The normal ${frequencyAmount} ${frequencyUnit} cycle applies.`,
  };
}

export function calculateActionDueDate(severity, raisedAt = new Date()) {
  const normalized = String(severity || "low").toLowerCase();
  const days = SEVERITY_DUE_DAYS[normalized] ?? SEVERITY_DUE_DAYS.low;
  return dateOnly(addFrequency(raisedAt, days, "days"));
}

export function companyPersonLabel(person) {
  const name = [person?.first_name, person?.last_name].filter(Boolean).join(" ");
  return name || person?.email || "Unnamed Company User";
}

export function organizationSiteLabel(site) {
  const address = [
    site?.address_line_1,
    site?.address_line_2,
    site?.city,
    site?.region,
    site?.postal_code,
    site?.country,
  ].filter(Boolean).join(", ");

  return [site?.site_reference, site?.site_name, address].filter(Boolean).join(" Â· ");
}

export async function loadWorkplaceInspectionOptions(organizationId) {
  assertOrganizationId(organizationId);
  const admin = createAdminClient();

  const [peopleResult, sitesResult, templatesResult, packsResult, zonesResult] = await Promise.all([
    admin.from("organization_people")
      .select("id,first_name,last_name,email,position,account_status,user_id")
      .eq("organization_id", organizationId)
      .eq("account_status", "active")
      .order("first_name"),
    admin.from("organization_sites")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .order("is_primary", { ascending: false })
      .order("site_name"),
    admin.from("hs_inspection_templates")
      .select("*")
      .eq("status", "active")
      .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
      .order("is_system_template", { ascending: false })
      .order("title"),
    admin.from("hs_inspection_question_packs")
      .select("*")
      .eq("active", true)
      .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
      .order("title"),
    admin.from("organization_zones").select("id,site_id,reference,name,status").eq("organization_id", organizationId).neq("status", "archived").order("reference"),
  ]);

  for (const result of [peopleResult, sitesResult, templatesResult, packsResult, zonesResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  return {
    people: (peopleResult.data || []).map((person) => ({
      ...person,
      label: companyPersonLabel(person),
    })),
    sites: (sitesResult.data || []).map((site) => ({
      ...site,
      label: organizationSiteLabel(site),
    })),
    zones: zonesResult.data || [],
    templates: templatesResult.data || [],
    packs: packsResult.data || [],
  };
}

export async function validateCompanyPeople(organizationId, personIds = []) {
  assertOrganizationId(organizationId);
  const ids = [...new Set(personIds.filter(Boolean).map(String))];
  if (!ids.length) throw new Error("Select the required Company Users.");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organization_people")
    .select("id,account_status")
    .eq("organization_id", organizationId)
    .eq("account_status", "active")
    .in("id", ids);

  if (error) throw new Error(error.message);
  if ((data || []).length !== ids.length) {
    throw new Error("One or more selected people are not active Company Users for this organisation.");
  }
  return true;
}

export async function validateAdministrationSite(organizationId, siteId) {
  assertOrganizationId(organizationId);
  if (!siteId) throw new Error("Select a site from Administration â†’ Site Profile.");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organization_sites")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", String(siteId))
    .eq("status", "active")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Select a current site from Administration â†’ Site Profile.");
  return { ...data, label: organizationSiteLabel(data) };
}

export async function loadProgrammeRiskSignals(organizationId, {
  programmeId,
  siteId,
  asAt = new Date(),
} = {}) {
  assertOrganizationId(organizationId);
  const admin = createAdminClient();
  let query = admin
    .from("hs_inspection_risk_signals")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .or(`expires_at.is.null,expires_at.gte.${asDate(asAt).toISOString()}`)
    .order("occurred_at", { ascending: false });

  if (programmeId) query = query.eq("programme_id", programmeId);
  else if (siteId) query = query.eq("administration_location_id", String(siteId));

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function loadQuestionsForPacks(organizationId, packCodes = []) {
  assertOrganizationId(organizationId);
  const codes = [...new Set(packCodes.filter(Boolean))];
  if (!codes.length) return [];

  const admin = createAdminClient();
  const { data: packs, error: packError } = await admin
    .from("hs_inspection_question_packs")
    .select("id,pack_code,title")
    .in("pack_code", codes)
    .or(`organization_id.is.null,organization_id.eq.${organizationId}`);
  if (packError) throw new Error(packError.message);

  const packIds = (packs || []).map((pack) => pack.id);
  if (!packIds.length) return [];

  const { data, error } = await admin
    .from("hs_inspection_pack_questions")
    .select("pack_id,question:hs_inspection_template_questions(*)")
    .in("pack_id", packIds);
  if (error) throw new Error(error.message);

  const packById = new Map((packs || []).map((pack) => [pack.id, pack]));
  const unique = new Map();
  for (const row of data || []) {
    if (!row.question?.active) continue;
    const current = unique.get(row.question.id) || { ...row.question, packs: [] };
    const pack = packById.get(row.pack_id);
    if (pack && !current.packs.some((item) => item.id === pack.id)) current.packs.push(pack);
    unique.set(row.question.id, current);
  }

  return [...unique.values()].sort((a, b) =>
    Number(a.display_order || 0) - Number(b.display_order || 0),
  );
}

export function createInspectionReference(sequence, date = new Date()) {
  const year = asDate(date).getUTCFullYear();
  return `WPI-${year}-${String(sequence).padStart(5, "0")}`;
}

export function createProgrammeReference(sequence) {
  return `WIP-${String(sequence).padStart(4, "0")}`;
}
