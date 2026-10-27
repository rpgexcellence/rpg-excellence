import Image from "next/image";
// RPG INTERNAL AUDIT PLAN GATE — NO SEPARATE SAMPLING MODULE — 2026-08-24
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { createClient } from "../../../../lib/supabase/server";
import { loadAdministrationLocations } from "../../../../lib/rcaCompanyLinks";
import AuditTeamAssignmentForm from "./AuditTeamAssignmentForm";
import OfflineAuditDraft from "../../../../components/OfflineAuditDraft";
import FindingConclusionFields from "../../assessments/[id]/FindingConclusionFields";
import {
  addAuditScheduleItem,
  approveAuditPlan,
  approveAuditTeam,
  addAuditEvidence,
  openAuditFinding,
  getAuditFieldworkSnapshot,
  completeAuditFieldwork,
  completeAuditClosure,
  saveAuditAnswer,
  saveAuditNotification,
  saveAuditScope,
  saveAuditReport,
  generateAuditReportGuidedDraft,
  approveAuditReport,
  issueAuditReport,
} from "./actions";

const GATES = [
  ["scope", "01", "Scope"],
  ["team", "02", "Team"],
  ["plan", "03", "Plan"],
  ["fieldwork", "04", "Fieldwork"],
  ["report", "05", "Report"],
  ["actions", "06", "Actions"],
  ["closing", "07", "Close"],
];

const ROLE_LABELS = {
  lead_auditor: "Lead auditor",
  auditor: "Auditor",
  technical_expert: "Technical expert",
  observer: "Observer",
  trainee: "Trainee auditor",
  independent_reviewer: "Independent reviewer",
};

const ACTIVITY_LABELS = {
  opening_meeting: "Opening meeting",
  interview: "Interview",
  process_audit: "Process audit",
  site_walk: "Site walk",
  document_review: "Document review",
  sample_review: "Sample review",
  team_review: "Audit team review",
  break: "Break",
  closing_meeting: "Closing meeting",
  other: "Other activity",
};

function displayDate(value) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC",
  }).format(new Date(value));
}

function localDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return date.toISOString().slice(0, 23);
}

