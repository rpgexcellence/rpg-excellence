import Link from 'next/link';
import {notFound} from 'next/navigation';
import PageShell from '../../../../components/PageShell';
import {locales} from '../../../../lib/i18n';
import ZoneSteps from './ZoneSteps';
import styles from './page.module.css';

export const metadata = {
  title: 'Buildings & Zones Management | RPG Excellence',
  description: 'Connect sites, buildings and work areas to local HSE controls. See how a zone QR code gives personnel and leaders access to published safety information, assessments and inspection status.',
  alternates: {canonical: '/en/how-it-works/buildings-and-zones'},
};
const asset = '/how-it-works/buildings-and-zones/';

export default async function BuildingsAndZones({params}) {
  const {locale} = await params;
  if (!locales.includes(locale)) notFound();
  return <PageShell locale={locale}><main className={styles.page}>
    <header className={styles.hero}>
      <div>
        <Link className={styles.back} href={`/${locale}/how-it-works`}>How it works / Business control</Link>
        <p className={styles.eyebrow}>BUILDINGS &amp; ZONES MANAGEMENT</p>
        <h1>Scan the code.<br/>Know the work area.</h1>
        <p className={styles.lead}>A QR code at the entrance gives personnel and leaders a direct route to the safety information published for that zone. Local restrictions, signs, linked risk assessments and inspection status are available where the work happens.</p>
        <p className={styles.body}>For someone starting a task, that means less searching for the relevant controls. For a leader visiting the area, it means a clearer view of what applies, what is due for review and where follow-up is needed.</p>
        <div className={styles.actions}><Link className={styles.primary} href="/portal/company/sites">Manage locations and zones</Link><a href="#employee-view">See the employee view</a></div>
        <p className={styles.small}>Published information follows the zone’s saved access settings. An internet connection is required.</p>
      </div>
      <figure className={styles.heroScreen}>
        <div className={styles.screenBar}>RPG EXCELLENCE <span>Employee zone page</span></div>
        <div className={styles.phonePair}><img src={asset+'employee-records.jpg'} alt="Employee zone page with safety information links and a communicated risk assessment" width="454" height="323" fetchPriority="high"/><img src={asset+'employee-status.jpg'} alt="Zone page showing inspection status, available assessments and the report an incident or concern button" width="462" height="365" fetchPriority="high"/></div>
        <figcaption>Actual platform screens supplied on 19 November 2026. These are demonstration records, not instructions for an operational area.</figcaption>
      </figure>
    </header>

    <nav className={styles.jump} aria-label="Buildings and zones sections"><a href="#structure">Set up the workplace</a><a href="#workflow">Follow the workflow</a><a href="#employee-view">What a scan makes available</a></nav>

    <section id="structure" className={styles.section} aria-labelledby="structure-title">
      <p className={styles.eyebrow}>START WITH A SHARED LOCATION RECORD</p>
      <h2 id="structure-title">A site, its buildings<br/>and the areas people use.</h2>
      <p className={styles.intro}>Set up the working location once, then organise its buildings and zones. A zone can be a workshop, laboratory, kitchen, yard or another defined area. External areas can be managed without assigning them to a building.</p>
      <div className={styles.structureGrid}><figure className={styles.screen}><a href={asset+'company-setup.jpg'} target="_blank" rel="noreferrer" aria-label="View company setup screenshot"><img src={asset+'company-setup.jpg'} alt="Company Setup navigation showing locations, buildings and zones alongside departments and people" width="1306" height="300" loading="lazy"/></a><figcaption>Company Setup brings the working locations and the people responsible for them together.</figcaption></figure><div className={styles.explanation}><h3>Use the same place across the platform.</h3><p>The controlled site record is used by operational modules such as risk assessments, permits, assets and audits. Buildings and zones add the detail needed to connect those records to a specific work area.</p><p>That shared structure helps the team find the right record and reduces ambiguity about where it applies.</p></div></div>
    </section>

    <section id="workflow" className={styles.section} aria-labelledby="workflow-title"><p className={styles.eyebrow}>FROM THE REGISTER TO THE WORK AREA</p><h2 id="workflow-title">Set it up. Link the records.<br/>Publish what people need.</h2><p className={styles.intro}>Select a stage to see the real screens and how the location record becomes useful on the floor.</p><ZoneSteps/></section>

    <section id="employee-view" className={styles.section} aria-labelledby="employee-title">
      <p className={styles.eyebrow}>HSE INFORMATION AT THE POINT OF WORK</p><h2 id="employee-title">One scan opens the local picture.</h2><p className={styles.intro}>When the zone is published and access permits it, scanning its poster opens the employee page. Personnel can check the relevant instructions before a task. Leaders can use the same page during a site visit or discussion with the team.</p>
      <div className={styles.featureGrid}>
        <article><h3>Local restrictions and signs</h3><p>See published area restrictions, safety signs and the zone’s reviewed PPE requirements. Warnings remain visible when requirements need review.</p></article>
        <article><h3>Linked risk assessments</h3><p>Open assessments made available to the zone with an approved or communicated status. Check their reference, version and review date, then read the hazards and existing controls.</p></article>
        <article><h3>Emergency information</h3><p>Find the local emergency instructions published for the area. The zone owner maintains the content so it reflects the arrangements people are expected to follow.</p></article>
        <article><h3>Inspections and actions</h3><p>See recorded inspection activity, upcoming or overdue programmes and open action counts. These give a visiting leader a practical starting point for follow-up.</p></article>
        <article><h3>Report a concern</h3><p>Use the incident or concern link from the work area. Anonymous reporting is available without signing in. For immediate danger, follow the site’s emergency procedures.</p></article>
        <article><h3>A stable point of access</h3><p>The permanent zone link stays with the work area while published information is updated online. Check the displayed poster revision when a replacement is required.</p></article>
      </div>
      <div className={styles.mobileGallery}>
        <figure className={styles.screen}><a href={asset+'employee-signs.jpg'} target="_blank" rel="noreferrer" aria-label="View zone signs screenshot"><img src={asset+'employee-signs.jpg'} alt="Area signs and PPE requirements with a safety-sign review warning" width="470" height="380" loading="lazy"/></a><figcaption>Review warnings and area signs stay in view. Confirm the task requirements when a review is due.</figcaption></figure>
        <figure className={styles.screen}><a href={asset+'employee-records.jpg'} target="_blank" rel="noreferrer" aria-label="View linked risk assessment screenshot"><img src={asset+'employee-records.jpg'} alt="Safety information links and a communicated risk assessment with version and review date" width="454" height="323" loading="lazy"/></a><figcaption>The linked assessment is identified by its reference, version, status and review date.</figcaption></figure>
        <figure className={styles.screen}><a href={asset+'employee-inspections.jpg'} target="_blank" rel="noreferrer" aria-label="View inspection and action status screenshot"><img src={asset+'employee-inspections.jpg'} alt="Zone inspection section showing an inspection awaiting review, one open action and overdue status" width="454" height="209" loading="lazy"/></a><figcaption>Inspection completion and open actions can be read together. A completed inspection does not establish that the area is safe.</figcaption></figure>
      </div>
      <aside className={styles.note}><h3>Keep the information current.</h3><p>A QR code makes information easier to reach; the responsible team still needs to maintain it. Check the zone’s publication settings, linked assessments, review warnings and displayed poster revision. Expected controls and open actions need appropriate follow-up before anyone relies on them.</p></aside>
    </section>
    <footer className={styles.finish}><h2>Give the work area<br/>a clear source of information.</h2><p>Connect the place, the controls and the work still to do.</p><div className={styles.actions}><Link className={styles.primary} href="/portal/company/sites">Open locations and zones</Link><Link href={`/${locale}/how-it-works/risk-assessments`}>Explore risk assessments</Link></div><p className={styles.small}>Screenshots are cropped demonstration views supplied on 19 November 2026. Personal details, the example QR destination and test instructions are hidden or excluded. They illustrate the module and are not live reporting routes. Company access is required to manage records.</p></footer>
  </main></PageShell>;
}
