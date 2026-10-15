"use client";

import { useActionState } from "react";

export default function SiteProfileForm({
  action,
  site,
  people = [],
}) {
  const [
    state,
    formAction,
    pending,
  ] = useActionState(
    action,
    null,
  );

  const textField = (
    name,
    label,
    {
      required = false,
      type = "text",
      placeholder = "",
      maxLength = 180,
    } = {},
  ) => (
    <label className="osField">
      <span>
        {label}
        {required ? " *" : ""}
      </span>

      <input
        name={name}
        type={type}
        defaultValue={
          site?.[name] || ""
        }
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
      />
    </label>
  );

  const personField = (
    name,
    label,
    guidance,
  ) => (
    <label className="osField">
      <span>{label}</span>

      <select
        name={name}
        defaultValue={
          site?.[name] || ""
        }
      >
        <option value="">
          Not assigned
        </option>

        {people.map(
          (person) => {
            const personName =
              [
                person.first_name,
                person.last_name,
              ]
                .filter(Boolean)
                .join(" ") ||
              person.email ||
              "Unnamed company user";

            return (
              <option
                key={person.id}
                value={person.id}
              >
                {personName}
                {person.position
                  ? ` · ${person.position}`
                  : ""}
              </option>
            );
          },
        )}
      </select>

      <small>{guidance}</small>
    </label>
  );

  return (
    <form
      action={formAction}
      className="osForm"
    >
      <input
        type="hidden"
        name="id"
        value={site?.id || ""}
      />

      <header className="osFormHeader">
        <div>
          <small>
            CONTROLLED SITE RECORD
          </small>

          <h2>
            {site
              ? "Edit Site Profile"
              : "Add Site Profile"}
          </h2>

          <p>
            Maintain the controlled
            location used throughout
            the RPG Excellence
            platform.
          </p>
        </div>

        {site?.site_reference && (
          <strong>
            {site.site_reference}
          </strong>
        )}
      </header>

      {state?.error && (
        <div
          className="osMessage error"
          role="alert"
        >
          <strong>
            Site Profile was not saved
          </strong>

          <span>{state.error}</span>
        </div>
      )}

      {state?.success && (
        <div
          className="osMessage success"
          role="status"
        >
          <strong>
            Site Profile saved
          </strong>

          <span>{state.success}</span>
        </div>
      )}

      <div className="osGrid">
        {textField(
          "site_reference",
          "Site reference",
          {
            placeholder:
              "Automatically assigned if blank",
            maxLength: 60,
          },
        )}

        {textField(
          "site_name",
          "Controlled site name",
          {
            required: true,
            placeholder:
              "For example: Cambridge Operations Centre",
          },
        )}

        <label className="osField">
          <span>Site type *</span>

          <select
            name="site_type"
            defaultValue={
              site?.site_type ||
              "operational_site"
            }
            required
          >
            <option value="registered_office">
              Registered office
            </option>

            <option value="operational_site">
              Operational site
            </option>

            <option value="office">
              Office
            </option>

            <option value="warehouse">
              Warehouse
            </option>

            <option value="laboratory">
              Laboratory
            </option>

            <option value="remote_site">
              Remote site
            </option>

            <option value="client_site">
              Client site
            </option>

            <option value="other">
              Other
            </option>
          </select>
        </label>

        <label className="osField">
          <span>Operating status *</span>

          <select
            name="status"
            defaultValue={
              site?.status ||
              "active"
            }
            required
          >
            <option value="active">
              Active
            </option>

            <option value="inactive">
              Inactive
            </option>
          </select>

          <small>
            Inactive sites remain in
            controlled history but
            cannot be selected for new
            records.
          </small>
        </label>

        <label className="osPrimary">
          <input
            type="checkbox"
            name="is_primary"
            value="true"
            defaultChecked={Boolean(
              site?.is_primary,
            )}
          />

          <span>
            <strong>
              Primary company site
            </strong>

            <small>
              Only one active primary
              site is permitted for
              each organisation.
            </small>
          </span>
        </label>

        <div />

        <div className="osSectionTitle wide">
          <h3>
            Controlled address
          </h3>

          <p>
            These details become the
            location source used by
            audits, risk assessments,
            permits, assets, MOC and
            continuity planning.
          </p>
        </div>

        {textField(
          "address_line_1",
          "Address line 1",
          {
            placeholder:
              "Building and street",
          },
        )}

        {textField(
          "address_line_2",
          "Address line 2",
        )}

        {textField(
          "city",
          "Town or city",
        )}

        {textField(
          "region",
          "Region, county or state",
        )}

        {textField(
          "postal_code",
          "Postcode or ZIP code",
          {
            maxLength: 40,
          },
        )}

        {textField(
          "country",
          "Country",
          {
            maxLength: 100,
          },
        )}

        {textField(
          "timezone",
          "Time zone",
          {
            placeholder:
              "For example: Europe/London",
            maxLength: 100,
          },
        )}

        <div className="osSectionTitle wide">
          <h3>
            Site contact details
          </h3>

          <p>
            General contact information
            for the physical or
            operational location.
          </p>
        </div>

        {textField(
          "main_phone",
          "Main telephone",
          {
            type: "tel",
            maxLength: 60,
          },
        )}

        {textField(
          "general_email",
          "General site email",
          {
            type: "email",
          },
        )}

        <div className="osSectionTitle wide">
          <h3>
            Site accountability
          </h3>

          <p>
            Assign controlled
            responsibilities from
            active Company Users.
          </p>
        </div>

        {personField(
          "site_owner_person_id",
          "Accountable site owner",
          "Person accountable for the site and its operating controls.",
        )}

        {personField(
          "site_manager_person_id",
          "Site manager",
          "Person responsible for day-to-day site management.",
        )}

        {personField(
          "hse_contact_person_id",
          "Health and safety contact",
          "Named Company User coordinating local H&S requirements.",
        )}

        <label className="osField wide">
          <span>Site notes</span>

          <textarea
            name="notes"
            defaultValue={
              site?.notes || ""
            }
            rows="5"
            maxLength="2000"
            placeholder="Record relevant operating boundaries, access arrangements or site-specific information."
          />
        </label>
      </div>

      <footer className="osFormFooter">
        <span>
          This record is shared by
          connected operational
          modules. The BCP assessment
          will add continuity-specific
          information separately.
        </span>

        <button
          type="submit"
          disabled={pending}
        >
          {pending
            ? "Saving…"
            : site
              ? "Update Site Profile"
              : "Add Site Profile"}
        </button>
      </footer>
    </form>
  );
}
