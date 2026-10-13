import Link from "next/link";
import { createAdminClient } from "../../../lib/supabase/admin";
import { requireOrganizationAccess } from "../../../lib/organization-access";
import { loadAssuranceTaskSources } from "../../../lib/assurance-task-sources";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Tasks & Approvals | RPG Excellence" };

const CLOSED = new Set(["closed", "complete", "completed", "effective", "verified", "cancelled", "approved"]);
const VERIFY = new Set(["awaiting_review", "awaiting_verification", "evidence_submitted", "verification", "ready_for_review"]);
const value = (...items) => items.find((item) => item !== null && item !== undefined && String(item).trim()) || "";
const words = (input) => String(input || "open").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const date = (input) => input ? new Intl.DateTimeFormat("en-GB", { day:"2-digit", month:"short", year:"numeric" }).format(new Date(input)) : "No due date";
const list = (input) => Array.isArray(input) ? input : [];

function normalize(row, source) {
  const configs = {
    risk: { module:"Risk Management", title:value(row.action_required, row.action_reference), due:value(row.target_date), assignee:row.responsible_person_id, verifier:row.verifier_person_id, href:`/portal/health-safety/actions/${row.id}` },
    moc: { module:"Management of Change", title:value(row.action_required, row.title), due:value(row.target_date), assignee:row.responsible_person_id, verifier:row.verifier_person_id, href:`/portal/health-safety/moc/${row.moc_id}` },
    capa: { module:"Gap Assessment / CAPA", title:value(row.action_required, row.action, row.title, row.description), due:value(row.target_date, row.due_date), assignee:row.action_owner_person_id, verifier:row.verifier_person_id, href:`/portal/assessments/${row.assessment_id}/actions-plan` },
    rca: { module:"CAPAâ€“8D", title:value(row.title, row.description), due:value(row.due_date, row.target_date), assignee:row.action_owner_person_id, verifier:row.verifier_person_id, href:`/portal/rca/${row.case_id}` },
    supplier: { module:"Supplier Assurance", title:value(row.action_required, row.action_reference), due:value(row.due_date), assignee:row.accountable_person_id, verifier:row.reviewer_person_id, href:`/portal/suppliers/${row.supplier_id}/qbr` },
    isms: { module:"Information Security", title:value(row.action, row.title), due:value(row.target_date), assignee:row.action_owner_person_id, verifier:row.verifier_person_id, href:"/portal/information-security/risk-management" },
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
  for (const parent of sources.bcpStrategies) list(parent.implementation_actions).forEach((row,index)=>add(parent,row,index,"Business Continuity Â· Strategies & Solutions","/portal/business-continuity/strategies-solutions"));
  for (const parent of sources.bcpOutsourced) for (const control of list(parent.supplier_controls)) list(control.actions).forEach((row,index)=>add(parent,row,`${control.id||control.supplierName}:${index}`,"Business Continuity Â· Outsourced Processes","/portal/business-continuity/outsourced-processes"));
  for (const parent of sources.bcpIncident) list(parent.incident_action_plan).forEach((row,index)=>add(parent,row,index,"Business Continuity Â· Incident Management","/portal/business-continuity/incident-management"));
  const reviews = [
    ...sources.bcpBia.map((row)=>[row,"Business Continuity Â· BIA","/portal/business-continuity/bia",row.reviewer_person_id]),
    ...sources.bcpOutsourced.map((row)=>[row,"Business Continuity Â· Outsourced Processes","/portal/business-continuity/outsourced-processes",row.reviewer_person_id]),
    ...sources.bcpStrategies.map((row)=>[row,"Business Continuity Â· Strategies & Solutions","/portal/business-continuity/strategies-solutions",row.approver_person_id]),
    ...sources.bcpIncident.map((row)=>[row,"Business Continuity Â· Incident Management","/portal/business-continuity/incident-management",row.approver_person_id]),
    ...sources.bcpPlans.map((row)=>[row,"Business Continuity Â· Plan","/portal/business-continuity/plans",row.approver_person_id || row.plan_data?.approverPersonId]),
  ];
  for (const [row,module,href,personId] of reviews) if (personId && ["ready_for_review","changes_required","review_due"].includes(row.status)) tasks.push({id:`bcp-review:${row.id}`,source:"bcp",module,title:`Review ${value(row.assessment_title,row.plan_title,"controlled BCP record")}`,due:value(row.next_review_date,row.review_due_date),assignee:personId,verifier:null,href,status:row.status,site:value(row.site_location,row.location_name),ownerName:"",updated:value(row.updated_at,row.created_at)});
  return tasks;
}

function auditTasks(sources, people) {
  const byUser = new Map(people.filter((person)=>person.user_id).map((person)=>[person.user_id,person.id]));
  const findings = new Map(sources.auditFindings.map((finding)=>[finding.id,finding]));
  return sources.auditAssignments.map((row)=>{const finding=findings.get(row.finding_id)||{};return {id:`audit:${row.id}`,source:"audit",module:"Internal Audit / Findings",title:value(finding.title,finding.finding_reference,"Audit corrective action"),due:value(finding.agreed_date,row.secure_token_expires_at),assignee:byUser.get(row.assignee_user_id),verifier:null,href:`/portal/internal-audit-actions#action-${row.id}`,status:String(row.status||"assigned").toLowerCase(),site:"",ownerName:row.assignee_name,updated:value(row.updated_at,row.created_at)};});
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
  const people = peopleResult.data || [];
  const personMap = new Map(people.map((person) => [person.id, person]));
  const me = access.person;
  const today = new Date().toISOString().slice(0,10);
  const activeFunctions = new Set((access.functions || []).filter((item) => item.status === "authorised" && (!item.expires_at || item.expires_at >= today)).map((item) => item.function_key));
  const organisationOversight = Boolean(access.isOwner || access.isCompanyAdministrator || activeFunctions.has("ims_manager"));
  const siteOversight = activeFunctions.has("site_director");
  const reports = new Set(people.filter((person) => person.manager_person_id === me?.id || person.functional_manager_person_id === me?.id).map((person) => person.id));
  const all = [...sources.riskActions.map((row)=>normalize(row,"risk")), ...sources.mocActions.map((row)=>normalize(row,"moc")), ...sources.correctiveActions.map((row)=>normalize(row,"capa")), ...sources.rcaActions.map((row)=>normalize(row,"rca")), ...sources.supplierActions.map((row)=>normalize(row,"supplier")), ...sources.ismsTreatments.map((row)=>normalize(row,"isms")), ...sources.assetMaintenance.map((row)=>normalize(row,"maintenance")), ...bcpTasks(sources), ...auditTasks(sources,people)]
    .filter((item) => item.title)
    .map((item) => ({ ...item, assigneePerson:personMap.get(item.assignee), verifierPerson:personMap.get(item.verifier), overdue:Boolean(item.due && item.due < today && !CLOSED.has(item.status)) }));
  const visible = all.filter((item) => organisationOversight || item.assignee === me?.id || item.verifier === me?.id || reports.has(item.assignee) || (siteOversight && me?.site && (item.site === me.site || item.assigneePerson?.site === me.site)));
  const requested = ["mine","team","oversight"].includes(params?.view) ? params.view : "mine";
  const view = requested === "oversight" && !organisationOversight && !siteOversight ? "mine" : requested;
  const moduleFilter = String(params?.module || "all");
  const stateFilter = ["all","open","overdue","due_soon","verification"].includes(params?.status) ? params.status : "all";
  const query = String(params?.q || "").trim().toLowerCase();
  const dueSoonLimit = new Date();
  dueSoonLimit.setUTCDate(dueSoonLimit.getUTCDate() + 14);
  const dueSoonDate = dueSoonLimit.toISOString().slice(0,10);
  const baseScope = visible.filter((item) => view === "mine" ? item.assignee === me?.id || item.verifier === me?.id : view === "team" ? item.assignee === me?.id || item.verifier === me?.id || reports.has(item.assignee) : true);
  const scoped = baseScope.filter((item) => {
    const isOpen = !CLOSED.has(item.status);
    const isDueSoon = Boolean(isOpen && item.due && item.due >= today && item.due <= dueSoonDate);
    const isVerification = VERIFY.has(item.status) || item.verifier === me?.id;
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
  const verification = open.filter((item)=>VERIFY.has(item.status) || item.verifier === me?.id);
  const moduleOptions = [...new Map(baseScope.map((item)=>[item.source,item.module])).entries()].sort((a,b)=>a[1].localeCompare(b[1]));
  const workspaceCards = [
    ["audit","Internal Audit","AUD","/portal/internal-audits"],
    ["rca","CAPAâ€“8D","8D","/portal/rca"],
    ["capa","Gap Assessment / CAPA","CAPA","/portal/history"],
    ["risk","Risk Management","RISK","/portal/health-safety/management-board"],
    ["moc","Management of Change","MOC","/portal/health-safety/moc"],
    ["bcp","Business Continuity","BCP","/portal/business-continuity"],
    ["supplier","Supplier Assurance","SUP","/portal/suppliers"],
    ["isms","Information Security","ISMS","/portal/information-security"],
    ["maintenance","Assets & PPM","PPM","/portal/company/assets"],
  ].map(([source,label,code,href]) => {
    const records = baseScope.filter((item)=>item.source===source && !CLOSED.has(item.status));
    return { source,label,code,href,open:records.length,overdue:records.filter((item)=>item.overdue).length,decisions:records.filter((item)=>VERIFY.has(item.status) || item.verifier===me?.id).length };
  });

  return <main className="taskPage"><style>{`
    .taskPage{min-height:100vh;padding:32px clamp(16px,3vw,46px) 80px;background:#edf3f9;color:#092544;font-family:Arial,sans-serif}.taskShell{max-width:1480px;margin:auto}.taskTop{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;flex-wrap:wrap}.taskTop small{color:#1761e8;font-weight:950;letter-spacing:.12em}.taskTop h1{margin:7px 0;font-size:36px}.taskTop p{max-width:780px;margin:0;color:#60778e;line-height:1.5}.taskTop a{padding:12px 15px;border-radius:9px;background:#0b2d56;color:#fff;text-decoration:none;font-weight:850}.taskViews{display:flex;gap:8px;margin:22px 0 12px;flex-wrap:wrap}.taskViews a{padding:10px 14px;border:1px solid #c5d5e3;border-radius:9px;background:#fff;color:#244867;text-decoration:none;font-weight:850}.taskViews a.active{border-color:#315fe6;background:#315fe6;color:#fff}.taskFilters{display:grid;grid-template-columns:minmax(190px,1fr) minmax(190px,1fr) minmax(240px,2fr) auto;gap:10px;margin-bottom:14px}.taskFilters select,.taskFilters input,.taskFilters button{min-height:43px;padding:0 12px;border:1px solid #c5d5e3;border-radius:9px;background:#fff;color:#173b5c;font:inherit;font-weight:700}.taskFilters button{border-color:#0b2d56;background:#0b2d56;color:#fff;cursor:pointer}.taskMetrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.taskMetric{padding:18px;border:1px solid #d1deea;border-radius:13px;background:#fff}.taskMetric span,.taskMetric strong{display:block}.taskMetric span{color:#667d93;font-size:11px;font-weight:900}.taskMetric strong{margin-top:8px;font-size:31px}.taskMetric.red strong{color:#c7352e}.taskMetric.amber strong{color:#b66f00}.taskMetric.blue strong{color:#1761e8}.workspaceSection{margin-top:17px}.workspaceTitle{display:flex;align-items:end;justify-content:space-between;margin:0 2px 9px}.workspaceTitle h2{margin:0;font-size:18px}.workspaceTitle span{color:#6a8095;font-size:11px}.workspaceGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.workspaceCard{display:grid;grid-template-columns:auto 1fr;gap:12px;padding:15px;border:1px solid #d1deea;border-radius:13px;background:#fff;color:#173b5c;text-decoration:none;transition:.15s ease}.workspaceCard:hover{border-color:#315fe6;box-shadow:0 7px 20px rgba(30,64,110,.08);transform:translateY(-1px)}.workspaceCard.active{border-color:#315fe6;box-shadow:inset 0 0 0 1px #315fe6}.workspaceCode{display:grid;place-items:center;width:42px;height:42px;border-radius:10px;background:#eaf1ff;color:#315fe6;font-size:10px;font-weight:950}.workspaceCard strong{display:block}.workspaceStats{display:flex;gap:13px;margin-top:7px;color:#697f94;font-size:10px;font-weight:800}.workspaceStats b{color:#173b5c}.workspaceStats .danger b{color:#c7352e}.workspaceStats .decision b{color:#1761e8}.taskPanel{margin-top:16px;padding:20px;border:1px solid #d1deea;border-radius:15px;background:#fff}.taskHead,.taskRow{display:grid;grid-template-columns:minmax(260px,1.5fr) minmax(150px,.7fr) minmax(160px,.75fr) minmax(130px,.6fr) auto;gap:13px;align-items:center}.taskHead{padding:10px 14px;border-radius:8px;background:#eaf1f7;color:#60768b;font-size:10px;font-weight:900}.taskRow{padding:16px 14px;border-bottom:1px solid #e1e9f0;color:#163b5c;text-decoration:none}.taskRow:hover{background:#f4fbf9}.taskRow strong,.taskRow small{display:block}.taskRow small{margin-top:4px;color:#72879a}.taskStatus{width:max-content;padding:6px 9px;border-radius:99px;background:#e9f2ff;color:#185dae;font-size:10px!important;font-weight:900}.taskStatus.overdue{background:#ffe1df;color:#ad2d28}.taskOpen{color:#1761e8;font-weight:900}.taskEmpty{padding:45px;text-align:center;color:#667d93}.taskNotice{margin-top:12px;padding:12px 15px;border-radius:9px;background:#e4f7f2;color:#096d5d;font-size:12px}.taskNotice b{display:block;margin-bottom:3px}@media(max-width:1000px){.workspaceGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:900px){.taskMetrics{grid-template-columns:1fr 1fr}.taskFilters{grid-template-columns:1fr 1fr}.taskFilters input{grid-column:1/-1}.taskHead{display:none}.taskRow{grid-template-columns:1fr auto}.taskRow>:nth-child(2),.taskRow>:nth-child(3),.taskRow>:nth-child(4){display:none}}@media(max-width:520px){.taskPage{padding:22px 12px 70px}.taskTop h1{font-size:29px}.taskMetrics,.taskFilters,.workspaceGrid{grid-template-columns:1fr 1fr}.taskFilters input{grid-column:1/-1}.taskMetric{padding:14px}.workspaceCard{grid-template-columns:1fr}.workspaceCode{width:36px;height:36px}.workspaceStats{display:grid;gap:3px}}
  `}</style><div className="taskShell">
    <header className="taskTop"><div><small>CONNECTED ASSURANCE Â· CONTROLLED ACCOUNTABILITY</small><h1>My Tasks &amp; Approvals</h1><p>One controlled view of work assigned to you, approvals requiring your decision, due dates and escalations across RPG Excellence.</p></div>{(organisationOversight || siteOversight) ? <Link href="/portal/tasks?view=oversight">Management Oversight</Link> : null}</header>
    <nav className="taskViews"><Link className={view==="mine"?"active":""} href="/portal/tasks?view=mine">My work</Link><Link className={view==="team"?"active":""} href="/portal/tasks?view=team">My team</Link>{(organisationOversight||siteOversight)?<Link className={view==="oversight"?"active":""} href="/portal/tasks?view=oversight">Management oversight</Link>:null}</nav>
    <form className="taskFilters" method="get"><input type="hidden" name="view" value={view}/><select name="module" defaultValue={moduleFilter}><option value="all">All connected modules</option>{moduleOptions.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select><select name="status" defaultValue={stateFilter}><option value="all">All statuses</option><option value="open">Open only</option><option value="overdue">Overdue</option><option value="due_soon">Due in 14 days</option><option value="verification">Decision / verification</option></select><input name="q" defaultValue={params?.q||""} placeholder="Search task, module, site or owner"/><button type="submit">Apply filters</button></form>
    <section className="taskMetrics"><div className="taskMetric"><span>OPEN RESPONSIBILITIES</span><strong>{open.length}</strong></div><div className="taskMetric red"><span>OVERDUE</span><strong>{overdue.length}</strong></div><div className="taskMetric amber"><span>DUE IN 14 DAYS</span><strong>{dueSoon.length}</strong></div><div className="taskMetric blue"><span>DECISIONS / VERIFICATION</span><strong>{verification.length}</strong></div></section>
    <section className="workspaceSection"><div className="workspaceTitle"><h2>Connected workspaces</h2><span>Select a card to filter outstanding responsibilities</span></div><div className="workspaceGrid">{workspaceCards.map((card)=><Link className={`workspaceCard ${moduleFilter===card.source?"active":""}`} href={`/portal/tasks?view=${view}&module=${card.source}&status=open`} key={card.source}><b className="workspaceCode">{card.code}</b><div><strong>{card.label}</strong><div className="workspaceStats"><span><b>{card.open}</b> outstanding</span><span className="danger"><b>{card.overdue}</b> overdue</span><span className="decision"><b>{card.decisions}</b> decisions</span></div></div></Link>)}</div></section>
    <div className="taskNotice"><b>Identity-controlled decisions</b>Assignments may be managed by authorised leaders, but completion, approval and verification must be recorded by the signed-in personâ€”not on another user's behalf.</div>
    <section className="taskPanel">{scoped.length?<><div className="taskHead"><span>Task / source</span><span>Assigned person</span><span>Due</span><span>Status</span><span>Record</span></div>{scoped.map((item)=><Link className="taskRow" href={item.href} key={item.id}><div><strong>{item.title}</strong><small>{item.module}{item.site?` Â· ${item.site}`:""}</small></div><div><strong>{item.assigneePerson?`${item.assigneePerson.first_name} ${item.assigneePerson.last_name}`:item.ownerName||"Not assigned"}</strong><small>{item.assigneePerson?.position||"Company responsibility"}</small></div><div><strong>{date(item.due)}</strong><small>{item.overdue?"Escalation required":"Controlled target"}</small></div><div><span className={`taskStatus ${item.overdue?"overdue":""}`}>{item.overdue?"Overdue":words(item.status)}</span></div><b className="taskOpen">Open â†’</b></Link>)}</>:<div className="taskEmpty"><strong>No assigned tasks in this view.</strong><br/>New assignments will appear when a Company User is selected in a connected module.</div>}</section>
  </div></main>;
}
