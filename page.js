import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import { locales } from "../../../lib/i18n";

export const metadata = { title: "Cookie Policy" };

export default async function Cookies({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();

  return (
    <PageShell locale={locale}>
      <main className="simplePage legal">
        <div className="simpleInner">
          <h1>Cookie Policy</h1>
          <p><strong>Last updated:</strong> 15 August 2026.</p>
          <h2>Essential technologies</h2>
          <p>
            We use technologies that are necessary to operate the website and
            remember your privacy preferences.
          </p>
          <h2>Google Analytics</h2>
          <p>
            If you choose “Accept analytics”, we load Google Analytics 4 using
            Measurement ID G-CH329M3KX6 to understand visits and engagement.
            Analytics is not loaded when you choose “Essential only”.
          </p>
          <h2>Changing your choice</h2>
          <p>
            Use the “Cookie settings” control on the website to change or withdraw
            your analytics preference.
          </p>
        </div>
      </main>
    </PageShell>
  );
}
