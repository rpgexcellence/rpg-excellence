import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import { locales } from "../../../lib/i18n";

export const metadata = {
  title: "FAQ | RPG Excellence",
  description:
    "Frequently asked questions about RPG Excellence, RPG Intelligence, assessments, AI-assisted tools, privacy and support.",
};

const faqs = [
  {
    question: "What is RPG Excellence?",
    answer:
      "RPG Excellence provides management-system, business-assurance, risk, compliance and organisational-readiness services and digital tools.",
  },
  {
    question: "What is RPG Intelligence?",
    answer:
      "RPG Intelligence is RPG Excellence's digital assessment and decision-support platform. It supports structured assessments, evidence recording, findings, corrective actions, management action planning, readiness scoring and related assurance workflows.",
  },
  {
    question: "Does RPG Intelligence provide ISO certification?",
    answer:
      "No. RPG Intelligence supports assessment and certification-readiness activities, but it does not itself issue accredited ISO certification. Certification decisions remain the responsibility of the relevant accredited certification body.",
  },
  {
    question: "Does a completed assessment mean we are certification-ready?",
    answer:
      "Not necessarily. Assessment completion means the required questions have been answered. Readiness also depends on the quality of evidence, assessment scores, open findings, corrective actions, management capability, risk exposure and other readiness indicators.",
  },
  {
    question: "What standards does RPG Excellence support?",
    answer:
      "RPG Excellence is developing digital assessment and assurance support across major management-system areas including quality, environment, occupational health and safety, information security, resilience and related disciplines. Available standards and modules may change as the platform develops.",
  },
  {
    question: "How are assessment scores calculated?",
    answer:
      "Assessment scores are generated from the assessment responses and the scoring methodology configured for the relevant standard or assessment profile. Completion percentage and readiness score are separate measures.",
  },
  {
    question: "What is Management Readiness?",
    answer:
      "Management Readiness evaluates whether leadership, governance, assurance, organisational capability and management-system controls are sufficiently developed to sustain effective performance. It is assessed separately from clause conformity.",
  },
  {
    question: "What is a Certification Readiness Decision?",
    answer:
      "The Certification Readiness Decision is an RPG readiness recommendation generated from the available assessment evidence, scores, management-readiness position, open findings and action status. It is not an accredited certification decision.",
  },
  {
    question: "What is the difference between a Major NC and Minor NC?",
    answer:
      "A Major Nonconformity generally represents a significant or systemic failure that can materially affect management-system effectiveness. A Minor Nonconformity is a more limited failure that still requires correction and corrective action. The exact classification depends on the relevant assessment criteria and evidence.",
  },
  {
    question: "What happens after a finding is raised?",
    answer:
      "Findings can progress through correction, containment, root-cause analysis, corrective action, verification and effectiveness review. Significant findings can also be reflected in the Management Action Plan so that leadership can assign ownership, priorities and target dates.",
  },
  {
    question: "Can RPG Intelligence use AI?",
    answer:
      "Yes. Some features may use AI-assisted technology for drafting, analysis, summarisation, classification, recommendations or other decision-support tasks.",
  },
  {
    question: "Can I rely on AI-generated output without review?",
    answer:
      "No. AI-assisted output should be reviewed before it is relied upon for significant operational, legal, regulatory, safety, environmental, financial, certification or management decisions. Users remain responsible for professional judgement and final decisions.",
  },
  {
    question: "Does RPG Excellence guarantee certification or compliance?",
    answer:
      "No. RPG Excellence does not guarantee certification, regulatory approval, audit success, legal compliance or the absence of future incidents or nonconformities.",
  },
  {
    question: "What information should I enter into assessments?",
    answer:
      "Enter only information that is genuinely necessary for the assessment or assurance purpose. Avoid unnecessary personal, sensitive or confidential information, particularly where the same evidence can be recorded using roles, references or anonymised information.",
  },
  {
    question: "How does RPG Excellence protect personal data?",
    answer:
      "RPG Excellence applies privacy-by-design principles including data minimisation, authenticated access, access controls and appropriate technical and organisational safeguards. More detail is available in the Privacy Notice.",
  },
  {
    question: "Does RPG Excellence use cookies?",
    answer:
      "Yes. Essential technologies may be used for security, authentication and core functionality. Optional analytics technologies are controlled through the website's cookie preferences. See the Cookie Policy for more information.",
  },
  {
    question: "Which analytics services are used?",
    answer:
      "Where a visitor chooses to allow analytics, RPG Excellence may use Google Analytics and Microsoft Clarity to understand website usage and improve the service.",
  },
  {
    question: "Can I reject analytics cookies?",
    answer:
      "Yes. Analytics are optional. You can reject analytics when the cookie banner appears and you can change your choice later using the Cookie settings control.",
  },
  {
    question: "Can I change my cookie preferences later?",
    answer:
      "Yes. Use the Cookie settings control on the website to review or change your analytics preference.",
  },
  {
    question: "How do I contact RPG Excellence about privacy?",
    answer:
      "Privacy and data-protection enquiries can be sent to info@rpgexcellence.com.",
  },
  {
    question: "How do I get support?",
    answer:
      "For service, account, commercial or technical enquiries, contact RPG Excellence through the website or email info@rpgexcellence.com.",
  },
];

export default async function FAQ({ params }) {
  const { locale } = await params;

  if (!locales.includes(locale)) {
    notFound();
  }

  return (
    <PageShell locale={locale}>
      <main className="simplePage legal">
        <div className="simpleInner">
          <h1>Frequently Asked Questions</h1>

          <p>
            Answers to common questions about RPG Excellence, RPG
            Intelligence, assessments, readiness, AI-assisted tools, privacy
            and support.
          </p>

          <div
            style={{
              display: "grid",
              gap: "14px",
              marginTop: "28px",
            }}
          >
            {faqs.map((item) => (
              <details
                key={item.question}
                style={{
                  background: "#ffffff",
                  border: "1px solid #dfe6ee",
                  borderRadius: "10px",
                  padding: "16px 18px",
                }}
              >
                <summary
                  style={{
                    cursor: "pointer",
                    color: "#071A33",
                    fontWeight: 700,
                    fontSize: "17px",
                  }}
                >
                  {item.question}
                </summary>

                <p
                  style={{
                    color: "#617087",
                    lineHeight: 1.65,
                    marginBottom: 0,
                    marginTop: "12px",
                  }}
                >
                  {item.answer}
                </p>
              </details>
            ))}
          </div>

          <section style={{ marginTop: "36px" }}>
            <h2>Still have a question?</h2>

            <p>
              Contact RPG Excellence at{" "}
              <a href="mailto:info@rpgexcellence.com">
                info@rpgexcellence.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </PageShell>
  );
}
