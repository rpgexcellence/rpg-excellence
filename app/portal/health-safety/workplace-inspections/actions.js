"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOrganizationAccess } from "../../../../lib/organization-access";
import { requirePlanAccess } from "../../../../lib/plan-access";
import { createAdminClient } from "../../../../lib/supabase/admin";
import {
  AREA_PROFILE_FIELDS,
  buildInspectionPlan,
  loadProgrammeRiskSignals,
  loadQuestionsForPacks,
  validateAdministrationSite,
  validateCompanyPeople,
} from "../../../../lib/workplace-inspections";

const ROOT = "/portal/health-safety/workplace-inspections";

function text(formData, name, maximum = 2000) {
  const value = String(formData.get(name) || "").trim();
  if (value.length > maximum) throw new Error(`${name.replaceAll("_", " ")} is too long.`);
  return value;
}

function required(formData, name, label, maximum = 300) {
  const value = text(formData, name, maximum);
  if (!value) throw new Error(`${label} is required.`);
  return value;
}

function positiveInteger(formData, name, fallback = 1) {
  const value = Number.parseInt(String(formData.get(name) || fallback), 10);
  if (!Number.isInteger(value) || value < 1 || value > 365) {
    throw new Error("Enter a valid inspection frequency.");
  }
  return value;
}

function validDate(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error(`${label} must be a valid date.`);
  }
  return value;
}

function areaProfileFromForm(formData) {
  return Object.fromEntries(
    AREA_PROFILE_FIELDS.map(([key]) => [key, formData.get(key) === "true"]),
  );
}

