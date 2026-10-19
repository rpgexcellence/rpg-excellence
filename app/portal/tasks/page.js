import Link from "next/link";
import { createAdminClient } from "../../../lib/supabase/admin";
import { requireOrganizationAccess } from "../../../lib/organization-access";
import { loadAssuranceTaskSources } from "../../../lib/assurance-task-sources";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Tasks & Approvals | RPG Excellence" };

const CLOSED = new Set(["closed", "complete", "completed", "effective", "verified", "cancelled", "approved", "verified_effective", "effective_verified"]);
const VERIFY = new Set(["awaiting_review", "awaiting_verification", "evidence_submitted", "verification", "ready_for_review", "submitted", "verification_requested", "effectiveness_review"]);
const value = (...items) => items.find((item) => item !== null && item !== undefined && String(item).trim()) || "";
const words = (input) => String(input || "open").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const date = (input) => input ? new Intl.DateTimeFormat("en-GB", { day:"2-digit", month:"short", year:"numeric" }).format(new Date(input)) : "No due date";
const list = (input) => Array.isArray(input) ? input : [];

function normalize(row, source) {
  const configs = {
    risk: { module:"Risk Management", title:value(row.action_required, row.action_reference), due:value(row.target_date), assignee:row.responsible_person_id, verifier:row.verifier_person_id, href:`/portal/health-safety/actions/${row.id}` },
    moc: { module:"Management of Change", title:value(row.action_required, row.title), due:value(row.target_date), assignee:row.responsible_person_id, verifier:row.verifier_person_id, href:`/portal/health-safety/moc/${row.moc_id}` },
    capa: { module:"Gap Assessment / CAPA", title:value(row.action_required, row.action, row.title, row.description), due:value(row.target_date, row.due_date), assignee:row.action_owner_person_id, verifier:row.verifier_person_id, href:`/portal/assessments/${row.assessment_id}/actions-plan` },
    rca: { module:"CAPA-8D", title:value(row.title, row.description), due:value(row.due_date, row.target_date), assignee:row.action_owner_person_id, verifier:row.verifier_person_id, href:`/portal/rca/${row.case_id}` },
    supplier: { module:"Supplier Assurance", title:value(row.action_required, row.action_reference), due:value(row.due_date), assignee:row.accountable_person_id, verifier:row.reviewer_person_id, href:`/portal/suppliers/${row.supplier_id}/qbr` },
    isms: { module:"Information Security", title:value(row.action, row.title), due:value(row.target_date), assignee:row.action_owner_person_id, verifier:row.verifier_person_id, href:"/portal/information-security/risk-management" },
    security_incident: { module:"Information Security - Security Incidents", title:value(row.title, row.incident_reference), due:value(row.target_recovery_date), assignee:row.incident_lead_person_id, verifier:row.verifier_person_id, href:`/portal/information-security/incidents/${row.id}` },
    maintenance: { module:"Asset Management / PPM", title:value(row.work_completed, row.maintenance_reference, `${words(row.maintenance_type)} maintenance`), due:value(row.scheduled_date), assignee:row.responsible_person_id, verifier:row.verifier_person_id, href:"/portal/company/assets" },
  };
  const config = configs[source];
  const status = String(row.status || "open").toLowerCase();
  return { ...config, id:`${source}:${row.id}`, source, status, site:value(row.site_location, row.site_location_label, row.location), ownerName:value(row.responsible_name, row.accountable_name, row.action_owner), updated:value(row.updated_at, row.created_at) };
}

