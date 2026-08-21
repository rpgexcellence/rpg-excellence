import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import { locales } from "../../../lib/i18n";

export const metadata = {
  title: "RPG Insights",
  description:
    "Practical ISO guidance, standards updates, RPG Intelligence releases and business assurance insights from RPG Excellence.",
};

export default async function InsightsPage({
  params,
}) {
  const { locale } = await params;

  if (!locales.includes(locale)) {
    notFound();
  }

  const issues = [
    {
      number: "004",
      title:
        "ISO 45001:2018 — From Safety Compliance to Evidence-Led OH&S Assurance",
      description:
        "How RPG Intelligence connects OH&S conformity, worker participation, hazard and risk management, evidence sampling, findings, management action and certification-readiness decision support.",
      href:
        "iso-45001-readiness",
    },
    {
      number: "003",
      title:
        "ISO 14001:2026 — Environmental Management Moves from Compliance to Business Assurance",
      description:
        "How RPG Intelligence brings environmental conformity, evidence assurance, compliance obligations, findings, management action and management readiness together in one structured assessment workflow.",
      href:
        "iso-14001-readiness",
    },
    {
      number: "002",
      title:
        "ISO 9001 Moves Beyond the Checklist",
      description:
        "RPG Intelligence now supports ISO 9001:2015/Amd 1:2024 as a complete evidence-led business assurance and certification-readiness assessment, combining weighted scoring, findings, evidence assurance, management readiness and climate-action considerations.",
      href:
        "iso-9001-readiness",
    },
    {
      number: "001",
      title:
        "A Word from RPG",
      description:
        "Why RPG Excellence exists, what RPG Intelligence is being built to do, and how we intend to support organisations with practical assurance, management systems and responsible AI.",
      href:
        "a-word-from-rpg",
    },
  ];

  return (
    <PageShell locale={locale}>
      <main className="simplePage">
        <div className="simpleInner">
          <span className="kicker">
            RPG Insights
          </span>

          <h1>
            Practical guidance for better assurance,
            compliance and management systems.
          </h1>

          <p
            style={{
              maxWidth: "760px",
              color: "#617087",
              fontSize: "18px",
              lineHeight: 1.6,
              marginBottom: "36px",
            }}
          >
            RPG Insights shares practical ISO guidance,
            standards developments, RPG Intelligence
            updates and business assurance thinking from
            RPG Excellence.
          </p>

          <section
            style={{
              display: "grid",
              gap: "20px",
            }}
          >
            {issues.map((issue) => (
              <article
                key={issue.number}
                className="assuranceCard"
                style={{
                  padding: "28px",
                }}
              >
                <span className="kicker">
                  Issue {issue.number}
                </span>

                <h2
                  style={{
                    marginTop: "10px",
                    marginBottom: "12px",
                  }}
                >
                  {issue.title}
                </h2>

                <p
                  style={{
                    color: "#617087",
                    lineHeight: 1.6,
                    marginBottom: "20px",
                  }}
                >
                  {issue.description}
                </p>

                <Link
                  className="button"
                  href={`/${locale}/insights/${issue.href}`}
                >
                  Read Issue {issue.number}
                </Link>
              </article>
            ))}
          </section>
        </div>
      </main>
    </PageShell>
  );
}
