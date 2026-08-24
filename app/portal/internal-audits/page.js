import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "../../../lib/supabase/server";
import { createInternalAudit } from "./actions";
import ProcessScopeSelector from "./ProcessScopeSelector";

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
  return <div className="iaStat"><i className={tone} /><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
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
        .iaShell{max-width:1680px;margin:auto}.iaTop{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-bottom:28px}.iaLogo{display:block;object-fit:contain;object-position:left}
        .iaBack{padding:13px 18px;border:1px solid #cfd9e5;border-radius:13px;background:#fff;color:var(--navy);font-weight:800;text-decoration:none;box-shadow:0 8px 30px #071b360d}
        #rpgIaWelcomeBanner{position:relative!important;isolation:isolate!important;overflow:hidden!important;display:grid!important;grid-template-columns:minmax(0,1.55fr) minmax(290px,.45fr)!important;align-items:center!important;gap:42px!important;width:100%!important;min-height:0!important;height:auto!important;margin:0!important;padding:42px 48px!important;border:0!important;border-radius:28px!important;background:linear-gradient(118deg,#061a35 0%,#092b55 70%,#0d3d73 100%)!important;color:#fff!important;box-shadow:0 24px 60px #061a3524!important}
        #rpgIaWelcomeBanner:after{content:"";position:absolute;z-index:-1;width:390px;height:390px;right:-130px;top:-245px;border:1px solid #52e5da38;border-radius:50%;box-shadow:0 0 0 64px #52e5da0b,0 0 0 128px #52e5da08}
        .iaKicker{color:#52e5da!important;font-size:12px;font-weight:900;letter-spacing:.13em;text-transform:uppercase}#rpgIaWelcomeTitle{display:block!important;max-width:920px!important;margin:12px 0 16px!important;padding:0!important;border:0!important;background:transparent!important;color:#fff!important;-webkit-text-fill-color:#fff!important;opacity:1!important;font-family:inherit!important;font-size:clamp(42px,5vw,68px)!important;font-weight:900!important;line-height:1.02!important;letter-spacing:-.045em!important;text-shadow:none!important}#rpgIaWelcomeCopy{max-width:900px!important;margin:0!important;padding:0!important;color:#d8e5f5!important;-webkit-text-fill-color:#d8e5f5!important;font-size:18px!important;line-height:1.58!important}
        .iaAssurance{position:relative;z-index:1;display:flex;flex-direction:column;justify-content:space-between;padding:24px;border:1px solid #ffffff24;border-radius:20px;background:#ffffff12;backdrop-filter:blur(10px)}.iaAssurance span{color:#b8cae1;font-size:12px;font-weight:900;letter-spacing:.09em;text-transform:uppercase}.iaAssurance strong{font-size:46px}.iaAssurance small{color:#e3edf9;line-height:1.5}
        .iaSuccess{margin-top:20px;padding:16px 20px;border:1px solid #a5ddc0;border-radius:14px;background:#e9f8ef;color:#075d36;font-weight:800}
        .iaStats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin:22px 0}.iaStat{position:relative;overflow:hidden;padding:22px 24px;border:1px solid var(--line);border-radius:19px;background:#fff;box-shadow:0 12px 36px #061a350e}.iaStat i{position:absolute;inset:0 auto 0 0;width:5px;background:var(--blue)}.iaStat i.cyan{background:#16b8b0}.iaStat i.amber{background:#f0a51a}.iaStat i.red{background:#e05252}.iaStat span{display:block;color:#607089;font-size:12px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.iaStat strong{display:block;margin-top:4px;font-size:38px;line-height:1.1}.iaStat small{color:#7a899d}
        .iaLifecycle{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:1px;overflow:hidden;margin-bottom:22px;border:1px solid var(--line);border-radius:19px;background:var(--line);box-shadow:0 12px 34px #061a350a}.iaLife{display:flex;gap:13px;min-height:92px;padding:19px;background:#fff}.iaLife b{display:flex;width:34px;height:34px;flex:0 0 34px;align-items:center;justify-content:center;border-radius:50%;background:#eaf1ff;color:var(--blue);font-size:11px}.iaLife strong,.iaLife small{display:block}.iaLife strong{margin:2px 0 4px}.iaLife small{color:var(--muted);line-height:1.35}
        .iaPanel{overflow:hidden;margin-bottom:24px;border:1px solid var(--line);border-radius:25px;background:#fff;box-shadow:0 18px 55px #061a3511}.iaPanelHead{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;padding:30px 34px;border-bottom:1px solid #e7edf4;background:linear-gradient(110deg,#fff,#f7faff)}.iaPanelHead .iaMini,.iaPortfolio .iaMini{color:var(--blue);font-size:12px;font-weight:900;letter-spacing:.11em;text-transform:uppercase}.iaPanelHead h2,.iaPortfolio h2{margin:7px 0 5px;font-size:30px;letter-spacing:-.025em}.iaPanelHead p{margin:0;color:var(--muted)}.iaBadge{padding:9px 13px;border-radius:999px;background:#eaf8f6;color:#08736c;font-size:12px;font-weight:900;white-space:nowrap}
        .iaCreate{display:grid;grid-template-columns:250px minmax(0,1fr)}.iaRail{padding:30px 24px;border-right:1px solid #e6edf5;background:#f7f9fc}.iaRailTitle{margin-bottom:19px;color:#708096;font-size:11px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}.iaRailItem{display:flex;gap:12px;margin-bottom:20px;color:#6b7c91}.iaRailItem:first-of-type{color:var(--navy)}.iaRailNo{display:flex;width:26px;height:26px;flex:0 0 26px;align-items:center;justify-content:center;border:1px solid #ccd8e6;border-radius:50%;background:#fff;font-size:11px;font-weight:900}.iaRailItem:first-of-type .iaRailNo{border-color:var(--blue);background:var(--blue);color:#fff;box-shadow:0 0 0 5px #e5eeff}.iaRailItem strong,.iaRailItem small{display:block}.iaRailItem strong{font-size:14px}.iaRailItem small{margin-top:2px;font-size:12px;line-height:1.35}
        .iaForm{padding:32px 34px 36px}.iaSectionTitle{display:flex;align-items:center;gap:12px;margin:4px 0 18px;font-size:17px;font-weight:900}.iaSectionTitle b{display:flex;width:28px;height:28px;align-items:center;justify-content:center;border-radius:8px;background:#e9f0ff;color:var(--blue);font-size:12px}.iaGrid2,.iaGrid3{display:grid;gap:17px}.iaGrid2{grid-template-columns:repeat(2,minmax(0,1fr))}.iaGrid3{grid-template-columns:repeat(3,minmax(0,1fr))}
        .iaField{display:flex;flex-direction:column;gap:8px;min-width:0}.iaField>span{color:#263d5b;font-size:13px;font-weight:850}.iaField input,.iaField select,.iaField textarea{width:100%;min-height:50px;margin:0;padding:13px 14px;border:1px solid #cbd7e5;border-radius:11px;outline:0;background:#fff;color:#102944;font:inherit;font-size:15px;transition:.18s}.iaField textarea{min-height:112px;resize:vertical;line-height:1.5}.iaField input:focus,.iaField select:focus,.iaField textarea:focus{border-color:var(--blue);box-shadow:0 0 0 4px #1761e81c}.iaField input::placeholder,.iaField textarea::placeholder{color:#91a0b2}.iaDivider{height:1px;margin:30px 0;background:#e4eaf1}
        .iaStandards{margin:0;padding:0;border:0}.iaStandards legend{width:100%;padding:0}.iaStandardGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.iaStandard{display:flex;gap:14px;min-height:82px;padding:17px;border:1px solid #d5e0ec;border-radius:14px;background:#f8fafd;cursor:pointer;transition:.18s}.iaStandard:hover{transform:translateY(-2px);border-color:#9fb9e7;box-shadow:0 10px 24px #11478e14}.iaStandard:has(input:checked){border-color:var(--blue);background:#eef4ff;box-shadow:inset 0 0 0 1px var(--blue)}.iaStandard input{width:19px;height:19px;flex:0 0 19px;accent-color:var(--blue)}.iaStandard strong,.iaStandard small{display:block}.iaStandard small{margin-top:5px;color:var(--muted);line-height:1.35}
        .iaActionBar{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-top:26px;padding:19px 20px;border-radius:16px;background:#071d39;color:#fff}.iaActionBar p{margin:0;color:#cbd9e9;font-size:13px;line-height:1.45}.iaSubmit{min-height:50px;padding:0 22px;border:0;border-radius:11px;background:linear-gradient(135deg,#1761e8,#0d4ec8);color:#fff;font:inherit;font-weight:900;cursor:pointer;box-shadow:0 12px 28px #1761e842;white-space:nowrap}.iaEmpty{margin:30px;padding:20px;border:1px solid #efd18c;border-radius:14px;background:#fff8e8;color:#6f5005}
        .iaPortfolio{padding:28px 32px 20px}.iaAudit{display:grid;grid-template-columns:minmax(270px,1.5fr) minmax(200px,1fr) 150px 140px;gap:20px;align-items:center;padding:22px 32px;border-top:1px solid #e5ebf2;transition:.18s}.iaAudit:hover{background:#f8faff}.iaAuditTitle{display:block;margin-bottom:5px;color:var(--navy);font-size:17px;font-weight:900;text-decoration:none}.iaAuditTitle:hover{color:var(--blue)}.iaOpenAudit{display:inline-flex;padding:10px 13px;border-radius:10px;background:#1761e8;color:#fff;font-size:13px;font-weight:900;text-decoration:none;white-space:nowrap}.iaMuted{color:var(--muted);font-size:13px;line-height:1.45}.iaCriteria{color:#3b526e;font-size:14px;line-height:1.45}.iaStatus{display:inline-block;padding:7px 10px;border-radius:999px;background:#eaf1ff;color:#1455c8;font-size:12px;font-weight:900}.iaNoAudits{padding:32px;border-top:1px solid #e5ebf2;color:var(--muted)}
        @media(max-width:1100px){#rpgIaWelcomeBanner{grid-template-columns:1fr!important}.iaAssurance{min-height:150px}.iaStats{grid-template-columns:repeat(2,1fr)}.iaLifecycle{grid-template-columns:repeat(5,220px);overflow-x:auto}.iaCreate{grid-template-columns:1fr}.iaRail{display:none}.iaGrid3{grid-template-columns:repeat(2,1fr)}.iaAudit{grid-template-columns:1fr 1fr}}
        @media(max-width:720px){.auditPage{padding:20px 14px 70px}#rpgIaWelcomeBanner{gap:24px!important;padding:30px 24px!important;border-radius:22px!important}#rpgIaWelcomeTitle{font-size:42px!important}.iaStats,.iaGrid2,.iaGrid3,.iaStandardGrid,.iaAudit{grid-template-columns:1fr}.iaPanelHead,.iaForm{padding:24px 20px}.iaActionBar{align-items:stretch;flex-direction:column}.iaSubmit{width:100%}.iaLogo{width:190px;height:auto}.iaBack{font-size:13px}}
      `}</style>

      <div className="iaShell">
        <div className="iaTop">
          <Link href="/portal" aria-label="RPG Excellence portal"><Image className="iaLogo" src="/rpg-excellence-logo.png" alt="RPG Excellence" width={250} height={68} priority /></Link>
          <Link href="/portal" className="iaBack">← Customer Portal</Link>
        </div>

        <div id="rpgIaWelcomeBanner" aria-labelledby="rpgIaWelcomeTitle">
          <div><div className="iaKicker">RPG Audit Intelligence</div><div id="rpgIaWelcomeTitle" role="heading" aria-level="1">Internal Audit Command Centre</div><p id="rpgIaWelcomeCopy">Replace disconnected spreadsheets with one governed workspace for risk-based planning, competent audit teams, objective evidence, findings, CAPA and accountable closure.</p></div>
          <div className="iaAssurance"><span>Audit governance framework</span><strong>ISO 19011</strong><small>Independence · evidence-based decisions · due professional care · confidentiality · risk-based assurance</small></div>
        </div>

        {params?.created ? <div className="iaSuccess">✓ Audit created. The controlled scope record is ready for review.</div> : null}

        <section className="iaStats">
          <StatCard label="Active audits" value={activeAudits} detail="Across the controlled lifecycle" />
          <StatCard label="Scheduled" value={scheduledAudits} detail="Approved and awaiting delivery" tone="cyan" />
          <StatCard label="Fieldwork" value={fieldworkAudits} detail="Evidence gathering and review" tone="amber" />
          <StatCard label="Open findings" value={openFindings.length} detail="Requiring controlled resolution" tone="red" />
        </section>

        <section className="iaLifecycle" aria-label="Internal audit lifecycle">
          {LIFECYCLE.map(([n, title, detail]) => <div className="iaLife" key={n}><b>{n}</b><div><strong>{title}</strong><small>{detail}</small></div></div>)}
        </section>

        <section className="iaPanel">
          <div className="iaPanelHead"><div><div className="iaMini">Launch a controlled audit</div><h2>Build the audit mandate</h2><p>Define why the audit matters, where assurance is needed and which criteria apply.</p></div><div className="iaBadge">Risk-based scope design</div></div>

          {organizations.length === 0 ? <div className="iaEmpty">Create an organisation in the Customer Portal before starting an internal audit.</div> : (
            <div className="iaCreate">
              <aside className="iaRail"><div className="iaRailTitle">Controlled setup</div>{[
                ["1","Mandate","Purpose, type and timing"],["2","Boundaries","Processes and locations"],["3","Criteria","Standards and obligations"],["4","Governance","Team and plan review next"]
              ].map(([n,t,d]) => <div className="iaRailItem" key={n}><span className="iaRailNo">{n}</span><span><strong>{t}</strong><small>{d}</small></span></div>)}</aside>

              <form className="iaForm" action={createInternalAudit}>
                <div className="iaSectionTitle"><b>1</b>Audit mandate</div>
                <div className="iaGrid3">
                  <label className="iaField"><span>Organisation *</span><select name="organization_id" required defaultValue=""><option value="" disabled>Select organisation</option>{organizations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
                  <label className="iaField"><span>Audit title *</span><input name="title" required placeholder="e.g. Integrated UK Operations Audit" /></label>
                  <label className="iaField"><span>Audit type *</span><select name="audit_type" defaultValue="internal_system">{Object.entries(TYPE_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>
                  <label className="iaField"><span>Delivery method *</span><select name="audit_method" defaultValue="onsite"><option value="onsite">On-site</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option></select></label>
                  <label className="iaField"><span>Planned start *</span><input name="planned_start_at" type="datetime-local" required /></label>
                  <label className="iaField"><span>Planned end *</span><input name="planned_end_at" type="datetime-local" required /></label>
                </div>

                <div className="iaDivider" /><div className="iaSectionTitle"><b>2</b>Assurance purpose and boundaries</div>
                <div className="iaGrid2">
                  <label className="iaField"><span>Audit purpose *</span><textarea name="purpose" required placeholder="Why is the audit being conducted and what assurance must it provide?" /></label>
                  <label className="iaField"><span>Initial scope *</span><textarea name="scope_statement" required placeholder="Define included processes, functions, locations, activities and boundaries." /></label>
                  <label className="iaField"><span>Audit objectives</span><textarea name="objectives" placeholder="What must the audit determine, verify or evaluate?" /></label>
                  <label className="iaField"><span>Known risks, changes and prior signals</span><textarea name="known_risks_changes" placeholder="Significant change, incidents, complaints, poor performance, recurring findings or emerging risk." /></label>
                </div>
                <div className="iaGrid3" style={{marginTop:"17px"}}>
                  <label className="iaField"><span>Sites and locations</span><input name="sites" placeholder="e.g. Cambridge, Port Talbot" /></label>
                  <label className="iaField"><span>Functions and departments</span><input name="departments" placeholder="e.g. Operations, QHSE, Procurement" /></label>
                  <label className="iaField"><span>Primary auditee contact</span><input name="auditee_contact_name" placeholder="Full name" /></label>
                  <label className="iaField"><span>Auditee email</span><input name="auditee_contact_email" type="email" placeholder="name@example.com" /></label>
                </div>

                <div className="iaDivider" />
                <ProcessScopeSelector standards={standards} />
                <div className="iaActionBar"><p><strong>Next:</strong> confirm detailed clauses, appoint an independent and competent audit team, then approve the risk-based audit plan.</p><button className="iaSubmit" type="submit">Create Audit & Open Scope Review →</button></div>
              </form>
            </div>
          )}
        </section>

        <section className="iaPanel">
          <div className="iaPortfolio"><div className="iaMini">Live assurance portfolio</div><h2>Recent audits</h2></div>
          {audits.length === 0 ? <div className="iaNoAudits">No internal audits have been created yet. Your first governed audit will appear here.</div> : audits.map((audit) => {
            const criteria = (audit.internal_audit_selected_standards ?? []).map((row) => row.internal_audit_standard_catalogue?.display_name).filter(Boolean);
            return <article className="iaAudit" key={audit.id}><div><Link href={`/portal/internal-audits/${audit.id}`} className="iaAuditTitle">{audit.audit_reference} · {audit.title}</Link><span className="iaMuted">{TYPE_LABELS[audit.audit_type] ?? audit.audit_type} · {audit.audit_method}</span></div><div className="iaCriteria">{criteria.join(" · ") || "Criteria awaiting confirmation"}</div><div><span className="iaStatus">{STATUS_LABELS[audit.status] ?? audit.status}</span><div className="iaMuted" style={{marginTop:"6px"}}>Gate: {audit.current_gate}</div></div><div><Link href={`/portal/internal-audits/${audit.id}`} className="iaOpenAudit">Open Audit →</Link><div className="iaMuted" style={{marginTop:"6px"}}>{formatDate(audit.planned_start_at)}</div></div></article>;
          })}
        </section>
      </div>
    </main>
  );
}
