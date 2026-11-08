import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../../components/PageShell";
import JsonLd from "../../../../components/JsonLd";
import { locales } from "../../../../lib/i18n";
import styles from "./page.module.css";

const slug = "asset-management-at-the-point-of-work";
const cover = "/insights/asset-management-point-of-work.png";
const evidencePoster = "/insights/asset-management-connected-record.png";
const title = "Your Asset Information Where the Work Happens";

export const metadata = {
  title: title + " | RPG Insights Issue 034",
  description: "Explore the RPG Excellence Asset Management upgrade: scan an individual asset QR on your phone to reach authorised ownership, maintenance, calibration, evidence and linked records at the point of work.",
  alternates: { canonical: "/en/insights/" + slug },
  openGraph: {
    title: "Your asset information. Where the work happens.",
    description: "Less time finding the record. A clearer view of ownership, due work and evidence, with sign-in and company permissions retained.",
    images: [{ url: cover, alt: "RPG Excellence poster showing a maintenance professional opening an asset record on a phone beside a QR-labelled pump" }],
  },
};

const steps = [
  ["01", "Find the right asset", "Scan its individual QR label and check the reference, location and identity against the equipment in front of you."],
  ["02", "Understand what is due", "Review recorded maintenance and independent calibration requirements, dates, work history and available evidence."],
  ["03", "Reach the right person", "Identify the accountable owner and maintenance coordinator, then follow the relevant work, issue or change record."],
];

