"use client";

import { useEffect, useState } from "react";
import DocumentRegisterFilter from "../app/portal/documents/DocumentRegisterFilter";
import { FINDING_CLASSIFICATIONS, NC_WORKFLOW } from "../lib/nonconformity-reporting.mjs";
import s from "./nonconformity-register.module.css";

const pickerFields = ["owner", "classification", "source"];
const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
});
const displayDate = date => date ? dateFormat.format(new Date(date + "T00:00:00Z")) : "—";
const choices = values => values.map(value => ({ value, label: value }));
const describe = value => value.replace(/_/g, " ").replace(/\b\w/g, char => char.toUpperCase());

function verification(row) {
  if (row.closed) return row.verifiedDate ? "Verified " + displayDate(row.verifiedDate) : "Verified";
  if (row.stateKey === "verification") return "Awaiting decision";
  return row.isNonconformity ? "Pending" : "Review decision pending";
}

function source(row) {
  return row.sourceCategory === "other" && row.sourceType === "manual" ? "Manual" : describe(row.sourceCategory);
}

function csvCell(value) {
  const text = String(value ?? "");
  const safe = /^[\s\u0000-\u001f]*[=+@-]|^[\t\r\n]/.test(text) ? "'" + text : text;
  return '"' + safe.replaceAll('"', '""') + '"';
}

