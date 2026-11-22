"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import HealthSafetyDashboardHeatMap from "../../../../components/HealthSafetyDashboardHeatMap";
import {
  actionsPath, isControlled, isHistoric, matchesRegister, matchesSlice, movement, priorityActions,
  readable, registerCsv, registerPath, residualProfile, riskBand, riskLabels,
} from "./register-data.mjs";
import DocumentRegisterFilter from "../../documents/DocumentRegisterFilter";
import s from "./risk-assurance.module.css";

const groupViews = [
  ["all", "All Assessments"], ["site", "By Site"], ["department", "By Department"],
  ["hazard", "By Hazard"], ["level", "By Risk Level"],
];
const movementBands = [
  ["lower", "Lower residual score", "#087a68"], ["same", "Same score", "#98641f"],
  ["higher", "Higher residual score", "#ac3742"], ["unrated", "Incomplete rating", "#667e91"],
];
const sliceLabels = {
  active: "Active", elevated: "Elevated residual risk", unacceptable: "Unacceptable residual risk",
  overdue: "Overdue actions", "review-due": "Reviews due", approval: "Awaiting approval",
  approved: "Approved or communicated", verification: "Awaiting verification", archived: "Archived and superseded",
  ...Object.fromEntries(movementBands.map(([key, label]) => [key, label])),
};
const blankScope = { query: "", sites: [], departments: [], assessments: [] };
const profileBands = [
  ["acceptable", "1–4"], ["adequate", "5–9"], ["inadequate", "10–14"],
  ["unacceptable", "15–25"], ["unrated", ""],
];
const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const displayDate = value => value ? dateFormat.format(new Date(value + "T00:00:00Z")) : "—";
const recordHref = (id, suffix = "") => registerPath + "/" + encodeURIComponent(id) + suffix;
function actionHref(view, reference) {
  const query = new URLSearchParams({ view, ...(reference ? { q: reference } : {}) });
  return actionsPath + "?" + query;
}

function Score({ value }) {
  const band = riskBand(value);
  return <span data-band={band} className={s.badge}>{value === null ? "Unrated" : value + " · " + riskLabels[band]}</span>;
}

function WorkStatus({ status }) {
  return <span data-status={status} className={s.workflow}>{readable(status) || "Status unavailable"}</span>;
}

function groupRows(rows, view, matchedHazardIds) {
  if (view === "all") return [["", rows]];
  const groups = new Map();
  for (const row of rows) {
    const hazardTypes = () => [...new Set(row.hazards.filter(hazard => !matchedHazardIds || matchedHazardIds.has(hazard.id)).map(hazard => hazard.type))];
    const labels = view === "hazard" ? hazardTypes() : view === "level" ? [riskLabels[riskBand(row.residualScore)]] : [row[view]];
    for (const label of labels.length ? labels : ["No hazards recorded"]) {
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(row);
    }
  }
  if (view === "level") {
    const bands = ["Unacceptable", "Inadequate", "Adequate", "Acceptable", "Unrated"];
    return bands.filter(label => groups.has(label)).map(label => [label, groups.get(label)]);
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b, "en-GB"));
}

function AssessmentRow({ row, canContribute }) {
  const late = row.actions.filter(action => action.overdue).length;
  const verification = row.actions.some(action => action.awaiting);
  return <tr>
    <th scope="row"><Link href={recordHref(row.id)}>{row.reference}</Link>
      <div>{row.title} <small>· Rev {row.version ?? "—"}</small></div></th>
    <td>{row.site}<small>{[row.department, row.assessor].filter(Boolean).join(" · ")}</small></td>
    <td><WorkStatus status={row.status}/></td>
    <td><div className={s.scores}><span>{row.initialScore ?? "—"}</span> <span aria-hidden="true">→</span>
      <span className={s.srOnly}>Residual</span><Score value={row.residualScore}/></div></td>
    <td><span className={late ? s.overdue : undefined}>{row.actions.length} open{late ? " · " + late + " overdue" : ""}</span>
      <small className={row.reviewDue ? s.overdue : undefined}>{row.reviewDate ? "Review " + displayDate(row.reviewDate) : "No review date"}</small></td>
    <td>
      <div className={s.rowActions}>
        <Link href={recordHref(row.id)}>Open</Link>
        <Link href={recordHref(row.id, "/review")}>Review</Link>
        {canContribute && isControlled(row) && <Link href={recordHref(row.id, "#create-revision")}>Revise</Link>}
        {!isHistoric(row) && row.actions.length > 0 && row.reference !== "No reference" &&
          <Link href={actionHref(verification ? "verification" : "open", row.reference)}>Verify controls</Link>}
      </div>
      {row.history?.length > 0 && <details className={s.history}>
        <summary>History ({row.history.length})</summary>
        <ul>{row.history.map(item => <li key={item.id}><Link href={recordHref(item.id)}>{item.reference}</Link>
          {" · Rev " + (item.version ?? "—") + " · " + readable(item.status)}</li>)}</ul>
      </details>}
    </td>
  </tr>;
}

