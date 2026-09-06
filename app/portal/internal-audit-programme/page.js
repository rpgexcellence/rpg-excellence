import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import FmeaScoreFields from "./FmeaScoreFields";
import AuditScheduleFields from "./AuditScheduleFields";
import { addFmeaRisk, addPlannedAudit, addProgrammeSite, approveProgramme, createProgramme, launchProgrammeAudit, updateProgramme, updateProgrammeSite } from "./actions";

const FIVE_STANDARDS = ["ISO 9001", "ISO 14001", "ISO 45001", "ISO/IEC 27001", "ISO/IEC 17024"];
const COUNTRIES = "Afghanistan|Albania|Algeria|Andorra|Angola|Antigua and Barbuda|Argentina|Armenia|Australia|Austria|Azerbaijan|Bahamas|Bahrain|Bangladesh|Barbados|Belarus|Belgium|Belize|Benin|Bhutan|Bolivia|Bosnia and Herzegovina|Botswana|Brazil|Brunei|Bulgaria|Burkina Faso|Burundi|Cabo Verde|Cambodia|Cameroon|Canada|Central African Republic|Chad|Chile|China|Colombia|Comoros|Congo|Costa Rica|Croatia|Cuba|Cyprus|Czechia|Democratic Republic of the Congo|Denmark|Djibouti|Dominica|Dominican Republic|Ecuador|Egypt|El Salvador|Equatorial Guinea|Eritrea|Estonia|Eswatini|Ethiopia|Fiji|Finland|France|Gabon|Gambia|Georgia|Germany|Ghana|Greece|Grenada|Guatemala|Guinea|Guinea-Bissau|Guyana|Haiti|Honduras|Hungary|Iceland|India|Indonesia|Iran|Iraq|Ireland|Israel|Italy|Ivory Coast|Jamaica|Japan|Jordan|Kazakhstan|Kenya|Kiribati|Kuwait|Kyrgyzstan|Laos|Latvia|Lebanon|Lesotho|Liberia|Libya|Liechtenstein|Lithuania|Luxembourg|Madagascar|Malawi|Malaysia|Maldives|Mali|Malta|Marshall Islands|Mauritania|Mauritius|Mexico|Micronesia|Moldova|Monaco|Mongolia|Montenegro|Morocco|Mozambique|Myanmar|Namibia|Nauru|Nepal|Netherlands|New Zealand|Nicaragua|Niger|Nigeria|North Korea|North Macedonia|Norway|Oman|Pakistan|Palau|Panama|Papua New Guinea|Paraguay|Peru|Philippines|Poland|Portugal|Qatar|Romania|Russia|Rwanda|Saint Kitts and Nevis|Saint Lucia|Saint Vincent and the Grenadines|Samoa|San Marino|Sao Tome and Principe|Saudi Arabia|Senegal|Serbia|Seychelles|Sierra Leone|Singapore|Slovakia|Slovenia|Solomon Islands|Somalia|South Africa|South Korea|South Sudan|Spain|Sri Lanka|Sudan|Suriname|Sweden|Switzerland|Syria|Taiwan|Tajikistan|Tanzania|Thailand|Timor-Leste|Togo|Tonga|Trinidad and Tobago|Tunisia|Turkey|Turkmenistan|Tuvalu|Uganda|Ukraine|United Arab Emirates|United Kingdom|United States|Uruguay|Uzbekistan|Vanuatu|Vatican City|Venezuela|Vietnam|Yemen|Zambia|Zimbabwe".split("|");
const norm = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const isProgrammeStandard = (standard) => FIVE_STANDARDS.some((code) => norm(standard.standard_code).startsWith(norm(code)) || norm(standard.display_name).startsWith(norm(code)));
const date = (value) => value ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00Z`)) : "—";
const label = (value) => String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const riskScore = (risk) => risk.planning_score ?? risk.audit_priority ?? risk.rpn ?? 0;
const riskBand = (risk) => risk.priority_override || (riskScore(risk) >= 300 ? "critical" : riskScore(risk) >= 200 ? "high" : riskScore(risk) >= 100 ? "medium" : "low");

function SideLink({ href, children, active = false }) { return <Link href={href} className={active ? "iapSideLink active" : "iapSideLink"}>
<i />{children}</Link>; }
function Metric({ value, title, detail, tone = "blue" }) { return <article className={`iapMetric ${tone}`}>
<strong>{value}</strong>
<b>{title}</b>
<small>{detail}</small>
</article>; }

export default async function ThreeYearAuditProgramme({ searchParams }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/internal-audit-programme");

  const [organizationsResult, catalogueResult, programmesResult] = await Promise.all([
    supabase.from("organizations").select("id,name").eq("owner_id", user.id).order("name"),
    supabase.from("internal_audit_standard_catalogue").select("id,standard_code,display_name,edition_label").eq("active", true).order("display_name"),
    supabase.from("internal_audit_programmes").select("*").eq("owner_id", user.id).order("cycle_start", { ascending: false }),
  ]);
  for (const result of [organizationsResult, catalogueResult, programmesResult]) if (result.error) throw new Error(result.error.message);
  const organizations = organizationsResult.data || [];
  const standards = (catalogueResult.data || []).filter(isProgrammeStandard).filter((item, index, list) => index === list.findIndex((other) => norm(other.standard_code) === norm(item.standard_code)));
  const programmes = (programmesResult.data || []).map((item) => ({
    ...item,
    cycle_start: item.cycle_start || item.start_date,
    cycle_end: item.cycle_end || item.end_date,
    lead_auditor_name: item.lead_auditor_name || item.programme_owner_name || "Not assigned",
    lead_auditor_email: item.lead_auditor_email || item.programme_owner_email,
  }));
  const programmeId = params?.programme || programmes[0]?.id || null;
  const programme = programmes.find((item) => item.id === programmeId) || null;

  let selectedStandards = [], risks = [], plannedAudits = [], plannedClauses = [], availableClauseLinks = [], sites = [], siteStandards = [], auditSites = [];
  if (programme) {
    const [selectedResult, riskResult, auditResult, clauseResult, sitesResult, siteStandardsResult, auditSitesResult] = await Promise.all([
      supabase.from("internal_audit_programme_standards").select("standard_id,target_coverage,internal_audit_standard_catalogue(standard_code,display_name)").eq("programme_id", programme.id).eq("owner_id", user.id),
      supabase.from("internal_audit_programme_risks").select("*").eq("programme_id", programme.id).eq("owner_id", user.id).order("audit_priority", { ascending: false, nullsFirst: false }),
      supabase.from("internal_audit_programme_audits").select("*").eq("programme_id", programme.id).eq("owner_id", user.id).order("planned_start"),
      supabase.from("internal_audit_programme_audit_clauses").select("*").eq("programme_id", programme.id).eq("owner_id", user.id),
      supabase.from("internal_audit_programme_sites").select("*").eq("programme_id", programme.id).eq("owner_id", user.id).order("site_name"),
      supabase.from("internal_audit_programme_site_standards").select("*").eq("programme_id", programme.id).eq("owner_id", user.id),
      supabase.from("internal_audit_programme_audit_sites").select("*").eq("programme_id", programme.id).eq("owner_id", user.id),
    ]);
    for (const result of [selectedResult, riskResult, auditResult, clauseResult, sitesResult, siteStandardsResult, auditSitesResult]) if (result.error) throw new Error(result.error.message);
    selectedStandards = selectedResult.data || []; risks = (riskResult.data || []).sort((a, b) => riskScore(b) - riskScore(a)); plannedAudits = auditResult.data || []; plannedClauses = clauseResult.data || []; sites = sitesResult.data || []; siteStandards = siteStandardsResult.data || []; auditSites = auditSitesResult.data || [];
    const selectedIds = selectedStandards.map((row) => row.standard_id);
    if (selectedIds.length) {
      const linksResult = await supabase.from("internal_audit_question_scope_links").select("standard_id,clause,requirement_summary,internal_audit_standard_catalogue(standard_code,display_name)").in("standard_id", selectedIds).not("clause", "is", null);
      if (linksResult.error) throw new Error(linksResult.error.message);
      availableClauseLinks = (linksResult.data || []).filter((row, index, list) => index === list.findIndex((other) => other.standard_id === row.standard_id && other.clause === row.clause));
    }
  }

  const totalClauses = availableClauseLinks.length;
  const coveredKeys = new Set(plannedClauses.map((row) => `${row.standard_id}:${row.clause}`));
  const coverage = totalClauses ? Math.round((coveredKeys.size / totalClauses) * 100) : 0;
  const scheduledRiskIds = new Set(plannedAudits.map((audit) => audit.risk_id).filter(Boolean));
  const highRisks = risks.filter((risk) => ["high", "critical"].includes(riskBand(risk)));
  const unscheduledHigh = highRisks.filter((risk) => !scheduledRiskIds.has(risk.id));
  const completed = plannedAudits.filter((audit) => audit.status === "completed").length;
  const auditedSiteIds = new Set(auditSites.map((row) => row.site_id));
  const uncoveredSites = sites.filter((site) => !auditedSiteIds.has(site.id));
  const integratedAudits = plannedAudits.filter((audit) => audit.integrated_audit).length;
  const cycleDays = programme ? Math.max(1, (new Date(`${programme.cycle_end}T00:00:00Z`) - new Date(`${programme.cycle_start}T00:00:00Z`)) / 86400000) : 1;
  const clausesByStandard = selectedStandards.map((row) => {
    const available = availableClauseLinks.filter((link) => link.standard_id === row.standard_id);
    const covered = available.filter((link) => coveredKeys.has(`${link.standard_id}:${link.clause}`)).length;
    return { ...row, available: available.length, covered, percent: available.length ? Math.round((covered / available.length) * 100) : 0 };
  });
  const editSite = sites.find((site) => site.id === params?.editSite) || null;
  const editSiteStandardIds = new Set(siteStandards.filter((row) => row.site_id === editSite?.id).map((row) => row.standard_id));

  return <main className="iapPage">
<style>{`
    :root{--navy:#061a35;--blue:#1761e8;--teal:#11a99f;--line:#d7e2ee;--muted:#62758d;--bg:#edf3fa}*{box-sizing:border-box}.iapPage{min-height:100vh;background:var(--bg);color:var(--navy)}.iapShell{display:grid;grid-template-columns:238px minmax(0,1fr);min-height:100vh}.iapSide{position:sticky;top:0;height:100vh;padding:28px 20px;background:linear-gradient(180deg,#06264d,#071c38);color:#fff}.iapBrand{display:block;margin:0 10px 34px;color:#fff;font-size:24px;font-weight:950;text-decoration:none}.iapBrand span{font-weight:400}.iapCaption{margin:0 13px 12px;color:#7797b9;font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.iapNav{display:grid;gap:6px}.iapSideLink{display:flex;align-items:center;gap:12px;padding:13px 14px;border-radius:10px;color:#c9d9ea;text-decoration:none;font-size:14px;font-weight:760}.iapSideLink:hover,.iapSideLink.active{background:#174e86;color:#fff}.iapSideLink i{width:12px;height:12px;border:1px solid currentColor;border-radius:3px}.iapSideLink.active i{background:#58e0d1;border-color:#58e0d1;box-shadow:inset 0 0 0 3px #174e86}.iapSub{display:grid;gap:3px;margin:-1px 0 5px 25px;padding-left:13px;border-left:1px solid #4b7199}.iapSub a{padding:7px 9px;border-radius:7px;color:#b9cbe0;font-size:12px;font-weight:700;text-decoration:none}.iapSub a.active,.iapSub a:hover{background:#174e86;color:#fff}.iapFramework{position:absolute;left:20px;right:20px;bottom:22px;padding:17px;border:1px solid #ffffff1d;border-radius:13px;background:#ffffff09}.iapFramework small,.iapFramework strong{display:block}.iapFramework small{color:#86a3c2}.iapFramework strong{margin-top:5px}.iapWork{min-width:0;padding:28px clamp(20px,3vw,48px) 70px}.iapTop{display:flex;justify-content:space-between;gap:20px;margin-bottom:20px}.iapTop small{color:var(--blue);font-weight:900;letter-spacing:.1em}.iapTop h1{margin:4px 0 4px;font-size:32px}.iapTop p{margin:0;color:var(--muted)}.iapButton,.iapSubmit{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 16px;border:0;border-radius:10px;background:var(--blue);color:#fff;font:inherit;font-weight:850;text-decoration:none;cursor:pointer}.iapButton.ghost{border:1px solid #cbd8e7;background:#fff;color:var(--navy)}.iapHero{display:grid;grid-template-columns:1.5fr .5fr;gap:24px;padding:30px 34px;border-radius:20px;background:linear-gradient(120deg,#061d3b,#0b3b72);color:#fff}.iapHero span{color:#54dfd4;font-size:11px;font-weight:950;letter-spacing:.1em}.iapHero h2{margin:7px 0 8px;font-size:38px}.iapHero p{max-width:760px;margin:0;color:#d2e0ef;line-height:1.55}.iapCycle{padding:18px;border:1px solid #ffffff25;border-radius:14px;background:#ffffff10}.iapCycle strong,.iapCycle small{display:block}.iapCycle strong{font-size:21px}.iapCycle small{margin-top:6px;color:#c8d8e9}.iapMetrics{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:13px;margin:16px 0}.iapMetric{min-height:125px;padding:20px;border:1px solid var(--line);border-top:4px solid var(--blue);border-radius:15px;background:#fff}.iapMetric.teal{border-top-color:#11a99f}.iapMetric.amber{border-top-color:#f0a51a}.iapMetric.red{border-top-color:#e04f5f}.iapMetric.green{border-top-color:#07945d}.iapMetric strong,.iapMetric b,.iapMetric small{display:block}.iapMetric strong{font-size:31px}.iapMetric b{margin:5px 0}.iapMetric small{color:var(--muted);line-height:1.35}.iapPanel{margin-top:17px;overflow:hidden;border:1px solid var(--line);border-radius:18px;background:#fff}.iapPanelHead{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:23px 26px;border-bottom:1px solid #e5ecf3;background:#f8faff}.iapPanelHead small{color:var(--blue);font-weight:900;letter-spacing:.08em}.iapPanelHead h2{margin:5px 0 2px}.iapPanelHead p{margin:0;color:var(--muted)}.iapBody{padding:25px 26px}.iapGrid2,.iapGrid3{display:grid;gap:14px}.iapGrid2{grid-template-columns:repeat(2,minmax(0,1fr))}.iapGrid3{grid-template-columns:repeat(3,minmax(0,1fr))}.iapField{display:flex;flex-direction:column;gap:7px}.iapField span{font-size:13px;font-weight:850}.iapField small{color:var(--muted)}.iapField input,.iapField select,.iapField textarea{width:100%;min-height:46px;padding:11px 12px;border:1px solid #c9d7e6;border-radius:9px;background:#fff;color:var(--navy);font:inherit}.iapField textarea{min-height:95px;resize:vertical}.iapStandardGrid,.iapClauseGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.iapCheck{display:flex;gap:10px;padding:13px;border:1px solid #d6e1ed;border-radius:10px;background:#f8fafc}.iapCheck input{accent-color:var(--blue)}.iapAction{display:flex;justify-content:flex-end;margin-top:18px}.iapRpn{display:flex;align-items:center;gap:18px;margin-top:14px;padding:14px 17px;border-radius:11px}.iapRpn span{font-weight:750}.iapRpn strong{font-size:28px}.iapRpn b{margin-left:auto}.iapRiskTable,.iapAuditTable{width:100%;border-collapse:collapse}.iapRiskTable th,.iapRiskTable td,.iapAuditTable th,.iapAuditTable td{padding:13px 12px;border-bottom:1px solid #e4ebf2;text-align:left;vertical-align:top}.iapRiskTable th,.iapAuditTable th{color:#61758e;font-size:11px;text-transform:uppercase}.iapPill{display:inline-block;padding:6px 9px;border-radius:999px;background:#eaf1ff;color:#1458cd;font-size:11px;font-weight:900}.iapPill.high,.iapPill.critical{background:#fff0ee;color:#b42318}.iapPill.medium{background:#fff7e8;color:#945b00}.iapCoverage{display:grid;gap:10px}.iapCoverageRow{display:grid;grid-template-columns:220px 1fr 55px;gap:12px;align-items:center}.iapBar{height:11px;overflow:hidden;border-radius:999px;background:#e8eef5}.iapBar i{display:block;height:100%;background:linear-gradient(90deg,#1761e8,#12aea5)}.iapGantt{overflow-x:auto}.iapGanttInner{min-width:970px}.iapGanttYears{display:grid;grid-template-columns:repeat(3,1fr);margin-left:210px}.iapGanttYears b{padding:9px;border-left:1px solid #cfdce9;text-align:center}.iapGanttRow{display:grid;grid-template-columns:210px 1fr;min-height:54px;border-top:1px solid #e5ecf3}.iapGanttLabel{padding:11px 12px}.iapGanttLabel strong,.iapGanttLabel small{display:block}.iapGanttLabel small{color:var(--muted)}.iapTimeline{position:relative;background:repeating-linear-gradient(90deg,#f8fafd 0,#f8fafd calc(8.333% - 1px),#dce5ef calc(8.333% - 1px),#dce5ef 8.333%)}.iapBlock{position:absolute;top:11px;height:31px;min-width:10px;padding:7px 9px;overflow:hidden;border-radius:7px;background:#1761e8;color:#fff;font-size:11px;font-weight:850;white-space:nowrap}.iapBlock.high,.iapBlock.critical{background:#d92d20}.iapBlock.medium{background:#e98a00}.iapEmpty{padding:20px;border:1px dashed #b8c8d9;border-radius:11px;color:var(--muted);text-align:center}.iapProgrammeTabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}.iapProgrammeTabs a{padding:9px 12px;border:1px solid #cbd8e7;border-radius:9px;background:#fff;color:var(--navy);font-weight:800;text-decoration:none}.iapProgrammeTabs a.active{background:var(--blue);color:#fff}.iapApprove{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:22px 26px;background:#e9f8ef}.iapApprove p{margin:0;color:#175b3d}.iapNotice{margin:15px 0;padding:14px 17px;border:1px solid #a8ddc1;border-radius:10px;background:#e9f8ef;color:#075d36;font-weight:800}
    @media(max-width:1100px){.iapShell{grid-template-columns:78px 1fr}.iapSide{padding:22px 9px}.iapBrand{font-size:0;text-align:center}.iapBrand:first-letter{font-size:23px}.iapCaption,.iapSub,.iapFramework{display:none}.iapSideLink{justify-content:center;font-size:0}.iapMetrics{grid-template-columns:repeat(2,1fr)}.iapHero{grid-template-columns:1fr}.iapGrid3{grid-template-columns:1fr 1fr}}@media(max-width:720px){.iapShell{display:block}.iapSide{position:static;height:auto}.iapNav,.iapCaption,.iapFramework{display:none}.iapBrand{margin:0;font-size:20px;text-align:left}.iapBrand:first-letter{font-size:inherit}.iapWork{padding:20px 14px 60px}.iapTop{flex-direction:column}.iapMetrics,.iapGrid2,.iapGrid3,.iapStandardGrid,.iapClauseGrid{grid-template-columns:1fr}.iapCoverageRow{grid-template-columns:1fr}.iapHero h2{font-size:30px}.iapPanelHead{align-items:flex-start;flex-direction:column}}
  `}</style>
<div className="iapShell">
<aside className="iapSide">
<Link href="/portal" className="iapBrand">RPG <span>Excellence</span>
</Link>
<div className="iapCaption">Assurance workspace</div>
<nav className="iapNav">
<SideLink href="/portal">Dashboard</SideLink>
<SideLink href="/portal/history">Assessments</SideLink>
<SideLink href="/portal/internal-audits">Internal Audits</SideLink>
<div className="iapSub">
<Link href="/portal/internal-audits">Audit Command Centre</Link>
<Link href="/portal/internal-audit-programme" className="active">3-Year Audit Programme</Link>
<Link href="/portal/internal-audit-fmea-planning">FMEA Risk Planning</Link>
</div>
<SideLink href="/portal/internal-audit-actions">Findings & Actions</SideLink>
<SideLink href="/portal/rca">CAPA-8D</SideLink>
<SideLink href="/portal/documents">Evidence</SideLink>
<SideLink href="/portal/reports">Reports</SideLink>
</nav>
<div className="iapFramework">
<small>Programme governance</small>
<strong>ISO 19011 · Risk based</strong>
</div>
</aside>
<div className="iapWork">
    <header className="iapTop">
<div>
<small>AUDIT PROGRAMME INTELLIGENCE</small>
<h1>3-Year Internal Audit Programme</h1>
<p>Risk-based coverage, clause planning and delivery control across the assurance cycle.</p>
</div>
<div style={{display:"flex",gap:9}}>
<Link className="iapButton ghost" href="/portal/internal-audits">Audit Command Centre</Link>
<Link className="iapButton ghost" href="/portal">Portal</Link>
</div>
</header>
    {params?.created && <div className="iapNotice">Programme created. Build the FMEA risk universe and convert priorities into the three-year schedule.</div>}{params?.updated && <div className="iapNotice">Programme mandate and selected-standard scope updated.</div>}{params?.approved && <div className="iapNotice">Programme approved by the administering lead auditor.</div>}{params?.saved === "fmea" && <div className="iapNotice">FMEA assessment {params?.fmea || ""} saved and added to this programme’s Step 3 risk universe.</div>}
    {programmes.length > 0 && <nav className="iapProgrammeTabs">{programmes.map((item) => <Link key={item.id} className={item.id === programme?.id ? "active" : ""} href={`/portal/internal-audit-programme?programme=${item.id}`}>{item.programme_reference} · {item.status}</Link>)}</nav>}
    {!programme ? <>
<section className="iapHero">
<div>
<span>CONTROLLED THREE-YEAR CYCLE</span>
<h2>Build assurance around risk—not calendar habit.</h2>
<p>The lead auditor selects the applicable standards and uses process FMEA to determine audit priority, frequency, timing and clause coverage.</p>
</div>
<div className="iapCycle">
<strong>1–5 standards · 3 years</strong>
<small>One controlled plan linked to live audit delivery.</small>
</div>
</section>
<section className="iapPanel">
<div className="iapPanelHead">
<div>
<small>STEP 1 · PROGRAMME MANDATE</small>
<h2>Create the controlled programme</h2>
<p>Establish governance, objectives and the fixed three-year planning horizon.</p>
</div>
</div>
<form className="iapBody" action={createProgramme}>
<div className="iapGrid3">
<label className="iapField">
<span>Organisation *</span>
<select name="organization_id" required defaultValue="">
<option value="" disabled>Select organisation</option>{organizations.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
</label>
<label className="iapField">
<span>Programme site structure *</span>
<select name="site_structure" required defaultValue="">
<option value="" disabled>Select structure</option>
<option value="single_site">Single-site organisation</option>
<option value="multisite">Multisite organisation</option>
</select>
<small>Multisite programmes require controlled location sampling and rotation.</small>
</label>
<label className="iapField">
<span>Management-system model *</span>
<select name="system_model" required defaultValue="integrated">
<option value="integrated">Integrated management system</option>
<option value="separate">Separate management systems</option>
<option value="hybrid">Hybrid / partly integrated</option>
</select>
</label>
<label className="iapField">
<span>Programme title *</span>
<input name="title" required placeholder="e.g. Integrated Assurance Programme 2027–2029" />
</label>
<label className="iapField">
<span>Cycle start *</span>
<input name="cycle_start" type="date" required />
</label>
<label className="iapField">
<span>Administering lead auditor *</span>
<input name="lead_auditor_name" required />
</label>
<label className="iapField">
<span>Lead auditor email</span>
<input name="lead_auditor_email" type="email" />
</label>
</div>
<div className="iapGrid2" style={{marginTop:14}}>
<label className="iapField"><span>Central functions and shared controls</span><textarea name="central_functions" placeholder="Leadership, document control, HR, IT, procurement, risk, compliance or other controls operated centrally for multiple sites." /></label>
<label className="iapField"><span>Multisite sampling and rotation method</span><textarea name="multisite_sampling_method" placeholder="Describe risk-based site selection, previous performance, material differences, mandatory visits and rotation across Years 1–3. Enter N/A for a single-site programme." /></label>
</div>
<div className="iapGrid2" style={{marginTop:14}}>
<label className="iapField">
<span>Programme objectives *</span>
<textarea name="objectives" required placeholder="Define the assurance outcomes, compliance objectives and intended management value." />
</label>
<label className="iapField">
<span>Context, changes and prior performance</span>
<textarea name="context_and_change" placeholder="Strategic change, incidents, complaints, previous findings, certification priorities and emerging risks." />
</label>
</div>
<h3>Select the applicable programme standards</h3>
<div className="iapStandardGrid">{standards.map((standard) => <label className="iapCheck" key={standard.id}>
<input type="checkbox" name="standard_ids" value={standard.id} defaultChecked />
<span>
<strong>{standard.display_name}</strong>
<br />
<small>{standard.edition_label || standard.standard_code}</small>
</span>
</label>)}</div>
<div className="iapAction">
<button className="iapSubmit">Create 3-Year Programme →</button>
</div>
</form>
</section>
</> : <>
      <section className="iapHero">
<div>
<span>{programme.programme_reference} · {programme.status.toUpperCase()}</span>
<h2>{programme.title}</h2>
<p>Administered by {programme.lead_auditor_name}. Programme decisions must connect FMEA risk, audit timing and clause coverage.</p>
</div>
<div className="iapCycle">
<strong>{date(programme.cycle_start)} — {date(programme.cycle_end)}</strong>
<small>Three controlled programme years</small>
</div>
</section>
      <details className="iapPanel" open={selectedStandards.length === 0}>
<summary className="iapPanelHead" style={{cursor:"pointer"}}><div><small>PROGRAMME GOVERNANCE · CONTROLLED CHANGE</small><h2>Edit programme mandate</h2><p>Revise structure, ownership, cycle, integrated-system model and selected-standard scope. Changes are recorded in the audit trail.</p></div><span className="iapPill">{selectedStandards.length} standard(s) linked</span></summary>
<form className="iapBody" action={updateProgramme}>
<input type="hidden" name="programme_id" value={programme.id} />
<div className="iapGrid3">
<label className="iapField"><span>Programme title *</span><input name="title" required defaultValue={programme.title} /></label>
<label className="iapField"><span>Cycle start *</span><input name="cycle_start" type="date" required defaultValue={programme.cycle_start} /></label>
<label className="iapField"><span>Administering lead auditor *</span><input name="lead_auditor_name" required defaultValue={programme.lead_auditor_name} /></label>
<label className="iapField"><span>Lead auditor email</span><input name="lead_auditor_email" type="email" defaultValue={programme.lead_auditor_email || ""} /></label>
<label className="iapField"><span>Programme site structure *</span><select name="site_structure" required defaultValue={programme.site_structure || "single_site"}><option value="single_site">Single-site organisation</option><option value="multisite">Multisite organisation</option></select></label>
<label className="iapField"><span>Management-system model *</span><select name="system_model" required defaultValue={programme.system_model || "integrated"}><option value="integrated">Integrated management system</option><option value="separate">Separate management systems</option><option value="hybrid">Hybrid / partly integrated</option></select></label>
</div>
<div className="iapGrid2" style={{marginTop:14}}>
<label className="iapField"><span>Programme objectives *</span><textarea name="objectives" required defaultValue={programme.objectives || programme.description || ""} /></label>
<label className="iapField"><span>Context, changes and prior performance</span><textarea name="context_and_change" defaultValue={programme.context_and_change || programme.context_and_priorities || ""} /></label>
<label className="iapField"><span>Central functions and shared controls</span><textarea name="central_functions" defaultValue={programme.central_functions || ""} /></label>
<label className="iapField"><span>Multisite sampling and rotation method</span><textarea name="multisite_sampling_method" defaultValue={programme.multisite_sampling_method || ""} placeholder="Required for a multisite programme." /></label>
</div>
<h3>Controlled programme-standard scope — select at least one *</h3>
<div className="iapStandardGrid">{standards.map((standard) => <label className="iapCheck" key={standard.id}><input type="checkbox" name="standard_ids" value={standard.id} defaultChecked={selectedStandards.length === 0 || selectedStandards.some((row) => row.standard_id === standard.id)} /><span><strong>{standard.display_name}</strong><br/><small>{standard.edition_label || standard.standard_code}</small></span></label>)}</div>
<div className="iapAction"><button className="iapSubmit">Save Programme Mandate</button></div>
</form>
</details>
      <section className="iapMetrics">
<Metric value={sites.length} title="Controlled locations" detail={`${uncoveredSites.length} not yet scheduled`} tone={uncoveredSites.length ? "red" : "green"} />
<Metric value={risks.length} title="FMEA risks" detail={`${highRisks.length} high or critical`} />
<Metric value={plannedAudits.length} title="Planned audits" detail={`${integratedAudits} integrated · ${completed} completed`} tone="teal" />
<Metric value={`${coverage}%`} title="Clause coverage" detail={`${coveredKeys.size} of ${totalClauses} clauses`} tone="green" />
<Metric value={unscheduledHigh.length} title="High risks unscheduled" detail="Require lead-auditor decision" tone={unscheduledHigh.length ? "red" : "green"} />
</section>
      <section className="iapPanel" id="coverage">
<div className="iapPanelHead">
<div>
<small>DASHBOARD · STANDARD COVERAGE</small>
<h2>Selected-standard clause coverage</h2>
<p>Coverage is earned only when a clause is assigned to a planned audit.</p>
</div>
<span className="iapPill">{coverage}% overall</span>
</div>
<div className="iapBody iapCoverage">{clausesByStandard.map((row) => <div className="iapCoverageRow" key={row.standard_id}>
<strong>{row.internal_audit_standard_catalogue?.display_name}</strong>
<div className="iapBar">
<i style={{width:`${row.percent}%`}} />
</div>
<span>{row.percent}%</span>
</div>)}</div>
</section>
      <section className="iapPanel" id="sites">
<div className="iapPanelHead">
<div>
<small>STEP 2 · MULTISITE AUDIT UNIVERSE</small>
<h2>Controlled sites and central functions</h2>
<p>Define each location, its system scope, applicable standards and risk-based minimum audit frequency.</p>
</div>
<span className="iapPill">{sites.length} location(s)</span>
</div>
<form className="iapBody" action={editSite ? updateProgrammeSite : addProgrammeSite}>
<input type="hidden" name="programme_id" value={programme.id} />
{editSite && <input type="hidden" name="site_id" value={editSite.id} />}
{editSite && <div className="iapNotice">Editing {editSite.site_code} · {editSite.site_name}. Save the changes below or cancel to keep the current record.</div>}
<div className="iapGrid3">
<label className="iapField">
<span>Site code *</span>
<input name="site_code" required placeholder="e.g. UK-CAM" defaultValue={editSite?.site_code || ""} />
</label>
<label className="iapField">
<span>Site / function name *</span>
<input name="site_name" required defaultValue={editSite?.site_name || ""} />
</label>
<label className="iapField">
<span>Country</span>
<input name="country" list="iap-country-list" autoComplete="off" placeholder="Search and select country" defaultValue={editSite?.country || ""} />
<datalist id="iap-country-list">{COUNTRIES.map((country) => <option key={country} value={country} />)}</datalist>
<small>Click the field or type to search.</small>
</label>
<label className="iapField">
<span>Business unit</span>
<input name="business_unit" defaultValue={editSite?.business_unit || ""} />
</label>
<label className="iapField">
<span>Location type</span>
<select name="site_type" defaultValue={editSite?.site_type || "operational"}>
<option value="head_office">Head office</option>
<option value="central_function">Central function</option>
<option value="operational">Operational site</option>
<option value="remote">Remote location</option>
<option value="temporary">Temporary site</option>
</select>
</label>
<label className="iapField">
<span>Minimum frequency</span>
<select name="minimum_frequency_months" defaultValue={String(editSite?.minimum_frequency_months || 36)}>
<option value="3">Quarterly</option>
<option value="6">6 months</option>
<option value="12">Annual</option>
<option value="18">18 months</option>
<option value="24">24 months</option>
<option value="36">Once per cycle</option>
</select>
</label>
<label className="iapField">
<span>Sampling status</span>
<select name="sampling_status" defaultValue={editSite?.sampling_status || "in_scope"}>
<option value="in_scope">In scope</option>
<option value="sampled">Selected in sample</option>
<option value="not_sampled">Not selected this cycle</option>
<option value="excluded">Excluded with justification</option>
</select>
</label>
</div>
<div className="iapGrid2" style={{marginTop:14}}>
<label className="iapField">
<span>Site scope and activities *</span>
<textarea name="scope_summary" required defaultValue={editSite?.scope_summary || ""} />
</label>
<label className="iapField">
<span>Sampling / rotation rationale</span>
<textarea name="sampling_rationale" placeholder="Explain selection, exclusions, central controls, risk, previous performance and rotation over three years." defaultValue={editSite?.sampling_rationale || ""} />
</label>
</div>
<h3>Standards applicable at this location *</h3>
<div className="iapStandardGrid">{selectedStandards.map((selected) => <label className="iapCheck" key={selected.standard_id}>
<input type="checkbox" name="standard_ids" value={selected.standard_id} defaultChecked={editSiteStandardIds.has(selected.standard_id)} />
<span>
<strong>{selected.internal_audit_standard_catalogue?.display_name}</strong>
</span>
</label>)}</div>
<div className="iapAction">
{editSite && <Link className="iapButton ghost" href={`/portal/internal-audit-programme?programme=${programme.id}#sites`} style={{marginRight:10}}>Cancel</Link>}
<button className="iapSubmit">{editSite ? "Save Location Changes" : "Add Controlled Location"}</button>
</div>
</form>{sites.length ? <div className="iapBody" style={{paddingTop:0}}>
<table className="iapAuditTable">
<thead>
<tr>
<th>Location</th>
<th>Type / unit</th>
<th>Applicable standards</th>
<th>Frequency</th>
<th>3-year coverage</th>
<th>Actions</th>
</tr>
</thead>
<tbody>{sites.map((site) => <tr key={site.id}>
<td>
<strong>{site.site_code} · {site.site_name}</strong>
<br/>
<small>{site.country || "Country not recorded"}</small>
</td>
<td>{label(site.site_type)}<br/>
<small>{site.business_unit || "—"}</small>
</td>
<td>{siteStandards.filter((row) => row.site_id === site.id).map((row) => selectedStandards.find((selected) => selected.standard_id === row.standard_id)?.internal_audit_standard_catalogue?.display_name).filter(Boolean).join(", ") || "None recorded"}</td>
<td>Every {site.minimum_frequency_months} months</td>
<td>
<span className={`iapPill ${auditedSiteIds.has(site.id) ? "" : "high"}`}>{auditedSiteIds.has(site.id) ? "Scheduled" : "Gap"}</span>
</td>
<td><Link className="iapButton ghost" href={`/portal/internal-audit-programme?programme=${programme.id}&editSite=${site.id}#sites`}>Edit</Link></td>
</tr>)}</tbody>
</table>
</div> : null}</section>
      <section className="iapPanel" id="fmea">
<div className="iapPanelHead">
<div>
<small>STEP 3 · EMBEDDED PROCESS FMEA</small>
<h2>Risk-based audit universe</h2>
<p>Profile enterprise, site and process risks to determine audit frequency and priority.</p>
</div>
<div style={{display:"flex",gap:9,alignItems:"center",flexWrap:"wrap"}}><span className="iapPill">Priority = R × I × C × D</span><Link className="iapButton ghost" href="/portal/internal-audit-fmea-planning">Definitions & scoring guide</Link></div>
</div>
<form className="iapBody" action={addFmeaRisk}>
<input type="hidden" name="programme_id" value={programme.id} />
<div className="iapGrid3">
<label className="iapField">
<span>Process area *</span>
<input name="process_area" required />
</label>
<label className="iapField">
<span>Controlled location</span>
<select name="site_id" defaultValue="">
<option value="">Enterprise / all relevant sites</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.site_code} · {site.site_name}</option>)}</select>
</label>
<label className="iapField">
<span>Risk scope</span>
<select name="scope_level" defaultValue="process">
<option value="enterprise">Enterprise system</option>
<option value="site">Site</option>
<option value="process">Process</option>
<option value="standard">Standard-specific</option>
</select>
</label>
<label className="iapField">
<span>Failure mode / audit risk *</span>
<input name="failure_mode" required placeholder="What could prevent assurance objectives being achieved?" />
</label>
</div>
<div className="iapGrid3" style={{marginTop:14}}>
<label className="iapField">
<span>Potential effect *</span>
<textarea name="potential_effect" required />
</label>
<label className="iapField">
<span>Potential cause *</span>
<textarea name="potential_cause" required />
</label>
<label className="iapField">
<span>Current controls</span>
<textarea name="current_controls" />
</label>
</div>
<div style={{marginTop:14}}>
<FmeaScoreFields />
</div>
<div className="iapGrid2" style={{marginTop:14}}>
<label className="iapField">
<span>Priority override</span>
<select name="priority_override" defaultValue="">
<option value="">Use calculated audit-priority band</option>
<option value="low">Low</option>
<option value="medium">Medium</option>
<option value="high">High</option>
<option value="critical">Critical</option>
</select>
</label>
<label className="iapField">
<span>Lead-auditor rationale</span>
<input name="rationale" placeholder="Record any override, frequency or timing judgement." />
</label>
</div>
<div className="iapAction">
<button className="iapSubmit">Add Risk to Audit Universe</button>
</div>
</form>{risks.length ? <div className="iapBody" style={{paddingTop:0}}>
<table className="iapRiskTable">
<thead>
<tr>
<th>Process / risk</th>
<th>Reg.</th>
<th>Impact</th>
<th>Customer</th>
<th>Detect.</th>
<th>Score</th>
<th>Priority</th>
<th>Frequency</th>
<th>Scheduled</th>
</tr>
</thead>
<tbody>{risks.map((risk) => <tr key={risk.id}>
<td>
<strong>{risk.process_area}</strong>
<br />
<small>{risk.failure_mode}</small>
</td>
<td>{risk.regulatory_exposure ?? "Legacy"}</td>
<td>{risk.process_failure_impact ?? risk.severity}</td>
<td>{risk.customer_impact_probability ?? risk.occurrence}</td>
<td>{risk.failure_detectability ?? risk.detection}</td>
<td>
<strong>{riskScore(risk)}</strong>
</td>
<td>
<span className={`iapPill ${riskBand(risk)}`}>{label(riskBand(risk))}</span>
</td>
<td>Every {risk.required_frequency_months || 36} months</td>
<td>{scheduledRiskIds.has(risk.id) ? "Yes" : "No"}</td>
</tr>)}</tbody>
</table>
</div> : null}</section>
      <section className="iapPanel">
