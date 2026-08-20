import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import { locales } from "../../../lib/i18n";

export const metadata = {
  title: "Cookie Policy | RPG Excellence",
  description:
    "Information about cookies and similar technologies used by RPG Excellence.",
};

export default async function Cookies({ params }) {
  const { locale } = await params;

  if (!locales.includes(locale)) {
    notFound();
  }

  return (
    <PageShell locale={locale}>
      <main className="simplePage legal">
        <div className="simpleInner">
          <h1>Cookie Policy</h1>

          <p>
            <strong>Last updated:</strong> 20 August 2026
          </p>

          <p>
            This Cookie Policy explains how RPG Excellence uses cookies and
            similar technologies on our website and RPG Intelligence platform.
          </p>

          <p>
            It should be read together with our Privacy Notice, which explains
            how we process personal data more generally.
          </p>

          <h2>1. What are cookies?</h2>

          <p>
            Cookies are small text files that websites can store on your
            browser or device. They may be used to enable website
            functionality, maintain secure sessions, remember preferences,
            measure website performance or support other online services.
          </p>

          <p>
            Similar technologies may also store information on, or access
            information from, your device. These can include local storage,
            session storage, tracking pixels, scripts, tags and other
            storage or access technologies.
          </p>

          <p>
            UK rules do not apply only to traditional cookies. They can also
            apply to other technologies that store information on or access
            information from a user&apos;s device.
          </p>

          <h2>2. Who uses these technologies?</h2>

          <p>
            RPG Excellence operates the RPG Excellence website and the RPG
            Intelligence platform.
          </p>

          <p>
            We may use our own technologies and, where necessary, technologies
            provided by carefully selected service providers.
          </p>

          <p>
            Questions about cookies, privacy or your preferences can be sent
            to:
          </p>

          <p>
            <strong>RPG Excellence</strong>
            <br />
            Privacy contact:{" "}
            <a href="mailto:info@rpgexcellence.com">
              info@rpgexcellence.com
            </a>
          </p>

          <h2>3. Categories of cookies and similar technologies</h2>

          <p>
            The technologies used on RPG Excellence services may fall into
            the following categories.
          </p>

          <h3>Strictly necessary</h3>

          <p>
            These technologies are required for essential website or platform
            functionality.
          </p>

          <p>They may be used for purposes such as:</p>

          <ul>
            <li>user authentication and secure login;</li>
            <li>maintaining an authenticated session;</li>
            <li>security and fraud prevention;</li>
            <li>load balancing and service reliability;</li>
            <li>remembering privacy choices;</li>
            <li>
              enabling functionality specifically requested by the user; and
            </li>
            <li>protecting accounts and infrastructure.</li>
          </ul>

          <p>
            Where a technology is strictly necessary for a service requested
            by the user, consent may not be required under applicable cookie
            rules.
          </p>

          <h3>Preferences and appearance</h3>

          <p>
            These technologies may remember choices about how the website or
            platform appears or behaves, such as language, interface settings
            or other preferences.
          </p>

          <p>
            Some preference technologies may fall within an applicable legal
            exception where they are used solely to provide an appearance or
            functionality preference selected by the user.
          </p>

          <p>
            Where a preference technology falls outside an applicable
            exception, we will seek consent where required.
          </p>

          <h3>Analytics and statistical measurement</h3>

          <p>
            We may use limited analytics or statistical technologies to
            understand how our website and services perform and how they are
            used.
          </p>

          <p>
            Depending on the technology, configuration and purpose, certain
            statistical uses may be permitted without consent under an
            applicable legal exception, subject to the relevant legal
            conditions.
          </p>

          <p>
            Where an exception does not apply, analytics technologies will be
            treated as non-essential and will not be activated until the
            required consent has been obtained.
          </p>

          <p>
            Where required, users will be given a simple way to object to or
            disable statistical technologies that are operated under an
            applicable exception.
          </p>

          <h3>Marketing and advertising</h3>

          <p>
            Marketing, advertising, cross-site tracking, behavioural profiling
            or similar technologies are considered non-essential.
          </p>

          <p>
            RPG Excellence will not intentionally activate such technologies
            before obtaining valid consent where consent is legally required.
          </p>

          <h2>4. Consent and legal exceptions</h2>

          <p>
            Where a cookie or similar technology is not covered by an
            applicable legal exception, we will seek consent before storing
            information on or accessing information from your device.
          </p>

          <p>
            Consent must be freely given, specific and informed, and users
            must be able to make a genuine choice.
          </p>

          <p>
            Refusing non-essential technologies should be as straightforward
            as accepting them.
          </p>

          <p>
            Users should not be prevented from accessing core RPG Excellence
            services solely because they decline non-essential analytics or
            marketing technologies, unless a lawful and transparent service
            model expressly provides otherwise.
          </p>

          <h2>5. Cookie consent controls</h2>

          <p>
            Where consent is required, RPG Excellence may provide a cookie
            banner or preference tool that allows users to:
          </p>

          <ul>
            <li>accept applicable non-essential technologies;</li>
            <li>reject applicable non-essential technologies;</li>
            <li>review available categories;</li>
            <li>change preferences; and</li>
            <li>withdraw consent later.</li>
          </ul>

          <p>
            Essential technologies required for security, authentication or
            requested functionality cannot normally be disabled through the
            consent tool because the relevant service may not function
            correctly without them.
          </p>

          <h2>6. Remembering your cookie choice</h2>

          <p>
            We may store a privacy or consent preference on your device so
            that we do not need to ask for the same choice on every page or
            visit.
          </p>

          <p>
            This preference is used to remember whether applicable
            non-essential technologies may be activated.
          </p>

          <p>
            We may ask you to confirm your preferences again where:
          </p>

          <ul>
            <li>your stored preference expires;</li>
            <li>our use of cookies or similar technologies materially changes;</li>
            <li>we introduce a materially different purpose or third party;</li>
            <li>the law or regulatory guidance changes; or</li>
            <li>
              we otherwise need fresh consent for a particular processing
              activity.
            </li>
          </ul>

          <h2>7. RPG Intelligence authentication and security</h2>

          <p>
            RPG Intelligence may use storage or access technologies that are
            necessary to authenticate users, maintain secure sessions,
            protect accounts and prevent unauthorised access.
          </p>

          <p>
            These technologies are part of the security and operation of the
            authenticated service and may be required for the platform to
            function.
          </p>

          <p>
            Logging out, clearing browser storage or blocking necessary
            technologies may end an authenticated session or prevent parts of
            RPG Intelligence from working correctly.
          </p>

          <h2>8. Third-party technologies</h2>

          <p>
            Some functionality may depend on technology supplied by third
            parties, such as authentication, infrastructure, analytics,
            payment, communications or embedded-service providers.
          </p>

          <p>
            Where third-party technologies are used, we aim to understand
            what information they store or access, why they do so and whether
            consent or another legal condition is required.
          </p>

          <p>
            Where consent is required for a third-party technology, it should
            not be activated until the relevant consent has been obtained.
          </p>

          <p>
            Where applicable, our consent information should identify the
            relevant third party and explain the purpose for which the
            technology is used.
          </p>

          <h2>9. Current cookie inventory</h2>

          <p>
            The exact cookies and similar technologies used by RPG Excellence
            may change as services evolve.
          </p>

          <p>
            A production cookie inventory should identify, where applicable:
          </p>

          <ul>
            <li>the cookie or technology name;</li>
            <li>the provider;</li>
            <li>its purpose;</li>
            <li>its category;</li>
            <li>whether it is first-party or third-party;</li>
            <li>how long it persists;</li>
            <li>whether consent is required; and</li>
            <li>
              any relevant third-party privacy information.
            </li>
          </ul>

          <p>
            RPG Excellence intends to keep this information under review as
            the website and platform develop.
          </p>

          <h2>10. How long cookies remain</h2>

          <p>
            Some technologies are session-based and expire when the browser
            session ends. Others may remain on the device for a defined period
            so that a preference or function can be remembered.
          </p>

          <p>
            We aim to use retention periods that are proportionate to the
            purpose of the relevant technology.
          </p>

          <p>
            Technologies should not be retained indefinitely where a shorter
            period would reasonably achieve the intended purpose.
          </p>

          <h2>11. Browser controls</h2>

          <p>
            Most browsers allow users to view, block or delete cookies and
            other stored website data.
          </p>

          <p>
            Browser settings vary between providers, so you should consult
            your browser&apos;s help or privacy settings for instructions.
          </p>

          <p>
            Blocking strictly necessary cookies or browser storage may prevent
            some website or RPG Intelligence functionality from operating
            correctly.
          </p>

          <h2>12. Changing or withdrawing consent</h2>

          <p>
            Where processing relies on consent, you may withdraw that consent
            at any time.
          </p>

          <p>
            Withdrawing consent does not affect the lawfulness of processing
            carried out before consent was withdrawn.
          </p>

          <p>
            Where a cookie settings or consent control is available on the
            website, you can use that control to update your preferences.
          </p>

          <p>
            You may also contact us at{" "}
            <a href="mailto:info@rpgexcellence.com">
              info@rpgexcellence.com
            </a>{" "}
            if you have questions about how our cookie controls operate.
          </p>

          <h2>13. Personal data and cookies</h2>

          <p>
            Some cookies or similar technologies may involve the processing of
            personal data, such as IP addresses, online identifiers, account
            identifiers, device information or usage information.
          </p>

          <p>
            Where personal data is processed, our Privacy Notice also applies.
          </p>

          <h2>14. Changes to this Cookie Policy</h2>

          <p>
            We may update this Cookie Policy to reflect changes in the
            technologies we use, changes to our services, legal developments
            or regulatory guidance.
          </p>

          <p>
            The latest version will be published on this page and the
            &quot;Last updated&quot; date will be revised where appropriate.
          </p>

          <h2>15. Contact us</h2>

          <p>
            Questions about this Cookie Policy or RPG Excellence cookie
            practices can be sent to:
          </p>

          <p>
            <strong>RPG Excellence</strong>
            <br />
            Privacy contact:{" "}
            <a href="mailto:info@rpgexcellence.com">
              info@rpgexcellence.com
            </a>
          </p>
        </div>
      </main>
    </PageShell>
  );
}
