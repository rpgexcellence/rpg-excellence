import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "../../../lib/supabase/server";
import { createInternalAudit } from "./actions";

const STATUS_LABELS = {
  draft: "Draft", scope_review: "Scope review", team_assignment: "Team assignment",
  plan_review: "Plan review", scheduled: "Scheduled", notification_sent: "Notification sent",
  documents_requested: "Documents requested", fieldwork: "Fieldwork", team_review: "Team review",
  technical_review: "Technical review", closing_meeting: "Closing meeting", report_draft: "Report draft",
  report_approved: "Report approved", capa_monitoring: "CAPA monitoring",
  effectiveness_review: "Effectiveness review", closed: "Closed", cancelled: "Cancelled",
};

const TYPE_LABELS = {
  internal_system: "Internal system audit", internal_process: "Internal process audit",
  internal_compliance: "Internal compliance audit", supplier: "Supplier audit",
  second_party: "Second-party audit", follow_up: "Follow-up audit", integrated: "Integrated audit",
};

const LIFECYCLE = [
  ["01", "Scope", "Purpose, boundaries and criteria"],
  ["02", "Team", "Competence and independence"],
  ["03", "Plan", "Sampling, agenda and notification"],
  ["04", "Fieldwork", "Evidence, interviews and findings"],
  ["05", "Close", "Review, report, CAPA and verification"],
];

function formatDate(value) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .format(new Date(value));
}

