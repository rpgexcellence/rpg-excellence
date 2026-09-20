import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import PlatformHubsFeature from "../../components/PlatformHubsFeature";
import HomeConversionSection from "../../components/HomeConversionSection";
import TrackedLink from "../../components/TrackedLink";
import NewsletterSignup from "../../components/NewsletterSignup";
import { copy, locales } from "../../lib/i18n";

const standards = [
  ["ISO 9001", "Quality Management", "iso-9001", "blue", "Strengthen process control, customer focus and continual improvement."],
  ["ISO 14001", "Environmental Management", "iso-14001", "green", "Control environmental aspects, obligations, risks and operational impact."],
  ["ISO 45001", "Occupational Health & Safety", "iso-45001", "orange", "Manage hazards, worker participation and occupational health and safety risk."],
  ["ISO 22301", "Business Continuity", "iso-22301", "purple", "Build resilient operations through impact analysis, continuity plans and exercising."],
  ["ISO 27001", "Information Security", "iso-27001", "teal", "Assess information-security risk, controls, governance and the Statement of Applicability."],
];
const customerJourney = [
  ["01", "Start", "Create your workspace and select the standards, sites and priorities relevant to your organisation."],
  ["02", "Understand", "Assess readiness, identify risk and establish the obligations that matter."],
  ["03", "Build", "Create controlled registers, responsibilities, objectives and implementation actions."],
  ["04", "Implement", "Assign work, train responsible people and retain objective evidence."],
  ["05", "Assure", "Audit performance, investigate weaknesses and verify corrective action."],
  ["06", "Demonstrate", "Present management-ready reports and prepare confidently for certification."],
];
const startingPoints = [
  ["Understand our ISO gaps", "ISO Readiness Assessment", "/portal"],
  ["Control workplace risk", "Health & Safety Hub", "/portal/health-safety"],
  ["Build an ISMS", "ISO 27001 Risk & SoA", "/portal/information-security"],
  ["Implement business continuity", "Business Continuity Hub", "/portal/business-continuity"],
  ["Strengthen internal auditing", "Internal Audit Hub", "/portal/internal-audit"],
  ["Resolve recurring problems", "CAPA-8D Hub", "/portal/rca"],
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
      <div className="homeHeroCopy"><div className="homeEyebrow">AUDIT&nbsp;&nbsp; | &nbsp;&nbsp;IMPROVE&nbsp;&nbsp; | &nbsp;&nbsp;SUSTAIN</div><h1>Audit with evidence.<br /><span>Improve with confidence.</span></h1><p>One controlled platform for ISO audits, findings, CAPA-8D and effectiveness verification.</p><div className="homeCtas"><TrackedLink href="/portal" event="assessment_cta_clicked" eventParams={{location:"homepage_hero"}} className="homePrimaryCta">Start free assessment <span>→</span></TrackedLink><a href="#customer-journey" className="homeSecondaryCta"><span className="playIcon">▶</span> See how it works</a><TrackedLink href="/portal/login?mode=create" event="account_creation_clicked" eventParams={{location:"homepage_hero"}} className="homeAccountCta">Create free account <span>→</span></TrackedLink></div><div className="homeTrust"><span>✓ Get started in minutes</span><span>✓ No credit card required</span><span>✓ 14-day subscription trial</span></div></div>
      <ProductDashboard />
    </section>
    <section className="standardStrip"><div className="standardStripLabel">BUILT FOR GLOBAL STANDARDS</div>{standards.map(([code, name]) => <div className="standardStripItem" key={code}><span className="globeIcon">◎</span><div><strong>{code}</strong><small>{name}</small></div></div>)}</section>
    <section className="customerJourney" id="customer-journey">
      <header><span>YOUR RPG EXCELLENCE JOURNEY</span><h2>From first assessment to verified assurance.</h2><p>Begin with the work you need today. Each stage creates controlled information that supports the next.</p></header>
      <div className="journeyGrid">{customerJourney.map(([number,title,text],index)=><article key={number}><div><b>{number}</b>{index<customerJourney.length-1&&<i aria-hidden="true">→</i>}</div><h3>{title}</h3><p>{text}</p></article>)}</div>
      <footer><strong>Start with one assessment.</strong><span>Build a connected assurance system as your organisation develops.</span></footer>
    </section>
    <section className="startingPoints" id="solutions"><header><span>CHOOSE WHERE TO START</span><h2>What does your organisation need to achieve?</h2><p>Select an outcome and open the connected RPG Excellence workspace.</p></header><div>{startingPoints.map(([need,product,href])=><Link href={href} key={need}><span>{need}</span><strong>{product}</strong><b>→</b></Link>)}</div></section>
    <PlatformHubsFeature locale={locale} />
    <HomeConversionSection locale={locale} />
    <section id="newsletter" style={{padding:"54px clamp(28px,6vw,90px)",background:"#0a2b52",color:"#fff",display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(320px,640px)",gap:"36px",alignItems:"center"}}>
      <div><span style={{color:"#5ee3d0",fontSize:"11px",fontWeight:950,letterSpacing:".14em"}}>RPG INSIGHTS</span><h2 style={{margin:"10px 0",fontSize:"32px"}}>Practical assurance guidance, directly to your inbox.</h2><p style={{margin:0,color:"#c9d9e8",lineHeight:1.6}}>Receive useful ISO updates, implementation guidance and new RPG Intelligence releases.</p></div>
      <NewsletterSignup locale={locale} source="homepage" />
    </section>
    <section className="homeContactCta" id="contact">
      <div>
        <span>CONTACT RPG EXCELLENCE</span>
        <h2>Tell us what assurance your organisation needs.</h2>
        <p>Use our structured enquiry form to select the applicable standards, topic, timescale and preferred contact method.</p>
      </div>
      <Link href={`/${locale}/contact`} className="homePrimaryCta">Open contact form <span>→</span></Link>
    </section>
    <Footer locale={locale} />
  </main>;
}