function DrillButton({ value, label, count, colour, active, onSelect }) {
  return <button type="button" className={s.drillButton} style={{ "--tone": colour }}
    aria-pressed={active === value} onClick={() => onSelect(value)}><span>{label}</span><strong>{count} →</strong></button>;
}

function ResidualProfile({ hazards, active, onSelect }) {
  const counts = residualProfile(hazards);
  const hasHazards = hazards.length > 0;
  return <section className={`${s.panel} ${s.profile}`} aria-labelledby="residual-profile-title">
    <h2 id="residual-profile-title">Residual Risk Profile</h2>
    <p className={s.sub}>{hasHazards ? `${hazards.length - counts.unrated} of ${hazards.length} hazards rated. Select a band to filter assessments.`
      : "No hazards recorded in this scope."}</p>
    {hasHazards && <>
      <div className={`${s.track} ${s.profileTrack}`} role="group" aria-label="Residual risk distribution">
        {profileBands.filter(([band]) => counts[band]).map(([band]) => (
          <button key={band} type="button" data-band={band} style={{ flexGrow: counts[band] }}
            aria-label={`${riskLabels[band]}, ${counts[band]} hazards`} aria-pressed={active === "profile:" + band}
            onClick={() => onSelect("profile:" + band)}/>
        ))}
      </div>
      <div className={s.profileBands}>
        {profileBands.map(([band, range]) => <button type="button" key={band} data-band={band}
          aria-pressed={active === "profile:" + band} onClick={() => onSelect("profile:" + band)}>
          <span><i aria-hidden="true"/>{riskLabels[band]}{range && <small> · {range}</small>}</span>
          <strong>{counts[band]} · {Math.round(100 * counts[band] / hazards.length)}%</strong>
        </button>)}
      </div>
    </>}
  </section>;
}

function CoverageDialog({ dialog, coverage, rate }) {
  return <dialog ref={dialog} className={s.dialog} aria-labelledby="coverage-title">
    <header className={s.panelHead}>
      <h2 id="coverage-title">Controlled assessment position</h2>
      <form method="dialog"><button className={s.button}>Close</button></form>
    </header>
    {coverage.total > 0 ? <p><strong>{coverage.approved.length} ÷ {coverage.total} = {rate}%</strong> (rounded)</p> : <p>No assessments have been recorded.</p>}
    <p className={s.sub}>The numerator is the number of approved or communicated assessments. The denominator includes every recorded revision. Review links show the applicable assessment requirements and approval record.</p>
    {coverage.approved.length ? <ul className={s.coverageRows}>{coverage.approved.map(row => <li key={row.id}>
      <div><Link href={recordHref(row.id)}>{row.reference} · {row.title}</Link><WorkStatus status={row.status}/></div>
      <Link href={recordHref(row.id, "/review")}>Review requirements →</Link>
    </li>)}</ul> : <p className={s.sub}>No approved or communicated assessments.</p>}
  </dialog>;
}

