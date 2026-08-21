import Link from "next/link";
import { notFound } from "next/navigation";

import PageShell from "../../../../components/PageShell";
import { locales } from "../../../../lib/i18n";

export const metadata = {
  title:
    "ISO 45001:2018 — From Safety Compliance to Evidence-Led OH&S Assurance | RPG Insights",
  description:
    "RPG Insights Issue 004: how RPG Intelligence connects ISO 45001:2018 conformity, worker participation, hazard and risk management, evidence assurance, management readiness and certification-readiness decision support.",
};

export default async function ISO45001ReadinessInsight({
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
          style={{
            maxWidth: "900px",
          }}
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
            RPG Insights • Issue 004
          </span>

          <h1>
            ISO 45001:2018 — From Safety Compliance
            to Evidence-Led OH&S Assurance
          </h1>

          <p
            style={{
              color: "#617087",
              fontSize: "20px",
              lineHeight: 1.7,
              marginBottom: "36px",
              maxWidth: "780px",
            }}
          >
            Connecting worker participation, hazard
            and risk control, operational assurance,
            evidence, findings and management
            readiness in one OH&S assessment
            workflow.
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
              OH&S assurance has to reflect how work
              is actually controlled
            </h2>

            <p>
              Occupational health and safety
              management cannot be assessed
              effectively through documentation
              alone.
            </p>

            <p>
              Leadership behaviour, worker
              participation, hazard identification,
              operational controls, contractor
              management, legal compliance and
              organisational learning all need to be
              demonstrated in practice.
            </p>

            <p>
              RPG Intelligence brings those elements
              together within its ISO 45001:2018
              assessment workflow.
            </p>

            <h2>
              Evidence-led OH&S assessment
            </h2>

            <p>
              Structured assessor guidance supports
              both documented arrangements and
              demonstrated implementation.
            </p>

            <p>
              Evidence Sampling allows assessors to
              record sampled evidence, confidence,
              exceptions and gaps and to link
              evidence directly to formal findings.
            </p>

            <p>
              This creates stronger traceability
              between what was examined, what the
              assessor concluded and what action is
              subsequently required.
            </p>

            <h2>
              Worker consultation and participation
              matter
            </h2>

            <p>
              ISO 45001 places particular importance
              on consultation and participation of
              workers, including non-managerial
              workers.
            </p>

            <p>
              RPG Intelligence treats worker
              participation as a management-readiness
              issue as well as an assessment topic.
              The objective is to understand whether
              participation is genuine, effective and
              connected to hazard identification,
              investigations and improvement.
            </p>

            <h2>
              Hazard, risk and operational control
            </h2>

            <p>
              Effective OH&S assurance requires more
              than the existence of a risk
              assessment.
            </p>

            <p>
              Assessors need to understand whether
              hazards are proactively identified,
              risks and opportunities are evaluated,
              controls reflect the hierarchy of
              controls and change is managed
              effectively.
            </p>

            <p>
              Operational assurance also extends to
              procurement, contractors, outsourced
              processes and emergency preparedness.
            </p>

            <h2>
              Findings connect to corrective action
              and management ownership
            </h2>

            <p>
              RPG Intelligence supports Major and
              Minor Nonconformities, observations and
              opportunities for improvement.
            </p>

            <p>
              Findings can include objective
              evidence, risk impact, corrective
              action, ownership, target dates,
              verification and controlled closure.
            </p>

            <p>
              Major and Minor Nonconformities can
              feed directly into the Management
              Action Plan so that significant OH&S
              issues remain visible to management
              until they are addressed.
            </p>

            <h2>
              Nine dimensions of OH&S management
              readiness
            </h2>

            <p>
              RPG Intelligence assesses management
              readiness separately from clause
              conformity across nine OH&S dimensions:
            </p>

            <ul>
              <li>Leadership & OH&S Culture</li>
              <li>Governance & Accountability</li>
              <li>OH&S Context & Worker Needs</li>
              <li>Hazard & Risk Management</li>
              <li>
                Worker Consultation & Participation
              </li>
              <li>
                Operational & Contractor Control
              </li>
              <li>Legal & Compliance Assurance</li>
              <li>
                OH&S Performance & Internal Assurance
              </li>
              <li>
                Improvement & Organisational Learning
              </li>
            </ul>

            <p>
              This creates a management-level view of
              whether the organisation has the
              leadership, participation, governance,
              control and learning capability needed
              to sustain an effective OH&S management
              system.
            </p>

            <h2>
              Certification readiness uses multiple
              signals
            </h2>

            <p>
              A high assessment percentage should not
              automatically imply readiness where
              significant OH&S barriers remain.
            </p>

            <p>
              RPG Intelligence therefore considers
              weighted assessment performance
              together with management readiness,
              open Major and Minor Nonconformities,
              risk and overdue actions.
            </p>

            <p>
              The resulting RPG recommendation is a
              readiness decision-support tool. It is
              not an accredited certification
              decision and does not replace an
              independent certification audit.
            </p>

            <h2>
              Better information for leadership
            </h2>

            <p>
              Executive reporting brings together
              assessment performance, findings,
              action status, evidence assurance,
              management readiness and
              certification-readiness information.
            </p>

            <p>
              The purpose is to help leadership see
              beyond isolated compliance results and
              understand whether the OH&S management
              system is functioning as a controlled,
              evidence-supported system.
            </p>

            <h2>
              From safety paperwork to assurance
            </h2>

            <p>
              The important question is not whether
              an organisation has a safety procedure
              or risk assessment on file.
            </p>

            <p>
              <strong>
                The stronger question is whether
                leadership, workers and operational
                controls can demonstrate that OH&S
                risks are understood, managed,
                verified and improved in practice.
              </strong>
            </p>

            <p>
              That is the approach behind the ISO
              45001:2018 assessment in RPG
              Intelligence.
            </p>

            <div
              style={{
                marginTop: "38px",
                paddingTop: "24px",
                borderTop: "1px solid #dfe6ee",
              }}
            >
              <strong>
                RPG Excellence Ltd
              </strong>

              <p
                style={{
                  marginTop: "6px",
                  marginBottom: 0,
                  color: "#617087",
                }}
              >
                Business Assurance • Practical
                Intelligence • Continuous Improvement
              </p>
            </div>
          </article>

          <div
            style={{
              marginTop: "32px",
            }}
          >
            <Link
              href={`/${locale}/insights`}
              className="button buttonGhost"
            >
              More RPG Insights
            </Link>
          </div>
        </div>
      </main>
    </PageShell>
  );
}
