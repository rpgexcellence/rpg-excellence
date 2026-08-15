import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import { locales } from "../../../lib/i18n";

export const metadata = { title: "ISO 27001 Information Security" };

export default async function IsoPage({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();

  return (
    <PageShell locale={locale}>
      <main className="simplePage">
        <div className="simpleInner">
          <span className="kicker">ISO 27001</span>
          <h1>Information Security</h1>
          <p className="lead">Manage information-security risks through a structured, risk-based information security management system.</p>
          <div className="twoCol">
            <div className="infoCard">
              <h3>How RPG Excellence can help</h3>
              <p>Gap analysis, implementation support, internal audits, management review preparation and continual improvement.</p>
            </div>
            <div className="infoCard">
              <h3>Business-focused approach</h3>
              <p>We design management systems around how your organisation actually works — not around unnecessary paperwork.</p>
            </div>
          </div>
        </div>
      </main>
    </PageShell>
  );
}
