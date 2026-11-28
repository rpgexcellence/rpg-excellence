"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bars, Donut, Trend } from "../../../../components/NonconformityManagementBoard";
import chartStyles from "../../../../components/nonconformity-management-board.module.css";
import { buildWorkplaceFindingsBoard } from "../../../../lib/workplace-findings-board.mjs";
import { actionOverdue } from "../../../../lib/workplace-inspection-overview.mjs";
import { InspectionTable } from "./InspectionRegister";
import p from "../powra/powra.module.css";
import s from "./workplace-findings-board.module.css";

const charts = [
  ["trend", "Inspection findings trend", "Findings raised and actions verified effective, by month."],
  ["findingsByType", "Findings by type", "Recorded findings, including positive practice and opportunities for improvement."],
  ["ageing", "Open finding ageing", "Calendar days since each unresolved finding was raised."],
  ["attention", "Management attention", "Records can appear in more than one queue."],
  ["outcomes", "Corrective action effectiveness", "Recorded verification outcomes in the last six calendar months."],
  ["recurrence", "Recurring checklist findings", "Questions raised in separate inspections of the same programme or zone."],
  ["workflow", "Corrective action workflow", "Open actions grouped by their current status."],
  ["overdueBySite", "Overdue actions by site", "Open corrective actions past their target date."],
];
const empty = {
  outcomes: "No recorded verification outcomes in this scope and period.",
  recurrence: "No repeat checklist findings in this scope and period.",
  workflow: "No open corrective actions in this scope.",
  overdueBySite: "No overdue corrective actions in this scope.",
};
const captions = {
  open: "Current backlog", high: "Open findings requiring action", actions: "Current corrective actions",
  overdue: "Past the target date", awaiting: "Evidence awaiting independent review", verified: "Closed in the past six calendar months",
};
const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Europe/London" });
const dateText = value => value && Number.isFinite(Date.parse(value)) ? dateFormat.format(new Date(value)) : "—";
const label = value => value ? value.replaceAll("_", " ").replace(/^./, letter => letter.toUpperCase()) : "—";

function Chart({ chart, board, onSelect }) {
  const items = board[chart];
  if (chart === "trend") return <Trend months={items} onSelect={onSelect} raisedLabel="Findings raised"
    verifiedLabel="Actions verified effective" chartLabel="Monthly findings raised and actions verified effective"/>;
  if (chart === "findingsByType") return <Donut items={items} onSelect={onSelect} total={board.totalFindings}
    noun="findings" label="Findings by type" empty="No findings in this scope." showShare/>;
  if (!items.length || (chart === "outcomes" && !board.verifiedTotal)) return <p className={s.empty}>{empty[chart]}</p>;
  return <>
    <Bars items={items} onSelect={onSelect} total={chart === "outcomes" ? board.verifiedTotal : undefined}/>
    {chart === "ageing" && <p className={chartStyles.note}>{board.recordedAge} of {board.summary[0].count} open findings have a valid raised date.</p>}
    {chart === "outcomes" && <p className={chartStyles.note}>{board.verifiedTotal} assessed actions in scope.</p>}
  </>;
}

function RecordTable({ rows, kind, today }) {
  const actions = kind === "actions";
  const columns = actions ? ["Corrective action", "Site / zone", "Owner / verifier", "Priority", "Target", "Status"] :
    ["Finding", "Site / zone", "Inspection", "Priority", "Raised", "Status"];
  return <InspectionTable columns={columns} rows={rows.map(row => [
    row.id,
    <><Link href={row.recordHref}>{row.title}</Link><small>{row.reference}</small></>,
    row.location,
    actions ? <>{row.owner}<small>Verifier · {row.verifier}</small></> : <Link href={row.inspectionHref}>{row.inspectionReference}</Link>,
    label(row.priority),
    actions ? <>{dateText(row.target_date)}{actionOverdue(row, today) && <small className={s.late}>Overdue</small>}</> : dateText(row.created_at),
    <>{label(row.status)}{row.assessment && <small>{label(row.assessment.outcome)} · {dateText(row.assessment.date)}</small>}</>,
  ])}/>;
}

function options(rows, key, name) {
  return [...new Map(rows.map(row => [row[key], row[name]]))].sort((a, b) => a[1].localeCompare(b[1], "en-GB"));
}

