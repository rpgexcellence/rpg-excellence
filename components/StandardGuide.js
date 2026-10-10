import Link from "next/link";
import StandaloneSoaButton from "./StandaloneSoaButton";
import GuideFactCards from "./GuideFactCards";

const ISO9001_2026_EXECUTIVE_LENS = [
  { title:"Quality culture", change:"More explicit attention to the behaviours and shared values that sustain quality.", decision:"Define the behaviours leaders will model, reward and correct across every process.", evidence:"Interview consistency, speak-up records, recognition, competence checks, process adherence and actions where culture weakened outcomes.", challenge:"How do leaders know the stated culture is the culture experienced at the point of work?" },
  { title:"Ethical behaviour", change:"Ethical conduct is made more visible within leadership and organisational expectations.", decision:"Set decision principles for commercial pressure, reporting integrity, product safety, customer promises and escalation.", evidence:"Code and communications, conflict routes, escalation records, decisions under pressure and protection against retaliation.", challenge:"Show a case where ethical expectations changed a decision, not merely a policy statement." },
  { title:"Risk and opportunity", change:"Adverse risks and beneficial opportunities require clearer, distinct consideration.", decision:"Set proportional methods, appetite, owners, actions and effectiveness measures without forcing both into one score.", evidence:"Connected context, process risks, opportunities, planned actions, resource decisions and outcome evaluation.", challenge:"Which opportunity was deliberately pursued, and what evidence shows that it created value?" },
  { title:"Resilience and controlled change", change:"Reliable delivery through operational and strategic change receives stronger practical emphasis.", decision:"Determine critical capabilities, dependencies, knowledge, capacity and controls that must be protected during change.", evidence:"Change impact reviews, contingencies, supplier capacity, knowledge retention, validation and post-change performance.", challenge:"Trace one recent change from approval through risk control to confirmed customer outcome." },
  { title:"Climate and sustainability context", change:"Climate-change relevance remains a mandatory context consideration; wider sustainability matters where relevant to QMS outcomes.", decision:"Record a defensible relevance decision and translate material issues into requirements, risks, objectives or controls.", evidence:"Context review, interested-party needs, design/procurement decisions, operational criteria and management-review inputs.", challenge:"Why is the relevance conclusion reasonable, and where can its operational effect be seen?" },
  { title:"Evidence-led leadership", change:"The 2026 edition reinforces leadership accountability and the use of meaningful evaluation, not document volume.", decision:"Agree the few measures and process trails that expose capability, customer impact and sustained effectiveness.", evidence:"Trends, process performance, customer perception, provider results, audit conclusions and closed-loop management actions.", challenge:"What did top management change because of QMS evidence during the last review cycle?" },
];

const ISO9001_2026_MILESTONES = [
  ["16 Sep 2026", "ISO 9001:2026 published", "Use the issued edition—not draft text—as the controlled baseline."],
  ["By 30 Sep 2027", "Certification system prepared", "Accreditation and certification bodies complete readiness activities."],
  ["From 31 Mar 2028", "New certifications to 2026", "Initial certifications should use ISO 9001:2026."],
  ["By 30 Sep 2029", "Transition completed", "Existing ISO 9001:2015 certifications transition by the stated deadline."],
];

const ISO9001_2026_BOARD_QUESTIONS = [
  "Which customer and interested-party outcomes define QMS success?",
  "Where could process interaction or supplier dependency defeat those outcomes?",
  "Which quality behaviours are expected, observed and independently tested?",
  "How are ethical concerns raised and protected when delivery pressure increases?",
  "Which risks are being reduced and which opportunities are deliberately pursued?",
  "What recent change was validated before and after implementation?",
  "Which performance trend demands a leadership decision now?",
  "How does management verify that corrective action remains effective?",
];

const ISO9001_2026_FACTS = [
  { label:"Structure", value:"Clauses 4–10", points:["Leadership-led process framework", "Seven auditable requirement clauses", "Plan–Do–Check–Act system logic"] },
  { label:"Approach", value:"Risk based", points:["Treat risks and opportunities distinctly", "Apply controls in proportion to consequence", "Use evidence to test actual effectiveness"] },
  { label:"Use", value:"Single or integrated", points:["Operate as a standalone QMS", "Integrate with ISO 14001, 45001 or 27001", "Scale controls to context and complexity"] },
  { label:"Assurance", value:"Evidence led", points:["Follow process trails, not documents alone", "Corroborate interviews with records and trends", "Connect gaps to Findings and CAPA-8D"] },
];

