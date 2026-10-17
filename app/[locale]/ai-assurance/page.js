import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import { locales } from "../../../lib/i18n";

export const metadata = {
  title: "AI Assurance and Guardrails | RPG Excellence",
  description:
    "The RPG Excellence framework for responsible AI-supported assurance, including human authority, data boundaries, verification, traceability and change control.",
  alternates: { canonical: "/en/ai-assurance" },
};

const capabilities = [
  [
    "ACTIVE",
    "Structured calculations and decision support",
    "Controlled application logic applies defined scoring, thresholds, status rules and workflow conditions.",
    "The responsible user checks the inputs, rationale and resulting decision before approval.",
  ],
  [
    "ACTIVE",
    "Controlled report assembly",
    "Approved platform records are assembled into structured reports and draft narrative using application rules and templates.",
    "Named preparers, reviewers and approvers remain responsible for the issued report.",
  ],
  [
    "CONTROLLED BOUNDARY",
    "Automated prompts and recommendations",
    "The platform highlights missing information, due activity, risk conditions and suggested next steps.",
    "A prompt cannot approve an audit, accept a risk, close a finding or verify effectiveness.",
  ],
  [
    "NOT CURRENTLY RELIED UPON",
    "External generative-model decision making",
    "RPG Excellence does not treat an external generative model as an autonomous assurance decision maker.",
    "Any future provider-enabled feature must be documented, assessed and released under the controls on this page before customer use.",
  ],
];

const guardrails = [
  ["Defined purpose", "Each assisted feature must have a stated user need, permitted use and prohibited use."],
  ["Minimum necessary data", "Users should provide only information relevant to the task. Passwords, recovery codes, secret keys and unnecessary sensitive personal data must not be entered."],
  ["Evidence before output", "Assisted wording does not become objective evidence. Conclusions must remain traceable to controlled records, observations, interviews, samples and applicable requirements."],
  ["Human review and authority", "An authorised and competent person remains responsible for relevance, accuracy, context, approval and any action taken from the output."],
  ["Explainable calculations", "Where the platform calculates risk, priority, progress or status, the relevant inputs, method and threshold should remain visible or documentable."],
  ["Role and tenant boundaries", "Assisted functionality must not bypass subscription entitlement, organisation scope, user permissions, approval gates or administrative controls."],
  ["Testing before release", "Material features are reviewed against intended behaviour, known failure modes, inappropriate reliance, access boundaries and representative use cases."],
  ["Challenge and correction", "Users can reject unsuitable output and report material errors, privacy concerns or security issues for triage, correction and feature review."],
];

const prohibited = [
  "Issuing or representing an accredited certification decision",
  "Closing a nonconformity or CAPA without authorised verification",
  "Accepting residual risk on behalf of an accountable owner",
  "Replacing a task-specific safety, legal, medical or engineering assessment",
  "Creating evidence that was not observed, supplied or independently verified",
  "Overriding organisation access, approval or segregation-of-duty controls",
];

