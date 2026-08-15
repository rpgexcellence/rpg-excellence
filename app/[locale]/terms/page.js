import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import { locales } from "../../../lib/i18n";

export const metadata = { title: "Terms & Conditions" };

export default async function Terms({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();

  return (
    <PageShell locale={locale}>
      <main className="simplePage legal">
        <div className="simpleInner">
          <h1>Terms & Conditions — Draft for Legal Review</h1>
          <p><strong>Important:</strong> This is a working commercial draft and should be reviewed by a qualified lawyer before paid services launch.</p>
          <h2>1. Scope</h2>
          <p>RPG Excellence provides consultancy, digital business-assurance tools, AI-assisted document generation and related services. Specific deliverables are defined at purchase or in a separate statement of work.</p>
          <h2>2. AI-assisted outputs</h2>
          <p>AI-generated content is provided as a decision-support and drafting tool. Outputs may contain errors, omissions or unsuitable recommendations. Users must review and validate outputs before operational use.</p>
          <h2>3. Customer responsibility</h2>
          <p>The customer is responsible for providing accurate information, assessing site-specific conditions, ensuring competent-person review where required, and complying with applicable law, regulation and internal procedures.</p>
          <h2>4. No guarantee</h2>
          <p>Use of RPG Excellence services does not guarantee certification, regulatory acceptance, audit success, legal compliance or prevention of loss, injury, incident or business interruption.</p>
          <h2>5. Professional review</h2>
          <p>Unless a service is explicitly sold as professionally reviewed, AI-generated outputs have not been individually reviewed or approved by an RPG Excellence consultant.</p>
          <h2>6. Liability</h2>
          <p>To the maximum extent permitted by applicable law, RPG Excellence excludes liability for indirect, special or consequential losses. Nothing in these terms excludes liability that cannot lawfully be excluded.</p>
          <h2>7. Payments and subscriptions</h2>
          <p>Paid tools and subscriptions will be charged at the price shown at checkout. Renewal, cancellation and refund rules will be stated clearly before purchase.</p>
        </div>
      </main>
    </PageShell>
  );
}
