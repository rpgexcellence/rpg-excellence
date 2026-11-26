"use client";

import { useState } from "react";
import Link from "next/link";
import { RecordIcon } from "./DocumentRecordTabs";
import styles from "./SupplierRegister.module.css";

const registerPath = "/portal/suppliers";
const pageSize = 20;
const approvalLabels = { pending_approval: "Pending approval", conditionally_approved: "Conditionally approved", unknown: "Not recorded" };
const metrics = [
  { key: "approved", title: "Approved suppliers", tone: "blue", qualifies: row => row.approval === "approved" },
  { key: "pending", title: "Pending approval", tone: "amber", qualifies: row => row.approval === "pending_approval" },
  { key: "high", title: "High-criticality suppliers", tone: "red", qualifies: row => ["high", "critical"].includes(row.criticality) },
  { key: "due", title: "Reviews due (30 days)", tone: "green", qualifies: row => row.reviewDue },
  { key: "action", title: "Suppliers under action", tone: "blue", qualifies: row => row.underAction },
];
const emptyFilters = { search: "", approval: [], criticality: [], country: [] };
const emptyCountry = "Not recorded";
const label = value => value === "unknown" ? "Not recorded" : value.replaceAll("_", " ").replace(/^./, letter => letter.toUpperCase());
const approvalLabel = value => approvalLabels[value] || label(value);
const formatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const dateLabel = date => date ? formatter.format(new Date(date + "T00:00:00Z")) : "—";

function toggle(values, value) {
  return values.includes(value) ? values.filter(item => item !== value) : [...values, value];
}

function FilterChoices({ name, title, allLabel, options, selected, change, open, setOpen }) {
  return <div className={styles.filterField}>
    <span id={name + "-label"}>{title}</span>
    <details className={styles.facet} open={open} onKeyDown={event => {
      if (event.key !== "Escape" || !open) return;
      event.preventDefault();
      setOpen(false);
      event.currentTarget.querySelector("summary").focus();
    }}>
      <summary aria-labelledby={name + "-label " + name + "-summary"} onClick={event => {
        event.preventDefault();
        setOpen(!open);
      }}><span id={name + "-summary"}>{selected.length === 1 ? options.find(([key]) => key === selected[0])?.[1] || "1 selected"
        : selected.length ? selected.length + " selected" : allLabel}</span></summary>
      <div className={styles.choices} role="group" aria-labelledby={name + "-label"}>
        {options.length ? options.map(([key, title]) => <label key={key}>
          <input type="checkbox" checked={selected.includes(key)} onChange={() => change(toggle(selected, key))}/>{title}
        </label>) : <p>No values available.</p>}
      </div>
    </details>
  </div>;
}

