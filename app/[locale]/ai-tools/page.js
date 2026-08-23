import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import { locales } from "../../../lib/i18n";

export const metadata = {
  title: "RPG Intelligence",
};

const assessmentModules = [
  {
    title: "ISO 9001 Gap Analysis",
    standard: "ISO 9001:2015/Amd 1:2024",
    status: "Available now",
    href: "/portal",
  },
  {
    title: "ISO 14001 Gap Analysis",
    standard: "ISO 14001:2026",
    status: "Available now",
    href: "/portal",
  },
  {
    title: "ISO 45001 Gap Analysis",
    standard: "ISO 45001:2018",
    status: "Available now",
    href: "/portal",
  },
  {
    title: "ISO/IEC 17024 Gap Analysis",
    standard: "ISO/IEC 17024:2026",
    status: "Available now",
    href: "/portal",
  },
];

const plannedModules = [
  {
    title: "Risk Assessment Builder",
    status: "MVP module",
  },
  {
    title: "Internal Audit Builder",
    status: "Planned module",
  },
  {
    title: "Business Continuity Planner",
    status: "Planned module",
  },
  {
    title: "ISO 27001 Risk Register",
    status: "Planned module",
  },
];

export default async function AiTools({
  params,
}) {
  const { locale } = await params;

  if (!locales.includes(locale)) {
    notFound();
  }

  return (
    <PageShell locale={locale}>
      <main className="simplePage aiPage">
        <div className="simpleInner">
          <span className="kicker">
            RPG Intelligence
          </span>

          <h1>
            Intelligent ISO assessments,
            supported by expert review.
          </h1>

          <p className="lead">
            Complete a structured ISO gap
            analysis, record objective evidence,
            raise formal findings, manage actions
            and generate an executive report from
            one connected assessment workspace.
          </p>

          <h2>Available ISO assessments</h2>

          <div className="toolGrid">
            {assessmentModules.map(
              ({
                title,
                standard,
                status,
                href,
              }) => (
                <Link
                  className="toolCard toolCardLink"
                  href={href}
                  key={standard}
                  style={{
                    color: "inherit",
                    textDecoration: "none",
                  }}
                  aria-label={`Open ${standard} assessment`}
                >
                  <span className="toolIcon">
                    ◈
                  </span>

                  <strong>{title}</strong>

                  <span>{standard}</span>

                  <span>{status}</span>

                  <span aria-hidden="true">
                    Start assessment →
                  </span>
                </Link>
              )
            )}
          </div>

          <h2 id="eight-d-capa">
            Root cause and corrective action
          </h2>

          <div className="toolGrid">
            <Link
              className="toolCard toolCardLink"
              href="/portal/rca"
              style={{
                color: "inherit",
                textDecoration: "none",
              }}
              aria-label="Open the 8D and CAPA workspace"
            >
              <span className="toolIcon">
                ◈
              </span>

              <strong>
                8D Root Cause & CAPA
              </strong>

              <span>
                Standalone investigation and
                corrective-action workspace
              </span>

              <span>Available now</span>

              <span aria-hidden="true">
                Open 8D workspace →
              </span>
            </Link>
          </div>

          <h2>Further intelligence modules</h2>

          <div className="toolGrid">
            {plannedModules.map(
              ({ title, status }) => (
                <div
                  className="toolCard"
                  key={title}
                >
                  <span className="toolIcon">
                    ◈
                  </span>

                  <strong>{title}</strong>

                  <span>{status}</span>
                </div>
              )
            )}
          </div>

          <div className="notice">
            RPG Intelligence supports structured
            assessment and decision-making. Its
            outputs do not replace competent-person
            judgement, professional advice or a
            site-specific legal review.
          </div>
        </div>
      </main>
    </PageShell>
  );
}
