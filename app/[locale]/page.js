import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { copy, locales } from "../../lib/i18n";

const standards = [
  { code: "ISO 9001", title: "Quality Management", href: "iso-9001", tone: "blue" },
  { code: "ISO 14001", title: "Environmental Management", href: "iso-14001", tone: "green" },
  { code: "ISO 45001", title: "Occupational Health & Safety", href: "iso-45001", tone: "orange" },
  { code: "ISO 22301", title: "Business Continuity", href: "iso-22301", tone: "purple" },
  { code: "ISO 27001", title: "Information Security", href: "iso-27001", tone: "teal" }
];

const tools = [
  "Risk Assessment",
  "Method Statement",
  "COSHH",
  "Fire Risk",
  "ISO Gap Analysis",
  "Internal Audit"
];

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function Home({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  const t = copy[locale];

  return (
    <main>
      <Header locale={locale} nav={t.nav} />

      <section className="hero">
        <div className="heroCopy">
          <div className="eyebrow"><span></span>{t.heroEyebrow}</div>
          <h1>{t.heroTitle}</h1>
          <p>{t.heroText}</p>

          <div className="ctaRow">
            <Link className="button" href={`/${locale}/ai-tools`}>{t.start}</Link>
            <Link className="button buttonGhost" href={`/${locale}/contact`}>{t.book}</Link>
          </div>

          <div className="microTrust">
            <span>Global standards</span>
            <span>Expert consultancy</span>
            <span>AI-assisted workflows</span>
          </div>
        </div>

        <div className="heroPanel">
          <div className="orb">
            <div className="orbit orbit1"></div>
            <div className="orbit orbit2"></div>
            <div className="orbCore">RPG<span>INTELLIGENCE</span></div>
          </div>
          <div className="scoreCard">
            <span>Business Assurance Score</span>
            <strong>86%</strong>
            <small>AI insight • Expert review</small>
          </div>
        </div>
      </section>

      <section className="section" id="iso">
        <div className="sectionHead">
          <div>
            <span className="kicker">ISO Excellence</span>
            <h2>{t.standardsTitle}</h2>
          </div>
          <p>Quality, safety, environment, resilience and information security — connected through one business-focused approach.</p>
        </div>

        <div className="standardGrid">
          {standards.map((item) => (
            <Link className={`standardCard ${item.tone}`} href={`/${locale}/${item.href}`} key={item.code}>
              <span className="standardBadge">{item.code}</span>
              <strong>{item.title}</strong>
              <span>Explore service →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="darkBand">
        <span className="kicker light">RPG Intelligence</span>
        <h2>{t.toolsTitle}</h2>
        <p>{t.toolsText}</p>
        <div className="toolGrid darkTools">
          {tools.map((tool) => (
            <Link href={`/${locale}/ai-tools`} className="toolCard darkTool" key={tool}>
              <span className="toolIcon">◈</span>
              <strong>{tool}</strong>
              <span>AI-assisted workflow →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section split">
        <div>
          <span className="kicker">RPG Intelligence</span>
          <h2>{t.aiTitle}</h2>
          <p className="lead">{t.aiText}</p>
          <Link className="button" href={`/${locale}/ai-tools`}>Explore RPG Intelligence</Link>
        </div>

        <div className="assuranceCard">
          <div className="miniTitle">Human-in-the-loop assurance</div>
          <ul>
            <li>AI-assisted draft generation</li>
            <li>Structured risk and compliance workflows</li>
            <li>Optional RPG professional review</li>
            <li>Branded report-ready outputs</li>
            <li>Multilingual customer experience</li>
          </ul>
          <p className="finePrint">{t.disclaimer}</p>
        </div>
      </section>

      <section className="contactBand">
        <div>
          <span className="kicker light">RPG Excellence</span>
          <h2>{t.contactTitle}</h2>
          <p>{t.contactText}</p>
        </div>
        <Link className="button buttonLight" href={`/${locale}/contact`}>
          Contact RPG Excellence
        </Link>
      </section>

      <Footer locale={locale} />
    </main>
  );
}
