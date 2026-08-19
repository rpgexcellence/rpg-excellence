import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../../components/PageShell";
import { locales } from "../../../../lib/i18n";

export const metadata = {
  title: "RPG Insights",
  description:
    "Practical ISO guidance, standards updates, RPG Intelligence releases and business assurance insights from RPG Excellence.",
};

export default async function InsightsPage({
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
            RPG Insights
          </span>

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

          <section
            style={{
              display: "grid",
              gap: "20px",
            }}
          >
            <article
              className="assuranceCard"
              style={{
                padding: "28px",
              }}
            >
              <span className="kicker">
                Issue 001
              </span>

              <h2
                style={{
                  marginTop: "10px",
                  marginBottom: "12px",
                }}
              >
                A Word from RPG
              </h2>

              <p
                style={{
                  color: "#617087",
                  lineHeight: 1.6,
                  marginBottom: "20px",
                }}
              >
                Why RPG Excellence exists, what RPG
                Intelligence is being built to do, and
                how we intend to support organisations
                with practical assurance, management
                systems and responsible AI.
              </p>

              <Link
                className="button"
                href={`/${locale}/insights/a-word-from-rpg`}
              >
                Read Issue 001
              </Link>
            </article>
          </section>
        </div>
      </main>
    </PageShell>
  );
}
