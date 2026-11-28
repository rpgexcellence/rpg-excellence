"use client";

import { useState } from "react";
import { RecordIcon } from "../../../../components/DocumentRecordTabs";
import p from "../powra/powra.module.css";
import s from "./inspection-overview.module.css";

export function InspectionTable({ columns, rows, empty = "No matching records." }) {
  if (!rows.length) return <p className={s.empty}>{empty}</p>;
  return <div className={p.tableWrap}><table className={p.table + " " + s.table}>
    <thead><tr>{columns.map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
    <tbody>{rows.map(([id, ...cells]) => <tr key={id}>{cells.map((cell, index) =>
      <td data-label={columns[index]} key={columns[index]}>{cell}</td>)}</tr>)}</tbody>
  </table></div>;
}

function TickFilter({ label, options, selected, onChange }) {
  const [query, setQuery] = useState("");
  const visible = options.filter(option => option.toLowerCase().includes(query.trim().toLowerCase()));
  return <details className={s.tickFilter} name="inspection-register-filters">
    <summary className={p.button}>{label}{selected.length > 0 && " (" + selected.length + ")"}</summary>
    <div className={s.tickOptions}>
      <input type="search" aria-label={"Search " + label.toLowerCase() + " options"}
        placeholder="Search options" value={query} onChange={event => setQuery(event.target.value)}/>
      {visible.map(option => <label key={option}><input type="checkbox" checked={selected.includes(option)}
        onChange={event => onChange(event.target.checked ? [...selected, option] : selected.filter(value => value !== option))}/>{option}</label>)}
      {!visible.length && <p>No matching options.</p>}
    </div>
  </details>;
}

function csvCell(value) {
  const text = String(value ?? "");
  const safe = /^[\s\uFEFF]*[=+@-]|^[\t\r\n]/.test(text) ? "'" + text : text;
  return '"' + safe.replaceAll('"', '""') + '"';
}

function downloadCsv(columns, rows, filename) {
  const csv = [columns, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function InspectionRegister({ columns, entries, filters, initialQuery = "", exportColumns, exportFile, paginate = false }) {
  const [query, setQuery] = useState(initialQuery);
  const [selections, setSelections] = useState({});
  const [reset, setReset] = useState(0);
  const [page, setPage] = useState(1);
  const term = query.trim().toLowerCase();
  const rows = entries.filter(entry =>
    (!term || entry.search.toLowerCase().includes(term)) &&
    filters.every((_, index) => !selections[index]?.length || selections[index].some(value => entry.filters[index].includes(value)))
  );
  const pageSize = 15;
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const activePage = Math.min(page, pages);
  const visible = paginate ? rows.slice((activePage - 1) * pageSize, activePage * pageSize) : rows;
  return <>
    <div className={s.registerFilters} key={reset}>
      <input type="search" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }}
        aria-label="Search records" placeholder="Search reference, title or location"/>
      {filters.map((label, index) => <TickFilter key={label} label={label}
        options={[...new Set(entries.flatMap(entry => entry.filters[index]))].sort((a, b) => a.localeCompare(b, "en-GB", { numeric: true }))}
        selected={selections[index] || []} onChange={values => { setSelections(current => ({ ...current, [index]: values })); setPage(1); }}/>)}
      <button className={p.button} type="button" onClick={() => { setQuery(""); setSelections({}); setPage(1); setReset(current => current + 1); }}>Clear filters</button>
      {exportFile && <button className={p.primary} type="button" disabled={!rows.length}
        onClick={() => downloadCsv(exportColumns, rows.map(row => row.csv), exportFile)}><RecordIcon name="download"/>Download CSV</button>}
    </div>
    <p className={s.results} role="status">{rows.length} of {entries.length} records{exportFile && " · CSV exports the filtered results"}</p>
    <InspectionTable columns={columns} rows={visible.map(entry => entry.row)}/>
    {paginate && pages > 1 && <nav className={p.tabs} aria-label="Register pages">
      <button type="button" disabled={activePage <= 1} onClick={() => setPage(activePage - 1)}>Previous</button>
      <span className={s.results}>Page {activePage} of {pages}</span>
      <button type="button" disabled={activePage >= pages} onClick={() => setPage(activePage + 1)}>Next</button>
    </nav>}
  </>;
}
