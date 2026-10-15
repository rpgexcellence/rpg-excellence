import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import { locales } from "../../../lib/i18n";

export const metadata = {
  title: "About RPG Excellence | Practitioner-led Digital Assurance",
  description:
    "Practical management-system experience, digital tools, training and publications to help organisations understand requirements and put them into practice.",
  alternates: { canonical: "/en/about" },
};

const values = [
  [
    "01",
    "Practicality",
    "Tools and guidance should make everyday work easier and support effective management."
  ],
  [
    "02",
    "Evidence",
    "Conclusions should be supported by information that people can review and trust."
  ],
  [
    "03",
    "Accountability",
    "Responsibilities, decisions and actions should have clear ownership."
  ],
  [
    "04",
    "Clarity",
    "We explain complex requirements in language people can understand and apply."
  ],
  [
    "05",
    "Improvement",
    "Completing an assessment or closing an action should lead to a meaningful result."
  ]
];

const principles = [
  [
    "Understand",
    "Start with context, obligations, scope and the work as it is actually performed.",
  ],
  [
    "Connect",
    "Link evidence, risks, people, findings and actions so leaders can see cause and consequence.",
  ],
  [
    "Verify",
    "Close the loop only when implementation and effectiveness have been demonstrated.",
  ],
];

export default async function About({ params }) {
  const { locale } = await params;

  if (!locales.includes(locale)) {
    notFound();
  }

  return (
    <PageShell locale={locale}>
      <main className="aboutRpg">
        <style>{styles}</style>

        <section className="aboutHero">
          <img
            src="/images/about/rpg-assurance-team-1280.png"
            alt="Assurance leaders reviewing connected operational evidence"
          />

          <div className="aboutHeroShade" />

          <div className="aboutHeroCopy">
            <span className="aboutEyebrow">ABOUT RPG EXCELLENCE</span>

            <h1>About RPG Excellence</h1>

            <p>RPG Excellence brings practical management-system experience into digital tools, training and publications that help organisations understand requirements and put them into practice.</p>

            <div className="aboutHeroActions">
              <Link href={`/${locale}/ai-tools`}>Explore the platform →</Link>

              <Link href={`/${locale}/contact`}>
                Talk to RPG Excellence
              </Link>
            </div>
          </div>
        </section>

        <section className="aboutIntro">
          <div>
            <span className="aboutEyebrow">WHO WE ARE</span>

            <h2>
              Built on practical experience in quality, safety and management systems.
            </h2>
          </div>

          <div className="aboutIntroCopy">
            <p>We created RPG around a familiar challenge: assessments, risks, audits and corrective actions often sit in separate spreadsheets and reports. Information is available, but understanding what needs attention, who owns it and whether it has been resolved takes too much effort.</p>
            <p>Our platform, RPG Intelligence, connects these activities so that requirements lead to evidence, findings lead to action, and improvement can be verified. Alongside the platform, our practitioner guides and training help people develop the knowledge and confidence to make sound decisions.</p>
          </div>
        </section>

        <section className="aboutPurposeBand">
          <div>
            <span>OUR PURPOSE</span>

            <strong>
              Help organisations understand requirements and put them into practice.
            </strong>
          </div>

          <div>
            <span>OUR PROMISE</span>

            <strong>
              Support sound decisions with clear responsibilities and evidence people can trust.
            </strong>
          </div>
        </section>

        <section className="aboutValues">
          <header>
            <span className="aboutEyebrow">WHAT WE VALUE</span>

            <h2>What matters to us</h2>

            <p>
              These values shape how assessments are structured, how actions
              are controlled and how completion is demonstrated.
            </p>
          </header>

          <div className="aboutValueGrid">
            {values.map(([number, title, body]) => (
              <article key={number}>
                <b>{number}</b>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="aboutApproach">
          <div className="aboutApproachLead">
            <span className="aboutEyebrow">HOW WE WORK</span>

            <h2>
              Structured enough for audit. Practical enough for operations.
            </h2>

            <p>
              Every workflow is designed to retain the context behind a
              decision, not just its final status.
            </p>
          </div>

          <div className="aboutApproachSteps">
            {principles.map(([title, body], index) => (
              <article key={title}>
                <span>0{index + 1}</span>

                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="aboutBoundary">
          <div><span className="aboutEyebrow">PEOPLE AND TECHNOLOGY</span><h2>Professional judgement remains with people.</h2></div>
          <p>Technology supports this work. Professional judgement and responsibility remain with the people making the decisions.</p>
        </section>

        <section className="aboutCta">
          <div>
            <span className="aboutEyebrow">
              START WHERE THE NEED IS CLEAREST
            </span>

            <h2>
              One assessment, one operational hub—or one connected assurance
              system.
            </h2>
          </div>

          <div>
            <Link
              className="primary"
              href="/portal/login?mode=create"
            >
              Create free account →
            </Link>

            <Link href={`/${locale}/contact`}>
              Discuss your requirements
            </Link>
          </div>
        </section>
      </main>
    </PageShell>
  );
}

const styles = `
.aboutRpg {
  background: #f4f8fc;
  color: #071d3a;
}

.aboutEyebrow {
  display: block;
  color: #47dfd0;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.18em;
}

.aboutHero {
  position: relative;
  min-height: 650px;
  display: flex;
  align-items: center;
  overflow: hidden;
  background: #061a35;
}

.aboutHero > img,
.aboutHeroShade {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.aboutHeroShade {
  background: linear-gradient(
    90deg,
    #04172f 0%,
    #051b35e8 35%,
    #051b3570 67%,
    #04172f1a
  );
}

.aboutHeroCopy {
  position: relative;
  z-index: 1;
  width: min(760px, 62vw);
  padding: 84px 5vw;
  color: #fff;
}

.aboutHeroCopy h1 {
  margin: 17px 0 24px;
  font-size: clamp(48px, 6vw, 82px);
  line-height: 0.98;
  letter-spacing: -0.055em;
}

.aboutHeroCopy p {
  max-width: 670px;
  color: #d4e2ee;
  font-size: 19px;
  line-height: 1.65;
}

.aboutHeroActions {
  display: flex;
  gap: 12px;
  margin-top: 30px;
}

.aboutHeroActions a,
.aboutCta a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 50px;
  padding: 0 20px;
  border: 1px solid #8ba2bb;
  border-radius: 9px;
  color: #fff;
  text-decoration: none;
  font-weight: 900;
}

.aboutHeroActions a:first-child,
.aboutCta .primary {
  border-color: #2f64ed;
  background: #2f64ed;
}

.aboutIntro,
.aboutApproach,
.aboutBoundary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 70px;
  padding: 78px 5vw;
}

.aboutIntro h2,
.aboutValues h2,
.aboutApproach h2,
.aboutBoundary h2,
.aboutCta h2 {
  margin: 13px 0;
  font-size: clamp(35px, 4vw, 57px);
  line-height: 1.06;
  letter-spacing: -0.045em;
}

.aboutIntro .aboutEyebrow,
.aboutValues .aboutEyebrow,
.aboutApproach .aboutEyebrow,
.aboutBoundary .aboutEyebrow,
.aboutCta .aboutEyebrow {
  color: #235fdf;
}

.aboutIntroCopy p,
.aboutApproach p,
.aboutBoundary p,
.aboutValues header > p {
  color: #526b84;
  font-size: 17px;
  line-height: 1.75;
}

.aboutPurposeBand {
  display: grid;
  grid-template-columns: 1fr 1fr;
  margin: 0 5vw;
  overflow: hidden;
  border-radius: 20px;
  background: #082c55;
  color: #fff;
}

.aboutPurposeBand > div {
  padding: 42px;
}

.aboutPurposeBand > div + div {
  border-left: 1px solid #ffffff25;
  background: #0c3766;
}

.aboutPurposeBand span,
.aboutPurposeBand strong {
  display: block;
}

.aboutPurposeBand span {
  color: #57ddd2;
  font-size: 10px;
  font-weight: 950;
  letter-spacing: 0.18em;
}

.aboutPurposeBand strong {
  margin-top: 13px;
  font-size: 25px;
  line-height: 1.35;
}

.aboutValues {
  padding: 82px 5vw;
}

.aboutValues header {
  max-width: 850px;
}

.aboutValueGrid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-top: 32px;
}

.aboutValueGrid article {
  min-height: 270px;
  padding: 25px;
  border: 1px solid #d4e1ed;
  border-radius: 15px;
  background: #fff;
}

.aboutValueGrid b {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #e9f0ff;
  color: #235fdf;
}

.aboutValueGrid h3 {
  margin: 28px 0 11px;
  font-size: 20px;
}

.aboutValueGrid p {
  color: #5c7187;
  font-size: 14px;
  line-height: 1.6;
}

.aboutApproach {
  background: #fff;
}

.aboutApproachLead {
  max-width: 650px;
}

.aboutApproachSteps {
  display: grid;
  gap: 12px;
}

.aboutApproachSteps article {
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 17px;
  padding: 22px;
  border: 1px solid #d7e3ee;
  border-radius: 14px;
}

.aboutApproachSteps article > span {
  display: grid;
  place-items: center;
  height: 42px;
  border-radius: 10px;
  background: #082c55;
  color: #5ce0d3;
  font-weight: 950;
}

.aboutApproachSteps h3 {
  margin: 0 0 6px;
}

.aboutApproachSteps p {
  margin: 0;
  font-size: 14px;
}

.aboutBoundary {
  align-items: center;
  background: #e8f0f9;
}

.aboutCta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 45px;
  margin: 60px 5vw;
  padding: 45px;
  border-radius: 20px;
  background: linear-gradient(120deg, #061d3b, #0e4074);
  color: #fff;
}

.aboutCta > div:first-child {
  max-width: 820px;
}

.aboutCta > div:last-child {
  display: grid;
  gap: 10px;
  flex-shrink: 0;
}

@media (max-width: 1080px) {
  .aboutValueGrid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 760px) {
  .aboutHero {
    min-height: 700px;
    align-items: flex-end;
  }

  .aboutHero > img {
    object-position: 66% center;
  }

  .aboutHeroShade {
    background: linear-gradient(
      0deg,
      #04172f 0%,
      #04172ff2 45%,
      #04172f40 100%
    );
  }

  .aboutHeroCopy {
    width: 100%;
    padding: 50px 20px;
  }

  .aboutHeroCopy h1 {
    font-size: 45px;
  }

  .aboutHeroActions,
  .aboutCta {
    display: grid;
  }

  .aboutIntro,
  .aboutApproach,
  .aboutBoundary {
    grid-template-columns: 1fr;
    gap: 25px;
    padding: 52px 20px;
  }

  .aboutPurposeBand {
    grid-template-columns: 1fr;
    margin: 0 20px;
  }

  .aboutPurposeBand > div + div {
    border-top: 1px solid #ffffff25;
    border-left: 0;
  }

  .aboutValues {
    padding: 60px 20px;
  }

  .aboutValueGrid {
    grid-template-columns: 1fr;
  }

  .aboutValueGrid article {
    min-height: 0;
  }

  .aboutCta {
    margin: 35px 20px;
    padding: 30px 22px;
  }

  .aboutCta a {
    width: 100%;
  }
}
`;
