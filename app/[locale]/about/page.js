import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import { locales } from "../../../lib/i18n";

export const metadata = {
  title: "About RPG Excellence | Digital Business Assurance",
  description:
    "Discover how RPG Excellence helps organisations reduce assurance administration, control risk, accelerate action and protect customer and certification confidence.",
  alternates: { canonical: "/en/about" },
};

const outcomes = [
  [
    "Faster visibility",
    "Bring assessments, risks, findings and actions into management view without waiting for disconnected spreadsheets and reports.",
  ],
  [
    "Clear accountability",
    "Give every finding, control and improvement action an owner, due date, evidence expectation and visible status.",
  ],
  [
    "Lower assurance friction",
    "Reuse controlled information across assessments, audits and management review instead of rebuilding the same evidence repeatedly.",
  ],
  [
    "Stronger customer confidence",
    "Demonstrate a structured, evidence-led approach to quality, safety, security and resilience when customers or auditors ask.",
  ],
  [
    "Better use of specialist time",
    "Focus competent people on judgement, risk and improvement while digital workflows organise routine administration.",
  ],
  [
    "More defensible decisions",
    "Retain the requirement, evidence, rationale, approval and verification behind important assurance decisions.",
  ],
];

const hubs = [
  [
    "ISO Readiness",
    "Assess requirements, retain evidence, create findings and produce management-ready readiness reporting.",
    "/portal",
  ],
  [
    "Health & Safety",
    "Control workplace risk assessments, POWRA, permits, change, actions and management visibility.",
    "/hs-hub",
  ],
  [
    "Internal Audit",
    "Plan risk-based programmes, conduct audits, connect evidence and verify corrective-action effectiveness.",
    "/internal-audit",
  ],
  [
    "CAPA–8D",
    "Move from containment to validated root cause, controlled action, effectiveness review and accountable closure.",
    "/capa-8d",
  ],
  [
    "Information Security",
    "Connect ISO 27001 readiness, information-security risk and Statement of Applicability decisions.",
    "/information-security",
  ],
  [
    "Business Continuity",
    "Build capability from site profile and context through disruption risk, BIA, planning and exercising.",
    "/business-continuity",
  ],
];

const workflow = [
  ["01", "Understand", "Establish scope, obligations and current position."],
  ["02", "Prioritise", "Focus attention using evidence and risk."],
  ["03", "Act", "Assign controlled actions and required evidence."],
  ["04", "Verify", "Test implementation and sustained effectiveness."],
  ["05", "Demonstrate", "Present a credible management and audit trail."],
];

function DigitalAssurancePreview() {
  return (
    <div
      className="aboutPreview"
      aria-label="Illustrative RPG Excellence digital assurance dashboard"
    >
      <div className="aboutPreviewTop">
        <div>
          <b>RPG</b>
          <span>Assurance workspace</span>
        </div>
        <small>LIVE MANAGEMENT VIEW</small>
      </div>
      <div className="aboutPreviewMetrics">
        <article>
          <span>Readiness</span>
          <b>86%</b>
          <small>↑ controlled improvement</small>
        </article>
        <article>
          <span>Open actions</span>
          <b>12</b>
          <small>2 require attention</small>
        </article>
        <article>
          <span>Awaiting verification</span>
          <b>4</b>
          <small>Effectiveness review</small>
        </article>
      </div>
      <div className="aboutPreviewLower">
        <section>
          <header>
            <b>Assurance priorities</b>
            <span>View all →</span>
          </header>
          {[
            ["ISO 9001 transition", "On plan"],
            ["Supplier corrective action", "Review"],
            ["Internal audit programme", "82%"],
          ].map(([x, s]) => (
            <div key={x}>
              <span>{x}</span>
              <em>{s}</em>
            </div>
          ))}
        </section>
        <section className="aboutTrend">
          <header>
            <b>Control confidence</b>
            <span>12 months</span>
          </header>
          <div>
            <i />
            <i />
            <i />
            <strong>Improving</strong>
          </div>
        </section>
      </div>
    </div>
  );
}

