import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import { locales } from "../../../lib/i18n";

export const metadata = {
  title: "Terms & Conditions | RPG Excellence",
  description:
    "Terms governing access to and use of RPG Excellence services, software, assessments and digital tools.",
};

export default async function Terms({ params }) {
  const { locale } = await params;

  if (!locales.includes(locale)) {
    notFound();
  }

  return (
    <PageShell locale={locale}>
      <main className="simplePage legal">
        <div className="simpleInner">
          <h1>Terms &amp; Conditions</h1>

          <p>
            <strong>Last updated:</strong> 20 August 2026
          </p>

          <p>
            These Terms &amp; Conditions govern access to and use of the
            RPG Excellence website, RPG Intelligence platform, digital
            tools, assessments, reports, consultancy-related services and
            other services made available by RPG Excellence.
          </p>

          <p>
            By creating an account, purchasing a service, accessing paid
            functionality or otherwise using RPG Excellence services, you
            agree to these Terms.
          </p>

          <p>
            If you use the services on behalf of an organisation, you
            confirm that you have authority to bind that organisation to
            these Terms.
          </p>

          <h2>1. About RPG Excellence</h2>

          <p>
            RPG Excellence provides business-assurance, management-system,
            risk, compliance, assessment and decision-support services and
            technology.
          </p>

          <p>
            Our services may include RPG Intelligence, digital assessments,
            readiness tools, reports, management-action functionality,
            evidence-management features, AI-assisted tools, consultancy
            services and related digital content.
          </p>

          <p>
            Questions about these Terms can be sent to:
          </p>

          <p>
            <strong>RPG Excellence</strong>
            <br />
            Email:{" "}
            <a href="mailto:info@rpgexcellence.com">
              info@rpgexcellence.com
            </a>
          </p>

          <h2>2. Scope of the services</h2>

          <p>
            The features, deliverables and scope of a particular service
            are those described on the relevant product page, order page,
            proposal, quotation, statement of work or other written
            agreement.
          </p>

          <p>
            Where a separate signed agreement or statement of work applies,
            that document will take priority over these Terms to the extent
            of any direct conflict.
          </p>

          <p>
            We may improve, update or modify features from time to time,
            provided that we do not materially remove paid functionality
            during an agreed subscription period without reasonable cause
            or an appropriate alternative.
          </p>

          <h2>3. Accounts and authorised users</h2>

          <p>
            Some services require an account. You are responsible for
            ensuring that account information is accurate and kept up to
            date.
          </p>

          <p>
            Login credentials are personal to the authorised user and must
            not be shared except where the service expressly supports shared
            or organisational access.
          </p>

          <p>
            You are responsible for activity performed through your account
            by users you authorise, except to the extent that activity
            results from a security failure for which RPG Excellence is
            responsible.
          </p>

          <p>
            You must notify us promptly if you become aware of unauthorised
            access, suspected credential compromise or another security
            incident affecting your account.
          </p>

          <h2>4. Acceptable use</h2>

          <p>You must not use RPG Excellence services to:</p>

          <ul>
            <li>break applicable law or regulation;</li>

            <li>
              infringe another person&apos;s intellectual property,
              confidentiality, privacy or other rights;
            </li>

            <li>
              upload malware, malicious code or material intended to disrupt
              the service;
            </li>

            <li>
              attempt to gain unauthorised access to accounts, systems,
              databases or infrastructure;
            </li>

            <li>
              circumvent security, authentication, usage restrictions or
              access controls;
            </li>

            <li>
              scrape, reverse engineer or systematically extract the service
              except where expressly permitted by law or written agreement;
            </li>

            <li>
              use the service to generate deliberately misleading,
              fraudulent or unlawful compliance records;
            </li>

            <li>
              impersonate another person or organisation without authority;
              or
            </li>

            <li>
              use the platform in a way that materially interferes with its
              security, performance or availability for others.
            </li>
          </ul>

          <h2>5. Customer information and responsibilities</h2>

          <p>
            You are responsible for the accuracy, completeness and lawful
            use of information that you or your authorised users provide to
            RPG Excellence.
          </p>

          <p>
            You are also responsible for determining whether information
            generated or stored through the platform is appropriate for your
            organisation, operations, legal obligations and intended use.
          </p>

          <p>
            You should ensure that assessments, findings, risk evaluations,
            corrective actions, evidence records and management decisions
            are reviewed by suitably competent persons where appropriate.
          </p>

          <p>
            You must not upload personal, confidential, classified or
            sensitive information unless you are authorised to do so and its
            processing is appropriate for the relevant purpose.
          </p>

          <h2>6. Assessments, readiness scores and recommendations</h2>

          <p>
            RPG Excellence may provide assessments, maturity scores,
            readiness scores, findings, risk indicators, management
            recommendations and related outputs.
          </p>

          <p>
            These outputs are decision-support tools based on information
            entered into or available to the service and on the methodology
            applied by the relevant tool.
          </p>

          <p>
            Assessment completion does not necessarily mean that an
            organisation has achieved compliance, certification readiness or
            a particular level of management-system maturity.
          </p>

          <p>
            Scores and recommendations should be interpreted together with
            the underlying evidence, open findings, risk exposure, management
            actions and professional judgement.
          </p>

          <h2>7. ISO and certification disclaimer</h2>

          <p>
            RPG Excellence is not an accredited certification body unless
            expressly stated otherwise for a specific separately regulated
            service.
          </p>

          <p>
            RPG Excellence assessments, readiness recommendations and reports
            do not themselves constitute accredited ISO certification,
            regulatory approval or formal certification decisions.
          </p>

          <p>
            Use of RPG Excellence services does not guarantee:
          </p>

          <ul>
            <li>ISO certification;</li>
            <li>successful external audit;</li>
            <li>regulatory approval;</li>
            <li>legal compliance;</li>
            <li>absence of nonconformities;</li>
            <li>prevention of incidents or losses; or</li>
            <li>
              acceptance of evidence or conclusions by a regulator,
              certification body, auditor, insurer or other third party.
            </li>
          </ul>

          <p>
            Certification decisions remain the responsibility of the
            relevant accredited certification body.
          </p>

          <h2>8. AI-assisted functionality</h2>

          <p>
            Some RPG Excellence services may use artificial intelligence or
            automated technology to assist with drafting, analysis,
            summarisation, classification, recommendations, evidence review
            or other tasks.
          </p>

          <p>
            AI-assisted output may be incomplete, inaccurate, unsuitable,
            outdated or affected by the information supplied to the system.
          </p>

          <p>
            AI-generated or AI-assisted output must therefore be reviewed
            before being relied upon for material operational, legal,
            regulatory, safety, environmental, financial, certification or
            management decisions.
          </p>

          <p>
            Unless expressly stated otherwise, AI-generated content has not
            been individually reviewed or approved by an RPG Excellence
            consultant.
          </p>

          <p>
            RPG Excellence does not warrant that AI-assisted output will be
            error-free or appropriate for every factual or regulatory
            context.
          </p>

          <h2>9. Professional and legal advice</h2>

          <p>
            Unless a service is expressly contracted as professional
            consultancy, the digital platform and its outputs do not
            constitute legal, financial, medical, engineering or other
            regulated professional advice.
          </p>

          <p>
            Where specialist advice is required, you should obtain advice
            from an appropriately qualified professional who can consider
            your specific circumstances.
          </p>

          <h2>10. Consultancy services</h2>

          <p>
            Where RPG Excellence provides consultancy, advisory or
            professionally reviewed services, the specific scope,
            assumptions, deliverables, timescales and fees may be described
            in a quotation, proposal, statement of work or other written
            agreement.
          </p>

          <p>
            Consultancy conclusions are based on the information made
            available, observations reasonably possible within the agreed
            scope and conditions existing at the time of the work.
          </p>

          <p>
            Unless expressly included in the agreed scope, consultancy does
            not amount to a guarantee of legal compliance, certification or
            future performance.
          </p>

          <h2>11. Intellectual property</h2>

          <p>
            RPG Excellence and its licensors retain ownership of the RPG
            Excellence website, RPG Intelligence platform, software,
            methodologies, templates, designs, branding, databases, source
            code and other proprietary materials.
          </p>

          <p>
            Subject to these Terms and any applicable subscription or
            licence restrictions, we grant authorised users a limited,
            non-exclusive, non-transferable right to use the service for
            legitimate internal business purposes.
          </p>

          <p>
            You must not reproduce, sell, sublicense, publish, distribute or
            commercially exploit RPG Excellence software or proprietary
            materials except where expressly authorised.
          </p>

          <h2>12. Customer content</h2>

          <p>
            As between you and RPG Excellence, you retain ownership of
            content and information you submit to the service, subject to
            any rights owned by third parties.
          </p>

          <p>
            You grant RPG Excellence the rights reasonably necessary to
            host, process, store, transmit, back up and otherwise handle that
            content for the purpose of providing, securing and supporting
            the service.
          </p>

          <p>
            You confirm that you have the rights and permissions necessary
            to provide that content to us.
          </p>

          <h2>13. Confidentiality</h2>

          <p>
            Each party should protect confidential information received from
            the other party using reasonable care and should use it only for
            the purposes for which it was disclosed.
          </p>

          <p>
            Confidentiality obligations do not apply to information that is
            already lawfully public, independently developed without use of
            the confidential information, already lawfully known, or
            required to be disclosed by law or a competent authority.
          </p>

          <h2>14. Privacy and data protection</h2>

          <p>
            Personal data is handled in accordance with our Privacy Notice
            and applicable data protection law.
          </p>

          <p>
            Where RPG Excellence processes personal data on behalf of a
            customer, additional data-processing terms may apply.
          </p>

          <h2>15. Third-party services</h2>

          <p>
            RPG Excellence may depend on or integrate with third-party
            infrastructure, payment, authentication, communications,
            analytics, AI or other technology providers.
          </p>

          <p>
            We are not responsible for independent third-party services that
            you choose to access separately from RPG Excellence, although we
            remain responsible for our own obligations in selecting and using
            service providers on our behalf.
          </p>

          <h2>16. Availability and maintenance</h2>

          <p>
            We aim to provide a reliable service but do not guarantee
            uninterrupted or error-free availability.
          </p>

          <p>
            Access may occasionally be interrupted for maintenance,
            upgrades, security work, infrastructure incidents or events
            outside our reasonable control.
          </p>

          <p>
            Where reasonably practicable, we will seek to minimise material
            disruption to paid services.
          </p>

          <h2>17. Subscriptions and fees</h2>

          <p>
            Prices, billing periods, included features and applicable taxes
            will be shown before purchase or agreed in writing.
          </p>

          <p>
            Unless otherwise stated, subscription charges are payable in
            advance for the applicable billing period.
          </p>

          <p>
            You are responsible for providing accurate billing information
            and keeping payment details current where recurring payment is
            used.
          </p>

          <p>
            We will not impose undisclosed mandatory charges. Optional paid
            features or extras will be identified before you agree to
            purchase them.
          </p>

          <h2>18. Renewal and cancellation</h2>

          <p>
            Where a service renews automatically, the renewal terms,
            billing frequency and cancellation method will be stated before
            purchase.
          </p>

          <p>
            Customers may cancel a subscription using the cancellation
            method made available for that service or by contacting RPG
            Excellence where appropriate.
          </p>

          <p>
            Cancellation generally prevents future renewal and does not
            automatically create a right to refund fees already properly
            charged for a current billing period, except where required by
            law or expressly stated otherwise.
          </p>

          <h2>19. Consumer rights</h2>

          <p>
            Some RPG Excellence services are intended primarily for business
            and professional use.
          </p>

          <p>
            If you contract with us as a consumer, nothing in these Terms is
            intended to remove or reduce rights that cannot lawfully be
            excluded or restricted.
          </p>

          <p>
            Where applicable consumer law gives you cancellation, refund,
            quality, digital-content or other statutory rights, those rights
            continue to apply.
          </p>

          <h2>20. Suspension</h2>

          <p>
            We may suspend access where reasonably necessary to:
          </p>

          <ul>
            <li>protect the security or integrity of the service;</li>
            <li>respond to suspected fraud or unlawful activity;</li>
            <li>prevent material misuse;</li>
            <li>comply with a legal requirement;</li>
            <li>
              address a material breach of these Terms; or
            </li>
            <li>
              address undisputed overdue payment relating to a paid
              business service.
            </li>
          </ul>

          <p>
            Where appropriate and reasonably practicable, we will give
            notice and an opportunity to remedy the issue before suspension.
          </p>

          <h2>21. Termination</h2>

          <p>
            Either party may terminate services in accordance with the
            cancellation or termination rights applying to the relevant
            service, subscription or statement of work.
          </p>

          <p>
            We may terminate access for a material breach that is not
            remedied within a reasonable period after notice, or immediately
            where necessary in response to serious unlawful activity,
            security abuse or conduct that presents a material risk to the
            service or others.
          </p>

          <p>
            Termination does not affect rights or liabilities that arose
            before termination.
          </p>

          <h2>22. Data following termination</h2>

          <p>
            Following termination or account closure, access to customer data
            may cease.
          </p>

          <p>
            Customers should export information they need before terminating
            a service where export functionality is available.
          </p>

          <p>
            Data may subsequently be deleted, anonymised or retained for a
            limited period in accordance with our Privacy Notice, applicable
            law, security requirements and contractual obligations.
          </p>

          <h2>23. Warranties</h2>

          <p>
            We will provide paid services with reasonable care and skill
            where required by applicable law.
          </p>

          <p>
            Except for warranties that cannot lawfully be excluded, we do
            not warrant that:
          </p>

          <ul>
            <li>the services will always be uninterrupted;</li>
            <li>all defects can or will be corrected immediately;</li>
            <li>
              every output will be complete, accurate or suitable for every
              purpose;
            </li>
            <li>
              use of the service will guarantee compliance, certification or
              a particular commercial result.
            </li>
          </ul>

          <h2>24. Liability</h2>

          <p>
            Nothing in these Terms excludes or limits liability where doing
            so would be unlawful.
          </p>

          <p>
            In particular, nothing in these Terms excludes liability for
            death or personal injury caused by negligence, fraud or
            fraudulent misrepresentation, or any other liability that cannot
            legally be excluded or limited.
          </p>

          <p>
            Subject to those protections and to the maximum extent permitted
            by law, RPG Excellence will not be liable for indirect or
            consequential loss that was not reasonably foreseeable when the
            relevant contract was formed.
          </p>

          <p>
            For business customers, and subject to any separate written
            agreement, RPG Excellence will not normally be responsible for
            loss of profit, loss of anticipated savings, loss of business
            opportunity, loss of goodwill or purely indirect commercial
            losses arising from use of the services.
          </p>

          <p>
            Any contractual financial liability cap applicable to a paid
            business service should be stated in the relevant order,
            subscription terms, proposal or statement of work. We do not use
            this clause to exclude liability that applicable law does not
            permit us to exclude.
          </p>

          <h2>25. Events outside reasonable control</h2>

          <p>
            Neither party will be responsible for delay or failure caused by
            events outside its reasonable control, provided that the affected
            party takes reasonable steps to reduce the impact where
            practicable.
          </p>

          <p>
            Such events may include widespread infrastructure failure,
            telecommunications disruption, natural disasters, major cyber
            incidents affecting third-party infrastructure, industrial
            action, government action or other comparable events.
          </p>

          <h2>26. Changes to these Terms</h2>

          <p>
            We may update these Terms where reasonably necessary to reflect
            changes in law, services, technology, security requirements or
            business operations.
          </p>

          <p>
            We will publish the updated Terms and revise the Last updated
            date.
          </p>

          <p>
            Where a change materially affects an existing paid service, we
            will seek to provide reasonable notice where required or
            appropriate.
          </p>

          <h2>27. Transfer of rights</h2>

          <p>
            You may not transfer your contractual rights or obligations
            without our consent where doing so would materially affect the
            service or our legal position.
          </p>

          <p>
            RPG Excellence may transfer its rights or obligations as part of
            a genuine corporate restructuring, sale or transfer of the
            relevant business, provided that doing so does not materially
            reduce applicable customer rights.
          </p>

          <h2>28. Severability</h2>

          <p>
            If a provision of these Terms is found to be invalid or
            unenforceable, the remaining provisions will continue to apply
            to the extent permitted by law.
          </p>

          <h2>29. Waiver</h2>

          <p>
            A delay or failure to enforce a right does not automatically
            waive that right.
          </p>

          <h2>30. Entire agreement</h2>

          <p>
            For business customers, these Terms together with the relevant
            order, subscription details, proposal, statement of work and any
            expressly incorporated policies form the agreement relating to
            the relevant service.
          </p>

          <p>
            Nothing in this provision limits liability for fraud or
            fraudulent misrepresentation or overrides rights that cannot
            lawfully be excluded.
          </p>

          <h2>31. Governing law and jurisdiction</h2>

          <p>
            Unless a separate written agreement states otherwise, these
            Terms are governed by the laws of England and Wales.
          </p>

          <p>
            For business customers, the courts of England and Wales will
            have jurisdiction over disputes arising from these Terms, subject
            to any different jurisdiction expressly agreed in writing.
          </p>

          <p>
            If you are a consumer, any mandatory rights you have to bring
            proceedings in another competent court remain unaffected.
          </p>

          <h2>32. Contact</h2>

          <p>
            Questions about these Terms, subscriptions or RPG Excellence
            services can be sent to:
          </p>

          <p>
            <strong>RPG Excellence</strong>
            <br />
            Email:{" "}
            <a href="mailto:info@rpgexcellence.com">
              info@rpgexcellence.com
            </a>
          </p>
        </div>
      </main>
    </PageShell>
  );
}
