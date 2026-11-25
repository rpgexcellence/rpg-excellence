"use client";

import Link from "next/link";
import { useState } from "react";
import { RecordIcon } from "../../../components/DocumentRecordTabs";
import { soaControlHref } from "../../../lib/soa-workflow.mjs";
import { BANDS, CHECKS, STATUSES, TYPES, filterStatements, readinessLabel, statementCsv } from "./soa-register.mjs";
import s from "../documents/documents.module.css";
import styles from "./soa-register.module.css";

const METRICS = [
  ["all", "All SoA records", "details", ""],
  ["approved", "Approved", "checkCircle", "green"],
  ["draft", "Draft", "clipboard", "amber"],
  ["standalone", "Standalone", "overview", ""],
  ["assessment", "Assessment linked", "documents", "violet"],
];
const EMPTY = { query: "", types: [], statuses: [] };
const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Europe/London" });
const date = value => value ? dateFormat.format(new Date(value)) : "—";
const controlRoot = id => "/portal/assessments/" + id + "/soa";
const compactReference = row => row.reference.slice(0, 12).replace(/-$/, "");
const statusName = status => STATUSES.find(([key]) => key === status)?.[1] ?? status;
const typeName = type => TYPES.find(([key]) => key === type)?.[1] ?? type;

function Checkboxes({ options, fallback, value, onChange }) {
  return <details className={styles.filter}>
    <summary className={s.recordButton}>{value.length ? value.length + " selected" : fallback}<span aria-hidden="true">▾</span></summary>
    <fieldset className={styles.options}>
      <legend>{fallback}</legend>
      {options.map(([key, label]) => <label key={key}>
        <input type="checkbox" checked={value.includes(key)}
          onChange={event => onChange(event.target.checked ? [...value, key] : value.filter(item => item !== key))}/>{label}
      </label>)}
    </fieldset>
  </details>;
}

function Drilldown({ selection, row, onClose }) {
  if (!selection) return null;
  const { category, key, label } = selection;
  const controls = category === "coverage" ? row.summary.coverage[key] : row.summary.gaps[key];
  return <section className={s.recordPanel} aria-label={label + " controls"}>
    <div className={styles.heading}><h2>{label} · {compactReference(row)}</h2>
      <button type="button" className={s.recordButton} onClick={onClose}>Close control list</button></div>
    {controls.length ? <ul className={styles.controlList}>{controls.map(control => <li key={control.control_id}>
      <Link href={soaControlHref(row.id, control.control_id)}>A.{control.control_id} · {control.control_title}</Link>
    </li>)}</ul> : <p>No controls in this category.</p>}
  </section>;
}

function Coverage({ row, showControls, selection }) {
  const { coverage, total, applicable } = row.summary;
  const count = coverage.implemented.length;
  let last = 0;
  const stops = BANDS.map(([key, , colour]) => {
    const start = last;
    last += total ? coverage[key].length / total * 100 : 0;
    return colour + " " + start + "% " + last + "%";
  });
  return <section className={s.recordPanel}>
    <h2><RecordIcon name="matrix"/> Annex A control coverage</h2>
    <p>{compactReference(row)} · Version {row.version}</p>
    <div className={styles.chart}>
      <div className={styles.ring} style={{ background: total ? "conic-gradient(" + stops.join(",") + ")" : "#e4edf4" }} aria-hidden="true">
        <span><strong>{total}</strong>Annex A controls</span>
      </div>
      <div className={styles.legend}>{BANDS.map(([key, label, colour]) => <button type="button" className={styles.listButton} key={key}
        aria-pressed={selection?.category === "coverage" && selection.key === key}
        onClick={() => showControls({ category: "coverage", key, label })}>
        <i className={styles.dot} style={{ background: colour }} aria-hidden="true"/>{label}<strong>{coverage[key].length}</strong>
      </button>)}</div>
    </div>
    <p className={styles.micro}>{applicable
      ? count + " of " + applicable + " applicable controls implemented (" + Math.round(count / applicable * 100) + "%)."
      : total ? "Implementation rate — no controls marked applicable." : "The Annex A catalogue is unavailable."}</p>
  </section>;
}

