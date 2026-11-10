import Link from "next/link";
import { businessProfileContext } from "../../../../lib/businessProfileAccess";
import { loadOrganizationSites } from "../../../../lib/organization-sites";
import { businessWorkforceCount } from "../../../../lib/businessWorkforce";
import CompanySetupNav from "../../../../components/CompanySetupNav";
import CompanyDetailsPanel from "../business-profile/CompanyDetailsPanel";
import LocationsPanel from "../sites/LocationsPanel";
import OwnerPersonForm from "./OwnerPersonForm";
import { createAdminClient } from "../../../../lib/supabase/admin";
import styles from "./setup.module.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "Company Setup | RPG Excellence" };
export default async function CompanySetupPage({ searchParams }) {
  const query = await searchParams || {};
  const section = ["locations", "people"].includes(query.section) ? query.section : "details";
  const { organization, user, isOwner } = await businessProfileContext();
  if (!organization) return <main className={styles.people}><h1>Create your company</h1><p>Start your company workspace on the Dashboard, then return here to add its details, locations and people.</p><Link href="/portal">Open Dashboard</Link></main>;
  const [sites, workforce] = await Promise.all([loadOrganizationSites(organization.id, {includeInactive: true}), businessWorkforceCount(organization.id)]);
  let ownerPerson = null;
  if (section === "people" && isOwner) {
    const {data, error} = await createAdminClient().from("organization_people").select("id,account_status,user_id").eq("organization_id", organization.id).eq("email", user.email.toLowerCase()).maybeSingle();
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
    {section === "people" && <main className={styles.people}><h2>People &amp; access</h2><p>Your login and company-user record serve different purposes. Company-user records let you assign asset ownership, site responsibilities and operational work.</p>
      {isOwner && !ownerPerson && <OwnerPersonForm firstName={user.user_metadata?.first_name || ""} lastName={user.user_metadata?.last_name || ""} email={user.email}/>}
      {ownerPerson && <p>Your email already has a company-user record. Review that record in People, Roles &amp; Access.</p>}
      <Link href="/portal/company/people">Manage people, roles &amp; access</Link>
    </main>}
  </div>;
}
