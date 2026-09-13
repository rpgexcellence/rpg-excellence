import Link from "next/link";
import { notFound } from "next/navigation";

import PageShell from "../../../../components/PageShell";
import { locales } from "../../../../lib/i18n";

export const metadata = {
  title:
    "Building Risk-Assessment Competence Through Practical Decisions | RPG Insights",
  description:
    "Why practical scenarios, structured interaction, feedback and retained evidence add more value to risk-assessment training than passive slide completion.",
  alternates: { canonical: "/en/insights/risk-assessment-training" },
};

const decisions = [
  {
    number: "01",
    title: "Describe the hazard accurately",
    text: "Separate the source of harm from the exposure route and the credible consequence.",
  },
  {
    number: "02",
    title: "Identify everyone affected",
    text: "Consider operators, people nearby, contractors, visitors and those who may require different controls.",
  },
  {
    number: "03",
    title: "Evaluate risk consistently",
    text: "Use evidence to select likelihood and severity and explain the rationale behind the score.",
  },
  {
    number: "04",
    title: "Choose effective controls",
    text: "Apply the hierarchy of control and avoid treating PPE as the automatic first response.",
  },
  {
    number: "05",
    title: "Record and review",
    text: "Write significant findings clearly, assign actions and recognise when change should trigger reassessment.",
  },
];