function bcpTasks(sources) {
  const tasks = [];
  const add = (parent, row, key, module, href) => {
    if (!row?.ownerPersonId || !value(row.action,row.objective,row.requirement,row.name)) return;
    tasks.push({ id:`bcp:${parent.id}:${key}`, source:"bcp", module, title:value(row.action,row.objective,row.requirement,row.name), due:value(row.dueDate,row.dueAt,parent.next_review_date), assignee:row.ownerPersonId, verifier:parent.approver_person_id || parent.reviewer_person_id, href, status:String(row.status||"open").toLowerCase(), site:value(parent.site_location,parent.location_name), ownerName:value(row.owner), updated:value(parent.updated_at,parent.created_at) });
  };
  for (const parent of sources.bcpStrategies) list(parent.implementation_actions).forEach((row,index)=>add(parent,row,index,"Business Continuity - Strategies & Solutions","/portal/business-continuity/strategies-solutions"));
  for (const parent of sources.bcpOutsourced) for (const control of list(parent.supplier_controls)) list(control.actions).forEach((row,index)=>add(parent,row,`${control.id||control.supplierName}:${index}`,"Business Continuity - Outsourced Processes","/portal/business-continuity/outsourced-processes"));
  for (const parent of sources.bcpIncident) list(parent.incident_action_plan).forEach((row,index)=>add(parent,row,index,"Business Continuity - Incident Management","/portal/business-continuity/incident-management"));
  const reviews = [
    ...sources.bcpBia.map((row)=>[row,"Business Continuity - BIA","/portal/business-continuity/bia",row.reviewer_person_id]),
    ...sources.bcpOutsourced.map((row)=>[row,"Business Continuity - Outsourced Processes","/portal/business-continuity/outsourced-processes",row.reviewer_person_id]),
    ...sources.bcpStrategies.map((row)=>[row,"Business Continuity - Strategies & Solutions","/portal/business-continuity/strategies-solutions",row.approver_person_id]),
    ...sources.bcpIncident.map((row)=>[row,"Business Continuity - Incident Management","/portal/business-continuity/incident-management",row.approver_person_id]),
    ...sources.bcpPlans.map((row)=>[row,"Business Continuity - Plan","/portal/business-continuity/plans",row.approver_person_id || row.plan_data?.approverPersonId]),
  ];
  for (const [row,module,href,personId] of reviews) if (personId && ["ready_for_review","changes_required","review_due"].includes(row.status)) tasks.push({id:`bcp-review:${row.id}`,source:"bcp",module,title:`Review ${value(row.assessment_title,row.plan_title,"controlled BCP record")}`,due:value(row.next_review_date,row.review_due_date),assignee:personId,verifier:null,href,status:row.status,site:value(row.site_location,row.location_name),ownerName:"",updated:value(row.updated_at,row.created_at)});
  return tasks;
}

function auditTasks(sources, people) {
  const byUser = new Map(people.filter((person) => person.user_id).map((person) => [person.user_id, person.id]));
  const personForEmail = (email) => {
    const matches = people.filter((person) => email && person.email?.toLowerCase() === String(email).toLowerCase());
    return matches.length === 1 ? matches[0].id : null;
  };
  const audits = new Map((sources.internalAudits || []).map((audit) => [audit.id, audit]));
  const assignments = new Map((sources.auditAssignments || []).map((item) => [item.finding_id, item]));
  const tasks = [];
  for (const audit of audits.values()) {
    if (["closed", "completed", "cancelled", "archived"].includes(audit.status)) continue;
    const gate = audit.current_gate || "scope";
    tasks.push({ id: `audit-workflow:${audit.id}`, source: "audit", module: "Internal Audit / Workflow",
      title: `${words(gate)}: ${value(audit.title, audit.audit_reference, "Internal audit")}`,
      due: audit.planned_end_at, assignee: byUser.get(audit.owner_id), assigneeUserId: audit.owner_id,
      href: `/portal/internal-audits/${audit.id}?gate=${encodeURIComponent(gate)}`,
      status: ["report_review", "scope_review", "team_review", "plan_review"].includes(audit.status) ? "awaiting_review" : "open",
      site: value(audit.administration_location_label, audit.sites), ownerName: "Audit workspace owner", updated: audit.updated_at });
  }
  for (const finding of sources.auditFindings || []) {
    const audit = audits.get(finding.audit_id);
    if (!audit || !["major_nc", "minor_nc"].includes(finding.finding_type)) continue;
    const assignment = assignments.get(finding.id);
    const closed = CLOSED.has(String(finding.status || "").toLowerCase()) || CLOSED.has(String(assignment?.status || "").toLowerCase());
    const awaiting = !closed && (VERIFY.has(assignment?.status) ||
      Boolean(assignment?.d6_verification_requested_at && !assignment?.d6_verification_completed_at));
    const ownerId = assignment ? byUser.get(assignment.assignee_user_id) || personForEmail(assignment.assignee_email) || finding.responsible_owner_person_id : finding.responsible_owner_person_id;
    tasks.push({ id: `audit-finding:${finding.id}`, source: "audit", module: "Internal Audit / Findings",
      title: value(finding.title, finding.finding_reference, "Audit corrective action"), due: finding.agreed_date,
      assignee: awaiting ? byUser.get(audit.owner_id) : ownerId,
      assigneeUserId: awaiting ? audit.owner_id : assignment?.assignee_user_id,
      href: awaiting || !assignment ? `/portal/internal-audits/${audit.id}?gate=actions#action-${finding.id}` : `/portal/internal-audit-actions#action-${assignment.id}`,
      status: closed ? "closed" : awaiting ? "awaiting_verification" : String(assignment?.status || finding.status || "open").toLowerCase(),
      site: value(audit.administration_location_label, audit.sites),
      ownerName: awaiting ? "Audit verification" : value(assignment?.assignee_name, finding.responsible_owner_name),
      updated: value(assignment?.updated_at, finding.updated_at, finding.created_at) });
  }
  return tasks;
}