<div className="iapPanelHead">
<div>
<small>STEP 4 · LEAD-AUDITOR PLANNING</small>
<h2>Add an audit to the three-year cycle</h2>
<p>Select timing, risk basis and exact clauses. Clause selection remains a human programme decision.</p>
</div>
</div>
<form className="iapBody" action={addPlannedAudit}>
<input type="hidden" name="programme_id" value={programme.id} />
<AuditScheduleFields risks={risks} cycleStart={programme.cycle_start} cycleEnd={programme.cycle_end} leadAuditor={programme.lead_auditor_name} />
<h3>Sites included in this audit *</h3>
<div className="iapStandardGrid">{sites.map((site) => <label className="iapCheck" key={site.id}>
<input type="checkbox" name="site_ids" value={site.id} />
<span><strong>{site.site_code} · {site.site_name}</strong><br/><small>{site.country || label(site.site_type)}</small></span>
</label>)}</div>
<div className="iapGrid2" style={{marginTop:14}}>
<label className="iapField"><span>Site sampling / rotation rationale</span><textarea name="site_sampling_rationale" placeholder="Explain why these locations were selected and how remaining locations rotate through the cycle." /></label>
<div><label className="iapCheck"><input type="checkbox" name="integrated_audit" defaultChecked /><span><strong>Integrated audit</strong><br/><small>Cover two or more management-system standards through shared processes.</small></span></label><label className="iapCheck" style={{marginTop:10}}><input type="checkbox" name="central_control_review" /><span><strong>Review central controls</strong><br/><small>Test governance or controls operated centrally on behalf of selected sites.</small></span></label></div>
</div>
<h3>Clause coverage selected by the programme lead auditor *</h3>
<div className="iapClauseGrid">{selectedStandards.map((selected) => <fieldset key={selected.standard_id} style={{border:"1px solid #d7e2ee",borderRadius:11,padding:14}}>
<legend>
<strong>{selected.internal_audit_standard_catalogue?.display_name}</strong>
</legend>{availableClauseLinks.filter((link) => link.standard_id === selected.standard_id).map((link) => <label className="iapCheck" key={`${link.standard_id}-${link.clause}`} style={{marginTop:7}}>
<input type="checkbox" name="clauses" value={`${link.standard_id}|${link.clause}`} />
<span>
<strong>Clause {link.clause}</strong>{link.requirement_summary ? <>
<br />
<small>{link.requirement_summary}</small>
</> : null}</span>
</label>)}</fieldset>)}</div>
<div className="iapAction">
<button className="iapSubmit">Add to 3-Year Schedule</button>
</div>
</form>
</section>
      <section className="iapPanel" id="gantt">
