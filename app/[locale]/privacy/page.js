import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import { locales } from "../../../lib/i18n";

export const metadata = { title: "Privacy" };

export default async function Privacy({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();

  return (
    <PageShell locale={locale}>
      <main className="simplePage legal">
        <div className="simpleInner">
          <h1>Privacy Notice — Draft</h1>
          <p>This is an MVP placeholder. Before launch it should define the data controller, lawful bases, retention periods, processors, international transfers, cookies, user rights and contact details.</p>
          <h2>Data minimisation by design</h2>
          <p>The platform should avoid collecting unnecessary personal data inside risk assessments and compliance documents.</p>
          <h2>AI processing</h2>
          <p>Customers should be told when information is processed by AI systems, what categories of data are sent, how long data is retained and whether outputs are subject to human review.</p>
        </div>
      </main>
    </PageShell>
  );
}