function Readiness({ row, showControls, selection }) {
  return <section className={s.recordPanel}>
    <div className={styles.heading}><h2><RecordIcon name="calendar"/> Approval readiness</h2>
      <span className={styles.chip} data-tone={row.summary.ready ? "good" : "attention"}>{readinessLabel(row)}</span></div>
    <p>{compactReference(row)} · {row.summary.ready ? "Readiness checks complete." : "Review the outstanding items."}</p>
    {CHECKS.map(([key, label, missing]) => {
      const count = row.summary.gaps[key].length;
      const message = !row.summary.total ? "Unavailable" : count ? missing + " · " + count : "Complete";
      return <button key={key} type="button" className={styles.listButton} disabled={!row.summary.total}
        aria-pressed={selection?.category === "gaps" && selection.key === key}
        onClick={() => showControls({ category: "gaps", key, label })}>
        <RecordIcon name={count || !row.summary.total ? "alert" : "check"}/>{label}<strong>{message}</strong>
      </button>;
    })}
    <div className={styles.listButton}><RecordIcon name="approval"/>Management approval
      <strong>{row.status === "approved" ? "Approved" : row.status === "superseded" ? "Superseded" : "Outstanding"}</strong>
    </div>
    <p className={styles.micro}>Readiness reflects recorded decisions, evidence and required risk links. Approval is recorded in the existing SoA workspace.</p>
  </section>;
}

