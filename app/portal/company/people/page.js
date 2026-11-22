import {loadCompanyStructure} from "../../../../lib/company-structure";
import crypto from "node:crypto";
import {personSiteLabel} from "../../../../lib/company-person-site.mjs";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { createClient } from "../../../../lib/supabase/server";
import { functionLabel } from "../../../../lib/people-access";
import PeopleAccessForm from "./PeopleAccessForm";
import { sendPasswordReset, suspendPerson } from "./actions";
import "./people-access-readable.css";
import hub from "./people-register.module.css";
import { filterFields, matchesStatus, peopleRegister, personName, registerHref, registerPath, statuses } from "./people-register.mjs";

export const metadata = { title: "People, Roles & Access | RPG Excellence" };
export const dynamic = "force-dynamic";
const hash = (value) => crypto.createHash("sha256").update(String(value || "")).digest("hex");
const date = (value) => value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value)) : "—";

async function getAdminContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/company/people");
  const admin = createAdminClient();
  const { data: owned } = await admin.from("organizations").select("id,name,owner_id").eq("owner_id", user.id).order("created_at").limit(1).maybeSingle();
  if (owned) return { user, admin, organization: owned };
  const { data: person } = await admin.from("organization_people").select("id,organization_id").eq("user_id", user.id).eq("account_status", "active").limit(1).maybeSingle();
  if (!person) redirect("/portal");
  const { data: authorization } = await admin.from("organization_person_authorizations").select("id,expires_at").eq("person_id", person.id).eq("function_key", "company_administrator").eq("status", "authorised").maybeSingle();
  const { data: access } = await admin.from("organization_person_permissions").select("id").eq("person_id", person.id).eq("module_key", "people_access").eq("access_level", "admin").maybeSingle();
  if (!authorization || !access || (authorization.expires_at && authorization.expires_at < new Date().toISOString().slice(0, 10))) redirect("/portal");
  const { data: organization } = await admin.from("organizations").select("id,name,owner_id").eq("id", person.organization_id).single();
  return { user, admin, organization };
}