export default function WorkplaceFindingsBoard({ findings, actions, inspections, today, asOf }) {
  const [filters, setFilters] = useState({ site: "", zone: "", priority: "" });
  const [trail, setTrail] = useState([]);
  const [search, setSearch] = useState("");
  const dialog = useRef(null);
  const trigger = useRef(null);
  const heading = useRef(null);
  const board = useMemo(() => buildWorkplaceFindingsBoard({ findings, actions, inspections, today, asOf, filters }),
    [findings, actions, inspections, today, asOf, filters]);
  const all = [...findings, ...actions].filter(row => row.status !== "cancelled");
  const sites = options(all, "siteKey", "site");
  const zones = options(all.filter(row => !filters.site || row.siteKey === filters.site), "zoneKey", "zone");
  const current = trail.at(-1);
  useEffect(() => {
    if (dialog.current?.open) heading.current?.focus();
  }, [current]);
  const change = (key, value) => setFilters(previous => ({ ...previous, [key]: value, ...(key === "site" ? { zone: "" } : {}) }));

  function show(step, event) {
    setSearch("");
    if (dialog.current.open) {
      setTrail(previous => [...previous, step]);
    } else {
      trigger.current = event.currentTarget;
      setTrail([step]);
      dialog.current.showModal();
    }
  }

  const select = (item, event) => show({ item, title: item.label }, event);
  const visible = current?.item?.rows.filter(row =>
    [row.reference, row.title, row.location, row.owner, row.inspectionReference].join(" ").toLowerCase().includes(search.trim().toLowerCase()));

  return <section aria-label="Workplace inspection findings management board">
    <div className={s.scope}>
      <label>Site<select value={filters.site} onChange={event => change("site", event.target.value)}>
        <option value="">All sites</option>{sites.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
      </select></label>
      <label>Zone<select value={filters.zone} onChange={event => change("zone", event.target.value)}>
        <option value="">All zones</option>{zones.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
      </select></label>
      <label>Priority<select value={filters.priority} onChange={event => change("priority", event.target.value)}>
        <option value="">All priorities</option>{["critical", "high", "medium", "low"].map(value => <option key={value} value={value}>{label(value)}</option>)}
      </select></label>
      <button type="button" className={p.button} onClick={() => setFilters({ site: "", zone: "", priority: "" })}>Clear filters</button>
    </div>
    <div className={s.metrics}>
      {board.summary.map(item => <button type="button" key={item.key} style={{ "--metric": item.color }} onClick={event => select(item, event)}>
        <span>{item.label}</span><strong>{item.count}</strong><small>{captions[item.key]}</small>
      </button>)}
    </div>
    <div className={chartStyles.grid}>
      {charts.map(([key, title, subtitle]) => <section className={chartStyles.panel} key={key} aria-labelledby={`wpi-chart-${key}`}>
        <header><div><h2 id={`wpi-chart-${key}`}>{title}</h2><p>{subtitle}</p></div>
          <button className={p.button} type="button" aria-label={`Expand ${title} chart`} onClick={event => show({ chart: key, title }, event)}>Expand chart</button>
        </header>
        <Chart chart={key} board={board} onSelect={select}/>
      </section>)}
    </div>
    <section className={p.panel} aria-labelledby="wpi-priority">
      <div className={s.priorityHead}><div><h2 id="wpi-priority">Priority follow-up</h2><p>Overdue first, then highest priority and earliest target date.</p></div>
        {board.priorities.length > 0 && <button className={p.button} type="button" onClick={event => select({
          label: "Open actions", kind: "actions", rows: board.priorities,
        }, event)}>View all {board.priorities.length} open actions</button>}</div>
      <RecordTable rows={board.priorities.slice(0, 5)} kind="actions" today={today}/>
    </section>
    <dialog className={`${s.dialog} ncwDialog`} ref={dialog} aria-labelledby="wpi-drill-title"
      onClose={() => { setTrail([]); trigger.current?.focus(); }}>
      <header><h2 id="wpi-drill-title" ref={heading} tabIndex={-1}>{current?.title || "Inspection details"}</h2>
        <form method="dialog"><button type="submit" className={p.button}>Close</button></form>
      </header>
      <div className={s.dialogBody}>
        {trail.length > 1 && <button type="button" className={p.button} onClick={() => setTrail(previous => previous.slice(0, -1))}>Back to {trail.at(-2).title}</button>}
        {current?.chart && <Chart chart={current.chart} board={board} onSelect={select}/>}
        {current?.item && <><div className={s.drillFilter}>
          <label>Search contributing records<input type="search" value={search} onChange={event => setSearch(event.target.value)}/></label>
          <span role="status">{visible.length} of {current.item.rows.length} {current.item.kind === "actions" ? "actions" : "findings"}</span>
        </div><RecordTable rows={visible} kind={current.item.kind} today={today}/></>}
      </div>
    </dialog>
  </section>;
}
