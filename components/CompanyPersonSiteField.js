import Link from "next/link";
import {LEGACY_PERSON_SITE,personSiteLabel} from "../lib/company-person-site.mjs";
export default function CompanyPersonSiteField({sites = [],person = null}) {
  const current = person?.site_id;
  const legacy = !current && Boolean(person?.site);
  const options = sites.filter(site => site.status === "active" || site.id === current);
  const missingCurrent = current && !options.some(site => site.id === current);
  return <label><span>Site / location</span>
    <select name="site_id" defaultValue={current || (legacy ? LEGACY_PERSON_SITE : "")}>
      <option value="">Not assigned / works across locations</option>
      {legacy && <option value={LEGACY_PERSON_SITE}>Previously recorded: {person.site} — review location link</option>}
      {missingCurrent && <option value={current}>{person.site || "Previously assigned location"} — review required</option>}
      {options.map(site => <option key={site.id} value={site.id}>{personSiteLabel(site)}{site.status !== "active" ? " (" + site.status + ")" : ""}</option>)}
    </select>
    <small>{!options.some(site => site.status === "active") ? "No active locations available. " : "Locations belong to this company. "}<Link href="/portal/company/setup?section=locations" target="_blank" rel="noopener noreferrer">Manage company locations</Link>. A profile location does not grant access permissions.</small>
  </label>;
}