export default async function PeopleAccessPage({ searchParams }) {
  const params = await searchParams;
  const { user, admin, organization } = await getAdminContext();
  const {sites,departments} = await loadCompanyStructure(organization.id);
  const sitesById = new Map(sites.map(site => [site.id, site]));
  const departmentsById=new Map(departments.map(department=>[department.id,department]));
  const activitySince = new Date(Date.now() - 30 * 86400000).toISOString();
  const activityTypes = [
    ["person_access_updated", "Access changes"],
    ["account_activated", "Account activations"],
    ["access_suspended", "Suspensions"],
  ];
  const [peopleResult, authorizationsResult, permissionsResult, invitationsResult, siteDetails, ...activity] = await Promise.all([
    admin.from("organization_people").select("*").eq("organization_id", organization.id).order("last_name"),
    admin.from("organization_person_authorizations").select("*").eq("organization_id", organization.id),
    admin.from("organization_person_permissions").select("*").eq("organization_id", organization.id),
    admin.from("organization_invitations").select("id,person_id,status,expires_at,invitation_reference").eq("organization_id", organization.id).order("created_at", { ascending: false }),
    admin.from("organization_sites").select("id,city").eq("organization_id", organization.id),
    ...activityTypes.map(([type]) => admin.from("organization_access_events").select("id", { count: "exact", head: true })
      .eq("organization_id", organization.id).eq("event_type", type).gte("created_at", activitySince)),
  ]);
  const people = peopleResult.data || [];
  const myPerson = people.find(person => person.user_id === user.id);
  const authorizations = authorizationsResult.data || [];
  const permissions = permissionsResult.data || [];
  const invitations = invitationsResult.data || [];
  const setupError = [peopleResult, authorizationsResult, permissionsResult, invitationsResult].find(result => result.error)?.error;
  const locationCities = new Map((siteDetails.data ?? []).map(site => [site.id, site.city]));
  const { status, filters, options, visible } = peopleRegister(people, sitesById, departmentsById, params);
  const totals = new Map(statuses.map(([value]) => [value, people.filter(person => matchesStatus(person, value)).length]));
  const currentMs = Date.now();
  const liveInvitations = invitations.filter(item => item.status === "active" && new Date(item.expires_at).getTime() > currentMs);
  const shownInvitations = new Map();
  for (const invitation of liveInvitations) {
    if (!shownInvitations.has(invitation.person_id)) shownInvitations.set(invitation.person_id, invitation);
  }
  const createOpen = !people.length || params?.new === "1";
  const statusHref = (key, keepFilters = true) => registerHref({ ...(keepFilters ? filters : {}), status: key }, "#people-register");
  const baseQuery = { ...filters, status };
  let invitePreview = null;
  if (typeof params?.invite === "string" && params.invite) {
    const { data: invitation } = await admin.from("organization_invitations").select("*,organization_people(first_name,last_name,email,position)").eq("organization_id", organization.id).eq("token_hash", hash(params.invite)).eq("status", "active").maybeSingle();
    if (invitation) {
      const site = process.env.NEXT_PUBLIC_SITE_URL || "https://www.rpgexcellence.com";
      invitePreview = { ...invitation, qr: await QRCode.toDataURL(`${site}/join/${params.invite}`, { width: 700, margin: 2, errorCorrectionLevel: "M", color: { dark: "#082a54", light: "#ffffff" } }) };
    }
  }
  return <main className={`paPage ${hub.page}`}><style>{styles}</style><div className="paShell">
    <header className={hub.hero}>
      <div>
        <small>RPG EXCELLENCE / COMPANY GOVERNANCE</small>
        <h1>People, Roles &amp; Access</h1>
        <p>Manage people, reporting lines, professional authorisations and module access.</p>
      </div>
      <nav aria-label="People workspace shortcuts" className={hub.heroLinks}>
        <Link href="/portal">Customer portal</Link>
        {myPerson && <Link href={`${registerPath}/${myPerson.id}/edit`}>Edit my profile</Link>}
        <Link href={registerHref({ ...baseQuery, new: "1" }, "#create-person")}>+ Create person or system user</Link>
      </nav>
    </header>
    <section className={hub.metrics} aria-label="People and access summary">
      {[
        ["", "People", "people", "blue"],
        ["active", "Active users", "person", "green"],
        ["invited", "Awaiting activation", "clock", "amber"],
        ["directory", "Directory only", "folder", "blue"],
      ].map(([value, label, icon, tone]) => (
        <Link key={label} href={statusHref(value, false)} data-tone={tone} className={hub.metric}>
          <span className={hub.metricIcon}><Icon name={icon}/></span>
          <span><span className={hub.metricLabel}>{label}</span><strong>{peopleResult.error ? "—" : totals.get(value)}</strong></span>
        </Link>
      ))}
    </section>
    {params?.created === "directory" && <div className="paNotice success"><b>Directory person created.</b><span>The person can now be selected as an owner, manager, deputy or escalation contact.</span></div>}
    {params?.suspended && <div className="paNotice"><b>Access suspended.</b><span>Active QR invitations were revoked and the event was added to the audit trail.</span></div>}
    {params?.updated && <div className="paNotice success"><b>Person and access updated.</b><span>Profile details, professional authorisations and module permissions were saved in the controlled audit trail.</span></div>}
    {params?.password_reset === "sent" && <div className="paNotice success"><b>Password recovery sent.</b><span>The user must open the secure email link and choose their own new password. Administrators cannot see or set it.</span></div>}
    {params?.password_reset === "failed" && <div className="paError" role="alert"><b>Password recovery could not be sent.</b><span>Confirm that the email has a registered RPG account, then try again.</span></div>}
    {params?.password_reset === "unavailable" && <div className="paError" role="alert"><b>Password recovery is unavailable.</b><span>Only active or invited system users can receive a recovery email.</span></div>}
    {setupError && <div className="paError" role="alert"><b>People &amp; Access database setup is incomplete</b><span>{setupError.message}. Run the complete File 1 migration in the Supabase SQL Editor, then refresh this page.</span></div>}
    {invitePreview && <section className="paQr"><div><span>SECURE QR INVITATION</span><h2>{invitePreview.organization_people.first_name} {invitePreview.organization_people.last_name}</h2><p>{invitePreview.organization_people.email} · {invitePreview.organization_people.position || "Position not recorded"}</p><dl><div><dt>Reference</dt><dd>{invitePreview.invitation_reference}</dd></div><div><dt>Expires</dt><dd>{date(invitePreview.expires_at)}</dd></div><div><dt>Email</dt><dd>{params.email === "sent" ? "Invitation sent" : "Email not sent — download and issue the QR securely"}</dd></div></dl><p className="paSecurity">The QR is restricted to the approved email, can be used once and contains no personal information.</p></div><div className="paQrImage"><Image src={invitePreview.qr} width={260} height={260} alt={`Personal RPG invitation QR for ${invitePreview.organization_people.first_name} ${invitePreview.organization_people.last_name}`} unoptimized/><a href={invitePreview.qr} download={`${invitePreview.invitation_reference}.png`}>Download QR as PNG</a></div></section>}
    {createOpen && <section className="paCreate" id="create-person" aria-labelledby="create-person-title">
      <div className={hub.createHeading}>
        <h2 id="create-person-title">Create person or system user</h2>
        {people.length > 0 && <Link href={registerHref(baseQuery, "#people-register")}>Close form</Link>}
      </div>
      <PeopleAccessForm people={people} sites={sites} departments={departments} companyName={organization.name}/>
    </section>}
    <section id="people-register" className={hub.register} aria-labelledby="people-register-title">
      <header className={hub.registerHeader}>
        <h2 id="people-register-title">Company people and access</h2>
        {!peopleResult.error && <span>{visible.length} of {people.length} people</span>}
      </header>
      <nav className={hub.tabs} aria-label="Filter by account status">
        {statuses.map(([key, label]) => (
          <Link key={key} href={statusHref(key)} aria-current={status === key ? "page" : undefined}>
            {label}{!peopleResult.error && ` (${totals.get(key)})`}
          </Link>
        ))}
      </nav>
      <form className={hub.filters} action={registerPath + "#people-register"} aria-label="People register filters">
        {status && <input type="hidden" name="status" value={status}/>}
        {filterFields.map(([key, label, all]) => (
          <label key={key} htmlFor={`people-${key}`}>
            {label}
            <select key={filters[key]} id={`people-${key}`} name={key} defaultValue={filters[key]}>
              <option value="">{all}</option>
              {options[key].map(([value, text]) => <option key={value} value={value}>{text}</option>)}
            </select>
          </label>
        ))}
        <div className={hub.filterActions}>
          <button className={hub.primary} type="submit">Apply</button>
          <a className={hub.button} href={statusHref(status, false)}>Clear filters</a>
        </div>
      </form>
      <div className={hub.registerLayout}>
        <div className={hub.people}>
          {visible.map(({ person, assignments }) => (
            <PersonCard key={person.id} person={person} assignments={assignments}
              site={sitesById.get(person.site_id)} city={locationCities.get(person.site_id)}
              functions={authorizations.filter(item => item.person_id === person.id)}
              accessCount={permissions.filter(item => item.person_id === person.id && item.access_level !== "none").length}
              invitation={shownInvitations.get(person.id)} ownerId={organization.owner_id}/>
          ))}
          {!visible.length && <p className={hub.empty}>{peopleResult.error ? "The people register is unavailable."
            : people.length ? "No people match these filters." : "No people have been added. Use the form above to create the first record."}</p>}
        </div>
        <aside className={hub.side} aria-label="Access overview">
          <section className={hub.sidePanel} aria-labelledby="people-activity-title">
            <h3 id="people-activity-title"><Icon name="activity"/>Access activity</h3>
            <p>Last 30 days</p>
            <dl className={hub.activity}>
              {activityTypes.map(([key, label], index) => (
                <div key={key}><dt>{label}</dt><dd>{activity[index]?.count ?? "Unavailable"}</dd></div>
              ))}
            </dl>
          </section>
          <section className={hub.sidePanel} aria-labelledby="people-onboarding-title">
            <h3 id="people-onboarding-title"><Icon name="folder"/>Access onboarding</h3>
            <dl className={hub.activity}>
              <div><dt>Awaiting activation</dt><dd>{peopleResult.error ? "Unavailable" : totals.get("invited")}</dd></div>
              <div><dt>Active QR invitations</dt><dd>{invitationsResult.error ? "Unavailable" : shownInvitations.size}</dd></div>
            </dl>
            <Link href={statusHref("invited", false)}>View pending accounts →</Link>
          </section>
          <section className={hub.sidePanel} aria-labelledby="people-actions-title">
            <h3 id="people-actions-title"><Icon name="bolt"/>Key actions</h3>
            <div className={hub.keyActions}>
              <Link href={statusHref("suspended", false)}>Review suspended accounts <strong>{peopleResult.error ? "—" : totals.get("suspended")}</strong></Link>
              <Link href={statusHref("invited", false)}>Follow up on pending activation <strong>{peopleResult.error ? "—" : totals.get("invited")}</strong></Link>
              <Link href={statusHref("active", false)}>Review active user access <span aria-hidden="true">→</span></Link>
            </div>
          </section>
        </aside>
      </div>
    </section>
  </div></main>;
}

