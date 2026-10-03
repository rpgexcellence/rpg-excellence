"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";

import { incidentScenarios, synchroniseIncidentScenarios } from "../../../../lib/bcpIncidentScenarioLinks";

import { buildIncidentTeam } from "../../../../lib/bcpIncidentTeamEngine";

const clean = (value, max = 4000) => String(value ?? "").trim().slice(0, max);
const parse = (fd, name, fallback) => {
  try {
    const value = JSON.parse(clean(fd.get(name), 1000000) || JSON.stringify(fallback));
    return value ?? fallback;
  } catch {
    return fallback;
  }
};
const sourceVersion = (row) => row ? { id: row.id, version: row.version || 1, status: row.status } : null;

export async function saveIncidentManagement(_state, fd) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/business-continuity/incident-management");

  const { data: organization } = await supabase.from("organizations").select("id,name").eq("owner_id", user.id).order("created_at").limit(1).maybeSingle();
  if (!organization) return { error: "Create an organisation before starting Module 9." };

  const text = (name, max) => clean(fd.get(name), max);
  const id = text("assessment_id", 80);
  const intent = text("intent", 30);
  let existing = null;
  if (id) {
    const { data, error } = await supabase.from("bcp_incident_management_assessments").select("*").eq("id", id).eq("organization_id", organization.id).eq("owner_id", user.id).maybeSingle();
    if (error) return { error: error.message };
    existing = data;
    if (!existing) return { error: "This Module 9 assessment could not be found." };
  }
  if (intent === "archive") {
    if (!existing) return { error: "Only an existing assessment can be archived." };
    const { error } = await supabase.from("bcp_incident_management_assessments").update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", existing.id).eq("owner_id", user.id);
    if (error) return { error: error.message };
    redirect("/portal/business-continuity");
  }

  const sourceIds = {
    site: text("site_profile_id", 80),
    context: text("context_assessment_id", 80),
    roles: text("role_assessment_id", 80),
    hazards: text("hazard_assessment_id", 80),
    bia: text("bia_assessment_id", 80),
    strategy: text("strategy_assessment_id", 80),
  };
  const specs = [
    ["site", "bcp_site_profiles"], ["context", "bcp_context_assessments"],
    ["roles", "bcp_role_assessments"], ["hazards", "bcp_hazard_assessments"],
    ["bia", "bcp_bia_assessments"], ["strategy", "bcp_strategy_assessments"],
  ];
  const results = await Promise.all(specs.map(([key, table]) => sourceIds[key]
    ? supabase.from(table).select("*").eq("id", sourceIds[key]).eq("organization_id", organization.id).neq("status", "archived").maybeSingle()
    : Promise.resolve({ data: null, error: null })));
  const sourceError = results.find((result) => result.error)?.error;
  if (sourceError) return { error: sourceError.message };
  const sources = Object.fromEntries(specs.map(([key], index) => [key, results[index].data]));
  if (!sources.site || !sources.roles || !sources.hazards || !sources.strategy) {
    return { error: "Select valid controlled records from Modules 1, 4, 5 and 8." };
  }

  const teams = parse(fd, "response_teams", []);
  const rawThresholds = parse(fd, "activation_thresholds", []);
  const thresholds = synchroniseIncidentScenarios(rawThresholds, incidentScenarios(sources.hazards));
  const communications = parse(fd, "warning_communications", []);
  const actionPlan = parse(fd, "incident_action_plan", []);
  const recovery = parse(fd, "recovery_stand_down", {});
  if (![teams, rawThresholds, communications, actionPlan].every(Array.isArray) || !recovery || typeof recovery !== "object" || Array.isArray(recovery)) return { error: "Invalid Module 9 form data." };
  const sourceScenarios = new Map((sources.hazards.scenario_assessments || []).filter((item) => item.includeInIncidentPlan !== false).map((item) => [item.id, item]));
  const availableScenarios = new Set(sourceScenarios.keys());
  const unresolvedScenarios = thresholds.filter((item) => !availableScenarios.has(item.scenarioId));
  thresholds.forEach((item) => { const source = sourceScenarios.get(item.scenarioId); if (source) item.scenario = source.name; });
  const approverPersonId = text("approver_person_id", 80);
  const personIds = [...new Set([
    ...teams.flatMap((item) => [item.leadPersonId, item.alternatePersonId]),
    ...communications.map((item) => item.ownerPersonId),
    ...actionPlan.map((item) => item.ownerPersonId),
    approverPersonId,
  ].map((value) => clean(value, 80)).filter(Boolean))];
  let people = [];
  if (personIds.length) {
    const { data, error } = await supabase.from("organization_people").select("id,first_name,last_name,position,account_status").eq("organization_id", organization.id).in("id", personIds).not("account_status", "in", "(suspended,closed)");
    if (error) return { error: error.message };
    people = data || [];
    if (people.length !== personIds.length) return { error: "One or more selected people are no longer active Company Users." };
  }
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const personName = (personId) => {
    const person = peopleById.get(personId);
    return person ? `${person.first_name} ${person.last_name}` : "";
  };
  teams.forEach((item) => { item.lead = personName(item.leadPersonId); item.alternate = personName(item.alternatePersonId); });
  teams.forEach((item, index) => { teams[index] = buildIncidentTeam(item, { people, siteName: sources.site.location_name || "", scenarios: thresholds.filter((row) => availableScenarios.has(row.scenarioId)) }); });
  communications.forEach((item) => { item.owner = personName(item.ownerPersonId); });
  actionPlan.forEach((item) => { item.owner = personName(item.ownerPersonId); });

  const checks = [
    Boolean(sources.site && sources.roles && sources.hazards && sources.strategy),
    teams.length > 0 && teams.every((item) => clean(item.name) && clean(item.leadPersonId) && clean(item.alternatePersonId) && item.leadPersonId !== item.alternatePersonId && clean(item.authority) && clean(item.responsibilities) && clean(item.procedure) && (item.procedureMode !== "automatic" || (Array.isArray(item.procedureSelections) && item.procedureSelections.length > 0))),
    thresholds.length > 0 && unresolvedScenarios.length === 0 && thresholds.every((item) => clean(item.scenario) && clean(item.activationCriteria) && clean(item.initialControls) && clean(item.responseLevel)),
    communications.length > 0 && communications.every((item) => clean(item.audience) && clean(item.what) && clean(item.when) && clean(item.primaryMethod) && clean(item.fallbackMethod) && clean(item.ownerPersonId) && clean(item.logMethod)),
    actionPlan.length > 0 && actionPlan.every((item) => clean(item.objective) && clean(item.action) && clean(item.ownerPersonId) && clean(item.priority) && clean(item.status)),
    ["normalOperationsCriteria", "handbackAuthority", "eocClosureCriteria", "standDownProcess", "employeeSupport", "postIncidentReview", "planAvailability"].every((key) => clean(recovery[key])) && Boolean(approverPersonId),
  ];
  const labels = ["controlled source links", "response teams, deputies and authority", "activation thresholds", "warning and communication controls", "Incident Action Plan", "recovery, stand-down and competent approver"];
  const failed = labels.filter((_, index) => !checks[index]);
  const completion = Math.round(checks.filter(Boolean).length / checks.length * 100);
  let submissionError = "";
  if (["review", "approve"].includes(intent) && failed.length) submissionError = `Outstanding Module 9 controls: ${failed.join(", ")}.`;
  if (intent === "approve" && Object.values(sources).filter(Boolean).some((source) => source.status !== "approved")) submissionError = submissionError || "Every linked controlled source must be approved before Module 9 can be approved.";
  const effectiveIntent = submissionError ? "draft" : intent;
  const now = new Date().toISOString();
  const currentVersion = Number(existing?.version) || 1;
  const editingApproved = existing?.status === "approved";
  const version = editingApproved ? currentVersion + 1 : currentVersion;
  const status = effectiveIntent === "approve" ? "approved" : effectiveIntent === "review" ? "ready_for_review" : "draft";
  const approver = personName(approverPersonId);
  const data = {
    owner_id: user.id,
    organization_id: organization.id,
    site_profile_id: sources.site.id,
    context_assessment_id: sources.context?.id || null,
    role_assessment_id: sources.roles.id,
    hazard_assessment_id: sources.hazards.id,
    bia_assessment_id: sources.bia?.id || null,
    strategy_assessment_id: sources.strategy.id,
    approver_person_id: approverPersonId || null,
    assessment_title: text("assessment_title", 250) || "Incident Management, Response & Recovery",
    source_versions: Object.fromEntries(Object.entries(sources).map(([key, value]) => [key, sourceVersion(value)])),
    source_snapshot: sources,
    response_teams: teams,
    activation_thresholds: thresholds,
    warning_communications: communications,
    incident_action_plan: actionPlan,
    recovery_stand_down: recovery,
    assurance_summary: { checks, failed, unresolvedScenarios: unresolvedScenarios.map((item) => item.scenario || "Unnamed scenario"), teams: teams.length, thresholds: thresholds.length, communications: communications.length, openActions: actionPlan.filter((item) => item.status !== "closed").length },
    review_frequency: text("review_frequency", 80) || "Every 12 months",
    next_review_date: text("next_review_date", 30) || null,
    completion_percent: completion,
    status,
    version,
    prepared_by: existing?.prepared_by || user.email || "Account owner",
    reviewed_by: effectiveIntent === "approve" ? approver : null,
    reviewed_at: effectiveIntent === "approve" ? now : null,
    review_comment: text("review_comment", 4000) || null,
    approved_by: effectiveIntent === "approve" ? approver : null,
    approved_at: effectiveIntent === "approve" ? now : null,
    updated_at: now,
  };

  if (editingApproved) {
    const { error } = await supabase.from("bcp_incident_management_versions").upsert({ assessment_id: existing.id, organization_id: organization.id, owner_id: user.id, version: currentVersion, status: existing.status, snapshot: existing, change_reason: "Approved version preserved before amendment" }, { onConflict: "assessment_id,version", ignoreDuplicates: true });
    if (error) return { error: error.message };
  }
  let savedId = existing?.id;
  let saveError;
  if (existing) ({ error: saveError } = await supabase.from("bcp_incident_management_assessments").update(data).eq("id", existing.id).eq("owner_id", user.id).eq("updated_at", existing.updated_at).select("id").single());
  else {
    const result = await supabase.from("bcp_incident_management_assessments").insert({ ...data, assessment_reference: `BCP-IMS-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}` }).select("id").single();
    savedId = result.data?.id;
    saveError = result.error;
  }
  if (saveError) return { error: saveError.message };
  if (effectiveIntent === "approve") {
    const { error } = await supabase.from("bcp_incident_management_versions").upsert({ assessment_id: savedId, organization_id: organization.id, owner_id: user.id, version, status, snapshot: { ...data, id: savedId }, change_reason: data.review_comment || "Controlled Module 9 approval" }, { onConflict: "assessment_id,version", ignoreDuplicates: true });
    if (error) return { error: error.message };
  }
  if (submissionError) return { error: `Draft saved successfully. Approval was not completed: ${submissionError}`, savedId };
  if (intent === "continue") redirect(`/portal/business-continuity/incident-management?id=${savedId}&step=${Math.max(0, Math.min(5, Number(text("next_step", 5)) || 0))}`);
  redirect(`/portal/business-continuity/incident-management?id=${savedId}&step=5`);
}
