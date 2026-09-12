import Link from "next/link";
import { notFound } from "next/navigation";

import Footer from "../../../components/Footer";
import Header from "../../../components/Header";
import TrainingPurchaseButton from "../../../components/TrainingPurchaseButton";
import { copy, locales } from "../../../lib/i18n";

export const metadata = {
  title: "Internal Auditor Refresher Training | RPG Excellence",
  description:
    "Interactive Internal Auditor Refresher training covering audit planning, interviewing, objective evidence, findings, reporting and effective follow-up.",
};

const modules = [
  ["01", "Auditor purpose and principles", "Refresh independence, integrity, confidentiality, evidence-based judgement and the value an internal audit should create."],
  ["02", "Risk-based audit planning", "Convert scope, criteria, process risk and previous performance into a focused, proportionate audit plan."],
  ["03", "Preparing the audit trail", "Select samples and build audit trails that connect requirements, process controls, records and intended outcomes."],
  ["04", "Interviewing and active listening", "Ask open, neutral questions, test understanding and follow evidence without leading the auditee."],
  ["05", "Evaluating objective evidence", "Separate fact from assumption, corroborate evidence and decide whether the sample supports a defensible conclusion."],
  ["06", "Writing useful findings", "Create precise findings that link the requirement, objective evidence and clear statement of the gap."],
  ["07", "Reporting and follow-up", "Communicate balanced conclusions and verify that corrective action is implemented and effective before closure."],
];

const decisionLabs = [
  ["Scope challenge", "Identify what belongs within the audit and what would create an unsupported expansion."],
  ["Interview simulator", "Choose the strongest follow-up question when evidence is incomplete or contradictory."],
  ["Evidence test", "Decide whether a record, observation or statement is sufficient and explain why."],
  ["Finding builder", "Assemble requirement, evidence and gap into a clear, traceable finding."],
  ["Grading exercise", "Distinguish conformity, opportunity for improvement and nonconformity."],
  ["Follow-up decision", "Determine whether action can close or needs further evidence of effectiveness."],
];