<div className="iapPanelHead">
<div>
<small>DASHBOARD · THREE-YEAR GANTT</small>
<h2>Risk-based delivery schedule</h2>
<p>Visualise timing, priority and resource distribution across the complete cycle.</p>
</div>
</div>
<div className="iapBody iapGantt">
<div className="iapGanttInner">
<div className="iapGanttYears">
<b>Year 1</b>
<b>Year 2</b>
<b>Year 3</b>
</div>{plannedAudits.length ? plannedAudits.map((audit) => { const startOffset = Math.max(0, (new Date(`${audit.planned_start}T00:00:00Z`) - new Date(`${programme.cycle_start}T00:00:00Z`)) / 86400000); const duration = Math.max(1, (new Date(`${audit.planned_end}T00:00:00Z`) - new Date(`${audit.planned_start}T00:00:00Z`)) / 86400000 + 1); return <div className="iapGanttRow" key={audit.id}>
<div className="iapGanttLabel">
<strong>{audit.title}</strong>
<small>{audit.process_area} · {auditSites.filter((row) => row.programme_audit_id === audit.id).length} site(s) · {audit.estimated_days} day(s)</small>
</div>
<div className="iapTimeline">
<span className={`iapBlock ${audit.priority}`} style={{left:`${(startOffset / cycleDays) * 100}%`,width:`${Math.max(1.5,(duration / cycleDays) * 100)}%`}} title={`${date(audit.planned_start)} to ${date(audit.planned_end)}`}>{label(audit.priority)}</span>
</div>
</div>; }) : <div className="iapEmpty">No planned audits yet. Convert the highest FMEA risks into the schedule first.</div>}</div>
</div>
</section>
      <section className="iapPanel">
