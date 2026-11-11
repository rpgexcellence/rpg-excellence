import DepartmentsPanel from "../departments/DepartmentsPanel";
import Link from "next/link";
import { businessProfileContext } from "../../../../lib/businessProfileAccess";
import { loadOrganizationSites } from "../../../../lib/organization-sites";
import { businessWorkforceCount } from "../../../../lib/businessWorkforce";
import CompanySetupNav from "../../../../components/CompanySetupNav";
import CompanyDetailsPanel from "../business-profile/CompanyDetailsPanel";
import LocationsPanel from "../sites/LocationsPanel";
import { createAdminClient } from "../../../../lib/supabase/admin";
import styles from "./setup.module.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "Company Setup | RPG Excellence" };
export default async function CompanySetupPage({ searchParams }) {
  const query = await searchParams || {};
  const section = ["locations", "departments", "people"].includes(query.section) ? query.section : "details";
  const { organization, user, isOwner } = await businessProfileContext();
  if (!organization) return <main className={styles.people}><h1>Create your company</h1><p>Start your company workspace on the Dashboard, then return here to add its details, locations and people.</p><Link href="/portal">Open Dashboard</Link></main>;
  const [sites, workforce] = await Promise.all([loadOrganizationSites(organization.id, {includeInactive: true}), businessWorkforceCount(organization.id)]);
  let ownerPerson = null;
  if (section === "people" && isOwner) {
    const {data, error} = await createAdminClient().from("organization_people").select("id,account_status,user_id,first_name,last_name").eq("organization_id", organization.id).eq("user_id", user.id).maybeSingle();
    if (error) throw new Error("The company-user register is temporarily unavailable.");
    ownerPerson = data;
  }
  return <div className={styles.shell}>
    <header className={styles.top}><span className={styles.eyebrow}>ADMINISTRATION</span><h1>Company Setup</h1><p>{organization.name}: company details, working locations and people in one place.</p>
      <div className={styles.overview}>
        <Link href="/portal/company/setup"><strong>Company details</strong><span>Legal identity and registered address</span></Link>
        <Link href="/portal/company/setup?section=locations"><strong>{sites.filter(s => s.status === "active").length} active locations</strong><span>Shared across operational modules</span></Link>
        <Link href="/portal/company/setup?section=people"><strong>{workforce === null ? "People" : workforce + " people"}</strong><span>Responsibilities and access</span></Link>
      </div><CompanySetupNav section={section}/>
    </header>
    {section === "details" && <CompanyDetailsPanel/>}
    {section === "locations" && <LocationsPanel searchParams={Promise.resolve(query)}/>}
    {section === "departments" && <DepartmentsPanel query={query}/>}
    {section === "people" && <main className={styles.people}><h2>People &amp; access</h2><p>Your company owner uses their existing login. Complete profile details and choose a company location, then add colleagues and assign their access.</p>
      {isOwner && !ownerPerson && <p role="alert">Your existing account needs a directory-link review. Apply the owner-and-location migration, or review an existing suspended or conflicting directory record. Do not create another invitation for yourself.</p>}
      {ownerPerson && <p>Your existing login is linked to the company directory. <Link href={`/portal/company/people/${ownerPerson.id}/edit`}>{!ownerPerson.first_name || !ownerPerson.last_name ? "Complete my profile" : "Edit my profile"}</Link></p>}
      <Link href="/portal/company/people">Manage people, roles &amp; access</Link>
    </main>}
  </div>;
}
