"use client";

import { useState } from "react";
import Link from "next/link";
import { RecordIcon } from "../../../../components/DocumentRecordTabs";
import { fieldworkOutcome, inspectionPerformance, openFinding } from "../../../../lib/workplace-inspection-overview.mjs";
import { InspectionTable } from "./InspectionRegister";
import p from "../powra/powra.module.css";
import s from "./inspection-overview.module.css";

const options = [
  ["onTime", "On time", "#087757"],
  ["late", "Late", "#b67817"],
  ["unmeasured", "No scheduled end", "#71869b"],
];
const findingStatuses = [
  ["open", "Open", "#b67817"],
  ["closed", "Closed", "#087757"],
  ["cancelled", "Cancelled", "#71869b"],
];
const londonMonth = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit" });
const monthLabel = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", month: "short" });
const day = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", dateStyle: "medium" });
const formatDate = value => Number.isFinite(Date.parse(value)) ? day.format(new Date(value)) : "Not recorded";
const monthKey = value => londonMonth.format(new Date(value));
function monthBuckets(now, months) {
  const [month, year] = monthKey(now).split("/").map(Number);
  return Array.from({ length: months }, (_, index) => {
    const date = new Date(Date.UTC(year, month - months + index, 15));
    return { key: monthKey(date), label: monthLabel.format(date) };
  });
}

