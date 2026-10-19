// Read-only task adapters. Child records are restricted to organisation-scoped parents.
export async function loadAssuranceTaskSources(admin, organizationId) {
  const sourceErrors = [];
  const read = async (table, module, filter) => {
    const records = [];
    try {
      for (let start = 0; ; start += 500) {
        const result = await filter(admin.from(table).select("*")).order("id").range(start, start + 499);
        if (result.error) throw result.error;
        records.push(...(result.data || []));
        if ((result.data || []).length < 500) break;
      }
    } catch (error) {
      sourceErrors.push({ module, label: table.replaceAll("_", " "), message: error.message });
    }
    return records;
  };
  const sources = {};
  const definitions = [["riskActions", "hs_risk_actions", "risk"], ["supplierActions", "supplier_qbr_actions", "supplier"], ["assetMaintenance", "organization_asset_maintenance", "maintenance"], ["assets", "organization_assets", "maintenance"], ["assessments", "assessments", "capa"], ["mocChanges", "hs_moc_changes", "moc"], ["rcaCases", "rca_cases", "rca"], ["ismsRisks", "isms_risks", "isms"], ["ismsIncidents", "isms_security_incidents", "security_incident"], ["bcpBia", "bcp_bia_assessments", "bcp"], ["bcpOutsourced", "bcp_outsourced_process_assessments", "bcp"], ["bcpStrategies", "bcp_strategy_assessments", "bcp"], ["bcpIncident", "bcp_incident_management_assessments", "bcp"], ["bcpPlans", "bcp_plans", "bcp"], ["bcpSites", "bcp_site_profiles", "bcp"], ["bcpContext", "bcp_context_assessments", "bcp"], ["bcpRoles", "bcp_role_assessments", "bcp"], ["bcpHazards", "bcp_hazard_assessments", "bcp"], ["internalAudits", "internal_audits", "audit"], ["inspectionProgrammes", "hs_inspection_programmes", "inspection"], ["inspections", "hs_workplace_inspections", "inspection"], ["inspectionActions", "hs_workplace_inspection_actions", "inspection"]];
  await Promise.all(definitions.map(async ([key, table, module]) => {
    sources[key] = await read(table, module, query => query.eq("organization_id", organizationId));
  }));
  const children = [["correctiveActions", "corrective_actions", "assessment_id", "assessments", "capa"], ["managementActions", "management_action_plan", "assessment_id", "assessments", "capa"], ["mocActions", "hs_moc_actions", "moc_id", "mocChanges", "moc"], ["rcaActions", "rca_actions", "case_id", "rcaCases", "rca"], ["ismsTreatments", "isms_risk_treatments", "risk_id", "ismsRisks", "isms"], ["auditFindings", "internal_audit_findings", "audit_id", "internalAudits", "audit"], ["auditAssignments", "internal_audit_action_access", "audit_id", "internalAudits", "audit"]];
  await Promise.all(children.map(async ([key, table, foreignKey, parentKey, module]) => {
    const parentIds = sources[parentKey].map(row => row.id).filter(Boolean);
    sources[key] = [];
    for (let start = 0; start < parentIds.length; start += 100) {
      const batch = parentIds.slice(start, start + 100);
      sources[key].push(...await read(table, module, query => query.in(foreignKey, batch)));
    }
  }));
  return { ...sources, sourceErrors };
}
