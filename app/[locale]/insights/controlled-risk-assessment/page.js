import Link from "next/link";
import { notFound } from "next/navigation";

import PageShell from "../../../../components/PageShell";
import { locales } from "../../../../lib/i18n";

export const metadata = {
  title:
    "What a Suitable and Sufficient Risk Assessment Should Show | RPG Insights",
  description:
    "Practical guidance on recording hazards, exposure, credible harm, people at risk, controls, actions and review in a controlled workplace risk assessment.",
  alternates: { canonical: "/en/insights/controlled-risk-assessment" },
};

const assessmentTests = [
  {
    number: "01",
    title: "The hazard is specific",
    text: "Name the source of harm—such as energy, equipment, substance, condition, behaviour or activity—rather than writing only an injury or a generic risk.",
  },
  {
    number: "02",
    title: "Exposure is explained",
    text: "Describe how a person encounters the hazard during normal work and during credible abnormal, cleaning, maintenance, start-up or emergency conditions.",
  },
  {
    number: "03",
    title: "Credible harm is clear",
    text: "State the reasonably foreseeable outcome without exaggerating an impossible worst case or reducing it to an unhelpful phrase such as ‘injury’. ",
  },
  {
    number: "04",
    title: "People at risk are considered",
    text: "Include those doing the work, people nearby, contractors, visitors and anyone whose vulnerability or route of exposure may require different controls.",
  },
  {
    number: "05",
    title: "Controls and actions are traceable",
    text: "Record what already prevents harm, what further control is required, who owns the action and when it must be completed.",
  },
  {
    number: "06",
    title: "The assessment can be reviewed",
    text: "Define review triggers and retain enough rationale and evidence for another competent person to understand and challenge the decision.",
  },
];

export default async function ControlledRiskAssessmentInsight({
  params,
}) {
  const { locale } = await params;

  if (!locales.includes(locale)) {
    notFound();
  }

  return (
    <PageShell locale={locale}>
      <main className="simplePage">
        <div
          className="simpleInner"
          style={{ maxWidth: "920px" }}
        >
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

          <span className="kicker">
            RPG Insights • Issue 010
          </span>

          <h1>
            What a Suitable and Sufficient Risk
            Assessment Should Show
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
            A risk assessment should preserve the reasoning
            behind a control decision—not simply produce a
            score, signature or completed form.
          </p>

          <article
            className="assuranceCard"
            style={{
              padding: "36px",
              lineHeight: 1.8,
              fontSize: "17px",
            }}
          >
            <h2>
              A risk score is not the assessment
            </h2>

            <p>
              Multiplying likelihood by severity can help an
              organisation compare risks and apply a
              consistent action threshold. The number alone,
              however, does not explain what could cause
              harm, how people may be exposed or why the
              selected controls are reasonable.
            </p>

            <p>
              A useful assessment connects the activity,
              hazard, exposure, credible consequence, people
              affected, current controls and further action.
              It contains enough information for the people
              doing the work, an approver and a future
              reviewer to understand the decision.
            </p>

            <div
              style={{
                margin: "32px 0",
                padding: "26px",
                borderRadius: "18px",
                background:
                  "linear-gradient(135deg, #0d2f5b, #2257f2)",
                color: "white",
              }}
            >
              <span
                style={{
                  display: "block",
                  color: "#8ff1dc",
                  fontSize: "12px",
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
              >
                The quality test
              </span>
              <strong
                style={{
                  display: "block",
                  fontSize: "25px",
                  lineHeight: 1.35,
                }}
              >
                Could another competent person understand
                what was assessed, why the controls were
                selected and what still needs to happen?
              </strong>
            </div>

            <h2>
              Separate the hazard, exposure and consequence
            </h2>

            <p>
              One of the most common weaknesses is combining
              several different ideas into one vague entry.
              “Risk of injury from machinery” does not give
              the assessor, operator or approver enough
              information to select or verify controls.
            </p>

            <p>
              A clearer description separates the source of
              harm from the route to harm and the credible
              outcome. For example: an unguarded rotating
              shaft is the hazard; contact during adjustment
              is the exposure; entanglement and serious
              injury are credible consequences. That clarity
              creates a stronger basis for deciding whether
              elimination, isolation, guarding, interlocking
              or another control is required.
            </p>

            <h2>
              Six tests for a controlled assessment
            </h2>

            <div
              style={{
                display: "grid",
                gap: "14px",
                margin: "28px 0 34px",
              }}
            >
              {assessmentTests.map((item) => (
                <section
                  key={item.number}
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
                  <strong style={{ color: "#2257f2" }}>
                    {item.number}
                  </strong>
                  <div>
                    <h3 style={{ margin: "0 0 4px" }}>
                      {item.title}
                    </h3>
                    <p style={{ margin: 0 }}>
                      {item.text}
                    </p>
                  </div>
                </section>
              ))}
            </div>

            <h2>
              Consider how work is really performed
            </h2>

            <p>
              Assessments become unreliable when they cover
              only ideal production conditions. Cleaning,
              maintenance, breakdown, start-up, shutdown,
              temporary work, contractor activity and
              foreseeable error can create different exposure
              routes. Previous incidents, near misses,
              equipment history and worker experience can
              reveal conditions that a written procedure
              misses.
            </p>

            <p>
              The people who may be harmed also extend beyond
              the operator. Supervisors, maintenance staff,
              nearby employees, delivery drivers, visitors
              and members of the public may encounter the
              same source through different routes. Young or
              inexperienced workers, new starters, pregnant
              workers, disabled people, lone workers and
              people with relevant health conditions may need
              different consideration.
            </p>

            <h2>
              Controls should follow the risk—not the habit
            </h2>

            <p>
              A familiar control is not automatically the
              most effective control. Assessors should first
              ask whether the hazard can be removed. If it
              cannot, they should consider substitution,
              engineering measures and changes to the way
              work is organised before relying primarily on
              information, training or personal protective
              equipment.
            </p>

            <p>
              Where further action is required, the
              assessment should retain an owner and target
              date. Residual risk should represent the
              control position after agreed actions have
              actually been implemented and verified—not the
              anticipated result while those actions remain
              open.
            </p>

            <h2>
              Review is part of the control
            </h2>

            <p>
              A review date is useful, but it should not be
              the only trigger. Changes to people, equipment,
              substances, processes or environment may alter
              risk. So may an incident, near miss, worker
              concern, failed control, new evidence or a
              reason to believe the assessment is no longer
              valid.
            </p>

            <p>
              The assessment should therefore remain a live
              record of operational control. Approval,
              communication, action completion and review
              need to be visible rather than assumed.
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
              <h2 style={{ marginTop: 0 }}>
                Create a controlled risk assessment
              </h2>
              <p>
                RPG Excellence guides the assessor from
                hazard identification through risk
                evaluation, control selection, significant
                findings, action ownership, communication and
                review.
              </p>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "12px",
                  marginTop: "20px",
                }}
              >
                <Link
                  className="button"
                  href="/portal/health-safety/risk-assessment/new"
                >
                  Create a risk assessment
                </Link>
                <Link
                  className="button secondary"
                  href={`/${locale}/hs-hub`}
                >
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
              Reference: UK Health and Safety Executive,
              {" "}
              <a
                href="https://www.hse.gov.uk/simple-health-safety/risk/steps-needed-to-manage-risk.htm"
                target="_blank"
                rel="noreferrer"
              >
                Managing risks and risk assessment at work
              </a>
              . RPG Excellence supports structured risk
              management; it does not replace competent
              professional or legal advice.
            </p>
          </article>
        </div>
      </main>
    </PageShell>
  );
}
