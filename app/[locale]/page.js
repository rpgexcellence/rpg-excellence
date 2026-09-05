import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { copy, locales } from "../../lib/i18n";

const standards = [
  ["ISO 9001", "Quality Management", "iso-9001", "blue", "Strengthen process control, customer focus and continual improvement."],
  ["ISO 14001", "Environmental Management", "iso-14001", "green", "Control environmental aspects, obligations, risks and operational impact."],
  ["ISO 45001", "Occupational Health & Safety", "iso-45001", "orange", "Manage hazards, worker participation and occupational health and safety risk."],
  ["ISO 22301", "Business Continuity", "iso-22301", "purple", "Build resilient operations through impact analysis, continuity plans and exercising."],
  ["ISO 27001", "Information Security", "iso-27001", "teal", "Assess information-security risk, controls, governance and the Statement of Applicability."],
];
const assuranceSteps = [
  ["01", "Assess", "Complete a structured assessment or internal audit against applicable requirements."],
  ["02", "Evidence", "Record objective evidence, accountable conclusions and controlled findings."],
  ["03", "Improve", "Investigate root causes and manage corrective actions through the CAPA-8D workflow."],
  ["04", "Verify", "Independently assess effectiveness and close only when results are sustained."],
];
const assuranceBenefits = [
  ["Integrated audit control", "Plan scope, team, criteria, evidence, findings and reporting in one controlled audit record."],
  ["Clause-level insight", "See which requirements are performing effectively and where assurance is weakest."],
  ["Accountable CAPA-8D", "Connect every major or minor nonconformity to structured root-cause and action control."],
  ["Independent verification", "Separate action-owner implementation from the auditor's effectiveness decision."],
  ["Executive reporting", "Translate audit results into management-ready conclusions, trends and priorities."],
];
const capabilities = [
  { icon: "audit", title: "Internal Audit", text: "Plan, execute and report audits with full traceability and real-time insight.", href: "/portal/internal-audits" },
  { icon: "capa", title: "CAPA-8D", text: "Manage corrective action from validated cause to verified effectiveness.", href: "/portal/rca" },
  { icon: "evidence", title: "Evidence Control", text: "Centralise objective evidence, decisions and controlled audit records.", href: "/portal/documents" },
  { icon: "insight", title: "Executive Insight", text: "Turn assurance data into clear priorities, trends and management decisions.", href: "/portal" },
];
const recentAudits = [
  ["12 Apr 2026", "ISO 9001", "Manufacturing", "Minor NC", "2", "warning"],
  ["28 Mar 2026", "ISO 14001", "UK Site", "Conformant", "0", "success"],
  ["15 Mar 2026", "ISO 45001", "Operations", "Minor NC", "3", "warning"],
  ["03 Mar 2026", "ISO 27001", "IT & Data", "Conformant", "0", "success"],
];

export function generateStaticParams() { return locales.map((locale) => ({ locale })); }

function ProductDashboard() {
  return <div className="homeProduct" aria-label="RPG Excellence platform preview">
    <aside className="homeProductNav"><strong>RPG</strong>{["Home", "Audits", "Findings", "CAPA-8D", "Evidence", "Risks", "Reports"].map((item, index) => <span className={index === 0 ? "active" : ""} key={item}><i />{item}</span>)}</aside>
    <div className="homeProductMain">
      <div className="homeProductTop"><div><strong>Welcome to RPG Excellence</strong><small>Compliance today. A stronger tomorrow.</small></div><span className="homeSearch">⌕&nbsp;&nbsp; Search audits, findings, CAPA…</span></div>
      <div className="homeMetrics">
        <div className="readinessMetric"><span>Audit readiness</span><div className="homeRing"><strong>86%</strong></div><small>+6% vs. last quarter</small></div>
        <div><span>Open findings</span><strong className="red">12</strong><small>2 high risk</small></div>
        <div><span>Awaiting verification</span><strong className="amber">4</strong><small>1 overdue</small></div>
        <div><span>Verified effective</span><strong className="green">28</strong><small>+27% vs. last quarter</small></div>
      </div>
      <div className="homeDashboardLower">
        <div className="homeAuditTable"><div className="homePanelTitle"><strong>Recent audits</strong><span>View all →</span></div><div className="homeTableRow homeTableHead"><span>Date</span><span>Standard</span><span>Site / Process</span><span>Result</span><span>Findings</span></div>{recentAudits.map((row) => <div className="homeTableRow" key={row[0] + row[1]}>{row.slice(0, 3).map((cell) => <span key={cell}>{cell}</span>)}<span><em className={row[5]}>{row[3]}</em></span><span>{row[4]}</span></div>)}</div>
        <div className="homeTrend"><div className="homePanelTitle"><strong>Compliance trend</strong><span>12 months</span></div><div className="trendChart" aria-hidden="true"><span className="trendLine greenLine" /><span className="trendLine blueLine" /><span className="trendLine amberLine" />{[0,1,2,3,4].map((line) => <i key={line} style={{top:`${18 + line * 18}%`}} />)}</div><div className="trendLegend"><span>● ISO 9001</span><span>● ISO 14001</span><span>● ISO 45001</span></div></div>
      </div>
    </div>
  </div>;
}

