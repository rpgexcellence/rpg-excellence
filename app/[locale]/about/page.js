import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import { locales } from "../../../lib/i18n";

export const metadata = {
  title: "About RPG Excellence | Practical Business Assurance",
  description: "Practitioner-led digital assurance for ISO assessment, health and safety, internal audit, RCA–8D and competence development.",
};

const principles = [
  ["Evidence before opinion", "Decisions should be traceable to requirements, observed conditions and objective evidence."],
  ["Action before administration", "Records have value when they create ownership, proportionate controls and verified improvement."],
  ["Competence before automation", "Digital guidance supports professional judgement; it does not replace accountable people."],
  ["Verification before closure", "An action is not complete because it was entered into a system. Results must be checked and sustained."],
];

const capabilities = [
  ["Assessment & Gap Analysis", "Evidence-led ISO readiness, findings, action planning and executive reporting.", "/portal"],
  ["Health & Safety Hub", "Workplace risk assessment, interactive risk evaluation, action verification and training.", "/hs-hub"],
  ["Internal Audit Hub", "Audit programmes, evidence-led execution, findings and effectiveness review.", "/internal-audit"],
  ["RCA–8D Hub", "Controlled D1–D8 problem solving from containment through verified closure.", "/capa-8d"],
];

export default async function About({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();

  return (
    <PageShell locale={locale}>
      <main className="simplePage">
        <div className="simpleInner">
          <span className="kicker">ABOUT RPG EXCELLENCE</span>
          <h1>Practical assurance that turns evidence into controlled action.</h1>
          <p className="lead">
            RPG Excellence brings management-system expertise, operational risk
            control, internal auditing and structured problem solving into one
            connected platform. It is for organisations that need more than a
            checklist: they need a dependable record of what was assessed,
            decided, assigned and verified.
          </p>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",margin:"28px 0 58px"}}>
            <Link className="button" href={`/${locale}/ai-tools`}>Explore the platform</Link>
            <Link className="button buttonSecondary" href={`/${locale}/contact`}>Discuss your requirements</Link>
          </div>

          <span className="kicker">HOW WE WORK</span>
          <h2>Built around the disciplines that make assurance credible.</h2>
          <p className="lead">
            Technology improves consistency and visibility, but credible
            assurance still depends on evidence, competent judgement,
            accountability and independent verification.
          </p>
          <div className="toolGrid" style={{marginTop:28}}>
            {principles.map(([title, body], index) => (
              <article className="toolCard" key={title}>
                <span className="toolIcon">{String(index + 1).padStart(2, "0")}</span>
                <strong>{title}</strong>
                <span>{body}</span>
              </article>
            ))}
          </div>

          <section style={{marginTop:70}}>
            <span className="kicker">CONNECTED ASSURANCE</span>
            <h2>Specialist hubs. One controlled improvement journey.</h2>
            <p className="lead">
              Each hub solves a distinct operational need while sharing the same
              approach to evidence, ownership, action and management insight.
            </p>
            <div className="toolGrid" style={{marginTop:28}}>
              {capabilities.map(([title, body, path]) => (
                <Link
                  className="toolCard toolCardLink"
                  href={path === "/portal" ? path : `/${locale}${path}`}
                  key={title}
                  style={{color:"inherit",textDecoration:"none"}}
                >
                  <span className="toolIcon">◆</span>
                  <strong>{title}</strong>
                  <span>{body}</span>
                  <span aria-hidden="true">Explore →</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="notice" style={{marginTop:70,padding:32}}>
            <span className="kicker">RPG TRAINING ACADEMY</span>
            <h2>Training designed to leave evidence of applied learning.</h2>
            <p>
              Learners practise risk-assessment, internal-audit and RCA–8D
              decisions, receive immediate guidance, complete a protected
              assessment and receive a verifiable certificate. Selected courses
              also produce a downloadable practitioner workbook.
            </p>
            <Link className="button" href={`/${locale}/ai-tools`}>View training products</Link>
          </section>

          <section style={{marginTop:70}}>
            <span className="kicker">RESPONSIBLE USE</span>
            <h2>Decision support—not a substitute for responsibility.</h2>
            <p className="lead">
              RPG Excellence outputs do not constitute certification, legal
              advice or an accredited audit. Organisations remain responsible
              for competent review, applicable legal and contractual
              requirements, site-specific conditions and final decisions.
            </p>
          </section>
        </div>
      </main>
    </PageShell>
  );
}
