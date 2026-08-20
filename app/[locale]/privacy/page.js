import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import { locales } from "../../../lib/i18n";

export const metadata = {
  title: "Privacy Notice | RPG Excellence",
  description:
    "Learn how RPG Excellence collects, uses, protects and manages personal data.",
};

export default async function Privacy({ params }) {
  const { locale } = await params;

  if (!locales.includes(locale)) {
    notFound();
  }

  return (
    <PageShell locale={locale}>
      <main className="simplePage legal">
        <div className="simpleInner">
          <h1>Privacy Notice</h1>

          <p>
            <strong>Last updated:</strong> 20 August 2026
          </p>

          <p>
            RPG Excellence respects your privacy and is committed to
            protecting personal data. This Privacy Notice explains how
            we collect, use, store and protect personal data when you
            visit our website, contact us, create an account or use
            RPG Excellence services.
          </p>

          <p>
            It also explains your data protection rights and how to
            contact us about the processing of your personal data.
          </p>

          <h2>1. Who we are</h2>

          <p>
            RPG Excellence provides digital tools and services designed
            to support management systems, risk management, compliance,
            assessment and organisational improvement.
          </p>

          <p>
            Where RPG Excellence determines why and how personal data
            is processed, RPG Excellence acts as the data controller.
          </p>

          <p>
            Where we process personal data on behalf of an organisation
            using our platform, that organisation may be the data
            controller and RPG Excellence may act as its data processor.
          </p>

          <p>
            For privacy enquiries, data protection requests or questions
            about how we process personal data, contact:
          </p>

          <p>
            <strong>RPG Excellence</strong>
            <br />
            Privacy contact:{" "}
            <a href="mailto:info@rpgexcellence.com">
              info@rpgexcellence.com
            </a>
          </p>

          <h2>2. Personal data we may collect</h2>

          <p>
            The personal data we collect depends on how you interact
            with RPG Excellence and the services you use.
          </p>

          <p>We may collect information including:</p>

          <ul>
            <li>
              identity information, such as your name;
            </li>

            <li>
              business contact information, such as your email address,
              organisation and role;
            </li>

            <li>
              account information required to create and administer
              your RPG Excellence account;
            </li>

            <li>
              information you provide when contacting us or requesting
              support;
            </li>

            <li>
              information entered into assessments, management tools,
              risk registers, compliance workflows or other platform
              features;
            </li>

            <li>
              technical information, such as IP address, browser type,
              device information and security logs;
            </li>

            <li>
              usage information relating to how our website and
              services are accessed and used;
            </li>

            <li>
              cookie and similar technology information where
              applicable; and
            </li>

            <li>
              billing or transaction-related information where required
              to provide paid services.
            </li>
          </ul>

          <h2>3. Data minimisation by design</h2>

          <p>
            RPG Excellence is designed to minimise the collection of
            unnecessary personal data.
          </p>

          <p>
            Customers and users should avoid entering personal data
            into assessments, risk registers, compliance documents,
            evidence fields or other platform areas unless that
            information is genuinely necessary for the relevant
            business or compliance purpose.
          </p>

          <p>
            Users should take particular care not to enter special
            category personal data, highly sensitive information,
            passwords, payment credentials or other confidential
            personal information unless its processing is specifically
            required and authorised.
          </p>

          <h2>4. How we use personal data</h2>

          <p>We may use personal data to:</p>

          <ul>
            <li>
              provide, operate and maintain RPG Excellence services;
            </li>

            <li>
              create, authenticate and administer user accounts;
            </li>

            <li>
              provide assessments, reports, dashboards and other
              requested platform functionality;
            </li>

            <li>
              respond to enquiries and provide customer support;
            </li>

            <li>
              maintain the security, reliability and integrity of our
              website and services;
            </li>

            <li>
              prevent fraud, misuse, unauthorised access and other
              security threats;
            </li>

            <li>
              improve the performance and usability of our services;
            </li>

            <li>
              administer subscriptions, payments and business
              relationships;
            </li>

            <li>
              comply with legal, regulatory and contractual
              obligations; and
            </li>

            <li>
              establish, exercise or defend legal claims where
              necessary.
            </li>
          </ul>

          <h2>5. Lawful bases for processing</h2>

          <p>
            Where UK or European data protection law applies, we process
            personal data only where we have an appropriate lawful
            basis.
          </p>

          <p>Depending on the circumstances, this may include:</p>

          <ul>
            <li>
              <strong>Contract</strong> — where processing is necessary
              to provide services you or your organisation have
              requested.
            </li>

            <li>
              <strong>Legitimate interests</strong> — where processing
              is necessary for legitimate business purposes, including
              operating, securing and improving our services, provided
              those interests are not overridden by your rights and
              freedoms.
            </li>

            <li>
              <strong>Legal obligation</strong> — where processing is
              required to comply with applicable law.
            </li>

            <li>
              <strong>Consent</strong> — where we rely on your consent
              for a particular processing activity. Where consent is
              relied upon, you may withdraw it at any time.
            </li>
          </ul>

          <h2>6. Customer-controlled data</h2>

          <p>
            Organisations using RPG Excellence may enter information
            into the platform relating to their employees, suppliers,
            customers or other individuals.
          </p>

          <p>
            Where an organisation determines the purposes and means of
            processing that personal data, the organisation is normally
            responsible for ensuring that it has an appropriate lawful
            basis and provides any privacy information required by law.
          </p>

          <p>
            In those circumstances, RPG Excellence processes the
            relevant personal data on the organisation&apos;s behalf
            and in accordance with applicable contractual and data
            protection requirements.
          </p>

          <h2>7. Artificial intelligence and automated processing</h2>

          <p>
            Some RPG Excellence services may use artificial intelligence
            or automated technologies to assist with analysis,
            summarisation, recommendations, drafting or other platform
            functionality.
          </p>

          <p>
            Where personal data is processed through AI-enabled
            functionality, we aim to apply data minimisation and
            appropriate security controls.
          </p>

          <p>
            Users should not submit unnecessary personal, confidential
            or sensitive information to AI-enabled features.
          </p>

          <p>
            AI-generated content should be treated as decision-support
            information and reviewed appropriately by a human where the
            output may influence important business, compliance, risk
            or management decisions.
          </p>

          <h2>8. Sharing personal data</h2>

          <p>
            We do not sell personal data.
          </p>

          <p>
            We may share personal data with carefully selected service
            providers where necessary to operate RPG Excellence,
            including providers of:
          </p>

          <ul>
            <li>cloud hosting and infrastructure;</li>
            <li>database and authentication services;</li>
            <li>email and communications services;</li>
            <li>payment processing services;</li>
            <li>analytics and website services;</li>
            <li>security and monitoring services; and</li>
            <li>AI or technology services where applicable.</li>
          </ul>

          <p>
            Service providers are permitted to process personal data
            only as necessary to provide the relevant services and
            subject to appropriate contractual and security
            requirements.
          </p>

          <p>
            We may also disclose information where required by law,
            regulation, court order or another lawful authority, or
            where reasonably necessary to protect our rights, users or
            services.
          </p>

          <h2>9. International data transfers</h2>

          <p>
            Some service providers used by RPG Excellence may process
            information in countries outside the United Kingdom or the
            country in which you are located.
          </p>

          <p>
            Where applicable data protection law requires safeguards
            for an international transfer of personal data, we seek to
            use an appropriate transfer mechanism or other lawful
            safeguard.
          </p>

          <p>
            Depending on the circumstances, these safeguards may
            include adequacy regulations or decisions, approved
            contractual protections or other mechanisms recognised by
            applicable data protection law.
          </p>

          <h2>10. Data security</h2>

          <p>
            We use technical and organisational measures designed to
            protect personal data against unauthorised access,
            alteration, disclosure, loss, destruction or misuse.
          </p>

          <p>
            Measures may include access controls, authentication,
            encrypted communications, infrastructure security,
            monitoring, backups and restrictions on administrative
            access.
          </p>

          <p>
            No internet-based service can guarantee absolute security.
            Users are also responsible for protecting their account
            credentials and for using the platform appropriately.
          </p>

          <h2>11. Data retention</h2>

          <p>
            We retain personal data only for as long as reasonably
            necessary for the purpose for which it was collected,
            including providing our services and meeting legal,
            accounting, security and contractual requirements.
          </p>

          <p>
            Retention periods may vary depending on the type of
            information, the services being provided, contractual
            requirements and applicable law.
          </p>

          <p>
            When personal data is no longer required, we will take
            reasonable steps to delete, anonymise or otherwise dispose
            of it securely, subject to applicable legal and technical
            requirements.
          </p>

          <h2>12. Cookies and similar technologies</h2>

          <p>
            RPG Excellence may use cookies and similar technologies
            required for website operation, authentication, security,
            preferences and, where applicable, analytics.
          </p>

          <p>
            Where consent is required for non-essential cookies, those
            technologies should not be activated until the required
            consent has been obtained.
          </p>

          <p>
            Further information about the cookies we use and available
            choices is provided through our Cookie Notice and cookie
            settings.
          </p>

          <h2>13. Your data protection rights</h2>

          <p>
            Depending on your location and applicable law, you may have
            rights relating to your personal data.
          </p>

          <p>These may include the right to:</p>

          <ul>
            <li>
              request access to personal data we hold about you;
            </li>

            <li>
              request correction of inaccurate or incomplete personal
              data;
            </li>

            <li>
              request deletion of personal data in certain
              circumstances;
            </li>

            <li>
              request restriction of processing in certain
              circumstances;
            </li>

            <li>
              object to processing based on legitimate interests in
              certain circumstances;
            </li>

            <li>
              request portability of certain personal data;
            </li>

            <li>
              withdraw consent where processing is based on consent;
              and
            </li>

            <li>
              raise a complaint with an appropriate data protection
              supervisory authority.
            </li>
          </ul>

          <p>
            These rights are not absolute and may be subject to
            exemptions or limitations under applicable law.
          </p>

          <h2>14. Exercising your rights</h2>

          <p>
            To exercise a data protection right, contact us at{" "}
            <a href="mailto:info@rpgexcellence.com">
              info@rpgexcellence.com
            </a>
            .
          </p>

          <p>
            We may need to request information to verify your identity
            before responding to a request. This helps ensure that
            personal data is not disclosed to an unauthorised person.
          </p>

          <p>
            Where RPG Excellence processes your information solely on
            behalf of an organisation that controls that information,
            we may direct your request to that organisation or assist
            it in responding to your request.
          </p>

          <h2>15. Children&apos;s privacy</h2>

          <p>
            RPG Excellence is designed for professional and
            organisational use and is not intended as a service for
            children.
          </p>

          <p>
            We do not knowingly seek to collect personal data from
            children through the normal use of our services.
          </p>

          <h2>16. Third-party websites and services</h2>

          <p>
            Our website or services may contain links to third-party
            websites or services.
          </p>

          <p>
            RPG Excellence is not responsible for the privacy practices
            of independent third parties. We encourage users to review
            the privacy information provided by those organisations
            before submitting personal data to them.
          </p>

          <h2>17. Changes to this Privacy Notice</h2>

          <p>
            We may update this Privacy Notice from time to time to
            reflect changes to our services, technology, business
            operations or legal obligations.
          </p>

          <p>
            When we make changes, we will publish the updated notice on
            this page and revise the &quot;Last updated&quot; date where
            appropriate.
          </p>

          <h2>18. Contact us</h2>

          <p>
            If you have questions about this Privacy Notice, wish to
            exercise your data protection rights, or have concerns
            about how your personal data is handled, please contact:
          </p>

          <p>
            <strong>RPG Excellence</strong>
            <br />
            Privacy contact:{" "}
            <a href="mailto:info@rpgexcellence.com">
              info@rpgexcellence.com
            </a>
          </p>

          <p>
            Please do not include unnecessary sensitive personal
            information in an initial privacy enquiry.
          </p>

          <h2>19. Complaints</h2>

          <p>
            We encourage you to contact us first if you have concerns
            about our handling of personal data so that we have an
            opportunity to investigate and respond.
          </p>

          <p>
            You may also have the right to complain to the data
            protection supervisory authority responsible for your
            jurisdiction.
          </p>
        </div>
      </main>
    </PageShell>
  );
}