function StatCard({ label, value, detail, tone = "blue" }) {
  return <div className="stat"><i className={tone} /><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

export default async function InternalAuditCommandCentre({ searchParams }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/internal-audits");

  const [organizationsResult, standardsResult, auditsResult, findingsResult] = await Promise.all([
    supabase.from("organizations").select("id, name").eq("owner_id", user.id).order("name"),
    supabase.from("internal_audit_standard_catalogue")
      .select("id, display_name, discipline, standard_code").eq("active", true)
      .neq("standard_code", "ISO 19011").order("display_name"),
    supabase.from("internal_audits").select(`
      id, audit_reference, title, audit_type, audit_method, status, current_gate,
      planned_start_at, planned_end_at, updated_at,
      internal_audit_selected_standards (
        internal_audit_standard_catalogue (display_name)
      )
    `).eq("owner_id", user.id).order("updated_at", { ascending: false }).limit(30),
    supabase.from("internal_audit_findings").select("id, status, finding_type")
      .eq("owner_id", user.id).neq("status", "closed").neq("status", "withdrawn"),
  ]);

  for (const result of [organizationsResult, standardsResult, auditsResult, findingsResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  const organizations = organizationsResult.data ?? [];
  const standards = standardsResult.data ?? [];
  const audits = auditsResult.data ?? [];
  const openFindings = findingsResult.data ?? [];
  const activeAudits = audits.filter((a) => !["closed", "cancelled"].includes(a.status)).length;
  const scheduledAudits = audits.filter((a) => ["scheduled", "notification_sent", "documents_requested"].includes(a.status)).length;
  const fieldworkAudits = audits.filter((a) => ["fieldwork", "team_review", "technical_review"].includes(a.status)).length;

  return (
    <main className="auditPage">
      <style>{`
        :root{--navy:#061a35;--blue:#1761e8;--muted:#61738b;--line:#dce5ef;--soft:#f4f7fb}
        *{box-sizing:border-box}.auditPage{min-height:100vh;padding:30px clamp(18px,4vw,70px) 90px;background:linear-gradient(180deg,#edf3fa,#f8fafc 520px);color:var(--navy)}
        .shell{max-width:1680px;margin:auto}.top{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-bottom:28px}.logo{display:block;object-fit:contain;object-position:left}
        .back{padding:13px 18px;border:1px solid #cfd9e5;border-radius:13px;background:#fff;color:var(--navy);font-weight:800;text-decoration:none;box-shadow:0 8px 30px #071b360d}
        .hero{position:relative;overflow:hidden;display:grid;grid-template-columns:minmax(0,1.5fr) minmax(320px,.5fr);gap:35px;padding:46px 48px;border-radius:30px;background:linear-gradient(118deg,#061a35,#0a2b55 68%,#0d3c72);color:#fff;box-shadow:0 28px 70px #061a352e}
        .hero:after{content:"";position:absolute;width:450px;height:450px;right:-150px;top:-250px;border:1px solid #42e8db2e;border-radius:50%;box-shadow:0 0 0 70px #42e8db0a,0 0 0 140px #42e8db08}
        .kicker{color:#52e5da;font-size:12px;font-weight:900;letter-spacing:.13em;text-transform:uppercase}.hero h1{max-width:1000px;margin:13px 0 16px;font-size:clamp(42px,5vw,74px);line-height:.98;letter-spacing:-.045em}.hero p{max-width:900px;margin:0;color:#d8e5f5;font-size:19px;line-height:1.65}
        .assurance{position:relative;z-index:1;display:flex;flex-direction:column;justify-content:space-between;padding:24px;border:1px solid #ffffff24;border-radius:20px;background:#ffffff12;backdrop-filter:blur(10px)}.assurance span{color:#b8cae1;font-size:12px;font-weight:900;letter-spacing:.09em;text-transform:uppercase}.assurance strong{font-size:46px}.assurance small{color:#e3edf9;line-height:1.5}
        .success{margin-top:20px;padding:16px 20px;border:1px solid #a5ddc0;border-radius:14px;background:#e9f8ef;color:#075d36;font-weight:800}
        .stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin:22px 0}.stat{position:relative;overflow:hidden;padding:22px 24px;border:1px solid var(--line);border-radius:19px;background:#fff;box-shadow:0 12px 36px #061a350e}.stat i{position:absolute;inset:0 auto 0 0;width:5px;background:var(--blue)}.stat i.cyan{background:#16b8b0}.stat i.amber{background:#f0a51a}.stat i.red{background:#e05252}.stat span{display:block;color:#607089;font-size:12px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.stat strong{display:block;margin-top:4px;font-size:38px;line-height:1.1}.stat small{color:#7a899d}
        .lifecycle{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:1px;overflow:hidden;margin-bottom:22px;border:1px solid var(--line);border-radius:19px;background:var(--line);box-shadow:0 12px 34px #061a350a}.life{display:flex;gap:13px;min-height:92px;padding:19px;background:#fff}.life b{display:flex;width:34px;height:34px;flex:0 0 34px;align-items:center;justify-content:center;border-radius:50%;background:#eaf1ff;color:var(--blue);font-size:11px}.life strong,.life small{display:block}.life strong{margin:2px 0 4px}.life small{color:var(--muted);line-height:1.35}
        .panel{overflow:hidden;margin-bottom:24px;border:1px solid var(--line);border-radius:25px;background:#fff;box-shadow:0 18px 55px #061a3511}.panelHead{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;padding:30px 34px;border-bottom:1px solid #e7edf4;background:linear-gradient(110deg,#fff,#f7faff)}.panelHead .mini,.portfolio .mini{color:var(--blue);font-size:12px;font-weight:900;letter-spacing:.11em;text-transform:uppercase}.panelHead h2,.portfolio h2{margin:7px 0 5px;font-size:30px;letter-spacing:-.025em}.panelHead p{margin:0;color:var(--muted)}.badge{padding:9px 13px;border-radius:999px;background:#eaf8f6;color:#08736c;font-size:12px;font-weight:900;white-space:nowrap}
        .create{display:grid;grid-template-columns:250px minmax(0,1fr)}.rail{padding:30px 24px;border-right:1px solid #e6edf5;background:#f7f9fc}.railTitle{margin-bottom:19px;color:#708096;font-size:11px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}.railItem{display:flex;gap:12px;margin-bottom:20px;color:#6b7c91}.railItem:first-of-type{color:var(--navy)}.railNo{display:flex;width:26px;height:26px;flex:0 0 26px;align-items:center;justify-content:center;border:1px solid #ccd8e6;border-radius:50%;background:#fff;font-size:11px;font-weight:900}.railItem:first-of-type .railNo{border-color:var(--blue);background:var(--blue);color:#fff;box-shadow:0 0 0 5px #e5eeff}.railItem strong,.railItem small{display:block}.railItem strong{font-size:14px}.railItem small{margin-top:2px;font-size:12px;line-height:1.35}
        .form{padding:32px 34px 36px}.sectionTitle{display:flex;align-items:center;gap:12px;margin:4px 0 18px;font-size:17px;font-weight:900}.sectionTitle b{display:flex;width:28px;height:28px;align-items:center;justify-content:center;border-radius:8px;background:#e9f0ff;color:var(--blue);font-size:12px}.grid2,.grid3{display:grid;gap:17px}.grid2{grid-template-columns:repeat(2,minmax(0,1fr))}.grid3{grid-template-columns:repeat(3,minmax(0,1fr))}
        .field{display:flex;flex-direction:column;gap:8px;min-width:0}.field>span{color:#263d5b;font-size:13px;font-weight:850}.field input,.field select,.field textarea{width:100%;min-height:50px;margin:0;padding:13px 14px;border:1px solid #cbd7e5;border-radius:11px;outline:0;background:#fff;color:#102944;font:inherit;font-size:15px;transition:.18s}.field textarea{min-height:112px;resize:vertical;line-height:1.5}.field input:focus,.field select:focus,.field textarea:focus{border-color:var(--blue);box-shadow:0 0 0 4px #1761e81c}.field input::placeholder,.field textarea::placeholder{color:#91a0b2}.divider{height:1px;margin:30px 0;background:#e4eaf1}
        .standards{margin:0;padding:0;border:0}.standards legend{width:100%;padding:0}.standardGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.standard{display:flex;gap:14px;min-height:82px;padding:17px;border:1px solid #d5e0ec;border-radius:14px;background:#f8fafd;cursor:pointer;transition:.18s}.standard:hover{transform:translateY(-2px);border-color:#9fb9e7;box-shadow:0 10px 24px #11478e14}.standard:has(input:checked){border-color:var(--blue);background:#eef4ff;box-shadow:inset 0 0 0 1px var(--blue)}.standard input{width:19px;height:19px;flex:0 0 19px;accent-color:var(--blue)}.standard strong,.standard small{display:block}.standard small{margin-top:5px;color:var(--muted);line-height:1.35}
        .actionBar{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-top:26px;padding:19px 20px;border-radius:16px;background:#071d39;color:#fff}.actionBar p{margin:0;color:#cbd9e9;font-size:13px;line-height:1.45}.submit{min-height:50px;padding:0 22px;border:0;border-radius:11px;background:linear-gradient(135deg,#1761e8,#0d4ec8);color:#fff;font:inherit;font-weight:900;cursor:pointer;box-shadow:0 12px 28px #1761e842;white-space:nowrap}.empty{margin:30px;padding:20px;border:1px solid #efd18c;border-radius:14px;background:#fff8e8;color:#6f5005}
        .portfolio{padding:28px 32px 20px}.audit{display:grid;grid-template-columns:minmax(270px,1.5fr) minmax(200px,1fr) 150px 140px;gap:20px;align-items:center;padding:22px 32px;border-top:1px solid #e5ebf2;transition:.18s}.audit:hover{background:#f8faff}.auditTitle{display:block;margin-bottom:5px;font-size:17px}.muted{color:var(--muted);font-size:13px;line-height:1.45}.criteria{color:#3b526e;font-size:14px;line-height:1.45}.status{display:inline-block;padding:7px 10px;border-radius:999px;background:#eaf1ff;color:#1455c8;font-size:12px;font-weight:900}.noAudits{padding:32px;border-top:1px solid #e5ebf2;color:var(--muted)}
        @media(max-width:1100px){.hero{grid-template-columns:1fr}.assurance{min-height:165px}.stats{grid-template-columns:repeat(2,1fr)}.lifecycle{grid-template-columns:repeat(5,220px);overflow-x:auto}.create{grid-template-columns:1fr}.rail{display:none}.grid3{grid-template-columns:repeat(2,1fr)}.audit{grid-template-columns:1fr 1fr}}
        @media(max-width:720px){.auditPage{padding:20px 14px 70px}.hero{padding:30px 24px;border-radius:22px}.hero h1{font-size:43px}.stats,.grid2,.grid3,.standardGrid,.audit{grid-template-columns:1fr}.panelHead,.form{padding:24px 20px}.actionBar{align-items:stretch;flex-direction:column}.submit{width:100%}.logo{width:190px;height:auto}.back{font-size:13px}}
      `}</style>

      <div className="shell">
        <div className="top">
          <Link href="/portal" aria-label="RPG Excellence portal"><Image className="logo" src="/rpg-excellence-logo.png" alt="RPG Excellence" width={250} height={68} priority /></Link>
          <Link href="/portal" className="back">← Customer Portal</Link>
        </div>

        <section className="hero">
          <div><div className="kicker">RPG Audit Intelligence</div><h1>Internal Audit Command Centre</h1><p>Replace disconnected spreadsheets with one governed workspace for risk-based planning, competent audit teams, objective evidence, findings, CAPA and accountable closure.</p></div>
          <div className="assurance"><span>Audit governance framework</span><strong>ISO 19011</strong><small>Independence · evidence-based decisions · due professional care · confidentiality · risk-based assurance</small></div>
        </section>

        {params?.created ? <div className="success">✓ Audit created. The controlled scope record is ready for review.</div> : null}

        <section className="stats">
          <StatCard label="Active audits" value={activeAudits} detail="Across the controlled lifecycle" />
          <StatCard label="Scheduled" value={scheduledAudits} detail="Approved and awaiting delivery" tone="cyan" />
          <StatCard label="Fieldwork" value={fieldworkAudits} detail="Evidence gathering and review" tone="amber" />
          <StatCard label="Open findings" value={openFindings.length} detail="Requiring controlled resolution" tone="red" />
        </section>

        <section className="lifecycle" aria-label="Internal audit lifecycle">
          {LIFECYCLE.map(([n, title, detail]) => <div className="life" key={n}><b>{n}</b><div><strong>{title}</strong><small>{detail}</small></div></div>)}
        </section>

        <section className="panel">
          <div className="panelHead"><div><div className="mini">Launch a controlled audit</div><h2>Build the audit mandate</h2><p>Define why the audit matters, where assurance is needed and which criteria apply.</p></div><div className="badge">Risk-based scope design</div></div>

          {organizations.length === 0 ? <div className="empty">Create an organisation in the Customer Portal before starting an internal audit.</div> : (
            <div className="create">
              <aside className="rail"><div className="railTitle">Controlled setup</div>{[
                ["1","Mandate","Purpose, type and timing"],["2","Boundaries","Processes and locations"],["3","Criteria","Standards and obligations"],["4","Governance","Team and plan review next"]
              ].map(([n,t,d]) => <div className="railItem" key={n}><span className="railNo">{n}</span><span><strong>{t}</strong><small>{d}</small></span></div>)}</aside>

              <form className="form" action={createInternalAudit}>
                <div className="sectionTitle"><b>1</b>Audit mandate</div>
                <div className="grid3">
                  <label className="field"><span>Organisation *</span><select name="organization_id" required defaultValue=""><option value="" disabled>Select organisation</option>{organizations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
                  <label className="field"><span>Audit title *</span><input name="title" required placeholder="e.g. Integrated UK Operations Audit" /></label>
                  <label className="field"><span>Audit type *</span><select name="audit_type" defaultValue="internal_system">{Object.entries(TYPE_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>
                  <label className="field"><span>Delivery method *</span><select name="audit_method" defaultValue="onsite"><option value="onsite">On-site</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option></select></label>
                  <label className="field"><span>Planned start *</span><input name="planned_start_at" type="datetime-local" required /></label>
                  <label className="field"><span>Planned end *</span><input name="planned_end_at" type="datetime-local" required /></label>
                </div>

                <div className="divider" /><div className="sectionTitle"><b>2</b>Assurance purpose and boundaries</div>
                <div className="grid2">
                  <label className="field"><span>Audit purpose *</span><textarea name="purpose" required placeholder="Why is the audit being conducted and what assurance must it provide?" /></label>
                  <label className="field"><span>Initial scope *</span><textarea name="scope_statement" required placeholder="Define included processes, functions, locations, activities and boundaries." /></label>
                  <label className="field"><span>Audit objectives</span><textarea name="objectives" placeholder="What must the audit determine, verify or evaluate?" /></label>
                  <label className="field"><span>Known risks, changes and prior signals</span><textarea name="known_risks_changes" placeholder="Significant change, incidents, complaints, poor performance, recurring findings or emerging risk." /></label>
                </div>
                <div className="grid3" style={{marginTop:"17px"}}>
                  <label className="field"><span>Sites and locations</span><input name="sites" placeholder="e.g. Cambridge, Port Talbot" /></label>
                  <label className="field"><span>Functions and departments</span><input name="departments" placeholder="e.g. Operations, QHSE, Procurement" /></label>
                  <label className="field"><span>Processes in scope</span><input name="processes" placeholder="e.g. Design, delivery, calibration" /></label>
                  <label className="field"><span>Primary auditee contact</span><input name="auditee_contact_name" placeholder="Full name" /></label>
                  <label className="field"><span>Auditee email</span><input name="auditee_contact_email" type="email" placeholder="name@example.com" /></label>
                </div>

                <div className="divider" />
                <fieldset className="standards"><legend><div className="sectionTitle"><b>3</b>Audit standards and criteria</div></legend><div className="standardGrid">{standards.map((s) => <label className="standard" key={s.id}><input type="checkbox" name="standard_ids" value={s.id} /><span><strong>{s.display_name}</strong><small>{s.discipline}</small></span></label>)}</div></fieldset>
                <div className="actionBar"><p><strong>Next:</strong> confirm detailed clauses, appoint an independent and competent audit team, then approve the risk-based audit plan.</p><button className="submit" type="submit">Create Audit & Open Scope Review →</button></div>
              </form>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="portfolio"><div className="mini">Live assurance portfolio</div><h2>Recent audits</h2></div>
          {audits.length === 0 ? <div className="noAudits">No internal audits have been created yet. Your first governed audit will appear here.</div> : audits.map((audit) => {
            const criteria = (audit.internal_audit_selected_standards ?? []).map((row) => row.internal_audit_standard_catalogue?.display_name).filter(Boolean);
            return <article className="audit" key={audit.id}><div><strong className="auditTitle">{audit.audit_reference} · {audit.title}</strong><span className="muted">{TYPE_LABELS[audit.audit_type] ?? audit.audit_type} · {audit.audit_method}</span></div><div className="criteria">{criteria.join(" · ") || "Criteria awaiting confirmation"}</div><div><span className="status">{STATUS_LABELS[audit.status] ?? audit.status}</span><div className="muted" style={{marginTop:"6px"}}>Gate: {audit.current_gate}</div></div><div><strong>{formatDate(audit.planned_start_at)}</strong><div className="muted">Planned start</div></div></article>;
          })}
        </section>
      </div>
    </main>
  );
}
