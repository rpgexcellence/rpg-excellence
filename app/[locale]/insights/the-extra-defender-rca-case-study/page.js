import Link from "next/link";
import { notFound } from "next/navigation";

import JsonLd from "../../../../components/JsonLd";
import PageShell from "../../../../components/PageShell";
import { locales } from "../../../../lib/i18n";

const slug = "the-extra-defender-rca-case-study";
const title = "The Extra Defender: A Root Cause Analysis Case Study";
const description =
  "A hypothetical football scenario illustrates how to distinguish a nonconformity from its causes, contain immediate risk, test corrective actions and verify effectiveness.";
const url = `https://www.rpgexcellence.com/en/insights/${slug}`;
const image = "/insights/stop-the-pass-rca-case-study.png";

export const metadata = {
  title: `${title} | RPG Insights`,
  description,
  alternates: { canonical: `/en/insights/${slug}` },
  openGraph: {
    title,
    description,
    url,
    type: "article",
    images: [{ url: image, alt: "Stop the pass: a football root cause analysis case study" }],
  },
};

export default async function ExtraDefenderCaseStudy({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();

  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    image: `https://www.rpgexcellence.com${image}`,
    datePublished: "2026-10-03",
    dateModified: "2026-10-03",
    mainEntityOfPage: url,
    author: { "@id": "https://www.rpgexcellence.com/#organization" },
    publisher: { "@id": "https://www.rpgexcellence.com/#organization" },
  };

  return (
    <PageShell locale={locale}>
      <JsonLd data={schema} />
      <main className="simplePage">
        <div className="simpleInner" style={{ maxWidth: "900px" }}>
          <Link href={`/${locale}/insights`} className="caseBack">
            ← Back to RPG Insights
          </Link>
          <span className="kicker">RPG Insights • Issue 021 • Case study</span>
          <h1>{title}</h1>
          <p className="caseLead">
            When a problem appears in one place, the condition creating it may
            be elsewhere. A football sketch makes that distinction visible.
          </p>

          <figure className="caseFigure">
            <img
              src={image}
              alt="Diagram showing a pass from the right into a crowded penalty area, with the headline Stop the Pass"
              width="1254"
              height="1254"
            />
            <figcaption>
              A conceptual illustration of the passing route. The match and
              tactical decisions described below are hypothetical.
            </figcaption>
          </figure>

          <article className="assuranceCard caseBody">
            <h2>The scenario</h2>
            <p>
              In a hypothetical World Cup semi-final, England face Argentina.
              Argentina repeatedly find a player near the penalty spot. The
              England manager sees the danger and adds another defender to
              protect that area.
            </p>
            <p>
              It is an understandable response. There is more cover where the
              chance appears. But the sketch also shows Messi with time on the
              ball and a clear route to pass into that space. If that route
              remains open, the defending side may keep facing the same problem.
            </p>
            <p>
              This is a teaching scenario, not an account of an actual match or
              an allegation about a real manager&apos;s decision.
            </p>

            <h2>1. Define the nonconformity before explaining it</h2>
            <p>
              The observed problem is that Argentina repeatedly receive passes
              in a dangerous position near the penalty spot and create scoring
              chances. A useful problem statement would record the frequency,
              timing, position, pattern of play and consequences. It would not
              begin with “too few defenders” because that is already a proposed
              explanation.
            </p>
            <p>
              In a management system, the same discipline matters. “A required
              inspection was missed on three jobs in September” can be tested.
              “Staff need more training” is a conclusion that still needs
              evidence.
            </p>

            <h2>2. Contain the immediate danger</h2>
            <p>
              Adding a defender may be the right short-term move. It can reduce
              space, cover the receiver and protect against the next chance.
              Containment buys time and reduces exposure while the team studies
              why the route is repeatedly available.
            </p>
            <p>
              A temporary second check, closer supervision or a hold on
              affected work can serve the same purpose after a workplace
              nonconformity. Record the containment action and its owner, but
              keep the investigation open.
            </p>

            <h2>3. Follow the move backwards</h2>
            <p>
              The passing lane is a plausible causal route, not a proven root
              cause from one picture. Review several attacks. Was Messi
              consistently unchallenged? Was the lane open because of team
              shape, a missed assignment or a tactical instruction? Was the
              runner tracked? Did the extra defender change the outcome?
            </p>
            <p>
              Video, player positioning and repeated patterns would test these
              hypotheses. Interviews can clarify intended responsibilities.
              Evidence might reveal more than one contributing condition; it
              might also disprove the first theory. Avoid settling on “the
              defender failed” if the defensive plan made the pass easy to
              repeat.
            </p>

            <h2>4. Match corrective action to the validated cause</h2>
            <p>
              If the review confirms that the passer had time and an open lane,
              a corrective plan could assign responsibility to press earlier,
              close that lane and track the receiver. The team should practise
              the revised shape and make the decision rules clear. Extra cover
              in the box can remain until the new approach is working.
            </p>
            <p>
              Each action needs a clear link to an evidenced cause, an owner and
              a completion date. “Remind the players to defend better” gives
              little indication of what will change during the next attack.
            </p>

            <h2>5. Verify that the route has closed</h2>
            <p>
              The test is the next sequence of attacks. Does the passer face
              pressure? Is the lane closed? How often does the receiver still
              get the ball in the same position? A single blocked pass is not
              enough to demonstrate sustained effectiveness.
            </p>
            <p>
              In CAPA, define the review period, sample and success criteria
              before closing the action. If the same pattern recurs, reassess
              the cause and reopen the corrective work. Completion of a task
              shows implementation; changed results show effectiveness.
            </p>

            <aside className="caseLesson">
              <strong>The management lesson</strong>
              <p>
                The location of a failure tells you where to start looking.
                Trace the sequence that produced it, validate the cause, and
                test whether your action interrupts that sequence.
              </p>
            </aside>

            <h2>What this looks like at work</h2>
            <p>
              Consider recurring overdue supplier approvals. Another reminder
              may help today. If requests enter the process without a named
              owner or sufficient information, reminders will not resolve the
              recurring delay. Or consider a missed inspection: adding a
              signature box may catch an omission, while the investigation may
              show that the inspection trigger is absent from the work plan.
            </p>
            <p>
              The precise cause varies. The method stays the same: describe
              what happened, contain exposure, test causal explanations, make
              a targeted change and review later results.
            </p>

            <h2>How RPG Excellence helps</h2>
            <p>
              RPG Intelligence&apos;s CAPA–8D workspace connects the problem
              statement, containment, evidence-led root cause analysis,
              corrective actions and effectiveness verification in one
              controlled record. It helps teams keep the reasoning visible
              from the first finding through to closure.
            </p>
            <div className="caseActions">
              <Link href="/portal/rca" className="button">
                Explore CAPA–8D
              </Link>
              <Link
                href={`/${locale}/insights/structured-rca-profiling`}
                className="button buttonGhost"
              >
                Read about structured RCA
              </Link>
            </div>
            <p className="caseEnd">Sometimes you need the extra defender. You also need to stop the pass.</p>
          </article>
        </div>
      </main>
      <style>{`
        .caseBack{display:inline-block;margin-bottom:28px;color:#1459d9;text-decoration:none;font-weight:700}
        .caseLead{max-width:780px;color:#50647d;font-size:21px;line-height:1.65;margin:20px 0 28px}
        .caseFigure{max-width:720px;margin:0 auto 38px}
        .caseFigure img{display:block;width:100%;height:auto;border-radius:18px;box-shadow:0 18px 42px #071a3d24}
        .caseFigure figcaption{color:#617087;font-size:13px;line-height:1.5;margin-top:10px;text-align:center}
        .caseBody{padding:clamp(22px,4vw,42px);font-size:17px;line-height:1.8;color:#334c68}
        .caseBody h2{color:#09254b;font-size:clamp(24px,3vw,31px);line-height:1.2;margin:38px 0 14px}
        .caseBody h2:first-child{margin-top:0}
        .caseBody p{margin:0 0 18px}
        .caseLesson{margin:38px 0;padding:25px;border-left:5px solid #ef2b84;border-radius:12px;background:#eef5fd}
        .caseLesson strong{display:block;color:#09254b;font-size:19px;margin-bottom:8px}
        .caseLesson p{margin:0}
        .caseActions{display:flex;flex-wrap:wrap;gap:12px;margin:28px 0}
        .caseEnd{font-size:21px;font-weight:800;color:#09254b;margin-top:35px!important}
      `}</style>
    </PageShell>
  );
}
