import { incidentRows } from "./incident-data";
import { createAdminClient } from "./supabase/admin";

const CLOSED = new Set([
  "closed",
  "completed",
  "cancelled",
  "archived",
  "superseded",
  "effective_verified",
]);
const PACK_CODES = new Set([
  "CORE_WORKPLACE",
  "COMPRESSED_GASES",
  "CHEMICALS_COSHH",
  "MACHINERY_PUWER",
  "LIFTING_LOLER",
  "PRESSURE_SYSTEMS",
  "WELDING_HOT_WORK",
  "RADIATION_LASER",
  "BIOLOGICAL",
  "NOISE_VIBRATION",
  "WORK_AT_HEIGHT",
  "CONFINED_SPACES",
  "FIRE_EMERGENCY",
  "ENVIRONMENTAL",
  "OFFICE_WELFARE",
]);

function clean(value) {
  return String(value || "").trim();
}

function uuidOrNull(value) {
  const candidate = clean(value);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    candidate,
  )
    ? candidate
    : null;
}

function number(value, fallback = 1) {
  const candidate = Number(value);
  return Number.isFinite(candidate) ? candidate : fallback;
}

function clamp(value, minimum = 1, maximum = 5) {
  return Math.min(maximum, Math.max(minimum, Math.round(number(value))));
}

function priorityValue(record) {
  const priority = clean(
    record.priority || record.severity_level || record.classification,
  ).toLowerCase();
  if (
    ["critical", "immediate", "major", "very_high", "unacceptable"].includes(
      priority,
    )
  )
    return 5;
  if (["high", "significant", "serious"].includes(priority)) return 4;
  if (["medium", "moderate"].includes(priority)) return 3;
  if (["low", "minor"].includes(priority)) return 2;
  return 1;
}

function severity(record) {
  return clamp(
    record.severity ||
      record.residual_severity ||
      record.impact ||
      priorityValue(record),
  );
}

function likelihood(record) {
  return clamp(
    record.likelihood ||
      record.residual_likelihood ||
      record.probability ||
      (priorityValue(record) >= 4 ? 3 : 2),
  );
}

function activeRecord(record) {
  return !CLOSED.has(clean(record.status).toLowerCase());
}

function recordText(record) {
  return Object.values(record || {})
    .filter((value) => typeof value === "string")
    .join(" ")
    .toLowerCase();
}

function suggestedPack(record) {
  const text = recordText(record);
  const rules = [
    [
      "COMPRESSED_GASES",
      ["gas cylinder", "compressed gas", "oxygen cylinder", "acetylene", "lpg"],
    ],
    [
      "CHEMICALS_COSHH",
      ["coshh", "chemical", "substance", "solvent", "fume", "dust", "exposure"],
    ],
    [
      "LIFTING_LOLER",
      ["lifting", "loler", "crane", "hoist", "sling", "forklift"],
    ],
    [
      "PRESSURE_SYSTEMS",
      ["pressure system", "pressure vessel", "compressed air", "boiler"],
    ],
    [
      "WELDING_HOT_WORK",
      ["welding", "hot work", "cutting", "grinding", "brazing"],
    ],
    [
      "RADIATION_LASER",
      ["radiation", "laser", "x-ray", "xray", "ionising", "ultraviolet"],
    ],
    ["BIOLOGICAL", ["biological", "biohazard", "microorganism", "legionella"]],
    ["NOISE_VIBRATION", ["noise", "vibration", "hav", "hearing"]],
    ["WORK_AT_HEIGHT", ["height", "ladder", "scaffold", "roof work"]],
    ["CONFINED_SPACES", ["confined space", "vessel entry", "pit entry"]],
    [
      "FIRE_EMERGENCY",
      ["fire", "explosion", "flammable", "emergency exit", "evacuation"],
    ],
    [
      "ENVIRONMENTAL",
      ["environment", "spill", "waste", "emission", "drainage"],
    ],
    ["OFFICE_WELFARE", ["office", "welfare", "dse", "display screen"]],
    [
      "MACHINERY_PUWER",
      ["machinery", "machine", "puwer", "guarding", "equipment"],
    ],
  ];
  return (
    rules.find(([, words]) => words.some((word) => text.includes(word)))?.[0] ||
    null
  );
}

