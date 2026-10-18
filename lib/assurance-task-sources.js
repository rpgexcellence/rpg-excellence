// Read-only adapters for the existing controlled module records.
// Parent records are resolved first because several legacy action tables do not
// carry organization_id themselves. This prevents cross-company task leakage.
const rows = (result) => result.error ? [] : result.data || [];
const ids = (items) => items.map((item) => item.id).filter(Boolean);

async function children(admin, table, foreignKey, parents) {
  const parentIds = ids(parents);
  if (!parentIds.length) return [];
  return rows(await admin.from(table).select("*").in(foreignKey, parentIds));
}

export async function loadAssuranceTaskSources(admin, organizationId) {
  const [riskActions, suppliers, assetMaintenance, assessments, mocChanges, rcaCases, ismsRisks, ismsIncidents, bcpBia, bcpOutsourced, bcpStrategies, bcpIncident, bcpPlans, internalAudits] = await Promise.all([
    admin.from("hs_risk_actions").select("*").eq("organization_id", organizationId),
    admin.from("supplier_qbr_actions").select("*").eq("organization_id", organizationId),
    admin.from("organization_asset_maintenance").select("*").eq("organization_id", organizationId),
    admin.from("assessments").select("id,organization_id,title,standard_name").eq("organization_id", organizationId),
    admin.from("hs_moc_changes").select("*").eq("organization_id", organizationId),
    admin.from("rca_cases").select("id,organization_id,case_reference,title").eq("organization_id", organizationId),
    admin.from("isms_risks").select("id,organization_id,risk_reference,title").eq("organization_id", organizationId),
    admin.from("isms_security_incidents").select("*").eq("organization_id", organizationId),
    admin.from("bcp_bia_assessments").select("*").eq("organization_id", organizationId),
    admin.from("bcp_outsourced_process_assessments").select("*").eq("organization_id", organizationId),
    admin.from("bcp_strategy_assessments").select("*").eq("organization_id", organizationId),
    admin.from("bcp_incident_management_assessments").select("*").eq("organization_id", organizationId),
    admin.from("bcp_plans").select("*").eq("organization_id", organizationId),
    admin.from("internal_audits").select("id,organization_id,audit_reference,title,status").eq("organization_id", organizationId),
  ]);
  const parent = {
    assessments: rows(assessments),
    mocChanges: rows(mocChanges),
    rcaCases: rows(rcaCases),
    ismsRisks: rows(ismsRisks),
  };
  const audits = rows(internalAudits);
  const [correctiveActions, mocActions, rcaActions, ismsTreatments, auditFindings, auditAssignments] = await Promise.all([
    children(admin, "corrective_actions", "assessment_id", parent.assessments),
    children(admin, "hs_moc_actions", "moc_id", parent.mocChanges),
    children(admin, "rca_actions", "case_id", parent.rcaCases),
    children(admin, "isms_risk_treatments", "risk_id", parent.ismsRisks),
    children(admin, "internal_audit_findings", "audit_id", audits),
    children(admin, "internal_audit_action_access", "audit_id", audits),
  ]);
  return {
    riskActions: rows(riskActions),
    supplierActions: rows(suppliers),
    assetMaintenance: rows(assetMaintenance),
    correctiveActions,
    mocActions,
    rcaActions,
    ismsTreatments,
    ismsIncidents: rows(ismsIncidents),
    bcpBia: rows(bcpBia),
    bcpOutsourced: rows(bcpOutsourced),
    bcpStrategies: rows(bcpStrategies),
    bcpIncident: rows(bcpIncident),
    bcpPlans: rows(bcpPlans),
    internalAudits: audits,
    auditFindings,
    auditAssignments,
    ...parent,
  };
}