export default async function AiAssurancePage({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();

  return (
    <PageShell locale={locale}>
      <main className="aiPage">
        <section className="aiHero">
          <div>
            <span>RPG EXCELLENCE · AI ASSURANCE</span>
            <h1>Useful assistance. Visible limits. Accountable decisions.</h1>
            <p>RPG Excellence uses structured automation and decision support to help people organise evidence, identify priorities and prepare controlled outputs. Technology can assist the work; it does not inherit the authority or professional accountability of the user.</p>
            <div className="actions">
              <Link href={`/${locale}/security-and-trust`}>Review Security &amp; Trust</Link>
              <Link href={`/${locale}/contact?topic=AI%20assurance`}>Raise an AI assurance question</Link>
            </div>
          </div>
          <aside>
            <small>CONTROL POSITION</small>
            <strong>Human-authorised</strong>
            <dl>
              <div><dt>Evidence</dt><dd>Required</dd></div>
              <div><dt>Approval</dt><dd>Named person</dd></div>
              <div><dt>Autonomous certification</dt><dd>Not permitted</dd></div>
              <div><dt>Last reviewed</dt><dd>17 October 2026</dd></div>
            </dl>
          </aside>
        </section>

        <section className="principle">
          <span>CORE PRINCIPLE</span>
          <h2>No automated or assisted output becomes an approved assurance conclusion merely because the platform produced it.</h2>
          <p>Approval remains attributable to an authorised person and must be supported by appropriate evidence.</p>
        </section>

        <section className="section">
          <header>
            <span>CURRENT CAPABILITY REGISTER</span>
            <h2>What the platform does today—and where the boundary sits.</h2>
            <p>This register separates deterministic platform functions from future or provider-enabled generative capabilities. It will be revised when the processing method or customer data flow changes.</p>
          </header>
          <div className="capabilities">
            <div className="tableHead"><b>Status</b><b>Capability</b><b>How it works</b><b>Human control</b></div>
            {capabilities.map(([status, capability, method, control]) => (
              <article key={capability}>
                <span data-label="Status">{status}</span>
                <strong data-label="Capability">{capability}</strong>
                <p data-label="How it works">{method}</p>
                <p data-label="Human control">{control}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="guardrails">
          <header><span>CONTROL FRAMEWORK</span><h2>Eight guardrails applied across assisted features.</h2></header>
          <div>
            {guardrails.map(([heading, text], index) => (
              <article key={heading}><b>{String(index + 1).padStart(2, "0")}</b><h3>{heading}</h3><p>{text}</p></article>
            ))}
          </div>
        </section>

        <section className="section">
          <header><span>DATA AND PROCESSING BOUNDARIES</span><h2>Customer information is not an unrestricted AI input.</h2></header>
          <div className="cards">
            <article><small>01</small><h3>Purpose limitation</h3><p>Information should be processed only for the documented feature purpose and within the user&apos;s authorised organisation.</p></article>
            <article><small>02</small><h3>Provider transparency</h3><p>If an external model provider is introduced, RPG Excellence will identify the purpose, relevant data flow, provider role and available user controls before customer use.</p></article>
            <article><small>03</small><h3>No silent authority transfer</h3><p>Introducing an assisted feature does not change user roles, subscription access, approval authority or accountable ownership.</p></article>
          </div>
        </section>

        <section className="prohibited">
          <div><span>PROHIBITED RELIANCE</span><h2>What assisted functionality must not do.</h2></div>
          <ul>{prohibited.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>

        <section className="section">
          <header><span>FEATURE LIFECYCLE</span><h2>From proposal to controlled operation.</h2></header>
          <div className="lifecycle">
            {[
              ["01", "Define", "Purpose, users, inputs, outputs and prohibited reliance"],
              ["02", "Assess", "Privacy, security, access, bias and failure scenarios"],
              ["03", "Test", "Representative cases, boundary checks and human review"],
              ["04", "Release", "Guidance, limitations, version control and monitoring"],
              ["05", "Review", "Errors, user challenge, material changes and withdrawal"],
            ].map(([number, title, text]) => <article key={number}><b>{number}</b><h3>{title}</h3><p>{text}</p></article>)}
          </div>
        </section>

        <section className="challenge">
          <div><span>CHALLENGE, ERROR OR CONCERN</span><h2>Users should question output that does not fit the evidence.</h2><p>A material accuracy, privacy, security or inappropriate-reliance concern should be reported with the feature, record reference and reason for challenge. RPG Excellence can then determine whether correction, guidance, restriction or withdrawal is required.</p></div>
          <Link href={`/${locale}/contact?topic=AI%20output%20challenge`}>Report a concern →</Link>
        </section>

        <p className="version">Public control statement · Version 1.0 · Reviewed 17 October 2026. This page will be updated when material functionality or processing changes.</p>
      </main>
      <style>{styles}</style>
    </PageShell>
  );
}

const styles = `
.aiPage{background:#f3f7fb;color:#071d3a}.aiHero{max-width:1280px;margin:auto;padding:76px 30px 66px;display:grid;grid-template-columns:minmax(0,1.35fr) minmax(310px,.65fr);gap:55px;align-items:center}.aiHero>div>span,.section header>span,.guardrails header>span,.prohibited>div>span,.challenge span{color:#068c8f;font-size:11px;font-weight:950;letter-spacing:.14em}.aiHero h1{max-width:860px;margin:14px 0 22px;font-size:clamp(48px,5.5vw,76px);line-height:.99;letter-spacing:-.055em}.aiHero p{max-width:850px;color:#536b82;font-size:18px;line-height:1.7}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:28px}.actions a,.challenge a{display:inline-flex;min-height:48px;padding:0 18px;align-items:center;border-radius:9px;background:#1762e8;color:#fff;text-decoration:none;font-weight:900}.actions a:nth-child(2){border:1px solid #becddd;background:#fff;color:#183b5c}.aiHero aside{padding:28px;border-radius:20px;background:linear-gradient(145deg,#08294f,#103f73);color:#fff;box-shadow:0 22px 48px #071d3a2b}.aiHero aside small{color:#59ddd3;font-weight:900;letter-spacing:.12em}.aiHero aside strong{display:block;margin:12px 0 24px;font-size:32px}.aiHero dl{margin:0}.aiHero dl div{display:flex;justify-content:space-between;gap:20px;padding:12px 0;border-top:1px solid #ffffff24}.aiHero dt{color:#b9cde0}.aiHero dd{margin:0;font-weight:850;text-align:right}.principle{padding:58px max(30px,calc((100% - 1220px)/2));background:#08294f;color:#fff}.principle span{color:#59ddd3;font-size:11px;font-weight:950;letter-spacing:.14em}.principle h2{max-width:1040px;margin:13px 0;font-size:clamp(32px,4vw,49px);line-height:1.12;letter-spacing:-.035em}.principle p{margin:0;color:#c8d7e6;font-size:17px}.section,.guardrails{max-width:1280px;margin:auto;padding:72px 30px}.section header,.guardrails header{max-width:900px}.section h2,.guardrails h2,.prohibited h2,.challenge h2{margin:10px 0 13px;font-size:clamp(34px,4vw,52px);letter-spacing:-.04em}.section header>p{color:#566f85;font-size:17px;line-height:1.65}.capabilities{margin-top:30px;border:1px solid #cfdae5;border-radius:16px;overflow:hidden;background:#fff}.tableHead,.capabilities article{display:grid;grid-template-columns:165px 1fr 1.25fr 1.25fr;gap:20px}.tableHead{padding:13px 20px;background:#e7eef7;color:#49627a;font-size:11px;text-transform:uppercase;letter-spacing:.08em}.capabilities article{padding:22px 20px;border-top:1px solid #dbe4ec;align-items:start}.capabilities article>span{width:max-content;max-width:100%;padding:5px 7px;border-radius:999px;background:#daf5ef;color:#08765f;font-size:9px;font-weight:950;letter-spacing:.07em}.capabilities strong{font-size:16px}.capabilities p{margin:0;color:#587087;font-size:14px;line-height:1.55}.guardrails{max-width:none;padding-left:max(30px,calc((100% - 1220px)/2));padding-right:max(30px,calc((100% - 1220px)/2));background:linear-gradient(135deg,#edf8f6,#edf3ff)}.guardrails>div{display:grid;grid-template-columns:1fr 1fr;gap:13px;margin-top:30px}.guardrails article{padding:24px;border:1px solid #cbd9e5;border-radius:14px;background:#fff}.guardrails article>b{color:#078b91;font-size:12px}.guardrails h3{margin:12px 0 8px;font-size:20px}.guardrails p{margin:0;color:#577087;line-height:1.6}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:28px}.cards article{padding:26px;border:1px solid #d1dde7;border-radius:15px;background:#fff}.cards small{color:#078b91;font-weight:900}.cards h3{margin:15px 0 8px;font-size:21px}.cards p{margin:0;color:#587087;line-height:1.62}.prohibited{padding:66px max(30px,calc((100% - 1220px)/2));display:grid;grid-template-columns:.8fr 1.2fr;gap:65px;background:#0a2748;color:#fff}.prohibited ul{margin:0;padding:0;list-style:none}.prohibited li{padding:14px 0 14px 28px;border-bottom:1px solid #ffffff24;color:#cedbe7;position:relative}.prohibited li:before{content:'×';position:absolute;left:0;color:#ffb95e;font-size:20px;font-weight:900}.lifecycle{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:28px}.lifecycle article{min-height:175px;padding:21px;border-radius:14px;background:linear-gradient(145deg,#092a4f,#155087);color:#fff}.lifecycle b{color:#58ddd4;font-size:12px}.lifecycle h3{margin:20px 0 9px;font-size:20px}.lifecycle p{margin:0;color:#c3d3e2;font-size:13px;line-height:1.52}.challenge{max-width:1220px;margin:0 auto 45px;padding:38px;display:grid;grid-template-columns:1fr auto;gap:35px;align-items:center;border-radius:19px;background:#e5f1ff}.challenge p{max-width:850px;margin:0;color:#526d84;line-height:1.65}.version{max-width:1220px;margin:0 auto;padding:0 30px 70px;color:#667b8f;font-size:13px;line-height:1.55}@media(max-width:960px){.aiHero{grid-template-columns:1fr}.tableHead{display:none}.capabilities article{grid-template-columns:1fr 1fr}.capabilities [data-label]:before{content:attr(data-label);display:block;margin-bottom:7px;color:#76899b;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.08em}.cards{grid-template-columns:1fr}.lifecycle{grid-template-columns:repeat(2,1fr)}}@media(max-width:700px){.aiHero{padding:52px 18px}.aiHero h1{font-size:45px}.section,.guardrails{padding:50px 18px}.guardrails>div,.prohibited,.challenge{grid-template-columns:1fr}.capabilities article{grid-template-columns:1fr}.prohibited{padding:50px 22px}.lifecycle{grid-template-columns:1fr}.challenge{margin:0 18px 38px;padding:27px}.version{padding:0 18px 55px}}
`;
