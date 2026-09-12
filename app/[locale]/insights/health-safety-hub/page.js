import Link from "next/link";
import { notFound } from "next/navigation";

import PageShell from "../../../../components/PageShell";
import { locales } from "../../../../lib/i18n";

export const metadata = {
  title:
    "From Safety Records to Controlled Action | RPG Insights",
  description:
    "How the RPG Excellence Health & Safety Hub connects risk assessments, actions, reviews, training and management visibility in one controlled workspace.",
};

const controlCycle = [
  {
    number: "01",
    title: "Identify",
    text: "Define the activity, hazard source, exposure route and everyone who may be affected.",
  },
  {
    number: "02",
    title: "Assess",
    text: "Evaluate likelihood and credible severity using the evidence available and the reliability of current controls.",
  },
  {
    number: "03",
    title: "Control",
    text: "Select proportionate measures using the hierarchy of control and record what further improvement is required.",
  },
  {
    number: "04",
    title: "Record and act",
    text: "Retain significant findings, assign accountable owners and set realistic target dates.",
  },
  {
    number: "05",
    title: "Review and verify",
    text: "Confirm actions are implemented, communicate the assessment and revisit it when evidence or working conditions change.",
  },
];

export default async function HealthSafetyHubInsight({
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
            RPG Insights • Issue 009
          </span>

          <h1>
            From Safety Records to Controlled Action:
            The Health &amp; Safety Hub
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
            Risk assessments, actions, reviews and
            competence records deliver more value when
            management can see how they connect and where
            attention is required.
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
              More safety records do not automatically
              create stronger control
            </h2>

            <p>
              Many organisations already have risk
              assessments, action lists, review dates and
              training records. The weakness often appears
              between them. An assessment identifies a
              control, but the resulting action is tracked
              elsewhere. A review becomes overdue without a
              clear escalation. Training is completed, but
              the competence evidence is separated from the
              work it is intended to support.
            </p>

            <p>
              This creates administration without giving
              managers a dependable view of exposure,
              ownership and progress. A controlled health
              and safety system should make it easier to
              understand what was assessed, what was
              decided, who is accountable and whether the
              control remains effective.
            </p>

            <div
              style={{
                margin: "32px 0",
                padding: "26px",
                borderRadius: "18px",
                background:
                  "linear-gradient(135deg, #0d2f5b, #087e70)",
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
                The management question
              </span>
              <strong
                style={{
                  display: "block",
                  fontSize: "25px",
                  lineHeight: 1.35,
                }}
              >
                Where is attention required before exposure
                becomes an event?
              </strong>
            </div>

            <h2>
              Connect the complete risk-control cycle
            </h2>

            <p>
              The RPG Excellence Health &amp; Safety Hub is
              structured around the practical stages of
              workplace risk management. It supports
              professional judgement with a consistent,
              traceable workflow rather than attempting to
              replace that judgement.
            </p>

            <div
              style={{
                display: "grid",
                gap: "14px",
                margin: "28px 0 34px",
              }}
            >
              {controlCycle.map((stage) => (
                <section
                  key={stage.number}
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
                    {stage.number}
                  </strong>
                  <div>
                    <h3 style={{ margin: "0 0 4px" }}>
                      {stage.title}
                    </h3>
                    <p style={{ margin: 0 }}>
                      {stage.text}
                    </p>
                  </div>
                </section>
              ))}
            </div>

            <h2>
              A management view of live exceptions
            </h2>

            <p>
              A useful dashboard should do more than count
              documents. The Hub brings forward the
              conditions that may require intervention:
              elevated residual risks, overdue actions,
              assessments approaching review and records
              awaiting approval or communication.
            </p>

            <p>
              The interactive 5×5 matrix makes likelihood
              and credible severity visible, while the
              assessment record retains the rationale behind
              the selected position. Actions and verification
              stay connected to the originating risk rather
              than becoming an isolated task list.
            </p>

            <h2>
              Competence evidence belongs in the control
              system
            </h2>

            <p>
              Risk-assessment training is available through
              the same Hub. Practical scenarios ask learners
              to distinguish hazards from consequences,
              identify people at risk, evaluate likelihood
              and severity, select controls and record clear
              findings. The learning record and certificate
              support an employer&apos;s competence decision;
              they do not replace the need to consider
              experience, supervision and the complexity of
              the work.
            </p>

            <h2>
              Suitable and sufficient means useful in
              practice
            </h2>

            <p>
              The UK Health and Safety Executive describes
              workplace risk management as a step-by-step
              process of identifying hazards, assessing and
              controlling risks, recording findings and
              reviewing controls. It also cautions against
              relying on paperwork as the main priority when
              the objective is to control risk in practice.
            </p>

            <p>
              That principle shapes the Hub. The objective is
              not a larger library of completed forms. It is
              clearer decisions, accountable improvement and
              evidence that controls have been implemented,
              communicated and reviewed.
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
                Explore the Health &amp; Safety Hub
              </h2>
              <p>
                Build controlled risk assessments, use the
                interactive matrix, manage actions and
                verification, and access practical assessor
                training from one connected workspace.
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
                  href={`/${locale}/hs-hub`}
                >
                  Explore the H&amp;S Hub
                </Link>
                <Link
                  className="button secondary"
                  href={`/${locale}/hs-hub/training`}
                >
                  View risk-assessment training
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
              management and training; it does not replace
              competent professional or legal advice.
            </p>
          </article>
        </div>
      </main>
    </PageShell>
  );
}

