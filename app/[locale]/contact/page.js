import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import ContactEnquiryForm from "../../../components/ContactEnquiryForm";
import { locales } from "../../../lib/i18n";

export const metadata = {
  title: "Contact",
  description: "Contact RPG Excellence Ltd about business assurance, management systems and practitioner resources. Company number 17564662.",
};

export default async function Contact({ params, searchParams }) {
  const { locale } = await params;
  const query = await searchParams;
  if (!locales.includes(locale)) notFound();

  return (
    <PageShell locale={locale}>
      <main className="simplePage companyContactPage">
        <div className="simpleInner companyContactLayout">
          <div className="companyContactMain">
            <span className="kicker">Contact</span>
            <h1>Let’s discuss what your organisation needs.</h1>
            <p className="lead">Tell us which standards, assurance topic and outcome matter to you. We will use the details to prepare a focused response.</p>
            <ContactEnquiryForm locale={locale} source="contact-page" initialStandard={query?.standard || ""} initialTopic={query?.topic || ""} />
          </div>
          <aside className="companyContactCard" aria-labelledby="company-details-heading">
            <span className="kicker">Company details</span>
            <h2 id="company-details-heading">RPG EXCELLENCE LTD</h2>
            <p className="companyContactIntro">Practical management systems and business assurance.</p>
            <dl>
              <div><dt>Company number</dt><dd>17564662</dd></div>
              <div><dt>Registered in</dt><dd>England and Wales</dd></div>
              <div><dt>Registered office</dt><dd><address>71-75 Shelton Street<br />Covent Garden<br />London<br />United Kingdom<br />WC2H 9JQ</address></dd></div>
              <div><dt>Email</dt><dd><a href="mailto:info@rpgexcellence.com">info@rpgexcellence.com</a></dd></div>
            </dl>
          </aside>
        </div>
        <style>{`
          .companyContactPage .companyContactLayout { max-width: 1320px; display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: clamp(24px, 4vw, 56px); align-items: start; }
          .companyContactMain { min-width: 0; }
          .companyContactPage h1 { font-size: clamp(40px, 4.5vw, 64px); line-height: 1.12; }
          .companyContactMain .lead { line-height: 1.7; margin-bottom: 30px; }
          .companyContactCard { min-width: 0; padding: 28px; border: 1px solid #d8e4ef; border-top: 4px solid #1762e8; border-radius: 16px; background: #fff; box-shadow: 0 12px 34px rgba(12, 48, 87, .06); }
          .companyContactCard h2 { margin: 16px 0 12px; color: #0c2443; font-size: 24px; line-height: 1.2; overflow-wrap: anywhere; }
          .companyContactIntro { color: #5b7085; line-height: 1.65; font-size: 14px; }
          .companyContactCard dl { margin: 24px 0; }
          .companyContactCard dl > div { padding: 17px 0; border-top: 1px solid #e5edf4; }
          .companyContactCard dt { color: #5b7085; font-size: 12px; font-weight: 700; margin-bottom: 8px; }
          .companyContactCard dd { margin: 0; color: #123451; font-size: 15px; line-height: 1.65; overflow-wrap: anywhere; }
          .companyContactCard address { font-style: normal; }
          .companyContactCard a { color: #1459d9; text-underline-offset: 4px; }
          .companyContactCard a:focus-visible { outline: 3px solid #1459d9; outline-offset: 4px; }
          @media (max-width: 1000px) { .companyContactPage .companyContactLayout { grid-template-columns: minmax(0, 1fr); } .companyContactCard { width: 100%; box-sizing: border-box; } }
          @media (max-width: 480px) { .companyContactPage { padding: 48px 5vw; } .companyContactCard { padding: 22px; } }
        `}</style>
      </main>
    </PageShell>
  );
}
