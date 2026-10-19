import Link from "next/link";

import { businessProfileContext } from "../../../../lib/businessProfileAccess";
import { loadOrganizationSites } from "../../../../lib/organization-sites";
import { createAdminClient } from "../../../../lib/supabase/admin";

import SiteProfileForm from "./SiteProfileForm";

import {
  archiveOrganizationSite,
  saveOrganizationSite,
} from "./actions";

export const metadata = {
  title:
    "Site Profile | RPG Excellence",
};

export const dynamic =
  "force-dynamic";

const personName = (person) =>
  [
    person?.first_name,
    person?.last_name,
  ]
    .filter(Boolean)
    .join(" ") ||
  person?.email ||
  "Unassigned";

const displayValue = (value) =>
  String(value || "")
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );

export default async function OrganizationSitesPage({
  searchParams,
}) {
  const query = await searchParams;

  const {
    organization,
  } = await businessProfileContext();

  if (!organization) {
    return (
      <main className="osPage">
        <style>{styles}</style>

        <section className="osEmpty">
          <small>
            ADMINISTRATION
          </small>

          <h1>Site Profile</h1>

          <p>
            Create your Business
            Profile before adding
            controlled company sites.
          </p>

          <Link href="/portal">
            Open business setup →
          </Link>
        </section>
      </main>
    );
  }

  const admin =
    createAdminClient();

  const [
    sites,
    peopleResult,
  ] = await Promise.all([
    loadOrganizationSites(
      organization.id,
      {
        includeInactive: true,
      },
    ),

    admin
      .from(
        "organization_people",
      )
      .select(
        "id,first_name,last_name,email,position",
      )
      .eq(
        "organization_id",
        organization.id,
      )
      .eq(
        "account_status",
        "active",
      )
      .order("last_name")
      .order("first_name"),
  ]);

  if (peopleResult.error) {
    throw new Error(
      peopleResult.error.message,
    );
  }

  const people =
    peopleResult.data || [];

  const selectedSite =
    sites.find(
      (site) =>
        site.id === query?.edit,
    ) || null;

  const peopleById = new Map(
    people.map((person) => [
      person.id,
      person,
    ]),
  );

  const activeSites =
    sites.filter(
      (site) =>
        site.status === "active",
    );

  const inactiveSites =
    sites.filter(
      (site) =>
        site.status === "inactive",
    );

  const primarySites =
    sites.filter(
      (site) => site.is_primary,
    );

  return (
    <main className="osPage">
      <style>{styles}</style>

      <div className="osShell">
        <header className="osTop">
          <div>
            <small>
              ADMINISTRATION ·
              CONTROLLED COMPANY DATA
            </small>

            <h1>Site Profile</h1>

            <p>
              The authoritative
              register for every
              company location.
              Operational modules
              select these controlled
              records instead of
              creating competing site
              lists.
            </p>
          </div>

          <nav>
            <Link href="/portal/company/business-profile">
              Business Profile
            </Link>

            <Link href="/portal/company/assets">
              Asset Register
            </Link>

            <Link href="/portal/company/people">
              Company Users
            </Link>

            <Link href="/portal">
              Dashboard
            </Link>
          </nav>
        </header>

        <section className="osNotice">
          <div>
            <strong>
              One controlled site
              source
            </strong>

            <p>
              Risk assessments,
              permits, POWRA, assets,
              Management of Change,
              internal audits and RCA
              select their locations
              from this register.
            </p>
          </div>

          <div>
            <strong>
              BCP remains separate
            </strong>

            <p>
              The BCP Continuity Site
              Assessment links to one
              of these sites and only
              records continuity-
              specific information.
            </p>
          </div>
        </section>

        <section className="osStats">
          <article>
            <span>
              ACTIVE SITES
            </span>

            <strong>
              {activeSites.length}
            </strong>

            <small>
              Available for new
              controlled records
            </small>
          </article>

          <article>
            <span>
              PRIMARY SITE
            </span>

            <strong>
              {primarySites.length}
            </strong>

            <small>
              One primary site
              permitted
            </small>
          </article>

          <article>
            <span>
              INACTIVE SITES
            </span>

            <strong>
              {inactiveSites.length}
            </strong>

            <small>
              Retained in controlled
              history
            </small>
          </article>

          <article>
            <span>
              COMPANY USERS
            </span>

            <strong>
              {people.length}
            </strong>

            <small>
              Available for site
              accountability
            </small>
          </article>
        </section>

        <div className="osLayout">
        <SiteProfileForm
  key={
    selectedSite?.id ||
    "new-site"
  }
  action={
    saveOrganizationSite
  }
  site={selectedSite}
  people={people}
/>

          <section className="osList">
            <header>
              <div>
                <small>
                  SITE REGISTER
                </small>

                <h2>
                  Controlled sites
                </h2>

                <p>
                  Select a site to
                  update its address,
                  ownership and
                  operating status.
                </p>
              </div>

              {selectedSite && (
                <Link href="/portal/company/sites">
                  + Add site
                </Link>
              )}
            </header>

            {sites.length ? (
              <div className="osSiteRows">
                {sites.map((site) => {
                  const owner =
                    peopleById.get(
                      site.site_owner_person_id,
                    );

                  const manager =
                    peopleById.get(
                      site.site_manager_person_id,
                    );

                  const address = [
                    site.address_line_1,
                    site.address_line_2,
                    site.city,
                    site.region,
                    site.postal_code,
                    site.country,
                  ]
                    .filter(Boolean)
                    .join(", ");

                  return (
                    <article
                      key={site.id}
                      className={
                        site.id ===
                        selectedSite?.id
                          ? "selected"
                          : ""
                      }
                    >
                      <div className="osSiteIdentity">
                        <div className="osSiteReference">
                          <span>
                            {
                              site.site_reference
                            }
                          </span>

                          <i>
                            {displayValue(
                              site.site_type,
                            )}
                          </i>

                          {site.is_primary && (
                            <b>
                              Primary
                            </b>
                          )}
                        </div>

                        <h3>
                          {
                            site.site_name
                          }
                        </h3>

                        <p>
                          {address ||
                            "Address not completed"}
                        </p>

                        <div className="osSitePeople">
                          <span>
                            <strong>
                              Accountable
                              owner
                            </strong>

                            {personName(
                              owner,
                            )}
                          </span>

                          <span>
                            <strong>
                              Site manager
                            </strong>

                            {personName(
                              manager,
                            )}
                          </span>
                        </div>
                      </div>

                      <nav className="osSiteActions">
                        <span
                          className={`osStatus ${site.status}`}
                        >
                          {displayValue(
                            site.status,
                          )}
                        </span>

                        <Link href={`/portal/company/sites/${site.id}/zones`}>Buildings &amp; zones</Link>
                        <Link
                          href={`/portal/company/sites?edit=${site.id}`}
                        >
                          Edit
                        </Link>

                        {site.status !==
                          "archived" && (
                          <form
                            action={
                              archiveOrganizationSite
                            }
                          >
                            <input
                              type="hidden"
                              name="id"
                              value={
                                site.id
                              }
                            />

                            <button
                              type="submit"
                              disabled={
                                site.is_primary
                              }
                              title={
                                site.is_primary
                                  ? "Set another site as primary before archiving this site."
                                  : "Archive this Site Profile"
                              }
                            >
                              Archive
                            </button>
                          </form>
                        )}
                      </nav>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="osNoSites">
                <strong>
                  No Site Profiles
                  exist
                </strong>

                <p>
                  Use the form to add
                  the first controlled
                  company site.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

const styles = `
  * {
    box-sizing: border-box;
  }

  .osPage {
    min-height: 100vh;
    padding: 28px clamp(14px, 3vw, 48px) 80px;
    background: #edf3f8;
    color: #071d3a;
    font-family: Arial, sans-serif;
  }

  .osShell {
    max-width: 1600px;
    margin: 0 auto;
  }

  .osTop {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
  }

  .osTop > div {
    max-width: 820px;
  }

  .osTop small,
  .osFormHeader small,
  .osList > header small,
  .osEmpty small {
    color: #315fe6;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.11em;
  }

  .osTop h1,
  .osEmpty h1 {
    margin: 7px 0;
    font-size: 38px;
  }

  .osTop p,
  .osList p,
  .osEmpty p {
    margin: 0;
    color: #61778d;
    line-height: 1.55;
  }

  .osTop nav {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  }

  .osTop a,
  .osList > header a,
  .osEmpty a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 11px 14px;
    border: 1px solid #c8d7e3;
    border-radius: 9px;
    background: #ffffff;
    color: #17436f;
    font-size: 13px;
    font-weight: 850;
    text-decoration: none;
  }

  .osNotice {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin: 22px 0 14px;
  }

  .osNotice > div {
    padding: 17px 19px;
    border-left: 5px solid #315fe6;
    border-radius: 11px;
    background: #ffffff;
  }

  .osNotice > div:last-child {
    border-left-color: #10a98a;
  }

  .osNotice strong {
    display: block;
    margin-bottom: 5px;
    color: #123b63;
  }

  .osNotice p {
    margin: 0;
    color: #60778d;
    font-size: 13px;
    line-height: 1.5;
  }

  .osStats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 18px;
  }

  .osStats article {
    padding: 18px;
    border: 1px solid #d2dfe8;
    border-radius: 13px;
    background: #ffffff;
  }

  .osStats span,
  .osStats strong,
  .osStats small {
    display: block;
  }

  .osStats span {
    color: #61778d;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.08em;
  }

  .osStats strong {
    margin: 7px 0 4px;
    color: #315fe6;
    font-size: 29px;
  }

  .osStats small {
    color: #708398;
    line-height: 1.4;
  }

  .osLayout {
    display: grid;
    grid-template-columns:
      minmax(420px, 0.82fr)
      minmax(0, 1.18fr);
    align-items: start;
    gap: 16px;
  }

  .osForm,
  .osList,
  .osEmpty {
    padding: 24px;
    border: 1px solid #cedce7;
    border-radius: 15px;
    background: #ffffff;
  }

  .osFormHeader {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 14px;
    margin-bottom: 20px;
  }

  .osFormHeader h2,
  .osList h2 {
    margin: 6px 0;
    color: #092746;
  }

  .osFormHeader p {
    margin: 0;
    color: #61778d;
    line-height: 1.5;
  }

  .osFormHeader > strong {
    padding: 8px 10px;
    border-radius: 8px;
    background: #edf3ff;
    color: #315fe6;
    font-size: 12px;
  }

  .osMessage {
    display: grid;
    gap: 4px;
    margin-bottom: 16px;
    padding: 13px 15px;
    border-radius: 9px;
  }

  .osMessage.error {
    border: 1px solid #efb6ab;
    background: #fff0ed;
    color: #a32d21;
  }

  .osMessage.success {
    border: 1px solid #a9ddc8;
    background: #e9f8f1;
    color: #087354;
  }

  .osGrid {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .osField {
    display: grid;
    align-content: start;
    gap: 7px;
    min-width: 0;
  }

  .osField > span {
    color: #244766;
    font-size: 13px;
    font-weight: 850;
  }

  .osField input,
  .osField select,
  .osField textarea {
    width: 100%;
    min-width: 0;
    min-height: 47px;
    padding: 12px 13px;
    border: 1px solid #bcd0df;
    border-radius: 8px;
    background: #fbfdff;
    color: #102d49;
    font: 15px Arial, sans-serif;
  }

  .osField textarea {
    min-height: 105px;
    resize: vertical;
  }

  .osField small,
  .osPrimary small {
    color: #718399;
    font-size: 11px;
    font-weight: 400;
    line-height: 1.45;
  }

  .osField.wide,
  .osSectionTitle.wide {
    grid-column: 1 / -1;
  }

  .osSectionTitle {
    margin-top: 7px;
    padding-top: 17px;
    border-top: 1px solid #dce5ec;
  }

  .osSectionTitle h3 {
    margin: 0;
    color: #123b63;
    font-size: 17px;
  }

  .osSectionTitle p {
    margin: 6px 0 0;
    color: #687e92;
    font-size: 12px;
    line-height: 1.5;
  }

  .osPrimary {
    display: flex;
    align-items: center;
    gap: 11px;
    min-height: 68px;
    padding: 12px 14px;
    border: 1px solid #bcd0df;
    border-radius: 9px;
    background: #f5f9fd;
    cursor: pointer;
  }

  .osPrimary input {
    width: 20px;
    height: 20px;
    accent-color: #315fe6;
  }

  .osPrimary span {
    display: grid;
    gap: 4px;
  }

  .osFormFooter {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 18px;
    margin-top: 22px;
    padding-top: 17px;
    border-top: 1px solid #dce5ec;
  }

  .osFormFooter span {
    max-width: 480px;
    color: #61778d;
    font-size: 12px;
    line-height: 1.5;
  }

  .osFormFooter button {
    min-height: 47px;
    padding: 12px 17px;
    border: 0;
    border-radius: 8px;
    background: #315fe6;
    color: #ffffff;
    font-weight: 900;
    cursor: pointer;
  }

  .osFormFooter button:disabled {
    opacity: 0.6;
    cursor: wait;
  }

  .osList > header {
    display: flex;
    justify-content: space-between;
    gap: 15px;
    margin-bottom: 11px;
  }

  .osSiteRows {
    display: grid;
  }

  .osList article {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 18px 0;
    border-top: 1px solid #dde6ed;
  }

  .osList article.selected {
    margin: 0 -12px;
    padding: 18px 12px;
    border-radius: 10px;
    background: #f2f6ff;
  }

  .osSiteIdentity {
    min-width: 0;
  }

  .osSiteReference {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 7px;
  }

  .osSiteReference span {
    color: #315fe6;
    font-size: 11px;
    font-weight: 900;
  }

  .osSiteReference i,
  .osSiteReference b {
    padding: 4px 7px;
    border-radius: 999px;
    font-size: 10px;
    font-style: normal;
  }

  .osSiteReference i {
    background: #eef3f8;
    color: #566f86;
  }

  .osSiteReference b {
    background: #e4f8f1;
    color: #087354;
  }

  .osSiteIdentity h3 {
    margin: 7px 0 5px;
    color: #0a2c4e;
  }

  .osSiteIdentity > p {
    margin: 0 0 10px;
    overflow-wrap: anywhere;
  }

  .osSitePeople {
    display: flex;
    flex-wrap: wrap;
    gap: 7px 18px;
  }

  .osSitePeople span {
    display: grid;
    gap: 2px;
    color: #61778d;
    font-size: 11px;
  }

  .osSitePeople strong {
    color: #294967;
  }

  .osSiteActions {
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .osSiteActions > span,
  .osSiteActions a,
  .osSiteActions button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 36px;
    padding: 8px 10px;
    border: 1px solid #c8d7e3;
    border-radius: 7px;
    background: #ffffff;
    color: #17436f;
    font-size: 11px;
    font-weight: 850;
    text-decoration: none;
    white-space: nowrap;
  }

  .osStatus.active {
    border-color: #a8dac7;
    background: #e9f8f1;
    color: #087354;
  }

  .osStatus.inactive {
    border-color: #e4c68d;
    background: #fff7e8;
    color: #8c5b07;
  }

  .osSiteActions button {
    color: #a32d21;
    cursor: pointer;
  }

  .osSiteActions button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .osNoSites {
    padding: 35px 20px;
    border: 1px dashed #bdcfdd;
    border-radius: 11px;
    text-align: center;
  }

  .osNoSites strong {
    display: block;
    margin-bottom: 7px;
  }

  .osEmpty {
    max-width: 700px;
    margin: 80px auto;
  }

  .osEmpty a {
    margin-top: 12px;
  }

  .osPage :is(
    a,
    button,
    input,
    select,
    textarea
  ):focus-visible {
    outline: 3px solid #19a7b3;
    outline-offset: 3px;
  }

  @media (max-width: 1100px) {
    .osLayout {
      grid-template-columns: 1fr;
    }

    .osStats {
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 760px) {
    .osPage {
      padding: 20px 13px 60px;
    }

    .osTop {
      display: grid;
    }

    .osTop nav {
      justify-content: flex-start;
    }

    .osTop h1 {
      font-size: 31px;
    }

    .osNotice,
    .osStats,
    .osGrid {
      grid-template-columns: 1fr;
    }

    .osField.wide,
    .osSectionTitle.wide {
      grid-column: auto;
    }

    .osFormFooter,
    .osList article,
    .osList > header {
      align-items: stretch;
      flex-direction: column;
    }

    .osSiteActions {
      flex-wrap: wrap;
      align-items: stretch;
    }

    .osSiteActions > span,
    .osSiteActions a,
    .osSiteActions form,
    .osSiteActions button {
      flex: 1 1 auto;
    }

    .osSiteActions button {
      width: 100%;
    }
  }
`;