function programmeReference() {
  return `WIP-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function inspectionReference() {
  return `WPI-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

async function authorisedContext(minimumLevel = "contribute") {
  const context = await requireOrganizationAccess("risk_management", minimumLevel, ROOT);
  await requirePlanAccess(context.user, "professional", "Health and Safety");
  return context;
}

async function replaceProgrammePacks(admin, organizationId, programmeId, plan) {
  const { data: packs, error: packError } = await admin
    .from("hs_inspection_question_packs")
    .select("id,pack_code")
    .in("pack_code", plan.packCodes)
    .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
    .eq("active", true);
  if (packError) throw new Error(packError.message);

  const packByCode = new Map((packs || []).map((pack) => [pack.pack_code, pack]));
  const missing = plan.packCodes.filter((code) => !packByCode.has(code));
  if (missing.length) throw new Error(`The following inspection packs are unavailable: ${missing.join(", ")}.`);

  const { error: deleteError } = await admin
    .from("hs_inspection_programme_packs")
    .delete()
    .eq("organization_id", organizationId)
    .eq("programme_id", programmeId);
  if (deleteError) throw new Error(deleteError.message);

  const reasonsByCode = new Map();
  for (const reason of plan.reasons) {
    const current = reasonsByCode.get(reason.packCode) || [];
    current.push(reason);
    reasonsByCode.set(reason.packCode, current);
  }

  const rows = plan.packCodes.map((code) => {
    const reasons = reasonsByCode.get(code) || [];
    const first = reasons[0] || {};
    const allowedSources = [
      "dynamic_engine", "customer", "previous_inspection", "risk_assessment",
      "asset", "audit", "incident",
    ];
    return {
      organization_id: organizationId,
      programme_id: programmeId,
      pack_id: packByCode.get(code).id,
      selection_source: allowedSources.includes(first.source) ? first.source : "dynamic_engine",
      selection_reason: reasons.map((item) => item.reason).filter(Boolean).join(" ") || null,
    };
  });

  const { error: insertError } = await admin.from("hs_inspection_programme_packs").insert(rows);
  if (insertError) throw new Error(insertError.message);
}

async function programmeInput(formData, context, existingProgrammeId = null) {
  const organizationId = context.organization.id;
  const templateId = required(formData, "template_id", "Inspection template", 80);
  const siteId = required(formData, "administration_location_id", "Site", 80);
  const accountablePersonId = required(formData, "accountable_person_id", "Accountable owner", 80);
  const leadInspectorPersonId = required(formData, "lead_inspector_person_id", "Lead inspector", 80);
  const reviewerPersonId = required(formData, "reviewer_person_id", "Independent reviewer", 80);
  const frequencyAmount = positiveInteger(formData, "frequency_amount");
  const frequencyUnit = required(formData, "frequency_unit", "Frequency unit", 20);
  if (!["days", "weeks", "months", "years"].includes(frequencyUnit)) {
    throw new Error("Frequency unit must be days, weeks, months or years.");
  }
  if (leadInspectorPersonId === reviewerPersonId) {
    throw new Error("The lead inspector cannot independently review their own inspection.");
  }

  await validateCompanyPeople(organizationId, [
    accountablePersonId,
    leadInspectorPersonId,
    reviewerPersonId,
  ]);
  const site = await validateAdministrationSite(organizationId, siteId);

  const admin = createAdminClient();
  const { data: template, error: templateError } = await admin
    .from("hs_inspection_templates")
    .select("id,title,status")
    .eq("id", templateId)
    .eq("status", "active")
    .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
    .maybeSingle();
  if (templateError) throw new Error(templateError.message);
  if (!template) throw new Error("Select a current Workplace Inspection template.");

  const lastInspectionDate = text(formData, "last_inspection_date", 10) || null;
  if (lastInspectionDate) validDate(lastInspectionDate, "Last inspection date");
  const areaProfile = areaProfileFromForm(formData);
  const signals = await loadProgrammeRiskSignals(organizationId, {
    programmeId: existingProgrammeId,
    siteId,
  });
  const plan = buildInspectionPlan({
    areaProfile,
    signals,
    frequencyAmount,
    frequencyUnit,
    lastInspectionDate,
  });

  return {
    admin,
    plan,
    values: {
      organization_id: organizationId,
      owner_id: context.organization.owner_id,
      title: required(formData, "title", "Programme title", 180),
      template_id: template.id,
      administration_location_id: String(site.id),
      administration_location_label: site.label,
      area_department: text(formData, "area_department", 180) || null,
      accountable_person_id: accountablePersonId,
      lead_inspector_person_id: leadInspectorPersonId,
      reviewer_person_id: reviewerPersonId,
      frequency_amount: frequencyAmount,
      frequency_unit: frequencyUnit,
      last_inspection_date: lastInspectionDate,
      next_inspection_date: plan.nextInspectionDate,
      risk_score: plan.riskScore,
      risk_band: plan.riskBand,
      planning_basis: plan.planningBasis,
      area_profile: areaProfile,
      status: "active",
      updated_by_user_id: context.user.id,
      updated_at: new Date().toISOString(),
    },
  };
}

export async function createInspectionProgramme(previousState, formData) {
  let savedId;
  try {
    const context = await authorisedContext("contribute");
    const { admin, values, plan } = await programmeInput(formData, context);
    const { data, error } = await admin
      .from("hs_inspection_programmes")
      .insert({
        ...values,
        programme_reference: programmeReference(),
        created_by_user_id: context.user.id,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    try {
      await replaceProgrammePacks(admin, context.organization.id, data.id, plan);
    } catch (error) {
      await admin.from("hs_inspection_programmes").delete().eq("id", data.id);
      throw error;
    }

    savedId = data.id;
    revalidatePath(ROOT);
    revalidatePath("/portal/health-safety/management-board");
  } catch (error) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    return { error: error.message || "The inspection programme could not be saved." };
  }
  redirect(`${ROOT}/programmes/${savedId}`);
}

export async function updateInspectionProgramme(previousState, formData) {
  try {
    const context = await authorisedContext("contribute");
    const programmeId = required(formData, "programme_id", "Programme", 80);
    const admin = createAdminClient();
    const { data: existing, error: existingError } = await admin
      .from("hs_inspection_programmes")
      .select("id")
      .eq("id", programmeId)
      .eq("organization_id", context.organization.id)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);
    if (!existing) throw new Error("The inspection programme was not found in your organisation.");

    const prepared = await programmeInput(formData, context, programmeId);
    const { error } = await prepared.admin
      .from("hs_inspection_programmes")
      .update(prepared.values)
      .eq("id", programmeId)
      .eq("organization_id", context.organization.id);
    if (error) throw new Error(error.message);
    await replaceProgrammePacks(
      prepared.admin,
      context.organization.id,
      programmeId,
      prepared.plan,
    );

    revalidatePath(ROOT);
    revalidatePath(`${ROOT}/programmes/${programmeId}`);
    revalidatePath("/portal/health-safety/management-board");
    return {
      success: "Programme saved. Its checklist and next date have been recalculated.",
      plan: prepared.plan,
    };
  } catch (error) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    return { error: error.message || "The inspection programme could not be updated." };
  }
}

