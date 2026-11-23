"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RecordIcon } from "../../../../components/DocumentRecordTabs";
import { PERMIT_TYPES } from "../../../../lib/permitControlRules";
import { currentPermitControls, permitAuthorityWithControls, PERMIT_STATUSES } from "../../../../lib/permitLifecycle";
import { PERMIT_AUTHORISATION, PERMIT_FINAL, PERMITS_ROOT, permitOverlaps } from "../../../../lib/permit-register.mjs";
import { UUID } from "../../../../lib/zone-policy.mjs";
import s from "./permit-register.module.css";
import p from "../powra/powra.module.css";

const categories = new Map(PERMIT_TYPES.map(item => [item.value, item.label]));
const date = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" });
const time = value => Number.isFinite(typeof value === "number" ? value : Date.parse(value)) ? date.format(new Date(value)) : "Not recorded";
const emptyFilters = { search: "", category: "", site: "", status: "" };
const viewNames = {
  all: "All permits", draft: "Draft", pending: "Awaiting authorisation", active: "Active", expiring: "Due to expire",
  scheduled: "Scheduled", suspended: "Suspended", expired: "Expired", closeout: "Awaiting close-out", closed: "Closed",
  cancelled: "Cancelled", unconfirmed: "Authority unconfirmed",
};
const tiles = [
  ["all", "Total permits", "blue", "clipboard"], ["active", "Active", "green", "checkCircle"],
  ["expiring", "Due to expire", "amber", "calendar", "Within 24 hours"],
  ["pending", "Awaiting authorisation", "blue", "distribution"],
  ["suspended", "Suspended", "red", "alert"], ["closeout", "Awaiting close-out", "amber", "scope", "Includes expired permits"],
];

function zoneToken(value) {
  if (UUID.test(value.trim())) return value.trim();
  try {
    const url = new URL(value.trim());
    const token = url.pathname.match(/^\/area\/([^/]+)\/?$/)?.[1];
    return ["www.rpgexcellence.com", "rpgexcellence.com", window.location.hostname].includes(url.hostname) && UUID.test(token || "") ? token : "";
  } catch { return ""; }
}

