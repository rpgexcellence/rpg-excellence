import Image from "next/image";
// RPG INTERNAL AUDIT PLAN GATE — NO SEPARATE SAMPLING MODULE — 2026-08-24
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { createClient } from "../../../../lib/supabase/server";
import {
  addAuditScheduleItem,
  addAuditTeamMember,
  approveAuditPlan,
  approveAuditTeam,
  addAuditEvidence,
  addAuditFinding,
  completeAuditFieldwork,
  completeAuditClosure,
  linkAuditFindingToAnswer,
  saveAuditAnswer,
  saveAuditNotification,
  saveAuditScope,
  saveAuditReport,
  generateAuditReportGuidedDraft,
  approveAuditReport,
  issueAuditReport,
  assignAuditActionOwner,
  reviewAuditActionResponse,
  verifyD6CorrectiveAction,
  verifyAuditFindingEffectiveness,
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
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}

function localDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
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
  const selectedProcessPairs = new Set((selectedProcessesResult.data ?? [])
    .map((item) => `${item.standard_id}:${item.scope_key}`));
  const questionLinksResult = standardIds.length
    ? await supabase.from("internal_audit_question_scope_links")
        .select("question_id, standard_id, scope_key, clause, requirement_summary, internal_audit_standard_catalogue(standard_code, display_name)")
        .in("standard_id", standardIds)
    : { data: [], error: null };
  if (questionLinksResult.error) throw new Error(questionLinksResult.error.message);
  const scopedQuestionLinks = (questionLinksResult.data ?? []).filter((link) =>
    selectedProcessPairs.size === 0 || selectedProcessPairs.has(`${link.standard_id}:${link.scope_key}`)
  );
  const linkedQuestionIds = [...new Set(scopedQuestionLinks.map((link) => link.question_id).filter(Boolean))];
  const [questionsResult, answersResult, evidenceResult, findingsResult] = await Promise.all([
    linkedQuestionIds.length
      ? supabase.from("internal_audit_questions").select("*").in("id", linkedQuestionIds).eq("active", true).order("display_order")
      : Promise.resolve({ data: [], error: null }),
    supabase.from("internal_audit_answers").select("*").eq("audit_id", id).eq("owner_id", user.id),
    supabase.from("internal_audit_evidence").select("*").eq("audit_id", id).eq("owner_id", user.id).order("created_at", { ascending: false }),
    supabase.from("internal_audit_findings").select("*").eq("audit_id", id).eq("owner_id", user.id).order("created_at", { ascending: false }),
  ]);
  if (questionsResult.error) throw new Error(questionsResult.error.message);
  if (answersResult.error) throw new Error(answersResult.error.message);
  if (evidenceResult.error) throw new Error(evidenceResult.error.message);
  if (findingsResult.error) throw new Error(findingsResult.error.message);
  const linksByQuestion = new Map();
  for (const link of scopedQuestionLinks) {
    const current = linksByQuestion.get(link.question_id) ?? [];
    current.push(link);
    linksByQuestion.set(link.question_id, current);
  }
  const questions = (questionsResult.data ?? []).map((question) => ({
    ...question,
    criteria_links: linksByQuestion.get(question.id) ?? [],
  }));
  const answers = answersResult.data ?? [];
  const evidence = evidenceResult.data ?? [];
  const findings = findingsResult.data ?? [];
  const [reportControlResult, actionAccessResult] = await Promise.all([
    supabase.from("internal_audit_report_controls").select("*")
      .eq("audit_id", id).eq("owner_id", user.id).maybeSingle(),
    supabase.from("internal_audit_action_access").select("*")
      .eq("audit_id", id).eq("owner_id", user.id).order("created_at"),
  ]);
  if (reportControlResult.error) throw new Error(reportControlResult.error.message);
  if (actionAccessResult.error) throw new Error(actionAccessResult.error.message);
  const reportControl = reportControlResult.data;
  const actionAccess = actionAccessResult.data ?? [];
  const actionAccessByFinding = new Map(actionAccess.map((item) => [item.finding_id, item]));
  const actionAccessIds = actionAccess.map((item) => item.id);
  const actionEvidenceResult = actionAccessIds.length
    ? await supabase.from("internal_audit_action_evidence").select("*")
        .in("action_access_id", actionAccessIds).eq("owner_id", user.id).order("created_at")
    : { data: [], error: null };
  if (actionEvidenceResult.error) throw new Error(actionEvidenceResult.error.message);
  const actionEvidence = actionEvidenceResult.data ?? [];
  const actionEvidenceUrls = new Map();
  if (actionEvidence.length) {
    const { data: signedActionEvidence } = await supabase.storage.from("internal-audit-evidence")
      .createSignedUrls(actionEvidence.map((item) => item.storage_path), 3600);
    for (const item of signedActionEvidence ?? []) if (item.path && item.signedUrl) actionEvidenceUrls.set(item.path, item.signedUrl);
  }
  const actionEvidenceByAccess = new Map();
  for (const item of actionEvidence) {
    const current = actionEvidenceByAccess.get(item.action_access_id) ?? [];
    current.push(item);
    actionEvidenceByAccess.set(item.action_access_id, current);
  }
  const findingAttachmentPaths = findings.map((finding) => finding.evidence_attachment_path).filter(Boolean);
  const findingAttachmentUrls = new Map();
  if (findingAttachmentPaths.length > 0) {
    const { data: signedAttachments } = await supabase.storage
      .from("internal-audit-evidence")
      .createSignedUrls(findingAttachmentPaths, 3600);
    for (const attachment of signedAttachments ?? []) {
      if (attachment.path && attachment.signedUrl) findingAttachmentUrls.set(attachment.path, attachment.signedUrl);
    }
  }
  const linkedRcaIds = [...new Set(findings.map((finding) => finding.linked_rca_case_id).filter(Boolean))];
  const [rcaCasesResult, rcaActionsResult, rcaD6EvidenceResult] = linkedRcaIds.length
    ? await Promise.all([
        supabase.from("rca_cases").select("id, case_reference, status, current_discipline, target_close_date, closed_at").in("id", linkedRcaIds).eq("owner_id", user.id),
        supabase.from("rca_actions").select("*").in("case_id", linkedRcaIds).eq("owner_id", user.id),
        supabase.from("rca_evidence").select("*").in("case_id", linkedRcaIds).eq("owner_id", user.id).eq("discipline", 6).order("created_at", { ascending: false }),
      ])
    : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }];
  if (rcaCasesResult.error) throw new Error(rcaCasesResult.error.message);
  if (rcaActionsResult.error) throw new Error(rcaActionsResult.error.message);
  if (rcaD6EvidenceResult.error) throw new Error(rcaD6EvidenceResult.error.message);
  const rcaCasesById = new Map((rcaCasesResult.data ?? []).map((rcaCase) => [rcaCase.id, rcaCase]));
  const rcaActionsByCase = new Map();
  for (const action of rcaActionsResult.data ?? []) {
    const current = rcaActionsByCase.get(action.case_id) ?? [];
    current.push(action);
    rcaActionsByCase.set(action.case_id, current);
  }
  const d6EvidenceUrls = new Map();
  const d6EvidenceByCase = new Map();
  const d6Evidence = rcaD6EvidenceResult.data ?? [];
  if (d6Evidence.length) {
    const { data: signedD6Evidence } = await supabase.storage.from("rca-evidence").createSignedUrls(d6Evidence.map((item) => item.storage_path), 3600);
    for (const item of signedD6Evidence ?? []) if (item.path && item.signedUrl) d6EvidenceUrls.set(item.path, item.signedUrl);
  }
  for (const item of d6Evidence) {
    const current = d6EvidenceByCase.get(item.case_id) ?? [];
    current.push(item);
    d6EvidenceByCase.set(item.case_id, current);
  }
  const nonconformities = findings.filter((finding) => ["major_nc", "minor_nc"].includes(finding.finding_type));
  const advisoryFindings = findings.filter((finding) => !["major_nc", "minor_nc"].includes(finding.finding_type));
  const unresolvedNonconformities = nonconformities.filter((finding) => !finding.linked_rca_case_id || finding.status !== "closed" || !finding.closure_verified);
  const firstVerificationFinding = nonconformities.find((finding) => actionAccessByFinding.get(finding.id)?.d6_verification_requested_at);
  const createdOwnerAccess = query?.access ? actionAccess.find((item) => item.id === query.access) : null;
  const createdOwnerFinding = createdOwnerAccess ? findings.find((item) => item.id === createdOwnerAccess.finding_id) : null;
  const secureOwnerLink = query?.action_token ? `${applicationOrigin}/audit-actions/${query.action_token}` : null;
  const ownerEmailHref = createdOwnerAccess && secureOwnerLink ? createMailtoHref({
    recipients: [createdOwnerAccess.assignee_email],
    ccRecipients: [],
    subject: `Action required: ${createdOwnerFinding?.finding_reference || "internal audit corrective action"}`,
    body: `Dear ${createdOwnerAccess.assignee_name},\n\nPlease follow the secure link below to review the nonconformity and complete the required corrective-action response and associated CAPA–8D record.\n\n${secureOwnerLink}\n\nThis link is restricted to the named action owner and expires on ${displayDate(createdOwnerAccess.secure_token_expires_at)}. Please do not forward it.\n\nIf you have any questions about the finding or required response, please contact the audit team.\n\nKind regards,\nAudit Team`,
  }) : null;
  const answersByQuestion = new Map(answers.map((answer) => [answer.question_id, answer]));
  const assessedCount = answers.filter((answer) => answer.result && answer.result !== "not_assessed").length;
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
        {query?.answer_error === "na_justification" ? <div className="notice error" role="alert"><strong>Justification required.</strong> You selected “Not applicable”. Explain why this audit criterion does not apply, then save the assessment again.</div> : null}
        {query?.fieldwork_error === "assessment_and_evidence" ? <div className="notice error" role="alert"><strong>Fieldwork cannot be completed yet.</strong> First <Link href="#criteria-workbench">assess at least one audit criterion</Link> and <Link href="#evidence-register">add at least one objective-evidence record</Link>, then confirm completion again.</div> : null}
        {query?.fieldwork_error === "assessment" ? <div className="notice error" role="alert"><strong>Assessment required.</strong> <Link href="#criteria-workbench">Assess at least one audit criterion</Link> before completing Fieldwork.</div> : null}
        {query?.fieldwork_error === "evidence" ? <div className="notice error" role="alert"><strong>Objective evidence required.</strong> <Link href="#evidence-register">Add at least one evidence record</Link> before completing Fieldwork.</div> : null}

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
                <div className="section"><h3>Criteria and coverage</h3><div className="grid3"><label className="field"><span>Criteria summary *</span><textarea name="criteria_summary" required defaultValue={audit.criteria_summary ?? standards.join("; ")} /></label><label className="field"><span>Sites</span><textarea name="sites" defaultValue={audit.sites ?? ""} /></label><label className="field"><span>Functions and departments</span><textarea name="departments" defaultValue={audit.departments ?? ""} /></label><label className="field"><span>Processes</span><textarea name="processes" defaultValue={audit.processes ?? ""} /></label><label className="field"><span>Products and services</span><textarea name="products_services" defaultValue={audit.products_services ?? ""} /></label><label className="field"><span>Legal, customer and contractual criteria</span><textarea name="legal_customer_contractual_criteria" defaultValue={audit.legal_customer_contractual_criteria ?? ""} /></label></div></div>
                <div className="section"><h3>Risk, exclusions and feasibility</h3><div className="grid2"><label className="field"><span>Known risks, changes and prior signals</span><textarea name="known_risks_changes" defaultValue={audit.known_risks_changes ?? ""} /></label><label className="field"><span>Previous audit summary</span><textarea name="previous_audit_summary" defaultValue={audit.previous_audit_summary ?? ""} /></label><label className="field"><span>Exclusions</span><textarea name="exclusions" defaultValue={audit.exclusions ?? ""} /></label><label className="field"><span>Exclusion justification</span><textarea name="exclusion_justification" defaultValue={audit.exclusion_justification ?? ""} /></label><label className="field"><span>Confidentiality requirements</span><textarea name="confidentiality_requirements" defaultValue={audit.confidentiality_requirements ?? ""} /></label><label className="check"><input type="checkbox" name="feasibility_confirmed" defaultChecked={audit.feasibility_confirmed} /><span><strong>Feasibility confirmed</strong><br />Adequate time, information, access and resources are available.</span></label></div></div>
                <div className="actionBar"><button className="button secondary" name="intent" value="save">Save Scope</button><button className="button approve" name="intent" value="approve">Human Approve Scope & Unlock Team →</button></div>
              </form>
            </> : null}

            {gate === "team" ? <>
              <div className="panelKicker">Gate 02 · Team assignment</div><h2>Build a competent and independent audit team</h2><p className="panelLead">Record competence, independence, confidentiality and accountable scope assignment before approving the audit team.</p>
              <div className="teamList">{team.length === 0 ? <div className="coming">No audit team members have been assigned. Add the lead auditor first.</div> : team.map((member) => <div className="teamCard" key={member.id}><div><strong>{member.member_name}</strong><small>{member.email} · {ROLE_LABELS[member.audit_role] ?? member.audit_role}</small></div><div>{member.competence_confirmed ? <span className="confirmation">✓ Competence confirmed</span> : <span className="warning">Competence not confirmed</span>}</div><div>{member.independence_confirmed && member.confidentiality_confirmed ? <span className="confirmation">✓ Governance confirmed</span> : <span className="warning">Governance incomplete</span>}</div></div>)}</div>
              <form action={addAuditTeamMember}>
                <input type="hidden" name="audit_id" value={id} /><div className="grid3"><label className="field"><span>Member name *</span><input name="member_name" required /></label><label className="field"><span>Email *</span><input name="email" type="email" required /></label><label className="field"><span>Audit role *</span><select name="audit_role" defaultValue="auditor">{Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field"><span>Standards competence</span><textarea name="standards_competence" placeholder="Relevant standards knowledge and audit experience" /></label><label className="field"><span>Sector competence</span><textarea name="sector_competence" /></label><label className="field"><span>Technical competence</span><textarea name="technical_competence" /></label><label className="field"><span>Assigned audit scope</span><textarea name="assigned_scope" /></label><label className="check"><input type="checkbox" name="competence_confirmed" /><span>Competence confirmed against assigned scope</span></label><label className="check"><input type="checkbox" name="independence_confirmed" /><span>Independence and impartiality confirmed</span></label><label className="check"><input type="checkbox" name="confidentiality_confirmed" /><span>Confidentiality obligations confirmed</span></label></div><div className="actionBar"><button className="button primary">Add Team Member</button></div>
              </form>
              {!hasLeadAuditor ? <div className="notice error" role="status"><strong>Lead auditor required.</strong> Select “Lead auditor” as the audit role when adding the accountable team member. Team approval remains unavailable until this role is assigned.</div> : null}
              <form action={approveAuditTeam}><input type="hidden" name="audit_id" value={id} /><div className="actionBar"><button className="button approve" disabled={!hasLeadAuditor} title={!hasLeadAuditor ? "Add a Lead auditor before approving the team" : undefined}>Human Approve Team & Unlock Audit Plan →</button></div></form>
            </> : null}

            {gate === "plan" ? <>
              <div className="panelKicker">Gate 03 · Risk-based audit planning</div><h2>Design the audit plan</h2><p className="panelLead">The approved scope and team are now controlled. Build the agenda, notification and auditee coordination before fieldwork.</p>
              <div className="planPreview"><div className="previewCard"><b>Approved scope</b><span>Carry approved processes, locations, criteria and risk priorities directly into the agenda.</span></div><div className="previewCard"><b>Audit agenda</b><span>Allocate processes, interviews, site activity and document review to competent team members.</span></div><div className="previewCard"><b>Notification</b><span>Issue a controlled audit notification covering scope, criteria, timing, team and requested information.</span></div></div>
              <div className="planStack">
                <section className="planModule" id="audit-agenda"><div className="moduleHead"><div><h3>01 · Audit agenda and resource deployment</h3><p>Sequence meetings, process audits, interviews, site work and team reviews.</p></div><span className="countBadge">{schedule.length} activit{schedule.length === 1 ? "y" : "ies"}</span></div><div className="moduleBody">
                  <div className="coming"><strong>Inherited from the approved gates</strong><br />Processes: {inheritedProcesses.join(" · ") || "Approved scope statement"}<br />Sites: {inheritedSites.join(" · ") || "No site specified"}<br />Audit window: {displayDate(audit.planned_start_at)} – {displayDate(audit.planned_end_at)} · Team: {team.map((member) => member.member_name).join(", ") || "No members assigned"}</div>
                  {schedule.length ? <div className="recordList">{schedule.map((item) => <div className="record" key={item.id}><div><strong>{displayDate(item.starts_at)}</strong><small>to {displayDate(item.ends_at)}</small></div><div><strong>{item.title}</strong><small>{ACTIVITY_LABELS[item.activity_type] ?? item.activity_type} · {item.process_or_scope || "General audit scope"}{item.location_or_link ? ` · ${item.location_or_link}` : ""}</small></div><span className="recordTag">{item.expected_attendees || "Audit team"}</span></div>)}</div> : <div className="emptyState">No agenda activities recorded yet. Include opening and closing meetings plus sufficient fieldwork coverage.</div>}
                  <form action={addAuditScheduleItem}><input type="hidden" name="audit_id" value={id} /><datalist id="approved-processes">{inheritedProcesses.map((process) => <option value={process} key={process} />)}</datalist><datalist id="approved-sites">{inheritedSites.map((site) => <option value={site} key={site} />)}</datalist><div className="grid3"><label className="field"><span>Activity type *</span><select name="activity_type" required defaultValue="process_audit">{Object.entries(ACTIVITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field"><span>Activity title *</span><input name="title" required defaultValue={defaultProcess ? `${defaultProcess} audit` : ""} /></label><label className="field"><span>Process / scope *</span><input name="process_or_scope" list="approved-processes" required defaultValue={defaultProcess} /><small>Select an approved process or refine the activity scope.</small></label><label className="field"><span>Starts *</span><input name="starts_at" type="datetime-local" required defaultValue={localDateTime(audit.planned_start_at)} /></label><label className="field"><span>Ends *</span><input name="ends_at" type="datetime-local" required defaultValue={localDateTime(audit.planned_end_at)} /></label><label className="field"><span>Lead auditor</span><select name="lead_team_member_id" defaultValue={defaultLead?.id ?? ""}><option value="">Unassigned</option>{team.map((member) => <option value={member.id} key={member.id}>{member.member_name}</option>)}</select></label><label className="field"><span>Location or meeting link</span><input name="location_or_link" list="approved-sites" defaultValue={defaultSite} /></label><label className="field"><span>Expected attendees</span><input name="expected_attendees" defaultValue={audit.auditee_contact_name ?? ""} /></label><label className="field"><span>Notes / evidence focus</span><textarea name="notes" defaultValue={audit.known_risks_changes ?? ""} /></label></div><div className="actionBar"><button className="button primary">Add Agenda Activity</button></div></form>
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
              <section className="planGate"><h3>Formal plan readiness decision</h3><p>Human approval confirms that the planned audit is feasible, risk-based, adequately resourced and communicated. Approval locks Gate 03 and unlocks Fieldwork.</p><div className="readinessGrid"><div className={`readinessItem ${schedule.length >= 2 ? "ready" : "missing"}`}>{schedule.length >= 2 ? "✓" : "!"} Agenda coverage</div><div className={`readinessItem ${questions.length > 0 ? "ready" : "missing"}`}>{questions.length > 0 ? "✓" : "!"} Audit questions ({questions.length})</div><div className={`readinessItem ${notification ? "ready" : "missing"}`}>{notification ? "✓" : "!"} Notification draft</div></div><form action={approveAuditPlan}><input type="hidden" name="audit_id" value={id} /><label className="check"><input type="checkbox" name="plan_confirmation" required /><span><strong>Human plan approval</strong><br />I confirm that timing, competence, resources, planned questions, notification and information requirements are sufficient for controlled fieldwork.</span></label><div className="actionBar"><button className="button approve">Human Approve Plan & Unlock Fieldwork →</button></div></form></section>
            </> : null}

            {gate === "fieldwork" ? <>
              <div className="panelKicker">Gate 04 · Evidence-led fieldwork</div>
              <h2>Execute the approved audit plan</h2>
              <p className="panelLead">Test the approved criteria, preserve objective evidence and convert verified conclusions into controlled findings. Every conclusion remains traceable to its criterion, auditor and evidence trail.</p>

              <div className="fieldworkMetrics">
                <a className="fieldworkMetric criteria" href="#criteria-workbench"><b>{assessedCount}/{questions.length}</b><span>Criteria assessed ↓</span></a>
                <a className="fieldworkMetric evidence" href="#evidence-register"><b>{evidence.length}</b><span>Evidence records ↓</span></a>
                <a className="fieldworkMetric findings" href="#finding-register"><b>{findings.length}</b><span>Controlled findings ↓</span></a>
                <Link className="fieldworkMetric activities" href={`/portal/internal-audits/${id}?gate=plan#audit-agenda`}><b>{schedule.length}</b><span>Approved activities →</span></Link>
              </div>

              <div className="fieldworkLayout">
                <section className="fieldworkModule criteriaWorkbench" id="criteria-workbench">
                  <div className="fieldworkHead"><div><span className="panelKicker">01 · Criteria execution</span><h3>Audit question workbench</h3><p>Use the approved question bank as a guide—not a checklist substitute. Record what was tested, what the evidence demonstrates and any remaining uncertainty.</p></div><span className="countBadge">{questions.length} criteria</span></div>
                  {questions.length ? <div className="questionList">{questions.map((question, questionIndex) => {
                    const answer = answersByQuestion.get(question.id);
                    const probes = Array.isArray(question.suggested_probes) ? question.suggested_probes : [];
                    const expected = Array.isArray(question.expected_evidence) ? question.expected_evidence : [];
                    return <details id={`question-${question.id}`} className={`questionCard ${answer?.result && answer.result !== "not_assessed" ? "answered" : ""}`} key={question.id} open={(questionIndex === 0 && !answer) || query?.question === question.id}>
                      <summary><span className="questionNumber">{String(questionIndex + 1).padStart(2, "0")}</span><span className="questionSummary"><strong>{question.question_code || question.clause || `Criterion ${questionIndex + 1}`}</strong><small>{question.process_area || "Approved audit criteria"}</small></span><span className="questionState">{answer?.result ? answer.result.replaceAll("_", " ") : "Not assessed"}</span></summary>
                      <div className="questionBody">
                        <div className="questionPrompt"><h4>{question.question_text}</h4>{question.criteria_links?.length ? <p><b>Applicable criteria</b>{question.criteria_links.map((link) => `${link.internal_audit_standard_catalogue?.standard_code ?? "Standard"}${link.clause ? ` ${link.clause}` : ""}`).join(" · ")}</p> : null}{question.requirement_summary ? <p><b>Requirement</b>{question.requirement_summary}</p> : null}{question.auditor_intent ? <p><b>Audit intent</b>{question.auditor_intent}</p> : null}{question.auditor_guidance ? <p><b>Auditor guidance</b>{question.auditor_guidance}</p> : null}</div>
                        <div className="probeGrid"><div><b>Suggested probes</b>{probes.length ? <ul>{probes.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Follow the process trail and test implementation.</p>}</div><div><b>Expected evidence</b>{expected.length ? <ul>{expected.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Retain sufficient, relevant and reliable objective evidence.</p>}</div></div>
                        <form action={saveAuditAnswer} className="answerForm"><input type="hidden" name="audit_id" value={id} /><input type="hidden" name="question_id" value={question.id} /><div className="grid3">
                          <label className="field"><span>Audit conclusion *</span><select name="result" defaultValue={answer?.result ?? "not_assessed"}><option value="not_assessed">Not assessed</option><option value="conformity">Conformity</option><option value="major_nc">Major nonconformity</option><option value="minor_nc">Minor nonconformity</option><option value="observation">Observation</option><option value="ofi">Opportunity for improvement</option><option value="positive_practice">Positive practice</option><option value="unable_to_verify">Unable to verify</option><option value="not_applicable">Not applicable</option></select></label>
                          <label className="field"><span>Evidence confidence</span><select name="confidence_level" defaultValue={answer?.confidence_level ?? "medium"}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
                          <label className="field"><span>Risk significance</span><select name="risk_level" defaultValue={answer?.risk_level ?? "medium"}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
                          <label className="field"><span>Assigned auditor</span><select name="assigned_team_member_id" defaultValue={answer?.assigned_team_member_id ?? ""}><option value="">Unassigned</option>{team.map((member) => <option value={member.id} key={member.id}>{member.member_name}</option>)}</select></label>
                          <label className="field span2"><span>Evidence-based conclusion</span><textarea name="conclusion" defaultValue={answer?.conclusion ?? ""} placeholder="State what the sampled evidence demonstrates against the criterion." /></label>
                          <label className="field"><span>Auditor notes</span><textarea name="auditor_notes" defaultValue={answer?.auditor_notes ?? ""} /></label>
                          <label className="field"><span>N/A justification — required when “Not applicable” is selected</span><textarea name="not_applicable_justification" defaultValue={answer?.not_applicable_justification ?? ""} placeholder="Explain why the criterion is outside the audit scope or does not apply to the organisation, site, process or activity." /></label>
                        </div><div className="compactAction"><button className="button primary">Save Criterion Assessment</button></div></form>
                      </div>
                    </details>;
                  })}</div> : <div className="emptyState"><strong>Fieldwork cannot begin because the approved plan contains no audit questions.</strong><br />Return to the <Link href={`/portal/internal-audits/${id}?gate=plan`}>Internal Audit Plan</Link> and register the question bank before execution.</div>}
                </section>

                <section className="fieldworkModule" id="evidence-register"><div className="fieldworkHead"><div><span className="panelKicker">02 · Objective evidence</span><h3>Evidence register</h3><p>Preserve provenance, relevance, reliability and confidentiality for every material item reviewed.</p></div><span className="countBadge">{evidence.length} records</span></div>
                  {evidence.length ? <div className="evidenceList">{evidence.map((item) => <article className="evidenceCard" key={item.id}><div><b>{item.evidence_reference}</b><h4>{item.title}</h4><p>{item.description || "No description recorded."}</p></div><span>{item.evidence_type?.replaceAll("_", " ")} · {item.reliability || "unrated"}</span></article>)}</div> : <div className="emptyState">No objective evidence recorded yet.</div>}
                  <form action={addAuditEvidence}><input type="hidden" name="audit_id" value={id} /><div className="grid3"><label className="field"><span>Linked criterion</span><select name="answer_id"><option value="">General audit evidence</option>{answers.map((answer) => { const q = questions.find((item) => item.id === answer.question_id); return <option key={answer.id} value={answer.id}>{q?.question_code || q?.clause || "Assessed criterion"}</option>; })}</select></label><label className="field"><span>Evidence type *</span><select name="evidence_type" defaultValue="document"><option value="document">Document</option><option value="record">Record</option><option value="interview">Interview</option><option value="observation">Observation</option><option value="photograph">Photograph</option><option value="screenshot">Screenshot</option><option value="system_record">System record</option><option value="measurement">Measurement</option><option value="test_result">Test result</option><option value="external_confirmation">External confirmation</option><option value="other">Other</option></select></label><label className="field"><span>Evidence title *</span><input name="title" required /></label><label className="field span2"><span>Description and relevance</span><textarea name="description" /></label><label className="field"><span>Source / interviewee</span><input name="source_name" /></label><label className="field"><span>Source date</span><input name="source_date" type="date" /></label><label className="field"><span>Evidence owner</span><input name="evidence_owner" /></label><label className="field"><span>Process area</span><input name="process_area" list="approved-processes" /></label><label className="field"><span>Secure external link</span><input name="external_url" type="url" /></label><label className="field"><span>Confidentiality</span><select name="confidentiality" defaultValue="internal"><option value="public">Public</option><option value="internal">Internal</option><option value="confidential">Confidential</option><option value="restricted">Restricted</option></select></label><label className="field"><span>Reliability</span><select name="reliability" defaultValue="medium"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label></div><div className="compactAction"><button className="button primary">Add Objective Evidence</button></div></form>
                </section>

                <section className="fieldworkModule" id="finding-register"><div className="fieldworkHead"><div><span className="panelKicker">03 · Controlled findings</span><h3>Finding register</h3><p>Separate criterion, objective evidence and the conclusion. Nonconformities require an explicit failure statement.</p></div><span className="countBadge">{findings.length} findings</span></div>
                  {findings.length ? <div className="findingList">{findings.map((item) => {
                    const linkedAnswer = answers.find((answer) => answer.id === item.answer_id);
                    const linkedQuestion = linkedAnswer ? questions.find((question) => question.id === linkedAnswer.question_id) : null;
                    return <article className={`findingCard ${item.finding_type}`} key={item.id}>
                      <div><b>{item.finding_reference}</b><h4>{item.title}</h4><p>{item.objective_evidence}</p>{item.evidence_attachment_path ? <p><strong>Supporting evidence:</strong> <a href={findingAttachmentUrls.get(item.evidence_attachment_path) ?? "#"} target="_blank" rel="noreferrer">{item.evidence_attachment_name || "Open attachment"}</a></p> : null}
                        {linkedQuestion ? <p><strong>Linked criterion:</strong> {linkedQuestion.question_code || linkedQuestion.clause}</p> : (
                          <form action={linkAuditFindingToAnswer} style={{marginTop:12}}>
                            <input type="hidden" name="audit_id" value={id} />
                            <input type="hidden" name="finding_id" value={item.id} />
                            <div style={{display:"flex",gap:10,alignItems:"end",flexWrap:"wrap"}}>
                              <label className="field" style={{minWidth:280,flex:1}}><span>Link assessed criterion</span><select name="answer_id" required defaultValue=""><option value="" disabled>Select assessed criterion</option>{answers.map((answer) => { const q = questions.find((question) => question.id === answer.question_id); return <option key={answer.id} value={answer.id}>{q?.question_code || q?.clause || "Assessed criterion"} · {answer.result?.replaceAll("_", " ")}</option>; })}</select></label>
                              <button className="button primary" type="submit">Link Finding</button>
                            </div>
                          </form>
                        )}
                      </div><span>{item.finding_type?.replaceAll("_", " ")}</span>
                    </article>;
                  })}</div> : <div className="emptyState">No findings recorded. Conformity and positive practice can still be documented in the criteria workbench.</div>}
                  <form action={addAuditFinding}><input type="hidden" name="audit_id" value={id} /><div className="grid3">
                    <label className="field"><span>Linked assessment</span><select name="answer_id"><option value="">Select assessed criterion</option>{answers.map((answer) => { const q = questions.find((item) => item.id === answer.question_id); return <option key={answer.id} value={answer.id}>{q?.question_code || q?.clause || "Assessed criterion"}</option>; })}</select></label>
                    <label className="field"><span>Finding type *</span><select name="finding_type" defaultValue="minor_nc"><option value="major_nc">Major nonconformity</option><option value="minor_nc">Minor nonconformity</option><option value="observation">Observation</option><option value="ofi">Opportunity for improvement</option><option value="positive_practice">Positive practice</option><option value="unable_to_verify">Unable to verify</option></select></label>
                    <label className="field"><span>Risk level</span><select name="risk_level" defaultValue="medium"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
                    <label className="field span2"><span>Finding headline *</span><input name="title" required placeholder="Concise description of the issue" /></label>
                    <label className="field"><span>Process area</span><input name="process_area" list="approved-processes" /></label>
                    <label className="field span2"><span>Statement of nonconformity</span><textarea name="failure_statement" placeholder="State clearly what failed to conform. Required for major and minor nonconformities." /></label>
                    <label className="field"><span>Source of requirement *</span><select name="requirement_source" required defaultValue="management_system_standard"><option value="management_system_standard">Applicable management system standard</option><option value="legal_regulatory">Legal or regulatory requirement</option><option value="customer_contractual">Customer or contractual requirement</option><option value="policy_procedure">Organisation policy or procedure</option><option value="certification_scheme">Certification or accreditation scheme</option><option value="other_criteria">Other specified audit criteria</option></select></label>
                    <label className="field"><span>Applicable standard</span><select name="requirement_standard_id" defaultValue=""><option value="">Not applicable / select standard</option>{selectedStandardOptions.map((standard) => <option key={standard.id} value={standard.id}>{standard.label}</option>)}</select></label>
                    <label className="field"><span>Clause / requirement reference</span><input name="clause" placeholder="e.g. ISO 45001 clause 8.2" /></label>
                    <label className="field span2"><span>Requirement *</span><textarea name="criteria" required placeholder="State the applicable requirement accurately and specifically." /></label>
                    <label className="field"><span>Source of evidence *</span><select name="evidence_source" required defaultValue="document_record"><option value="document_record">Document or controlled record</option><option value="interview">Interview or testimony</option><option value="observation">Physical or process observation</option><option value="system_record">System or transactional record</option><option value="photograph_screenshot">Photograph or screenshot</option><option value="measurement_test">Measurement or test result</option><option value="external_confirmation">External confirmation</option><option value="multiple_sources">Multiple corroborating sources</option><option value="other">Other evidence source</option></select></label>
                    <label className="field span2"><span>Evidence *</span><textarea name="objective_evidence" required placeholder="Record the factual, verifiable evidence demonstrating the extent of conformity or failure." /></label>
                    <label className="field" style={{gridColumn:"1 / -1"}}><span>Attach supporting evidence</span><input name="evidence_file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.docx,.xlsx" /><small>PDF, image, text, CSV, Word or Excel; maximum 10 MB.</small></label>
                    <label className="field"><span>Responsible owner</span><input name="responsible_owner_name" /></label>
                    <label className="field"><span>Owner email</span><input name="responsible_owner_email" type="email" /></label>
                    <label className="field"><span>Agreed date</span><input name="agreed_date" type="date" /></label>
                  </div><div className="compactAction"><button className="button primary">Create Controlled Finding</button></div></form>
                </section>

                <section className="fieldworkGate" id="fieldwork-requirements"><div><span className="panelKicker">Gate 04 decision</span><h3>Complete fieldwork and unlock Report</h3><p>Confirm that the approved agenda has been executed, evidence is sufficient and relevant, conclusions are supportable, and draft findings have been reviewed with the audit team.</p></div><form action={completeAuditFieldwork}><input type="hidden" name="audit_id" value={id} /><label className="check"><input type="checkbox" name="fieldwork_confirmation" required /><span><strong>Human fieldwork completion</strong><br />I confirm the audit trail is sufficient for report preparation and controlled review.</span></label><div className="compactAction"><button className="button approve">Complete Fieldwork & Unlock Report →</button></div></form></section>
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
              <div className="panelKicker">Gate 06 · Nonconformity response and corrective action</div><h2>Manage action-owner responses</h2>
              <p className="panelLead">Action owners may respond through a portal account or a restricted, expiring link. The original finding statement, classification, requirement and objective evidence remain auditor-controlled.</p>
              {query?.action_error === "d6_verification_required" ? <div className="notice error"><strong>Final acceptance is blocked.</strong><br />Every selected corrective action must first be assessed in D6 and recorded as Effective—verified by the auditor. Open the D6 verification panel below and complete each outstanding assessment.</div> : null}
              {secureOwnerLink ? <section className="ownerDispatch" role="status"><div><div className="ownerDispatchHead"><span className="ownerDispatchIcon">✉</span><div><h3>Owner notification ready</h3><p><strong>{createdOwnerAccess?.assignee_name || "Action owner"}</strong>{createdOwnerAccess?.assignee_email ? ` · ${createdOwnerAccess.assignee_email}` : ""}<br />Secure access expires {createdOwnerAccess?.secure_token_expires_at ? displayDate(createdOwnerAccess.secure_token_expires_at) : "after 14 days"}.</p></div></div><code className="ownerLink">{secureOwnerLink}</code></div><div className="ownerDispatchActions">{ownerEmailHref ? <a className="button approve emailAction" href={ownerEmailHref}>Email action owner</a> : null}<a className="button secondary" href={secureOwnerLink} target="_blank" rel="noopener noreferrer">Open secure link ↗</a></div></section> : null}
              <div className="fieldworkMetrics" aria-label="Gate 06 action summary">
                <a className="fieldworkMetric criteria" href="#action-owner-register"><b>{nonconformities.length}</b><span>Controlled NCs</span><small>View assigned nonconformities →</small></a>
                <a className="fieldworkMetric evidence" href="#action-owner-register"><b>{actionAccess.length}</b><span>Assigned owners</span><small>Review owner access →</small></a>
                <a className="fieldworkMetric activities" href={firstVerificationFinding ? `#d6-register-${firstVerificationFinding.id}` : "#action-owner-register"}><b>{actionAccess.filter((item) => item.status === "submitted" || (item.d6_verification_requested_at && !item.d6_verification_completed_at)).length}</b><span>Auditor notifications</span><small>Open verification queue →</small></a>
                <a className="fieldworkMetric findings" href="#action-owner-register"><b>{unresolvedNonconformities.length}</b><span>Awaiting effectiveness</span><small>Review closure blockers →</small></a>
              </div>
              <section id="action-owner-register" className="fieldworkModule" style={{scrollMarginTop:24}}><div className="fieldworkHead"><div><span className="panelKicker">01 · Assigned nonconformities</span><h3>Action-owner register</h3><p>Assign access, review submitted responses and continue detailed root-cause work in the linked CAPA–8D case.</p></div><span className="countBadge">{nonconformities.length} NCs</span></div>
                {nonconformities.length ? <div className="findingList">{nonconformities.map((finding) => { const access = actionAccessByFinding.get(finding.id); const ownerEvidence = access?.status === "submitted" ? actionEvidenceByAccess.get(access.id) ?? [] : []; const rcaCase = rcaCasesById.get(finding.linked_rca_case_id); const d6Actions = (rcaActionsByCase.get(finding.linked_rca_case_id) ?? []).filter((action) => action.discipline === 5 && action.selection_status === "selected"); const d6Ready = d6Actions.length > 0 && d6Actions.every((action) => ["effective", "effective_verified"].includes(action.effectiveness_result) && action.status === "verified" && action.verified_by && action.verified_at); const d6EvidenceForCase = d6EvidenceByCase.get(finding.linked_rca_case_id) ?? []; return <article id={`action-${finding.id}`} className={`findingCard ${finding.finding_type}`} key={finding.id} style={{display:"block"}}><div><b>{finding.finding_reference}</b><h4>{finding.title}</h4><p>{finding.failure_statement || finding.objective_evidence}</p></div>
                  {access ? <div className="coming"><strong>{access.assignee_name}</strong> · {access.assignee_email}<br />Response status: {access.status.replaceAll("_", " ")}{access.submitted_at ? ` · submitted ${displayDate(access.submitted_at)}` : ""}<br />{access.correction_and_containment ? <><strong>Correction / containment:</strong> {access.correction_and_containment}<br /></> : null}{access.root_cause_response ? <><strong>Root cause:</strong> {access.root_cause_response}<br /></> : null}{access.corrective_action_plan ? <><strong>Corrective-action plan:</strong> {access.corrective_action_plan}<br /></> : null}{ownerEvidence.length ? <><strong>Implementation evidence:</strong> {ownerEvidence.map((item, index) => <span key={item.id}>{index ? " · " : ""}<a href={actionEvidenceUrls.get(item.storage_path) || "#"} target="_blank" rel="noreferrer">{item.original_file_name}</a></span>)}</> : null}</div> : null}
                  <form action={assignAuditActionOwner} style={{marginTop:16}}><input type="hidden" name="audit_id" value={id} /><input type="hidden" name="finding_id" value={finding.id} /><div className="grid2"><label className="field"><span>Action-owner name *</span><input name="assignee_name" required defaultValue={access?.assignee_name || finding.responsible_owner_name || ""} /></label><label className="field"><span>Action-owner email *</span><input name="assignee_email" type="email" required defaultValue={access?.assignee_email || finding.responsible_owner_email || ""} /><small>If this email belongs to a portal account, the action appears automatically in My Internal Audit Actions. The secure link works for external owners.</small></label></div><div className="compactAction"><button className="button secondary">{access ? "Refresh Access & Secure Link" : "Assign Owner & Create Secure Link"}</button></div></form>
                  {access?.d6_verification_requested_at ? <D6AuditorVerificationPanel auditId={id} finding={finding} access={access} actions={d6Actions} evidence={d6EvidenceForCase} evidenceUrls={d6EvidenceUrls} /> : null}
                  {access?.status === "submitted" ? <><div className={d6Ready ? "notice" : "notice error"} style={{marginTop:14}}><strong>{d6Ready ? "Final D0–D8 response ready for review." : "Final acceptance awaiting D6 effectiveness verification."}</strong> {d6Ready ? "Review the validated root cause, corrective-action plan and consolidated objective evidence in this record and the linked controlled CAPA–8D case." : "Assess every selected corrective action below. The response may be returned for revision now, but it cannot be accepted until all actions are Effective—verified."}</div><form action={reviewAuditActionResponse} style={{marginTop:16}}><input type="hidden" name="audit_id" value={id}/><input type="hidden" name="action_access_id" value={access.id}/><div className="grid3"><label className="field"><span>Auditor decision</span><select name="decision" defaultValue={d6Ready ? "accepted" : "returned"}><option value="accepted" disabled={!d6Ready}>Accept final RCA and corrective-action plan</option><option value="returned">Return complete 8D for revision</option></select></label><label className="field span2"><span>Auditor decision and rationale *</span><textarea name="auditor_response" required placeholder="Record the evidence reviewed, adequacy conclusion and any conditions for effectiveness verification."/></label></div><div className="compactAction"><button className="button approve">Record Final 8D Decision</button></div></form></> : null}
                  {rcaCase && access?.status === "submitted" ? <div style={{marginTop:14}}><Link className="button primary" href={`/portal/rca/${rcaCase.id}`}>Review Final Controlled CAPA–8D →</Link></div> : rcaCase && access ? <div className="coming" style={{marginTop:14}}><strong>8D investigation in progress.</strong><br />The final root cause, corrective-action plan and objective evidence will be released for auditor review after the action owner submits D8.</div> : null}
                </article>; })}</div> : <div className="emptyState">No Major or Minor nonconformities require action-owner assignment.</div>}
              </section>
              <div className="actionBar"><Link className="button approve" href={`/portal/internal-audits/${id}?gate=closing`}>Open Auditor Verification & Close →</Link></div>
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
              <section id="capa-effectiveness-register" className="fieldworkModule" style={{scrollMarginTop:24}}><div className="fieldworkHead"><div><span className="panelKicker">01 · Nonconformity follow-up</span><h3>CAPA–8D effectiveness register</h3><p>Review the linked investigation, corrective actions and verification evidence. Recording an action as complete does not itself prove effectiveness.</p></div><span className="countBadge">{nonconformities.length} NCs</span></div>
                {nonconformities.length ? <div className="findingList">{nonconformities.map((finding) => { const rcaCase = rcaCasesById.get(finding.linked_rca_case_id); const correctiveActions = rcaActionsByCase.get(finding.linked_rca_case_id) ?? []; const isClosed = finding.status === "closed" && finding.closure_verified; return <article id={`closure-${finding.id}`} className={`findingCard ${finding.finding_type}`} key={finding.id} style={{ display: "block", scrollMarginTop: 24 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "flex-start" }}><div><b>{finding.finding_reference}</b><h4>{finding.title}</h4><p>{finding.failure_statement || finding.objective_evidence}</p></div><span className="countBadge">{isClosed ? "Effectiveness verified" : "Verification required"}</span></div>
                  {rcaCase ? <div className="coming" style={{ marginTop: 16 }}><strong>Linked CAPA–8D: {rcaCase.case_reference}</strong><br />Status: {rcaCase.status?.replaceAll("_", " ")} · Current discipline: D{rcaCase.current_discipline ?? 0} · Controlled actions: {correctiveActions.length}<div style={{ marginTop: 12 }}><Link className="button" href={`/portal/rca/${rcaCase.id}`}>Open CAPA–8D Case →</Link></div></div> : <div className="coming" style={{ marginTop: 16 }}><strong>CAPA–8D link missing.</strong><br />This nonconformity cannot be closed until its controlled RCA case exists.</div>}
                  {!isClosed && rcaCase ? <form id={`verify-${finding.id}`} action={verifyAuditFindingEffectiveness} style={{ marginTop: 18 }}><input type="hidden" name="audit_id" value={id} /><input type="hidden" name="finding_id" value={finding.id} /><div className="grid3"><label className="field"><span>Effectiveness result *</span><select name="effectiveness_result" defaultValue="effective"><option value="effective">Effective — close finding</option><option value="partially_effective">Partially effective — keep open</option><option value="ineffective">Ineffective — return for action</option></select></label><label className="field"><span>Verification method *</span><textarea name="verification_method" required placeholder="e.g. site verification, record sample, interview, performance trend review" /></label><label className="field"><span>Auditor verification conclusion *</span><textarea name="effectiveness_conclusion" required placeholder="State the objective evidence sampled, result obtained and why recurrence risk is acceptably controlled—or why further action is required." /></label></div><label className="check"><input type="checkbox" name="human_verification" required /><span><strong>Independent human verification</strong><br />I reviewed the linked CAPA–8D record and verified this conclusion against objective evidence.</span></label><div className="compactAction"><button className="button approve">Record Effectiveness Decision</button></div></form> : null}</article>; })}</div> : <div className="emptyState">No Major or Minor nonconformities were raised during this audit.</div>}
              </section>
              {advisoryFindings.length ? <section className="fieldworkModule"><div className="fieldworkHead"><div><span className="panelKicker">02 · Advisory findings</span><h3>Observations, OFIs and positive practice</h3><p>These remain in the audit record and do not require CAPA–8D unless management formally promotes them.</p></div><span className="countBadge">{advisoryFindings.length} items</span></div><div className="findingList">{advisoryFindings.map((finding) => <article className={`findingCard ${finding.finding_type}`} key={finding.id}><div><b>{finding.finding_reference}</b><h4>{finding.title}</h4><p>{finding.objective_evidence}</p></div><span>{finding.finding_type?.replaceAll("_", " ")}</span></article>)}</div></section> : null}
              <section id="gate-07-decision" className="fieldworkGate" style={{scrollMarginTop:24}}><div><span className="panelKicker">Gate 07 decision</span><h3>Close the controlled audit</h3><p>{!reportIssued ? "The controlled report must be issued before closure." : unresolvedNonconformities.length ? `${unresolvedNonconformities.length} nonconformity record(s) still block closure. Complete and verify their linked CAPA–8D cases first.` : "The report is issued and all Major and Minor nonconformities have verified effective CAPA. The audit may now be formally closed."}</p></div><form action={completeAuditClosure}><input type="hidden" name="audit_id" value={id} /><label className="check"><input type="checkbox" name="closure_confirmation" required disabled={!reportIssued || unresolvedNonconformities.length > 0} /><span><strong>Accountable audit closure</strong><br />I confirm the report is issued, conclusions are supported, required follow-up is complete, and the audit record is ready for controlled closure.</span></label><div className="compactAction"><button className="button approve" disabled={!reportIssued || unresolvedNonconformities.length > 0}>Close Audit</button></div></form></section>
            </> : null}
          </section>
        </div>
      </div>
    </main>
  );
}

function D6AuditorVerificationPanel({ auditId, finding, access, actions, evidence, evidenceUrls }) {
  const isEffective = (action) => ["effective", "effective_verified"].includes(action.effectiveness_result);
  const closedActions = actions.filter(isEffective);
  const workingActions = actions.filter((action) => !isEffective(action));
  const requestedActions = workingActions.filter((action) => action.d6_submitted_at && (!action.effectiveness_result || action.effectiveness_result === "awaiting_verification"));
  const furtherActions = workingActions.filter((action) => ["partially_effective", "not_effective"].includes(action.effectiveness_result));
  const unableActions = workingActions.filter((action) => action.effectiveness_result === "unable_to_verify");
  const firstTarget = (items, fallback) => items.length ? `#d6-action-${items[0].id}` : fallback;
  const metricStyle = { display: "flex", flexDirection: "column", gap: 7, padding: "16px 18px", border: "1px solid #d7e3ef", borderRadius: 14, background: "#fff", color: "#102a4c", textDecoration: "none", boxShadow: "0 8px 22px #0b23420b" };
  return <section id={`d6-register-${finding.id}`} className="fieldworkModule" style={{ marginTop: 18 }}>
    <div className="fieldworkHead"><div><span className="panelKicker">D6 · Auditor effectiveness register</span><h3>{finding.finding_reference}</h3><p>A focused queue of corrective actions requiring independent verification. Verified-effective actions leave the working queue automatically and remain available in the closed archive.</p></div><span className="countBadge">{workingActions.length} open</span></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, padding: "18px 22px", background: "#f4f8fc", borderBottom: "1px solid #dce6f0" }}>
      <a href={firstTarget(requestedActions, `#d6-register-${finding.id}`)} style={{ ...metricStyle, borderColor: "#9bbcff", background: "#edf4ff" }}><strong style={{ fontSize: 25 }}>{requestedActions.length}</strong><span>Verification requested</span></a>
      <a href={firstTarget(furtherActions, `#d6-register-${finding.id}`)} style={{ ...metricStyle, borderColor: "#f4c46b", background: "#fff8e7" }}><strong style={{ fontSize: 25 }}>{furtherActions.length}</strong><span>Further action required</span></a>
      <a href={firstTarget(unableActions, `#d6-register-${finding.id}`)} style={{ ...metricStyle, borderColor: "#f2aaaa", background: "#fff1f1" }}><strong style={{ fontSize: 25 }}>{unableActions.length}</strong><span>Unable to verify</span></a>
      <a href={`#d6-closed-${finding.id}`} style={{ ...metricStyle, borderColor: "#9ed8bd", background: "#effaf4" }}><strong style={{ fontSize: 25 }}>{closedActions.length}</strong><span>Closed · effective</span></a>
    </div>
    {workingActions.length ? <div className="findingList">{workingActions.map((action) => {
      const actionEvidence = evidence.filter((item) => item.action_id === action.id);
      const statusLabel = action.d6_submitted_at && (!action.effectiveness_result || action.effectiveness_result === "awaiting_verification") ? "Verification requested" : (action.effectiveness_result || "Awaiting owner submission").replaceAll("_", " ");
      return <article id={`d6-action-${action.id}`} className="findingCard" key={action.id} style={{ display: "block", scrollMarginTop: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}><strong style={{ fontSize: 20 }}>{finding.finding_reference}</strong><span className="countBadge">{statusLabel}</span></div>
      <div className="coming" style={{ marginTop: 12 }}><strong>D5 acceptance criterion:</strong> {action.effectiveness_criteria || "Not defined"}<br /><strong>Owner implementation result:</strong> {action.implementation_result || "Not submitted"}{action.d6_submitted_at ? <><br /><strong>Verification requested:</strong> {displayDate(action.d6_submitted_at)}</> : null}</div>
      <div className={actionEvidence.length ? "coming" : "notice error"} style={{ marginTop: 12 }}>
        <strong>Objective evidence for this action ({actionEvidence.length})</strong>
        {actionEvidence.length ? <div style={{ display: "grid", gap: 10, marginTop: 10 }}>{actionEvidence.map((item) => { const evidenceUrl = evidenceUrls.get(item.storage_path); return <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", padding: 12, border: "1px solid #d7e3ef", borderRadius: 12, background: "#fff" }}><div><strong>{item.reference || "Objective evidence"}</strong>{item.description ? <div>{item.description}</div> : null}{item.evidence_date ? <small>{displayDate(item.evidence_date)}</small> : null}</div>{evidenceUrl ? <a className="button secondary" href={evidenceUrl} target="_blank" rel="noopener noreferrer">Open objective evidence ↗</a> : <span className="countBadge">File unavailable</span>}</div>; })}</div> : <div style={{ marginTop: 6 }}>No evidence is linked to this action. Select “Unable to verify—insufficient evidence” unless the action owner supplies an adequate record.</div>}
      </div>
      {action.d6_submitted_at ? <form action={verifyD6CorrectiveAction} style={{ marginTop: 16 }}>
        <input type="hidden" name="audit_id" value={auditId} /><input type="hidden" name="finding_id" value={finding.id} /><input type="hidden" name="action_access_id" value={access.id} /><input type="hidden" name="action_id" value={action.id} />
        <div className="grid2"><label className="field"><span>Auditor effectiveness decision *</span><select name="effectiveness_result" required defaultValue=""><option value="" disabled>Select decision</option><option value="effective_verified">Effective—verified</option><option value="partially_effective">Partially effective—further action required</option><option value="not_effective">Not effective—reopen corrective action</option><option value="unable_to_verify">Unable to verify—insufficient evidence</option></select></label><label className="field"><span>Verification method *</span><textarea name="effectiveness_verification_method" required defaultValue={action.effectiveness_verification_method || ""} placeholder="Record sample, observation, test, interview or performance-trend review" /></label></div>
        <label className="field"><span>Auditor conclusion and objective result *</span><textarea name="effectiveness_verification_conclusion" required defaultValue={action.effectiveness_verification_conclusion || ""} placeholder="Compare the evidence and actual result with the D5 acceptance criteria; explain the decision and required follow-up." /></label>
        <label className="check"><input type="checkbox" name="independent_verification" required /><span><strong>Independent auditor verification</strong><br />I reviewed the implementation record and objective evidence and take responsibility for this action-level conclusion.</span></label><div className="compactAction"><button className="button approve">Record D6 Effectiveness Decision</button></div>
      </form> : <div className="notice" style={{ marginTop: 12 }}>Waiting for the action owner to submit implementation and evidence.</div>}
    </article>;
    })}</div> : <div className="notice" style={{ margin: 22 }}><strong>No actions require assessment.</strong> All submitted corrective actions for this NC have been verified effective.</div>}
    <details id={`d6-closed-${finding.id}`} style={{ margin: 22, padding: 16, border: "1px solid #9ed8bd", borderRadius: 14, background: "#f4fbf7", scrollMarginTop: 24 }}><summary style={{ cursor: "pointer", fontWeight: 900 }}>Closed effectiveness decisions ({closedActions.length})</summary>{closedActions.length ? <div style={{ display: "grid", gap: 8, marginTop: 12 }}>{closedActions.map((action) => <div key={action.id} style={{ display: "flex", justifyContent: "space-between", padding: 12, borderRadius: 10, background: "#fff" }}><strong>{finding.finding_reference}</strong><span>Effective—verified {action.verified_at ? `· ${displayDate(action.verified_at)}` : ""}</span></div>)}</div> : <p>No closed actions recorded.</p>}</details>
  </section>;
}
