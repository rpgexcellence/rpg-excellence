import { notFound } from "next/navigation";

import PageShell from "../../../components/PageShell";
import SubscribeButton from "../../../components/SubscribeButton";
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
