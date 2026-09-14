import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import { locales } from "../../../lib/i18n";

export const metadata = {
  title: "RPG Insights",
  description:
    "Practical ISO guidance, standards updates, RPG Intelligence releases and business assurance insights from RPG Excellence.",
};

export default async function InsightsPage({ params }) {
  const { locale } = await params;

  if (!locales.includes(locale)) {
    notFound();
  }

  const issues = [
    {
      number: "017",
      title: "ISO 22301: Turning Business Continuity Plans into Demonstrated Capability",
      description: "RPG Intelligence now provides a complete evidence-led ISO 22301:2019 gap assessment covering BIA, disruption risk, continuity strategy, response, recovery, exercises and improvement.",
      href: "iso-22301-business-continuity-readiness",
    },
    {
      number: "016",
      title: "Management of Change: Approval Is Not the Finish Line",
      description: "How controlled MOC connects screening, risk review, approvals, PSSR, implementation evidence and post-change verification.",
      href: "management-of-change-assurance",
    },
    {
      number: "015",
      title: "Permit to Work: Authority Within Controlled Limits",
      description: "Why a Permit to Work must connect scope, hazards, isolations, competence, validity, suspension and controlled close-out.",
      href: "permit-to-work-control",
    },
    {
      number: "014",
      title: "POWRA: The Last Risk Decision Before Work Starts",
      description: "How a point-of-work risk assessment tests real conditions, triggers stop-work decisions and captures end-of-job learning.",
      href: "powra-point-of-work",
    },
    {
      number: "013",
      title:
        "ISO/IEC 27001 Readiness: Connecting Gap Analysis and the Statement of Applicability",
      description:
        "How an evidence-led ISO/IEC 27001 gap analysis and controlled Statement of Applicability support distinct but connected ISMS readiness decisions.",
      href: "iso-27001-gap-analysis-soa",
    },
    {
      number: "012",
      title:
        "Building Risk-Assessment Competence Through Practical Decisions",
      description:
        "Why practical scenarios, structured interaction, feedback and retained evidence add more value to risk-assessment training than passive slide completion.",
      href: "risk-assessment-training",
    },
    {
      number: "011",
      title:
        "Using a 5×5 Risk Heat Map Without Losing Professional Judgement",
      description:
        "How likelihood, credible severity, action thresholds and evidence-based rationale turn a 5×5 risk heat map into a practical management tool.",
      href: "interactive-risk-heat-map",
    },
    {
      number: "010",
      title:
        "What a Suitable and Sufficient Risk Assessment Should Show",
      description:
        "Practical guidance on connecting hazards, exposure, credible harm, people at risk, controls, actions and review in one traceable decision record.",
      href: "controlled-risk-assessment",
    },
    {
      number: "009",
      title:
        "From Safety Records to Controlled Action: The Health & Safety Hub",
      description:
        "How connected risk assessments, actions, reviews, competence and management visibility create stronger workplace assurance.",
      href: "health-safety-hub",
    },
    {
      number: "008",
      title:
        "From Audit Schedule to Accountable Closure: The RPG Intelligence Internal Audit Module",
      description:
        "A governed ISO 19011-aligned workspace connecting audit mandate, competence, risk-based planning, objective evidence, findings, CAPA follow-up and controlled closure.",
      href: "internal-audit-module",
    },
    {
      number: "007",
      title:
        "From Root Cause to Organisational Insight: Structured D4 Profiling",
      description:
        "How RPG Intelligence combines legacy RCA coding, evidence-led profiling and human validation to produce consistent causal data without forcing unsupported escape or systemic causes.",
      href: "structured-rca-profiling",
    },
    {
      number: "006",
      title:
        "RPG Intelligence Releases ISO/IEC 17024:2026 Readiness Assessment",
      description:
        "A structured, evidence-led assessment for organisations operating certification of persons, combining clause conformity, management readiness, findings, action planning and executive reporting.",
      href: "iso-17024-readiness",
    },
    {
      number: "005",
      title:
        "Introducing the RPG Intelligence CAPA–8D Module",
      description:
        "An evidence-led investigation workspace for root-cause validation, controlled corrective action, effectiveness review and accountable D0–D8 gate approval.",
      href: "capa-8d-release",
    },
    {
      number: "004",
      title:
        "ISO 45001:2018 — From Safety Compliance to Evidence-Led OH&S Assurance",
      description:
        "How RPG Intelligence connects OH&S conformity, worker participation, hazard and risk management, evidence sampling, findings, management action and certification-readiness decision support.",
      href: "iso-45001-readiness",
    },
    {
      number: "003",
      title:
        "ISO 14001:2026 — Environmental Management Moves from Compliance to Business Assurance",
      description:
        "How RPG Intelligence brings environmental conformity, evidence assurance, compliance obligations, findings, management action and management readiness together in one structured assessment workflow.",
      href: "iso-14001-readiness",
    },
    {
      number: "002",
      title: "ISO 9001 Moves Beyond the Checklist",
      description:
        "RPG Intelligence supports ISO 9001:2015/Amd 1:2024 as a complete evidence-led business assurance and certification-readiness assessment.",
      href: "iso-9001-readiness",
    },
    {
      number: "001",
      title: "A Word from RPG",
      description:
        "Why RPG Excellence exists, what RPG Intelligence is being built to do, and how we intend to support organisations with practical assurance, management systems and responsible AI.",
      href: "a-word-from-rpg",
    },
  ];

  return (
    <PageShell locale={locale}>
      <main className="simplePage">
        <div className="simpleInner">
          <span className="kicker">RPG Insights</span>

          <h1>
            Practical guidance for better assurance,
            compliance and management systems.
          </h1>

          <p
            style={{
              maxWidth: "760px",
              color: "#617087",
              fontSize: "18px",
              lineHeight: 1.6,
              marginBottom: "36px",
            }}
          >
            RPG Insights shares practical ISO guidance,
            standards developments, RPG Intelligence
            updates and business assurance thinking from
            RPG Excellence.
          </p>

          <section style={{ display: "grid", gap: "20px" }}>
            {issues.map((issue) => (
              <article
                key={issue.number}
                className="assuranceCard"
                style={{ padding: "28px" }}
              >
                <span className="kicker">
                  Issue {issue.number}
                </span>

                <h2
                  style={{
                    marginTop: "10px",
                    marginBottom: "12px",
                  }}
                >
                  {issue.title}
                </h2>

                <p
                  style={{
                    color: "#617087",
                    lineHeight: 1.6,
                    marginBottom: "20px",
                  }}
                >
                  {issue.description}
                </p>

                <Link
                  className="button"
                  href={`/${locale}/insights/${issue.href}`}
                >
                  Read Issue {issue.number}
                </Link>
              </article>
            ))}
          </section>
        </div>
      </main>
    </PageShell>
  );
}