const ISO9001_2026_CLAUSES = {
  4:{ intent:"Define the business reality in which the QMS must succeed and establish an unambiguous system boundary.", requirements:["4.1 — determine relevant internal and external issues, including whether climate change is relevant","4.2 — determine relevant interested parties and their QMS requirements","4.3 — define and maintain the QMS scope","4.4 — establish, operate and improve interacting QMS processes"], application:"Run a structured context review with process owners; map customer, regulator, supplier, workforce and shareholder needs; justify inclusions and exclusions; define process inputs, outputs, sequence, criteria, resources, responsibilities and measures.", evidence:"Approved context and interested-party reviews; climate relevance rationale; scope; process architecture; process criteria; interaction and dependency maps; records of material changes.", questions:["Which changed issue most affected the QMS this year?","How did an interested-party requirement become an operating control?","Where are outsourced processes represented in the QMS boundary?"], failures:"Static SWOT analysis; unsupported climate conclusion; scope written to avoid difficult operations; process map with no owners, criteria or interaction controls.", output:"A controlled QMS scope and process architecture that drive risk, objectives, operation and assurance.", focus:"Climate relevance, changing stakeholder expectations, strategic alignment and proof that processes work as a system."},
  5:{ intent:"Make top management visibly accountable for QMS effectiveness, customer focus and the conditions in which quality can thrive.", requirements:["5.1 — demonstrate leadership, customer focus and integration into business processes","5.2 — establish, communicate and maintain the quality policy","5.3 — assign and communicate authorities and responsibilities","2026 focus — quality culture and ethical behaviour"], application:"Translate policy into decisions, resources and measures. Assign process ownership and deputies, define escalation rights, model ethical decision-making and test whether employees can explain how their work affects conformity and customers.", evidence:"Leadership decisions; business-plan alignment; resource approvals; policy deployment; owner appointments; communications; culture indicators; ethics/escalation cases; customer-risk decisions.", questions:["What QMS accountability has top management retained?","How are commercial pressures prevented from overriding conformity?","What evidence shows customer focus changed a decision?"], failures:"Delegating the QMS to a coordinator; generic policy; nominal owners without authority; culture survey results with no action; performance pressure suppressing escalation.", output:"Visible governance, empowered process owners and leadership behaviour consistent with the policy.", focus:"Quality culture, ethical behaviour, accountability, customer focus and demonstrable leadership decisions."},
  6:{ intent:"Convert uncertainty and strategic intent into proportionate, owned and measurable action.", requirements:["6.1 — address QMS risks and opportunities","6.2 — set quality objectives and plans to achieve them","6.3 — plan and control QMS changes"], application:"Use context and process data to separate risks from opportunities; decide treatment and resources; establish measurable objectives with baselines, targets, owners and evaluation methods; assess impacts before change and confirm results afterwards.", evidence:"Risk and opportunity records; rationale and appetite; objectives; plans; budgets; change-impact assessments; approvals; validation; effectiveness results.", questions:["Which risks were accepted and why?","Which opportunity received resources and what benefit was realised?","How was unintended impact assessed after change?"], failures:"One undifferentiated risk/opportunity register; every risk scored identically; objectives without baseline or owner; change implemented without capability or customer-impact review.", output:"A prioritised and resourced plan connected to process controls, objectives and measurable outcomes.", focus:"Distinct opportunity management, resilience, proportionality and controlled organisational or technological change."},
  7:{ intent:"Provide the people, infrastructure, knowledge, communication and controlled information required for capable processes.", requirements:["7.1 — resources, people, infrastructure, environment, monitoring resources and knowledge","7.2–7.3 — competence and awareness","7.4 — internal and external communication","7.5 — documented information control"], application:"Define role competence before training; verify capability at work; preserve critical knowledge; assure measurement validity; design communications by audience and purpose; control creation, approval, access, change, retention and disposition of information.", evidence:"Capacity plans; maintenance; calibration/verification; knowledge controls; competence matrices and observed assessments; communications; document history; access and retention records.", questions:["How was competence effectiveness verified beyond attendance?","What knowledge would be lost if a key person left?","How is obsolete information prevented from use?"], failures:"Training attendance treated as competence; overdue calibration; tribal knowledge; uncontrolled local copies; communication activity with no understanding check.", output:"Demonstrably capable people and dependable resources supported by available, protected and current information.", focus:"Awareness of culture and ethics, organisational knowledge, digital information integrity and resource resilience."},
  8:{ intent:"Control the complete route from customer need to conforming product or service, including external provision and change.", requirements:["8.1 — operational planning and control","8.2 — determine and review product/service requirements","8.3 — design and development, where applicable","8.4 — control externally provided processes, products and services","8.5–8.7 — provision, release and nonconforming outputs"], application:"Define acceptance criteria and controls at each process stage; confirm requirements before commitment; control design inputs, review and validation; segment suppliers by risk; protect identification, property and preservation; authorise release; segregate and decide nonconforming outputs.", evidence:"Contract reviews; specifications; plans; design records; supplier approval and monitoring; work records; traceability; change approvals; release authority; concession and nonconformity records.", questions:["Trace one customer requirement through delivery and release.","How does supplier criticality change the control applied?","Who may authorise concession and how is customer impact assessed?"], failures:"Informal requirement changes; unjustified design exclusion; suppliers approved on price alone; release without acceptance evidence; rework that hides recurring nonconformity.", output:"Repeatable operational control with traceable requirements, verified release and controlled exceptions.", focus:"Supply-chain resilience, digital/service delivery, change control and customer outcome protection."},
  9:{ intent:"Give leaders reliable evidence about performance, conformity and whether the QMS remains suitable and effective.", requirements:["9.1 — determine monitoring, measurement, analysis and evaluation, including customer perception","9.2 — conduct objective, risk-informed internal audits","9.3 — perform decision-focused management review"], application:"Define measures with method, frequency, owner and decision threshold; combine leading and lagging trends; build audits around risk and process trails; ensure reviewer independence; provide complete management-review inputs and retain decisions, actions and resource commitments.", evidence:"Measure definitions; dashboards and raw samples; customer insight; analysis; audit programme, competence, reports and follow-up; management-review inputs, minutes, decisions and actions.", questions:["Which indicator predicts failure before the customer experiences it?","How did audit priority respond to risk and previous results?","Which management-review output changed resources or the QMS?"], failures:"Vanity metrics; satisfaction survey with no analysis; checklist-only audits; auditors reviewing their own work; management review as a slide presentation without decisions.", output:"Trusted conclusions and timely leadership decisions based on connected performance and assurance evidence.", focus:"Data integrity, trends, process effectiveness, auditor competence and management action—not meeting attendance."},
  10:{ intent:"Restore control, remove systemic causes and improve QMS performance with verified, sustained results.", requirements:["10.1 — identify and select improvement opportunities","10.2 — control nonconformity and corrective action","10.3 — continually improve QMS suitability, adequacy and effectiveness"], application:"Contain the immediate effect; assess scope and recurrence risk; correct; analyse cause in proportion to significance; implement systemic action; update risks and controls; verify effectiveness after sufficient operating time; capture and share learning.", evidence:"Finding and complaint records; containment; impact/scope review; cause evidence; CAPA or 8D; action ownership; change records; effectiveness criteria and checks; trend and lessons learned.", questions:["How was the extent of condition established?","Why does the evidence support the stated root cause?","What proves the action remained effective rather than merely completed?"], failures:"Relabelling correction as corrective action; defaulting to retraining; cause chosen without evidence; closure on task completion; repeat findings not escalated.", output:"Closed-loop learning: Finding → containment → cause → CAPA/8D → independent effectiveness decision → updated system.", focus:"Proportionate cause analysis, recurrence prevention, verified effectiveness and organisation-wide learning."},
};

