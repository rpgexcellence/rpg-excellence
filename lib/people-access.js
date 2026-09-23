export const PLATFORM_MODULES = [
  ["dashboard", "RPG dashboard"],
  ["internal_audit", "Internal Audit"],
  ["capa_8d", "CAPA–8D"],
  ["supplier_assurance", "Supplier Assurance"],
  ["risk_management", "Risk Management"],
  ["business_continuity", "Business Continuity"],
  ["information_security", "Information Security / SoA"],
  ["documents", "Documents & Evidence"],
  ["training", "Training & Competence"],
  ["assessments", "Gap Assessments"],
  ["reports", "Reports"],
  ["people_access", "People, Roles & Access"],
];

export const ACCESS_LEVELS = [
  ["none", "No access"],
  ["view", "View"],
  ["contribute", "Create / edit"],
  ["review", "Review"],
  ["approve", "Approve"],
  ["admin", "Module administration"],
];

export const PROFESSIONAL_FUNCTIONS = [
  ["company_administrator", "Company Administrator", "Manage company people, access and controlled authorisations."],
  ["lead_auditor", "Lead Auditor", "Plan, lead and report controlled audits."],
  ["auditor", "Auditor", "Conduct audits and record objective evidence."],
  ["supplier_auditor", "Supplier Auditor", "Perform supplier qualification and surveillance."],
  ["risk_assessor", "Risk Assessor", "Lead and approve risk assessments."],
  ["bcp_leader", "BCP Leader", "Coordinate continuity planning and recovery."],
  ["incident_controller", "Incident Controller", "Direct the controlled response to disruption."],
  ["capa_owner", "CAPA Action Owner", "Own corrective actions and implementation evidence."],
  ["effectiveness_verifier", "Effectiveness Verifier", "Independently verify action effectiveness."],
  ["document_controller", "Document Controller", "Control documented information and revisions."],
  ["approver", "Approver", "Provide controlled management approval."],
  ["viewer", "Viewer", "Read authorised information without changing it."],
];

export const AUTHORISATION_STATUSES = [
  ["proposed", "Proposed"],
  ["authorised", "Authorised"],
  ["suspended", "Suspended"],
  ["expired", "Expired"],
  ["withdrawn", "Withdrawn"],
];

export const moduleLabel = (key) =>
  PLATFORM_MODULES.find(([value]) => value === key)?.[1] || key;

export const functionLabel = (key) =>
  PROFESSIONAL_FUNCTIONS.find(([value]) => value === key)?.[1] || key;

export const accessLabel = (key) =>
  ACCESS_LEVELS.find(([value]) => value === key)?.[1] || key;