function sourceReference(record, fallback) {
  return clean(
    record.reference ||
      record.finding_reference ||
      record.assessment_reference ||
      record.audit_reference ||
      record.incident_reference ||
      record.moc_reference ||
      record.permit_reference ||
      record.asset_reference ||
      record.action_reference ||
      fallback,
  );
}

function summary(record, fallback) {
  return clean(
    record.title ||
      record.summary ||
      record.description ||
      record.finding ||
      record.hazard_description ||
      record.task_description ||
      record.change_title ||
      record.asset_name ||
      fallback,
  ).slice(0, 1000);
}

function occurredAt(record) {
  return (
    record.occurred_at ||
    record.incident_date ||
    record.assessment_date ||
    record.audit_date ||
    record.created_at ||
    new Date().toISOString()
  );
}

function locationMatches(record, programme) {
  const idCandidates = [
    record.administration_location_id,
    record.site_profile_id,
    record.organization_site_id,
    record.site_id,
  ]
    .filter(Boolean)
    .map(String);
  if (idCandidates.length)
    return idCandidates.includes(String(programme.administration_location_id));

  const labels = [
    record.site_location,
    record.location,
    record.site_name,
    record.administration_location_label,
  ]
    .filter(Boolean)
    .map((value) => clean(value).toLowerCase());
  if (!labels.length) return true;
  const programmeLabel = clean(
    programme.administration_location_label,
  ).toLowerCase();
  return labels.some(
    (label) => programmeLabel.includes(label) || label.includes(programmeLabel),
  );
}

async function safeLoad(admin, table, organizationId) {
  if (table === "incident_reports") {
    try {
      return {
        table,
        rows: await incidentRows(admin, table, organizationId),
        unavailable: false,
        error: null,
      };
    } catch (error) {
      throw new Error(
        "Incident risk signals could not be loaded: " + error.message,
      );
    }
  }
  const { data, error } = await admin
    .from(table)
    .select("*")
    .eq("organization_id", organizationId);
  if (error)
    return { table, rows: [], unavailable: true, error: error.message };
  return { table, rows: data || [], unavailable: false, error: null };
}

function buildSignal(programme, sourceModule, record, options = {}) {
  const recordId = record.id || options.recordId || null;
  const type =
    options.signalType ||
    clean(
      record.finding_type ||
        record.hazard_category ||
        record.type ||
        record.status ||
        sourceModule,
    );
  const pack = options.packCode || suggestedPack(record);
  return {
    organization_id: programme.organization_id,
    programme_id: programme.id,
    administration_location_id: String(programme.administration_location_id),
    source_module: sourceModule,
    source_record_id: uuidOrNull(recordId),
    source_reference: sourceReference(record, sourceModule + " record"),
    source_key:
      clean(recordId || sourceReference(record, sourceModule)) + ":" + type,
    signal_type: type.slice(0, 120) || sourceModule,
    summary: summary(record, "Connected " + sourceModule + " risk signal"),
    severity: severity(record),
    likelihood: likelihood(record),
    weighting: clamp(options.weighting || record.weighting || 1),
    suggested_pack_code: pack && PACK_CODES.has(pack) ? pack : null,
    occurred_at: occurredAt(record),
    expires_at: options.expiresAt || null,
    active: true,
  };
}