function exportPermits(rows) {
  const quote = value => {
    const string = String(value ?? "");
    const safe = /^[=+@-]/.test(string.trimStart()) || /^[\t\r\n]/.test(string) ? "'" + string : string;
    return '"' + safe.replaceAll('"', '""') + '"';
  };
  const records = [["Reference", "Work", "Permit type", "Site", "Work area", "Issuer", "Person in charge", "Valid from (UK)", "Valid until (UK)", "Status"],
    ...rows.map(row => [row.permit_reference, row.task_description, categories.get(row.permit_type), row.site_location, row.work_area,
      row.issuer_name, row.receiver_name, time(row.valid_from), time(row.valid_until), PERMIT_STATUSES[row.state]?.label])];
  const url = URL.createObjectURL(new Blob([records.map(row => row.map(quote).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "permit-register.csv";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function PermitLink({ row }) {
  return <Link href={PERMITS_ROOT + "/" + row.id}>{row.permit_reference}</Link>;
}

export default function PermitRegister({ permits, initialTime, zone, rejectedZone }) {
  const router = useRouter();
  const [now, setNow] = useState(initialTime);
  const [view, setView] = useState("all");
  const [filters, setFilters] = useState(emptyFilters);
  const [zoneInput, setZoneInput] = useState("");
  const [zoneError, setZoneError] = useState("");
  useEffect(() => {
    const base = performance.now();
    const tick = () => setNow(initialTime + performance.now() - base);
    tick();
    const clock = setInterval(tick, 1000);
    const updates = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, 60000);
    const refresh = () => { tick(); router.refresh(); };
    window.addEventListener("focus", refresh);
    return () => { clearInterval(clock); clearInterval(updates); window.removeEventListener("focus", refresh); };
  }, [router, initialTime]);

  const rows = permits.map(row => {
    const controls = currentPermitControls(row.evidence, now);
    return { ...row, ...controls, state: permitAuthorityWithControls(row, controls, now) };
  });
  const matches = {
    all: () => true, active: row => row.state === "issued",
    pending: row => PERMIT_AUTHORISATION.has(row.state),
    expiring: row => row.state === "issued" && Date.parse(row.valid_until) - now <= 86400000,
    closeout: row => ["expired", "awaiting_handback"].includes(row.state),
    unconfirmed: row => row.state === "authority_unconfirmed",
    isolation: row => row.isolationGap && !PERMIT_FINAL.has(row.state) && row.state !== "draft",
    atmosphere: row => row.atmosphereGap && !PERMIT_FINAL.has(row.state) && row.state !== "draft",
    competence: row => !row.competenceRecorded && !PERMIT_FINAL.has(row.state) && row.state !== "draft",
    emergency: row => !row.emergencyRecorded && !PERMIT_FINAL.has(row.state) && row.state !== "draft",
  };
  const inView = (row, key) => matches[key]?.(row) ?? row.state === key;
  const count = key => rows.filter(row => inView(row, key)).length;
  const shown = rows.filter(row => inView(row, view) && (!filters.category || filters.category === row.permit_type) &&
    (!filters.site || filters.site === row.site_location) && (!filters.status || filters.status === row.state) &&
    [row.permit_reference, row.task_description, row.site_location, row.work_area, row.asset_reference, row.issuer_name, row.receiver_name, row.contractor_company]
      .join(" ").toLowerCase().includes(filters.search.trim().toLowerCase()));
  const overlaps = permitOverlaps(rows, now);

  function queue(label, key, tone) {
    return <button type="button" className={s.queue + " " + s[tone]} aria-pressed={view === key} onClick={() => { setFilters(emptyFilters); setView(key); }}>
      <span>{label}</span><strong>{count(key)}</strong>
    </button>;
  }
  function openZone(event) {
    event.preventDefault();
    const token = zoneToken(zoneInput);
    if (!token) { setZoneError("Enter an RPG Excellence workplace zone link or code."); return; }
    setZoneError("");
    setView("all");
    setFilters(emptyFilters);
    router.push(PERMITS_ROOT + "?zone=" + encodeURIComponent(token));
  }

  return <main className={p.page}>
    <p className={p.crumb}><Link href="/portal/health-safety">Health &amp; Safety Hub</Link> / Permit to Work</p>
    <header className={p.hero}>
      <div className={p.identity}><span className={p.iconBox}><RecordIcon name="permit"/></span>
        <div><h1>Permit Control Centre</h1><p>Work authorisation, critical controls and safe handback.</p></div></div>
      <div className={p.actions}>
        <Link className={p.button} href="/portal/tasks?module=permit"><RecordIcon name="distribution"/>My Tasks &amp; Approvals</Link>
        <a className={p.button} href="#zone-access" onClick={() => { document.getElementById("zone-access").open = true; }}><RecordIcon name="qr"/>Zone QR</a>
        <Link className={p.primary} href={PERMITS_ROOT + "/new"}><RecordIcon name="documents"/>New permit</Link>
      </div>
    </header>
    <details className={p.panel} id="zone-access" open={zone || rejectedZone ? true : undefined}>
      <summary><RecordIcon name="qr"/> Workplace zone access</summary>
      <form className={s.zone} onSubmit={openZone}>
        <label>Zone QR link or code<input value={zoneInput} onChange={event => setZoneInput(event.target.value)} required/></label>
        <button className={p.primary}>Find permits</button>
      </form>
      <p className={s.muted}>Scan a zone poster with your phone or paste its link. Results match the published zone name or reference in the permit’s work area at the same site.</p>
      {zoneError && <p role="alert">{zoneError}</p>}
      {zone && <p><strong>{zone.reference} · {zone.name}</strong> <Link href={PERMITS_ROOT}>Clear zone</Link></p>}
      {rejectedZone && <p role="status">This workplace zone is unavailable for this account. <Link href={PERMITS_ROOT}>View your permits</Link></p>}
    </details>

    <section className={s.tiles} aria-label="Permit indicators">
      {tiles.map(([key, label, tone, icon, hint]) => <button key={key} className={p.metric + " " + s.tile + " " + s[tone]} aria-pressed={view === key} onClick={() => { setFilters(emptyFilters); setView(key); }}>
        <span className={p.metricIcon}><RecordIcon name={icon}/></span><span className={p.metricContent}><strong>{count(key)}</strong>{label}{hint && <small>{hint}</small>}</span>
      </button>)}
    </section>

    <div className={s.insights}>
      <section className={p.panel}><h2><RecordIcon name="calendar"/>Validity &amp; close-out</h2>
        {queue("Expired · handback outstanding", "expired", "red")}
        {queue("Handback requested", "awaiting_handback", "blue")}
        {queue("Authority unconfirmed", "unconfirmed", "amber")}
      </section>
      <section className={p.panel}><h2><RecordIcon name="alert"/>Simultaneous operations</h2>
        <p className={s.muted}>Potential overlaps by work area or shared asset. Review with the permit issuer.</p>
        {overlaps.length ? <ul className={s.conflicts}>{overlaps.slice(0, 5).map(({ a, b, starts, ends }) =>
          <li key={a.id + b.id}><PermitLink row={a}/> and <PermitLink row={b}/><small>{time(starts)} to {time(ends)} · {a.site_location}</small></li>)}</ul> :
          <p className={s.notice}>No overlaps detected among visible permits with matching location or asset records.</p>}
        {overlaps.length > 5 && <details><summary>Show {overlaps.length - 5} further overlaps</summary><ul className={s.conflicts}>
          {overlaps.slice(5).map(({ a, b, starts, ends }) => <li key={a.id+b.id}><PermitLink row={a}/> and <PermitLink row={b}/><small>{time(starts)} to {time(ends)} · {a.site_location}</small></li>)}
        </ul></details>}
      </section>
      <section className={p.panel}><h2><RecordIcon name="scope"/>Critical controls</h2>
        {queue("Isolation evidence needs review", "isolation", "amber")}
        {queue("Atmospheric tests need review", "atmosphere", "red")}
        {queue("Emergency arrangements missing", "emergency", "blue")}
        {queue("Competence briefing not recorded", "competence", "amber")}
      </section>
    </div>

    <section className={p.panel} aria-labelledby="permit-register">
      <h2 id="permit-register"><RecordIcon name="clipboard"/>Permit register</h2>
      <div className={p.tabs} role="group" aria-label="Permit status views">
        {Object.entries(viewNames).map(([key,label]) => <button key={key} aria-current={view === key ? "page" : undefined} onClick={() => { setView(key); setFilters(previous => ({ ...previous, status: "" })); }}>{label} ({count(key)})</button>)}
      </div>
      <div className={s.filters}>
        <label>Search<input type="search" placeholder="Reference, work, location or person" value={filters.search} onChange={event => setFilters({ ...filters, search: event.target.value })}/></label>
        <label>Permit type<select value={filters.category} onChange={event => setFilters({ ...filters, category: event.target.value })}><option value="">All types</option>
          {PERMIT_TYPES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label>Site<select value={filters.site} onChange={event => setFilters({ ...filters, site: event.target.value })}><option value="">All sites</option>
          {[...new Set(rows.map(row => row.site_location).filter(Boolean))].sort().map(site => <option key={site}>{site}</option>)}</select></label>
        <label>Status<select value={filters.status} onChange={event => setFilters({ ...filters, status: event.target.value })}><option value="">All statuses</option>
          {Object.entries(PERMIT_STATUSES).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select></label>
        <button className={p.button} onClick={() => { setFilters(emptyFilters); setView("all"); }}>Clear filters</button>
      </div>
      <div className={s.results}><span role="status">{shown.length} of {rows.length} permits</span>
        <button className={p.button} disabled={!shown.length} onClick={() => exportPermits(shown)}><RecordIcon name="download"/>Export CSV</button></div>
      {shown.length ? <div className={p.tableWrap}><table className={p.table}>
        <thead><tr>{["Permit / work","Category","Work location","Issuer / person in charge","Validity (UK)","Status / authority","Critical controls"].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
        <tbody>{shown.map(row => {
          const state = PERMIT_STATUSES[row.state];
          return <tr key={row.id}>
            <td data-label="Permit / work"><PermitLink row={row}/><small>{row.task_description}</small></td>
            <td data-label="Category">{categories.get(row.permit_type) || row.permit_type}</td>
            <td data-label="Work location">{row.site_location}<small>{[row.work_area,row.asset_reference].filter(Boolean).join(" · ")}</small></td>
            <td data-label="Issuer / person in charge">{row.issuer_name}<small>{row.receiver_name || "Person in charge not recorded"}</small></td>
            <td data-label="Validity (UK)">{time(row.valid_from)}<small>Until {time(row.valid_until)}</small></td>
            <td data-label="Status / authority"><span className={s.badge + " " + (s[state?.tone] || s.blue)}>{state?.label || "Status requires review"}</span>
              <small>{row.state === "issued" ? "Issued within validity window" : "No current work authority"}</small></td>
            <td data-label="Critical controls"><small>Isolation · {row.isolation}</small><small>Gas testing · {row.atmosphere}</small>
              <small>Competence briefing · {row.competenceRecorded ? "Recorded" : "Not recorded"}</small><small>Emergency arrangements · {row.emergencyRecorded ? "Recorded" : "Not recorded"}</small>
              <Link href={PERMITS_ROOT + "/" + row.id + "/controls"}>Open controls</Link></td>
          </tr>;
        })}</tbody>
      </table></div> : <p className={s.notice}>{rows.length ? "No permits match these filters." : "No permits are visible in this view."}</p>}
    </section>
  </main>;
}