export default function InspectionPerformance({ inspections, findings, overdueActions, asOf, root }) {
  const [months, setMonths] = useState(6);
  const [site, setSite] = useState("");
  const [selection, setSelection] = useState(null);
  const buckets = monthBuckets(asOf, months);
  const monthKeys = new Set(buckets.map(bucket => bucket.key));
  const inPeriod = value => Number.isFinite(Date.parse(value)) &&
    Date.parse(value) <= asOf && monthKeys.has(monthKey(value));
  const selectSite = row => !site || row.siteKey === site;
  const siteOptions = new Map([...inspections, ...findings, ...overdueActions].map(row => [row.siteKey, row.site]));
  const sites = [...siteOptions].sort((a, b) => a[1].localeCompare(b[1], "en-GB"));
  const scopedInspections = inspections.filter(selectSite);
  const scopedFindings = findings.filter(row => selectSite(row) && inPeriod(row.created_at));
  const overdue = overdueActions.filter(selectSite);
  const { submitted, repeats } = inspectionPerformance(scopedInspections, scopedFindings, asOf, inPeriod);
  const byOutcome = { onTime: [], late: [], unmeasured: [] };
  const byMonth = new Map(buckets.map(month => [month.key, []]));
  for (const record of submitted) {
    const outcome = fieldworkOutcome(record);
    const item = { ...record, outcome };
    byOutcome[outcome].push(item);
    byMonth.get(monthKey(record.completed_at)).push(item);
  }
  const byStatus = {
    open: scopedFindings.filter(openFinding),
    closed: scopedFindings.filter(row => row.status === "closed"),
    cancelled: scopedFindings.filter(row => row.status === "cancelled"),
  };
  const comparable = byOutcome.onTime.length + byOutcome.late.length;
  const onTime = comparable ? Math.round(100 * byOutcome.onTime.length / comparable) : null;
  const maxStatus = Math.max(1, ...Object.values(byStatus).map(rows => rows.length));
  const maxMonth = Math.max(1, ...[...byMonth.values()].map(rows => rows.length));
  const recurringIds = new Set(repeats.flatMap(row => row.findingIds));
  function choose(group, key, label) {
    setSelection(selection?.group === group && selection.key === key ? null : { group, key, label });
  }
  function button(group, key, label) {
    return { type: "button", "aria-pressed": selection?.group === group && selection.key === key, onClick: () => choose(group, key, label) };
  }
  const drill = selection && {
    outcome: () => byOutcome[selection.key],
    month: () => byMonth.get(selection.key),
    status: () => byStatus[selection.key],
    repeat: () => scopedFindings.filter(row => recurringIds.has(row.id)),
    overdue: () => overdue,
  }[selection.group]();

  return <section className={p.panel + " " + s.dashboard} aria-label="Workplace inspection performance">
    <div className={s.dashboardHead}>
      <h2><RecordIcon name="matrix"/>Workplace inspection performance</h2>
      <div className={s.chartScope}>
        <label>Period<select value={months} onChange={event => { setMonths(Number(event.target.value)); setSelection(null); }}>
          <option value={6}>Last 6 months</option><option value={3}>Last 3 months</option>
        </select></label>
        <label>Site<select value={site} onChange={event => { setSite(event.target.value); setSelection(null); }}>
          <option value="">All sites</option>{sites.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
      </div>
    </div>
    <div className={s.charts}>
      <article className={s.chart}>
        <h3>Fieldwork completion</h3>
        <div className={s.ringRow}>
          <div className={s.donut} style={{ background: onTime === null ? "#dae5ef" : "conic-gradient(#087757 " + onTime + "%, #d89931 0)" }}>
            <div><strong>{onTime === null ? "—" : onTime + "%"}</strong><span>On time</span></div>
          </div>
          <div className={s.chartLegend}>{options.map(([key, label, colour]) => <button key={key} {...button("outcome", key, label)}>
            <span className={s.chartDot} style={{ background: colour }}/>{label}<strong>{byOutcome[key].length}</strong>
          </button>)}</div>
        </div>
      </article>
      <article className={s.chart}>
        <h3>Findings by current status <small>· {scopedFindings.length} total</small></h3>
        <div className={s.chartLegend}>{findingStatuses.map(([key, label, colour]) =>
          <button key={key} {...button("status", key, label + " findings")}>{label}
            <span className={s.chartBar} aria-hidden="true"><span style={{ background: colour, width: byStatus[key].length / maxStatus * 100 + "%" }}/></span>
            <strong>{byStatus[key].length}</strong>
          </button>)}
          <button {...button("repeat", "repeat", "Recurring checklist findings")}>Recurring checklist findings<strong>{repeats.length}</strong></button>
          <button {...button("overdue", "overdue", "Overdue actions now")}>Overdue actions now<strong>{overdue.length}</strong></button>
        </div>
      </article>
      <article className={s.chart}>
        <h3>Submissions by month</h3>
        <div className={s.trend} style={{ "--columns": months }}>{buckets.map(({ key, label }) => {
          const count = byMonth.get(key).length;
          return <button key={key} {...button("month", key, label + " submissions")} aria-label={label + " · " + count + " submissions"}>
            <span className={s.trendBar} aria-hidden="true" style={{ height: count / maxMonth * 100 + "%", visibility: count ? "visible" : "hidden" }}/><span>{label}<br/><strong>{count}</strong></span>
          </button>;
        })}</div>
      </article>
    </div>
    <p className={s.results}>Select a chart item to see its records. The on-time rate uses submissions with a recorded scheduled end.</p>
    {selection && <div className={s.drill}>
      <div className={s.dashboardHead}><h3 aria-live="polite">{selection.label} · {drill.length}</h3>
        <button type="button" className={p.button} onClick={() => setSelection(null)}>Clear selection</button>
      </div>
      {selection.group === "repeat" && <p className={s.results}>Checklist questions raised in separate inspections of the same programme or zone.</p>}
      {["outcome", "month"].includes(selection.group) ?
        <InspectionTable columns={["Inspection", "Inspector", "Site / zone", "Submitted", "Outcome"]} rows={drill.map(row => [
          row.id, <Link href={root + "/" + row.id}>{row.inspection_reference || row.title}</Link>, row.inspector,
          row.location, formatDate(row.completed_at), options.find(option => option[0] === row.outcome)[1],
        ])}/> :
        <InspectionTable columns={[selection.group === "overdue" ? "Corrective action" : "Finding", "Site / zone", "Priority", selection.group === "overdue" ? "Target" : "Raised"]}
          rows={drill.map(row => [row.id, <Link href={root + "/" + row.inspection_id + "#inspection-review-actions"}>{row.reference || row.title}</Link>,
            row.location, row.priorityLabel, formatDate(row.target_date || row.created_at)])}/>}
    </div>}
  </section>;
}
