import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "../../../../components/Header";
import Footer from "../../../../components/Footer";
import TrainingPurchaseButton from "../../../../components/TrainingPurchaseButton";
import { copy, locales } from "../../../../lib/i18n";

export const metadata = {
  title: "Risk Assessment Training | RPG Excellence",
  description:
    "Interactive risk assessment training for people who identify hazards, assess workplace risks and select effective controls.",
};

const initialModules = [
  ["01", "Why risk assessment matters", "Understand legal duties, proportionate assessment and what suitable and sufficient means in practice."],
  ["02", "Hazard or risk?", "Separate sources of harm from the likelihood and severity of credible outcomes."],
  ["03", "Who might be harmed?", "Consider employees, contractors, visitors, vulnerable people and others affected by the work."],
  ["04", "Evaluate the risk", "Use the RPG 5 × 5 matrix consistently and recognise when uncertainty needs escalation."],
  ["05", "Choose effective controls", "Apply the hierarchy of control and avoid relying on weak administrative measures alone."],
  ["06", "Record the assessment", "Create a clear, usable record with owners, actions, dates and supporting evidence."],
  ["07", "Communicate and review", "Brief affected people, monitor controls and review after change, learning or scheduled intervals."],
  ["08", "Final decision challenge", "Complete a practical scenario assessment and achieve at least 80% to earn a certificate."],
];

const refresherModules = [
  "Rapid hazard-recognition challenge",
  "Risk-matrix calibration exercise",
  "Control hierarchy decision lab",
  "Change and review triggers",
  "Common assessment failure traps",
  "Knowledge check and certificate",
];

const experiences = [
  ["Hazard spotting", "Explore realistic workplace scenes and identify credible sources of harm."],
  ["People at risk", "Decide who may be affected, including people who are not present every day."],
  ["Control challenge", "Compare proposed controls and select the strongest reasonably practicable combination."],
  ["Matrix exercise", "Score likelihood and severity, then explain the evidence behind the decision."],
  ["Build an assessment", "Turn a scenario into a structured, reviewable risk assessment record."],
  ["Final decision test", "Demonstrate applied understanding rather than simply recalling definitions."],
];

