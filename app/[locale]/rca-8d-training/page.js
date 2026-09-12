import Link from "next/link";
import { notFound } from "next/navigation";

import Footer from "../../../components/Footer";
import Header from "../../../components/Header";
import TrainingPurchaseButton from "../../../components/TrainingPurchaseButton";
import { copy, locales } from "../../../lib/i18n";

export const metadata = {
  title: "RCA and Corrective Action Practitioner Training | RPG Excellence",
  description:
    "A 180-minute interactive RCA and corrective action practitioner course with structured exercises, downloadable workbook and verifiable certificate.",
};

const modules = [
  ["01", "Triage and investigation threshold", "Separate correction, containment and structured investigation; decide when an 8D response is proportionate."],
  ["02", "Build the team and scope", "Define authority, roles, expertise, boundaries and decision ownership before causal analysis begins."],
  ["03", "Define the problem precisely", "Use is/is-not logic and evidence to describe what, where, when, extent and impact without embedding an assumed cause."],
  ["04", "Contain and protect", "Select immediate controls that protect customers and operations while preserving evidence and avoiding new risks."],
  ["05", "Analyse occurrence, escape and system causes", "Use three-direction 5 Why analysis to test how the problem occurred, escaped detection and was enabled by the management system."],
  ["06", "Human and organisational factors", "Examine task design, competence, workload, supervision, interfaces and error-likely conditions without defaulting to blame."],
  ["07", "Select corrective actions", "Compare solution strength and choose actions that address verified causal mechanisms rather than symptoms."],
  ["08", "Implement and validate", "Assign ownership, control change, confirm implementation and validate that each action performs as intended."],
  ["09", "Review extent of condition", "Test where else the same causes, controls or failure pathways could exist across products, processes and sites."],
  ["10", "Verify effectiveness and close", "Set leading and lagging measures, review sustained results independently and reopen the case when evidence is insufficient."],
];

const decisionLabs = [
  ["Triage decision", "Decide whether an event needs correction only, containment, or a controlled 8D investigation."],
  ["Problem-definition builder", "Choose evidence that sharpens the problem statement without introducing an assumed cause."],
  ["Three-direction 5 Why", "Trace occurrence, escape and system-prevention pathways and identify where evidence is still missing."],
  ["Human-factors review", "Distinguish individual action from the conditions and controls that shaped it."],
  ["Action-strength comparison", "Select controls that act directly on verified causes and reject weak administrative substitutes."],
  ["Effectiveness gate", "Decide whether results demonstrate sustained improvement or require the case to remain open."],
];

