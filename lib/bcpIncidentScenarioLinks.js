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
export function synchroniseIncidentScenarios(rows, scenarios, { allScenarios = [] } = {}) {
  const reconciled = reconcileScenarioLinks(rows, scenarios).map(buildScenarioResponse);
  const normal = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  const excludedIds = new Set(allScenarios.filter((row) => row.includeInIncidentPlan === false).map((row) => String(row.id)));
  // Retired duplicate references can be merged only into one current matching source.
  const resolved = reconciled.map((row) => {
    if (scenarios.some((source) => source.id === row.scenarioId)) return row;
    const reference = row.scenarioId || row.hazardScenarioId || row.hazardId || row.scenario_id;
    if (reference && excludedIds.has(String(reference))) return row;
    const matches = scenarios.filter((source) => normal(source.name) === normal(row.scenario));
    if (matches.length !== 1 || !reconciled.some((item) => item.scenarioId === matches[0].id)) return row;
    return { ...row, scenarioId: matches[0].id, scenario: matches[0].name, retiredScenarioReference: reference || row.id || "" };
  });
  const result = [];
  const validIds = new Set(scenarios.map((source) => source.id));
  for (const row of resolved) {
    const index = validIds.has(row.scenarioId) ? result.findIndex((item) => item.scenarioId === row.scenarioId) : -1;
    if (index < 0) { result.push(row); continue; }
    const existing = result[index];
    const canonical = existing.retiredScenarioReference && !row.retiredScenarioReference ? row : existing;
    const other = canonical === row ? existing : row;
    const unique = (values) => [...new Set(values.filter(Boolean))];
    const snapshot = ({ retainedResponseEntries, ...entry }) => entry;
    const retained = [...(existing.retainedResponseEntries || []), ...(row.retainedResponseEntries || []), snapshot(other)];
    const levels = ["Local response", "Site incident", "Organisation crisis"];
    const knownLevels = [existing.responseLevel, row.responseLevel].filter((level) => levels.includes(level));
    const responseLevel = knownLevels.length === 2 ? levels[Math.max(...knownLevels.map((level) => levels.indexOf(level)))] : canonical.responseLevel || other.responseLevel;
    result[index] = buildScenarioResponse({ ...canonical,
      activationSelections: unique([...existing.activationSelections, ...row.activationSelections]),
      protectionSelections: unique([...existing.protectionSelections, ...row.protectionSelections]),
      activationNotes: unique([existing.activationNotes, row.activationNotes]).join("; "),
      protectionNotes: unique([existing.protectionNotes, row.protectionNotes]).join("; "),
      responseLevel,
      retainedResponseEntries: [...new Map(retained.map((entry) => [JSON.stringify(entry), entry])).values()],
    });
  }
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