function PersonCard({ person, assignments, site, city, functions, accessCount, invitation, ownerId }) {
  const name = personName(person);
  const initials = [person.first_name?.trim()[0], person.last_name?.trim()[0]].filter(Boolean).join("") || name.slice(0, 1);
  const accountState = person.account_status;
  const stateLabel = statuses.find(([key]) => key === accountState)?.[1] ?? (accountState === "closed" ? "Closed" : "Unknown");
  const canSuspend = !["suspended", "closed"].includes(accountState);
  const canRecover = person.account_type === "system" && canSuspend;
  const facts = [
    ["Reports to", assignments.manager.value === "unassigned" ? "Not assigned" : assignments.manager.label, "person"],
    ["Location", city || assignments.location.label, "location"],
    ["Site", site ? personSiteLabel(site) : "—", "site"],
    ["Module access", person.user_id && person.user_id === ownerId ? "Company owner" : `${accessCount} ${accessCount === 1 ? "module" : "modules"}`, "layers"],
  ];
  return <article className={hub.personCard}>
    <div className={hub.identity}>
      <div className={hub.initials} aria-hidden="true">{initials.toUpperCase()}</div>
      <div>
        <h3>{name}</h3>
        <p>{person.position || "Position not recorded"}{assignments.department.value !== "unassigned" && ` · ${assignments.department.label}`}</p>
        {person.email && person.email !== name && <small>{person.email}</small>}
      </div>
      <span className={hub.status} data-status={accountState}>{stateLabel}</span>
    </div>
    <dl className={hub.facts}>
      {facts.map(([label, value, icon]) => (
        <div key={label}><Icon name={icon}/><div><dt>{label}</dt><dd>{value}</dd></div></div>
      ))}
    </dl>
    <footer className={hub.footer}>
      <div>
        {functions.length > 0 && <ul className={hub.functions} aria-label="Professional functions">
          {functions.map(item => (
            <li key={item.id} data-authorised={item.status === "authorised"}>
              {functionLabel(item.function_key)}{item.status === "authorised" ? <span className={hub.srOnly}> · Authorised</span> : ` · ${item.status}`}
            </li>
          ))}
        </ul>}
        <small>{invitation ? `QR ${invitation.invitation_reference} expires ${date(invitation.expires_at)}`
          : person.account_type === "directory" ? "Directory record · No login" : "No active QR invitation"}</small>
      </div>
      <div className={hub.personActions}>
        <Link className={hub.button} href={`${registerPath}/${person.id}/edit`}>Edit profile &amp; access</Link>
        {(canRecover || canSuspend) && <details className={hub.more}>
          <summary className={hub.button}><span aria-hidden="true">•••</span><span className={hub.srOnly}>More actions for {name}</span></summary>
          <div>
            {canRecover && <form action={sendPasswordReset}><input type="hidden" name="person_id" value={person.id}/><button type="submit">Send password reset</button></form>}
            {canSuspend && <form action={suspendPerson}><input type="hidden" name="person_id" value={person.id}/><button type="submit" className={hub.danger}>Revoke / suspend</button></form>}
          </div>
        </details>}
      </div>
    </footer>
  </article>;
}