<div className="iapPanelHead">
<div>
<small>DASHBOARD · CONTROLLED PLAN</small>
<h2>Programme audit register</h2>
<p>Plan-versus-delivery status and clause allocation remain traceable.</p>
</div>
</div>{plannedAudits.length ? <div className="iapBody">
<table className="iapAuditTable">
<thead>
<tr>
<th>Audit</th>
<th>Year / dates</th>
<th>Priority</th>
<th>Clauses</th>
<th>Status</th>
<th>Lead</th>
<th>Actions</th>
</tr>
</thead>
<tbody>{plannedAudits.map((audit) => <tr key={audit.id}>
<td>
<strong>{audit.title}</strong>
<br />
<small>{audit.process_area} · {auditSites.filter((row) => row.programme_audit_id === audit.id).map((row) => sites.find((site) => site.id === row.site_id)?.site_code).filter(Boolean).join(", ") || "No location allocated"}</small>
</td>
<td>Year {audit.year_no}<br />
<small>{date(audit.planned_start)} — {date(audit.planned_end)}</small>
</td>
<td>
<span className={`iapPill ${audit.priority}`}>{label(audit.priority)}</span>
</td>
<td>{plannedClauses.filter((row) => row.programme_audit_id === audit.id).length}</td>
<td>{label(audit.status)}</td>
<td>{audit.lead_auditor_name}</td>
<td>{audit.linked_audit_id ? <Link className="iapButton ghost" href={`/portal/internal-audits/${audit.linked_audit_id}`}>Open Audit</Link> : programme.status === "active" ? <form action={launchProgrammeAudit}><input type="hidden" name="programme_id" value={programme.id} /><input type="hidden" name="programme_audit_id" value={audit.id} /><button className="iapSubmit">Launch Audit</button></form> : <span className="iapPill medium">Approve programme first</span>}</td>
</tr>)}</tbody>
</table>
</div> : <div className="iapBody">
<div className="iapEmpty">The programme schedule is empty.</div>
</div>}<form className="iapApprove" action={approveProgramme}>
<input type="hidden" name="programme_id" value={programme.id} />
<p>
<strong>Lead-auditor approval:</strong> confirm the programme reflects FMEA priority, selected-standard clause coverage, organisational change and available audit resources.</p>
<button className="iapSubmit" disabled={programme.status === "active"}>{programme.status === "active" ? "Programme Active" : "Approve 3-Year Programme"}</button>
</form>
</section>
    </>}
  </div>
</div>
</main>;
}
