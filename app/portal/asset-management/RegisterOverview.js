import Link from "next/link";
import { assetFilterValues, assetName, assetWords, filterCompanyAssets } from "../../../lib/asset-dashboard";
import { RecordIcon } from "../../../components/DocumentRecordTabs";
import s from "./asset-management.module.css";

const ROOT = "/portal/asset-management/register";
const statuses = [["active", "Operational", "#248052"], ["out_of_service", "Out of service", "#8f6219"], ["retired", "Retired", "#667b94"]];
const criticalities = [["low", "Low", "#6e9e51"], ["medium", "Medium", "#e5aa27"], ["high", "High", "#c86239"], ["critical", "Critical", "#ae3434"]];

export function AssetFacet({ name, title, options, values }) {
  return <fieldset className={s.assetFacet}><legend>{title}</legend><details>
    <summary>{values.length ? values.length + " selected" : "All"}</summary>
    <div>{options.map(([value, label]) => <label key={value}><input type="checkbox" name={name} value={value}
      defaultChecked={values.includes(value)}/>{label}</label>)}</div>
  </details></fieldset>;
}

export function exportAssetRows(assets, people) {
  return assets.map(asset => [asset.asset_reference, asset.asset_name, asset.serial_number, asset.site_location_label,
    assetName(people.get(asset.asset_owner_person_id)), assetWords(asset.criticality),
    asset.operational_status === "active" ? "Operational" : assetWords(asset.operational_status),
    asset.ppm_required ? asset.next_maintenance_date : "Not required"]);
}

