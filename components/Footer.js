import Link from "next/link";

const faqs = [
  {
    question: "What is the Business Assurance Score?",
    answer:
      "It is a weighted readiness score generated from your assessment responses. It provides a simple management-level view of overall management system maturity and assurance.",
  },
  {
    question: "Does RPG Intelligence provide ISO certification?",
    answer:
      "No. RPG Intelligence supports assessment, readiness and improvement activities. Formal certification must be provided by an appropriately accredited certification body.",
  },
  {
    question: "Can I save an assessment and return later?",
    answer:
      "Yes. Assessment answers are saved to your account so you can continue your assessment and review your results later.",
  },
  {
    question: "Can I download the results?",
    answer:
      "Yes. Completed assessments can generate an Executive Summary and downloadable PDF report.",
  },
];

export default function Footer({ locale }) {
  return (
    <footer>
      <section
        className="section"
        style={{
          borderTop: "1px solid #e7edf3",
          marginTop: 0,
        }}
      >
        <div className="sectionHead">
          <div>
            <span className="kicker">
              Frequently Asked Questions
            </span>

            <h2>
              Before you get started.
            </h2>
          </div>

          <p>
            Key information about assessments, reports and certification.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gap: "14px",
            maxWidth: "900px",
          }}
        >
          {faqs.map((item) => (
            <div
              className="assuranceCard"
              key={item.question}
            >
              <strong>
                {item.question}
              </strong>

              <p
                style={{
                  marginBottom: 0,
                }}
              >
                {item.answer}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="footer">
        <div>
          <Link
            href={`/${locale}`}
            aria-label="RPG Excellence home"
            style={{
              display: "inline-flex",
              alignItems: "center",
              textDecoration: "none",
            }}
          >
            <img
              src="/rpg-excellence-logo.png"
              alt="RPG Excellence"
              style={{
                width: "250px",
                maxWidth: "100%",
                height: "auto",
                objectFit: "contain",
                display: "block",
              }}
            />
          </Link>
        </div>

        <div className="footerLinks">
          <Link href={`/${locale}/insights`}>
            RPG Insights
          </Link>

          <Link href={`/${locale}/terms`}>
            Terms
          </Link>

          <Link href={`/${locale}/privacy`}>
            Privacy
          </Link>

          <Link href={`/${locale}/cookies`}>
            Cookies
          </Link>
        </div>

        <small>
          © {new Date().getFullYear()} RPG Excellence. All rights reserved.
        </small>
      </div>
    </footer>
  );
}