const ISO9001_2026_AUDIT_TRAILS = [
  ["Leadership to process", "Follow a strategic commitment through objectives, resources, process criteria, results and management action."],
  ["Customer to delivery", "Trace a sampled requirement from review and design through external provision, production or service, release and feedback."],
  ["Issue to effectiveness", "Follow a complaint or nonconformity through containment, cause, systemic action, change and independent effectiveness verification."],
  ["Change to capability", "Test whether a recent organisational, digital, supplier or product change protected knowledge, competence, controls and conformity."],
];

function Iso9001Clause({ clause, contactHref }) {
  const detail = ISO9001_2026_CLAUSES[clause.number];
  return <details className="clauseCard isoClauseCard">
    <summary><span>Clause {clause.number}</span><div><strong>{clause.title}</strong><p>{detail.intent}</p></div><b>Open audit guide</b></summary>
    <div className="isoClauseBody">
      <article className="isoClauseRequirements"><h3>Requirement map</h3><ol>{detail.requirements.map(item => <li key={item}>{item}</li>)}</ol></article>
      <article><h3>Practical application</h3><p>{detail.application}</p></article>
      <article><h3>Objective evidence and sampling</h3><p>{detail.evidence}</p></article>
      <article><h3>Auditor challenge questions</h3><ul>{detail.questions.map(item => <li key={item}>{item}</li>)}</ul></article>
      <article className="isoFailure"><h3>Weakness and escalation indicators</h3><p>{detail.failures}</p></article>
      <article><h3>Required management output</h3><p>{detail.output}</p></article>
      <article className="isoFocus"><h3>2026 assurance focus</h3><p>{detail.focus}</p></article>
      <article className="rpgSupport"><h3>RPG control pathway</h3><p>Assess the requirement, attach evidence and assign an accountable company user. A gap can create a controlled Finding, then escalate into CAPA-8D with cause analysis, due dates and effectiveness verification.</p><Link href={contactHref}>Discuss Clause {clause.number} support →</Link></article>
    </div>
  </details>;
}