function splitControlledList(value) {
  return String(value ?? "")
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function createMailtoHref({ recipients, ccRecipients, subject, body }) {
  const query = new URLSearchParams();

  if (ccRecipients.length) {
    query.set("cc", ccRecipients.join(","));
  }

  query.set("subject", subject);
  query.set("body", body);

  return `mailto:${recipients.join(",")}?${query.toString()}`;
}

export default async function InternalAuditWorkspace({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const requestHeaders = await headers();
  const requestHost = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "www.rpgexcellence.com";
  const requestProtocol = requestHeaders.get("x-forwarded-proto") || "https";
  const applicationOrigin = `${requestProtocol}://${requestHost}`;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/portal/login?next=/portal/internal-audits/${id}`);

  const [auditResult, teamResult, scheduleResult, notificationsResult, selectedProcessesResult] = await Promise.all([
    supabase.from("internal_audits").select(`
      *,
      internal_audit_selected_standards(
        id, standard_id, full_or_partial, included_clauses, excluded_clauses,
        internal_audit_standard_catalogue(standard_code, display_name, discipline)
      )
    `).eq("id", id).eq("owner_id", user.id).maybeSingle(),
    supabase.from("internal_audit_team_members").select("*")
      .eq("audit_id", id).eq("owner_id", user.id).order("created_at"),
    supabase.from("internal_audit_schedule_items").select("*")
      .eq("audit_id", id).eq("owner_id", user.id).order("starts_at"),
    supabase.from("internal_audit_notifications").select("*")
      .eq("audit_id", id).eq("owner_id", user.id).eq("notification_type", "audit_notification")
      .order("updated_at", { ascending: false }).limit(1),
    supabase.from("internal_audit_selected_processes").select("standard_id, scope_key, process_name")
      .eq("audit_id", id).eq("owner_id", user.id),
  ]);

  if (auditResult.error) throw new Error(auditResult.error.message);
  if (!auditResult.data) notFound();
  if (teamResult.error) throw new Error(teamResult.error.message);
  if (scheduleResult.error) throw new Error(scheduleResult.error.message);
  if (notificationsResult.error) throw new Error(notificationsResult.error.message);
  if (selectedProcessesResult.error) throw new Error(selectedProcessesResult.error.message);

  const audit = auditResult.data;
  const team = teamResult.data ?? [];
  const schedule = scheduleResult.data ?? [];
  const notification = notificationsResult.data?.[0] ?? null;
  const standardIds = (audit.internal_audit_selected_standards ?? [])
    .map((row) => row.standard_id)
    .filter(Boolean);
  const [organizationResult, companyPeopleResult, supplierContactsResult] = await Promise.all([
    supabase.from("organizations").select("id,name,address_line_1,address_line_2,city,region,postal_code,country,business_site_mode,business_additional_sites").eq("id", audit.organization_id).eq("owner_id", user.id).maybeSingle(),
    supabase.from("organization_people").select("id,first_name,last_name,email,position,user_id").eq("organization_id", audit.organization_id).eq("account_status", "active").order("last_name"),
    audit.supplier_id ? supabase.from("supplier_contacts").select("id,supplier_id,first_name,last_name,email,business_title").eq("supplier_id", audit.supplier_id).eq("owner_id", user.id).eq("is_active", true).order("last_name") : Promise.resolve({ data: [], error: null }),
  ]);
  if (organizationResult.error) throw new Error(organizationResult.error.message);
  if (companyPeopleResult.error) throw new Error(companyPeopleResult.error.message);
  if (supplierContactsResult.error) throw new Error(supplierContactsResult.error.message);
  const companyPeople = companyPeopleResult.data ?? [];
  const supplierContacts = supplierContactsResult.data ?? [];
  const administrationLocations = organizationResult.data ? await loadAdministrationLocations(organizationResult.data) : [];
  const loggedPerson = companyPeople.find((person) => person.user_id === user.id) || companyPeople.find((person) => person.email?.toLowerCase() === user.email?.toLowerCase());
  const loggedActorName = [loggedPerson?.first_name, loggedPerson?.last_name].filter(Boolean).join(" ") || user.user_metadata?.full_name || user.email;
  const approvalIdentity = <div className="coming"><strong>Approval recorded by signed-in user</strong><br />{loggedActorName} · {user.email}<br /><small>This identity is locked to the authenticated account and cannot be changed in the form.</small></div>;
  const today = new Date().toISOString().slice(0, 10);
  const eligibleAuditorsResult = await supabase.from("internal_auditor_register")
    .select("id, full_name, email, verified_until, standard_authorisations:internal_auditor_standard_authorisations(standard_id, authorisation_status, authorised_until)")
    .eq("owner_id", user.id).eq("organization_id", audit.organization_id).eq("active", true)
    .eq("verification_status", "verified").gte("verified_until", today).order("full_name");
  if (eligibleAuditorsResult.error) throw new Error(`${eligibleAuditorsResult.error.message}. Run internal-auditor-verification.sql in Supabase before assigning the team.`);
  const eligibleAuditors = eligibleAuditorsResult.data ?? [];
  const fieldworkState = await getAuditFieldworkSnapshot(audit.id);
  if(fieldworkState.ownerId!==user.id || fieldworkState.organizationId!==audit.organization_id)throw new Error("The authenticated audit context changed. Refresh before continuing.");
  const questions = fieldworkState.scope.questions;
  const answers = fieldworkState.answers;
  const evidence = fieldworkState.evidence;
  const findings = fieldworkState.findings.filter(finding=>finding.audit_id===audit.id);
  const coverage = fieldworkState.coverage;
  const coverageByQuestion = new Map(coverage.rows.map(row=>[row.questionId,row]));
  const standardLabels = new Map(fieldworkState.scope.standards.map(standard=>[standard.standardId,standard.standardLabel]));
  const dataScopeIssues = fieldworkState.scope.issues.filter(issue=>issue.blocking && issue.code!=="reference_inventory_unverified");
  for(const standard of fieldworkState.scope.standards)if(!standard.referenceClauses)dataScopeIssues.push({code:"reference_inventory_missing_preview",standardId:standard.standardId,blocking:true,message:"No controlled reference clauses resolve to this selected scope. Review its criterion inventory before completing Fieldwork.",details:[]});
  const fieldworkLocked = !audit.plan_approved || audit.current_gate!=="fieldwork" || audit.status==="closed";
  const completionDataReady = coverage.required>0 && coverage.outstanding===0 && dataScopeIssues.length===0;
  const standardFilter = standardLabels.has(query?.standard) ? query.standard : "";
  const outstandingOnly = query?.criteria==="outstanding";
  const visibleQuestions = questions.filter(question=>(!standardFilter || question.criteria_links.some(link=>link.standard_id===standardFilter)) && (!outstandingOnly || !coverageByQuestion.get(question.id)?.complete));
  const {data:reportControl,error:reportControlError}=await supabase.from("internal_audit_report_controls").select("*").eq("audit_id",id).eq("owner_id",user.id).maybeSingle();
  if(reportControlError)throw new Error(reportControlError.message);
  const evidenceAttachmentPaths = evidence.map((item) => item.attachment_path).filter(Boolean);
  const evidenceAttachmentUrls = new Map();
  if (evidenceAttachmentPaths.length > 0) {
    const { data: signedEvidenceAttachments } = await supabase.storage.from("internal-audit-evidence").createSignedUrls(evidenceAttachmentPaths, 3600);
    for (const attachment of signedEvidenceAttachments ?? []) if (attachment.path && attachment.signedUrl) evidenceAttachmentUrls.set(attachment.path, attachment.signedUrl);
  }
  const nonconformities=findings.filter(finding=>["major_nc","minor_nc"].includes(finding.finding_type));
  const unresolvedNonconformities=nonconformities.filter(finding=>!finding.linked_rca_case_id || finding.status!=="closed" || !finding.closure_verified);
  const answersByQuestion = new Map(answers.map((answer) => [answer.question_id, answer]));
  const assessedCount = coverage.accountedFor;
  const inheritedProcesses = splitControlledList(audit.processes);
  const inheritedSites = splitControlledList(audit.sites);
  const defaultProcess = inheritedProcesses[0] ?? audit.scope_statement ?? "";
  const defaultSite = inheritedSites[0] ?? "";
  const defaultLead = team.find((member) => member.audit_role === "lead_auditor") ?? null;
  const hasLeadAuditor = Boolean(defaultLead);
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", audit.organization_id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (organizationError) throw new Error(organizationError.message);
  const standards = (audit.internal_audit_selected_standards ?? [])
    .map((row) => row.internal_audit_standard_catalogue?.display_name)
    .filter(Boolean);
  const selectedStandardOptions = (audit.internal_audit_selected_standards ?? [])
    .map((row) => ({
      id: row.standard_id,
      label: row.internal_audit_standard_catalogue?.display_name,
    }))
    .filter((item) => item.id && item.label);

  const teamEmails = [...new Set(
    team.map((member) => member.email?.trim()).filter(Boolean)
  )];
  const notificationRecipients = notification?.recipients?.length
    ? notification.recipients
    : splitControlledList(audit.auditee_contact_email);
  const notificationCcRecipients = notification?.cc_recipients?.length
    ? notification.cc_recipients
    : teamEmails;
  const notificationSubject = notification?.subject
    ?? `${audit.audit_reference} — Internal audit notification`;
  const notificationRequest = notification?.body
    ?? "Please provide current procedures, applicable records, relevant performance data, prior findings and evidence of completed actions before the opening meeting.";
  const notificationEmailBody = [
    `Dear ${audit.auditee_contact_name || "Auditee"},`,
    "",
    `This is the formal notification of internal audit ${audit.audit_reference}: ${audit.title}.`,
    "",
    `Organisation: ${organization?.name || "Not specified"}`,
    `Audit period: ${displayDate(audit.planned_start_at)} – ${displayDate(audit.planned_end_at)}`,
    `Audit method: ${audit.audit_method || "Not specified"}`,
    `Audit criteria: ${standards.join(", ") || "Approved audit criteria"}`,
    `Audit purpose: ${audit.purpose || "See controlled audit record"}`,
    `Audit scope: ${audit.scope_statement || "See controlled audit record"}`,
    `Processes in scope: ${inheritedProcesses.join(", ") || "See approved scope"}`,
    `Sites / locations: ${inheritedSites.join(", ") || "Not specified"}`,
    `Audit team: ${team.map((member) => `${member.member_name}${member.audit_role ? ` (${ROLE_LABELS[member.audit_role] ?? member.audit_role})` : ""}`).join(", ") || "To be confirmed"}`,
    "",
    "Requested information:",
    notificationRequest,
    "",
    "Please acknowledge receipt and advise promptly of any availability, access, safety, confidentiality or operational constraints that may affect the audit.",
    "",
    "Regards,",
    defaultLead?.member_name || audit.leader_name || "Lead Auditor",
  ].join("\n");
  const notificationMailtoHref = createMailtoHref({
    recipients: notificationRecipients,
    ccRecipients: notificationCcRecipients,
    subject: notificationSubject,
    body: notificationEmailBody,
  });

  const scopeComplete = Boolean(audit.scope_approved);
  const teamComplete = ["plan", "notification", "fieldwork", "findings", "report", "actions", "closing", "follow_up", "closure"].includes(audit.current_gate);
  const planComplete = Boolean(audit.plan_approved) || ["notification", "fieldwork", "findings", "report", "actions", "closing", "follow_up", "closure"].includes(audit.current_gate);
  const fieldworkComplete = ["report", "actions", "closing", "follow_up", "closure"].includes(audit.current_gate);
  const reportComplete = ["approved", "issued"].includes(reportControl?.status) || ["actions", "closing", "closure"].includes(audit.current_gate);
  const reportIssued = reportControl?.status === "issued";
  const requested = typeof query?.gate === "string" ? query.gate : audit.current_gate;
  const gate = requested === "team" && scopeComplete ? "team"
    : requested === "plan" && teamComplete ? "plan"
      : requested === "fieldwork" && planComplete ? "fieldwork"
        : requested === "report" && fieldworkComplete ? "report"
          : requested === "actions" && reportComplete ? "actions"
            : requested === "closing" && reportComplete ? "closing"
      : requested === "scope" ? "scope"
        : audit.current_gate === "team" && scopeComplete ? "team"
          : audit.current_gate === "report" && fieldworkComplete ? "report"
            : audit.current_gate === "actions" && reportComplete ? "actions"
              : ["closing", "closure"].includes(audit.current_gate) && reportComplete ? "closing"
                : planComplete ? "fieldwork" : teamComplete ? "plan" : "scope";

  return (
    <main className="workspacePage">
      <style>{`
          .afwScopeBody{padding:22px;display:grid;gap:16px}.afwScope progress{width:100%;height:10px;accent-color:#0b818b}.afwHint{margin:0;color:#617087;font-size:13px;line-height:1.7}.afwCoverageDetails>summary,.afwReference>summary,.afwExtra>summary{cursor:pointer;font-weight:750;color:#126c7b;padding:12px 0}.afwStandardCoverage{display:grid;gap:14px;padding-top:10px}.afwStandardCoverage>section{padding:15px;border:1px solid #dce6ef;border-radius:10px}.afwStandardCoverage h4{margin:0 0 7px}.afwStandardCoverage p{margin:5px 0;color:#617087;font-size:12px}.afwClauseLinks{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}.afwClauseLinks>a{display:flex;gap:12px;align-items:center;padding:8px 10px;border:1px solid #d6e4ee;border-radius:8px;text-decoration:none;color:#184c72;font-size:12px}.afwClauseLinks span{background:#eaf2fa;padding:3px 5px;border-radius:5px;font-weight:750}.afwFilter{display:flex;align-items:end;flex-wrap:wrap;gap:10px;padding:18px 22px;border-bottom:1px solid #e1e8ef;background:#f8fafc}.afwFilter label{display:grid;gap:7px;font-size:12px;font-weight:700;color:#47637d;flex:1;min-width:180px}.afwFilter select{padding:10px;border:1px solid #cfddea;border-radius:8px;background:#fff;min-width:0;width:100%;color:#173b55}.afwFilter small{width:100%;color:#617087}.afwQuestions{padding:0 26px}.afwQuestion{padding:28px 0;border-bottom:1px solid #e0e8ef;scroll-margin-top:80px}.afwQuestion:last-child{border-bottom:0}.afwQuestionHeading{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.afwQuestionHeading h3{margin:0;font-size:20px}.afwControl{padding:5px 9px;background:#eef3ff;color:#1759dd;font-size:11px;font-weight:800;border-radius:999px;overflow-wrap:anywhere}.afwStatus{margin-left:auto;font-size:11px;background:#fff4dc;color:#835c15;padding:6px 9px;border-radius:6px}.afwStatus.complete{background:#e9f7f0;color:#17684a}.afwCriteria{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0;color:#526e85;font-size:11px}.afwCriteria>span{padding:4px 7px;background:#f4f7fa;border-radius:5px}.afwPrompt{font-size:16px;line-height:1.6;margin:12px 0;color:#092340}.afwGuidance{border:1px solid #dbe5ef;border-radius:9px;overflow:hidden;margin:15px 0 20px}.afwGuidance>summary{padding:14px;background:#f5f8fc;cursor:pointer;font-weight:800;color:#102d4b}.afwGuidanceBody{padding:13px;display:grid;gap:12px}.afwGuideStack{display:grid;gap:10px}.afwGuideStack>p{font-size:13px;line-height:1.7;margin:0;color:#526b83}.afwGuideBlock{background:#f5f8fc;padding:12px 14px;border-radius:7px;color:#617087;font-size:13px;line-height:1.7;overflow-wrap:anywhere}.afwGuideBlock strong{color:#16324d}.afwGuideBlock ul{margin:7px 0 0;padding-left:20px}.afwGuideBlock.blue{background:#eef4ff;border-left:3px solid #225cdb}.afwGuideBlock.teal{background:#f0faf7;border-left:3px solid #18818a}.afwGuideBlock.amber{background:#fff9eb;color:#795c20}.afwGuideBlock.red{background:#fff3f1;color:#9c382d}.afwGuideBlock.purple{background:#f7f4fd}.afwGuideBlock.green{background:#f0fbf4;border-left:3px solid #259d61}.afwGuideGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.afwGuideGrid:empty{display:none}.afwReference{border:1px solid #e2e9f0;border-radius:8px;padding:0 12px 12px}.afwAnswer{margin:0!important;padding:0!important}.afwAnswer>.field>span{display:block;margin-bottom:8px;font-weight:750}.afwAnswer textarea{min-height:110px}.afwExtra{margin-top:12px}.afwExtra fieldset{padding:12px 0 0;border:0;min-width:0}.afwProgressHead{display:flex;justify-content:space-between;gap:15px;flex-wrap:wrap}.afwProgressActions{display:flex;gap:9px;flex-wrap:wrap;margin-top:14px}.afwScope li{margin:8px 0;overflow-wrap:anywhere}@media(max-width:650px){.mainPanel .fieldworkLayout{margin-left:8px;margin-right:8px}.mainPanel .afwQuestions{padding-left:12px;padding-right:12px}.afwQuestions{padding:0 15px}.afwQuestion{padding:22px 0}.afwGuideGrid{grid-template-columns:1fr}.afwGuidanceBody{padding:9px}.afwFilter{padding:15px}.afwFilter label{min-width:100%}.afwFilter select,.afwAnswer input,.afwAnswer select,.afwAnswer textarea{font-size:16px}.afwStatus{margin-left:0}.afwScopeBody{padding:15px}.afwProgressActions .button{width:100%}.afwGuideBlock{padding:11px}.afwQuestionHeading h3{font-size:18px}}

        :root{--navy:#061a35;--blue:#1761e8;--cyan:#35d7d0;--muted:#667990;--line:#dbe5f0;--soft:#f4f7fb;--green:#087a4b}
        *{box-sizing:border-box}.workspacePage{min-height:100vh;padding:25px clamp(16px,4vw,64px) 80px;background:linear-gradient(180deg,#eef4fb,#f8fafc 520px);color:var(--navy)}.workspaceShell{max-width:1720px;margin:auto}
        .workspaceTop{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:20px}.workspaceLogo{display:block;object-fit:contain}.workspaceBack{padding:12px 17px;border:1px solid #cfdae7;border-radius:12px;background:#fff;color:var(--navy);font-weight:900;text-decoration:none}
        .auditHeader{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:28px;align-items:end;padding:30px 34px;border-radius:24px;background:linear-gradient(120deg,#061a35,#0b3566);color:#fff;box-shadow:0 20px 55px #061a3524}.auditEyebrow{color:var(--cyan);font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.auditHeader h1{margin:8px 0 9px;color:#fff!important;-webkit-text-fill-color:#fff!important;font-size:clamp(32px,4vw,54px);line-height:1.03}.auditMeta{color:#cad9ea;line-height:1.55}.auditStandard{max-width:460px;padding:16px 19px;border:1px solid #ffffff29;border-radius:16px;background:#ffffff10;color:#e6eff9;font-size:14px;line-height:1.5}
        .notice{margin:18px 0;padding:14px 18px;border:1px solid #9bdab9;border-radius:13px;background:#e9f8ef;color:#075f39;font-weight:850}.notice.error{border-color:#efbd74;background:#fff7e8;color:#7c4700}.notice a{color:inherit;font-weight:950}.gateNav{display:grid;grid-template-columns:repeat(7,minmax(150px,1fr));gap:10px;margin:18px 0;overflow-x:auto}.gate{display:flex;gap:11px;align-items:center;min-height:70px;padding:14px;border:1px solid var(--line);border-radius:14px;background:#fff;color:var(--navy);text-decoration:none}.gate b{display:grid;width:32px;height:32px;place-items:center;border-radius:50%;background:#eaf1ff;color:var(--blue);font-size:11px}.gate span strong,.gate span small{display:block}.gate span small{margin-top:3px;color:var(--muted);font-size:11px}.gate.active{border-color:var(--blue);background:#1761e8;color:#fff;box-shadow:0 12px 28px #1761e82c}.gate.active b{background:#fff;color:var(--blue)}.gate.active small{color:#dbe8ff}.gate.locked{pointer-events:none;opacity:.48;background:#eef2f7}
        .workspaceGrid{display:grid;grid-template-columns:270px minmax(0,1fr);overflow:hidden;border:1px solid var(--line);border-radius:24px;background:#fff;box-shadow:0 18px 50px #061a3510}.sideRail{padding:27px 22px;border-right:1px solid #e4ebf3;background:#f7f9fc}.railLabel{color:#718298;font-size:11px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}.railMetric{margin:8px 0 24px;font-size:34px;font-weight:950}.railBlock{margin-top:18px;padding-top:18px;border-top:1px solid #dfe7f0}.railBlock strong,.railBlock span{display:block}.railBlock span{margin-top:5px;color:var(--muted);font-size:12px;line-height:1.5}.mainPanel{padding:34px}.panelKicker{color:var(--blue);font-size:12px;font-weight:900;letter-spacing:.11em;text-transform:uppercase}.mainPanel h2{margin:7px 0 6px;font-size:31px}.panelLead{margin:0 0 28px;color:var(--muted);line-height:1.55}
        .section{margin-top:28px;padding-top:27px;border-top:1px solid #e3eaf2}.section h3{margin:0 0 16px;font-size:18px}.grid2,.grid3{display:grid;gap:16px}.grid2{grid-template-columns:repeat(2,minmax(0,1fr))}.grid3{grid-template-columns:repeat(3,minmax(0,1fr))}.field{display:flex;flex-direction:column;gap:7px}.field span{color:#2d4562;font-size:13px;font-weight:850}.field input,.field select,.field textarea{width:100%;min-height:49px;padding:12px 13px;border:1px solid #cbd8e6;border-radius:10px;background:#fff;color:#102944;font:inherit;font-size:14px}.field textarea{min-height:112px;resize:vertical;line-height:1.5}.field input:focus,.field select:focus,.field textarea:focus{outline:0;border-color:var(--blue);box-shadow:0 0 0 4px #1761e817}.check{display:flex;gap:10px;align-items:flex-start;padding:13px;border:1px solid #d5e0ec;border-radius:11px;background:#f8fafd;color:#314a67;font-size:13px;line-height:1.4}.check input{width:18px;height:18px;accent-color:var(--blue)}
        .actionBar{display:flex;justify-content:flex-end;gap:12px;margin-top:25px;padding:17px;border-radius:14px;background:#071d39}.button{min-height:47px;padding:0 19px;border:0;border-radius:10px;font:inherit;font-weight:900;cursor:pointer}.button.secondary{background:#eaf1ff;color:#164fba}.button.primary{background:linear-gradient(135deg,#1761e8,#0d4ec8);color:#fff}.button.approve{background:#07824d;color:#fff}.teamList{display:grid;gap:11px;margin-bottom:22px}.teamCard{display:grid;grid-template-columns:minmax(0,1fr) 190px 190px;gap:15px;align-items:center;padding:16px;border:1px solid #d8e3ee;border-radius:13px;background:#f8fafd}.teamCard strong,.teamCard small{display:block}.teamCard small{margin-top:3px;color:var(--muted)}.confirmation{color:var(--green);font-size:12px;font-weight:850}.warning{color:#9a5700;font-size:12px;font-weight:850}.planPreview{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.previewCard{padding:20px;border:1px solid #d7e2ed;border-radius:14px;background:#f8fafd}.previewCard b,.previewCard span{display:block}.previewCard b{color:var(--blue)}.previewCard span{margin-top:8px;color:var(--muted);line-height:1.5}.coming{margin-top:24px;padding:20px;border:1px solid #efd18c;border-radius:14px;background:#fff8e7;color:#6a4c08;line-height:1.55}.planStack{display:grid;gap:18px;margin:0 34px 34px}.planModule{overflow:hidden;border:1px solid #d9e4ef;border-radius:18px;background:#fff;box-shadow:0 12px 30px #061a3509}.moduleHead{display:flex;justify-content:space-between;gap:20px;padding:20px 22px;border-bottom:1px solid #e1e8f0;background:linear-gradient(135deg,#f8fbff,#eef5fc)}.moduleHead h3{margin:0;font-size:21px}.moduleHead p{margin:5px 0 0;color:var(--muted);line-height:1.5}.countBadge{align-self:flex-start;padding:7px 10px;border-radius:999px;background:#e8f0ff;color:var(--blue);font-size:12px;font-weight:900;white-space:nowrap}.moduleBody{padding:22px}.recordList{display:grid;gap:10px;margin-bottom:18px}.record{display:grid;grid-template-columns:170px minmax(0,1fr) auto;gap:16px;align-items:center;padding:15px;border:1px solid #dce5ee;border-radius:13px;background:#f8fafc}.record strong,.record small{display:block}.record small{margin-top:4px;color:var(--muted);line-height:1.45}.recordTag{padding:6px 9px;border-radius:999px;background:#eaf1ff;color:#1652bf;font-size:11px;font-weight:900}.emptyState{margin-bottom:18px;padding:18px;border:1px dashed #b8c9dc;border-radius:13px;color:var(--muted);text-align:center}.planGate{margin:0 34px 34px;padding:24px;border:1px solid #9ed8bd;border-radius:18px;background:linear-gradient(135deg,#effaf4,#f8fcfa)}.planGate h3{margin:0 0 8px;font-size:22px}.readinessGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:18px 0}.readinessItem{padding:13px;border-radius:11px;background:#fff;color:#31506b;font-weight:800}.readinessItem.ready{color:#067647}.readinessItem.missing{color:#9a5700}
        /* Premium audit operating workspace */
        .workspacePage{background:
          radial-gradient(circle at 92% 4%,#d9ebff 0,transparent 25%),
          linear-gradient(180deg,#edf4fb 0,#f7f9fc 440px,#edf2f7 100%)}
        .auditHeader{position:relative;overflow:hidden;grid-template-columns:minmax(0,1fr) 360px;padding:34px 38px;background:linear-gradient(125deg,#04172f 0%,#072b55 64%,#0b4477 100%)}
        .auditHeader:before,.auditHeader:after{content:"";position:absolute;border:1px solid #5ecfd326;border-radius:50%;pointer-events:none}
        .auditHeader:before{width:420px;height:420px;right:-170px;top:-290px}.auditHeader:after{width:260px;height:260px;right:-70px;top:-170px}
        .auditHeader>div{position:relative;z-index:1}.auditStandard{backdrop-filter:blur(12px);background:#ffffff12}
        .gateNav{position:sticky;top:12px;z-index:20;padding:10px;border:1px solid #d8e3ef;border-radius:18px;background:#fffffff2;box-shadow:0 14px 36px #071d3912;backdrop-filter:blur(16px)}
        .gate{border:0;background:transparent}.gate:not(.active):hover{background:#eef4fb;transform:translateY(-1px)}
        .workspaceGrid{display:block;overflow:visible;border:0;background:transparent;box-shadow:none}
        .sideRail{display:grid;grid-template-columns:1.05fr 1.4fr 1fr 1fr;gap:0;margin-bottom:18px;padding:0;overflow:hidden;border:1px solid #d8e3ee;border-radius:18px;background:#fff;box-shadow:0 14px 38px #061a350d}
        .sideRail>.railLabel{display:none}.sideRail>.railMetric{display:flex;align-items:center;margin:0;padding:23px 25px;background:linear-gradient(135deg,#071d39,#0b3566);color:#fff;font-size:28px}
        .railBlock{margin:0;padding:20px 24px;border-top:0;border-left:1px solid #e2e9f1}.railBlock:first-of-type{border-left:0}.railBlock strong{font-size:12px;letter-spacing:.04em;text-transform:uppercase}.railBlock span{font-size:13px}
        .mainPanel{position:relative;padding:0;border:1px solid #d8e3ee;border-radius:22px;background:#fff;box-shadow:0 22px 58px #061a3510}
        .mainPanel>div.panelKicker,.mainPanel>h2,.mainPanel>p.panelLead{margin-left:34px;margin-right:34px}.mainPanel>div.panelKicker{padding-top:34px}.mainPanel>h2{font-size:clamp(28px,3vw,40px);letter-spacing:-.035em}.mainPanel>p.panelLead{max-width:850px;margin-bottom:24px;font-size:16px}
        .mainPanel form{padding:0 34px 34px}
        .mainPanel form>.grid2{padding:22px;border:1px solid #dce6f0;border-radius:18px;background:linear-gradient(145deg,#f8fbff,#f3f7fb)}
        .section{margin-top:20px;padding:22px;border:1px solid #dce6f0;border-radius:18px;background:#fff;box-shadow:0 10px 28px #071d3908}
        .section h3{display:flex;align-items:center;gap:10px;font-size:19px}.section h3:before{content:"";width:9px;height:9px;border-radius:50%;background:linear-gradient(135deg,var(--cyan),var(--blue));box-shadow:0 0 0 6px #35d7d014}
        .field{position:relative;padding:18px;border:1px solid #dde6ef;border-radius:14px;background:#fff;transition:.2s ease}.field:hover{border-color:#b7cce2;box-shadow:0 10px 24px #071d3909}.field span{font-size:16px;line-height:1.4;letter-spacing:0}.field input,.field select,.field textarea{padding:11px 0;border:0;border-radius:0;background:transparent;font-size:18px;line-height:1.6}.field input::placeholder,.field textarea::placeholder{color:#6f8196;opacity:1}.field input:focus,.field select:focus,.field textarea:focus{border:0;box-shadow:none}.field textarea{min-height:112px}
        .panelLead{font-size:18px!important}.section h3{font-size:22px}.check{font-size:16px}.gate span strong{font-size:16px}.gate span small{font-size:13px}
        .check{min-height:116px;align-items:center;padding:18px;border-radius:14px;background:linear-gradient(135deg,#edf8f4,#f6fbf9)}
        .actionBar{position:sticky;bottom:16px;z-index:12;align-items:center;margin:26px 0 0;padding:14px 16px;border:1px solid #ffffff25;border-radius:16px;background:#061a35f5;box-shadow:0 18px 42px #061a3540;backdrop-filter:blur(12px)}
        .actionBar:before{content:"Controlled decision";margin-right:auto;color:#9cb3cd;font-size:11px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
        .button{transition:transform .18s ease,box-shadow .18s ease}.button:hover{transform:translateY(-2px);box-shadow:0 9px 20px #0003}.button.approve{background:linear-gradient(135deg,#07945a,#057444)}
        .teamList,.planPreview,.coming{margin-left:34px;margin-right:34px}.teamList+.coming{margin-top:0}.teamCard{background:linear-gradient(145deg,#f8fbff,#f1f6fb)}
        .notificationPreview{margin-top:26px;overflow:hidden;border:1px solid #bfd2e6;border-radius:18px;background:#fff;box-shadow:0 16px 38px #061a3510}
        .notificationPreviewHead{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding:22px 24px;border-bottom:1px solid #dce6f0;background:linear-gradient(135deg,#eef5ff,#f8fbff)}
        .notificationPreviewHead h4{margin:7px 0 0;font-size:22px}.notificationPreviewBody{padding:24px}.notificationRouting{display:grid;grid-template-columns:1fr 1fr;gap:14px}.notificationRouting p,.notificationSubject{display:grid;grid-template-columns:76px minmax(0,1fr);gap:12px;margin:0;padding:14px 16px;border:1px solid #dce6f0;border-radius:12px;background:#f8fafc}.notificationSubject{margin-top:14px}.notificationRouting strong,.notificationSubject strong{color:#48617d;text-transform:uppercase;font-size:11px;letter-spacing:.08em}.notificationRouting span,.notificationSubject span{overflow-wrap:anywhere;color:#102944;font-weight:750}.notificationCopy{margin:16px 0 0;padding:22px;white-space:pre-wrap;overflow-wrap:anywhere;border:1px solid #dce6f0;border-radius:14px;background:#fbfcfe;color:#17324f;font:inherit;font-size:15px;line-height:1.7}.emailAction{display:inline-flex;align-items:center;justify-content:center;text-decoration:none}.sendNote{margin:14px 0 0;color:var(--muted);font-size:13px;line-height:1.55}
        .ownerDispatch{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:20px;align-items:center;margin:0 34px 22px;padding:20px 22px;border:1px solid #9ed8bd;border-radius:18px;background:linear-gradient(135deg,#effaf4,#f8fcfa);box-shadow:0 12px 30px #087a4b10}.ownerDispatchHead{display:flex;gap:13px;align-items:flex-start}.ownerDispatchIcon{display:grid;flex:0 0 42px;width:42px;height:42px;place-items:center;border-radius:13px;background:#07824d;color:#fff;font-size:20px}.ownerDispatch h3{margin:0 0 5px;font-size:18px}.ownerDispatch p{margin:0;color:#526b63;font-size:13px;line-height:1.5}.ownerLink{display:block;margin-top:12px;padding:11px 13px;overflow-wrap:anywhere;border:1px solid #c8dfd3;border-radius:10px;background:#fff;color:#174b37;font:700 12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace}.ownerDispatchActions{display:flex;gap:10px;align-items:center}.ownerDispatchActions .button{white-space:nowrap}
        .fieldworkMetrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:0 34px 24px}.fieldworkMetric{display:flex;min-height:118px;flex-direction:column;justify-content:center;padding:20px 22px;border:1px solid transparent;border-radius:17px;text-decoration:none;box-shadow:0 10px 25px #061a3510;transition:transform .16s,box-shadow .16s}.fieldworkMetric:hover{transform:translateY(-3px);box-shadow:0 16px 32px #061a3520}.fieldworkMetric b{font-size:32px;line-height:1}.fieldworkMetric span{margin-top:9px;font-size:14px;font-weight:900}.fieldworkMetric small{display:block;margin-top:8px;color:currentColor;font-size:11px;font-weight:750;opacity:.72}.fieldworkMetric.criteria{border-color:#afcaff;background:linear-gradient(145deg,#edf4ff,#dfeaff);color:#124db8}.fieldworkMetric.evidence{border-color:#94ddd7;background:linear-gradient(145deg,#edfbf9,#d7f5f1);color:#08776f}.fieldworkMetric.findings{border-color:#f2aaaa;background:linear-gradient(145deg,#fff1f1,#ffe0e0);color:#ad2828}.fieldworkMetric.activities{border-color:#f1ce82;background:linear-gradient(145deg,#fff9e9,#ffefc8);color:#8b5b00}#criteria-workbench,#evidence-register,#finding-register,#audit-agenda{scroll-margin-top:24px}
        .fieldworkLayout{display:grid;gap:22px;margin:0 34px 34px}.fieldworkModule{overflow:hidden;border:1px solid #d7e3ef;border-radius:20px;background:#fff;box-shadow:0 16px 38px #061a350b}.fieldworkHead{display:flex;justify-content:space-between;gap:24px;padding:24px 26px;border-bottom:1px solid #dce6f0;background:linear-gradient(135deg,#f7fbff,#edf5fd)}.fieldworkHead h3{margin:6px 0 5px;font-size:25px;letter-spacing:-.02em}.fieldworkHead p{max-width:920px;margin:0;color:var(--muted);font-size:15px;line-height:1.55}.questionList{display:grid;gap:12px;padding:22px}.questionCard{overflow:hidden;border:1px solid #dbe5ef;border-radius:15px;background:#fff}.questionCard.answered{border-left:5px solid #07824d}.questionCard summary{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:14px;align-items:center;padding:17px 19px;cursor:pointer;list-style:none;background:#f8fafc}.questionCard summary::-webkit-details-marker{display:none}.questionNumber{display:grid;width:38px;height:38px;place-items:center;border-radius:50%;background:#e9f1ff;color:var(--blue);font-size:12px;font-weight:950}.questionSummary strong,.questionSummary small{display:block}.questionSummary strong{font-size:16px}.questionSummary small{margin-top:4px;color:var(--muted)}.questionState{padding:7px 10px;border-radius:999px;background:#edf2f7;color:#52677e;font-size:11px;font-weight:900;text-transform:capitalize}.questionBody{padding:22px}.questionPrompt{padding:20px;border-radius:15px;background:#071d39;color:#fff}.questionPrompt h4{margin:0 0 13px;color:#fff;font-size:21px;line-height:1.4}.questionPrompt p{display:grid;grid-template-columns:130px minmax(0,1fr);gap:14px;margin:10px 0;color:#d9e6f4;font-size:14px;line-height:1.55}.questionPrompt b{color:#54e2dc}.probeGrid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:16px 0}.probeGrid>div{padding:18px;border:1px solid #dce6f0;border-radius:14px;background:#f7faff}.probeGrid b{font-size:15px}.probeGrid ul{margin:10px 0 0;padding-left:20px}.probeGrid li,.probeGrid p{margin:6px 0;color:#536b84;font-size:14px;line-height:1.5}.answerForm{padding:0!important}.answerForm .grid3{padding:0!important;border:0!important;background:transparent!important}.span2{grid-column:span 2}.compactAction{display:flex;justify-content:flex-end;margin-top:16px}.compactAction .button{min-height:48px}.evidenceList,.findingList{display:grid;gap:10px;padding:22px 22px 0}.evidenceCard,.findingCard{display:flex;justify-content:space-between;gap:20px;padding:17px 19px;border:1px solid #dce6f0;border-radius:14px;background:#f8fafc}.evidenceCard h4,.findingCard h4{margin:4px 0 5px;font-size:17px}.evidenceCard p,.findingCard p{margin:0;color:var(--muted);line-height:1.5}.evidenceCard>span,.findingCard>span{align-self:flex-start;padding:7px 10px;border-radius:999px;background:#e9f1ff;color:#1753bf;font-size:11px;font-weight:900;text-transform:capitalize;white-space:nowrap}.findingCard.major_nc{border-left:5px solid #c81e1e}.findingCard.minor_nc{border-left:5px solid #e87917}.findingCard.positive_practice{border-left:5px solid #07824d}.fieldworkModule>form{padding:22px 22px 26px!important}.fieldworkModule>form>.grid3{padding:20px!important;border:1px solid #dce6f0!important;border-radius:17px!important;background:linear-gradient(145deg,#f8fbff,#f3f7fb)!important}.fieldworkGate{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(360px,.85fr);gap:28px;align-items:center;padding:26px;border:1px solid #9ed8bd;border-radius:20px;background:linear-gradient(135deg,#effaf4,#f9fcfb);box-shadow:0 15px 35px #087a4b0d}.fieldworkGate h3{margin:7px 0 7px;font-size:25px}.fieldworkGate p{margin:0;color:#526b63;line-height:1.55}.fieldworkGate form{padding:0!important}.fieldworkGate .check{min-height:auto}.fieldworkGate .compactAction{margin-top:12px}
        @media(max-width:1050px){.auditHeader{grid-template-columns:1fr}.sideRail{grid-template-columns:repeat(2,1fr)}.sideRail>.railMetric{min-height:82px}.railBlock{border-top:1px solid #e2e9f1}.gateNav{grid-template-columns:repeat(7,200px);overflow-x:auto}.teamCard{grid-template-columns:1fr 1fr}.grid3,.readinessGrid{grid-template-columns:repeat(2,1fr)}.record{grid-template-columns:1fr auto}.fieldworkMetrics{grid-template-columns:repeat(2,1fr)}.fieldworkGate{grid-template-columns:1fr}.ownerDispatch{grid-template-columns:1fr}.ownerDispatchActions{justify-content:flex-start}.span2{grid-column:auto}}
        @media(max-width:700px){.workspacePage{padding:14px 10px 60px}.workspaceLogo{width:185px;height:auto}.auditHeader{padding:25px 21px}.auditHeader h1{font-size:34px}.sideRail{grid-template-columns:1fr 1fr}.sideRail>.railMetric,.railBlock{padding:16px}.mainPanel>div.panelKicker,.mainPanel>h2,.mainPanel>p.panelLead,.teamList,.planPreview,.coming{margin-left:18px;margin-right:18px}.mainPanel>div.panelKicker{padding-top:24px}.mainPanel form{padding:0 18px 24px}.mainPanel form>.grid2,.section{padding:14px}.auditStandard,.grid2,.grid3,.planPreview,.teamCard,.readinessGrid,.notificationRouting,.probeGrid{grid-template-columns:1fr}.planStack,.planGate,.fieldworkMetrics,.fieldworkLayout{margin-left:18px;margin-right:18px}.fieldworkMetrics{grid-template-columns:1fr 1fr}.record{grid-template-columns:1fr}.actionBar{position:static;align-items:stretch;flex-direction:column}.actionBar:before{margin:0 0 4px}.button{width:100%}.notificationPreviewHead,.notificationPreviewBody,.fieldworkHead,.questionBody{padding:18px}.notificationRouting p,.notificationSubject{grid-template-columns:1fr}.questionCard summary{grid-template-columns:38px 1fr}.questionState{grid-column:2}.questionPrompt p{grid-template-columns:1fr}.evidenceCard,.findingCard{flex-direction:column}.fieldworkModule>form{padding:18px!important}}
      `}</style>

      <div className="workspaceShell">
        <div className="workspaceTop">
          <Link href="/portal"><Image className="workspaceLogo" src="/rpg-excellence-logo.png" alt="RPG Excellence" width={240} height={65} priority /></Link>
          <Link href="/portal/internal-audits" className="workspaceBack">← Audit Command Centre</Link>
        </div>

        <header className="auditHeader">
          <div><div className="auditEyebrow">{audit.audit_reference} · Controlled audit workspace</div><h1>{audit.title}</h1><div className="auditMeta">{organization?.name ?? "Organisation"} · {displayDate(audit.planned_start_at)} – {displayDate(audit.planned_end_at)} · {audit.audit_method}</div></div>
          <div className="auditStandard"><strong>Audit criteria</strong><br />{standards.join(" · ") || "Criteria awaiting confirmation"}</div>
        </header>

        {query?.created ? <div className="notice">✓ Audit created successfully. Complete and approve the controlled scope to unlock Team Assignment.</div> : null}
        {query?.saved ? <div className="notice">✓ Changes saved to the controlled audit record.</div> : null}
        {query?.plan_error === "agenda" ? <div className="notice error">Plan approval is not yet available. Add at least two agenda activities—for example, an opening meeting and a process audit—then approve the plan again.</div> : null}
        {query?.plan_error === "notification" ? <div className="notice error">Plan approval is not yet available. Save the controlled auditee notification, then approve the plan again.</div> : null}
        {query?.plan_error === "questions" ? <div className="notice error">Plan approval is not yet available. The selected audit standard has no active audit questions. Add or activate its question bank before approving the plan.</div> : null}
        {query?.team_warning === "lead_required" ? <div className="notice error" role="alert"><strong>Lead auditor required.</strong> Add a team member with the role “Lead auditor” before approving the audit team.</div> : null}
        {query?.team_warning === "governance_required" ? <div className="notice error" role="alert"><strong>Team confirmations required.</strong> Confirm competence, independence and confidentiality for every team member before approval.</div> : null}
        {query?.team_warning === "standards_coverage" ? <div className="notice error" role="alert"><strong>Team standards coverage is incomplete.</strong> The combined verified team must cover every standard selected for this audit. Assign another suitably authorised auditor or extend the controlled competence scope.</div> : null}
        {query?.answer_error === "na_justification" ? <div className="notice error" role="alert"><strong>Justification required.</strong> You selected “Not applicable”. Explain why this audit criterion does not apply, then save the assessment again.</div> : null}
        {query?.fieldwork_error === "assessment_and_evidence" ? <div className="notice error" role="alert"><strong>Fieldwork cannot be completed yet.</strong> First <Link href="#criteria-workbench">assess at least one audit criterion</Link> and <Link href="#evidence-register">add at least one objective-evidence record</Link>, then confirm completion again.</div> : null}
        {query?.fieldwork_error === "assessment" ? <div className="notice error" role="alert"><strong>Assessment required.</strong> <Link href="#criteria-workbench">Assess at least one audit criterion</Link> before completing Fieldwork.</div> : null}
        {query?.fieldwork_error === "evidence" ? <div className="notice error" role="alert"><strong>Objective evidence required.</strong> <Link href="#evidence-register">Add at least one evidence record</Link> before completing Fieldwork.</div> : null}

        {query?.fieldwork_error==="scope_coverage" ? <div className="notice error" role="alert">The selected scope or criterion inventory needs review. Resolve the coverage warnings in Fieldwork before opening Report.</div> : null}
        {query?.fieldwork_error==="outstanding_questions" ? <div className="notice error" role="alert">Some in-scope questions still lack a supported conclusion, controlled finding or justified N/A. Review the outstanding-question view.</div> : null}
        <nav className="gateNav" aria-label="Audit lifecycle">
          {GATES.map(([key, number, label], index) => {
            const unlocked = index === 0 || (index === 1 && scopeComplete) || (index === 2 && teamComplete) || (index === 3 && planComplete) || (index === 4 && fieldworkComplete) || (index === 5 && reportComplete) || (index === 6 && reportComplete);
            const complete = key === "scope" ? scopeComplete : key === "team" ? teamComplete : key === "plan" ? planComplete : key === "fieldwork" ? fieldworkComplete : key === "report" ? reportComplete : key === "actions" ? unresolvedNonconformities.length === 0 : audit.status === "closed";
            return <Link key={key} href={`/portal/internal-audits/${id}?gate=${key}`} className={`gate ${gate === key ? "active" : ""} ${!unlocked ? "locked" : ""}`} aria-disabled={!unlocked}><b>{number}</b><span><strong>{label}</strong><small>{complete ? "✓ Approved" : unlocked ? "Open" : "🔒 Locked"}</small></span></Link>;
          })}
        </nav>

        <div className="workspaceGrid">
          <aside className="sideRail"><div className="railLabel">Current gate</div><div className="railMetric">{gate.toUpperCase()}</div><div className="railBlock"><strong>ISO 19011 control</strong><span>Evidence-based decisions, independence, due professional care, confidentiality and risk-based planning.</span></div><div className="railBlock"><strong>Audit status</strong><span>{audit.status.replaceAll("_", " ")}</span></div><div className="railBlock"><strong>Team assigned</strong><span>{team.length} member{team.length === 1 ? "" : "s"}</span></div></aside>

          <section className="mainPanel">
            {gate === "scope" ? <>
              <div className="panelKicker">Gate 01 · Controlled scope review</div><h2>Confirm the audit mandate</h2><p className="panelLead">Establish objectives, boundaries, criteria, feasibility and relevant risk before deploying audit resources.</p>
              <form action={saveAuditScope}>
                <input type="hidden" name="audit_id" value={id} />
                <div className="grid2">
                  <label className="field"><span>Audit purpose *</span><textarea name="purpose" required defaultValue={audit.purpose ?? ""} /></label>
                  <label className="field"><span>Audit objectives *</span><textarea name="objectives" required defaultValue={audit.objectives ?? ""} placeholder="What must this audit determine, verify or evaluate?" /></label>
                  <label className="field"><span>Scope statement *</span><textarea name="scope_statement" required defaultValue={audit.scope_statement ?? ""} /></label>
                  <label className="field"><span>Scope boundaries</span><textarea name="scope_boundaries" defaultValue={audit.scope_boundaries ?? ""} placeholder="Physical, organisational, functional and time boundaries" /></label>
                </div>
                <div className="section"><h3>Criteria and coverage</h3><div className="grid3"><label className="field"><span>Criteria summary *</span><textarea name="criteria_summary" required defaultValue={audit.criteria_summary ?? standards.join("; ")} /></label><label className="field"><span>Site / location *</span><select name="administration_location_id" required defaultValue={administrationLocations.some((item) => item.id === audit.administration_location_id) ? audit.administration_location_id : ""}><option value="" disabled>Select a current Site Profile location</option>{administrationLocations.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select><input type="hidden" name="administration_location_label" value={audit.administration_location_label ?? audit.sites ?? ""} /><small>Linked to Administration → Site Profile.</small>{!administrationLocations.length ? <small>No active sites are available. Add or activate a site in Administration → Site Profile before saving.</small> : null}{(audit.administration_location_label || audit.sites) && !administrationLocations.some((item) => item.id === audit.administration_location_id) ? <small>Previously recorded: {audit.administration_location_label || audit.sites}. Select the current Site Profile record before saving this scope.</small> : null}</label><label className="field"><span>Functions and departments</span><textarea name="departments" defaultValue={audit.departments ?? ""} /></label><label className="field"><span>Processes</span><textarea name="processes" defaultValue={audit.processes ?? ""} /></label><label className="field"><span>Products and services</span><textarea name="products_services" defaultValue={audit.products_services ?? "Not separately specified; confirm against the approved audit scope."} /></label><label className="field"><span>Legal, customer and contractual criteria</span><textarea name="legal_customer_contractual_criteria" defaultValue={audit.legal_customer_contractual_criteria ?? "Applicable statutory, regulatory, customer, contractual and management-system requirements within the approved scope."} /></label></div></div>
                <div className="section"><h3>Risk, exclusions and feasibility</h3><div className="grid2"><label className="field"><span>Known risks, changes and prior signals</span><textarea name="known_risks_changes" defaultValue={audit.known_risks_changes ?? "No specific prior signal recorded; confirm through risk-based planning and opening discussions."} /></label><label className="field"><span>Previous audit summary</span><textarea name="previous_audit_summary" defaultValue={audit.previous_audit_summary ?? "No previous audit summary linked. Review available prior findings, CAPA status and performance trends during planning."} /></label><label className="field"><span>Exclusions</span><textarea name="exclusions" defaultValue={audit.exclusions ?? "No exclusions identified at scope review."} /></label><label className="field"><span>Exclusion justification</span><textarea name="exclusion_justification" defaultValue={audit.exclusion_justification ?? "Not applicable where no exclusions are recorded. Any later exclusion requires documented justification and approval."} /></label><label className="field"><span>Confidentiality requirements</span><textarea name="confidentiality_requirements" defaultValue={audit.confidentiality_requirements ?? "Internal—need-to-know access. Protect personal, commercially sensitive and supplier information; use secure controlled links for evidence."} /></label><label className="check"><input type="checkbox" name="feasibility_confirmed" defaultChecked={audit.feasibility_confirmed} /><span><strong>Feasibility confirmed</strong><br />Adequate time, information, access and resources are available.</span></label></div></div>
                {approvalIdentity}<div className="actionBar"><button className="button secondary" name="intent" value="save">Save Scope</button><button className="button approve" name="intent" value="approve">Approve as {loggedActorName} & Unlock Team →</button></div>
              </form>
            </> : null}

            {gate === "team" ? <>
              <div className="panelKicker">Gate 02 · Team assignment</div><h2>Build a competent and independent audit team</h2><p className="panelLead">Only active auditors with current verification and authorisation for every selected standard are available. Independence and confidentiality remain audit-specific decisions.</p>
              <div className="teamList">{team.length === 0 ? <div className="coming">No audit team members have been assigned. Add the lead auditor first.</div> : team.map((member) => <div className="teamCard" key={member.id}><div><strong>{member.member_name}</strong><small>{member.email} · {ROLE_LABELS[member.audit_role] ?? member.audit_role}</small></div><div>{member.competence_confirmed ? <span className="confirmation">✓ Competence confirmed</span> : <span className="warning">Competence not confirmed</span>}</div><div>{member.independence_confirmed && member.confidentiality_confirmed ? <span className="confirmation">✓ Governance confirmed</span> : <span className="warning">Governance incomplete</span>}</div></div>)}</div>
              {eligibleAuditors.length ? <AuditTeamAssignmentForm auditId={id} auditors={eligibleAuditors} standards={(audit.internal_audit_selected_standards ?? []).map((row) => ({ standard_id: row.standard_id, display_name: row.internal_audit_standard_catalogue?.display_name, standard_code: row.internal_audit_standard_catalogue?.standard_code }))}/> : <div className="notice error"><strong>No current verified auditor is available.</strong> Complete or renew verification in <Link href="/portal/internal-auditor-verification">Internal Auditor Verification</Link>.</div>}
              {!hasLeadAuditor ? <div className="notice error" role="status"><strong>Lead auditor required.</strong> Select “Lead auditor” as the audit role when adding the accountable team member. Team approval remains unavailable until this role is assigned.</div> : null}
              <form action={approveAuditTeam}><input type="hidden" name="audit_id" value={id} />{approvalIdentity}<div className="actionBar"><button className="button approve" disabled={!hasLeadAuditor} title={!hasLeadAuditor ? "Add a Lead auditor before approving the team" : undefined}>Approve as {loggedActorName} & Unlock Audit Plan →</button></div></form>
            </> : null}

            {gate === "plan" ? <>
              <div className="panelKicker">Gate 03 · Risk-based audit planning</div><h2>Design the audit plan</h2><p className="panelLead">The approved scope and team are now controlled. Build the agenda, notification and auditee coordination before fieldwork.</p>
              <div className="planPreview"><div className="previewCard"><b>Approved scope</b><span>Carry approved processes, locations, criteria and risk priorities directly into the agenda.</span></div><div className="previewCard"><b>Audit agenda</b><span>Allocate processes, interviews, site activity and document review to competent team members.</span></div><div className="previewCard"><b>Notification</b><span>Issue a controlled audit notification covering scope, criteria, timing, team and requested information.</span></div></div>
              <div className="planStack">
                <section className="planModule" id="audit-agenda"><div className="moduleHead"><div><h3>01 · Audit agenda and resource deployment</h3><p>Sequence meetings, process audits, interviews, site work and team reviews.</p></div><span className="countBadge">{schedule.length} activit{schedule.length === 1 ? "y" : "ies"}</span></div><div className="moduleBody">
                  <div className="coming"><strong>Inherited from the approved gates</strong><br />Processes: {inheritedProcesses.join(" · ") || "Approved scope statement"}<br />Sites: {inheritedSites.join(" · ") || "No site specified"}<br />Approved audit window (UTC): {displayDate(audit.planned_start_at)} – {displayDate(audit.planned_end_at)} · Team: {team.map((member) => member.member_name).join(", ") || "No members assigned"}</div>
                  {schedule.length ? <div className="recordList">{schedule.map((item) => <div className="record" key={item.id}><div><strong>{displayDate(item.starts_at)}</strong><small>to {displayDate(item.ends_at)}</small></div><div><strong>{item.title}</strong><small>{ACTIVITY_LABELS[item.activity_type] ?? item.activity_type} · {item.process_or_scope || "General audit scope"}{item.location_or_link ? ` · ${item.location_or_link}` : ""}</small></div><span className="recordTag">{item.expected_attendees || "Audit team"}</span></div>)}</div> : <div className="emptyState">No agenda activities recorded yet. Include opening and closing meetings plus sufficient fieldwork coverage.</div>}
                  <form action={addAuditScheduleItem}><input type="hidden" name="audit_id" value={id} /><datalist id="approved-processes">{inheritedProcesses.map((process) => <option value={process} key={process} />)}</datalist><datalist id="approved-sites">{inheritedSites.map((site) => <option value={site} key={site} />)}</datalist><div className="grid3"><label className="field"><span>Activity type *</span><select name="activity_type" required defaultValue="process_audit">{Object.entries(ACTIVITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field"><span>Activity title *</span><input name="title" required defaultValue={defaultProcess ? `${defaultProcess} audit` : ""} /></label><label className="field"><span>Process / scope *</span><input name="process_or_scope" list="approved-processes" required defaultValue={defaultProcess} /><small>Select an approved process or refine the activity scope.</small></label><label className="field"><span>Starts (UTC) *</span><input name="starts_at" type="datetime-local" step="0.001" min={localDateTime(audit.planned_start_at)} max={localDateTime(audit.planned_end_at)} required defaultValue={localDateTime(audit.planned_start_at)} /><small>Choose a time within the approved audit window. Times are shown in UTC.</small></label><label className="field"><span>Ends (UTC) *</span><input name="ends_at" type="datetime-local" step="0.001" min={localDateTime(audit.planned_start_at)} max={localDateTime(audit.planned_end_at)} required defaultValue={localDateTime(audit.planned_end_at)} /><small>The end must be after the start and within the approved audit window.</small></label><label className="field"><span>Lead auditor</span><select name="lead_team_member_id" defaultValue={defaultLead?.id ?? ""}><option value="">Unassigned</option>{team.map((member) => <option value={member.id} key={member.id}>{member.member_name}</option>)}</select></label><label className="field"><span>Location or meeting link</span><input name="location_or_link" list="approved-sites" defaultValue={defaultSite} /></label><label className="field"><span>Expected attendees</span><input name="expected_attendees" defaultValue={audit.auditee_contact_name ?? ""} /></label><label className="field"><span>Notes / evidence focus</span><textarea name="notes" defaultValue={audit.known_risks_changes ?? ""} /></label></div><div className="actionBar"><button className="button primary">Add Agenda Activity</button></div></form>
                </div></section>

                <section className="planModule">
                  <div className="moduleHead">
                    <div>
                      <h3>02 · Planned criteria and audit questions</h3>
                      <p>Confirm the questions that will guide fieldwork and ensure every selected criterion can be tested.</p>
                    </div>
                    <span className="countBadge">{questions.length} question{questions.length === 1 ? "" : "s"}</span>
                  </div>
                  <div className="moduleBody">
                    {questions.length ? (
                      <div className="recordList">
                        {questions.map((question, index) => (
                          <div className="record" key={question.id}>
                            <div><strong>{String(index + 1).padStart(2, "0")}</strong><small>{question.question_code || question.clause || "Audit criterion"}</small></div>
                            <div><strong>{question.question_text || question.question || "Planned audit question"}</strong><small>{question.process_area || "Approved audit scope"}{question.clause ? ` · Clause ${question.clause}` : ""}</small></div>
                            <span className="recordTag">Ready for fieldwork</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="emptyState"><strong>No audit questions are available for the selected standard.</strong><br />The plan cannot be approved until an active question bank is registered. This prevents Fieldwork opening with 0 criteria.</div>
                    )}
                  </div>
                </section>

                <section className="planModule" id="notification-draft">
                  <div className="moduleHead">
                    <div>
                      <h3>03 · Controlled audit notification</h3>
                      <p>Prepare, review and issue the audit notice to the auditee and assigned audit team.</p>
                    </div>
                    <span className="countBadge">{notification ? "Draft ready" : "Not prepared"}</span>
                  </div>
                  <div className="moduleBody">
                    {query?.saved === "notification" ? (
                      <div className="notice success">✓ Notification draft saved and refreshed below.</div>
                    ) : null}

                    <form action={saveAuditNotification}>
                      <input type="hidden" name="audit_id" value={id} />
                      <div className="grid2">
                        <label className="field">
                          <span>Auditee recipients *</span>
                          <input
                            name="recipients"
                            type="text"
                            required
                            defaultValue={notificationRecipients.join(", ")}
                            placeholder="Comma-separated email addresses"
                          />
                        </label>
                        <label className="field">
                          <span>Audit team / CC recipients</span>
                          <input
                            name="cc_recipients"
                            type="text"
                            defaultValue={notificationCcRecipients.join(", ")}
                            placeholder="Assigned team emails are included automatically"
                          />
                        </label>
                        <label className="field">
                          <span>Subject *</span>
                          <input name="subject" required defaultValue={notificationSubject} />
                        </label>
                        <label className="field">
                          <span>Requested information *</span>
                          <textarea name="requested_information" required defaultValue={notificationRequest} />
                        </label>
                      </div>
                      <div className="actionBar">
                        <button className="button secondary">Save & Refresh Notification Draft</button>
                      </div>
                    </form>

                    {notification ? (
                      <article className="notificationPreview">
                        <div className="notificationPreviewHead">
                          <div>
                            <span className="panelKicker">Controlled email preview</span>
                            <h4>Audit notification ready for human review</h4>
                          </div>
                          <span className="countBadge">Draft</span>
                        </div>
                        <div className="notificationPreviewBody">
                          <div className="notificationRouting">
                            <p><strong>To</strong><span>{notificationRecipients.join(", ") || "No auditee recipient recorded"}</span></p>
                            <p><strong>CC</strong><span>{notificationCcRecipients.join(", ") || "No audit-team recipient recorded"}</span></p>
                          </div>
                          <p className="notificationSubject"><strong>Subject</strong><span>{notificationSubject}</span></p>
                          <pre className="notificationCopy">{notificationEmailBody}</pre>
                          <div className="actionBar">
                            <a className="button primary emailAction" href={notificationMailtoHref}>
                              Review & Send in Outlook / Email App →
                            </a>
                          </div>
                          <p className="sendNote">
                            Human-controlled issue: the button opens the complete draft in the configured email application. Review recipients and content before sending. Delivery is not marked automatically.
                          </p>
                        </div>
                      </article>
                    ) : (
                      <div className="emptyState">Save the notification once to generate the controlled email preview and send action.</div>
                    )}
                  </div>
                </section>
              </div>
              <section className="planGate"><h3>Formal plan readiness decision</h3><p>Approval confirms that the planned audit is feasible, risk-based, adequately resourced and communicated. Approval locks Gate 03 and unlocks Fieldwork.</p><div className="readinessGrid"><div className={`readinessItem ${schedule.length >= 2 ? "ready" : "missing"}`}>{schedule.length >= 2 ? "✓" : "!"} Agenda coverage</div><div className={`readinessItem ${questions.length > 0 ? "ready" : "missing"}`}>{questions.length > 0 ? "✓" : "!"} Audit questions ({questions.length})</div><div className={`readinessItem ${notification ? "ready" : "missing"}`}>{notification ? "✓" : "!"} Notification draft</div></div><form action={approveAuditPlan}><input type="hidden" name="audit_id" value={id} />{approvalIdentity}<label className="check"><input type="checkbox" name="plan_confirmation" required /><span><strong>Plan approval</strong><br />I confirm that timing, competence, resources, planned questions, notification and information requirements are sufficient for controlled fieldwork.</span></label><div className="actionBar"><button className="button approve">Approve as {loggedActorName} & Unlock Fieldwork →</button></div></form></section>
            </> : null}

            {gate === "fieldwork" ? <>
              <div className="panelKicker">Gate 04 · Evidence-led fieldwork</div><h2>Assess the approved audit criteria</h2>
              <p className="panelLead">Work through the selected scope, record objective evidence and reach a supported conclusion. Raise findings directly in Findings &amp; Actions; their status remains visible against the originating question.</p>
              <OfflineAuditDraft auditId={id} userId={user.id} scopeId="audit-fieldwork-offline-scope" />
              <div className="fieldworkMetrics">
                <a className="fieldworkMetric criteria" href="#criteria-workbench"><b>{coverage.accountedFor}/{coverage.required}</b><span>Questions accounted for</span><small>{coverage.justifiedNotApplicable} justified N/A · one count per question</small></a>
                <a className="fieldworkMetric activities" href="#criteria-workbench"><b>{coverage.outstanding}</b><span>Questions outstanding</span><small>{coverage.unableToVerify} unable to verify</small></a>
                <a className="fieldworkMetric evidence" href="#evidence-register"><b>{evidence.length}</b><span>Evidence register</span><small>Saved question notes also support conclusions</small></a>
                <a className="fieldworkMetric findings" href="#finding-register"><b>{findings.length}</b><span>Controlled findings</span><small>Major · Minor · Observation · OFI</small></a>
              </div>
              <div className="fieldworkLayout" id="audit-fieldwork-offline-scope">
                <section className="fieldworkModule afwScope" aria-label="Approved audit coverage">
                  <div className="fieldworkHead"><div><span className="panelKicker">Scope &amp; coverage</span><h3>{coverage.percentage === null ? "Coverage unavailable" : `${coverage.percentage}% of questions accounted for`}</h3><p>Coverage is calculated against the complete selected scope, including questions outside the current view. A justified N/A requires lead-auditor review.</p></div></div>
                  <div className="afwScopeBody">
                    <progress max="100" value={coverage.percentage || 0} aria-label="Questions accounted for"/>
                    {dataScopeIssues.length ? <div className="notice error" role="alert"><strong>Scope coverage needs review before Report can open.</strong><ul>{dataScopeIssues.map((issue,index)=><li key={`${issue.code}-${index}`}>{standardLabels.get(issue.standardId) ? <strong>{standardLabels.get(issue.standardId)}: </strong> : null}{issue.message}{issue.details?.length ? <details><summary>Review affected references</summary><ul>{issue.details.map((item,itemIndex)=><li key={itemIndex}>{typeof item === "string" ? item : [item.code,item.clause].filter(Boolean).join(" · ") || item.id || "Mapping requires review"}</li>)}</ul></details> : null}</li>)}</ul></div> : <p className="afwHint">The loaded mappings resolve to the selected scope. The lead auditor must still review the criterion inventory for the correct edition before completing Fieldwork.</p>}
                    <details className="afwCoverageDetails"><summary>Selected standards, clauses and coverage</summary><div className="afwStandardCoverage">{fieldworkState.scope.standards.map(standard=><section key={standard.standardId}><h4>{standard.standardLabel}</h4><p>{standard.full ? "Full selected standard" : "Approved partial scope"} · {standard.scopedQuestions} questions · {standard.referenceClauses} reference clauses</p>{standard.included.length ? <p>Included: {standard.included.join(", ")}</p> : null}{standard.excluded.length ? <p>Excluded: {standard.excluded.join(", ")}</p> : null}<div className="afwClauseLinks">{coverage.clauses.filter(clause=>clause.standardId===standard.standardId).map(clause=><Link key={clause.key} href={`/portal/internal-audits/${id}?gate=fieldwork&standard=${encodeURIComponent(standard.standardId)}&question=${encodeURIComponent(clause.questionIds[0])}#question-${clause.questionIds[0]}`}>Clause {clause.clause}<span>{clause.accountedFor}/{clause.required}</span></Link>)}</div></section>)}</div></details>
                  </div>
                </section>
                <section className="fieldworkModule criteriaWorkbench" id="criteria-workbench">
                  <div className="fieldworkHead"><div><span className="panelKicker">01 · Audit questions</span><h3>Requirement, evidence and conclusion</h3><p>Use the guidance to test implementation and effectiveness. Every approved question remains in the coverage total.</p></div><span className="countBadge">{coverage.required} scope questions</span></div>
                  <form action={`/portal/internal-audits/${id}`} method="get" className="afwFilter" data-device-draft-exclude><input type="hidden" name="gate" value="fieldwork"/><label>Standard<select name="standard" defaultValue={standardFilter}><option value="">All selected standards</option>{fieldworkState.scope.standards.map(standard=><option value={standard.standardId} key={standard.standardId}>{standard.standardLabel}</option>)}</select></label><label>Question view<select name="criteria" defaultValue={outstandingOnly ? "outstanding" : "all"}><option value="all">All scope questions</option><option value="outstanding">Outstanding only</option></select></label><button className="button secondary" type="submit">Apply view</button><Link className="button secondary" href={`/portal/internal-audits/${id}?gate=fieldwork`}>Show all</Link><small>Showing {visibleQuestions.length} of {coverage.required} questions.</small></form>
                  <div className="afwQuestions">{visibleQuestions.map((question,index)=>{
                    const row=coverageByQuestion.get(question.id),answer=row?.answer||answersByQuestion.get(question.id);
                    return <article className={`afwQuestion ${row?.complete ? "complete" : ""}`} id={`question-${question.id}`} key={question.id}>
                      <div className="afwQuestionHeading"><h3>Clause {question.clause || "Reference pending"}</h3><span className="afwControl">{question.question_code || "Audit criterion"}</span><span className={`afwStatus ${row?.complete ? "complete" : ""}`}>{row?.complete ? row.justifiedNotApplicable ? "Justified N/A" : "Accounted for" : "Outstanding"}</span></div>
                      <div className="afwCriteria">{[...new Set((question.criteria_links||[]).map(link=>`${link.standard_label||standardLabels.get(link.standard_id)||"Selected standard"} · ${link.clause}`))].map(label=><span key={label}>{label}</span>)}</div>
                      <h4 className="afwPrompt">{question.question_text}</h4>
                      <details className="afwGuidance" open={index===0 || query?.question===question.id}><summary>Audit guidance, evidence and conformity criteria</summary><div className="afwGuidanceBody"><AuditQuestionGuidance question={question}/></div></details>
                      <form action={saveAuditAnswer} className="afwAnswer">
                        <label className="field"><span>Objective evidence / auditor notes</span><textarea name="conclusion" rows={4} maxLength={16000} defaultValue={answer?.conclusion||""} disabled={fieldworkLocked || Boolean(row?.linkedFindings.length)} placeholder="Record sampled documents, records, interviews, observations, data, references and identified gaps."/></label>
                        {!!row?.linkedFindings.length && <p className="afwHint">The originating note is retained here. Amend finding evidence and follow-up through its controlled record below.</p>}
                        <details className="afwExtra"><summary>Auditor working notes and assessment details</summary><fieldset disabled={fieldworkLocked || Boolean(row?.linkedFindings.length)}><div className="grid3"><label className="field"><span>Assigned auditor</span><select name="assigned_team_member_id" defaultValue={answer?.assigned_team_member_id||""}><option value="">Unassigned</option>{team.map(member=><option key={member.id} value={member.id}>{member.member_name}</option>)}</select></label><label className="field"><span>Evidence confidence</span><select name="confidence_level" defaultValue={answer?.confidence_level||"medium"}>{["low","medium","high"].map(value=><option key={value} value={value}>{value}</option>)}</select></label><label className="field"><span>Risk significance</span><select name="risk_level" defaultValue={answer?.risk_level||"medium"}>{["low","medium","high","critical"].map(value=><option key={value} value={value}>{value}</option>)}</select></label><label className="field span2"><span>Additional working notes</span><textarea name="auditor_notes" defaultValue={answer?.auditor_notes||""} maxLength={16000}/></label></div></fieldset></details>
                        <FindingConclusionFields mode="audit" auditId={id} questionId={question.id} savedAnswer={answer} linkedFindings={row?.linkedFindings||[]} locked={fieldworkLocked} saveAction={saveAuditAnswer} openFindingAction={openAuditFinding}/>
                      </form>
                      {!!row?.evidence.length && <details className="afwExtra"><summary>Linked evidence records ({row.evidence.length})</summary><ul>{row.evidence.map(item=><li key={item.id}><a href="#evidence-register">{item.evidence_reference||item.title||"Evidence record"}</a></li>)}</ul></details>}
                    </article>;
                  })}</div>
                  {!visibleQuestions.length && <div className="emptyState">{coverage.required ? "No questions match this view. Show all to review the complete approved scope." : "No active questions resolve to the approved scope. Review the coverage issues above before continuing."}</div>}
                </section>
                <section className="fieldworkModule" id="evidence-register"><div className="fieldworkHead"><div><span className="panelKicker">02 · Objective evidence</span><h3>Evidence register</h3><p>Preserve provenance, relevance, reliability and confidentiality for every material item reviewed.</p></div><span className="countBadge">{evidence.length} records</span></div>
                  {evidence.length ? <div className="evidenceList">{evidence.map((item) => <article className="evidenceCard" key={item.id}><div><b>{item.evidence_reference}</b><h4>{item.title}</h4><p>{item.description || "No description recorded."}</p>{item.external_url ? <p><a href={item.external_url} target="_blank" rel="noopener noreferrer">Open controlled external link ↗</a></p> : null}{item.attachment_path ? <p><a href={evidenceAttachmentUrls.get(item.attachment_path) ?? "#"} target="_blank" rel="noopener noreferrer">Download {item.attachment_name || "evidence file"} ↓</a></p> : null}</div><span>{item.evidence_type?.replaceAll("_", " ")} · {item.reliability || "unrated"}</span></article>)}</div> : <div className="emptyState">No objective evidence recorded yet.</div>}
                  <form action={addAuditEvidence}><fieldset disabled={fieldworkLocked} style={{border:0,padding:0,minWidth:0}}><input type="hidden" name="audit_id" value={id} /><div className="grid3"><label className="field"><span>Linked criterion</span><select name="answer_id"><option value="">General audit evidence</option>{answers.map((answer) => { const q = questions.find((item) => item.id === answer.question_id); return <option key={answer.id} value={answer.id}>{q?.question_code || q?.clause || "Assessed criterion"}</option>; })}</select></label><label className="field"><span>Evidence type *</span><select name="evidence_type" defaultValue="document"><option value="document">Document</option><option value="record">Record</option><option value="interview">Interview</option><option value="observation">Observation</option><option value="photograph">Photograph</option><option value="screenshot">Screenshot</option><option value="system_record">System record</option><option value="measurement">Measurement</option><option value="test_result">Test result</option><option value="external_confirmation">External confirmation</option><option value="other">Other</option></select></label><label className="field"><span>Evidence title *</span><input name="title" required /></label><label className="field span2"><span>Description and relevance</span><textarea name="description" /></label><label className="field"><span>Source type *</span><select name="source_type" required defaultValue="document"><option value="interview">Interview</option><option value="recording">Recording</option><option value="document">Document</option><option value="controlled_record">Controlled record</option><option value="system">System</option><option value="observation">Observation</option><option value="external_confirmation">External confirmation</option><option value="other">Other</option></select></label>{audit.audit_type === "supplier" ? <label className="field"><span>Source / interviewee — supplier contact</span><select name="source_supplier_contact_id"><option value="">Select linked supplier contact</option>{supplierContacts.map((person) => <option value={person.id} key={person.id}>{[person.first_name,person.last_name].filter(Boolean).join(" ")} · {person.email}</option>)}</select></label> : <label className="field"><span>Source / interviewee — Company User</span><select name="source_person_id"><option value="">Select Company User or record manually</option>{companyPeople.map((person) => <option value={person.id} key={person.id}>{[person.first_name,person.last_name].filter(Boolean).join(" ")} · {person.position || person.email}</option>)}</select></label>}<label className="field"><span>Other source details</span><input name="source_name" placeholder="Reference only when no controlled person applies" /></label><label className="field"><span>Source date</span><input name="source_date" type="date" defaultValue={today} /></label><label className="field"><span>Evidence owner</span><input name="evidence_owner" defaultValue={loggedActorName} readOnly /></label><label className="field"><span>Process area</span><input name="process_area" list="approved-processes" /></label><label className="field"><span>Secure external link</span><input name="external_url" type="url" placeholder="https://…" /></label><label className="field span2"><span>Upload evidence file</span><input name="evidence_file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.docx,.xlsx" /><small>Stored privately. PDF, image, text, CSV, Word or Excel; maximum 10 MB.</small></label><label className="field"><span>Confidentiality</span><select name="confidentiality" defaultValue="internal"><option value="public">Public</option><option value="internal">Internal</option><option value="confidential">Confidential</option><option value="restricted">Restricted</option></select></label><label className="field"><span>Reliability</span><select name="reliability" defaultValue="medium"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label></div><div className="compactAction"><button className="button primary">Add Objective Evidence</button></div></fieldset></form>
                </section>
                <section className="fieldworkModule" id="finding-register"><div className="fieldworkHead"><div><span className="panelKicker">03 · Linked findings</span><h3>Finding status and progress</h3><p>Raise a finding from its question above. Manage classification, ownership, corrective action and verification in Findings &amp; Actions.</p></div><span className="countBadge">{findings.length} findings</span></div><AuditFindingProgress findings={findings}/></section>
                <section className="fieldworkGate" id="fieldwork-requirements"><div><span className="panelKicker">Gate 04 decision</span><h3>Complete fieldwork and unlock Report</h3><p>Account for every in-scope question with supported conformity, a controlled finding or a justified N/A. Resolve mapping gaps and any unable-to-verify conclusions before completing Fieldwork.</p>{!completionDataReady && <p>{coverage.outstanding} question(s) outstanding · {dataScopeIssues.length} scope issue(s).</p>}</div><form action={completeAuditFieldwork}><input type="hidden" name="audit_id" value={id}/><label className="check"><input type="checkbox" name="fieldwork_confirmation" required disabled={fieldworkLocked || !completionDataReady}/><span><strong>Lead-auditor scope and evidence review</strong><br/>I have checked the selected scope against the controlled criterion inventory for the correct edition, reviewed the N/A justifications, and confirmed sufficient evidence and supported conclusions for report preparation.</span></label><div className="compactAction"><button className="button approve" disabled={fieldworkLocked || !completionDataReady}>Complete Fieldwork &amp; Unlock Report →</button></div></form></section>
              </div>
            </> : null}

            {gate === "report" ? <>
              <div className="panelKicker">Gate 05 · Controlled audit reporting</div><h2>Prepare, approve and issue the audit report</h2>
              <p className="panelLead">Convert the approved scope, evidence-based conclusions and controlled findings into an ISO 19011-aligned report. The PDF is generated from the controlled record and does not duplicate or alter source evidence.</p>
              {query?.report_error === "incomplete" ? <div className="notice error" role="alert"><strong>Report approval is not available yet.</strong> Complete the executive summary, overall conclusion and lead-auditor name first.</div> : null}
              {query?.report_error === "approval_required" ? <div className="notice error" role="alert"><strong>Report approval required.</strong> The lead auditor must approve the controlled draft before it can be issued.</div> : null}
              {query?.saved === "guided_draft" ? <div className="notice" role="status"><strong>Guided report narrative created.</strong> Review and edit every section below. The lead auditor remains accountable for the conclusion and approval.</div> : null}
              {query?.report_error === "guided_insufficient_evidence" ? <div className="notice error" role="alert"><strong>More audit results are required.</strong> Record at least one assessed criterion before building the report narrative.</div> : null}
              <section className="fieldworkModule" style={{marginBottom:22}}><div className="fieldworkHead"><div><span className="panelKicker">01 · Free guided report builder</span><h3>Build narrative from the controlled audit record</h3><p>Create a structured first draft from the approved scope, assessed criteria, findings and evidence register. It runs inside RPG Excellence without an external AI service, API key or usage charge.</p></div><span className="countBadge">Included · no charge</span></div>
                <div style={{display:"grid",gridTemplateColumns:"minmax(0,1.5fr) minmax(280px,.5fr)",gap:18,padding:22,alignItems:"stretch"}}><div className="coming" style={{margin:0}}><strong>Creates four editable report sections</strong><br />Executive summary, methodology and sampling, limitations and exclusions, and the overall management-system conclusion. Controlled findings and classifications remain unchanged. Existing text is preserved unless replacement is selected.</div><form action={generateAuditReportGuidedDraft} style={{display:"flex",flexDirection:"column",justifyContent:"space-between",gap:14}}><input type="hidden" name="audit_id" value={id} /><label className="check" style={{margin:0}}><input type="checkbox" name="replace_existing" /><span><strong>Replace existing narrative</strong><br />Leave clear to fill blank sections only.</span></label><button className="button primary">Build Guided Report Draft</button></form></div>
              </section>
              <section className="fieldworkModule"><div className="fieldworkHead"><div><span className="panelKicker">02 · Report content and review</span><h3>Controlled audit report</h3><p>Review, edit and take ownership of the report narrative, limitations, distribution and overall conclusion.</p></div><span className="countBadge">{reportControl?.status?.replaceAll("_", " ") || "not started"}</span></div>
                <form action={saveAuditReport}><input type="hidden" name="audit_id" value={id} /><div className="grid3">
                  <label className="field"><span>Report reference *</span><input name="report_reference" required defaultValue={reportControl?.report_reference || `${audit.audit_reference}-RPT`} /></label>
                  <label className="field"><span>Confidentiality</span><select name="confidentiality_classification" defaultValue={reportControl?.confidentiality_classification || "controlled"}><option value="public">Public</option><option value="internal">Internal</option><option value="controlled">Controlled</option><option value="confidential">Confidential</option><option value="restricted">Restricted</option></select></label>
                  <label className="field"><span>Lead auditor *</span><input name="lead_auditor_name" required defaultValue={reportControl?.lead_auditor_name || defaultLead?.member_name || ""} /></label>
                  <label className="field span2"><span>Executive summary *</span><textarea name="executive_summary" required defaultValue={reportControl?.executive_summary || ""} placeholder="Summarise the audit purpose, principal evidence, significant conclusions and management attention required." /></label>
                  <label className="field"><span>Distribution list</span><textarea name="distribution_list" defaultValue={reportControl?.distribution_list || ""} placeholder="Names or controlled distribution groups" /></label>
                  <label className="field span2"><span>Methodology and sampling</span><textarea name="methodology_and_sampling" defaultValue={reportControl?.methodology_and_sampling || ""} placeholder="Describe interviews, observations, records sampled, sites visited and sampling limitations." /></label>
                  <label className="field"><span>Limitations and exclusions</span><textarea name="limitations_and_exclusions" defaultValue={reportControl?.limitations_and_exclusions || ""} /></label>
                  <label className="field"><span>Unresolved differences</span><textarea name="unresolved_differences" defaultValue={reportControl?.unresolved_differences || ""} placeholder="Record unresolved opinions between the audit team and auditee, or state none." /></label>
                  <label className="field span2"><span>Overall management-system conclusion *</span><textarea name="overall_conclusion" required defaultValue={reportControl?.overall_conclusion || ""} placeholder="Conclude on conformity, implementation and effectiveness within the approved audit scope." /></label>
                </div><div className="compactAction"><button className="button primary">Save Controlled Report Draft</button></div></form>
              </section>
              <section className="fieldworkGate"><div><span className="panelKicker">Report controls</span><h3>Human approval and controlled issue</h3><p>The issued PDF includes scope, criteria, team, evidence-based conclusions and all controlled findings. Corrective actions may remain open and continue through Gate 06.</p></div><div>
                {reportControl ? <a className="button secondary" href={`/portal/internal-audits/${id}/report`} target="_blank" rel="noreferrer">Preview / Download PDF</a> : null}
                {reportControl?.status === "approved" ? <form action={issueAuditReport} style={{marginTop:12}}><input type="hidden" name="audit_id" value={id} /><button className="button primary">Issue Controlled Report & Open Actions →</button></form> : reportControl?.status === "issued" ? <div className="notice" style={{marginTop:12}}>✓ Controlled report issued {reportControl.issued_at ? displayDate(reportControl.issued_at) : ""}. Any later edit creates a new draft requiring approval and issue.</div> : <form action={approveAuditReport} style={{marginTop:12}}><input type="hidden" name="audit_id" value={id} /><label className="check"><input type="checkbox" name="report_approval_confirmation" required /><span><strong>Lead-auditor approval</strong><br />I confirm the report is accurate, complete, traceable to evidence and suitable for controlled issue.</span></label><div className="compactAction"><button className="button approve" disabled={!reportControl}>Approve Report</button></div></form>}
              </div></section>
            </> : null}

            {gate === "actions" ? <>
              <div className="panelKicker">Gate 06 · Finding follow-up</div><h2>Finding status and action progress</h2>
              <p className="panelLead">Ownership, responses, CAPA and independent verification are controlled in Findings &amp; Actions. This audit displays the linked records and their current progress.</p>
              <AuditFindingProgress findings={findings}/>
              <div className="actionBar"><Link className="button secondary" href="/portal/internal-audit-actions">Open Findings &amp; Actions →</Link><Link className="button approve" href={`/portal/internal-audits/${id}?gate=closing`}>Review Audit Closure →</Link></div>
            </> : null}

            {gate === "closing" ? <>
              <div className="panelKicker">Gate 07 · CAPA effectiveness and controlled closure</div><h2>Verify corrective action before closing the audit</h2>
              <p className="panelLead">Major and minor nonconformities use the established CAPA–8D workflow. The auditor must verify implementation and effectiveness against objective evidence before either the finding or this audit can close.</p>
              {query?.closure_error === "report" ? <div className="notice error"><strong>Issued report required.</strong> Approve and issue the controlled audit report before closing the audit.</div> : null}
              {query?.closure_error === "actions" ? <div className="notice error"><strong>Corrective-action verification remains open.</strong> Complete the linked CAPA–8D work and independently verify effectiveness for every Major and Minor NC before closing the audit.</div> : null}
              {query?.closure_error === "capa" ? <div className="notice error"><strong>Effectiveness cannot be confirmed yet.</strong> The linked CAPA–8D case must reach effectiveness review and all corrective actions must be completed or verified first.</div> : null}
              <div className="fieldworkMetrics" aria-label="Gate 07 closure dashboard">
                <a className="fieldworkMetric criteria" href="#capa-effectiveness-register"><b>{nonconformities.length}</b><span>Major / Minor NCs</span><small>Open effectiveness register →</small></a>
                <a className="fieldworkMetric evidence" href={nonconformities.find((item) => item.linked_rca_case_id) ? `#closure-${nonconformities.find((item) => item.linked_rca_case_id).id}` : "#capa-effectiveness-register"}><b>{nonconformities.filter((item) => item.linked_rca_case_id).length}</b><span>Linked CAPA–8D cases</span><small>Review linked investigation →</small></a>
                <a className="fieldworkMetric activities" href={nonconformities.find((item) => item.closure_verified) ? `#closure-${nonconformities.find((item) => item.closure_verified).id}` : "#capa-effectiveness-register"}><b>{nonconformities.filter((item) => item.closure_verified).length}</b><span>Effectiveness verified</span><small>View verified records →</small></a>
                <a className="fieldworkMetric findings" href={unresolvedNonconformities[0] ? `#closure-${unresolvedNonconformities[0].id}` : "#gate-07-decision"}><b>{unresolvedNonconformities.length}</b><span>Blocking closure</span><small>{unresolvedNonconformities.length ? "Open first closure blocker →" : "Proceed to closure decision →"}</small></a>
              </div>
              <section id="capa-effectiveness-register" className="fieldworkModule"><div className="fieldworkHead"><div><span className="panelKicker">Linked controlled records</span><h3>Finding follow-up and verification</h3><p>Complete the required independent verification in Findings &amp; Actions. The audit closure gate continues to check the saved finding and CAPA records.</p></div></div><AuditFindingProgress findings={findings}/></section>
              <section id="gate-07-decision" className="fieldworkGate" style={{scrollMarginTop:24}}><div><span className="panelKicker">Gate 07 decision</span><h3>Close the controlled audit</h3><p>{!reportIssued ? "The controlled report must be issued before closure." : unresolvedNonconformities.length ? `${unresolvedNonconformities.length} nonconformity record(s) still block closure. Complete and verify their linked CAPA–8D cases first.` : "The report is issued and all Major and Minor nonconformities have verified effective CAPA. The audit may now be formally closed."}</p></div><form action={completeAuditClosure}><input type="hidden" name="audit_id" value={id} /><label className="check"><input type="checkbox" name="closure_confirmation" required disabled={!reportIssued || unresolvedNonconformities.length > 0} /><span><strong>Accountable audit closure</strong><br />I confirm the report is issued, conclusions are supported, required follow-up is complete, and the audit record is ready for controlled closure.</span></label><div className="compactAction"><button className="button approve" disabled={!reportIssued || unresolvedNonconformities.length > 0}>Close Audit</button></div></form></section>
            </> : null}
          </section>
        </div>
      </div>
    </main>
  );
}

function AuditQuestionGuidance({question}) {
  const references=question.assessment_guidance||[];
  const lines=value=>Array.isArray(value)?value:String(value||"").split("|").map(item=>item.trim()).filter(Boolean);
  function block(label,value,tone="",list=false){if(!value || Array.isArray(value)&&!value.length)return null;return <div className={`afwGuideBlock ${tone}`} key={label}><strong>{label}:</strong>{list?<ul>{lines(value).map((item,index)=><li key={index}>{item}</li>)}</ul>:<span> {Array.isArray(value)?value.join(" · "):value}</span>}</div>;}
  function referenceContent(reference){return <div className="afwGuideStack">
    {reference.question && reference.question!==question.question_text && <p><strong>Assessment reference question:</strong> {reference.question}</p>}
    {block("Requirement summary",reference.requirement_summary,"blue")}
    {block("Practical application",reference.practical_application)}
    {block("Applicability guidance",reference.applicability_guidance)}
    {block("Documented information",reference.documented_information_guidance)}
    {block("Connected requirements",reference.related_requirements,"purple")}
    {block("Auditor guidance",reference.assessor_guidance)}
    {block("Interview questions",reference.interview_questions,"",true)}
    {block("Objective evidence to seek",reference.objective_evidence,"teal")}
    {block("Sampling guidance",reference.sampling_guidance,"amber")}
    {block("Conformity criteria",reference.conformity_criteria)}
    <div className="afwGuideGrid">{block("Minor NC guidance",reference.minor_nc_guidance,"amber")}{block("Major NC guidance",reference.major_nc_guidance,"red")}</div>
    {block("Management focus",reference.management_focus,"purple")}
    {block("Transition / amendment guidance",reference.transition_guidance,"blue")}
    {block("Maturity guidance",reference.maturity_guidance,"green")}
  </div>;}
  return references.length?<>
    <p className="afwHint">Guidance from the existing Assessment bank. Use the controlled standard and selected audit criteria when reaching your conclusion.</p>
    {references.length===1?referenceContent(references[0]):references.map(reference=><details className="afwReference" key={reference.id}><summary>Clause {reference.clause_reference||reference.question_number} · {reference.control_id||reference.standard||"Assessment guidance"}</summary>{referenceContent(reference)}</details>)}
  </>:<div className="afwGuideStack"><p className="afwHint">No matching Assessment guidance was resolved for this question. Existing Audit bank guidance is shown below; review any coverage warnings before completing Fieldwork.</p>
    {block("Requirement summary",question.requirement_summary,"blue")}{block("Audit intent",question.auditor_intent)}{block("Auditor guidance",question.auditor_guidance)}{block("Suggested probes",question.suggested_probes,"",true)}{block("Expected evidence",question.expected_evidence,"teal",true)}{block("Evidence examples",question.evidence_examples,"teal")}{block("Analysis focus",question.analysis_focus,"purple")}
  </div>;
}

function AuditFindingProgress({findings=[]}) {
  return findings.length?<div className="findingList">{findings.map(finding=><article id={`closure-${finding.id}`} className={`findingCard ${finding.finding_type}`} key={finding.id} style={{display:"block"}}>
    <div className="afwProgressHead"><div><b>{finding.finding_reference||"Controlled finding"}</b><h4>{finding.title||"Linked finding"}</h4></div><span className="countBadge">{String(finding.finding_type||"Classification unavailable").replaceAll("_"," ")}</span></div>
    <p>{String(finding.status||"Status unavailable").replaceAll("_"," ")} · {finding.responsible_owner_name||"Awaiting assignment"}{finding.agreed_date?` · Target ${displayDate(finding.agreed_date)}`:""}</p>
    <p>{finding.source_audit_question_code?`Originating question: ${finding.source_audit_question_code}`:finding.answer_id?"Originating assessment retained":"Historical finding — question reference unavailable"}</p>
    <div className="afwProgressActions"><Link className="button primary" href={`/portal/internal-audit-actions?record=${encodeURIComponent(finding.id)}`}>Open finding &amp; progress →</Link>{finding.linked_rca_case_id&&<Link className="button secondary" href={`/portal/rca/${finding.linked_rca_case_id}`}>Linked CAPA–8D →</Link>}</div>
  </article>)}</div>:<div className="emptyState">No controlled findings are linked to this audit. Raise a finding from its question when the evidence supports one.</div>;
}