export default async function InternalAuditTrainingPage({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  const t = copy[locale];

  return (
    <>
      <Header locale={locale} nav={t.nav} />
      <main className="iaPublic">
        <section className="iaHero">
          <div>
            <span className="iaEyebrow">RPG INTERNAL AUDIT ACADEMY</span>
            <h1>Refresh auditor judgement through real audit decisions.</h1>
            <p>
              A concise interactive course for practising internal auditors. Work through
              evidence, interviews, findings and follow-up decisions—not passive slide reading.
            </p>
            <div className="iaActions">
              <TrainingPurchaseButton className="iaButton primary" course="internal-auditor-refresher">
                Buy refresher training
              </TrainingPurchaseButton>
              <Link className="iaButton secondary" href="/portal/internal-audit">Explore Internal Audit Hub</Link>
              <Link className="iaButton secondary" href="/verify/training">Verify certificate</Link>
            </div>
            <small>Individual access £19.99 + VAT. Secure payment and immediate learner access.</small>
          </div>

          <aside className="iaOffer">
            <span>INTERNAL AUDITOR REFRESHER</span>
            <h2>Practical Audit Decisions</h2>
            <div className="iaPrice"><strong>£19.99</strong><small>+ VAT / learner</small></div>
            <ul>
              <li>Seven interactive modules</li>
              <li>Applied audit scenarios and immediate guidance</li>
              <li>Ten-question protected final assessment</li>
              <li>80% pass mark with attempt history</li>
              <li>Downloadable, verifiable certificate</li>
              <li>Approximately 35–45 minutes</li>
            </ul>
            <TrainingPurchaseButton className="iaButton primary full" course="internal-auditor-refresher">
              Start your refresher
            </TrainingPurchaseButton>
          </aside>
        </section>

        <section className="iaSection">
          <span className="iaEyebrow">COMMERCIAL VALUE</span>
          <h2>More than awareness: a controlled refresher record.</h2>
          <div className="iaValueGrid">
            {[
              ["Applied capability", "Every module requires a decision, rationale or structured audit response."],
              ["Immediate coaching", "The guidance engine highlights missing evidence and explains what needs attention."],
              ["Controlled progression", "Modules unlock in sequence and completion evidence is retained."],
              ["Verified result", "Protected answer keys, attempt history and a public certificate verification route support assurance."],
            ].map(([title, body], index) => (
              <article key={title}><b>{String(index + 1).padStart(2, "0")}</b><h3>{title}</h3><p>{body}</p></article>
            ))}
          </div>
        </section>

        <section className="iaLabs">
          <div className="iaSection">
            <span className="iaEyebrow">INTERACTIVE DECISION LABS</span>
            <h2>Practise the judgement an auditor actually needs.</h2>
            <div className="iaLabGrid">
              {decisionLabs.map(([title, body]) => (
                <article key={title}><span>◆</span><div><h3>{title}</h3><p>{body}</p></div></article>
              ))}
            </div>
          </div>
        </section>

        <section className="iaSection">
          <div className="iaSectionHead">
            <div><span className="iaEyebrow">COURSE CONTENT</span><h2>Seven focused modules</h2></div>
            <strong>35–45 minutes</strong>
          </div>
          <div className="iaModules">
            {modules.map(([number, title, body]) => (
              <article key={number}><b>{number}</b><div><h3>{title}</h3><p>{body}</p></div></article>
            ))}
          </div>
        </section>

        <section className="iaNote">
          <div><span className="iaEyebrow">COMPETENCE NOTE</span><h2>Refresher training supports—but does not alone prove—auditor competence.</h2></div>
          <p>
            Organisations should also evaluate relevant education, work and audit experience,
            observed performance and continuing professional development before assigning an auditor.
          </p>
        </section>

        <section className="iaCta">
          <span className="iaEyebrow">READY TO REFRESH?</span>
          <h2>Strengthen evidence-based audit decisions.</h2>
          <div className="iaActions">
            <TrainingPurchaseButton className="iaButton primary lightPrimary" course="internal-auditor-refresher">
              Buy for £19.99 + VAT
            </TrainingPurchaseButton>
            <Link className="iaButton secondary light" href={"/" + locale + "/contact"}>Organisation licences</Link>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
      <style>{styles}</style>
    </>
  );
}

const styles = `
  .iaPublic{background:#f4f8fb;color:#071a3d}.iaHero{max-width:1240px;margin:auto;padding:88px 28px 70px;display:grid;grid-template-columns:minmax(0,1.45fr) minmax(330px,.7fr);gap:54px;align-items:center}.iaEyebrow{display:block;color:#0a56e8;font-size:12px;font-weight:900;letter-spacing:.13em;margin-bottom:14px}.iaHero h1{font-size:clamp(42px,5.2vw,72px);line-height:.98;letter-spacing:-.055em;margin:0 0 24px;max-width:820px}.iaHero>div>p{font-size:20px;line-height:1.55;color:#425777;max-width:760px}.iaActions{display:flex;gap:12px;flex-wrap:wrap;margin:29px 0 16px}.iaButton{display:inline-flex;align-items:center;justify-content:center;min-height:50px;padding:0 22px;border-radius:10px;text-decoration:none;font:inherit;font-weight:850;cursor:pointer}.iaButton.primary{border:0;background:#0a56e8;color:#fff}.iaButton.secondary{border:1px solid #b9c8db;background:#fff;color:#071a3d}.iaButton:disabled{cursor:wait;opacity:.7}.iaOffer{padding:30px;border-radius:22px;background:#102e59;color:#fff;box-shadow:0 24px 60px rgba(7,26,61,.18)}.iaOffer>span{color:#71e0c1;font-size:11px;font-weight:900;letter-spacing:.12em}.iaOffer h2{font-size:30px;margin:14px 0}.iaPrice{display:flex;gap:10px;align-items:baseline;margin:20px 0}.iaPrice strong{font-size:40px}.iaPrice small{color:#c9d5e5}.iaOffer ul{padding-left:20px;color:#e4ebf5;line-height:1.9}.full{width:100%;box-sizing:border-box}.iaSection{max-width:1184px;margin:auto;padding:72px 28px}.iaSection h2,.iaNote h2,.iaCta h2{font-size:clamp(30px,4vw,48px);letter-spacing:-.035em;margin:0 0 18px}.iaValueGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:32px}.iaValueGrid article,.iaLabGrid article{padding:22px;border:1px solid #d8e3ed;border-radius:15px;background:#fff}.iaValueGrid b,.iaSectionHead>strong{color:#0a56e8}.iaValueGrid h3{margin:18px 0 8px}.iaValueGrid p,.iaLabGrid p,.iaModules p,.iaNote p{color:#506482;line-height:1.55}.iaLabs{background:#fff}.iaLabGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin-top:30px}.iaLabGrid article{display:flex;gap:14px}.iaLabGrid article>span{color:#0a56e8}.iaLabGrid h3{margin:0 0 7px}.iaLabGrid p{margin:0}.iaSectionHead{display:flex;justify-content:space-between;gap:24px;align-items:flex-end}.iaModules{margin-top:28px;border-top:1px solid #cad7e7}.iaModules article{display:grid;grid-template-columns:55px 1fr;gap:18px;padding:21px 4px;border-bottom:1px solid #cad7e7}.iaModules article>b{color:#0a56e8;font-size:19px}.iaModules h3{margin:0 0 6px}.iaModules p{margin:0}.iaNote{max-width:1128px;box-sizing:border-box;margin:18px auto 80px;padding:34px;border:1px solid #e8b23b;border-left:7px solid #e8b23b;border-radius:14px;background:#fff9e8;display:grid;grid-template-columns:.9fr 1.1fr;gap:34px}.iaNote h2{font-size:28px}.iaCta{padding:68px max(28px,calc((100% - 1128px)/2));background:#102e59;color:#fff}.iaCta .iaEyebrow{color:#71e0c1}.iaCta h2{max-width:760px}.lightPrimary{background:#16a27f!important}.iaButton.light{border-color:#fff;background:transparent;color:#fff}@media(max-width:900px){.iaHero,.iaNote{grid-template-columns:1fr}.iaValueGrid,.iaLabGrid{grid-template-columns:1fr 1fr}}@media(max-width:580px){.iaHero{padding-top:58px}.iaHero h1{font-size:42px}.iaValueGrid,.iaLabGrid{grid-template-columns:1fr}.iaSectionHead{align-items:flex-start;flex-direction:column}}
`;

