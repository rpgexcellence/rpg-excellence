import { notFound } from "next/navigation";

import PageShell from "../../../components/PageShell";
import SubscribeButton from "../../../components/SubscribeButton";
import SingleAssessmentButton from "../../../components/SingleAssessmentButton";
import StandaloneSoaButton from "../../../components/StandaloneSoaButton";
import TrainingPurchaseButton from "../../../components/TrainingPurchaseButton";
import { locales } from "../../../lib/i18n";

export const metadata = {
  title: "RPG Excellence Pricing | Platform, Assessments and Training",
  description:
    "Choose RPG Excellence platform access, a one-off ISO assessment, a standalone Statement of Applicability or individual practitioner training.",
};

const trainingProducts = [
  {
    title: "Risk Assessment Training",
    price: "£19.99",
    detail: "Interactive initial course with practical scenarios, final assessment and verifiable certificate.",
    course: "risk-assessment-initial",
  },
  {
    title: "Risk Assessment Refresher",
    price: "£12.99",
    detail: "Focused refresher covering risk evaluation, controls, recording and review.",
    course: "risk-assessment-refresher",
  },
  {
    title: "Internal Auditor Refresher",
    price: "£19.99",
    detail: "Evidence-led audit judgement, findings, follow-up and effectiveness verification.",
    course: "internal-auditor-refresher",
  },
  {
    title: "RCA & Corrective Action Practitioner",
    price: "£49.99",
    detail: "180-minute structured RCA–8D course with downloadable workbook and certificate.",
    course: "rca-8d-practitioner",
  },
];

export default async function Pricing({
  params,
}) {
  const { locale } = await params;

  if (!locales.includes(locale)) {
    notFound();
  }

  return (
    <PageShell locale={locale}>
      <main className="simplePage">
        <div className="simpleInner">
          <span className="kicker">
            PLATFORM, ONE-OFF TOOLS & TRAINING
          </span>

          <h1>
            Choose the access that matches
            the work you need to complete.
          </h1>

          <p
            style={{
              maxWidth: "720px",
              marginBottom: "40px",
              color: "#617087",
              fontSize: "18px",
              lineHeight: 1.6,
            }}
          >
            Use the connected assurance platform, purchase one controlled
            assessment, or build individual competence through interactive
            training. RPG Excellence is not VAT registered; the displayed price
            is the amount charged.
          </p>

          <div className="pricingGrid">
            <div className="priceCard">
              <span>Starter</span>

              <h3>£20.99/month</h3>

              <p>
                For a small organisation starting a controlled assurance
                workspace.
              </p>

              <ul>
                <li>One organisation workspace</li>
                <li>Five ISO gap-analysis frameworks</li>
                <li>Health &amp; Safety risk and action control</li>
                <li>Controlled evidence and reports</li>
                <li>Email support</li>
              </ul>

              <div
                style={{
                  marginTop: "24px",
                }}
              >
                <SubscribeButton plan="starter">
                  Start 7-Day Free Trial
                </SubscribeButton>
              </div>
            </div>

            <div className="priceCard featured">
              <span>Professional</span>

              <h3>£59/month</h3>

              <p>
                For organisations managing connected audit, assurance and
                improvement activity.
              </p>

              <ul>
                <li>Everything in Starter</li>
                <li>Internal Audit programme and execution</li>
                <li>Auditor verification and NC control</li>
                <li>RCA–8D corrective-action workflow</li>
                <li>Statement of Applicability workspace</li>
                <li>Priority support</li>
              </ul>

              <div
                style={{
                  marginTop: "24px",
                }}
              >
                <SubscribeButton plan="professional">
                  Start 7-Day Free Trial
                </SubscribeButton>
              </div>
            </div>

            <div className="priceCard">
              <span>Consultant</span>

              <h3>£159/month</h3>

              <p>
                For consultants and assurance professionals managing broader
                client portfolios.
              </p>

              <ul>
                <li>Everything in Professional</li>
                <li>Multi-client operating model</li>
                <li>Portfolio management boards</li>
                <li>Executive reports</li>
                <li>Priority onboarding support</li>
              </ul>

              <div
                style={{
                  marginTop: "24px",
                }}
              >
                <SubscribeButton plan="consultant">
                  Start 7-Day Free Trial
                </SubscribeButton>
              </div>
            </div>
          </div>

          <section style={{marginTop:64}}>
            <span className="kicker">RPG TRAINING ACADEMY</span>
            <h2>Individual training—no subscription required</h2>
            <p className="lead">
              Each purchase provides personal learner access, interactive
              exercises, a protected final assessment and a verifiable
              certificate. The displayed price is the total course price.
            </p>
            <div className="pricingGrid" style={{marginTop:28}}>
              {trainingProducts.map((product) => (
                <article className="priceCard" key={product.course}>
                  <span>INDIVIDUAL COURSE</span>
                  <h3>{product.title}</h3>
                  <h2 style={{margin:"8px 0"}}>{product.price}</h2>
                  <p>{product.detail}</p>
                  <div style={{marginTop:24}}>
                    <TrainingPurchaseButton className="button" course={product.course}>
                      Buy course
                    </TrainingPurchaseButton>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="priceCard" style={{marginTop:32,maxWidth:820,marginInline:"auto",border:"2px solid #2d63eb"}}>
            <span>ONE-OFF ACCESS</span>
            <h2 style={{margin:"10px 0"}}>Single ISO Gap Analysis · £129</h2>
            <p>Complete one structured assessment without starting a subscription. Includes one organisation, one selected standard, 30 days to complete, 90 days to manage assessment-linked corrective action and continued read-only access to the retained record.</p>
            <ul><li>One assessment against the standard selected at checkout</li><li>Executive assessment result, findings and evidence trail</li><li>Assessment-linked Management Action, CAPA or 8D treatment</li><li>90-day corrective-action and effectiveness-verification workspace</li><li>No recurring payment</li><li>Standalone CAPA-8D, Internal Audit and programme modules require a subscription</li></ul>
            <SingleAssessmentButton />
          </section>

          <section className="priceCard" style={{marginTop:18,maxWidth:820,marginInline:"auto",border:"2px solid #0f9f8f"}}>
            <span>STANDALONE ISO/IEC 27001 TOOL</span>
            <h2 style={{margin:"10px 0"}}>Statement of Applicability · £129</h2>
            <p>Build, review and approve a controlled Statement of Applicability without purchasing the full ISO/IEC 27001 gap assessment.</p>
            <ul><li>All 93 ISO/IEC 27001:2022 Annex A controls</li><li>Applicability, implementation and effectiveness decisions</li><li>ISO/IEC 27002-aligned guidance and evidence prompts</li><li>Residual-risk ownership, acceptance and treatment</li><li>Dynamic executive narrative and controlled PDF</li><li>30-day completion access and retained read-only record</li></ul>
            <StandaloneSoaButton />
          </section>

          <p
            style={{
              marginTop: "40px",
              color: "#617087",
              textAlign: "center",
            }}
          >
            Subscription plans include a 7-day free trial. One-off assessments,
            specialist workspaces and training courses are charged at checkout.
          </p>
        </div>
      </main>
    </PageShell>
  );
}