export default async function RiskAssessmentTrainingPage({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  const t = copy[locale];

  return (
    <>
      <Header locale={locale} nav={t.nav} />
      <main className="trainingPage">
        <section className="trainingHero">
          <div className="heroCopy">
            <span className="eyebrow">RPG TRAINING ACADEMY</span>
            <h1>Risk assessment training built around real decisions.</h1>
            <p>
              Build practical competence through guided scenarios, instant feedback and an
              end-to-end workplace risk assessment exercise aligned with the UK HSE five-step approach.
            </p>
            <div className="heroActions">
              <TrainingPurchaseButton className="primaryButton" course="risk-assessment-initial">Buy initial course</TrainingPurchaseButton>
              <Link className="secondaryButton" href={"/" + locale + "/hs-hub"}>Explore the H&amp;S Hub</Link>
              <Link className="secondaryButton" href="/verify/training">Verify certificate</Link>
            </div>
            <small>Individual access from £12.99. No VAT is charged. Organisation subscription access is also available.</small>
          </div>
          <aside className="courseSummary">
            <span className="courseTag">INITIAL COURSE</span>
            <h2>Workplace Risk Assessment</h2>
            <div className="price"><strong>£19.99</strong><span>per learner</span></div>
            <ul>
              <li>50–60 minutes</li>
              <li>Interactive workplace scenarios</li>
              <li>80% pass mark</li>
              <li>Downloadable completion certificate</li>
              <li>12 months learner access</li>
            </ul>
            <TrainingPurchaseButton className="primaryButton full" course="risk-assessment-initial">Start your training</TrainingPurchaseButton>
          </aside>
        </section>

        <section className="outcomes sectionBlock">
          <span className="eyebrow">LEARNING OUTCOMES</span>
          <h2>From hazard identification to verified action</h2>
          <p className="sectionLead">Learners will be able to:</p>
          <div className="outcomeGrid">
            {[
              "Distinguish hazards from risks and credible consequences",
              "Identify who may be harmed and how",
              "Evaluate risk using likelihood and severity",
              "Select controls using the hierarchy of control",
              "Record findings, owners and target dates clearly",
              "Recognise when an assessment must be reviewed",
            ].map((item, index) => <article key={item}><b>{String(index + 1).padStart(2, "0")}</b><p>{item}</p></article>)}
          </div>
        </section>

        <section className="experience sectionBlock">
          <span className="eyebrow">INTERACTIVE EXPERIENCE</span>
          <h2>Learn by making defensible choices</h2>
          <div className="experienceGrid">
            {experiences.map(([title, description]) => <article key={title}><span>◆</span><div><h3>{title}</h3><p>{description}</p></div></article>)}
          </div>
        </section>

        <section className="curriculum sectionBlock">
          <div className="curriculumHead"><div><span className="eyebrow">INITIAL TRAINING</span><h2>Eight practical modules</h2></div><strong>50–60 min</strong></div>
          <div className="moduleList">
            {initialModules.map(([number, title, description]) => <article key={number}><b>{number}</b><div><h3>{title}</h3><p>{description}</p></div></article>)}
          </div>
        </section>

        <section className="refresher sectionBlock">
          <div>
            <span className="eyebrow">ANNUAL REFRESHER</span>
            <h2>Recalibrate judgement. Reinforce good habits.</h2>
            <p>A concise scenario-led course for learners who have already completed suitable initial instruction.</p>
            <ul>{refresherModules.map((module) => <li key={module}>{module}</li>)}</ul>
          </div>
          <aside>
            <span className="courseTag">REFRESHER</span>
            <div className="price"><strong>£12.99</strong><span>per learner</span></div>
            <p>Approximately 25–35 minutes, including assessment and certificate.</p>
            <TrainingPurchaseButton className="primaryButton full" course="risk-assessment-refresher">Buy refresher course</TrainingPurchaseButton>
          </aside>
        </section>

        <section className="competenceNote">
          <div><span className="eyebrow">IMPORTANT</span><h2>Training supports competence; it does not replace experience.</h2></div>
          <p>
            The level of competence required depends on the work and its risks. Employers should ensure assessors have
            appropriate skills, knowledge and experience, and obtain specialist support where needed. Read the
            <a href="https://www.hse.gov.uk/competence/what-is-competence.htm" target="_blank" rel="noreferrer"> HSE competence guidance</a>.
          </p>
        </section>

        <section className="finalCta">
          <span className="eyebrow">READY TO START?</span>
          <h2>Build safer decisions into everyday work.</h2>
          <div><TrainingPurchaseButton className="primaryButton" course="risk-assessment-initial">Buy for £19.99</TrainingPurchaseButton><Link className="secondaryButton light" href={"/" + locale + "/contact"}>Organisation licences</Link></div>
        </section>
      </main>
      <Footer locale={locale} />
      <style>{styles}</style>
    </>
  );
}

const styles = `
  .trainingPage{background:#f4f8fb;color:#071a3d}.trainingHero{max-width:1240px;margin:auto;padding:92px 28px 72px;display:grid;grid-template-columns:minmax(0,1.45fr) minmax(320px,.75fr);gap:54px;align-items:center}.eyebrow{display:block;color:#0a56e8;font-size:12px;font-weight:900;letter-spacing:.13em;margin-bottom:14px}.heroCopy h1{font-size:clamp(42px,5.4vw,74px);line-height:.97;letter-spacing:-.055em;margin:0 0 24px;max-width:820px}.heroCopy>p{font-size:20px;line-height:1.55;color:#425777;max-width:760px}.heroActions,.finalCta>div{display:flex;gap:12px;flex-wrap:wrap;margin:30px 0 16px}.primaryButton,.secondaryButton{display:inline-flex;align-items:center;justify-content:center;min-height:50px;padding:0 22px;border-radius:10px;text-decoration:none;font:inherit;font-weight:850;cursor:pointer}.primaryButton{border:0;background:#0a56e8;color:#fff}.primaryButton:disabled{cursor:wait;opacity:.72}.secondaryButton{border:1px solid #b9c8db;color:#071a3d;background:#fff}.full{width:100%;box-sizing:border-box}.courseSummary,.refresher aside{background:#071a3d;color:#fff;border-radius:22px;padding:30px;box-shadow:0 24px 60px rgba(7,26,61,.18)}.courseTag{font-size:11px;font-weight:900;letter-spacing:.12em;color:#70e3bd}.courseSummary h2{font-size:30px;margin:14px 0}.price{display:flex;align-items:baseline;gap:9px;margin:20px 0}.price strong{font-size:40px}.price span{color:#c1cce0}.courseSummary ul{padding-left:20px;line-height:2;color:#e2e9f5}.sectionBlock{max-width:1184px;margin:0 auto;padding:74px 28px}.sectionBlock h2,.competenceNote h2,.finalCta h2{font-size:clamp(30px,4vw,48px);letter-spacing:-.035em;margin:0 0 16px}.sectionLead,.sectionBlock p{color:#506482}.outcomeGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:30px}.outcomeGrid article{background:#fff;border:1px solid #dce5ef;border-radius:15px;padding:22px;display:flex;gap:17px}.outcomeGrid b{color:#0a56e8}.outcomeGrid p{margin:0;color:#172b4d;font-weight:700;line-height:1.45}.experience{background:#fff;max-width:none;padding-left:max(28px,calc((100% - 1184px)/2 + 28px));padding-right:max(28px,calc((100% - 1184px)/2 + 28px))}.experienceGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:30px}.experienceGrid article{border:1px solid #dce5ef;border-radius:15px;padding:22px;display:flex;gap:14px}.experienceGrid article>span{color:#0a56e8}.experienceGrid h3{margin:0 0 7px}.experienceGrid p{margin:0;line-height:1.5}.curriculumHead{display:flex;justify-content:space-between;gap:24px;align-items:flex-end}.curriculumHead>strong{color:#0a56e8}.moduleList{margin-top:28px;border-top:1px solid #cad7e7}.moduleList article{display:grid;grid-template-columns:54px 1fr;gap:18px;padding:22px 4px;border-bottom:1px solid #cad7e7}.moduleList article>b{color:#0a56e8;font-size:19px}.moduleList h3{margin:0 0 6px}.moduleList p{margin:0;line-height:1.5}.refresher{display:grid;grid-template-columns:1.4fr .6fr;gap:48px;align-items:center}.refresher ul{columns:2;padding-left:20px;line-height:1.9}.refresher aside p{color:#dce5ef}.competenceNote{max-width:1184px;box-sizing:border-box;margin:20px auto 80px;padding:34px;border:1px solid #f0b429;border-left:7px solid #f0b429;border-radius:14px;background:#fff9e8;display:grid;grid-template-columns:.8fr 1.2fr;gap:34px}.competenceNote h2{font-size:28px}.competenceNote p{line-height:1.65;color:#425777}.competenceNote a{color:#0a56e8;font-weight:800}.finalCta{background:#0a56e8;color:#fff;padding:70px max(28px,calc((100% - 1128px)/2));}.finalCta .eyebrow{color:#b9f4df}.finalCta h2{max-width:740px}.light{border-color:#fff;background:transparent;color:#fff}@media(max-width:850px){.trainingHero,.refresher,.competenceNote{grid-template-columns:1fr}.outcomeGrid,.experienceGrid{grid-template-columns:1fr 1fr}}@media(max-width:560px){.trainingHero{padding-top:58px}.outcomeGrid,.experienceGrid{grid-template-columns:1fr}.refresher ul{columns:1}.heroCopy h1{font-size:42px}}
`;