const iconPaths = {
  people: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-4M13 3a4 4 0 0 1 0 8m5-8a4 4 0 0 1 0 8M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  person: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2Zm-4-14a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  clock: "M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  folder: "M3 7V5a1 1 0 0 1 1-1h5l2 3h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z",
  location: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Zm-5 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  site: "M2 22h20M4 22V3h10v19m0-13h6v13M7 7h4m-4 4h4m-4 4h4",
  layers: "m12 2 10 5-10 5L2 7Zm10 10-10 5-10-5m20 5-10 5-10-5",
  activity: "M3 3v18h18M8 16v-4m5 4V7m5 9v-6",
  bolt: "m13 2-9 12h7l-1 8 10-12h-7Z",
};

function Icon({ name }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
    strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={iconPaths[name]}/></svg>;
}

const styles = `.paPage{min-height:100vh;font-family:Arial,sans-serif}.paQr>div>span{color:#315fe6;font-size:10px;font-weight:950;letter-spacing:.14em}.paNotice,.paError{display:grid;gap:4px;margin:14px 0;padding:14px 16px;border:1px solid #efc688;border-radius:10px;background:#fff7e8;color:#784c00}.paNotice.success{border-color:#9bd8bd;background:#edfbf4;color:#08714f}.paNotice span,.paError span{font-size:12px}.paQr{display:grid;grid-template-columns:1fr 300px;gap:25px;align-items:center;margin:18px 0;padding:25px;border:1px solid #9fc5ec;border-radius:18px;background:linear-gradient(135deg,#fff,#edf6ff);box-shadow:0 14px 34px #173f6912}.paQr h2{margin:8px 0 4px;font-size:27px}.paQr p{color:#63798f}.paQr dl{display:flex;gap:10px;flex-wrap:wrap}.paQr dl div{min-width:150px;padding:11px;border-radius:9px;background:#fff}.paQr dt{color:#6c8196;font-size:9px;text-transform:uppercase}.paQr dd{margin:4px 0 0;font-size:12px;font-weight:850}.paQr .paSecurity{font-size:11px}.paQrImage{text-align:center}.paQrImage img{display:block;width:260px;height:260px;margin:auto;border:10px solid #fff;border-radius:12px}.paQrImage a{display:inline-block;margin-top:9px;color:#155dca;font-size:12px;font-weight:900}.paCreate{margin-top:18px;border:1px solid #d5e1ec;border-radius:17px;background:#fff;box-shadow:0 12px 30px #173f6910}.paForm{padding:0 20px 22px}.paSection{margin-top:13px;padding:19px;border:1px solid #dce6ef;border-radius:14px;background:#f9fbfd}.paSection>header{display:flex;gap:11px;align-items:flex-start;margin-bottom:16px}.paSection>header>span{display:grid;place-items:center;min-width:31px;height:31px;border:1px solid #b9cde1;border-radius:8px;color:#315fe6;font-size:10px;font-weight:950}.paSection h2{margin:0;font-size:18px}.paSection header p{margin:4px 0 0;color:#718499;font-size:11px}.paGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.paGrid label,.paFunctionControl label,.paPermissions label{display:grid;gap:6px}.paGrid label>span,.paFunctionControl label,.paPermissions label>span{font-size:10px;font-weight:900}.paGrid .wide,.paFunctionControl .wide{grid-column:1/-1}.paGrid input,.paGrid select,.paGrid textarea,.paFunctionControl input,.paFunctionControl select,.paPermissions select{width:100%;min-height:43px;padding:10px;border:1px solid #c8d6e4;border-radius:8px;background:#fff;color:#102f51;font:inherit}.paChoice{display:grid;grid-template-columns:1fr 1fr;gap:12px}.paChoice label{position:relative;padding:16px;border:1px solid #cbd9e5;border-radius:11px;background:#fff;cursor:pointer}.paChoice label.selected{border-color:#315fe6;box-shadow:0 0 0 3px #315fe614}.paChoice input{position:absolute;right:13px}.paChoice b,.paChoice small{display:block}.paChoice small{margin-top:5px;color:#718499}.paFunctions{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.paFunctions article{border:1px solid #d4e0eb;border-radius:12px;background:#fff;overflow:hidden}.paFunctions article.selected{border-color:#315fe6}.paFunctions button{width:100%;min-height:180px;padding:14px;border:0;background:transparent;color:#12385f;text-align:left;cursor:pointer}.paFunctions svg{display:block;margin-bottom:7px;color:#1762cf}.paFunctions button b,.paFunctions button small,.paFunctions button span{display:block}.paFunctions button small{min-height:31px;margin-top:5px;color:#718499;font-size:10px;line-height:1.4}.paFunctions button span{margin-top:9px;color:#315fe6;font-size:10px;font-weight:900}.paFunctionControl{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px;background:#edf4ff}.paFunctionControl label{font-size:9px}.paPermissions{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.paPermissions label{padding:11px;border:1px solid #d7e2ec;border-radius:9px;background:#fff}.paSection.disabled{opacity:.55}.paSubmit{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:20px 0 3px}.paSubmit b,.paSubmit span{display:block}.paSubmit span{margin-top:4px;color:#72859a;font-size:11px}.paSubmit button{padding:14px 18px;border:0;border-radius:9px;background:#315fe6;color:#fff;font-weight:900;cursor:pointer}.paSubmit button:disabled{opacity:.55}.paError{border-color:#eba69f;background:#fff0ee;color:#922f26}@media(max-width:1000px){.paFunctions,.paPermissions,.paGrid{grid-template-columns:1fr 1fr}}@media(max-width:700px){.paQr{grid-template-columns:1fr}.paGrid,.paFunctions,.paPermissions,.paChoice{grid-template-columns:1fr}.paSubmit{align-items:stretch;flex-direction:column}.paSubmit button{width:100%}}`;