function inspectionTasks(sources) {
  const tasks = [];
  const inspections = sources.inspections || [];
  const byId = new Map(inspections.map((item) => [item.id, item]));
  const root = "/portal/health-safety/workplace-inspections";
  for (const programme of sources.inspectionProgrammes || []) {
    if (programme.status !== "active") continue;
    const scheduled = inspections.some((item) => item.programme_id === programme.id && ["draft", "planned", "due", "in_progress"].includes(item.status));
    if (!scheduled) tasks.push({ id: `inspection-programme:${programme.id}`, source: "inspection", module: "Workplace Inspections / Scheduling",
      title: `Schedule inspection: ${programme.title}`, due: programme.next_inspection_date,
      assignee: programme.lead_inspector_person_id || programme.accountable_person_id,
      href: `${root}/programmes/${programme.id}`, status: "open", site: programme.administration_location_label, updated: programme.updated_at });
  }
  for (const inspection of inspections) {
    const review = inspection.status === "awaiting_review";
    if (!review && !["draft", "planned", "due", "in_progress"].includes(inspection.status)) continue;
    tasks.push({ id: `inspection-record:${inspection.id}`, source: "inspection", module: "Workplace Inspections / " + (review ? "Independent review" : "Fieldwork"),
      title: `${review ? "Review fieldwork" : "Complete fieldwork"}: ${inspection.title}`,
      due: value(inspection.planned_end_at, inspection.planned_start_at),
      assignee: review ? inspection.reviewer_person_id : inspection.lead_inspector_person_id,
      href: `${root}/${inspection.id}${review ? "#inspection-review-actions" : ""}`,
      status: review ? "awaiting_review" : inspection.status, site: inspection.administration_location_label, updated: inspection.updated_at });
  }
  for (const action of sources.inspectionActions || []) {
    const inspection = byId.get(action.inspection_id);
    if (!inspection || inspection.status === "cancelled") continue;
    const verify = action.status === "awaiting_verification";
    tasks.push({ id: `inspection-action:${action.id}`, source: "inspection", module: "Workplace Inspections / " + (verify ? "Verification" : "Actions"),
      title: `${verify ? "Verify action" : "Complete action"}: ${value(action.action_text, action.action_reference)}`,
      due: action.target_date, assignee: verify ? action.verifier_person_id : action.responsible_person_id,
      href: `${root}/${action.inspection_id}#inspection-review-actions`, status: action.status,
      site: inspection.administration_location_label, updated: action.updated_at });
  }
  return tasks;
}

