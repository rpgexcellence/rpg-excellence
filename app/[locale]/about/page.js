import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import { locales } from "../../../lib/i18n";

export const metadata = { title: "About" };

export default async function About({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();

  return (
    <PageShell locale={locale}>
      <main className="simplePage">
        <div className="simpleInner">
          <span className="kicker">About RPG Excellence</span>
          <h1>Practical expertise. Intelligent tools. Better business assurance.</h1>
          <p className="lead">
            RPG Excellence combines management systems consultancy, auditing, continuous improvement and AI-assisted digital tools to help organisations strengthen performance and resilience.
          </p>
          <div className="twoCol">
            <div className="infoCard"><h3>Management systems</h3><p>ISO implementation, integration, internal auditing and continual improvement.</p></div>
            <div className="infoCard"><h3>Business assurance</h3><p>Risk-based thinking, operational discipline and evidence-led improvement.</p></div>
          </div>
        </div>
      </main>
    </PageShell>
  );
}
