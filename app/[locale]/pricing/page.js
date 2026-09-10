import { notFound } from "next/navigation";

import PageShell from "../../../components/PageShell";
import SubscribeButton from "../../../components/SubscribeButton";
import SingleAssessmentButton from "../../../components/SingleAssessmentButton";
import StandaloneSoaButton from "../../../components/StandaloneSoaButton";
import { locales } from "../../../lib/i18n";

export const metadata = {
  title: "Pricing",
};

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
            RPG Intelligence
          </span>

          <h1>
            Choose the plan that's right
            for your business.
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
            Start with a 7-day free trial.
            Cancel anytime during your
            trial. Upgrade whenever your
            business grows.
          </p>

          <div className="pricingGrid">
            <div className="priceCard">
              <span>Starter</span>

              <h3>£20.99/month</h3>

              <p>
                Perfect for small businesses
                beginning their ISO and
                compliance journey.
              </p>

              <ul>
                <li>AI document generation</li>
                <li>Risk assessments</li>
                <li>Method statements</li>
                <li>COSHH assessments</li>
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
                Designed for growing
                organisations managing
                multiple compliance
                requirements.
              </p>

              <ul>
                <li>Everything in Starter</li>
                <li>Unlimited documents</li>
                <li>ISO gap analysis</li>
                <li>Internal audit tools</li>
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
                Built for consultants,
                advisors and multi-client
                compliance professionals.
              </p>

              <ul>
                <li>Everything in Professional</li>
                <li>Multiple organisations</li>
                <li>Client dashboards</li>
                <li>Executive reports</li>
                <li>Premium support</li>
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

          <section className="priceCard" style={{marginTop:32,maxWidth:820,marginInline:"auto",border:"2px solid #2d63eb"}}>
            <span>ONE-OFF ACCESS</span>
            <h2 style={{margin:"10px 0"}}>Single ISO Assessment · £129</h2>
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
            All plans include a 7-day free
            trial. No charge is made until
            your trial ends.
          </p>
        </div>
      </main>
    </PageShell>
  );
}