export async function synchroniseWorkplaceInspectionSignals(
  organizationId,
  programmeId,
) {
  if (!organizationId || !programmeId)
    throw new Error(
      "Organisation and programme are required for signal synchronisation.",
    );
  const admin = createAdminClient();
  const { data: programme, error: programmeError } = await admin
    .from("hs_inspection_programmes")
    .select("*")
    .eq("id", programmeId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (programmeError) throw new Error(programmeError.message);
  if (!programme) throw new Error("The inspection programme was not found.");

  const sourceTables = [
    "hs_risk_assessments",
    "hs_risk_hazards",
    "internal_audits",
    "hs_incidents",
    "hs_accidents_incidents",
    "hs_moc_changes",
    "hs_permits",
    "hs_powra_assessments",
    "organization_assets",
    "organization_asset_maintenance",
    "hs_workplace_inspections",
    "hs_workplace_inspection_findings",
    "incident_reports",
  ];
  const loaded = await Promise.all(
    sourceTables.map((table) => safeLoad(admin, table, organizationId)),
  );
  const byTable = new Map(loaded.map((item) => [item.table, item.rows]));
  const unavailable = loaded
    .filter((item) => item.unavailable)
    .map((item) => item.table);
  const signals = [];

  const assessments = byTable.get("hs_risk_assessments") || [];
  const assessmentIds = new Set(
    assessments
      .filter((item) => locationMatches(item, programme))
      .map((item) => item.id),
  );
  for (const hazard of byTable.get("hs_risk_hazards") || []) {
    if (!assessmentIds.has(hazard.assessment_id)) continue;
    const risk = number(hazard.residual_score, number(hazard.current_score, 0));
    if (risk < 5) continue;
    signals.push(
      buildSignal(programme, "risk_assessment", hazard, {
        signalType: "elevated_residual_risk",
        weighting: risk >= 15 ? 3 : risk >= 10 ? 2 : 1,
      }),
    );
  }

  const audits = (byTable.get("internal_audits") || []).filter((item) =>
    locationMatches(item, programme),
  );
  const auditIds = audits.map((item) => item.id).filter(Boolean);
  let auditFindings = [];
  if (auditIds.length) {
    const result = await admin
      .from("internal_audit_findings")
      .select("*")
      .in("audit_id", auditIds);
    if (!result.error) auditFindings = result.data || [];
    else unavailable.push("internal_audit_findings");
  }
  for (const finding of auditFindings.filter(activeRecord)) {
    signals.push(
      buildSignal(programme, "internal_audit", finding, {
        signalType: "open_audit_finding",
        weighting: priorityValue(finding) >= 4 ? 3 : 2,
      }),
    );
  }

  for (const incident of byTable.get("incident_reports") || []) {
    if (
      !incident.triaged_at ||
      ["closed", "rejected", "duplicate"].includes(incident.status) ||
      !incident.domains?.some((d) =>
        ["health_safety", "quality", "environment"].includes(d),
      ) ||
      !locationMatches(incident, programme) ||
      (programme.zone_id &&
        incident.zone_id &&
        programme.zone_id !== incident.zone_id)
    )
      continue;
    // Only a non-sensitive reference and reviewed scores enter the wider inspection engine.
    const safe = {
      id: incident.id,
      reference: incident.reference,
      title: "Reviewed incident " + incident.reference,
      severity: Math.max(
        incident.actual_severity || 1,
        incident.potential_severity || 1,
      ),
      likelihood: incident.likelihood || 1,
      occurred_at: incident.occurred_at,
    };
    signals.push(
      buildSignal(
        programme,
        incident.report_type === "accident" ? "accident" : "incident",
        safe,
        {
          signalType: "triaged_incident",
          weighting: 3,
          packCode: incident.pack_code,
        },
      ),
    );
  }
  const incidentTables = ["hs_incidents", "hs_accidents_incidents"];
  for (const table of incidentTables) {
    for (const incident of (byTable.get(table) || []).filter(
      (item) => activeRecord(item) && locationMatches(item, programme),
    )) {
      const accident =
        recordText(incident).includes("accident") ||
        recordText(incident).includes("injury");
      signals.push(
        buildSignal(programme, accident ? "accident" : "incident", incident, {
          signalType: accident ? "accident_event" : "incident_event",
          weighting: 3,
        }),
      );
    }
  }

  for (const change of (byTable.get("hs_moc_changes") || []).filter(
    (item) => activeRecord(item) && locationMatches(item, programme),
  )) {
    signals.push(
      buildSignal(programme, "moc", change, {
        signalType: "active_change",
        weighting: priorityValue(change) >= 4 ? 3 : 2,
      }),
    );
  }
  for (const permit of (byTable.get("hs_permits") || []).filter(
    (item) => activeRecord(item) && locationMatches(item, programme),
  )) {
    signals.push(
      buildSignal(programme, "permit", permit, {
        signalType: "active_high_risk_work",
        weighting: 2,
      }),
    );
  }
  for (const powra of (byTable.get("hs_powra_assessments") || []).filter(
    (item) => activeRecord(item) && locationMatches(item, programme),
  )) {
    if (!["stop_work", "supervisor_review"].includes(clean(powra.decision)))
      continue;
    signals.push(
      buildSignal(programme, "powra", powra, {
        signalType: "powra_escalation",
        weighting: powra.decision === "stop_work" ? 4 : 2,
      }),
    );
  }
  for (const asset of (byTable.get("organization_assets") || []).filter(
    (item) => locationMatches(item, programme),
  )) {
    const overdue =
      asset.next_maintenance_date &&
      String(asset.next_maintenance_date).slice(0, 10) <
        new Date().toISOString().slice(0, 10);
    const impaired = !["active", "operational"].includes(
      clean(asset.operational_status).toLowerCase(),
    );
    if (
      !overdue &&
      !impaired &&
      clean(asset.criticality).toLowerCase() !== "critical"
    )
      continue;
    signals.push(
      buildSignal(programme, "asset", asset, {
        signalType: overdue
          ? "ppm_overdue"
          : impaired
            ? "asset_impaired"
            : "critical_asset",
        weighting: overdue || impaired ? 3 : 2,
      }),
    );
  }
  const programmeInspectionIds = new Set(
    (byTable.get("hs_workplace_inspections") || [])
      .filter((item) => item.programme_id === programme.id)
      .map((item) => item.id),
  );
  for (const finding of (
    byTable.get("hs_workplace_inspection_findings") || []
  ).filter(activeRecord)) {
    const sameProgramme = programmeInspectionIds.has(finding.inspection_id);
    if (!sameProgramme) continue;
    signals.push(
      buildSignal(programme, "workplace_inspection", finding, {
        signalType: "previous_inspection_finding",
        weighting: priorityValue(finding) >= 4 ? 3 : 2,
      }),
    );
  }

  const { error: deactivateError } = await admin
    .from("hs_inspection_risk_signals")
    .update({ active: false })
    .eq("organization_id", organizationId)
    .eq("programme_id", programmeId)
    .neq("source_module", "manual");
  if (deactivateError) throw new Error(deactivateError.message);

  if (signals.length) {
    const { error: upsertError } = await admin
      .from("hs_inspection_risk_signals")
      .upsert(signals, {
        onConflict: "organization_id,programme_id,source_module,source_key",
      });
    if (upsertError) throw new Error(upsertError.message);
  }

  const summary = {
    activeSignals: signals.length,
    unavailableSources: [...new Set(unavailable)],
    sourceCounts: signals.reduce((totals, signal) => {
      totals[signal.source_module] = (totals[signal.source_module] || 0) + 1;
      return totals;
    }, {}),
  };
  const { error: programmeUpdateError } = await admin
    .from("hs_inspection_programmes")
    .update({
      signals_last_synchronised_at: new Date().toISOString(),
      signals_synchronisation_summary: summary,
      updated_at: new Date().toISOString(),
    })
    .eq("id", programmeId)
    .eq("organization_id", organizationId);
  if (programmeUpdateError) throw new Error(programmeUpdateError.message);

  return { signals, summary };
}