export default function SupplierRegister({ suppliers = [], companyName = "" }) {
  const [draft, setDraft] = useState(emptyFilters);
  const [filters, setFilters] = useState(emptyFilters);
  const [selected, setSelected] = useState([]);
  const [openFacet, setOpenFacet] = useState(null);
  const [page, setPage] = useState(1);
  const matchingMetrics = metrics.filter(metric => selected.includes(metric.key));
  const terms = filters.search.toLowerCase().split(/\s+/).filter(Boolean);
  const results = suppliers.filter(row => {
    const text = [row.legalName, row.tradingName, row.reference, row.description, row.country, approvalLabel(row.approval)].join(" ").toLowerCase();
    return terms.every(term => text.includes(term))
      && (!filters.approval.length || filters.approval.includes(row.approval))
      && (!filters.criticality.length || filters.criticality.includes(row.criticality))
      && (!filters.country.length || filters.country.includes(row.country || emptyCountry))
      && (!matchingMetrics.length || matchingMetrics.some(metric => metric.qualifies(row)));
  });
  const pages = Math.max(1, Math.ceil(results.length / pageSize));
  const current = Math.min(page, pages);
  const offset = (current - 1) * pageSize;
  const facet = (name, title, allLabel, options) => <FilterChoices
    name={name} title={title} allLabel={allLabel} options={options} selected={draft[name]}
    change={values => setDraft(data => ({ ...data, [name]: values }))}
    open={openFacet === name} setOpen={value => setOpenFacet(value ? name : null)}
  />;
  const clear = () => {
    setDraft(emptyFilters);
    setFilters(emptyFilters);
    setSelected([]);
    setPage(1);
    setOpenFacet(null);
  };

  return <main className={styles.register}>
    <p className={styles.breadcrumb}>Supplier Assurance <span aria-hidden="true">›</span> Supplier Register</p>
    <header className={styles.header}>
      <div><h1>Supplier Register</h1><p>{companyName ? companyName + " · " : ""}Manage supplier approval, risk, performance and ongoing assurance.</p></div>
      <nav className={styles.buttons} aria-label="Supplier Assurance">
        <Link className={styles.button} href={registerPath + "?view=board"}>Management Board</Link>
        <Link className={styles.button + " " + styles.primary} href={registerPath + "/new"}><span aria-hidden="true">+</span> New supplier</Link>
      </nav>
    </header>
    <section className={styles.headline} aria-labelledby="supplier-assurance-heading">
      <div><h2 id="supplier-assurance-heading">Supplier assurance and performance</h2><p>Track approvals, supplier risk and periodic reviews.</p></div>
      <div className={styles.total}><RecordIcon name="distribution"/><div><span>Total suppliers</span><strong>{suppliers.length}</strong></div></div>
    </section>
    <section className={styles.kpis} aria-label="Supplier assurance indicators">
      {metrics.map(({ key, title, tone, qualifies }) => <label key={key} className={styles.kpi} data-tone={tone}
        title={key === "action" ? "Open QBR actions or supplier nonconformities awaiting closure" : undefined}>
        <span>{title}</span><strong>{suppliers.filter(qualifies).length}</strong>
        <input type="checkbox" aria-label={title} checked={selected.includes(key)} onChange={() => {
          setSelected(values => toggle(values, key));
          setPage(1);
        }}/>
      </label>)}
    </section>
    <form className={styles.panel + " " + styles.filters} aria-label="Filter suppliers" onSubmit={event => {
      event.preventDefault();
      setFilters(draft);
      setPage(1);
      setOpenFacet(null);
    }}>
      <label className={styles.search}>Search suppliers<input type="search" value={draft.search}
        placeholder="Name, reference, country or keywords" onChange={event => setDraft(data => ({ ...data, search: event.target.value }))}/></label>
      {facet("approval", "Approval status", "All statuses", [...new Set([
        "approved", "pending_approval", "conditionally_approved", "draft", "not_approved", "suspended", "expired", ...suppliers.map(row => row.approval),
      ])].map(value => [value, approvalLabel(value)]))}
      {facet("criticality", "Criticality", "All criticality levels", [...new Set([
        "low", "medium", "high", "critical", ...suppliers.map(row => row.criticality),
      ])].map(value => [value, label(value)]))}
      {facet("country", "Country", "All countries", [...new Set(suppliers.map(row => row.country || emptyCountry))]
        .sort((a, b) => a.localeCompare(b)).map(value => [value, value]))}
      <div className={styles.buttons}><button className={styles.button + " " + styles.primary} type="submit">Apply filters</button>
        <button className={styles.button} type="button" onClick={clear}>Clear filters</button></div>
    </form>
    <section className={styles.panel} aria-labelledby="supplier-results-title">
      <div className={styles.resultsTitle}><h2 id="supplier-results-title">Suppliers ({results.length})</h2>
        <p>Registered suppliers, their approval status, criticality and next review date.</p></div>
      {!!matchingMetrics.length && <p className={styles.active}>KPI filters · {matchingMetrics.map(metric => metric.title).join(" or ")}</p>}
      <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Supplier results table">
        <table><thead><tr>{["Supplier", "Reference", "Country", "Approval status", "Criticality", "Next review", "Performance", "Actions"]
          .map(heading => <th key={heading} scope="col">{heading}</th>)}</tr></thead>
          <tbody>{results.slice(offset, offset + pageSize).map(row => {
            const path = registerPath + "/" + row.id;
            const tone = row.approval === "approved" ? "green" : row.approval === "pending_approval" ? "blue"
              : ["expired", "suspended", "not_approved"].includes(row.approval) ? "red" : row.approval === "conditionally_approved" ? "amber" : "";
            const criticalityTone = ["high", "critical"].includes(row.criticality) ? "red"
              : row.criticality === "medium" ? "amber" : row.criticality === "low" ? "green" : "";
            return <tr key={row.id}>
              <th scope="row"><strong>{row.legalName || row.tradingName || "Supplier"}</strong>{row.description && <small>{row.description}</small>}</th>
              <td>{row.reference || "—"}</td><td>{row.country || "—"}</td>
              <td><span className={styles.badge} data-tone={tone}>{approvalLabel(row.approval)}</span></td>
              <td><span className={styles.badge} data-tone={criticalityTone}>{label(row.criticality)}</span></td>
              <td>{dateLabel(row.nextReview)}</td>
              <td>{row.performance === null ? <span className={styles.badge} title="No measured performance in a completed QBR">—</span>
                : <Link className={styles.badge} data-tone={row.performance === 100 ? "green" : "blue"}
                  href={path + "/qbr?review=" + row.reviewId} title="Median of recorded percentage measures in the latest completed QBR">{row.performance}%</Link>}</td>
              <td><div className={styles.rowActions}>
                <Link className={styles.button} href={path}>Open supplier →</Link>
                <details><summary className={styles.button} aria-label={"More actions for " + (row.legalName || row.reference)}>⋯</summary>
                  <div className={styles.recordMenu}><Link href={path + "/qbr"}>Quarterly business reviews</Link></div>
                </details>
              </div></td>
            </tr>;
          })}
          {!results.length && <tr><td colSpan={8} className={styles.empty}>{suppliers.length ? "No suppliers match these filters." : "No suppliers are registered yet."}</td></tr>}
          </tbody></table>
      </div>
      <footer className={styles.footer}>
        <p aria-live="polite">{results.length ? "Showing " + (offset + 1) + "–" + Math.min(offset + pageSize, results.length) + " of " + results.length + " suppliers" : "Showing 0 suppliers"}</p>
        <nav className={styles.buttons} aria-label="Supplier result pages">
          <button className={styles.button} disabled={current === 1} onClick={() => setPage(current - 1)}>Previous</button>
          <span className={styles.current} aria-current="page">{current}</span>
          <button className={styles.button} disabled={current === pages} onClick={() => setPage(current + 1)}>Next</button>
        </nav>
      </footer>
    </section>
  </main>;
}