export default async function RiskAssessmentTrainingInsight({
  params,
}) {
  const { locale } = await params;

  if (!locales.includes(locale)) {
    notFound();
  }

  return (
    <PageShell locale={locale}>
      <main className="simplePage">
        <div className="simpleInner" style={{ maxWidth: "920px" }}>
          <Link
            href={`/${locale}/insights`}
            style={{
              display: "inline-block",
              marginBottom: "28px",
              color: "#1459D9",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            ← Back to RPG Insights
          </Link>

          <span className="kicker">RPG Insights • Issue 012</span>

          <h1>
            Building Risk-Assessment Competence Through
            Practical Decisions
          </h1>

          <p
            style={{
              color: "#617087",
              fontSize: "20px",
              lineHeight: 1.7,
              marginBottom: "36px",
              maxWidth: "820px",
            }}
          >
            Training creates more value when learners practise
            the judgement required to turn hazards into
            proportionate controls and clear evidence.
          </p>

          <article
            className="assuranceCard"
            style={{ padding: "36px", lineHeight: 1.8, fontSize: "17px" }}
          >
            <h2>Completion is not the same as competence</h2>

            <p>
              A learner can read a procedure, watch a
              presentation and pass a short quiz without
              demonstrating that they can produce a useful
              workplace risk assessment. The difficult part
              is not remembering the five steps. It is
              applying them to real work where conditions,
              exposure and available evidence are rarely
              perfect.
            </p>

            <p>
              Assessors need to distinguish a hazard from an
              outcome, recognise who may be affected, choose
              credible likelihood and severity, challenge the
              reliability of controls and write findings that
              another person can understand. These are
              practical decisions, and they need practice.
            </p>

            <div
              style={{
                margin: "32px 0",
                padding: "26px",
                borderRadius: "18px",
                background: "linear-gradient(135deg, #0d2f5b, #087e70)",
                color: "white",
              }}
            >
              <span
                style={{
                  display: "block",
                  color: "#69f1d3",
                  fontSize: "12px",
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
              >
                The learning principle
              </span>
              <strong style={{ display: "block", fontSize: "25px", lineHeight: 1.35 }}>
                Ask the learner to make, explain and improve
                the decision—not merely acknowledge the
                guidance.
              </strong>
            </div>

            <h2>Five decisions worth practising</h2>

            <div style={{ display: "grid", gap: "14px", margin: "28px 0 34px" }}>
              {decisions.map((decision) => (
                <section
                  key={decision.number}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "52px 1fr",
                    gap: "16px",
                    padding: "20px",
                    border: "1px solid #d7e2ef",
                    borderRadius: "14px",
                    background: "#f8fbff",
                  }}
                >
                  <strong style={{ color: "#2257f2" }}>{decision.number}</strong>
                  <div>
                    <h3 style={{ margin: "0 0 4px" }}>{decision.title}</h3>
                    <p style={{ margin: 0 }}>{decision.text}</p>
                  </div>
                </section>
              ))}
            </div>

            <h2>Why unrestricted text boxes are not enough</h2>

            <p>
              A blank box can collect almost anything. It
              does not necessarily prompt the learner to
              address the important elements of the
              scenario, and it can allow an incomplete or
              meaningless response to be recorded as
              evidence of learning.
            </p>

            <p>
              RPG Excellence uses structured exercises that
              combine selections, multi-choice decisions and
              editable fields. Learners can start with a
              worked example, but they must review it and can
              modify it before submission. The guidance
              engine identifies missing elements and explains
              why they matter rather than simply presenting a
              pass or fail message.
            </p>

            <h2>Scenarios connect knowledge to work</h2>

            <p>
              Practical scenarios expose the learner to
              conditions that ordinary examples may overlook:
              maintenance during production, contractor
              interfaces, abnormal operation, vulnerable
              workers, weak isolation, control failure and
              changes that should trigger review.
            </p>

            <p>
              The interactive matrix allows the learner to
              explore likelihood, credible severity and
              action bands. Control exercises require a
              reasoned choice rather than a generic list.
              Evidence retained from the exercises provides a
              more useful learning record than completion time
              alone.
            </p>

            <h2>Training should support the competence decision</h2>

            <p>
              The initial course supports people who are
              developing their understanding of workplace
              risk assessment. The annual refresher focuses
              attention on recurring weaknesses such as vague
              descriptions, inconsistent scoring, weak
              control selection and missed review triggers.
            </p>

            <p>
              A completion certificate confirms the learning
              record and assessment result. It does not remove
              the employer&apos;s responsibility to consider the
              learner&apos;s experience, practical capability,
              supervision and the complexity and risk of the
              work they will assess.
            </p>

            <h2>The commercial value is better decision quality</h2>

            <p>
              Effective training should reduce avoidable
              rework, improve consistency and help reviewers
              focus on the risks that matter. It should also
              create clearer evidence of what the learner
              considered and why.
            </p>

            <p>
              The objective is not simply to issue another
              certificate. It is to produce assessors who can
              describe work accurately, select proportionate
              controls and recognise when an assessment no
              longer reflects reality.
            </p>

            <div
              style={{
                marginTop: "34px",
                padding: "28px",
                borderRadius: "16px",
                border: "1px solid #b9d7cf",
                background: "#eefaf6",
              }}
            >
              <h2 style={{ marginTop: 0 }}>Explore practical risk-assessment training</h2>
              <p>
                Choose the initial course or focused annual
                refresher, complete interactive scenarios and
                retain a verifiable certificate after passing
                the final assessment.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "20px" }}>
                <Link className="button" href={`/${locale}/hs-hub/training`}>
                  View training courses
                </Link>
                <Link className="button secondary" href={`/${locale}/hs-hub`}>
                  Explore the H&amp;S Hub
                </Link>
              </div>
            </div>

            <p
              style={{
                marginTop: "32px",
                paddingTop: "24px",
                borderTop: "1px solid #d7e2ef",
                color: "#617087",
                fontSize: "14px",
              }}
            >
              Reference: UK Health and Safety Executive,{" "}
              <a
                href="https://www.hse.gov.uk/simple-health-safety/risk/steps-needed-to-manage-risk.htm"
                target="_blank"
                rel="noreferrer"
              >
                Managing risks and risk assessment at work
              </a>
              . Course completion supports knowledge and
              understanding but does not by itself establish
              competence for every workplace activity.
            </p>
          </article>
        </div>
      </main>
    </PageShell>
  );
}
