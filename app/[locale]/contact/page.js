import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import ContactEnquiryForm from "../../../components/ContactEnquiryForm";
import { locales } from "../../../lib/i18n";

export const metadata = { title: "Contact" };

export default async function Contact({ params, searchParams }) {
  const { locale } = await params;
  const query = await searchParams;
  if (!locales.includes(locale)) notFound();

  return (
    <PageShell locale={locale}>
      <main className="simplePage">
        <div className="simpleInner">
          <span className="kicker">Contact</span>
          <h1>Let’s discuss what your organisation needs.</h1>
          <p className="lead">Tell us which standards, assurance topic and outcome matter to you. We will use the details to prepare a focused response.</p>
          <ContactEnquiryForm locale={locale} source="contact-page" initialStandard={query?.standard || ""} initialTopic={query?.topic || ""} />
        </div>
      </main>
    </PageShell>
  );
}