export default async function RcaTrainingPublicPage({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  const t = copy[locale];

  return (
    <>
      <Header locale={locale} nav={t.nav} />
      <main className="iaPublic">
        <section className="iaHero">
          <div>
            <span className="iaEyebrow">RPG RCA–8D ACADEMY</span>
            <h1>Turn recurring problems into verified corrective action.</h1>
            <p>
              A detailed interactive practitioner course for people who investigate failures and manage corrective action. Work through evidence, causal logic, action selection and effectiveness decisions—not passive slide reading.
            </p>
            <div className="iaActions">
              <TrainingPurchaseButton className="iaButton primary" course="rca-8d-practitioner">
                Buy practitioner training
              </TrainingPurchaseButton>
              <Link className="iaButton secondary" href="/portal/rca">Explore RCA–8D Hub</Link>
              <Link className="iaButton secondary" href="/verify/training">Verify certificate</Link>
            </div>
            <small>Individual access £49.99. No VAT is charged. Includes the practitioner workbook, final assessment and certificate.</small>
          </div>

          <aside className="iaOffer">
            <span>RCA AND CORRECTIVE ACTION PRACTITIONER</span>
            <h2>Evidence-led Problem Solving</h2>
            <div className="iaPrice"><strong>£49.99</strong><small>per learner</small></div>
            <ul>
              <li>Ten interactive modules</li>
              <li>Structured practitioner exercises with immediate guidance</li>
              <li>Three-direction 5 Why and evidence-building tools</li>
              <li>Downloadable completed practitioner workbook</li>
              <li>Twelve-question protected final assessment</li>
              <li>80% pass mark with attempt history</li>
              <li>Downloadable, verifiable certificate</li>
              <li>Approximately 180 minutes</li>
            </ul>
            <TrainingPurchaseButton className="iaButton primary full" course="rca-8d-practitioner">
              Start practitioner training
            </TrainingPurchaseButton>
          </aside>
        </section>

        <section className="iaSection">
          <span className="iaEyebrow">COMMERCIAL VALUE</span>
          <h2>More than awareness: a controlled practitioner record.</h2>
          <div className="iaValueGrid">
            {[
              ["Applied capability", "Every module requires an RCA decision, rationale or structured problem-solving response."],
              ["Immediate coaching", "The guidance engine highlights missing evidence and explains what needs attention."],
              ["Reusable workbook", "The learner can download a completed practitioner workbook containing their structured investigation evidence."],
              ["Verified result", "Controlled progression, protected assessment, attempt history and public certificate verification support assurance."],
            ].map(([title, body], index) => (
              <article key={title}><b>{String(index + 1).padStart(2, "0")}</b><h3>{title}</h3><p>{body}</p></article>
            ))}
          </div>
        </section>

        <section className="iaLabs">
          <div className="iaSection">
            <span className="iaEyebrow">INTERACTIVE DECISION LABS</span>
            <h2>Practise the judgement an RCA leader actually needs.</h2>
            <div className="iaLabGrid">
              {decisionLabs.map(([title, body]) => (
                <article key={title}><span>◆</span><div><h3>{title}</h3><p>{body}</p></div></article>
              ))}
            </div>
          </div>
        </section>

        <section className="iaSection">
          <div className="iaSectionHead">
            <div><span className="iaEyebrow">COURSE CONTENT</span><h2>Ten detailed modules</h2></div>
            <strong>Approximately 180 minutes</strong>
          </div>
          <div className="iaModules">
            {modules.map(([number, title, body]) => (
              <article key={number}><b>{number}</b><div><h3>{title}</h3><p>{body}</p></div></article>
            ))}
          </div>
        </section>

        <section className="iaNote">
          <div><span className="iaEyebrow">COMPETENCE NOTE</span><h2>Training supports—but does not alone prove—RCA practitioner competence.</h2></div>
          <p>
            Organisations should also evaluate relevant education, investigation experience, observed performance, authority and continuing professional development before assigning an RCA leader.
          </p>
        </section>

        <section className="iaWorkbook">
          <div>
            <span className="iaEyebrow">INCLUDED WITH THE £49.99 COURSE</span>
            <h2>Leave with a completed RCA practitioner workbook—not just a score.</h2>
            <p>
              Each structured decision is retained as controlled learning evidence. After passing, the learner can download a consolidated workbook alongside the verifiable certificate.
            </p>
          </div>
          <ul>
            <li>Investigation triage and D1 team record</li>
            <li>5W2H problem definition and evidence plan</li>
            <li>Containment design and validation record</li>
            <li>Completed three-direction 5 Why analysis</li>
            <li>Human-factors and corrective-action decisions</li>
            <li>Implementation, extent and effectiveness evidence</li>
          </ul>
        </section>

        <section className="iaCta">
          <span className="iaEyebrow">READY TO IMPROVE?</span>
          <h2>Build evidence-led corrective-action capability.</h2>
          <div className="iaActions">
            <TrainingPurchaseButton className="iaButton primary lightPrimary" course="rca-8d-practitioner">
              Buy for £49.99
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
  .iaPublic{background:#f4f8fb;color:#071a3d}.iaHero{max-width:1240px;margin:auto;padding:88px 28px 70px;display:grid;grid-template-columns:minmax(0,1.45fr) minmax(330px,.7fr);gap:54px;align-items:center}.iaEyebrow{display:block;color:#0a56e8;font-size:12px;font-weight:900;letter-spacing:.13em;margin-bottom:14px}.iaHero h1{font-size:clamp(42px,5.2vw,72px);line-height:.98;letter-spacing:-.055em;margin:0 0 24px;max-width:820px}.iaHero>div>p{font-size:20px;line-height:1.55;color:#425777;max-width:760px}.iaActions{display:flex;gap:12px;flex-wrap:wrap;margin:29px 0 16px}.iaButton{display:inline-flex;align-items:center;justify-content:center;min-height:50px;padding:0 22px;border-radius:10px;text-decoration:none;font:inherit;font-weight:850;cursor:pointer}.iaButton.primary{border:0;background:#0a56e8;color:#fff}.iaButton.secondary{border:1px solid #b9c8db;background:#fff;color:#071a3d}.iaButton:disabled{cursor:wait;opacity:.7}.iaOffer{padding:30px;border-radius:22px;background:#102e59;color:#fff;box-shadow:0 24px 60px rgba(7,26,61,.18)}.iaOffer>span{color:#71e0c1;font-size:11px;font-weight:900;letter-spacing:.12em}.iaOffer h2{font-size:30px;margin:14px 0}.iaPrice{display:flex;gap:10px;align-items:baseline;margin:20px 0}.iaPrice strong{font-size:40px}.iaPrice small{color:#c9d5e5}.iaOffer ul{padding-left:20px;color:#e4ebf5;line-height:1.9}.full{width:100%;box-sizing:border-box}.iaSection{max-width:1184px;margin:auto;padding:72px 28px}.iaSection h2,.iaNote h2,.iaWorkbook h2,.iaCta h2{font-size:clamp(30px,4vw,48px);letter-spacing:-.035em;margin:0 0 18px}.iaValueGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:32px}.iaValueGrid article,.iaLabGrid article{padding:22px;border:1px solid #d8e3ed;border-radius:15px;background:#fff}.iaValueGrid b,.iaSectionHead>strong{color:#0a56e8}.iaValueGrid h3{margin:18px 0 8px}.iaValueGrid p,.iaLabGrid p,.iaModules p,.iaNote p,.iaWorkbook p{color:#506482;line-height:1.55}.iaLabs{background:#fff}.iaLabGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin-top:30px}.iaLabGrid article{display:flex;gap:14px}.iaLabGrid article>span{color:#0a56e8}.iaLabGrid h3{margin:0 0 7px}.iaLabGrid p{margin:0}.iaSectionHead{display:flex;justify-content:space-between;gap:24px;align-items:flex-end}.iaModules{margin-top:28px;border-top:1px solid #cad7e7}.iaModules article{display:grid;grid-template-columns:55px 1fr;gap:18px;padding:21px 4px;border-bottom:1px solid #cad7e7}.iaModules article>b{color:#0a56e8;font-size:19px}.iaModules h3{margin:0 0 6px}.iaModules p{margin:0}.iaNote,.iaWorkbook{max-width:1128px;box-sizing:border-box;margin:18px auto;padding:34px;border-radius:14px;display:grid;grid-template-columns:.9fr 1.1fr;gap:34px}.iaNote{border:1px solid #e8b23b;border-left:7px solid #e8b23b;background:#fff9e8}.iaNote h2{font-size:28px}.iaWorkbook{margin-bottom:80px;border:1px solid #bad9d0;border-left:7px solid #16a27f;background:#f1fbf7}.iaWorkbook ul{margin:4px 0;padding-left:20px;line-height:1.9}.iaCta{padding:68px max(28px,calc((100% - 1128px)/2));background:#102e59;color:#fff}.iaCta .iaEyebrow{color:#71e0c1}.iaCta h2{max-width:760px}.lightPrimary{background:#16a27f!important}.iaButton.light{border-color:#fff;background:transparent;color:#fff}@media(max-width:900px){.iaHero,.iaNote,.iaWorkbook{grid-template-columns:1fr}.iaValueGrid,.iaLabGrid{grid-template-columns:1fr 1fr}}@media(max-width:580px){.iaHero{padding-top:58px}.iaHero h1{font-size:42px}.iaValueGrid,.iaLabGrid{grid-template-columns:1fr}.iaSectionHead{align-items:flex-start;flex-direction:column}}
`;
