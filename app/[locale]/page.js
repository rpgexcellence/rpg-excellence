import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { copy, locales } from "../../lib/i18n";

const standards = [["ISO 9001", "Quality Management"], ["ISO 14001", "Environmental Management"], ["ISO 45001", "Occupational Health & Safety"], ["ISO 27001", "Information Security"]];
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
    <section className="standardStrip" id="iso"><div className="standardStripLabel">BUILT FOR GLOBAL STANDARDS</div>{standards.map(([code, name]) => <div className="standardStripItem" key={code}><span className="globeIcon">◎</span><div><strong>{code}</strong><small>{name}</small></div></div>)}</section>
    <section className="capabilitySection" id="solutions"><div className="capabilityHeading"><div><span>TURN COMPLIANCE INTO PROGRESS</span><h2>Everything you need for a stronger, more resilient business.</h2></div><a href="#capability-grid">Explore all capabilities →</a></div><div className="capabilityGrid" id="capability-grid">{capabilities.map((item) => <Link href={item.href} className="capabilityCard" key={item.title}><span className={`capabilityIcon ${item.icon}`} aria-hidden="true" /><div><h3>{item.title}</h3><p>{item.text}</p></div><b>→</b></Link>)}</div></section>
    <section className="homeControlBand"><div><span>CONTROLLED ASSURANCE</span><h2>From audit plan to verified improvement.</h2><p>Evidence-based decisions, accountable actions and independent effectiveness verification in one traceable workflow.</p></div><Link href="/portal" className="homePrimaryCta">Open the platform <span>→</span></Link></section>
    <Footer locale={locale} />
  </main>;
}
