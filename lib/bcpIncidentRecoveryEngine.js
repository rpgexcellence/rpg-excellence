const list = (value) => Array.isArray(value) ? value : [];
const text = (value) => String(value ?? "").trim();
const personName = (id, people) => { const person = list(people).find((row) => row.id === id); return person ? [person.first_name, person.last_name].filter(Boolean).join(" ") : "Not assigned"; };
export const RECOVERY_SECTIONS = [
  { key: "normalOperationsCriteria", title: "Return to normal operations", guidance: "Define common conditions, then confirm criteria for each linked hazard. These are planning requirements, not a live all-clear.", options: ["Immediate hazards controlled and safe access confirmed", "Minimum staffing, resources and priority processes available", "Restored operations checked against agreed acceptance criteria", "Relevant authorities' restrictions and instructions addressed"] },
  { key: "handbackAuthority", title: "Operational handback", guidance: "Assign the person authorised to accept handback and a different deputy. Select the decisions they are authorised to make.", options: ["Accept operational handback after agreed checks", "Approve phased resumption and temporary restrictions", "Escalate unresolved risks to the incident controller", "Record the handback decision and notify affected teams"] },
  { key: "eocClosureCriteria", title: "Coordination centre closure", guidance: "Specify when incident coordination can close and how outstanding work will transfer.", options: ["Operational handback accepted by the authorised person", "Outstanding actions assigned with owners and target dates", "Affected parties informed of the transition", "Incident records secured and follow-up coordination assigned"] },
  { key: "standDownProcess", title: "Stand-down and resource release", guidance: "Select the steps required to release response resources in a controlled sequence.", options: ["Incident controller authorises phased stand-down", "Response teams and external support notified", "Equipment and temporary arrangements returned or transferred", "Remaining work and resource needs assigned to normal operations"] },
  { key: "employeeSupport", title: "People welfare and support", guidance: "Choose relevant support arrangements and assign a coordinator.", options: ["Confirm affected people are accounted for and support needs recorded", "Arrange welfare contact and appropriate confidential support", "Coordinate return-to-work and temporary working arrangements", "Monitor fatigue and wellbeing during recovery"] },
  { key: "postIncidentReview", title: "Review and improvement", guidance: "Assign the review owner and an achievable timeframe. Capture decisions, lessons and improvement actions.", options: ["Review the incident timeline and key response decisions", "Assess the effectiveness of response and recovery arrangements", "Assign improvement actions with owners and target dates", "Update controlled plans and communicate agreed lessons"] },
  { key: "planAvailability", title: "Plan access during an outage", guidance: "Select alternative access arrangements and record where the controlled copies are held.", options: ["Controlled printed copy at the response location", "Approved offline copy available to response leaders", "Alternative device or approved access route", "Copy owner maintains version control and access checks"] },
];
export function initialiseIncidentRecovery(value = {}) {
  const result = { ...value, formatVersion: 2, selections: { ...(value.selections || {}) }, localNotes: { ...(value.localNotes || {}) } };
  for (const section of RECOVERY_SECTIONS) {
    result.selections[section.key] = list(result.selections[section.key]);
    if (!(section.key in result.localNotes)) result.localNotes[section.key] = text(value[section.key]);
  }
  return result;
}
export function recoveryScenarioOptions(scenario) {
  const common = ["Immediate hazards controlled and any restrictions addressed", "Minimum people, resources and priority operations available", "Authorised handback and restart decision recorded"];
  const name = text(scenario?.name).toLowerCase();
  let specific = [];
  if (/cyber|it\b|ict|data|server|system|information/.test(name)) specific = ["Affected systems assessed and recovery validated by the responsible technical team", "Data integrity, access and priority services checked before release"];
  else if (/utility|power|electric|water|gas/.test(name)) specific = ["Required utility supply restored or approved alternative confirmed", "Affected equipment and systems checked before restart"];
  else if (/supplier|transport|logistic|customs|border/.test(name)) specific = ["Required supply or an approved alternative confirmed", "Priority delivery requirements and affected orders reviewed"];
  else if (/illness|pandemic|disease|workforce|staff/.test(name)) specific = ["Site-defined minimum staffing and critical competencies available", "Relevant health restrictions and return-to-work arrangements addressed"];
  else if (/spill|chemical|pollut|hazmat/.test(name)) specific = ["Affected area assessed and release agreed by the responsible competent person", "Cleanup, exposure controls and waste arrangements confirmed"];
  else if (/fire|flood|weather|earthquake|storm|evac|building|collapse/.test(name)) specific = ["Facility condition and access assessed by responsible competent personnel", "Required repairs, inspections and temporary controls accepted"];
  else specific = ["Cause of the disruption addressed and affected operations assessed", "Site-specific restart checks and acceptance criteria confirmed"];
  return [...specific, ...common];
}
export function synchroniseIncidentRecovery(value, { hazard, scenarios = [] } = {}) {
  const result = initialiseIncidentRecovery(value);
  result.scenarioRecovery = list(value?.scenarioRecovery).map((row) => ({ ...row, criteriaSelections: list(row.criteriaSelections) }));
  for (const scenario of scenarios) {
    const matches = result.scenarioRecovery.filter((row) => row.scenarioId === scenario.id && row.hazardAssessmentId === hazard?.id);
    if (matches.length) matches.forEach((row) => { row.scenario = scenario.name; });
    else result.scenarioRecovery.push({ scenarioId: scenario.id, hazardAssessmentId: hazard?.id || "", scenario: scenario.name, criteriaSelections: [], localCriteria: "" });
  }
  return result;
}
export function recoveryScenarioLinked(row, { hazard, scenarios = [] } = {}) {
  return row.hazardAssessmentId === hazard?.id && scenarios.some((source) => source.id === row.scenarioId);
}
const scenarioText = (row) => [list(row.criteriaSelections).join("; "), text(row.localCriteria), text(row.minimumPeople) ? `Minimum people required: ${text(row.minimumPeople)}.` : "", text(row.minimumWorkforcePercent) ? `Minimum workforce availability: ${text(row.minimumWorkforcePercent)}%.` : ""].filter(Boolean).join("\n");
export function buildIncidentRecovery(value, { people = [], hazard, scenarios = [], siteName = "" } = {}) {
  const result = synchroniseIncidentRecovery(value, { hazard, scenarios });
  for (const section of RECOVERY_SECTIONS) result[section.key] = [list(result.selections[section.key]).join("; "), text(result.localNotes[section.key])].filter(Boolean).join("\n");
  const scenarioLines = result.scenarioRecovery.filter((row) => recoveryScenarioLinked(row, { hazard, scenarios }) && scenarioText(row)).map((row) => `${row.scenario}:\n${scenarioText(row)}`);
  result.normalOperationsCriteria = [result.normalOperationsCriteria, ...scenarioLines].filter(Boolean).join("\n\n");
  if (result.handbackPersonId) result.handbackAuthority = [`Handback authority: ${personName(result.handbackPersonId, people)}. Deputy: ${personName(result.handbackDeputyPersonId, people)}.`, result.handbackAuthority].filter(Boolean).join("\n");
  if (result.welfarePersonId) result.employeeSupport = [`Support coordinator: ${personName(result.welfarePersonId, people)}.`, result.employeeSupport].filter(Boolean).join("\n");
  if (result.reviewPersonId || text(result.reviewTimeframe)) result.postIncidentReview = [`Review owner: ${personName(result.reviewPersonId, people)}. Timeframe: ${text(result.reviewTimeframe) || "Not set"}.`, result.postIncidentReview].filter(Boolean).join("\n");
  if (text(result.planLocation)) result.planAvailability = [result.planAvailability, `Controlled copy location / access instructions: ${text(result.planLocation)}`].filter(Boolean).join("\n");
  result.generatedProcedure = [`Recovery arrangements for ${siteName || "the linked site"}. These criteria define the planned decision process; actual recovery and handback require verification during the incident.`, ...RECOVERY_SECTIONS.map((section) => `${section.title}\n${result[section.key] || "Not yet defined"}`)].join("\n\n");
  return result;
}
export function incidentRecoveryMissing(value, { people = [], hazard, scenarios = [], approverPersonId = "" } = {}) {
  const result = synchroniseIncidentRecovery(value, { hazard, scenarios });
  const missing = [];
  for (const section of RECOVERY_SECTIONS) if (!list(result.selections[section.key]).some(text) && !text(result.localNotes[section.key])) missing.push({ key: section.key, label: `Define ${section.title.toLowerCase()}` });
  if (!scenarios.length) missing.push({ key: "normalOperationsCriteria", label: "Link included Module 5 hazard scenarios" });
  for (const row of result.scenarioRecovery) {
    if (!recoveryScenarioLinked(row, { hazard, scenarios })) missing.push({ key: "normalOperationsCriteria", scenarioId: row.scenarioId, label: `Confirm or remove the previous recovery source: ${row.scenario || "Unnamed scenario"}` });
    else if (!list(row.criteriaSelections).some(text) && !text(row.localCriteria)) missing.push({ key: "normalOperationsCriteria", scenarioId: row.scenarioId, label: `Define recovery criteria for ${row.scenario}` });
    if (text(row.minimumPeople) && (!/^\d+$/.test(text(row.minimumPeople)) || Number(row.minimumPeople) < 1)) missing.push({ key: "normalOperationsCriteria", scenarioId: row.scenarioId, label: `Minimum people for ${row.scenario} must be a whole number of at least 1` });
    if (text(row.minimumWorkforcePercent) && (!Number.isFinite(Number(row.minimumWorkforcePercent)) || Number(row.minimumWorkforcePercent) <= 0 || Number(row.minimumWorkforcePercent) > 100)) missing.push({ key: "normalOperationsCriteria", scenarioId: row.scenarioId, label: `Workforce availability for ${row.scenario} must be greater than 0 and at most 100%` });
  }
  for (const [key, section, label] of [["handbackPersonId", "handbackAuthority", "Select the handback authority"], ["handbackDeputyPersonId", "handbackAuthority", "Select the handback deputy"], ["welfarePersonId", "employeeSupport", "Select the support coordinator"], ["reviewPersonId", "postIncidentReview", "Select the review owner"]]) if (!result[key] || !people.some((person) => person.id === result[key])) missing.push({ key: section, label });
  if (result.handbackPersonId && result.handbackPersonId === result.handbackDeputyPersonId) missing.push({ key: "handbackAuthority", label: "Choose a different handback deputy" });
  if (!text(result.reviewTimeframe)) missing.push({ key: "postIncidentReview", label: "Set the post-incident review timeframe" });
  if (!text(result.planLocation)) missing.push({ key: "planAvailability", label: "Record the controlled plan location / access instructions" });
  if (!approverPersonId || !people.some((person) => person.id === approverPersonId)) missing.push({ key: "approval", label: "Select the plan approver" });
  return missing;
}
