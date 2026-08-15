import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import { locales } from "../../../lib/i18n";

export const metadata = { title: "ISO 22301 Business Continuity" };

export default async function IsoPage({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();

  return (
    <PageShell locale={locale}>
      <main className="simplePage">
        <div className="simpleInner">
          <span className="kicker">ISO 22301</span>
          <h1>Business Continuity</h1>
          <p className="lead">Prepare for disruption, protect critical activities and strengthen organisational resilience.</p>
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
