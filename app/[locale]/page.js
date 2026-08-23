import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import NewsletterSignup from "../../components/NewsletterSignup";
import { copy, locales } from "../../lib/i18n";

const standards = [
  {
    code: "ISO 9001",
    title: "Quality Management",
    href: "iso-9001",
    tone: "blue",
  },
  {
    code: "ISO 14001",
    title: "Environmental Management",
    href: "iso-14001",
    tone: "green",
  },
  {
    code: "ISO 45001",
    title: "Occupational Health & Safety",
    href: "iso-45001",
    tone: "orange",
  },
  {
    code: "ISO 22301",
    title: "Business Continuity",
    href: "iso-22301",
    tone: "purple",
  },
  {
    code: "ISO 27001",
    title: "Information Security",
    href: "iso-27001",
    tone: "teal",
  },
];

const tools = [
  {
    title: "Risk Assessment",
    href: "/ai-tools",
  },
  {
    title: "Method Statement",
    href: "/ai-tools",
  },
  {
    title: "COSHH",
    href: "/ai-tools",
  },
  {
    title: "Fire Risk",
    href: "/ai-tools",
  },
  {
    title: "ISO Gap Analysis",
    href: "/ai-tools",
  },
  {
    title: "Internal Audit",
    href: "/ai-tools",
  },
  {
    title: "8D & CAPA",
    description:
      "Root cause and corrective action →",
    href: "/portal/rca",
    live: true,
  },
];

const steps = [
  {
    number: "01",
    title: "Assess",
    text: "Complete a structured management system assessment against the relevant ISO requirements.",
  },
  {
    number: "02",
    title: "Analyse",
    text: "RPG Intelligence calculates clause performance, weighted readiness and your Business Assurance Score.",
  },
  {
    number: "03",
    title: "Improve",
    text: "Identify strengths, priority gaps and the areas requiring attention before certification or reassessment.",
  },
  {
    number: "04",
    title: "Report",
    text: "Generate an Executive Summary and professional PDF report for management, clients or internal review.",
  },
];

const benefits = [
  {
    title: "Business Assurance Score",
    text: "Turn assessment answers into a clear weighted readiness score that management can understand immediately.",
  },
  {
    title: "Executive Reporting",
    text: "Present performance, maturity, strongest clauses and improvement priorities in a management-ready format.",
  },
  {
    title: "Clause-Level Insight",
    text: "See exactly where the management system is performing well and where assurance is weakest.",
  },
  {
    title: "Professional PDF Reports",
    text: "Download a structured assessment report that can be shared with leadership, clients and project teams.",
  },
  {
    title: "Progress Tracking",
    text: "Save assessments, continue later and track completion across the full assessment workflow.",
  },
  {
    title: "Built for Improvement",
    text: "Move beyond a checklist by using assessment results to prioritise management system improvement.",
  },
];

const pricing = [
  {
    name: "Starter",
    price: "£20.99",
    period: "/month",
    description:
      "For small organisations beginning their assurance journey.",
    features: [
      "ISO assessments",
      "Business Assurance Score",
      "Executive Summary",
      "PDF reports",
    ],
  },
  {
    name: "Professional",
    price: "£59",
    period: "/month",
    description:
      "For organisations actively managing certification readiness.",
    features: [
      "Everything in Starter",
      "Unlimited assessments",
      "Executive reports",
      "Assessment history",
      "Priority support",
    ],
    featured: true,
  },
  {
    name: "Consultant",
    price: "£159",
    period: "/month",
    description:
      "For consultants managing assurance across multiple clients.",
    features: [
      "Everything in Professional",
      "Consultant workflow",
      "Multiple client assessments",
      "Portfolio reporting",
      "Advanced reporting",
    ],
  },
];

export function generateStaticParams() {
  return locales.map((locale) => ({
    locale,
  }));
}

