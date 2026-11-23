export const PERMITS_ROOT = "/portal/health-safety/permits";
export const PERMIT_AUTHORISATION = new Set(["awaiting_verification", "awaiting_acceptance", "handover_required"]);
export const PERMIT_FINAL = new Set(["closed", "cancelled"]);

const normalizeLocation = value => String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();

export function permitMatchesZone(permit, zone) {
  const area = normalizeLocation(permit.work_area);
  return Boolean(area && permit.organization_id === zone.organization_id &&
    permit.administration_location_id === zone.site_id &&
    (zone.matches ?? [zone.reference, zone.name]).some(value => normalizeLocation(value) === area));
}

export function permitOverlaps(permits, now) {
  const areas = new Map();
  for (const row of permits) {
    const from = Date.parse(row.valid_from);
    const end = Date.parse(row.valid_until);
    if (!row.organization_id || !row.administration_location_id ||
      !(PERMIT_AUTHORISATION.has(row.status) || row.status === "issued") ||
      !Number.isFinite(from) || !Number.isFinite(end) || Math.max(from, now) >= end) continue;
    const area = normalizeLocation(row.work_area);
    const asset = row.organization_asset_id;
    for (const [kind, key] of [["area", area], ["asset", asset]]) {
      if (!key) continue;
      const scope = JSON.stringify([row.organization_id, row.administration_location_id, kind, key]);
      if (!areas.has(scope)) areas.set(scope, []);
      areas.get(scope).push({ row, from, end });
    }
  }
  const pairs = new Map();
  for (const records of areas.values()) {
    records.sort((a, b) => a.from - b.from);
    records.forEach((a, index) => {
      for (let next = index + 1; next < records.length; next++) {
        const b = records[next];
        if (b.from >= a.end) break;
        const starts = Math.max(a.from, b.from, now);
        const ends = Math.min(a.end, b.end);
        const key = JSON.stringify([a.row.id, b.row.id].sort());
        if (starts < ends) pairs.set(key, { a: a.row, b: b.row, starts, ends });
      }
    });
  }
  return [...pairs.values()].sort((a, b) => a.starts - b.starts);
}
