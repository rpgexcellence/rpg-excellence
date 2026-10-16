"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export default function InternalAuditSiteField({
  organizations = [],
  initialOrganizationId = "",
  initialLocationId = "",
  initialLabel = "",
}) {
  const [organizationId, setOrganizationId] = useState(
    initialOrganizationId || organizations[0]?.id || "",
  );
  const [locationId, setLocationId] = useState(initialLocationId);

  const locations = useMemo(
    () =>
      organizations.find((item) => item.id === organizationId)
        ?.locations ?? [],
    [organizationId, organizations],
  );

  const selected = locations.find(
    (item) => item.id === locationId,
  );

  return (
    <>
      <label className="iaField">
        <span>Organisation *</span>

        <select
          name="organization_id"
          value={organizationId}
          onChange={(event) => {
            setOrganizationId(event.target.value);
            setLocationId("");
          }}
          required
        >
          <option value="" disabled>
            Select organisation
          </option>

          {organizations.map((organization) => (
            <option value={organization.id} key={organization.id}>
              {organization.name}
            </option>
          ))}
        </select>
      </label>

      <label className="iaField">
        <span>Site / location *</span>

        <select
          name="administration_location_id"
          value={locationId}
          onChange={(event) => setLocationId(event.target.value)}
          required
        >
          <option value="" disabled>
            {locations.length
              ? "Select controlled Site Profile"
              : "No active Site Profiles available"}
          </option>

          {initialLocationId && initialLabel && !selected ? (
            <option value={initialLocationId} disabled>
              {initialLabel} · previous location — select a current site
            </option>
          ) : null}

          {locations.map((location) => (
            <option value={location.id} key={location.id}>
              {location.label}
            </option>
          ))}
        </select>

        <input
          type="hidden"
          name="administration_location_label"
          value={selected?.label ?? ""}
        />

        <small>
          Controlled from{" "}
          <Link href="/portal/company/sites">
            Administration → Site Profile
          </Link>
          .
        </small>
      </label>
    </>
  );
}
