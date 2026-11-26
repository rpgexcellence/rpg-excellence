import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../components/PageShell";
import { locales } from "../../../lib/i18n";
import styles from "./guide.module.css";

export const metadata = {
  title: "ISO 19011:2026 at a Glance | RPG Excellence",
  description: "A practitioner’s guide to ISO 19011:2026. Understand the fourth edition, risk-based audit programmes, objective evidence, auditor competence and practical next steps.",
  alternates: { canonical: "/en/iso-19011" },
};

const sources = [
  ["ISO catalogue and preview", "https://www.iso.org/standard/19011"],
  ["ISO/TC 176 release announcement", "https://committee.iso.org/sites/tc176/home/news/content-left-area/news-and-updates/iso-19011-2026-released.html"],
  ["BSI UK edition", "https://doi.org/10.3403/30490401"],
  ["CQI and IRCA briefing", "https://knowledge.quality.org/article/revision-iso-19011-what-you-need-know"],
];

const clauses = [
  ["4", "Apply the audit principles", "Act with integrity and due professional care. Report fairly, protect confidential information and safeguard independence. Draw conclusions from verifiable evidence and focus effort where risk matters most.",
    "Record conflicts, sample boundaries and any limits on conclusions."],
  ["5", "Manage the audit programme", "Set programme objectives and use process risk, change, performance and previous findings to decide coverage and frequency. Assign resources and review how well the programme meets its objectives.",
    "Keep a risk-based schedule, named responsibilities and a record of changes to coverage."],
  ["6", "Conduct individual audits", "Agree the objective, scope, criteria and methods. Follow the process, corroborate records with interviews or observation, explain limitations and report findings against the criteria. Verify action and effectiveness where follow-up is agreed.",
    "Retain the plan, evidence trail, findings and follow-up decisions."],
  ["7", "Evaluate auditor competence", "Define the knowledge, skills and behaviour each assignment needs. Evaluate the team’s combined capability using methods such as witnessed audits, interviews and review of audit outputs. Use the results to guide assignments and development.",
    "Use a competence matrix supported by evaluation records and continuing professional development."],
];

const refresh = [
  "Review your next audit cycle against process risk, recent changes and unresolved findings. Record why the highest-risk work receives the coverage it does.",
  "Update the audit plan to capture the rationale for the method, access and evidence arrangements, and what the team will do if it cannot verify a critical control.",
  "Witness an audit or review a completed sample with each auditor. Check whether the evidence supports the findings and whether the follow-up shows that action worked.",
];

export default async function Iso19011Page({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();

  return <PageShell locale={locale}>
    <main className={styles.guide}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div>
            <p className={styles.edition}>Fourth edition · Published 27 May 2026</p>
            <h1>ISO 19011:2026 <span>at a Glance</span></h1>
            <p>Guidelines for auditing management systems. Use them to plan a programme around risk, collect evidence that supports your conclusions and evaluate whether your audit team can deliver the work.</p>
            <div className={styles.actions}>
              <Link href={`/${locale}/internal-audit-training`} className={styles.primary}>Explore ISO 19011 training</Link>
              <a href="#clauses" className={styles.secondary}>View the clause guide</a>
            </div>
          </div>
          <aside className={styles.scope} aria-label="Purpose and scope">
            <h2>Where to use it</h2>
            <p>Use ISO 19011 for internal audits and audits of suppliers or other external providers. It works across disciplines such as quality, environment and occupational health and safety.</p>
            <p>It is a guidance standard. ISO/IEC 17021-1 sets the requirements for bodies providing third-party management system certification.</p>
          </aside>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="release-heading">
        <h2 id="release-heading">What the fourth edition changes</h2>
        <p className={styles.intro}>The 2026 edition replaces ISO 19011:2018. It retains the seven audit principles and the framework for managing programmes, conducting audits and evaluating competence. The technical revision expands the guidance on using remote methods, drawing on ISO/IEC TS 17012:2024, with further guidance in Annex A for remote methods and virtual locations.</p>
        <div className={styles.cards}>
          <article>
            <h3>Choose methods that support the objective</h3>
            <p>Decide whether on-site, remote or a combination of methods will give the team enough reliable evidence. When planning the programme, account for technology, access and the risk of missing important evidence.</p>
          </article>
          <article>
            <h3>Plan access and protect evidence</h3>
            <p>Agree how the team will access information and handle confidential records. Test tools before the audit, agree what may be recorded and plan what to do if access or technology fails.</p>
          </article>
          <article>
            <h3>Evaluate competence in practice</h3>
            <p>Check that the team can use the chosen methods and judge the quality of the evidence they produce. Use observed performance and review of audit reports to identify development needs.</p>
          </article>
        </div>
      </section>

      <section id="clauses" className={styles.section} aria-labelledby="clause-heading">
        <h2 id="clause-heading">Clause guide</h2>
        <p className={styles.intro}>Clauses 1–3 set out scope, references and terminology. Clauses 4–7 guide how you plan, deliver and evaluate audit work.</p>
        <div className={styles.clauses}>
          {clauses.map(([number, heading, description, evidence]) => <article key={number}>
            <p className={styles.clauseNumber}>Clause {number}</p>
            <div><h3>{heading}</h3><p>{description}</p><p className={styles.evidence}><strong>What to retain</strong> {evidence}</p></div>
          </article>)}
        </div>
        <p className={styles.annex}><strong>Annex A</strong> offers practical guidance on sampling, verifying information, interviewing and other audit methods. A.16 covers remote methods, including considerations for virtual locations, data protection and continuity of access.</p>
      </section>

      <section className={styles.section} aria-labelledby="apply-heading">
        <h2 id="apply-heading">Apply it to your next audit cycle</h2>
        <div className={styles.application}>
          <article>
            <h3>Three actions to take</h3>
            <ol>{refresh.map(action => <li key={action}>{action}</li>)}</ol>
          </article>
          <article>
            <h3>Worked example</h3>
            <p>In an integrated audit of a coating line, sample the same jobs for product release, environmental controls and operator protection. Trace the job records through to the checks performed on the shop floor and the people who made release decisions.</p>
            <p>If the site procedure calls for a recorded airflow check before start-up and a sampled job has no record, cite the procedure and identify the job in the finding. At follow-up, sample the revised checks across relevant shifts and observe how operators respond to an out-of-range reading.</p>
          </article>
        </div>
      </section>

      <section className={`${styles.section} ${styles.resources}`} aria-labelledby="sources-heading">
        <div>
          <h2 id="sources-heading">Official sources and further reading</h2>
          <ul>{sources.map(([name, href]) => <li key={href}><a href={href}>{name}</a></li>)}</ul>
        </div>
        <aside>
          <h3>RPG Internal Auditor Refresher</h3>
          <p>Practise risk-based planning, interviews, evaluating evidence, writing findings and verifying corrective action through seven interactive modules.</p>
          <Link href={`/${locale}/internal-audit-training`}>View the course and enrolment options <span aria-hidden="true">→</span></Link>
        </aside>
      </section>
    </main>
  </PageShell>;
}