export default function RegisterOverview({ assets, maintenance, mocs, query = {}, today }) {
  const now = new Date(today + "T12:00:00Z");
  const scope = filterCompanyAssets(assets, { ...query, focus: "" }, now);
  const withoutStatus = filterCompanyAssets(assets, { ...query, focus: "", status: "" }, now);
  const withoutCriticality = filterCompanyAssets(assets, { ...query, focus: "", criticality: "" }, now);
  const ids = new Set(scope.map(asset => asset.id));
  const overdueWork = maintenance.filter(row => ids.has(row.asset_id) && row.status === "planned" && row.scheduled_date && row.scheduled_date < today);
  const ppm = focus => filterCompanyAssets(scope, { focus, days: 30 }, now).length;
  const build = update => {
    const params = new URLSearchParams();
    for (const key of ["q", "site", "type", "owner", "days", "status", "criticality", "focus"]) {
      const values = assetFilterValues(Object.hasOwn(update, key) ? update[key] : query[key]);
      values.forEach(value => params.append(key, value));
    }
    return params.size ? ROOT + "?" + params.toString() : ROOT;
  };
  const activate = key => build({ focus: query.focus === key ? "" : key, ...(key === "due" || key === "ppm_current" ? { days: 30 } : {}) });
  const toggle = (key, value) => {
    const values = assetFilterValues(query[key]);
    return build({ [key]: values.includes(value) ? values.filter(item => item !== value) : [...values, value] });
  };
  const distributed = statuses.map(([key, label, colour]) =>
    [key, label, colour, withoutStatus.filter(row => row.operational_status === key).length]);
  let edge = 0;
  const total = distributed.reduce((sum, item) => sum + item[3], 0);
  const stops = distributed.filter(item => item[3]).map(([, , colour, count]) => {
    const start = edge;
    edge += count / total * 100;
    return colour + " " + start + "% " + edge + "%";
  });
  const knownCriticalities = new Set(criticalities.map(item => item[0]));
  const ratings = criticalities.map(([key, label, colour]) =>
    [key, label, colour, withoutCriticality.filter(row => row.criticality === key).length]);
  const other = withoutCriticality.filter(row => !knownCriticalities.has(row.criticality));
  for (const key of new Set(other.map(row => row.criticality || "unassigned"))) {
    ratings.push([key, key === "unassigned" ? "Not recorded" : assetWords(key), "#73889b",
      other.filter(row => (row.criticality || "unassigned") === key).length]);
  }
  const max = Math.max(1, ...ratings.map(item => item[3]));
  const lifecycle = [
    ["ppm_current", "PPM up to date", ppm("ppm_current"), "checkCircle"],
    ["due", "PPM due in 30 days", ppm("due"), "calendar"],
    ["overdue", "Overdue PPM", ppm("overdue"), "alert"],
    ["missing", "PPM due date missing", ppm("missing"), "calendar"],
    ["linked_moc", "Assets linked to MoC", mocs ? new Set(mocs.filter(row => ids.has(row.organization_asset_id)).map(row => row.organization_asset_id)).size : null, "workflow"],
  ];
  return <>
    <section className={s.registerKpis} aria-label="Asset register indicators">
      {[
        ["", "Total assets", scope.length, "Register records", "clipboard", "blue"],
        ["active", "Operational assets", ppm("active"), "Recorded operational status", "checkCircle", "green"],
        ["orders_overdue", "Overdue work orders", overdueWork.length, "Planned work past its scheduled date", "alert", "red"],
        ["overdue", "Overdue PPM requirements", ppm("overdue"), "Recurring requirements past their due date", "calendar", "amber"],
      ].map(([key, label, count, note, icon, tone]) => <Link key={label} href={activate(key)} data-selected={(query.focus || "") === key} data-tone={tone}>
        <RecordIcon name={icon}/><div><strong>{count}</strong><b>{label}</b><small>{note}</small></div>
      </Link>)}
    </section>
    <div className={s.assetAnalytics}>
      <section><h2><RecordIcon name="matrix"/> Asset status</h2><p>Recorded operational availability. Select a status to filter the register.</p>
        <div className={s.assetStatusChart}>
          <div className={s.assetRing} style={{ background: stops.length ? "conic-gradient(" + stops.join(",") + ")" : undefined }} aria-hidden="true"><span><b>{total}</b>Assets</span></div>
          <div className={s.assetLegend}>{distributed.map(([key, label, colour, count]) =>
            <Link href={toggle("status", key)} key={key} data-selected={assetFilterValues(query.status).includes(key)}>
              <i style={{ background: colour }}/><span>{label}</span><b>{count}{total ? " (" + Math.round(count / total * 100) + "%)" : ""}</b>
            </Link>)}</div>
        </div>
      </section>
      <section><h2><RecordIcon name="matrix"/> Asset criticality</h2><p>Select a rating to filter the register.</p>
        <div className={s.assetBars}>{ratings.map(([key, label, colour, count]) =>
          <Link href={toggle("criticality", key)} key={key} aria-label={label + " criticality, " + count + " assets"}
            data-selected={assetFilterValues(query.criticality).includes(key)}>
            <b>{count}</b><span className={s.assetTrack}><i style={{ height: count / max * 100 + "%", background: colour }}/></span><span>{label}</span>
          </Link>)}</div>
      </section>
      <section><h2><RecordIcon name="history"/> Lifecycle actions</h2><p>Select a category to see its assets.</p>
        <div className={s.assetLegend}>{lifecycle.map(([key, label, count, icon]) => count == null
          ? <span key={key}><RecordIcon name={icon}/>{label}<b>N/A</b></span>
          : <Link href={activate(key)} key={key} data-selected={query.focus === key} data-lifecycle={key}><RecordIcon name={icon}/><span>{label}</span><b>{count}</b></Link>)}</div>
      </section>
    </div>
    <details className={s.assetDefinitions}><summary>How overdue work and recurring PPM are counted</summary>
      <p>Overdue work orders count planned records with a scheduled date before today. Overdue PPM counts operational assets with a recurring requirement and a recorded next PPM date before today. Missing PPM dates are tracked separately.</p>
      <p>Charts use the current search and filters. Each distribution shows all categories for its own filter. Scheduling work leaves the recorded operational status in place.</p>
    </details>
  </>;
}

