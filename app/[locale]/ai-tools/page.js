import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import { locales } from "../../../lib/i18n";

export const metadata = { title: "RPG Intelligence" };

const modules = [
  ["Risk Assessment Builder", "MVP module"],
  ["ISO Gap Analysis", "Planned module"],
  ["Internal Audit Builder", "Planned module"],
  ["CAPA Assistant", "Planned module"],
  ["Business Continuity Planner", "Planned module"],
  ["ISO 27001 Risk Register", "Planned module"]
];

export default async function AiTools({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();

  return (
    <PageShell locale={locale}>
      <main className="simplePage aiPage">
        <div className="simpleInner">
          <span className="kicker">RPG Intelligence</span>
          <h1>AI tools designed around expert review.</h1>
          <p className="lead">
            The first production module will be an AI Risk Assessment Builder with structured inputs, hazard identification, control suggestions, risk scoring, branded outputs and optional professional review.
          </p>
          <div className="toolGrid">
            {modules.map(([title, status]) => (
              <div className="toolCard" key={title}>
                <span className="toolIcon">◈</span>
                <strong>{title}</strong>
                <span>{status}</span>
              </div>
            ))}
          </div>
          <div className="notice">
            AI output is not a substitute for competent-person judgement, professional advice or site-specific legal review.
          </div>
        </div>
      </main>
    </PageShell>
  );
}
