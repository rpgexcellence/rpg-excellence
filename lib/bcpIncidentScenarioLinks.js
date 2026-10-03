// Reconcile existing Module 9 entries without guessing between duplicate names.
export function incidentScenarios(hazard) {
  return (Array.isArray(hazard?.scenario_assessments) ? hazard.scenario_assessments : []).filter((row) => row.includeInIncidentPlan !== false);
}
export function reconcileScenarioLinks(rows, scenarios) {
  const normal = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const reference = row.scenarioId || row.hazardScenarioId || row.hazardId || row.scenario_id;
    let source = scenarios.find((item) => String(item.id) === String(reference || row.id || ""));
    // Never replace an explicit link to a removed or excluded scenario by name.
    if (!source && !reference) {
      const matches = scenarios.filter((item) => normal(item.name) === normal(row.scenario || row.scenarioName || row.name));
      if (matches.length === 1) source = matches[0];
    }
    return source ? { ...row, scenarioId: source.id, scenario: source.name } : { ...row };
  });
}
export function reconcilePeople(rows, people, pairs) {
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const result = { ...row };
    for (const [idKey, nameKey] of pairs) {
      if (result[idKey]) continue;
      const matches = people.filter((person) => `${person.first_name || ""} ${person.last_name || ""}`.trim().toLowerCase() === String(result[nameKey] || "").trim().toLowerCase());
      if (matches.length === 1) result[idKey] = matches[0].id;
    }
    return result;
  });
}

// Module 5 owns inclusion; Module 9 owns the editable response controls.
export function synchroniseIncidentScenarios(rows, scenarios) {
  const result = reconcileScenarioLinks(rows, scenarios).map(buildScenarioResponse);
  const linked = new Set(result.map((row) => row.scenarioId).filter(Boolean));
  const text = (values) => Array.isArray(values) ? values.join("; ") : String(values || "");
  for (const source of scenarios) {
    if (!source.id || linked.has(source.id)) continue;
    result.push({
      scenarioId: source.id,
      scenario: source.name,
      activationCriteria: text(source.warningIndicators),
      initialControls: text(source.existingControls),
      responseLevel: "Site incident",
    });
    linked.add(source.id);
  }
  return result.map(buildScenarioResponse);
}

export const ACTIVATION_OPTIONS = [
  "A verified incident or warning is received",
  "People's safety is threatened",
  "A priority activity exceeds its agreed disruption tolerance",
  "Critical facilities, systems or utilities are unavailable",
  "Local response capacity or delegated authority is exceeded",
  "The incident controller directs activation",
];
export const PROTECTION_OPTIONS = [
  "Activate the approved local emergency arrangements",
  "Notify the incident controller and assigned response team",
  "Protect people and account for personnel using the approved site procedure",
  "Suspend affected activities where required by the incident controller",
  "Request emergency or specialist assistance through approved channels",
  "Record verified facts, decisions and assigned actions",
  "Communicate verified instructions through primary and fallback channels",
];
export function scenarioResponseOptions(source) {
  const unique = (values) => [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
  return {
    activation: unique([...(Array.isArray(source?.warningIndicators) ? source.warningIndicators : []), ...ACTIVATION_OPTIONS]),
    protection: unique([...(Array.isArray(source?.existingControls) ? source.existingControls : []), ...PROTECTION_OPTIONS]),
  };
}
export function buildScenarioResponse(row) {
  const activationSelections = Array.isArray(row.activationSelections) ? row.activationSelections : [];
  const protectionSelections = Array.isArray(row.protectionSelections) ? row.protectionSelections : [];
  const activationNotes = row.activationNotes ?? (Array.isArray(row.activationSelections) ? "" : row.activationCriteria || "");
  const protectionNotes = row.protectionNotes ?? (Array.isArray(row.protectionSelections) ? "" : row.initialControls || "");
  const join = (values, notes) => [...values, String(notes || "").trim()].filter(Boolean).join("; ");
  return { ...row, activationSelections, protectionSelections, activationNotes, protectionNotes,
    activationCriteria: join(activationSelections, activationNotes),
    initialControls: join(protectionSelections, protectionNotes),
  };
}
