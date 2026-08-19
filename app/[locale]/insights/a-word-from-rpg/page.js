import Link from "next/link";
import { notFound } from "next/navigation";

import PageShell from "../../../../components/PageShell";
import { locales } from "../../../../lib/i18n";

export const metadata = {
  title: "A Word from RPG | RPG Insights",
  description:
    "Welcome to RPG Insights. Learn why RPG Excellence created RPG Intelligence and how we aim to support better assurance, management systems and continuous improvement.",
};

export default async function WordFromRPG({
  params,
}) {
  const { locale } = await params;

  if (!locales.includes(locale)) {
    notFound();
  }

  return (
    <PageShell locale={locale}>
      <main className="simplePage">
        <div
          className="simpleInner"
          style={{
            maxWidth: "900px",
          }}
        >
          <Link
            href={`/${locale}/insights`}
            style={{
              display: "inline-block",
              marginBottom: "28px",
              color: "#1459D9",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            ← Back to RPG Insights
          </Link>

          <span className="kicker">
            RPG Insights • Issue 001
          </span>

          <h1>
            A Word from RPG
          </h1>

          <p
            style={{
              color: "#617087",
              fontSize: "20px",
              lineHeight: 1.7,
              marginBottom: "36px",
              maxWidth: "780px",
            }}
          >
            Building assurance that helps
            organisations understand where they
            are, what matters and what to do next.
          </p>

          <article
            className="assuranceCard"
            style={{
              padding: "36px",
              lineHeight: 1.8,
              fontSize: "17px",
            }}
          >
            <h2>
              Welcome to RPG Insights
            </h2>

            <p>
              Assurance, compliance and management
              systems should help organisations
              understand their business, manage risk
              and improve performance — not simply
              create more paperwork.
            </p>

            <p>
              That principle sits behind RPG
              Excellence and the development of RPG
              Intelligence.
            </p>

            <p>
              We are building practical tools that
              bring structured assessment,
              management-system knowledge and
              AI-supported workflows together in one
              place.
            </p>

            <p>
              Our aim is to make professional
              assurance more accessible while keeping
              people, judgement and evidence at the
              centre of the process.
            </p>

            <h2>
              What you can expect from RPG Insights
            </h2>

            <p>
              We will use RPG Insights to share
              practical guidance on ISO standards,
              management systems, risk, internal
              auditing and business assurance.
            </p>

            <p>
              We will also explain significant
              developments within RPG Intelligence —
              what we have introduced, why it matters
              and how customers can use it.
            </p>

            <p>
              We do not want this to become another
              inbox full of promotional messages.
              When we publish an update, there should
              be something useful to take away.
            </p>

            <h2>
              What we are building
            </h2>

            <p>
              Our immediate development programme is
              focused on strengthening RPG
              Intelligence's management-system
              assessment capability.
            </p>

            <p>
              Environmental management is one of our
              first priorities, alongside continued
              development of quality and occupational
              health and safety assessment.
            </p>

            <p>
              We are also developing practical
              workflows for dynamic risk assessment,
              laboratory competence, compliance
              assessment and AI-supported internal
              auditing.
            </p>

            <h2>
              A different approach to internal auditing
            </h2>

            <p>
              One area we are particularly focused on
              is helping organisations make internal
              auditing more structured, useful and
              easier to manage.
            </p>

            <p>
              Rather than simply producing a generic
              checklist, our aim is to create an
              interactive workflow where the customer
              can define the audit scope, processes
              and objectives before RPG Intelligence
              helps prepare the audit.
            </p>

            <p>
              That workflow is intended to support:
            </p>

            <ul>
              <li>
                audit scope, objectives and criteria
              </li>

              <li>
                tailored audit questions and
                checklists
              </li>

              <li>
                evidence and sampling prompts
              </li>

              <li>
                communications to relevant
                stakeholders
              </li>

              <li>
                audit notification and evidence
                request emails
              </li>

              <li>
                opening meeting scripts
              </li>

              <li>
                structured compliance assessment
              </li>

              <li>
                audit findings and improvement
                opportunities
              </li>

              <li>
                closing meeting preparation
              </li>

              <li>
                corrective-action and follow-up
                planning
              </li>
            </ul>

            <h2>
              Our principle for AI
            </h2>

            <p>
              AI should support professional
              judgement, not pretend to replace it.
            </p>

            <p>
              RPG Intelligence is therefore being
              developed to help people ask better
              questions, structure information,
              identify evidence, understand gaps and
              make more informed decisions.
            </p>

            <p>
              Responsibility for professional
              judgement and decisions remains with
              people.
            </p>

            <h2>
              This is only the beginning
            </h2>

            <p>
              We will continue to develop RPG
              Intelligence around practical business
              assurance, useful management-system
              information and workflows that help
              customers turn requirements into
              action.
            </p>

            <p>
              RPG Insights will be where we share
              important standards developments,
              practical guidance and meaningful
              product updates as that work continues.
            </p>

            <p>
              Thank you for joining us at the
              beginning of the journey.
            </p>

            <div
              style={{
                marginTop: "38px",
                paddingTop: "24px",
                borderTop:
                  "1px solid #dfe6ee",
              }}
            >
              <strong>
                RPG Excellence Ltd
              </strong>

              <p
                style={{
                  marginTop: "6px",
                  marginBottom: 0,
                  color: "#617087",
                }}
              >
                Business Assurance • Practical
                Intelligence • Continuous Improvement
              </p>
            </div>
          </article>

          <div
            style={{
              marginTop: "32px",
            }}
          >
            <Link
              href={`/${locale}/insights`}
              className="button buttonGhost"
            >
              More RPG Insights
            </Link>
          </div>
        </div>
      </main>
    </PageShell>
  );
}