function exportRows(rows) {
  const file = new Blob(["\uFEFF" + registerCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = "risk-assessment-register.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function RiskAssuranceCentre({ data, initialView, initialQuery, canContribute }) {
  const [scope, setScope] = useState({ ...blankScope, query: initialQuery });
  const [filterVersion, setFilterVersion] = useState(0);
  const [groupView, setGroupView] = useState("all");
  const [slice, setSlice] = useState(initialView === "all" ? null : initialView);
  const [cell, setCell] = useState(null);
  const dialog = useRef(null);
  const register = useRef(null);

  const base = data.latest.filter(row => matchesRegister(row, scope));
  const hazards = base.flatMap(row => row.hazards);
  const profileBand = slice?.startsWith("profile:") ? slice.slice("profile:".length) : null;
  const hazardIds = cell ? new Set(hazards.filter(hazard => hazard[cell.mode].join("-") === cell.key).map(hazard => hazard.id))
    : profileBand ? new Set(hazards.filter(hazard => riskBand(hazard.residualScore) === profileBand).map(hazard => hazard.id)) : null;
  const source = slice === "archived" ? data.archive.filter(row => matchesRegister(row, scope)) : base;
  const visible = source.filter(row => matchesSlice(row, slice) && (!hazardIds || row.hazards.some(hazard => hazardIds.has(hazard.id))));
  const elevated = base.filter(row => matchesSlice(row, "elevated"));
  const overdue = priorityActions(base);
  const verification = base.flatMap(row => row.actions).filter(action => action.awaiting);
  const reviews = base.filter(row => row.reviewDue);
  const approval = base.filter(row => matchesSlice(row, "approval"));
  const rate = data.coverage.total ? Math.round(100 * data.coverage.approved.length / data.coverage.total) : null;
  const priorities = hazards.filter(hazard => hazard.residualScore >= 10).sort((a, b) => b.residualScore - a.residualScore).slice(0, 2);
  const changes = movementBands.map(([key, label, colour]) => [key, label, colour, hazards.filter(hazard => movement(hazard) === key).length]);
  const select = key => {
    setCell(null);
    setSlice(key === slice ? null : key);
    register.current?.scrollIntoView({ block: "start" });
  };
  const clearDrill = () => { setCell(null); setSlice(null); };
  const chip = cell ? `${cell.mode === "current" ? "Initial" : "Residual"} heat map · L${cell.key[0]} × S${cell.key[2]}`
    : profileBand ? "Residual profile · " + riskLabels[profileBand] : sliceLabels[slice];
  const filterRows = slice === "archived" ? data.archive : data.latest;
  const assessmentOptions = filterRows.map(row => ({ value: row.id, label: row.reference + " · " + row.title }));
  const choices = key => [...new Set([...data.latest, ...data.archive].map(row => row[key]))]
    .sort((a, b) => a.localeCompare(b, "en-GB")).map(value => ({ value, label: value }));
  function applyFilters(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setScope({
      query: String(values.get("q") ?? ""),
      sites: values.getAll("site"),
      departments: values.getAll("department"),
      assessments: values.getAll("assessment"),
    });
    const openMenu = event.currentTarget.querySelector("details[open]");
    if (openMenu) openMenu.open = false;
    setFilterVersion(version => version + 1);
  }

  return <main className={s.page}>
    <header className={s.hero}>
      <div>
        <small>RPG EXCELLENCE / HEALTH &amp; SAFETY</small>
        <h1>H&amp;S Risk Assurance Centre</h1>
        <p>Track residual risk, control delivery and assessment approvals in one register.</p>
      </div>
      <nav className={s.heroActions} aria-label="Risk assessment shortcuts">
        <Link href="/portal/health-safety">H&amp;S Dashboard</Link>
        <a href="#risk-assessments">Risk Assessments</a>
        {canContribute && <Link href={registerPath + "/new"}>+ New risk assessment</Link>}
      </nav>
    </header>

    <section className={s.kpis} aria-label="Executive risk indicators">
      {[
        [null, "Total assessments", base.length, "Latest revisions in scope", "#3579ad"],
        ["elevated", "Elevated residual risk", elevated.length, "High / critical · score 10 or more", "#a8343d"],
        ["overdue", "Overdue actions", overdue.length, "Open actions past target date", "#9f4e20"],
        ["review-due", "Reviews due", reviews.length, "Due today or overdue", "#805818"],
        ["approval", "Awaiting approval", approval.length, "Assessments in review", "#69568b"],
      ].map(([key, label, count, note, colour]) => (
        <button type="button" key={label} className={s.kpi} style={{ "--tone": colour }}
          aria-pressed={!cell && slice === key} onClick={() => select(key)}>
          <strong>{count}</strong><b>{label}</b><small>{note}</small>
        </button>
      ))}
    </section>

    <div className={s.dashboard}>
      <HealthSafetyDashboardHeatMap className={s.heat} hazards={hazards} registerHref={registerPath}
        registerAnchor="#risk-assessments" selection={cell?.key ?? ""}
        onSelection={value => { setCell(value); if (value) setSlice(null); }}/>
      <div className={s.dashboardColumn}>
        <section className={s.panel} aria-labelledby="movement-title">
          <h2 id="movement-title">Risk movement</h2>
          <p className={s.sub}>Initial and residual scores for the same hazards.</p>
          <div className={s.track} aria-hidden="true">
            {changes.map(([key, , colour, count]) => <span key={key} style={{ background: colour, flexGrow: count }}/>)}
          </div>
          <div className={s.drillList}>
            {changes.map(([key, label, colour, count]) => <DrillButton key={key}
              value={key} label={label} count={count} colour={colour} active={slice} onSelect={select}/>)}
          </div>
          <div className={s.coverage}>
            <button type="button" onClick={() => dialog.current?.showModal()} className={s.coverageButton}>
              <span>Controlled assessment position</span><strong>{rate === null ? "—" : rate + "%"}</strong>
            </button>
            {rate !== null && <div className={s.track} aria-hidden="true"><span style={{ width: rate + "%", background: "#149d91" }}/></div>}
            <p className={s.sub}>{data.coverage.approved.length} approved or communicated out of {data.coverage.total} register-wide records. <button type="button" className={s.linkButton} onClick={() => dialog.current?.showModal()}>View calculation →</button></p>
          </div>
        </section>
        <ResidualProfile hazards={hazards} active={slice} onSelect={select}/>
      </div>
      <section className={s.panel} aria-labelledby="intelligence-title">
        <h2 id="intelligence-title">Risk intelligence</h2>
        <p className={s.sub}>Priority risks and controls within the selected scope.</p>
        <div className={s.drillList}>
          {[
            ["unacceptable", "Unacceptable residual risk", base.filter(row => matchesSlice(row, "unacceptable")).length, "#a8343d"],
            ["overdue", "Overdue control actions", overdue.length, "#9f4e20"],
            ["verification", "Controls awaiting verification", verification.length, "#805818"],
            ["review-due", "Assessments due for review", reviews.length, "#245983"],
          ].map(([key, label, count, colour]) => <DrillButton key={key} value={key} label={label}
            count={count} colour={colour} active={slice} onSelect={select}/>)}
        </div>
        <ul className={s.priorities}>
          {priorities.map(hazard => <li key={hazard.id}><Link href={recordHref(hazard.assessmentId)}>{hazard.label}</Link>
            <Score value={hazard.residualScore}/><small>{hazard.assessmentLabel}</small></li>)}
          {overdue.slice(0, 3).map(({ action, row }) => <li key={action.id}>
            <Link href={actionsPath + "/" + encodeURIComponent(action.id)}>{action.reference ? action.reference + " · " : ""}{action.label}</Link>
            <small>{row.reference} · Due {displayDate(action.target)}</small></li>)}
        </ul>
        {!priorities.length && !overdue.length && <p className={s.sub}>No elevated residual hazards or overdue actions in this scope.</p>}
      </section>
    </div>

    <section ref={register} id="risk-assessments" className={`${s.panel} ${s.register}`} aria-labelledby="register-title">
      <header className={s.panelHead}>
        <h2 id="register-title">Risk Assessments</h2>
        <button type="button" className={s.button} disabled={!visible.length} onClick={() => exportRows(visible)}>Export CSV</button>
      </header>
      <p className={s.sub}>Latest revision per assessment. Scores show the highest recorded value at each stage. Earlier versions are available under History and Archived.</p>
      <div className={s.tabs} aria-label="Register grouping" role="group">
        {groupViews.map(([key, label]) => <button type="button" key={key} className={s.button}
          aria-pressed={key === groupView} onClick={() => setGroupView(key)}>{label}</button>)}
        <button type="button" className={s.button} aria-pressed={slice === "archived"} onClick={() => select("archived")}>Archived</button>
      </div>
      <form className={s.filterRow} onSubmit={applyFilters}>
        <DocumentRegisterFilter key={`assessment-${filterVersion}-${slice === "archived"}`} label="Search" name="assessment"
          choices={assessmentOptions}
          selected={scope.assessments} emptyLabel="All assessments"
          search={{ name: "q", value: scope.query, placeholder: "Find an assessment or type a search" }}/>
        <DocumentRegisterFilter key={`site-${filterVersion}`} label="Site" name="site" choices={choices("site")}
          selected={scope.sites} emptyLabel="All sites"/>
        <DocumentRegisterFilter key={`department-${filterVersion}`} label="Department" name="department" choices={choices("department")}
          selected={scope.departments} emptyLabel="All departments"/>
        <div className={s.filterActions}>
          <button type="submit" className={s.primary}>Apply</button>
          <button type="button" className={s.button} onClick={() => { setScope(blankScope); setFilterVersion(version => version + 1); clearDrill(); }}>Clear filters</button>
        </div>
      </form>
      <div className={s.selection}>
        <span role="status">{visible.length} of {source.length} {slice === "archived" ? "archived records" : "latest assessments"}{groupView === "hazard" && " · Assessments can appear in multiple hazard groups"}</span>
        {chip && <><strong>{chip}</strong><button type="button" className={s.linkButton} onClick={clearDrill}>Clear drill-down</button></>}
      </div>
      {visible.length ? <div className={s.tableWrap} role="region" aria-label="Assessment records" tabIndex={0}>
        <table className={s.records}>
          <colgroup>{[21, 24, 11, 15, 13, 16].map((width, index) => <col key={index} style={{ width: width + "%" }}/>)}</colgroup>
          <thead><tr>{["Assessment", "Site, department & assessor", "Approval status", "Initial → residual risk", "Actions & review date", "Quick actions"]
            .map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
          {groupRows(visible, groupView, hazardIds).map(([name, rows]) => <tbody key={name}>
            {name && <tr><th className={s.groupHead} colSpan={6} scope="rowgroup">{name} · {rows.length}</th></tr>}
            {rows.map(row => <AssessmentRow key={row.id} row={row} canContribute={canContribute}/>)}
          </tbody>)}
        </table>
      </div> : <p className={s.empty}>No assessments match this selection.</p>}
    </section>
    <CoverageDialog dialog={dialog} coverage={data.coverage} rate={rate}/>
  </main>;
}