export default async function Home({ params }) {
  const { locale } = await params;

  if (!locales.includes(locale)) {
    notFound();
  }

  const t = copy[locale];

  return (
    <main>
      <Header locale={locale} nav={t.nav} />

      {/* HERO */}

      <section className="hero">
        <div className="heroCopy">
          <div className="eyebrow">
            <span></span>
            BUSINESS ASSURANCE INTELLIGENCE
          </div>

          <h1>
            Know your management system readiness before the auditor does.
          </h1>

          <p>
            Assess your organisation, identify critical gaps, measure
            readiness and generate management-ready Executive Reports with
            RPG Intelligence.
          </p>

          <div className="ctaRow">
            <Link className="button" href="/portal">
              Start Your Assessment
            </Link>

            <Link
              className="button buttonGhost"
              href={`/${locale}/pricing`}
            >
              View Pricing
            </Link>
          </div>

          <div className="microTrust">
            <span>Structured ISO assessments</span>
            <span>Weighted readiness scoring</span>
            <span>Executive PDF reporting</span>
          </div>
        </div>

        <div className="heroPanel">
          <div className="orb">
            <div className="orbit orbit1"></div>
            <div className="orbit orbit2"></div>

            <div className="orbCore">
              RPG
              <span>INTELLIGENCE</span>
            </div>
          </div>

          <div className="scoreCard">
            <span>Business Assurance Score</span>
            <strong>86%</strong>
            <small>Readiness • Maturity • Improvement</small>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}

      <section className="section">
        <div className="sectionHead">
          <div>
            <span className="kicker">How It Works</span>

            <h2>
              From assessment to management insight.
            </h2>
          </div>

          <p>
            RPG Intelligence turns management system assessment data into
            practical business assurance information.
          </p>
        </div>

        <div className="standardGrid">
          {steps.map((step) => (
            <div
              className="standardCard blue"
              key={step.number}
            >
              <span className="standardBadge">
                {step.number}
              </span>

              <strong>{step.title}</strong>

              <span>{step.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* BUSINESS ASSURANCE */}

      <section className="darkBand">
        <span className="kicker light">
          RPG Intelligence
        </span>

        <h2>
          More than a compliance checklist.
        </h2>

        <p>
          RPG Intelligence helps translate ISO assessment results into
          business-level insight so leadership can understand readiness,
          priorities and management system performance.
        </p>

        <div className="toolGrid darkTools">
          <div className="toolCard darkTool">
            <span className="toolIcon">◈</span>
            <strong>Business Assurance Score</strong>
            <span>
              Weighted management system readiness →
            </span>
          </div>

          <div className="toolCard darkTool">
            <span className="toolIcon">◈</span>
            <strong>Maturity Level</strong>
            <span>
              Understand how established your system is →
            </span>
          </div>

          <div className="toolCard darkTool">
            <span className="toolIcon">◈</span>
            <strong>Priority Clauses</strong>
            <span>
              Identify where improvement matters most →
            </span>
          </div>

          <div className="toolCard darkTool">
            <span className="toolIcon">◈</span>
            <strong>Executive Reports</strong>
            <span>
              Turn assessment data into management insight →
            </span>
          </div>
        </div>
      </section>

      {/* PRODUCT BENEFITS */}

      <section className="section">
        <div className="sectionHead">
          <div>
            <span className="kicker">
              Business Assurance Platform
            </span>

            <h2>
              Understand where you are. Know what to improve.
            </h2>
          </div>

          <p>
            Designed to give quality, compliance and business leaders a
            clearer view of management system readiness.
          </p>
        </div>

        <div className="standardGrid">
          {benefits.map((benefit, index) => (
            <div
              className={`standardCard ${
                index % 2 === 0 ? "blue" : "teal"
              }`}
              key={benefit.title}
            >
              <span className="standardBadge">
                RPG
              </span>

              <strong>
                {benefit.title}
              </strong>

              <span>
                {benefit.text}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* EXECUTIVE REPORT SHOWCASE */}

      <section className="section split">
        <div>
          <span className="kicker">
            Executive Reporting
          </span>

          <h2>
            Turn assessment results into something management can use.
          </h2>

          <p className="lead">
            Completed assessments provide an Executive Summary containing
            overall readiness, maturity, strongest areas, priority clauses
            and clause-by-clause performance.
          </p>

          <div className="ctaRow">
            <Link
              className="button"
              href="/portal"
            >
              Start Assessment
            </Link>

            <Link
              className="button buttonGhost"
              href={`/${locale}/contact`}
            >
              Book a Demo
            </Link>
          </div>
        </div>

        <div className="assuranceCard">
          <div className="miniTitle">
            Executive Assessment
          </div>

          <ul>
            <li>Business Assurance Score</li>
            <li>Assessment completion status</li>
            <li>Maturity classification</li>
            <li>Strongest management system areas</li>
            <li>Priority improvement clauses</li>
            <li>Weighted clause performance</li>
            <li>Downloadable PDF Executive Report</li>
          </ul>

          <p className="finePrint">
            Assessment results support management system review and
            improvement. They do not constitute accredited certification.
          </p>
        </div>
      </section>

      {/* ISO STANDARDS */}

      <section className="section" id="iso">
        <div className="sectionHead">
          <div>
            <span className="kicker">
              ISO Excellence
            </span>

            <h2>{t.standardsTitle}</h2>
          </div>

          <p>
            Quality, safety, environment, resilience and information
            security — connected through one business-focused approach.
          </p>
        </div>

        <div className="standardGrid">
          {standards.map((item) => (
            <Link
              className={`standardCard ${item.tone}`}
              href={`/${locale}/${item.href}`}
              key={item.code}
            >
              <span className="standardBadge">
                {item.code}
              </span>

              <strong>{item.title}</strong>

              <span>
                Explore standard →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* AI / TOOLS */}

      <section className="darkBand">
        <span className="kicker light">
          Intelligent Workflows
        </span>

        <h2>{t.toolsTitle}</h2>

        <p>{t.toolsText}</p>

        <div className="toolGrid darkTools">
          {tools.map((tool) => (
            <Link
              href={
                tool.href.startsWith("/portal")
                  ? tool.href
                  : `/${locale}${tool.href}`
              }
              className="toolCard darkTool"
              key={tool.title}
            >
              <span className="toolIcon">
                ◈
              </span>

              <strong>{tool.title}</strong>

              <span>
                {tool.description ??
                  "AI-assisted workflow →"}
              </span>

              {tool.live && (
                <span
                  style={{
                    display: "inline-block",
                    marginTop: "10px",
                    color: "#67f5e7",
                    fontSize: "12px",
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Available now
                </span>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* HUMAN + AI */}

      <section className="section split">
        <div>
          <span className="kicker">
            Human-Led Assurance
          </span>

          <h2>{t.aiTitle}</h2>

          <p className="lead">
            {t.aiText}
          </p>

          <Link
            className="button"
            href={`/${locale}/ai-tools`}
          >
            Explore RPG Intelligence
          </Link>
        </div>

        <div className="assuranceCard">
          <div className="miniTitle">
            Human-in-the-loop assurance
          </div>

          <ul>
            <li>
              AI-assisted draft generation
            </li>

            <li>
              Structured risk and compliance workflows
            </li>

            <li>
              Optional RPG professional review
            </li>

            <li>
              Branded report-ready outputs
            </li>

            <li>
              Multilingual customer experience
            </li>
          </ul>

          <p className="finePrint">
            {t.disclaimer}
          </p>
        </div>
      </section>

      {/* PRICING */}

      <section className="section">
        <div className="sectionHead">
          <div>
            <span className="kicker">
              Simple Pricing
            </span>

            <h2>
              Start small. Scale your assurance programme as you grow.
            </h2>
          </div>

          <p>
            Choose the level that matches your organisation. Every plan
            includes a 7-day free trial, with no charge until the trial ends.
          </p>
        </div>

        <div className="standardGrid">
          {pricing.map((plan) => (
            <div
              className={`standardCard ${
                plan.featured ? "blue" : "teal"
              }`}
              key={plan.name}
            >
              <span className="standardBadge">
                {plan.featured
                  ? "POPULAR"
                  : "PLAN"}
              </span>

              <strong
                style={{
                  fontSize: "22px",
                }}
              >
                {plan.name}
              </strong>

              <div
                style={{
                  marginTop: "8px",
                  marginBottom: "8px",
                }}
              >
                <strong
                  style={{
                    fontSize: "32px",
                  }}
                >
                  {plan.price}
                </strong>

                <span>
                  {plan.period}
                </span>
              </div>

              <span>
                {plan.description}
              </span>

              <ul
                style={{
                  paddingLeft: "18px",
                  lineHeight: 1.8,
                  marginBottom: "18px",
                }}
              >
                {plan.features.map(
                  (feature) => (
                    <li key={feature}>
                      {feature}
                    </li>
                  )
                )}
              </ul>

              <Link
                className="button"
                href={`/${locale}/pricing`}
              >
                Start 7-Day Free Trial
              </Link>
            </div>
          ))}
        </div>

        <div
          style={{
            textAlign: "center",
            marginTop: "24px",
          }}
        >
          <p
            style={{
              color: "#617087",
              marginBottom: "16px",
            }}
          >
            7-day free trial on every plan. No charge until your trial ends.
          </p>

          <Link
            href={`/${locale}/pricing`}
            className="button buttonGhost"
          >
            View Full Pricing
          </Link>
        </div>
      </section>

      {/* RPG INSIGHTS NEWSLETTER */}

      <section className="section">
        <div
          className="assuranceCard"
          style={{
            maxWidth: "980px",
            margin: "0 auto",
            padding: "36px",
          }}
        >
          <span className="kicker">
            RPG Insights
          </span>

          <h2
            style={{
              marginTop: "12px",
              marginBottom: "14px",
            }}
          >
            Stay ahead of standards, assurance and compliance changes.
          </h2>

          <p
            className="lead"
            style={{
              maxWidth: "760px",
              marginBottom: "24px",
            }}
          >
            Receive practical ISO guidance, standards updates, RPG Intelligence
            releases and business assurance insights from RPG Excellence.
          </p>

          <NewsletterSignup
            locale={locale}
            source="homepage"
          />
        </div>
      </section>

      {/* FINAL CTA */}

      <section className="contactBand">
        <div>
          <span className="kicker light">
            RPG Intelligence
          </span>

          <h2>
            Ready to measure your management system readiness?
          </h2>

          <p>
            Start an assessment, understand your Business Assurance Score
            and turn management system data into actionable insight.
          </p>
        </div>

        <div className="ctaRow">
          <Link
            className="button buttonLight"
            href="/portal"
          >
            Start Assessment
          </Link>

          <Link
            className="button buttonLight"
            href={`/${locale}/contact`}
          >
            Book a Demo
          </Link>
        </div>
      </section>

      <Footer locale={locale} />
    </main>
  );
}