function securityIncidentTasks(sources) {
  const tasks = [];
  const add = (incident, role, personId, { onlyWhen = true } = {}) => {
    if (!personId || !onlyWhen) return;
    tasks.push({
      id:`security_incident:${incident.id}:${role.key}`,
      source:"security_incident",
      module:"Information Security - Security Incidents",
      title:`${role.label}: ${value(incident.title, incident.incident_reference)}`,
      due:value(incident.target_recovery_date),
      assignee:personId,
      verifier:null,
      href:`/portal/information-security/incidents/${incident.id}`,
      status:String(incident.status || "reported").toLowerCase(),
      site:value(incident.administration_location_label),
      ownerName:"",
      updated:value(incident.updated_at, incident.created_at),
    });
  };
  for (const incident of sources.ismsIncidents) {
    const active = !["closed","cancelled"].includes(String(incident.status || "").toLowerCase());
    const verification = incident.status === "awaiting_verification";
    add(incident,{key:"incident_lead",label:"Incident Lead"},incident.incident_lead_person_id,{onlyWhen:active});
    add(incident,{key:"technical_lead",label:"Technical Lead"},incident.technical_lead_person_id,{onlyWhen:active});
    add(incident,{key:"privacy_lead",label:"Privacy Lead"},incident.privacy_lead_person_id,{onlyWhen:active && incident.personal_data_involved});
    add(incident,{key:"communications_lead",label:"Communications Lead"},incident.communications_lead_person_id,{onlyWhen:active});
    add(incident,{key:"independent_verifier",label:"Independent Verification"},incident.verifier_person_id,{onlyWhen:verification});
    add(incident,{key:"closure_approver",label:"Closure Approval"},incident.closure_approved_by_person_id,{onlyWhen:verification});
  }
  return tasks;
}