export default async function About({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  return (
    <PageShell locale={locale}>
      <main className="aboutCommercial">
        <style>{styles}</style>
        <section className="aboutHero">
          <div>
            <span className="aboutKicker">
              DIGITAL ASSURANCE FOR REAL BUSINESS OUTCOMES
            </span>
            <h1>
              Spend less time managing assurance. Gain more confidence from it.
            </h1>
            <p>
              RPG Excellence connects ISO readiness, operational risk, internal
              audit, corrective action and competence in one evidence-led
              platform—helping organisations act earlier, close gaps properly
              and demonstrate control when it matters.
            </p>
            <div className="aboutActions">
              <Link className="aboutPrimary" href="/portal/login?mode=create">
                Start your 14-day free trial →
              </Link>
              <Link className="aboutSecondary" href={`/${locale}/contact`}>
                Book a consultation
              </Link>
            </div>
            <div className="aboutTrust">
              <span>✓ No credit card required</span>
              <span>✓ Start with one hub</span>
              <span>✓ Scale as your assurance needs develop</span>
            </div>
          </div>
          <DigitalAssurancePreview />
        </section>

        <section className="aboutOutcome">
          <header>
            <div>
              <span className="aboutKicker">THE COMMERCIAL CASE</span>
              <h2>
                Assurance should protect performance—not create another
                administrative burden.
              </h2>
            </div>
            <p>
              Disconnected records make it harder to see exposure, assign
              ownership and demonstrate progress. RPG Excellence creates one
              controlled journey from assessment to verified improvement.
            </p>
          </header>
          <div className="aboutOutcomeGrid">
            {outcomes.map(([title, body], i) => (
              <article key={title}>
                <b>{String(i + 1).padStart(2, "0")}</b>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="aboutValueBand">
          <div>
            <span className="aboutKicker">
              FROM ASSURANCE COST TO BUSINESS VALUE
            </span>
            <h2>
              Use the same controlled information to satisfy more than one
              business need.
            </h2>
          </div>
          <div className="aboutValueFlow">
            <article>
              <b>One evidence record</b>
              <span>Requirements, observations, documents and decisions</span>
            </article>
            <i>→</i>
            <article>
              <b>Multiple uses</b>
              <span>Audit, certification, customers and management review</span>
            </article>
            <i>→</i>
            <article>
              <b>Better decisions</b>
              <span>
                Priorities, investment, action and verified improvement
              </span>
            </article>
          </div>
        </section>

        <section className="aboutJourney">
          <header>
            <span className="aboutKicker">ONE CONTROLLED JOURNEY</span>
            <h2>
              Know where you are. Decide what matters. Prove what improved.
            </h2>
          </header>
          <div>
            {workflow.map(([n, title, body]) => (
              <article key={n}>
                <b>{n}</b>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="aboutHubs">
          <header>
            <div>
              <span className="aboutKicker">CONNECTED DIGITAL HUBS</span>
              <h2>Start with the problem you need to solve today.</h2>
            </div>
            <p>
              Each hub delivers a focused workflow while using the same
              principles of evidence, accountability, action and verification.
            </p>
          </header>
          <div>
            {hubs.map(([title, body, path]) => (
              <Link
                href={path === "/portal" ? path : `/${locale}${path}`}
                key={title}
              >
                <span>RPG HUB</span>
                <h3>{title}</h3>
                <p>{body}</p>
                <b>Explore the hub →</b>
              </Link>
            ))}
          </div>
        </section>

        <section className="aboutDecision">
          <div>
            <span className="aboutKicker">
              PRACTITIONER-LED. DIGITALLY ENABLED.
            </span>
            <h2>
              Technology organises the evidence. People remain accountable for
              the decision.
            </h2>
            <p>
              RPG Excellence combines structured digital workflows with
              competent review and professional judgement. It supports—not
              replaces—the people responsible for risk, compliance and business
              performance.
            </p>
          </div>
          <ul>
            <li>
              <b>Evidence before opinion</b>
              <span>
                Trace decisions to requirements and observed conditions.
              </span>
            </li>
            <li>
              <b>Action before administration</b>
              <span>Create ownership and proportionate control.</span>
            </li>
            <li>
              <b>Verification before closure</b>
              <span>Confirm that improvement works and is sustained.</span>
            </li>
          </ul>
        </section>

        <section className="aboutFinal">
          <div>
            <span className="aboutKicker">
              SEE THE COMMERCIAL VALUE IN YOUR OWN CONTEXT
            </span>
            <h2>
              Start small. Prove value. Build a connected assurance system.
            </h2>
            <p>
              Open a 14-day trial or discuss the assurance priorities, standards
              and operational risks affecting your organisation.
            </p>
          </div>
          <div>
            <Link className="aboutPrimary" href="/portal/login?mode=create">
              Create free account →
            </Link>
            <Link className="aboutSecondary" href={`/${locale}/contact`}>
              Discuss your requirements
            </Link>
          </div>
        </section>
      </main>
    </PageShell>
  );
}

const styles = `.aboutCommercial{background:#f5f9fd;color:#071d3a}.aboutKicker{color:#1e5ee8;font-size:10px;font-weight:950;letter-spacing:.18em}.aboutHero{padding:72px 4.5vw 66px;display:grid;grid-template-columns:minmax(400px,.85fr) minmax(580px,1.15fr);gap:58px;align-items:center;background:radial-gradient(circle at 82% 8%,#d9ebff 0,transparent 35%),linear-gradient(120deg,#f9fcff,#edf5fd)}.aboutHero h1{font-size:clamp(48px,5vw,76px);line-height:1.02;letter-spacing:-.055em;margin:16px 0 23px}.aboutHero>div>p{max-width:720px;color:#526b86;font-size:19px;line-height:1.65}.aboutActions{display:flex;gap:12px;margin:29px 0 20px}.aboutPrimary,.aboutSecondary{min-height:52px;padding:0 21px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;font-weight:900}.aboutPrimary{background:#245de8;color:#fff;box-shadow:0 12px 25px #245de82e}.aboutSecondary{border:1px solid #afc1d4;background:#fff;color:#0b294b}.aboutTrust{display:flex;gap:17px;flex-wrap:wrap;color:#45617c;font-size:11px;font-weight:750}.aboutPreview{padding:18px;border:1px solid #d3e0ec;border-radius:17px;background:#fff;box-shadow:0 24px 60px #123b6628}.aboutPreviewTop{display:flex;justify-content:space-between;align-items:center;padding:4px 3px 15px}.aboutPreviewTop>div{display:flex;align-items:center;gap:9px}.aboutPreviewTop b{padding:9px;border-radius:7px;background:#08294f;color:#fff}.aboutPreviewTop span,.aboutPreviewTop small{color:#6b8299;font-size:10px}.aboutPreviewMetrics{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.aboutPreviewMetrics article{padding:16px;border:1px solid #dbe5ee;border-top:4px solid #2b64e8;border-radius:10px;background:#f9fbfe}.aboutPreviewMetrics span,.aboutPreviewMetrics small{display:block;color:#657b91;font-size:10px}.aboutPreviewMetrics b{display:block;margin:6px 0;font-size:28px}.aboutPreviewLower{display:grid;grid-template-columns:1.15fr .85fr;gap:9px;margin-top:9px}.aboutPreviewLower>section{padding:14px;border:1px solid #dbe5ee;border-radius:10px}.aboutPreviewLower header{display:flex;justify-content:space-between;margin-bottom:10px;font-size:10px}.aboutPreviewLower header span{color:#1d5ee8}.aboutPreviewLower section>div{display:flex;justify-content:space-between;padding:9px 0;border-top:1px solid #e8eef4;font-size:9px}.aboutPreviewLower em{padding:3px 5px;border-radius:5px;background:#e5f7ee;color:#05744d;font-style:normal}.aboutTrend>div{position:relative;height:100px!important;background:repeating-linear-gradient(to bottom,#fff,#fff 24px,#e7edf3 25px)!important;overflow:hidden}.aboutTrend i{position:absolute;left:5%;right:5%;height:3px;background:#2466e9;transform:rotate(-8deg)}.aboutTrend i:nth-child(1){top:68%}.aboutTrend i:nth-child(2){top:51%;background:#14a36d}.aboutTrend i:nth-child(3){top:79%;background:#e7a128}.aboutTrend strong{position:absolute;right:4px;top:4px;color:#0a9a66;font-size:10px}.aboutOutcome,.aboutJourney,.aboutHubs{padding:70px 4.5vw}.aboutOutcome>header,.aboutHubs>header{display:grid;grid-template-columns:1fr .7fr;gap:55px;align-items:end}.aboutOutcome h2,.aboutJourney h2,.aboutHubs h2,.aboutValueBand h2,.aboutDecision h2,.aboutFinal h2{font-size:clamp(32px,3.2vw,50px);line-height:1.08;letter-spacing:-.04em;margin:10px 0}.aboutOutcome header>p,.aboutHubs header>p{color:#5c7187;line-height:1.65}.aboutOutcomeGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:13px;margin-top:30px}.aboutOutcomeGrid article{padding:25px;border:1px solid #d4e0eb;border-radius:14px;background:#fff}.aboutOutcomeGrid article>b{color:#2561e8}.aboutOutcomeGrid h3{margin:19px 0 8px}.aboutOutcomeGrid p,.aboutJourney p,.aboutHubs p{color:#60758a;line-height:1.55;font-size:14px}.aboutValueBand{margin:0 4.5vw;padding:44px;border-radius:20px;background:linear-gradient(120deg,#061f40,#0d3b6b);color:#fff}.aboutValueBand .aboutKicker{color:#63dfd2}.aboutValueFlow{display:grid;grid-template-columns:1fr auto 1fr auto 1fr;gap:17px;align-items:center;margin-top:28px}.aboutValueFlow article{min-height:115px;padding:21px;border:1px solid #ffffff24;border-radius:12px;background:#ffffff0b}.aboutValueFlow b,.aboutValueFlow span{display:block}.aboutValueFlow b{font-size:17px}.aboutValueFlow span{margin-top:9px;color:#c8d9e9;font-size:13px;line-height:1.5}.aboutValueFlow i{color:#63dfd2;font-style:normal;font-size:23px}.aboutJourney>header{max-width:900px}.aboutJourney>div{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:28px}.aboutJourney article{padding:22px;border:1px solid #d4e0eb;border-radius:13px;background:#fff}.aboutJourney article>b{width:35px;height:35px;display:grid;place-items:center;border-radius:50%;background:#eaf1ff;color:#1e5ee8}.aboutJourney h3{margin:20px 0 7px}.aboutHubs{background:#fff}.aboutHubs>div{display:grid;grid-template-columns:repeat(3,1fr);gap:13px;margin-top:30px}.aboutHubs>div>a{padding:25px;border:1px solid #d3e0eb;border-radius:14px;color:#071d3a;text-decoration:none;transition:.2s}.aboutHubs>div>a:hover{transform:translateY(-3px);border-color:#8eb1f2;box-shadow:0 14px 30px #173c6612}.aboutHubs a>span{color:#1e5ee8;font-size:9px;font-weight:900;letter-spacing:.15em}.aboutHubs a>b{color:#1e5ee8;font-size:12px}.aboutDecision{padding:65px 4.5vw;display:grid;grid-template-columns:1fr .9fr;gap:65px;align-items:center}.aboutDecision>div>p{color:#5d7287;line-height:1.7;font-size:17px}.aboutDecision ul{list-style:none;margin:0;padding:0}.aboutDecision li{padding:18px 0;border-bottom:1px solid #d8e2ec}.aboutDecision li b,.aboutDecision li span{display:block}.aboutDecision li span{margin-top:5px;color:#62768b}.aboutFinal{margin:0 4.5vw 60px;padding:48px;border-radius:20px;background:#ffefb3;display:flex;align-items:center;justify-content:space-between;gap:50px}.aboutFinal>div:first-child{max-width:800px}.aboutFinal p{color:#52657b}.aboutFinal>div:last-child{display:grid;gap:10px;flex-shrink:0}@media(max-width:1050px){.aboutHero{grid-template-columns:1fr}.aboutOutcomeGrid,.aboutHubs>div{grid-template-columns:repeat(2,1fr)}.aboutJourney>div{grid-template-columns:repeat(3,1fr)}}@media(max-width:720px){.aboutHero,.aboutOutcome,.aboutJourney,.aboutHubs,.aboutDecision{padding:45px 20px}.aboutHero h1{font-size:45px}.aboutActions,.aboutFinal{display:grid}.aboutPrimary,.aboutSecondary{width:100%}.aboutPreviewLower,.aboutOutcome>header,.aboutHubs>header,.aboutDecision{grid-template-columns:1fr}.aboutOutcomeGrid,.aboutHubs>div,.aboutJourney>div{grid-template-columns:1fr}.aboutValueBand{margin:0 20px;padding:30px 22px}.aboutValueFlow{grid-template-columns:1fr}.aboutValueFlow i{transform:rotate(90deg);text-align:center}.aboutFinal{margin:0 20px 40px;padding:30px 23px}.aboutPreviewMetrics{grid-template-columns:1fr}.aboutTrust{display:grid}}`;
