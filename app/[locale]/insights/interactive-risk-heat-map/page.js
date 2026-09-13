import Link from "next/link";
import { notFound } from "next/navigation";

import PageShell from "../../../../components/PageShell";
import { locales } from "../../../../lib/i18n";

export const metadata = {
  title:
    "Using a 5×5 Risk Heat Map Without Losing Professional Judgement | RPG Insights",
  description:
    "How likelihood, credible severity, action thresholds and evidence-based rationale turn a 5×5 risk heat map into a practical management tool.",
};

const bands = [
  {
    score: "1–4",
    label: "Acceptable",
    colour: "#2fa56f",
    action:
      "Maintain the controls, communicate them and monitor for change.",
  },
  {
    score: "5–9",
    label: "Adequate",
    colour: "#efb83e",
    action:
      "Confirm controls remain suitable and sufficient and consider proportionate improvement.",
  },
  {
    score: "10–14",
    label: "Inadequate",
    colour: "#e85f35",
    action:
      "Define improvement, assign an accountable owner and set a target date.",
  },
  {
    score: "15–25",
    label: "Unacceptable",
    colour: "#bd2d23",
    action:
      "Do not proceed until the risk has been reduced and the revised controls are confirmed.",
  },
];

const likelihood = [
  "1 Very unlikely",
  "2 Unlikely",
  "3 Possible",
  "4 Likely",
  "5 Very likely",
];

const severity = [
  "1 Insignificant",
  "2 Minor",
  "3 Moderate",
  "4 Major",
  "5 Catastrophic",
];

export default async function InteractiveRiskHeatMapInsight({
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

          <span className="kicker">RPG Insights • Issue 011</span>

          <h1>
            Using a 5×5 Risk Heat Map Without Losing
            Professional Judgement
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
            A coloured matrix can make risk visible, but only
            evidence, rationale and accountable action make
            the result dependable.
          </p>

          <article
            className="assuranceCard"
            style={{ padding: "36px", lineHeight: 1.8, fontSize: "17px" }}
          >
            <h2>The colour is not the decision</h2>

            <p>
              Risk heat maps are widely used because they
              translate likelihood and severity into a form
              that people can compare quickly. They can help
              teams prioritise action and help managers see
              where exposure may be concentrated.
            </p>

            <p>
              The weakness begins when a selected cell is
              accepted without understanding the judgement
              behind it. A score can look precise even when
              the description of the hazard, exposure or
              consequence is unclear. Different assessors can
              also interpret labels such as “possible” and
              “major” differently unless the organisation
              applies common guidance.
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
                The essential discipline
              </span>
              <strong style={{ display: "block", fontSize: "25px", lineHeight: 1.35 }}>
                Record why the likelihood and severity are
                reasonable before relying on the score.
              </strong>
            </div>

            <h2>Likelihood needs operational evidence</h2>

            <p>
              Likelihood should consider how often and for
              how long exposure occurs, how many people may
              be exposed, previous events, foreseeable error,
              abnormal conditions and the reliability of
              current controls. The absence of a recent
              incident does not prove that harm is unlikely.
            </p>

            <p>
              A useful scale is understood consistently by
              the people using it:
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
                gap: "10px",
                margin: "20px 0 32px",
              }}
            >
              {likelihood.map((item) => (
                <div
                  key={item}
                  style={{
                    padding: "14px",
                    borderRadius: "10px",
                    background: "#edf3f8",
                    fontWeight: 700,
                  }}
                >
                  {item}
                </div>
              ))}
            </div>

            <h2>Severity should use the credible outcome</h2>

            <p>
              Severity should represent the worst credible
              consequence arising from the exposure being
              assessed. An impossible worst case can inflate
              every score, while a vague term such as
              “injury” can hide the real significance of the
              hazard. The assessor should describe the harm
              first and then select the corresponding level.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
                gap: "10px",
                margin: "20px 0 32px",
              }}
            >
              {severity.map((item) => (
                <div
                  key={item}
                  style={{
                    padding: "14px",
                    borderRadius: "10px",
                    background: "#edf3f8",
                    fontWeight: 700,
                  }}
                >
                  {item}
                </div>
              ))}
            </div>

            <h2>Every band needs a defined response</h2>

            <p>
              The matrix adds management value when a score
              triggers a known response. RPG Excellence uses
              four action bands:
            </p>

            <div style={{ display: "grid", gap: "12px", margin: "24px 0 34px" }}>
              {bands.map((band) => (
                <section
                  key={band.score}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "96px 1fr",
                    gap: "18px",
                    alignItems: "center",
                    padding: "18px",
                    border: "1px solid #d7e2ef",
                    borderRadius: "14px",
                  }}
                >
                  <strong
                    style={{
                      display: "grid",
                      placeItems: "center",
                      minHeight: "66px",
                      borderRadius: "10px",
                      background: band.colour,
                      color: "white",
                      fontSize: "20px",
                    }}
                  >
                    {band.score}
                  </strong>
                  <div>
                    <h3 style={{ margin: "0 0 4px" }}>{band.label}</h3>
                    <p style={{ margin: 0 }}>{band.action}</p>
                  </div>
                </section>
              ))}
            </div>

            <h2>Do not score future controls as if they already exist</h2>

            <p>
              Initial risk describes the position with the
              controls currently implemented. Residual risk
              should describe the position after further
              controls have actually been completed and
              verified. Lowering the score while an action is
              still open creates assurance that has not yet
              been earned.
            </p>

            <p>
              The record should keep the assessment, action
              owner, target date, evidence and verification
              together. This allows management to distinguish
              controlled risk from intended improvement.
            </p>

            <h2>Use the map to ask better questions</h2>

            <p>
              A heat map should support challenge: Why is
              this exposure considered unlikely? What makes
              the stated harm credible? Which controls are
              safety-critical? What evidence shows they are
              reliable? What must change before the risk can
              move to a lower band?
            </p>

            <p>
              Used this way, the matrix becomes more than a
              graphic. It becomes a common language for risk,
              action and management attention.
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
              <h2 style={{ marginTop: 0 }}>Use the interactive 5×5 matrix</h2>
              <p>
                Explore scores, action bands and risk
                movement, then connect the selected position
                to a controlled workplace assessment.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "20px" }}>
                <Link className="button" href={`/${locale}/hs-hub`}>
                  Explore the H&amp;S Hub
                </Link>
                <Link className="button secondary" href="/portal/health-safety/risk-assessment/new">
                  Create a risk assessment
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
              . A matrix supports assessment but does not
              replace competent professional judgement.
            </p>
          </article>
        </div>
      </main>
    </PageShell>
  );
}