export default async function TasksPage({ searchParams }) {
  const params = await searchParams;
  const access = await requireOrganizationAccess(null, "view", "/portal/tasks");
  const admin = createAdminClient();
  const organizationId = access.organization.id;
  const [peopleResult, sources] = await Promise.all([
    admin.from("organization_people").select("*").eq("organization_id", organizationId).neq("account_status", "closed"),
    loadAssuranceTaskSources(admin, organizationId),
  ]);
  if (peopleResult.error) throw new Error(peopleResult.error.message);
  const people = peopleResult.data || [];
  const personMap = new Map(people.map((person) => [person.id, person]));
  const me = access.person || people.find((person) => person.user_id === access.user?.id) || null;
  const myPersonId = me?.id || "__no_linked_company_user__";
  const today = new Date().toISOString().slice(0,10);
  const activeFunctions = new Set((access.functions || []).filter((item) => item.status === "authorised" && (!item.expires_at || item.expires_at >= today)).map((item) => item.function_key));
  const organisationOversight = Boolean(access.isOwner || access.isCompanyAdministrator || activeFunctions.has("ims_manager"));
  const siteOversight = activeFunctions.has("site_director");
  const reports = new Set(people.filter((person) => person.manager_person_id === me?.id || person.functional_manager_person_id === me?.id).map((person) => person.id));
  const all = [...sources.riskActions.map((row)=>normalize(row,"risk")), ...sources.mocActions.map((row)=>normalize(row,"moc")), ...sources.correctiveActions.map((row)=>normalize(row,"capa")), ...sources.rcaActions.map((row)=>normalize(row,"rca")), ...sources.supplierActions.map((row)=>normalize(row,"supplier")), ...sources.ismsTreatments.map((row)=>normalize(row,"isms")), ...securityIncidentTasks(sources), ...sources.assetMaintenance.map((row)=>normalize(row,"maintenance")), ...bcpTasks(sources), ...auditTasks(sources,people), ...inspectionTasks(sources)]
    .filter((item) => item.title)
    .map((item) => ({ ...item, due: item.due ? String(item.due).slice(0,10) : "" }))
    .map((item) => ({ ...item, assigneePerson:personMap.get(item.assignee), verifierPerson:personMap.get(item.verifier), overdue:Boolean(item.due && item.due < today && !CLOSED.has(item.status)) }));
  const isMine = (item) => item.assignee === myPersonId || item.verifier === myPersonId || item.assigneeUserId === access.user.id;
  const needsDecision = (item) => !CLOSED.has(item.status) && VERIFY.has(item.status);
  const visible = all.filter((item) => organisationOversight || isMine(item) || reports.has(item.assignee) || (siteOversight && me?.site && (item.site === me.site || item.assigneePerson?.site === me.site)));
  const requested = ["mine","team","oversight"].includes(params?.view) ? params.view : "mine";
  const view = requested === "oversight" && !organisationOversight && !siteOversight ? "mine" : requested;
  const moduleFilter = String(params?.module || "all");
  const stateFilter = ["all","open","overdue","due_soon","verification"].includes(params?.status) ? params.status : "all";
  const query = String(params?.q || "").trim().toLowerCase();
  const dueSoonLimit = new Date();
  dueSoonLimit.setUTCDate(dueSoonLimit.getUTCDate() + 14);
  const dueSoonDate = dueSoonLimit.toISOString().slice(0,10);
  const baseScope = visible.filter((item) => view === "mine" ? isMine(item) : view === "team" ? isMine(item) || reports.has(item.assignee) : true);
  const scoped = baseScope.filter((item) => {
    const isOpen = !CLOSED.has(item.status);
    const isDueSoon = Boolean(isOpen && item.due && item.due >= today && item.due <= dueSoonDate);
    const isVerification = needsDecision(item);
    if (moduleFilter !== "all" && item.source !== moduleFilter) return false;
    if (stateFilter === "open" && !isOpen) return false;
    if (stateFilter === "overdue" && !item.overdue) return false;
    if (stateFilter === "due_soon" && !isDueSoon) return false;
    if (stateFilter === "verification" && !isVerification) return false;
    if (query && !`${item.title} ${item.module} ${item.site} ${item.ownerName}`.toLowerCase().includes(query)) return false;
    return true;
  }).sort((a,b) => String(a.due || "9999").localeCompare(String(b.due || "9999")));
  const open = scoped.filter((item)=>!CLOSED.has(item.status));
  const overdue = open.filter((item)=>item.overdue);
  const dueSoon = open.filter((item)=>item.due && item.due >= today && item.due <= dueSoonDate);
  const verification = open.filter((item)=>needsDecision(item));
  const moduleOptions = [...new Map(baseScope.map((item)=>[item.source,item.module])).entries()].sort((a,b)=>a[1].localeCompare(b[1]));
  const workspaceCards = [
    ["audit","Internal Audit","AUD","/portal/internal-audits"],
    ["inspection","Workplace Inspections","WPI","/portal/health-safety/workplace-inspections"],
    ["rca","CAPA-8D","8D","/portal/rca"],
    ["capa","Gap Assessment / CAPA","CAPA","/portal/history"],
    ["risk","Risk Management","RISK","/portal/health-safety/management-board"],
    ["moc","Management of Change","MOC","/portal/health-safety/moc"],
    ["bcp","Business Continuity","BCP","/portal/business-continuity"],
    ["supplier","Supplier Assurance","SUP","/portal/suppliers"],
    ["isms","Information Security","ISMS","/portal/information-security"],
    ["security_incident","Security Incidents","INC","/portal/information-security/incidents"],
    ["maintenance","Assets & PPM","PPM","/portal/company/assets"],
  ].map(([source,label,code,href]) => {
    const records = baseScope.filter((item)=>item.source===source && !CLOSED.has(item.status));
    return { source,label,code,href,unavailable:(sources.sourceErrors || []).some((error)=>error.module===source),open:records.length,overdue:records.filter((item)=>item.overdue).length,decisions:records.filter((item)=>needsDecision(item)).length };
  });

  return <main className="taskPage"><style>{`
    .taskPage{min-height:100vh;padding:32px clamp(16px,3vw,46px) 80px;background:#edf3f9;color:#092544;font-family:Arial,sans-serif}.taskShell{max-width:1480px;margin:auto}.taskTop{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;flex-wrap:wrap}.taskTop small{color:#1761e8;font-weight:950;letter-spacing:.12em}.taskTop h1{margin:7px 0;font-size:36px}.taskTop p{max-width:780px;margin:0;color:#60778e;line-height:1.5}.taskTop a{padding:12px 15px;border-radius:9px;background:#0b2d56;color:#fff;text-decoration:none;font-weight:850}.taskViews{display:flex;gap:8px;margin:22px 0 12px;flex-wrap:wrap}.taskViews a{padding:10px 14px;border:1px solid #c5d5e3;border-radius:9px;background:#fff;color:#244867;text-decoration:none;font-weight:850}.taskViews a.active{border-color:#315fe6;background:#315fe6;color:#fff}.taskFilters{display:grid;grid-template-columns:minmax(190px,1fr) minmax(190px,1fr) minmax(240px,2fr) auto;gap:10px;margin-bottom:14px}.taskFilters select,.taskFilters input,.taskFilters button{min-height:43px;padding:0 12px;border:1px solid #c5d5e3;border-radius:9px;background:#fff;color:#173b5c;font:inherit;font-weight:700}.taskFilters button{border-color:#0b2d56;background:#0b2d56;color:#fff;cursor:pointer}.taskMetrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.taskMetric{padding:18px;border:1px solid #d1deea;border-radius:13px;background:#fff}.taskMetric span,.taskMetric strong{display:block}.taskMetric span{color:#667d93;font-size:11px;font-weight:900}.taskMetric strong{margin-top:8px;font-size:31px}.taskMetric.red strong{color:#c7352e}.taskMetric.amber strong{color:#b66f00}.taskMetric.blue strong{color:#1761e8}.workspaceSection{margin-top:17px}.workspaceTitle{display:flex;align-items:end;justify-content:space-between;margin:0 2px 9px}.workspaceTitle h2{margin:0;font-size:18px}.workspaceTitle span{color:#6a8095;font-size:11px}.workspaceGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.workspaceCard{display:grid;grid-template-columns:auto 1fr;gap:12px;padding:15px;border:1px solid #d1deea;border-radius:13px;background:#fff;color:#173b5c;text-decoration:none;transition:.15s ease}.workspaceCard:hover{border-color:#315fe6;box-shadow:0 7px 20px rgba(30,64,110,.08);transform:translateY(-1px)}.workspaceCard.active{border-color:#315fe6;box-shadow:inset 0 0 0 1px #315fe6}.workspaceCode{display:grid;place-items:center;width:42px;height:42px;border-radius:10px;background:#eaf1ff;color:#315fe6;font-size:10px;font-weight:950}.workspaceCard strong{display:block}.workspaceStats{display:flex;gap:13px;margin-top:7px;color:#697f94;font-size:10px;font-weight:800}.workspaceStats b{color:#173b5c}.workspaceStats .danger b{color:#c7352e}.workspaceStats .decision b{color:#1761e8}.taskPanel{margin-top:16px;padding:20px;border:1px solid #d1deea;border-radius:15px;background:#fff}.taskHead,.taskRow{display:grid;grid-template-columns:minmax(260px,1.5fr) minmax(150px,.7fr) minmax(160px,.75fr) minmax(130px,.6fr) auto;gap:13px;align-items:center}.taskHead{padding:10px 14px;border-radius:8px;background:#eaf1f7;color:#60768b;font-size:10px;font-weight:900}.taskRow{padding:16px 14px;border-bottom:1px solid #e1e9f0;color:#163b5c;text-decoration:none}.taskRow:hover{background:#f4fbf9}.taskRow strong,.taskRow small{display:block}.taskRow small{margin-top:4px;color:#72879a}.taskStatus{width:max-content;padding:6px 9px;border-radius:99px;background:#e9f2ff;color:#185dae;font-size:10px!important;font-weight:900}.taskStatus.overdue{background:#ffe1df;color:#ad2d28}.taskOpen{color:#1761e8;font-weight:900}.taskEmpty{padding:45px;text-align:center;color:#667d93}.taskNotice{margin-top:12px;padding:12px 15px;border-radius:9px;background:#e4f7f2;color:#096d5d;font-size:12px}.taskNotice b{display:block;margin-bottom:3px}@media(max-width:1000px){.workspaceGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:900px){.taskMetrics{grid-template-columns:1fr 1fr}.taskFilters{grid-template-columns:1fr 1fr}.taskFilters input{grid-column:1/-1}.taskHead{display:none}.taskRow{grid-template-columns:1fr auto}.taskRow>:nth-child(2),.taskRow>:nth-child(3),.taskRow>:nth-child(4){display:none}}@media(max-width:520px){.taskPage{padding:22px 12px 70px}.taskTop h1{font-size:29px}.taskMetrics,.taskFilters,.workspaceGrid{grid-template-columns:1fr 1fr}.taskFilters input{grid-column:1/-1}.taskMetric{padding:14px}.workspaceCard{grid-template-columns:1fr}.workspaceCode{width:36px;height:36px}.workspaceStats{display:grid;gap:3px}}
    @media(min-width:1101px){.taskPage{padding-left:clamp(18px,2vw,34px);padding-right:clamp(18px,2vw,34px)}.taskShell{width:100%;max-width:none;margin:0}}
  `}</style><div className="taskShell">
    <header className="taskTop"><div><small>CONNECTED ASSURANCE - CONTROLLED ACCOUNTABILITY</small><h1>My Tasks &amp; Approvals</h1><p>One controlled view of work assigned to you, approvals requiring your decision, due dates and escalations across RPG Excellence.</p></div>{(organisationOversight || siteOversight) ? <Link href="/portal/tasks?view=oversight">Management Oversight</Link> : null}</header>
    <nav className="taskViews"><Link className={view==="mine"?"active":""} href="/portal/tasks?view=mine">My work</Link><Link className={view==="team"?"active":""} href="/portal/tasks?view=team">My team</Link>{(organisationOversight||siteOversight)?<Link className={view==="oversight"?"active":""} href="/portal/tasks?view=oversight">Management oversight</Link>:null}</nav>
    <form className="taskFilters" method="get"><input type="hidden" name="view" value={view}/><select name="module" defaultValue={moduleFilter}><option value="all">All connected modules</option>{moduleOptions.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select><select name="status" defaultValue={stateFilter}><option value="all">All statuses</option><option value="open">Open only</option><option value="overdue">Overdue</option><option value="due_soon">Due in 14 days</option><option value="verification">Decision / verification</option></select><input name="q" defaultValue={params?.q||""} placeholder="Search task, module, site or owner"/><button type="submit">Apply filters</button></form>
    {(sources.sourceErrors || []).length ? <div className="taskNotice" role="alert"><b>Some task sources could not be loaded</b>Counts are incomplete for {[...new Set(sources.sourceErrors.map((item)=>item.label))].join(", ")}. Do not treat missing tasks as zero outstanding work.</div> : null}
    <section className="taskMetrics"><div className="taskMetric"><span>OPEN RESPONSIBILITIES</span><strong>{open.length}</strong></div><div className="taskMetric red"><span>OVERDUE</span><strong>{overdue.length}</strong></div><div className="taskMetric amber"><span>DUE IN 14 DAYS</span><strong>{dueSoon.length}</strong></div><div className="taskMetric blue"><span>DECISIONS / VERIFICATION</span><strong>{verification.length}</strong></div></section>
    <section className="workspaceSection"><div className="workspaceTitle"><h2>Connected workspaces</h2><span>Counts follow the selected work view. Select a card to filter outstanding responsibilities.</span></div><div className="workspaceGrid">{workspaceCards.map((card)=><Link className={`workspaceCard ${moduleFilter===card.source?"active":""}`} href={`/portal/tasks?view=${view}&module=${card.source}&status=open`} key={card.source}><b className="workspaceCode">{card.code}</b><div><strong>{card.label}</strong><div className="workspaceStats">{card.unavailable ? <span className="danger">Data incomplete</span> : null}<span><b>{card.open}</b> outstanding</span><span className="danger"><b>{card.overdue}</b> overdue</span><span className="decision"><b>{card.decisions}</b> decisions</span></div></div></Link>)}</div></section>
    <div className="taskNotice"><b>Identity-controlled decisions</b>Assignments may be managed by authorised leaders, but completion, approval and verification must be recorded by the signed-in person - not on another user's behalf.</div>
    <section className="taskPanel">{scoped.length?<><div className="taskHead"><span>Task / source</span><span>Assigned person</span><span>Due</span><span>Status</span><span>Record</span></div>{scoped.map((item)=><Link className="taskRow" href={item.href} key={item.id}><div><strong>{item.title}</strong><small>{item.module}{item.site?` - ${item.site}`:""}</small></div><div><strong>{item.assigneePerson?`${item.assigneePerson.first_name} ${item.assigneePerson.last_name}`:item.ownerName||"Not assigned"}</strong><small>{item.assigneePerson?.position||"Company responsibility"}</small></div><div><strong>{date(item.due)}</strong><small>{item.overdue?"Escalation required":"Controlled target"}</small></div><div><span className={`taskStatus ${item.overdue?"overdue":""}`}>{item.overdue?"Overdue":words(item.status)}</span></div><b className="taskOpen">Open &gt;</b></Link>)}</>:<div className="taskEmpty"><strong>No assigned tasks in this view.</strong><br/>New assignments will appear when a Company User is selected in a connected module.</div>}</section>
  </div></main>;
}