export async function generateScheduledInspection(previousState, formData) {
  let inspectionId;
  try {
    const context = await authorisedContext("contribute");
    const organizationId = context.organization.id;
    const programmeId = required(formData, "programme_id", "Programme", 80);
    const admin = createAdminClient();
    const { data: programme, error: programmeError } = await admin
      .from("hs_inspection_programmes")
      .select("*")
      .eq("id", programmeId)
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .maybeSingle();
    if (programmeError) throw new Error(programmeError.message);
    if (!programme) throw new Error("Select an active inspection programme.");

    await validateCompanyPeople(organizationId, [
      programme.accountable_person_id,
      programme.lead_inspector_person_id,
      programme.reviewer_person_id,
    ]);
    await validateAdministrationSite(organizationId, programme.administration_location_id);

    const { data: links, error: linkError } = await admin
      .from("hs_inspection_programme_packs")
      .select("pack:hs_inspection_question_packs(pack_code)")
      .eq("organization_id", organizationId)
      .eq("programme_id", programmeId);
    if (linkError) throw new Error(linkError.message);
    const packCodes = (links || []).map((item) => item.pack?.pack_code).filter(Boolean);
    const questions = await loadQuestionsForPacks(organizationId, packCodes);
    if (!questions.length) throw new Error("No active questions were found for this programme.");

    const plannedDate = validDate(
      text(formData, "planned_date", 10) || programme.next_inspection_date,
      "Planned inspection date",
    );
    const plannedStart = `${plannedDate}T${text(formData, "planned_start_time", 5) || "09:00"}:00.000Z`;
    const durationMinutes = Math.min(720, Math.max(15, Number(formData.get("duration_minutes")) || 120));
    const plannedEnd = new Date(new Date(plannedStart).getTime() + durationMinutes * 60000).toISOString();

    const { data: inspection, error: inspectionError } = await admin
      .from("hs_workplace_inspections")
      .insert({
        organization_id: organizationId,
        owner_id: context.organization.owner_id,
        programme_id: programme.id,
        template_id: programme.template_id,
        inspection_reference: inspectionReference(),
        title: required(formData, "title", "Inspection title", 180),
        inspection_type: text(formData, "inspection_type", 40) || "workplace",
        administration_location_id: programme.administration_location_id,
        administration_location_label: programme.administration_location_label,
        area_department: programme.area_department,
        planned_start_at: new Date(plannedStart).toISOString(),
        planned_end_at: plannedEnd,
        status: "planned",
        lead_inspector_person_id: programme.lead_inspector_person_id,
        accountable_person_id: programme.accountable_person_id,
        reviewer_person_id: programme.reviewer_person_id,
        planning_risk_score: programme.risk_score,
        planning_risk_band: programme.risk_band,
        planning_basis: programme.planning_basis,
        scope: text(formData, "scope", 3000) || null,
        created_by_user_id: context.user.id,
        updated_by_user_id: context.user.id,
      })
      .select("id")
      .single();
    if (inspectionError) throw new Error(inspectionError.message);

    const responseRows = questions.map((question) => ({
      organization_id: organizationId,
      inspection_id: inspection.id,
      template_question_id: question.id,
      question_code: question.question_code,
      section_code: question.section_code,
      section_title: question.section_title,
      question_text: question.question_text,
      legislation_guidance: question.legislation_guidance,
      inspector_guidance: question.inspector_guidance,
      display_order: question.display_order,
    }));
    const { error: responseError } = await admin
      .from("hs_workplace_inspection_responses")
      .insert(responseRows);
    if (responseError) {
      await admin.from("hs_workplace_inspections").delete().eq("id", inspection.id);
      throw new Error(responseError.message);
    }

    inspectionId = inspection.id;
    revalidatePath(ROOT);
    revalidatePath("/portal/health-safety/management-board");
  } catch (error) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    return { error: error.message || "The scheduled inspection could not be created." };
  }
  redirect(`${ROOT}/${inspectionId}`);
}

export async function refreshInspectionProgramme(previousState, formData) {
  try {
    const context = await authorisedContext("contribute");
    const programmeId = required(formData, "programme_id", "Programme", 80);
    const admin = createAdminClient();
    const { data: programme, error } = await admin
      .from("hs_inspection_programmes")
      .select("*")
      .eq("id", programmeId)
      .eq("organization_id", context.organization.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!programme) throw new Error("The inspection programme was not found.");

    const signals = await loadProgrammeRiskSignals(context.organization.id, {
      programmeId,
      siteId: programme.administration_location_id,
    });
    const plan = buildInspectionPlan({
      areaProfile: programme.area_profile,
      signals,
      frequencyAmount: programme.frequency_amount,
      frequencyUnit: programme.frequency_unit,
      lastInspectionDate: programme.last_inspection_date,
    });
    const { error: updateError } = await admin
      .from("hs_inspection_programmes")
      .update({
        risk_score: plan.riskScore,
        risk_band: plan.riskBand,
        next_inspection_date: plan.nextInspectionDate,
        planning_basis: plan.planningBasis,
        updated_by_user_id: context.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", programmeId)
      .eq("organization_id", context.organization.id);
    if (updateError) throw new Error(updateError.message);
    await replaceProgrammePacks(admin, context.organization.id, programmeId, plan);

    revalidatePath(ROOT);
    revalidatePath(`${ROOT}/programmes/${programmeId}`);
    revalidatePath("/portal/health-safety/management-board");
    return { success: "Risk signals, checklist packs and the next inspection date were refreshed.", plan };
  } catch (error) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    return { error: error.message || "The inspection programme could not be refreshed." };
  }
}