export default async function Home({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  const t = copy[locale];
  return <main className="newHome">
    <Header locale={locale} nav={t.nav} variant="home" />
    <section className="homeHero" id="platform">
      <div className="homeHeroCopy"><div className="homeEyebrow">AUDIT&nbsp;&nbsp; | &nbsp;&nbsp;IMPROVE&nbsp;&nbsp; | &nbsp;&nbsp;SUSTAIN</div><h1>Audit with evidence.<br /><span>Improve with confidence.</span></h1><p>One controlled platform for ISO audits, findings, CAPA-8D and effectiveness verification.</p><div className="homeCtas"><Link href="/portal" className="homePrimaryCta">Start free assessment <span>→</span></Link><a href="#solutions" className="homeSecondaryCta"><span className="playIcon">▶</span> View the platform</a></div><div className="homeTrust"><span>✓ Get started in minutes</span><span>✓ No credit card required</span><span>✓ Built for ISO and beyond</span></div></div>
      <ProductDashboard />
    </section>
    <section className="standardStrip"><div className="standardStripLabel">BUILT FOR GLOBAL STANDARDS</div>{standards.slice(0, 4).map(([code, name]) => <div className="standardStripItem" key={code}><span className="globeIcon">◎</span><div><strong>{code}</strong><small>{name}</small></div></div>)}</section>
    <section className="section" id="iso"><div className="sectionHead"><div><span className="kicker">Standards we support</span><h2>One assurance platform. Five essential management systems.</h2></div><p>Use a dedicated standard or combine compatible requirements into an integrated audit while retaining clause-level traceability.</p></div><div className="standardGrid">{standards.map(([code, title, slug, tone, description]) => <Link href={`/${locale}/${slug}`} className={`standardCard ${tone}`} key={code}><span className="standardBadge">{code}</span><strong>{title}</strong><span>{description} →</span></Link>)}</div></section>
    <section className="darkBand"><span className="kicker light">Controlled improvement workflow</span><h2>From assessment to verified effectiveness.</h2><p>RPG Excellence connects the audit conclusion to accountable improvement instead of allowing findings to disappear into disconnected spreadsheets and emails.</p><div className="toolGrid darkTools">{assuranceSteps.map(([number, title, text]) => <div className="toolCard darkTool" key={number}><span className="toolIcon">{number}</span><strong>{title}</strong><span>{text}</span></div>)}</div></section>
    <section className="capabilitySection" id="solutions"><div className="capabilityHeading"><div><span>TURN COMPLIANCE INTO PROGRESS</span><h2>Everything you need for a stronger, more resilient business.</h2></div><a href="#capability-grid">Explore all capabilities →</a></div><div className="capabilityGrid" id="capability-grid">{capabilities.map((item) => <Link href={item.href} className="capabilityCard" key={item.title}><span className={`capabilityIcon ${item.icon}`} aria-hidden="true" /><div><h3>{item.title}</h3><p>{item.text}</p></div><b>→</b></Link>)}</div></section>
    <section className="section"><div className="sectionHead"><div><span className="kicker">Business assurance platform</span><h2>Designed for evidence, accountability and decisions.</h2></div><p>Built for auditors, QHSE leaders, action owners and management teams that need a dependable record of what was assessed, decided and improved.</p></div><div className="standardGrid">{assuranceBenefits.map(([title, text], index) => <div className={`standardCard ${index % 2 ? "teal" : "blue"}`} key={title}><span className="standardBadge">0{index + 1}</span><strong>{title}</strong><span>{text}</span></div>)}</div></section>
    <section className="homeControlBand"><div><span>CONTROLLED ASSURANCE</span><h2>From audit plan to verified improvement.</h2><p>Evidence-based decisions, accountable actions and independent effectiveness verification in one traceable workflow.</p></div><Link href="/portal" className="homePrimaryCta">Open the platform <span>→</span></Link></section>
    <Footer locale={locale} />
  </main>;
}
