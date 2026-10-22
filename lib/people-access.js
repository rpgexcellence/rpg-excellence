export const PLATFORM_MODULES = [
  ["incidents", "Accident, Incident & Near Misses"],
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
  ["admin", "Admin — Full administrative rights"],
];

export const PROFESSIONAL_FUNCTIONS = [
  [
    "accident_incident_admin",
    "Accident / Incident Administrator",
    "Triage reports, appoint independent investigators and verifiers, allocate people, equipment, budget and time; control escalation and public updates. Requires Incident module Admin access.",
  ],
  [
    "incident_investigator",
    "Incident Investigator",
    "Investigate assigned cases, establish contributing causes and record learning. Cannot verify own closure.",
  ],
  [
    "incident_responder",
    "Incident Responder",
    "Contain events and complete allocated actions with evidence.",
  ],
  [
    "incident_verifier",
    "Independent Incident Verifier",
    "Review action effectiveness and independently verify controlled closure.",
  ],
  [
    "security_incident_lead",
    "Security Incident Lead",
    "Review restricted security reports and coordinate controlled ISMS escalation.",
  ],
  [
    "continuity_coordinator",
    "Continuity Coordinator",
    "Assess operational disruption, coordinate continuity review and authorised plan activation.",
  ],
  [
    "assessment_owner",
    "Assessment Owner",
    "Own assessment scope, resources, progress and controlled completion.",
  ],
  [
    "lead_assessor",
    "Lead Assessor",
    "Plan and lead evidence-based assessments and moderate conclusions.",
  ],
  [
    "process_owner",
    "Process Owner",
    "Own process performance, evidence and response to findings.",
  ],
  [
    "company_administrator",
    "Super Administrator",
    "Site-wide administration of people, access and controlled authorisations.",
  ],
  [
    "site_director",
    "Site Director",
    "View assigned work, approvals and overdue actions for the authorised site.",
  ],
  [
    "ims_manager",
    "IMS Manager",
    "Maintain organisation-wide oversight of assurance work, actions and approvals.",
  ],
  ["lead_auditor", "Lead Auditor", "Plan, lead and report controlled audits."],
  ["auditor", "Auditor", "Conduct audits and record objective evidence."],
  [
    "supplier_auditor",
    "Supplier Auditor",
    "Perform supplier qualification and surveillance.",
  ],
  ["risk_assessor", "Risk Assessor", "Lead and approve risk assessments."],
  ["bcp_leader", "BCP Leader", "Coordinate continuity planning and recovery."],
  [
    "incident_controller",
    "Incident Controller",
    "Direct the controlled response to disruption.",
  ],
  [
    "capa_owner",
    "CAPA Action Owner",
    "Own corrective actions and implementation evidence.",
  ],
  [
    "effectiveness_verifier",
    "Effectiveness Verifier",
    "Independently verify action effectiveness.",
  ],
  [
    "document_controller",
    "Document Controller",
    "Control documented information and revisions.",
  ],
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
