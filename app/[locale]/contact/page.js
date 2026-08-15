import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import { locales } from "../../../lib/i18n";

export const metadata = { title: "Contact" };

export default async function Contact({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();

  return (
    <PageShell locale={locale}>
      <main className="simplePage">
        <div className="simpleInner">
          <span className="kicker">Contact</span>
          <h1>Let’s discuss what your organisation needs.</h1>
          <p className="lead">Email RPG Excellence for consultancy, audits, management systems support or early access to RPG Intelligence.</p>
          <div className="contactCard">
            <span>Business enquiries</span>
            <a href="mailto:info@rpgexcellence.com">info@rpgexcellence.com</a>
          </div>
        </div>
      </main>
    </PageShell>
  );
}
