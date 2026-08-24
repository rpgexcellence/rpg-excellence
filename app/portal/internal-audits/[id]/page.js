import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "../../../../lib/supabase/server";
import { addAuditTeamMember, approveAuditTeam, saveAuditScope } from "./actions";

const GATES = [
  ["scope", "01", "Scope"],
  ["team", "02", "Team"],
  ["plan", "03", "Plan"],
  ["fieldwork", "04", "Fieldwork"],
  ["closing", "05", "Close"],
];

const ROLE_LABELS = {
  lead_auditor: "Lead auditor",
  auditor: "Auditor",
  technical_expert: "Technical expert",
  observer: "Observer",
  trainee: "Trainee auditor",
  independent_reviewer: "Independent reviewer",
};

function displayDate(value) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}

export default async function InternalAuditWorkspace({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/portal/login?next=/portal/internal-audits/${id}`);

  const [auditResult, teamResult] = await Promise.all([
    supabase.from("internal_audits").select(`
      *,
      internal_audit_selected_standards(
        id, full_or_partial, included_clauses, excluded_clauses,
        internal_audit_standard_catalogue(display_name, discipline)
      )
    `).eq("id", id).eq("owner_id", user.id).maybeSingle(),
    supabase.from("internal_audit_team_members").select("*")
      .eq("audit_id", id).eq("owner_id", user.id).order("created_at"),
  ]);

  if (auditResult.error) throw new Error(auditResult.error.message);
  if (!auditResult.data) notFound();
  if (teamResult.error) throw new Error(teamResult.error.message);

  const audit = auditResult.data;
  const team = teamResult.data ?? [];
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

  const scopeComplete = Boolean(audit.scope_approved);
  const teamComplete = ["plan", "notification", "fieldwork", "findings", "closing", "report", "follow_up", "closure"].includes(audit.current_gate);
  const requested = typeof query?.gate === "string" ? query.gate : audit.current_gate;
  const gate = requested === "team" && scopeComplete ? "team"
    : requested === "plan" && teamComplete ? "plan"
      : requested === "scope" ? "scope"
        : audit.current_gate === "team" && scopeComplete ? "team"
          : teamComplete ? "plan" : "scope";

  return (
    <main className="workspacePage">
      <style>{`
        :root{--navy:#061a35;--blue:#1761e8;--cyan:#35d7d0;--muted:#667990;--line:#dbe5f0;--soft:#f4f7fb;--green:#087a4b}
        *{box-sizing:border-box}.workspacePage{min-height:100vh;padding:25px clamp(16px,4vw,64px) 80px;background:linear-gradient(180deg,#eef4fb,#f8fafc 520px);color:var(--navy)}.workspaceShell{max-width:1720px;margin:auto}
        .workspaceTop{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:20px}.workspaceLogo{display:block;object-fit:contain}.workspaceBack{padding:12px 17px;border:1px solid #cfdae7;border-radius:12px;background:#fff;color:var(--navy);font-weight:900;text-decoration:none}
        .auditHeader{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:28px;align-items:end;padding:30px 34px;border-radius:24px;background:linear-gradient(120deg,#061a35,#0b3566);color:#fff;box-shadow:0 20px 55px #061a3524}.auditEyebrow{color:var(--cyan);font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.auditHeader h1{margin:8px 0 9px;color:#fff!important;-webkit-text-fill-color:#fff!important;font-size:clamp(32px,4vw,54px);line-height:1.03}.auditMeta{color:#cad9ea;line-height:1.55}.auditStandard{max-width:460px;padding:16px 19px;border:1px solid #ffffff29;border-radius:16px;background:#ffffff10;color:#e6eff9;font-size:14px;line-height:1.5}
        .notice{margin:18px 0;padding:14px 18px;border:1px solid #9bdab9;border-radius:13px;background:#e9f8ef;color:#075f39;font-weight:850}.gateNav{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin:18px 0}.gate{display:flex;gap:11px;align-items:center;min-height:70px;padding:14px;border:1px solid var(--line);border-radius:14px;background:#fff;color:var(--navy);text-decoration:none}.gate b{display:grid;width:32px;height:32px;place-items:center;border-radius:50%;background:#eaf1ff;color:var(--blue);font-size:11px}.gate span strong,.gate span small{display:block}.gate span small{margin-top:3px;color:var(--muted);font-size:11px}.gate.active{border-color:var(--blue);background:#1761e8;color:#fff;box-shadow:0 12px 28px #1761e82c}.gate.active b{background:#fff;color:var(--blue)}.gate.active small{color:#dbe8ff}.gate.locked{pointer-events:none;opacity:.48;background:#eef2f7}
        .workspaceGrid{display:grid;grid-template-columns:270px minmax(0,1fr);overflow:hidden;border:1px solid var(--line);border-radius:24px;background:#fff;box-shadow:0 18px 50px #061a3510}.sideRail{padding:27px 22px;border-right:1px solid #e4ebf3;background:#f7f9fc}.railLabel{color:#718298;font-size:11px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}.railMetric{margin:8px 0 24px;font-size:34px;font-weight:950}.railBlock{margin-top:18px;padding-top:18px;border-top:1px solid #dfe7f0}.railBlock strong,.railBlock span{display:block}.railBlock span{margin-top:5px;color:var(--muted);font-size:12px;line-height:1.5}.mainPanel{padding:34px}.panelKicker{color:var(--blue);font-size:12px;font-weight:900;letter-spacing:.11em;text-transform:uppercase}.mainPanel h2{margin:7px 0 6px;font-size:31px}.panelLead{margin:0 0 28px;color:var(--muted);line-height:1.55}
        .section{margin-top:28px;padding-top:27px;border-top:1px solid #e3eaf2}.section h3{margin:0 0 16px;font-size:18px}.grid2,.grid3{display:grid;gap:16px}.grid2{grid-template-columns:repeat(2,minmax(0,1fr))}.grid3{grid-template-columns:repeat(3,minmax(0,1fr))}.field{display:flex;flex-direction:column;gap:7px}.field span{color:#2d4562;font-size:13px;font-weight:850}.field input,.field select,.field textarea{width:100%;min-height:49px;padding:12px 13px;border:1px solid #cbd8e6;border-radius:10px;background:#fff;color:#102944;font:inherit;font-size:14px}.field textarea{min-height:112px;resize:vertical;line-height:1.5}.field input:focus,.field select:focus,.field textarea:focus{outline:0;border-color:var(--blue);box-shadow:0 0 0 4px #1761e817}.check{display:flex;gap:10px;align-items:flex-start;padding:13px;border:1px solid #d5e0ec;border-radius:11px;background:#f8fafd;color:#314a67;font-size:13px;line-height:1.4}.check input{width:18px;height:18px;accent-color:var(--blue)}
        .actionBar{display:flex;justify-content:flex-end;gap:12px;margin-top:25px;padding:17px;border-radius:14px;background:#071d39}.button{min-height:47px;padding:0 19px;border:0;border-radius:10px;font:inherit;font-weight:900;cursor:pointer}.button.secondary{background:#eaf1ff;color:#164fba}.button.primary{background:linear-gradient(135deg,#1761e8,#0d4ec8);color:#fff}.button.approve{background:#07824d;color:#fff}.teamList{display:grid;gap:11px;margin-bottom:22px}.teamCard{display:grid;grid-template-columns:minmax(0,1fr) 190px 190px;gap:15px;align-items:center;padding:16px;border:1px solid #d8e3ee;border-radius:13px;background:#f8fafd}.teamCard strong,.teamCard small{display:block}.teamCard small{margin-top:3px;color:var(--muted)}.confirmation{color:var(--green);font-size:12px;font-weight:850}.warning{color:#9a5700;font-size:12px;font-weight:850}.planPreview{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.previewCard{padding:20px;border:1px solid #d7e2ed;border-radius:14px;background:#f8fafd}.previewCard b,.previewCard span{display:block}.previewCard b{color:var(--blue)}.previewCard span{margin-top:8px;color:var(--muted);line-height:1.5}.coming{margin-top:24px;padding:20px;border:1px solid #efd18c;border-radius:14px;background:#fff8e7;color:#6a4c08;line-height:1.55}
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
        .field{position:relative;padding:14px;border:1px solid #dde6ef;border-radius:14px;background:#fff;transition:.2s ease}.field:hover{border-color:#b7cce2;box-shadow:0 10px 24px #071d3909}.field span{font-size:12px;letter-spacing:.015em}.field input,.field select,.field textarea{padding:8px 0;border:0;border-radius:0;background:transparent}.field input:focus,.field select:focus,.field textarea:focus{border:0;box-shadow:none}.field textarea{min-height:88px}
        .check{min-height:116px;align-items:center;padding:18px;border-radius:14px;background:linear-gradient(135deg,#edf8f4,#f6fbf9)}
        .actionBar{position:sticky;bottom:16px;z-index:12;align-items:center;margin:26px 0 0;padding:14px 16px;border:1px solid #ffffff25;border-radius:16px;background:#061a35f5;box-shadow:0 18px 42px #061a3540;backdrop-filter:blur(12px)}
        .actionBar:before{content:"Controlled decision";margin-right:auto;color:#9cb3cd;font-size:11px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
        .button{transition:transform .18s ease,box-shadow .18s ease}.button:hover{transform:translateY(-2px);box-shadow:0 9px 20px #0003}.button.approve{background:linear-gradient(135deg,#07945a,#057444)}
        .teamList,.planPreview,.coming{margin-left:34px;margin-right:34px}.teamList+.coming{margin-top:0}.teamCard{background:linear-gradient(145deg,#f8fbff,#f1f6fb)}
        @media(max-width:1050px){.auditHeader{grid-template-columns:1fr}.sideRail{grid-template-columns:repeat(2,1fr)}.sideRail>.railMetric{min-height:82px}.railBlock{border-top:1px solid #e2e9f1}.gateNav{grid-template-columns:repeat(5,200px);overflow-x:auto}.teamCard{grid-template-columns:1fr 1fr}.grid3{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:700px){.workspacePage{padding:14px 10px 60px}.workspaceLogo{width:185px;height:auto}.auditHeader{padding:25px 21px}.auditHeader h1{font-size:34px}.sideRail{grid-template-columns:1fr 1fr}.sideRail>.railMetric,.railBlock{padding:16px}.mainPanel>div.panelKicker,.mainPanel>h2,.mainPanel>p.panelLead,.teamList,.planPreview,.coming{margin-left:18px;margin-right:18px}.mainPanel>div.panelKicker{padding-top:24px}.mainPanel form{padding:0 18px 24px}.mainPanel form>.grid2,.section{padding:14px}.auditStandard,.grid2,.grid3,.planPreview,.teamCard{grid-template-columns:1fr}.actionBar{position:static;align-items:stretch;flex-direction:column}.actionBar:before{margin:0 0 4px}.button{width:100%}}
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

        <nav className="gateNav" aria-label="Audit lifecycle">
          {GATES.map(([key, number, label], index) => {
            const unlocked = index === 0 || (index === 1 && scopeComplete) || (index === 2 && teamComplete);
            const complete = key === "scope" ? scopeComplete : key === "team" ? teamComplete : false;
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
              <form action={approveAuditTeam}><input type="hidden" name="audit_id" value={id} /><div className="actionBar"><button className="button approve">Human Approve Team & Unlock Audit Plan →</button></div></form>
            </> : null}

            {gate === "plan" ? <>
              <div className="panelKicker">Gate 03 · Risk-based audit planning</div><h2>Design the audit plan</h2><p className="panelLead">The approved scope and team are now controlled. Build sampling, agenda, notification and auditee coordination before fieldwork.</p>
              <div className="planPreview"><div className="previewCard"><b>Sampling strategy</b><span>Prioritise significant risks, changes, previous findings and weak performance signals.</span></div><div className="previewCard"><b>Audit agenda</b><span>Allocate processes, interviews, site activity and document review to competent team members.</span></div><div className="previewCard"><b>Notification</b><span>Issue a controlled audit notification covering scope, criteria, timing, team and requested information.</span></div></div>
              <div className="coming"><strong>Gate unlocked successfully.</strong><br />The next deployment adds the interactive schedule, sampling plan, notification email and formal plan approval controls.</div>
            </> : null}
          </section>
        </div>
      </div>
    </main>
  );
}