export default function SoaRegister({ rows, children }) {
  const [filters, setFilters] = useState(EMPTY);
  const [selectedId, setSelectedId] = useState(rows[0]?.id);
  const [selection, setSelection] = useState(null);
  const selected = rows.find(row => row.id === selectedId) ?? rows[0];
  const visible = filterStatements(rows, filters);
  const setFilter = (key, value) => setFilters(current => ({ ...current, [key]: value }));
  const choose = id => { setSelectedId(id); setSelection(null); };
  const changeStatus = key => setFilters({ ...EMPTY, statuses: [key] });
  const clear = () => setFilters(EMPTY);
  const quickFilter = key => {
    if (key === "all") clear();
    else if (key === "standalone" || key === "assessment") setFilters({ ...EMPTY, types: [key] });
    else changeStatus(key);
  };
  const quickActive = key => !filters.query.trim() && (
    key === "all" ? !filters.statuses.length && !filters.types.length :
    key === "standalone" || key === "assessment" ? filters.types.length === 1 && filters.types[0] === key && !filters.statuses.length :
    filters.statuses.length === 1 && filters.statuses[0] === key && !filters.types.length
  );

  function exportCsv() {
    const url = URL.createObjectURL(new Blob(["\uFEFF", statementCsv(visible)], { type: "text/csv;charset=utf-8" }));
    const download = document.createElement("a");
    download.href = url;
    download.download = "statement-of-applicability-register.csv";
    download.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <main className={[s.page, s.registerPage, s.recordPage, styles.page].join(" ")}><div className={s.shell}>
    <p className={s.recordBreadcrumb}><Link href="/portal/information-security">Information Security</Link> / Statement of Applicability</p>
    <header className={s.hubHero + " " + s.recordHero}>
      <div className={s.recordTitle}><span className={s.recordTitleIcon}><RecordIcon name="details"/></span><div>
        <small>RPG EXCELLENCE · INFORMATION SECURITY</small>
        <h1>Statement of Applicability Register</h1>
        <p>Manage Annex A applicability, risk treatment and approval across controlled SoA records.</p>
      </div></div>
      <nav className={s.recordHeaderActions} aria-label="Information Security links">
        <Link className={s.recordButton} href="/portal/information-security/risk-management">ISMS Risk Register</Link>
        <Link className={s.recordButton} href="/portal">Product Dashboard</Link>
        <Link className={s.recordButton} href="/portal/soa/management-board">Management Board</Link>
        <Link className={s.recordButton} href="/en/iso-27001">ISO 27001 guide</Link>
      </nav>
    </header>
    <div className={styles.kpis} aria-label="Register quick filters">
      {METRICS.map(([key, label, icon, tone]) => {
        const count = key === "all" ? rows.length : rows.filter(row => row.status === key || row.type === key).length;
        return <button type="button" className={styles.kpi} key={key} data-tone={tone} aria-pressed={quickActive(key)} onClick={() => quickFilter(key)}>
          <span className={styles.kpiIcon}><RecordIcon name={icon}/></span><span><strong>{count}</strong>{label}</span>
        </button>;
      })}
    </div>

    {selected && <div className={styles.subject}>
      <label htmlFor="soa-selection">Annex A coverage and readiness for</label>
      <select id="soa-selection" value={selected.id} onChange={event => choose(event.target.value)}>
        {rows.map(row => <option key={row.id} value={row.id}>{compactReference(row)} · {typeName(row.type)}</option>)}
      </select>
      <span>Coverage is calculated for the selected SoA.</span>
    </div>}
    <div className={styles.cards}>
      {selected && <Coverage row={selected} showControls={setSelection} selection={selection}/>}
      <section className={s.recordPanel}>
        <h2><RecordIcon name="scope"/> SoA approval status</h2>
        <p>Register-wide status across {rows.length} {rows.length === 1 ? "record" : "records"}.</p>
        {STATUSES.map(([key, label]) => {
          const count = rows.filter(row => row.status === key).length;
          return <button type="button" className={styles.listButton} key={key}
            aria-pressed={filters.statuses.length === 1 && filters.statuses.includes(key)} onClick={() => changeStatus(key)}>
            <span className={styles.statusLabel}>{label}</span><span className={styles.track} aria-hidden="true">
              <i style={{ width: (rows.length ? count / rows.length * 100 : 0) + "%" }}/></span><strong>{count}</strong>
          </button>;
        })}
      </section>
      {selected && <Readiness row={selected} showControls={setSelection} selection={selection}/>}
    </div>
    {selected && <Drilldown row={selected} selection={selection} onClose={() => setSelection(null)}/>}

    <section className={s.recordPanel} aria-labelledby="controlled-soa-title">
      <div className={styles.heading}>
        <div><h2 id="controlled-soa-title"><RecordIcon name="clipboard"/> Controlled SoA records</h2>
          <p>Search records, check readiness and open linked assessments and risks.</p></div>
        <button type="button" className={s.recordButton} onClick={exportCsv} disabled={!visible.length}><RecordIcon name="download"/> Export filtered CSV</button>
      </div>
      <div className={styles.filters}>
        <label>Search SoA records<input type="search" placeholder="Reference, title, version or linked record" value={filters.query}
          onChange={event => setFilter("query", event.target.value)}/></label>
        <Checkboxes options={TYPES} value={filters.types} onChange={value => setFilter("types", value)} fallback="All types"/>
        <Checkboxes options={STATUSES} value={filters.statuses} onChange={value => setFilter("statuses", value)} fallback="All statuses"/>
        <button type="button" className={s.recordButton} onClick={clear}>Clear filters</button>
      </div>
      <p role="status" className={styles.micro}>{visible.length} of {rows.length} records shown</p>
      <div className={s.hubTableWrap}><table className={s.hubTable} aria-label="Controlled SoA records">
        <thead><tr>{["SoA reference", "Title / type", "Version", "Last updated", "Status", "Readiness", "Linked assessment / risks", "Action"]
          .map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
        <tbody>
          {visible.map(row => <tr key={row.id} data-selected={selected?.id === row.id}>
            <th scope="row"><Link href={controlRoot(row.id)} title={row.reference}>{compactReference(row)}</Link></th>
            <td><strong>{row.title}</strong><br/><small>{typeName(row.type)} · {row.organization}</small></td>
            <td>v{row.version}</td><td>{date(row.updatedAt)}</td>
            <td><span className={styles.chip} data-tone={row.status === "approved" ? "good" : row.status === "draft" ? "attention" : undefined}
              title={row.approvedAt ? "Approved " + date(row.approvedAt) : undefined}>{statusName(row.status)}</span></td>
            <td><span className={styles.chip} data-tone={row.summary.ready ? "good" : "attention"}>{readinessLabel(row)}</span></td>
            <td>
              {row.assessmentReference && <Link href={"/portal/assessments/" + row.id} title={row.assessmentReference}>Assessment {row.assessmentReference.slice(0, 8)}</Link>}
              {row.summary.linkedRisks.length > 0 && <details className={styles.risks}><summary>{row.summary.linkedRisks.length} linked {row.summary.linkedRisks.length === 1 ? "risk" : "risks"}</summary>
                <ul>{row.summary.linkedRisks.map(risk => <li key={risk.id}>
                  {risk.status === "archived" ? <span>{risk.risk_reference} · {risk.title} (Archived)</span> :
                    <Link href={"/portal/information-security/risk-management?risk=" + risk.id}>{risk.risk_reference} · {risk.title}</Link>}
                </li>)}</ul>
              </details>}
              {!row.assessmentReference && !row.summary.linkedRisks.length && "—"}
            </td>
            <td><button type="button" className={s.recordButton} aria-pressed={selected?.id === row.id}
              aria-label={"Show coverage for " + compactReference(row)} onClick={() => choose(row.id)}>
              {selected?.id === row.id ? "Viewing" : "View coverage"}
            </button></td>
          </tr>)}
          {!visible.length && <tr><td colSpan={8}>{rows.length ? "No records match the current filters." : "No Statement of Applicability has been created yet."}</td></tr>}
        </tbody>
      </table></div>
    </section>
    {children && <section className={s.recordPanel}><h2>Standalone SoA workspaces</h2>{children}</section>}
  </div></main>;
}
