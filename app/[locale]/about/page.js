import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import { locales } from "../../../lib/i18n";

export const metadata = {
  title: "About RPG Excellence | Practitioner-led Digital Assurance",
  description:
    "Meet RPG Excellence: a practitioner-led digital assurance business built around evidence, accountability, connected improvement and honest professional boundaries.",
  alternates: { canonical: "/en/about" },
};

const values = [
  [
    "01",
    "Evidence before assertion",
    "Decisions should be traceable to requirements, observed conditions and controlled records—not confidence alone.",
  ],
  [
    "02",
    "Accountability by design",
    "Important work needs a named owner, a clear deadline, an evidence expectation and visible verification.",
  ],
  [
    "03",
    "Practical over performative",
    "Management systems should improve real work. We design for the people who assess, operate, lead and act.",
  ],
  [
    "04",
    "Connected improvement",
    "Audits, risks, findings, CAPA, competence and management review should reinforce one another instead of creating silos.",
  ],
  [
    "05",
    "Honest boundaries",
    "Technology supports professional judgement; it does not issue accredited certification or replace competent advice.",
  ],
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
            <span className="eyebrow">ABOUT RPG EXCELLENCE</span>

            <h1>Assurance should help people make better decisions.</h1>

            <p>
              RPG Excellence is a practitioner-led digital assurance business.
              We turn management-system requirements, operational evidence and
              improvement work into clear, controlled journeys that leaders and
              auditors can trust.
            </p>

            <div className="heroActions">
              <Link href="/portal">Explore the platform →</Link>

              <Link href={`/${locale}/contact`}>
                Talk to RPG Excellence
              </Link>
            </div>
          </div>
        </section>

        <section className="intro">
          <div>
            <span className="eyebrow">WHO WE ARE</span>

            <h2>
              Built from management-system practice—not adapted from generic
              task software.
            </h2>
          </div>

          <div className="introCopy">
            <p>
              RPG Excellence was created around a simple problem:
              organisations often hold the right information, but it is
              dispersed across spreadsheets, reports, inboxes and disconnected
              tools. That makes ownership harder to see and improvement harder
              to verify.
            </p>

            <p>
              Our platform connects ISO readiness, health and safety, business
              continuity, information security, internal audit, findings and
              CAPA–8D. The aim is not more administration. It is stronger
              control, clearer decisions and a defensible evidence trail.
            </p>
          </div>
        </section>

        <section className="purposeBand">
          <div>
            <span>OUR PURPOSE</span>

            <strong>
              Make credible assurance more practical, connected and useful.
            </strong>
          </div>

          <div>
            <span>OUR PROMISE</span>

            <strong>
              Keep people accountable for judgement while technology organises
              the evidence.
            </strong>
          </div>
        </section>

        <section className="values">
          <header>
            <span className="eyebrow">WHAT WE VALUE</span>

            <h2>The principles behind every RPG workflow.</h2>

            <p>
              These values shape how assessments are structured, how actions
              are controlled and how completion is demonstrated.
            </p>
          </header>

          <div className="valueGrid">
            {values.map(([number, title, body]) => (
              <article key={number}>
                <b>{number}</b>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="approach">
          <div className="approachLead">
            <span className="eyebrow">HOW WE WORK</span>

            <h2>
              Structured enough for audit. Practical enough for operations.
            </h2>

            <p>
              Every workflow is designed to retain the context behind a
              decision, not just its final status.
            </p>
          </div>

          <div className="approachSteps">
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

        <section className="boundary">
          <div>
            <span className="eyebrow">OUR PROFESSIONAL BOUNDARY</span>

            <h2>
              Decision support—not a substitute for competent judgement.
            </h2>
          </div>

          <p>
            RPG Excellence helps users structure assessment, evidence, risk and
            improvement. It does not issue accredited certification and does
            not replace legal, technical, security or certification advice.
            Final decisions remain with appropriately authorised and competent
            people.
          </p>
        </section>

        <section className="aboutCta">
          <div>
            <span className="eyebrow">
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

.eyebrow {
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

.heroActions {
  display: flex;
  gap: 12px;
  margin-top: 30px;
}

.heroActions a,
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

.heroActions a:first-child,
.aboutCta .primary {
  border-color: #2f64ed;
  background: #2f64ed;
}

.intro,
.approach,
.boundary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 70px;
  padding: 78px 5vw;
}

.intro h2,
.values h2,
.approach h2,
.boundary h2,
.aboutCta h2 {
  margin: 13px 0;
  font-size: clamp(35px, 4vw, 57px);
  line-height: 1.06;
  letter-spacing: -0.045em;
}

.intro .eyebrow,
.values .eyebrow,
.approach .eyebrow,
.boundary .eyebrow,
.aboutCta .eyebrow {
  color: #235fdf;
}

.introCopy p,
.approach p,
.boundary p,
.values header > p {
  color: #526b84;
  font-size: 17px;
  line-height: 1.75;
}

.purposeBand {
  display: grid;
  grid-template-columns: 1fr 1fr;
  margin: 0 5vw;
  overflow: hidden;
  border-radius: 20px;
  background: #082c55;
  color: #fff;
}

.purposeBand > div {
  padding: 42px;
}

.purposeBand > div + div {
  border-left: 1px solid #ffffff25;
  background: #0c3766;
}

.purposeBand span,
.purposeBand strong {
  display: block;
}

.purposeBand span {
  color: #57ddd2;
  font-size: 10px;
  font-weight: 950;
  letter-spacing: 0.18em;
}

.purposeBand strong {
  margin-top: 13px;
  font-size: 25px;
  line-height: 1.35;
}

.values {
  padding: 82px 5vw;
}

.values header {
  max-width: 850px;
}

.valueGrid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-top: 32px;
}

.valueGrid article {
  min-height: 270px;
  padding: 25px;
  border: 1px solid #d4e1ed;
  border-radius: 15px;
  background: #fff;
}

.valueGrid b {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #e9f0ff;
  color: #235fdf;
}

.valueGrid h3 {
  margin: 28px 0 11px;
  font-size: 20px;
}

.valueGrid p {
  color: #5c7187;
  font-size: 14px;
  line-height: 1.6;
}

.approach {
  background: #fff;
}

.approachLead {
  max-width: 650px;
}

.approachSteps {
  display: grid;
  gap: 12px;
}

.approachSteps article {
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 17px;
  padding: 22px;
  border: 1px solid #d7e3ee;
  border-radius: 14px;
}

.approachSteps article > span {
  display: grid;
  place-items: center;
  height: 42px;
  border-radius: 10px;
  background: #082c55;
  color: #5ce0d3;
  font-weight: 950;
}

.approachSteps h3 {
  margin: 0 0 6px;
}

.approachSteps p {
  margin: 0;
  font-size: 14px;
}

.boundary {
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
  .valueGrid {
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

  .heroActions,
  .aboutCta {
    display: grid;
  }

  .intro,
  .approach,
  .boundary {
    grid-template-columns: 1fr;
    gap: 25px;
    padding: 52px 20px;
  }

  .purposeBand {
    grid-template-columns: 1fr;
    margin: 0 20px;
  }

  .purposeBand > div + div {
    border-top: 1px solid #ffffff25;
    border-left: 0;
  }

  .values {
    padding: 60px 20px;
  }

  .valueGrid {
    grid-template-columns: 1fr;
  }

  .valueGrid article {
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