export default async function AssetManagementInsight({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  const insightsHref = "/" + locale + "/insights";
  const articleUrl = "https://www.rpgexcellence.com/" + locale + "/insights/" + slug;

  return (
    <PageShell locale={locale}>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Article",
        headline: title,
        description: metadata.description,
        datePublished: "2026-11-08",
        dateModified: "2026-11-08",
        mainEntityOfPage: articleUrl,
        image: ["https://www.rpgexcellence.com" + cover, "https://www.rpgexcellence.com" + evidencePoster],
        author: { "@id": "https://www.rpgexcellence.com/#organization" },
        publisher: { "@id": "https://www.rpgexcellence.com/#organization" },
      }} />
      <main className={styles.page}>
        <div className={styles.inner}>
          <Link className={styles.back} href={insightsHref}>Back to RPG Insights</Link>
          <header className={styles.intro}>
            <div>
              <p className={styles.kicker}>RPG INSIGHTS · ISSUE 034 · 8 NOVEMBER 2026</p>
              <h1>Your asset information.<br />Where the work happens.</h1>
              <p className={styles.lead}>Scan the label. Open the record on your phone. Find the information you need beside the asset.</p>
              <p>You are standing beside a piece of equipment. You need to know who owns it, what maintenance is due and where the latest certificate is held. The answer should be easier to reach than a spreadsheet on another computer or an attachment in somebody else&apos;s inbox.</p>
              <p>The RPG Excellence Asset Management upgrade brings that information into a connected asset record, accessible through an individual QR code and your authorised account.</p>
              <Link className={styles.primary} href="/portal/asset-management">Open Asset Management</Link>
              <p className={styles.small}>Use your phone browser. No return to a desktop is needed to open the record. Sign-in, connectivity, company allocation and the appropriate permissions are required.</p>
            </div>
            <figure className={styles.poster}>
              <a href={cover} target="_blank" rel="noreferrer">
                <img src={cover} alt="A maintenance professional uses a phone beside an asset QR label, with the message Your asset information where the work happens" width="1536" height="1024" fetchPriority="high" />
              </a>
              <figcaption>Information at the point of work, with controlled access. Illustrative campaign artwork; the phone screen and QR are not a live product screen or a working asset label.</figcaption>
            </figure>
          </header>

          <section className={styles.steps} aria-label="Using an asset QR at the point of work">
            {steps.map(([number, heading, text]) => (
              <article key={number}><b>{number}</b><h2>{heading}</h2><p>{text}</p></article>
            ))}
          </section>

          <article className={styles.body}>
            <section>
              <h2>The value is in the next decision</h2>
              <p>An asset register can tell you that a pump, boiler, instrument or machine exists. The operational question usually needs more detail. Is there planned work? Who is coordinating it? Has the calibration certificate been reviewed? Is a modification still being managed?</p>
              <p>When that information sits in separate places, people spend time finding it and checking whether it refers to the same item. Connecting the asset identity to its owner, work history and evidence can reduce that search effort and make handovers easier to follow. The benefit depends on maintaining accurate records, current responsibilities and useful evidence.</p>
              <p>The upgrade gives Asset Management its own workspace: Dashboard, Create New Asset, Asset Register and Maintenance &amp; PPM. Administration continues to hold controlled company and site information, while assets have a clear place in the working day.</p>
            </section>

            <section>
              <h2>Open the record without returning to the office</h2>
              <p>Each asset has an individual QR code. An authorised user can download a small printable label showing the asset identity, accountable owner, location and QR. The full asset record also displays its own QR.</p>
              <p>Scan the equipment label with your phone and open the asset record in the browser. If you are not signed in, sign in with your own account. The system checks your company and permissions before returning the information. The QR is a direct route to the record, not a public access pass.</p>
              <p>For a facilities engineer moving between buildings, an equipment owner on the workshop floor or a manager reviewing an item during a site walk, this removes the need to return to a desktop simply to locate the record. It does not remove the need to check the physical equipment and follow the task controls.</p>
            </section>

            <figure className={styles.widePoster}>
              <a href={evidencePoster} target="_blank" rel="noreferrer">
                <img src={evidencePoster} alt="RPG Excellence poster showing a facilities technician using a phone to review ownership, due work, available evidence and follow-up beside an asset" width="1536" height="1024" loading="lazy" />
              </a>
              <figcaption>The label identifies the item. The record brings together the information needed to understand its recorded position. Illustrative generated artwork; this is not a live product screen.</figcaption>
            </figure>

            <section>
              <h2>A clearer answer to what who when and how</h2>
              <p>The redesigned register cards put identity, location, accountable owner, criticality, PPM requirement and next maintenance in a readable summary. Linked records expand when more detail is needed. Secondary actions sit together, leaving the main route into the asset record easy to find.</p>
              <p>The full record separates identity and ownership, maintenance and calibration, NC CAPA and MOC, documented controls and work history. That structure helps a user move from a headline status to the details behind it: the responsible person, the relevant date, the work scope and the supporting evidence.</p>
              <p>Record visibility follows the permissions of the source module. If a linked issue or document is restricted or unavailable, that must not be taken to mean there is nothing outstanding.</p>
            </section>

            <section>
              <h2>Maintenance and calibration need separate answers</h2>
              <p>A completed service does not necessarily establish that a measuring instrument is suitable for its intended measurement. The updated asset form treats PPM or periodic inspection and calibration as independent requirements, with their own dates and control information.</p>
              <p>When an existing asset is first registered, previous maintenance and calibration evidence can be recorded with the actual dates, provider, report or certificate and next due date. This preserves useful history without pretending that the work was performed on the day the asset was entered.</p>
              <p>Calibration results can be recorded as Not assessed, Within limits, Out of tolerance or Conditional. The distinction matters: storing a certificate and reviewing what its results mean are separate tasks. A competent person still needs to assess the evidence and any limitations.</p>
            </section>

            <aside className={styles.insight}>
              <p className={styles.kicker}>MANAGEMENT INSIGHT</p>
              <h2>Make the information easier to reach and the responsibility easier to follow.</h2>
              <p>The practical gain is a shorter route from the equipment to the person, work record or evidence needed for the next decision. Measure that benefit in your own operation rather than assuming a universal time saving.</p>
            </aside>

            <section>
              <h2>A handover that starts with the same asset</h2>
              <p>Consider a hypothetical facilities handover. A technician scans a pump label before planned work. The record identifies the owner and coordinator, shows an open maintenance job and provides the linked operating information available to that user.</p>
              <p>The technician can establish which recorded job needs attention and who to contact before work begins. The coordinator can review the work history and retain the completion report. If the work involves a material modification, the relevant change workflow remains part of the decision.</p>
              <p>This is an illustration of the intended workflow, not a reported customer outcome. The benefit comes from the connected trail and the quality of the information entered.</p>
            </section>

            <section>
              <h2>Connected documents and a dashboard with context</h2>
              <p>Searchable tick-box selectors allow more than one asset category and more than one current controlled document to be selected. A manual, work instruction or inspection standard can be linked to the same asset while remaining controlled in the document register.</p>
              <p>The dashboard helps direct attention to overdue and approaching work, missing dates and out-of-service assets, alongside maintenance delivery and permitted linked issues. Filters help users focus on a site, owner, asset type or maintenance window.</p>
              <p>Asset totals and work-record totals answer different questions. If an expected job is missing from a view, check the selected company, asset, dates and filters and inspect its history. A dashboard is useful when people understand the records behind its figures.</p>
            </section>

            <section>
              <h2>Mobile access with company control</h2>
              <p>The company Super Administrator allocates Asset Management access to active company System Users. Viewing and contribution rights differ, and linked source modules retain their own permissions. Maintenance evidence is accessed through an authenticated route.</p>
              <p>Printed owner and location information is visible to anyone who can see the label, so label placement and disclosure need to be appropriate. Downloaded files also need normal company handling and retention controls.</p>
              <p>Mobile access still needs connectivity. Temporary new-asset device drafts can help with interrupted data entry, but they are not an offline asset record or evidence of registration. They expire after 24 hours, files must be selected again on restoration, and online submission is needed to save the controlled record.</p>
              <p>An Active status, a future due date or an attached certificate does not authorise equipment use. Physical condition, local instructions, isolation, competence and the relevant release decision remain essential.</p>
            </section>

            <section>
              <h2>Try a short walkthrough with your team</h2>
              <p>Select a small group of representative assets. Check the identity, owner and location, record the appropriate maintenance and calibration controls, link current documents and verify the evidence. Print and test a label, then ask an allocated user to open the record on their phone.</p>
              <p>Observe whether they can identify the responsible person, find the next work item and reach the relevant evidence. Record the gaps and correct them before expanding the rollout. This gives you a practical basis for judging whether access at the point of work improves your own process.</p>
            </section>

            <section>
              <h2>Posters for your team briefing</h2>
              <p>Open either poster at full size or download it for an internal briefing about the upgraded workflow. The campaign images illustrate mobile asset access; use the live system to demonstrate the actual screens and authentication.</p>
              <div className={styles.downloads}>
                <a className={styles.download} href={cover} download="asset-management-point-of-work.png">Download mobile access poster</a>
                <a className={styles.download} href={evidencePoster} download="asset-management-connected-record.png">Download connected record poster</a>
              </div>
            </section>

            <section className={styles.cta}>
              <h2>Bring the asset record to the point of work</h2>
              <p>Explore the upgraded workspace or talk to RPG Excellence about showing the workflow to your team.</p>
              <div>
                <Link className={styles.primary} href="/portal/asset-management">Open Asset Management</Link>
                <Link className={styles.secondary} href={"/" + locale + "/contact"}>Discuss a demonstration</Link>
              </div>
              <p className={styles.small}>Available subject to your company subscription, module allocation and permissions. Platform records support informed decisions; they do not replace competent technical or legal assessment.</p>
            </section>
          </article>
        </div>
      </main>
    </PageShell>
  );
}