function exportRows(rows) {
  const lines = [
    ["Reference", "Title", "Source", "Classification", "Site", "Department", "Recorded area",
      "Action owner", "Due date", "Days overdue", "Workflow status", "Linked CAPA-8D", "Verification"],
    ...rows.map(row => [
      row.reference, row.title, source(row), row.classificationLabel, row.site, row.department,
      row.location === "Not recorded" ? "" : row.location, row.ownerName, row.dueDate, row.daysOverdue,
      row.stateLabel, row.linkedCapaReference || (row.linkedCapaId ? "Linked" : ""), verification(row),
    ]),
  ];
  const url = URL.createObjectURL(new Blob(["\uFEFF", lines.map(line => line.map(csvCell).join(",")).join("\r\n")],
    { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "nc-register.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function readFindingPickers(form) {
  return Object.fromEntries(pickerFields.map(name => [name, form.getAll(name)]));
}

export function FindingPickers({ facets, selected, onSelectionChange }) {
  const owners = choices(facets.owners);
  if (facets.hasUnassigned) owners.unshift({ value: "unassigned", label: "Unassigned" });
  const fields = [
    ["owner", "Owner", "All owners", owners],
    ["classification", "Classification", "All classifications", FINDING_CLASSIFICATIONS.map(item => ({ value: item.key, label: item.label }))],
    ["source", "Source", "All sources", facets.sources.map(value => ({ value, label: value === "other" ? "Other / Manual" : describe(value) }))],
  ];
  return <div className={s.pickers}>{fields.map(([name, label, emptyLabel, items]) => {
    const value = selected[name];
    return <DocumentRegisterFilter key={name} name={name} label={label} emptyLabel={emptyLabel}
      choices={items} selected={Array.isArray(value) ? value : value && value !== "all" ? [value] : []}
      searchOptions={name === "owner" && items.length > 10} onSelectionChange={onSelectionChange}/>;
  })}</div>;
}

function Select({ name, label, options, filters }) {
  return <label>{label}
    <select name={name} defaultValue={filters[name] || ""}>
      <option value="">Any</option>
      {options.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
    </select>
  </label>;
}

export function FindingFilters({ facets, selected, onApply, onClear }) {
  function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const fields = ["query", "site", "department", "location", "workflow", "risk", "capa", "from", "to", "dueFrom", "dueTo"];
    if (onApply({ ...Object.fromEntries(fields.map(name => [name, values.get(name)])), ...readFindingPickers(values) })) {
      form.querySelectorAll("details[name][open]").forEach(details => { details.open = false; });
    }
  }

  return <form className={`ncwFilters ${s.filters}`} onSubmit={submit}>
    <label className={s.search}>Search
      <input name="query" type="search" defaultValue={selected.query} placeholder="Reference, title, owner or location"/>
    </label>
    <FindingPickers facets={facets} selected={selected}/>
    <div className={s.actions}>
      <button className="ncwButton navy" type="submit">Apply filters</button>
      <button className="ncwButton" type="button" onClick={onClear}>Clear</button>
    </div>
    <details className={s.advanced}>
      <summary>Advanced filters</summary>
      <div className={s.advancedFields}>
        <Select name="site" label="Site" options={choices(facets.sites)} filters={selected}/>
        <Select name="department" label="Department" options={choices(facets.departments)} filters={selected}/>
        <Select name="location" label="Recorded area" options={choices(facets.locations)} filters={selected}/>
        <Select name="workflow" label="Workflow" options={NC_WORKFLOW.map(item => ({ value: item.key, label: item.label }))} filters={selected}/>
        <Select name="risk" label="Risk level" options={["critical", "high", "medium", "low", "unknown"].map(value => ({ value, label: describe(value) }))} filters={selected}/>
        <Select name="capa" label="Linked CAPA-8D" options={[{ value: "linked", label: "Linked" }, { value: "unlinked", label: "Unlinked" }]} filters={selected}/>
        {[["from", "Raised from"], ["to", "Raised to"], ["dueFrom", "Due from"], ["dueTo", "Due to"]].map(([name, label]) =>
          <label key={name}>{label}<input name={name} type="date" defaultValue={selected[name]}/></label>)}
      </div>
    </details>
  </form>;
}

function RegisterTable({ rows, onOpen, online }) {
  const headers = ["Reference and title", "Source", "Classification", "Site / department", "Action owner",
    "Due date", "Days overdue", "Workflow status", "Linked CAPA-8D", "Verification", "Record"];

  return <div className={s.tableRegion} tabIndex={0} role="region" aria-label="Findings table">
    <table className={s.table}>
      <thead><tr>{headers.map(title => <th key={title} scope="col">{title}</th>)}</tr></thead>
      <tbody>
        {rows.map(row => <tr key={row.id}>
          <th scope="row">
            <button type="button" className="ncwReference" onClick={() => onOpen(row)}>{row.reference}</button>
            <small>{row.title}</small>
          </th>
          <td>{source(row)}{(row.auditReference || row.sourceReference) && <small>{row.auditReference || row.sourceReference}</small>}</td>
          <td><span className={s.classification} data-classification={row.classification}>{row.classificationLabel}</span></td>
          <td>{row.site || "—"}<small>{row.department || (row.location !== "Not recorded" ? "Area · " + row.location : "")}</small></td>
          <td>{row.ownerName || "Not assigned"}</td>
          <td className={s.date}>{displayDate(row.dueDate)}</td>
          <td>{row.daysOverdue === null ? "—" : <span className={s.overdue}>{row.daysOverdue}</span>}</td>
          <td><span className="ncwState" style={{ color: row.stateColor, background: row.stateColor + "14" }}>{row.stateLabel}</span></td>
          <td>{row.linkedCapaAvailable && online
            ? <a href={"/portal/rca/" + encodeURIComponent(row.linkedCapaId)}>{row.linkedCapaReference || "Open CAPA-8D"}</a>
            : row.linkedCapaReference || (row.linkedCapaId ? "Linked" : "—")}</td>
          <td>{verification(row)}</td>
          <td><button type="button" className="ncwButton" aria-label={"Open " + row.reference} onClick={() => onOpen(row)}>Open</button></td>
        </tr>)}
        {!rows.length && <tr><td className={s.empty} colSpan={headers.length}>No findings match this selection.</td></tr>}
      </tbody>
    </table>
  </div>;
}

export default function NonconformityRegister({ analytics, active, ownership, onOwnership, onKpi, onOpen, online, Icon, children }) {
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const { findingTotal, visibleRows } = analytics;
  const kpis = [
    ["all", "All findings", findingTotal, `${analytics.total} NCs · ${analytics.observationCount} observations · ${analytics.ofiCount} OFIs`, "document"],
    ["open", "Open NCs", analytics.open, "Action or verification outstanding", "clock"],
    ["overdue", "Overdue NCs", analytics.overdue, "Past the agreed due date", "alert"],
    ["closed", "Verified closed", analytics.closed, "Verification complete", "check"],
    ["verification", "Awaiting verification", analytics.workflows.find(stage => stage.key === "verification").count, "Independent review pending", "check"],
    ["due_soon", "Due in 7 days", analytics.dueSoon, "Upcoming deadlines", "clock"],
  ];
  useEffect(() => { setPage(1); }, [visibleRows]);
  const lastPage = Math.max(1, Math.ceil(visibleRows.length / pageSize));
  const currentPage = Math.min(page, lastPage);
  const offset = (currentPage - 1) * pageSize;

  return <>
    <div className={s.metrics} role="group" aria-label="Filter by finding status">
      {kpis.map(([key, label, count, note, icon]) => <button key={key} data-status={key} type="button"
        aria-pressed={active === key} onClick={() => onKpi(active === key ? "all" : key)}>
        <span><Icon type={icon}/>{label}</span><strong>{count}</strong><small>{note}</small>
      </button>)}
    </div>
    {children}
    <article className="ncwPanel ncwRegister">
      <div className="ncwRegisterHead">
        <div>
          <h2>Controlled findings register</h2>
          <p role="status">{visibleRows.length} of {findingTotal} findings · {kpis.find(item => item[0] === active)?.[1] || "All findings"}</p>
        </div>
        <div className={s.actions}>
          <div className="ncwQueueTabs" role="group" aria-label="Record ownership">
            <button type="button" aria-pressed={ownership !== "mine"} onClick={() => onOwnership("all")}>All records</button>
            <button type="button" aria-pressed={ownership === "mine"} onClick={() => onOwnership("mine")}>My actions</button>
          </div>
          <button type="button" className="ncwButton" disabled={!visibleRows.length} onClick={() => exportRows(visibleRows)}>
            <Icon type="download"/>Export CSV
          </button>
        </div>
      </div>
      <RegisterTable rows={visibleRows.slice(offset, offset + pageSize)} onOpen={onOpen} online={online}/>
      <div className={s.pager}>
        <span>{visibleRows.length ? `Showing ${offset + 1}–${Math.min(offset + pageSize, visibleRows.length)} of ${visibleRows.length}` : "No findings to show"}</span>
        <div className={s.actions}>
          <label>Rows per page <select value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}>
            {[5, 10, 25].map(size => <option key={size}>{size}</option>)}
          </select></label>
          <button type="button" className="ncwButton" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button>
          <button type="button" className="ncwButton" disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)}>Next</button>
        </div>
      </div>
    </article>
  </>;
}
