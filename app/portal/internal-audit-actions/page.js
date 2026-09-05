import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import { createAdminClient } from "../../../lib/supabase/admin";
import { submitPortalAuditAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AssignedAuditActionsPage({ searchParams }) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/internal-audit-actions");
  const admin = createAdminClient();
  const { data: assignmentRows, error } = await admin.from("internal_audit_action_access")
    .select("*, internal_audit_findings(finding_reference, finding_type, risk_level, title, failure_statement, criteria, objective_evidence, process_area, agreed_date), internal_audits(audit_reference, title)")
    .eq("assignee_user_id", user.id).order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  const assignments = (assignmentRows ?? []).filter((row) => row && row.id).map((row) => ({
    ...row,
    id: String(row.id),
    status: typeof row.status === "string" && row.status.trim() ? row.status : "assigned",
    correction_and_containment: row.correction_and_containment ?? "",
    root_cause_response: row.root_cause_response ?? "",
    extent_and_systemic_review: row.extent_and_systemic_review ?? "",
    corrective_action_plan: row.corrective_action_plan ?? "",
    effectiveness_measure: row.effectiveness_measure ?? "",
    owner_submission_notes: row.owner_submission_notes ?? "",
    auditor_response: row.auditor_response ?? "",
    internal_audit_findings: row.internal_audit_findings ?? {},
    internal_audits: row.internal_audits ?? {},
  }));
  return <main className="actionsPage"><style>{`
    *{box-sizing:border-box}.actionsPage{min-height:100vh;padding:28px clamp(16px,4vw,64px) 70px;background:linear-gradient(180deg,#edf4fb,#f8fafc);color:#061a35}.shell{max-width:1350px;margin:auto}.top{display:flex;align-items:center;justify-content:space-between;gap:20px}.back{padding:11px 15px;border:1px solid #cad8e6;border-radius:10px;background:#fff;color:#061a35;text-decoration:none;font-weight:900}.hero{margin-top:18px;padding:30px;border-radius:22px;background:linear-gradient(125deg,#061a35,#0b4477);color:#fff}.hero small{color:#54ddd5;font-weight:900;letter-spacing:.1em;text-transform:uppercase}.hero h1{margin:8px 0 5px;font-size:36px}.hero p{margin:0;color:#d4e2f1}.notice{margin:18px 0;padding:14px 17px;border-radius:12px;background:#e8f8ef;color:#07613a;font-weight:850}.notice.error{background:#fff3e2;color:#844800}.list{display:grid;gap:18px;margin-top:20px}.card{padding:24px;border:1px solid #d4e0ec;border-radius:18px;background:#fff;box-shadow:0 14px 32px #061a3510}.head{display:flex;justify-content:space-between;gap:20px}.head h2{margin:5px 0}.badge{height:max-content;padding:7px 10px;border-radius:999px;background:#eaf1ff;color:#1557cb;font-size:12px;font-weight:900}.locked{margin:16px 0;padding:17px;border-left:4px solid #1761e8;border-radius:10px;background:#f4f8fd}.locked h3{margin:12px 0 4px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.field{display:flex;flex-direction:column;gap:7px}.field span{font-size:13px;font-weight:850}.field textarea,.field input{width:100%;min-height:48px;padding:12px;border:1px solid #cbd8e6;border-radius:10px;font:inherit}.field textarea{min-height:115px;resize:vertical}.wide{grid-column:1/-1}.button{margin-top:18px;min-height:48px;padding:0 20px;border:0;border-radius:10px;background:#1761e8;color:#fff;font:inherit;font-weight:900;cursor:pointer}.empty{margin-top:20px;padding:40px;border:1px dashed #b8c9dc;border-radius:16px;background:#fff;color:#61738b;text-align:center}@media(max-width:700px){.grid{grid-template-columns:1fr}.wide{grid-column:auto}.head,.top{align-items:flex-start;flex-direction:column}}
  `}</style><div className="shell"><div className="top"><strong>RPG Excellence</strong><Link className="back" href="/portal">← Portal</Link></div><header className="hero"><small>Controlled action-owner workspace</small><h1>My Internal Audit Actions</h1><p>Respond to assigned nonconformities and provide implementation evidence for independent auditor verification.</p></header>
  {query?.saved ? <div className="notice">Your response has been submitted to the auditor.</div> : null}{query?.error === "incomplete" ? <div className="notice error">Complete correction/containment, root cause, corrective-action plan and effectiveness measure.</div> : null}{query?.error === "file_size" ? <div className="notice error">The evidence file exceeds 10 MB.</div> : null}
  {assignments.length ? <div className="list">{assignments.map((access) => { const finding = access.internal_audit_findings; const audit = access.internal_audits; return <article className="card" id={`action-${access.id}`} key={access.id}><div className="head"><div><small>{audit.audit_reference || "Internal audit"} · {finding.finding_reference || "Corrective action"}</small><h2>{finding.title || "Assigned corrective action"}</h2></div><span className="badge">{access.status.replaceAll("_", " ")}</span></div><div className="locked"><strong>Auditor-controlled record — read only</strong><h3>Statement of nonconformity</h3><p>{finding.failure_statement || "Not recorded"}</p><h3>Requirement</h3><p>{finding.criteria || "Not recorded"}</p><h3>Objective evidence</h3><p>{finding.objective_evidence || "Not recorded"}</p></div>{access.auditor_response ? <div className={`notice ${access.status === "returned" ? "error" : ""}`}><strong>Auditor response:</strong> {access.auditor_response}</div> : null}<form action={submitPortalAuditAction}><input type="hidden" name="action_access_id" value={access.id} /><div className="grid"><label className="field"><span>Correction and immediate containment *</span><textarea name="correction_and_containment" required defaultValue={access.correction_and_containment} /></label><label className="field"><span>Root-cause response *</span><textarea name="root_cause_response" required defaultValue={access.root_cause_response} /></label><label className="field"><span>Extent and systemic review</span><textarea name="extent_and_systemic_review" defaultValue={access.extent_and_systemic_review} /></label><label className="field"><span>Corrective-action plan *</span><textarea name="corrective_action_plan" required defaultValue={access.corrective_action_plan} /></label><label className="field wide"><span>Effectiveness measure and acceptance criteria *</span><textarea name="effectiveness_measure" required defaultValue={access.effectiveness_measure} /></label><label className="field"><span>Implementation evidence</span><input type="file" name="evidence_file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.docx,.xlsx" /></label><label className="field"><span>Evidence description</span><input name="evidence_description" /></label><label className="field wide"><span>Submission notes</span><textarea name="owner_submission_notes" defaultValue={access.owner_submission_notes} /></label></div><button className="button">Submit Response to Auditor</button></form></article>; })}</div> : <div className="empty">No internal-audit corrective actions are assigned to this portal account.</div>}
  </div></main>;
}