export default function StandardGuide({ guide, locale }) {
  const contactHref = `/${locale}/contact?standard=${encodeURIComponent(guide.code)}&topic=${encodeURIComponent("Gap analysis and certification readiness")}`;
  const assessmentHref = guide.assessmentStandard
    ? `/portal?standard=${encodeURIComponent(guide.assessmentStandard)}#new-assessment`
    : "/portal";
  return <main className={`standardGuide ${guide.accent}`}>
    <section className="guideHero">
      <div><span className="guideBadge">{guide.code} GUIDE</span><h1>{guide.code} — {guide.title}</h1><p>{guide.summary}</p></div>
      <div className="guideHeroActions">
        <aside><strong>Educational guidance</strong><p>This guide paraphrases key themes for practical understanding. It does not reproduce the standard or replace the official licensed publication, legal advice or accredited certification decisions.</p></aside>
        <div className="assessmentLinkBox">
          <div><span>RPG INTELLIGENCE ASSESSMENT</span><strong>{guide.assessmentStandard ? `Assess your ${guide.code} readiness` : `Explore ${guide.code} assurance support`}</strong><p>{guide.assessmentStandard ? "Open the controlled clause-based assessment, record evidence and generate a management-ready readiness result." : "Open RPG Intelligence to review currently available assessments and assurance tools."}</p></div>
          <Link href={assessmentHref}>{guide.assessmentStandard ? "Start this assessment →" : "Open RPG Intelligence →"}</Link>
        </div>
        {guide.code === "ISO/IEC 27001" && (
          <div className="assessmentLinkBox soaProductBox">
            <div>
              <span>STANDALONE STATEMENT OF APPLICABILITY</span>
              <strong>Build or review your 93-control SoA</strong>
              <p>Document applicability, implementation, evidence, residual risk and approval decisions with ISO/IEC 27002-aligned guidance. Includes a controlled executive report and PDF.</p>
              <small>£129 one-off · 30-day completion access · retained read-only record</small>
            </div>
            <StandaloneSoaButton className="soaPurchaseButton">Buy standalone SoA →</StandaloneSoaButton>
          </div>
        )}
      </div>
    </section>
    <section className="guideOverview">
      <div><span className="kicker">Overview</span><h2>What this management system is designed to achieve</h2><p>{guide.purpose}</p><p>The value comes from integrating requirements into normal governance and operations—not producing documents solely for an audit.</p></div>
      {guide.assessmentStandard === "ISO 9001:2026" ? <GuideFactCards facts={ISO9001_2026_FACTS} /> : <div className="guideFacts"><div><span>Structure</span><strong>Clauses 4–10</strong></div><div><span>Approach</span><strong>Risk based</strong></div><div><span>Use</span><strong>Single or integrated</strong></div><div><span>Assurance</span><strong>Evidence led</strong></div></div>}
    </section>
    {guide.assessmentStandard === "ISO 9001:2026" && <>
      <section className="isoMilestones" aria-labelledby="iso9001-transition"><div className="isoSectionHead"><span className="kicker">ISSUED EDITION & TRANSITION</span><h2 id="iso9001-transition">A controlled route from publication to certification</h2><p>Use the published 2026 requirements as the baseline and agree the exact transition programme with your certification body.</p></div><div className="isoMilestoneGrid">{ISO9001_2026_MILESTONES.map(([date,title,text]) => <article key={date}><span>{date}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section>
      <section className="clauseSection" aria-labelledby="iso9001-executive-lens">
        <span className="kicker">2026 EDITION AT A GLANCE</span>
        <h2 id="iso9001-executive-lens">The executive change brief</h2>
        <p className="clauseIntro">The framework remains recognisable, but a document refresh is not a transition. Each theme below links the 2026 emphasis to a leadership decision, corroborating evidence and an auditor challenge.</p>
        <div className="isoChangeGrid">{ISO9001_2026_EXECUTIVE_LENS.map((item, index) => <article className="isoChangeCard" key={item.title}><div><span>0{index + 1}</span><h3>{item.title}</h3></div><dl><dt>What to address</dt><dd>{item.change}</dd><dt>Leadership decision</dt><dd>{item.decision}</dd><dt>Evidence to corroborate</dt><dd>{item.evidence}</dd><dt>Auditor challenge</dt><dd>{item.challenge}</dd></dl></article>)}</div>
      </section>
      <section className="isoBoardSection"><div><span className="kicker">BOARD & MANAGEMENT REVIEW</span><h2>Eight questions that expose readiness</h2><p>Answers should be supported by current evidence, named accountability and a decision—not assurance language alone.</p></div><ol>{ISO9001_2026_BOARD_QUESTIONS.map((item,index)=><li key={item}><span>{String(index+1).padStart(2,"0")}</span>{item}</li>)}</ol></section>
      <section className="guideOverview">
        <div><span className="kicker">AUDITOR PROCESS TRAILS</span><h2>Test the system end to end</h2><p>Clause compliance should be corroborated through representative process trails, interviews, observations, records and performance trends. These four trails expose whether the QMS operates as an interconnected system.</p></div>
        <div className="guideFacts">{ISO9001_2026_AUDIT_TRAILS.map(([title, text]) => <div key={title}><span>{title}</span><strong style={{fontSize:"14px",lineHeight:1.35}}>{text}</strong></div>)}</div>
      </section>
    </>}
    <section className="clauseSection" id="clauses">
      <span className="kicker">Clause navigator</span><h2>Key clauses explained</h2><p className="clauseIntro">Open any clause to see practical application, possible evidence, common weaknesses and relevant RPG Excellence support.</p>
      <div className={`clauseList ${guide.assessmentStandard === "ISO 9001:2026" ? "isoClauseList" : ""}`}>{guide.clauses.map((clause) => guide.assessmentStandard === "ISO 9001:2026" ? <Iso9001Clause key={clause.number} clause={clause} contactHref={contactHref} /> : <details className="clauseCard" key={clause.number}>
        <summary><span>Clause {clause.number}</span><div><strong>{clause.title}</strong><p>{clause.focus}</p></div><b>Explain this clause</b></summary>
        <div className="clauseExplanation">
          <article><h3>Practical application</h3><p>{clause.application}</p><p><strong>For {guide.code}:</strong> {clause.focus}</p></article>
          <article><h3>Objective evidence to consider</h3><p>{clause.evidence}</p></article>
          <article><h3>Common weakness</h3><p>{clause.pitfall}</p></article>
          <article className="rpgSupport"><h3>How RPG Excellence supports you</h3><p>{clause.support}</p><Link href={contactHref}>Discuss Clause {clause.number} support →</Link></article>
        </div>
      </details>)}</div>
    </section>
    <section className="guideSupport"><div><span>RPG EXCELLENCE SUPPORT</span><h2>Move from understanding to controlled implementation.</h2><p>Use RPG Excellence for gap analysis, implementation support, internal auditing, evidence control, findings, CAPA-8D and management reporting across a single or integrated system.</p></div><Link href={contactHref} className="button">Discuss {guide.code} support →</Link></section>
  </main>;
}
