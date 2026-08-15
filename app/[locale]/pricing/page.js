import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import { locales } from "../../../lib/i18n";

export const metadata = { title: "Pricing" };

export default async function Pricing({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();

  return (
    <PageShell locale={locale}>
      <main className="simplePage">
        <div className="simpleInner">
          <span className="kicker">Pricing</span>
          <h1>Start with the support you need. Scale when you’re ready.</h1>
          <div className="pricingGrid">
            <div className="priceCard"><span>Starter</span><h3>Coming soon</h3><p>Entry-level AI tools and selected document workflows.</p></div>
            <div className="priceCard featured"><span>Professional</span><h3>Coming soon</h3><p>Expanded AI workflows, saved documents and expert-review options.</p></div>
            <div className="priceCard"><span>Business</span><h3>Custom</h3><p>Teams, dashboards, audit workflows and management-system support.</p></div>
          </div>
        </div>
      </main>
    </PageShell>
  );
}
