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
          <h1>Cookie Policy — Draft</h1>
          <p>The launch version should use only essential cookies unless visitors consent to analytics or marketing cookies. A production consent manager should be added before non-essential tracking is enabled.</p>
        </div>
      </main>
    </PageShell>
  );
}
