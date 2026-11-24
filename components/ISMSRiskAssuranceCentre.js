"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { RecordIcon } from "./DocumentRecordTabs";
import { soaControlHref } from "../lib/soa-workflow.mjs";
import { BASES, RISK_BANDS, acceptanceState, activeRisk, controlState, rating, riskBand, toRiskCsv, treatmentOpen } from "../lib/isms-risk-assurance.mjs";
import p from "../app/portal/health-safety/powra/powra.module.css";
import s from "./ISMSRiskAssuranceCentre.module.css";

const ROOT = "/portal/information-security/risk-management";
const LIKELIHOOD = ["Rare", "Unlikely", "Possible", "Likely", "Almost certain"];
const IMPACT = ["Insignificant", "Minor", "Moderate", "Major", "Severe"];
const SCALE = [1, 2, 3, 4, 5];
const RESPONSES = { modify: "Modify", avoid: "Avoid", share: "Share or transfer", retain: "Retain" };
const DATE = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Europe/London" });
const title = text => text ? text.replaceAll("_", " ").replace(/^\w/, c => c.toUpperCase()) : "Not recorded";
const date = value => value && Number.isFinite(Date.parse(value)) ? DATE.format(new Date(value)) : "Not recorded";

function Score({ risk, basis }) {
  const item = rating(risk, basis);
  if (!item) return <span className={s.muted}>Unrated</span>;
  const [, , label, background, color] = riskBand(item.score);
  return <span className={s.badge} style={{ background, color }}>{item.likelihood} × {item.impact} = {item.score}<small>{label}</small></span>;
}

function Panel({ heading, icon, children, className = "" }) {
  return <section className={s.panel + " " + className}>
    <h2>{icon && <RecordIcon name={icon}/>} {heading}</h2>{children}
  </section>;
}

function Table({ headers, rows, empty = "No matching records." }) {
  if (!rows.length) return <p className={s.note} role="status">{empty}</p>;
  return <div className={s.tableWrap}><table className={s.table}>
    <thead><tr>{headers.map(header => <th key={header} scope="col">{header}</th>)}</tr></thead>
    <tbody>{rows.map(([key, ...cells]) => <tr key={key}>{cells.map((cell, index) =>
      <td key={headers[index]} data-label={headers[index]}>{cell}</td>)}</tr>)}</tbody>
  </table></div>;
}

function ControlLink({ control }) {
  const label = control.control_id.startsWith("A.") ? control.control_id : "A." + control.control_id;
  return control.assessment_id ?
    <Link href={soaControlHref(control.assessment_id, control.control_id)} title={control.name}>{label}</Link> :
    <span title="No linked SoA workspace">{label}</span>;
}

function HeatMap({ records, mode, setMode, cell, selectCell, appetite, methodology }) {
  const counts = new Map();
  for (const { risk } of records) {
    const item = rating(risk, mode);
    if (item) counts.set(item.cell, (counts.get(item.cell) || 0) + 1);
  }
  const labels = (criteria, fallback) => SCALE.map(score =>
    Array.isArray(criteria) ? criteria.find(item => Number(item.score) === score)?.label || fallback[score - 1] : fallback[score - 1]);
  const impacts = labels(methodology?.impact_criteria, IMPACT);
  const likelihood = labels(methodology?.likelihood_criteria, LIKELIHOOD);
  return <Panel heading="Risk heat map" icon="matrix" className={s.heatPanel}>
    <div className={s.headingRow}><p className={s.muted}>Select a cell to filter the register. Large numbers count risks.</p>
      <div className={s.segment} aria-label="Risk score basis">{Object.entries(BASES).map(([key, label]) =>
        <button key={key} type="button" aria-pressed={mode === key} onClick={() => setMode(key)}>{label}</button>)}</div>
    </div>
    {[5, 4, 3, 2, 1].map(y => <div key={y} className={s.heatRow}>
      <div className={s.impact}><strong>{y}</strong><span>{impacts[y - 1]}</span></div>
      {SCALE.map(x => {
        const score = x * y, key = x + "-" + y;
        const [, , label, background, color] = riskBand(score);
        const count = counts.get(key) || 0;
        return <button key={key} type="button" style={{ background, color }} data-above={score > appetite || undefined}
          aria-pressed={cell === key} onClick={() => selectCell(key)}
          aria-label={BASES[mode] + ", likelihood " + x + ", impact " + y + ", score " + score + ", " + count + " risks" + (score > appetite ? ", above appetite" : "")}>
          <small>{score}</small><strong>{count}</strong><span>{label}</span>
        </button>;
      })}
    </div>)}
    <div className={s.heatRow + " " + s.likelihood}><span/>{likelihood.map((label, index) =>
      <div key={index}><strong>{index + 1}</strong><span>{label}</span></div>)}</div>
    <p className={s.axis}>Likelihood →</p>
    <p className={s.muted}>Corner markers show scores above appetite. The portfolio position uses residual scores.</p>
    <a className={s.jump} href="#ismsRiskRegister">View risk register ↓</a>
  </Panel>;
}

function Acceptance({ action, record, today }) {
  const [result, submit, pending] = useActionState(action, null);
  const { risk, acceptance } = record;
  const status = acceptanceState(risk, acceptance, today);
  return <>
    <p><strong>{status}</strong>{acceptance?.expires_at && " · Expires " + date(acceptance.expires_at)}</p>
    {acceptance && <p>{acceptance.acceptance_authority} · {acceptance.rationale}{acceptance.decided_at && " · " + date(acceptance.decided_at)}</p>}
    {acceptance?.conditions && <p>{acceptance.conditions}</p>}
    {action && status === "Pending decision" && risk.status === "acceptance_pending" && risk.treatment_decision === "retain" &&
      <form action={submit} className={s.decisionForm}>
        <input type="hidden" name="risk_id" value={risk.id}/>
        <input type="hidden" name="request_id" value={acceptance.id}/>
        <label>Decision<select name="decision" required defaultValue=""><option value="">Select decision</option><option value="accepted">Accept residual risk</option><option value="rejected">Reject acceptance</option></select></label>
        <label>Decision justification<textarea required minLength={10} maxLength={2000} name="justification"/></label>
        <button className={p.primary} disabled={pending || Boolean(result?.success)}>Record owner decision</button>
        {result && <p role={result.error ? "alert" : "status"}>{result.error || result.success}</p>}
      </form>}
  </>;
}

function download(filename, rows) {
  const url = URL.createObjectURL(new Blob([toRiskCsv(rows)], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function treatmentRows(items, byId, openRisk) {
  return items.map(action => [action.id,
    <><strong>{action.action}</strong>{byId.has(action.risk_id) &&
      <small><button type="button" className={s.textButton} onClick={() => openRisk(action.risk_id)}>{byId.get(action.risk_id).risk.risk_reference}</button></small>}</>,
    <>{action.action_owner || "Unassigned"}<small>{date(action.target_date)}</small></>,
    title(action.status),
    <>{action.completion_evidence || "Evidence not recorded"}{action.resources && <small>Resources · {action.resources}</small>}</>,
    action.status === "verified" ? "Verified" : action.status === "implemented" ? "Verification outstanding" : title(action.status),
  ]);
}

export default function ISMSRiskAssuranceCentre({
  organizationName, today, methodology, risks, controls, links, treatments, acceptances, soaEntries, acceptanceAction, onNew,
  mode, setMode, cell, setCell, query, setQuery,
}) {
  const [view, setView] = useState("management");
  const [metric, setMetric] = useState("");
  const [band, setBand] = useState("");
  const [owner, setOwner] = useState("");
  const [scope, setScope] = useState("");
  const [lifecycle, setLifecycle] = useState("current");
  const [treatmentFilter, setTreatmentFilter] = useState("");
  const [detailId, setDetailId] = useState("");
  const dialog = useRef(null);
  const appetite = methodology?.appetite_score ?? 9;
  mode = BASES[mode] ? mode : "residual";

  const controlNames = new Map(controls.map(control => [control.control_id, control.control_title]));
  const entries = new Map(soaEntries.map(entry => [entry.assessment_id + ":" + entry.control_id, entry]));
  const records = risks.map(risk => ({
    risk,
    controls: links.filter(link => link.risk_id === risk.id).map(link => {
      const entry = entries.get(link.assessment_id + ":" + link.control_id);
      return { ...link, name: controlNames.get(link.control_id), entry, ...controlState(link, entry) };
    }),
    actions: treatments.filter(action => action.risk_id === risk.id),
    acceptance: acceptances.find(row => row.risk_id === risk.id),
  }));
  const byId = new Map(records.map(record => [record.risk.id, record]));
  const current = records.filter(({ risk }) => activeRisk(risk));
  const activeActions = current.flatMap(record => record.actions);
  const linkedControls = current.flatMap(record => record.controls);
  const isAbove = ({ risk }) => (rating(risk)?.score ?? 0) > appetite;
  const above = current.filter(isAbove);
  const unrated = current.filter(({ risk }) => !rating(risk)).length;
  const overdue = ({ risk }) => Boolean(risk.review_due_date && risk.review_due_date < today);
  const definitions = [
    ["open", "Open risks", "Current portfolio", "scope", "blue", () => true, current.length],
    ["above", "Above appetite", "Current residual score", "alert", "red", isAbove, above.length],
    ["unlinked", "Without SoA controls", "Risk-to-control coverage", "matrix", "green", row => !row.controls.length],
    ["overdue", "Reviews overdue", "Past the due date", "calendar", "amber", overdue],
    ["treatments", "Open treatments", "Outstanding actions", "clipboard", "purple", row => row.actions.some(treatmentOpen), activeActions.filter(treatmentOpen).length],
  ].map(([key, label, note, icon, tone, match, count]) => ({ key, label, note, icon, tone, match, count: count ?? current.filter(match).length }));
  const selectedMetric = definitions.find(item => item.key === metric);
  const portfolio = lifecycle === "all" && !metric && !cell && !band ? records : current;
  const term = String(query || "").trim().toLowerCase();
  const visible = portfolio.filter(record => {
    const { risk } = record;
    return (!selectedMetric || selectedMetric.match(record)) && (!cell || rating(risk, mode)?.cell === cell) &&
      (!band || riskBand(rating(risk)?.score)?.[2] === band) && (!owner || owner === risk.risk_owner) && (!scope || scope === risk.scope) &&
      (!term || [risk.risk_reference, risk.title, risk.risk_owner, risk.scope, ...record.controls.map(control => control.control_id)].join(" ").toLowerCase().includes(term));
  });
  const movement = current.reduce((count, { risk }) => {
    const from = rating(risk, "inherent"), to = rating(risk);
    if (from && to) count[to.score < from.score ? 0 : to.score > from.score ? 2 : 1]++;
    return count;
  }, [0, 0, 0]);
  const matchedActions = activeActions.filter(action => !treatmentFilter ||
    (treatmentFilter === "open" ? treatmentOpen(action) : action.status === treatmentFilter));
  const detail = byId.get(detailId);
  const priority = above.filter(record => acceptanceState(record.risk, record.acceptance, today) !== "Accepted");

  function openRisk(id) {
    setDetailId(id);
    if (!dialog.current.open) dialog.current.showModal();
  }
  function selectMetric(key) {
    const next = key === metric ? "" : key;
    setMetric(next); setCell(""); setBand(""); setLifecycle("current");
    if (key === "treatments" && next) { setView("operational"); setTreatmentFilter("open"); }
    window.requestAnimationFrame(() => document.getElementById(key === "treatments" && next ? "ismsTreatments" : "ismsRiskRegister")?.scrollIntoView({ block: "nearest" }));
  }
  function clear() {
    setQuery(""); setOwner(""); setScope(""); setMetric(""); setCell(""); setBand(""); setLifecycle("current"); setTreatmentFilter("");
  }
  function statusFor(risk, acceptance) {
    const recorded = acceptanceState(risk, acceptance, today);
    if (risk.status === "acceptance_pending" && recorded === "Accepted") return "Acceptance recorded";
    if (risk.status === "acceptance_pending" && recorded === "Rejected") return "Acceptance rejected";
    return title(risk.status);
  }
  function exportRegister() {
    download("ISMS_Risk_Register_" + today + ".csv", [
      ["Organisation","Report date","Register scope","Reference","Risk","Owner","Scope","Status","Inherent","Residual","Target","Approved appetite","Treatment decision","Open treatments","Acceptance","SoA controls","Next review"],
      ...visible.map(({ risk, controls: mapped, actions, acceptance }) => [organizationName,today,portfolio === records ? "All non-archived records" : "Open risks",risk.risk_reference,risk.title,risk.risk_owner,risk.scope,
        statusFor(risk,acceptance),...Object.keys(BASES).map(key => rating(risk,key)?.score),appetite,RESPONSES[risk.treatment_decision],
        actions.filter(treatmentOpen).length,acceptanceState(risk,acceptance,today),mapped.map(control => control.control_id).join(", "),risk.review_due_date]),
    ]);
  }
  function exportSummary() {
    download("ISMS_Management_Summary_" + today + ".csv", [
      ["Organisation","Report date","Scope","Measure","Value"],
      ...[["Approved appetite /25",appetite],...definitions.map(item => [item.label,item.count]),["Unrated residual risks",unrated],
        ...["Selected","Implemented","Verified effective"].map(state => ["Control links · " + state,linkedControls.filter(control => control.state === state).length]),
        ["Control links with open action",linkedControls.filter(control => control.needsAction).length]]
        .map(([label,value]) => [organizationName,today,"Current portfolio",label,value]),
    ]);
  }

  return <div className={s.centre}>
    <p className={p.crumb}>Information Security / Risk Management</p>
    <header className={p.hero}>
      <div className={p.identity}><span className={p.iconBox}><RecordIcon name="scope"/></span><div>
        <strong>RPG EXCELLENCE / INFORMATION SECURITY</strong>
        <h1>Information Security Risk Assurance Centre</h1>
        <p>{organizationName} · Review exposure against appetite, track treatments and record residual-risk decisions.</p>
      </div></div>
      <div className={p.actions}>
        <Link className={p.button} href="/portal/information-security">ISMS Dashboard</Link>
        <Link className={p.button} href="/portal/soa">SoA Register</Link>
        <button type="button" className={p.primary} onClick={onNew}>+ Assess new risk</button>
      </div>
    </header>
    <section className={p.metrics} aria-label="Risk indicators">{definitions.map(item =>
      <button type="button" key={item.key} className={p.metric + " " + s[item.tone]} aria-pressed={item.key === metric} onClick={() => selectMetric(item.key)}>
        <span className={p.metricIcon}><RecordIcon name={item.icon}/></span>
        <span className={p.metricContent}><strong>{item.count}</strong>{item.label}<small>{item.note}</small></span>
      </button>)}</section>
    <nav className={p.tabs} aria-label="Assurance views">
      <button type="button" aria-current={view === "management" ? "page" : undefined} onClick={() => setView("management")}>Management View</button>
      <button type="button" aria-current={view === "operational" ? "page" : undefined} onClick={() => setView("operational")}>Operational View</button>
    </nav>

    {view === "management" ? <div className={s.board}>
      <HeatMap records={current} methodology={methodology} appetite={appetite} mode={mode} cell={cell}
        setMode={next => { setMode(next); setCell(""); }}
        selectCell={key => { setCell(cell === key ? "" : key); setMetric(""); setBand(""); }}/>
      <div className={s.stack}>
        <Panel heading="Risk position" icon="scope">
          <p className={s.muted}>Approved appetite · {appetite}/25{methodology?.version && " · Methodology v" + methodology.version}</p>
          <div className={s.position} data-tone={above.length || unrated ? "attention" : "normal"}>
            <strong>{above.length ? "Attention required · " + above.length + (above.length === 1 ? " risk above appetite" : " risks above appetite") :
              !current.length ? "No open risks" : unrated ? "Attention required · Incomplete residual ratings" : "Within risk appetite"}</strong>
            <p>{current.length - above.length - unrated} within appetite{unrated > 0 && " · " + unrated + " unrated"}</p>
          </div>
          <h3>Inherent → residual movement</h3>
          <div className={s.movement} aria-hidden="true">{movement.map((count, index) =>
            <span key={index} style={{ flexGrow: count, background: ["#0b7668", "#ae7b25", "#ac343e"][index] }}/>)}</div>
          <p className={s.muted}>{movement[0]} lower · {movement[1]} unchanged · {movement[2]} higher</p>
        </Panel>
        <Panel heading="Residual risk profile">
          <div className={s.dataRows}>{RISK_BANDS.map(([min,max,label,color]) => <button type="button" key={label} aria-pressed={band === label}
            onClick={() => { setBand(band === label ? "" : label); setMetric(""); setCell(""); }}>
            <span><i style={{ background: color }}/> {label} · {min}–{max}</span>
            <strong>{current.filter(({ risk }) => riskBand(rating(risk)?.score)?.[2] === label).length} →</strong>
          </button>)}</div>
        </Panel>
      </div>
      <Panel heading="Risk intelligence" icon="alert">
        <p className={s.muted}>Priorities for review and decision.</p>
        <div className={s.dataRows}>{definitions.slice(1).map(item =>
          <button type="button" className={s[item.tone]} key={item.key} aria-pressed={metric === item.key} onClick={() => selectMetric(item.key)}>{item.label}<strong>{item.count} →</strong></button>)}</div>
        {priority.length > 0 && <div className={s.note}><strong>Above-appetite risks without current acceptance</strong>
          {priority.slice(0,3).map(({ risk }) => <p key={risk.id}><button type="button" className={s.textButton} onClick={() => openRisk(risk.id)}>{risk.risk_reference} · {risk.title}</button></p>)}
        </div>}
        <div className={s.note}><strong>{linkedControls.length} SoA control links</strong>
          <p>{linkedControls.filter(control => control.state === "Verified effective").length} verified effective. <button type="button" className={s.textButton} onClick={() => setView("operational")}>View control states</button></p>
        </div>
      </Panel>
    </div> : <div className={s.operations}>
      <Panel heading="Treatment actions" icon="clipboard">
        <div id="ismsTreatments" className={s.filterRow}><label>Status <select value={treatmentFilter} onChange={event => setTreatmentFilter(event.target.value)}>
          <option value="">All actions</option><option value="open">Open actions</option>
          {["planned","in_progress","implemented","verified","cancelled"].map(status => <option value={status} key={status}>{title(status)}</option>)}
        </select></label></div>
        <Table headers={["Action / risk","Owner / target","Status","Evidence","Verification"]} rows={treatmentRows(matchedActions,byId,openRisk)}/>
      </Panel>
      <Panel heading="SoA control states" icon="matrix">
        <div className={s.dataRows}>{["Selected","Implemented","Verified effective"].map(state =>
          <div key={state}>{state}<strong>{linkedControls.filter(control => control.state === state).length}</strong></div>)}
          <div>Links with an open action<strong>{linkedControls.filter(control => control.needsAction).length}</strong></div>
        </div>
        <p className={s.muted}>Open actions may overlap the recorded control states.</p>
        <Table headers={["Annex A control","State","Evidence / action"]} rows={linkedControls.map(control => [
          control.id, <><ControlLink control={control}/><small>{control.name}</small><small>{byId.get(control.risk_id)?.risk.risk_reference}</small></>,
          control.state, <>{control.evidence || "Evidence not recorded"}{control.needsAction && <small>{control.entry.action_required || "Open action"} · {title(control.entry.action_status)}</small>}</>,
        ])}/>
      </Panel>
    </div>}

    <section id="ismsRiskRegister" className={s.panel + " " + s.register}>
      <div className={s.headingRow}><h2>Information security risk register</h2>
        <div className={p.actions}><button type="button" className={p.button} onClick={exportRegister} disabled={!visible.length}><RecordIcon name="download"/>Export register CSV</button>
          <button type="button" className={p.button} onClick={exportSummary}><RecordIcon name="download"/>Export management summary</button></div>
      </div>
      <div className={s.filterRow}>
        <input aria-label="Search risks" type="search" placeholder="Search risk, reference, owner or control" value={query || ""} onChange={event => setQuery(event.target.value)}/>
        <label>Scope <select value={scope} onChange={event => setScope(event.target.value)}><option value="">All scopes</option>{[...new Set(risks.map(risk => risk.scope).filter(Boolean))].sort().map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Owner <select value={owner} onChange={event => setOwner(event.target.value)}><option value="">All owners</option>{[...new Set(risks.map(risk => risk.risk_owner).filter(Boolean))].sort().map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Records <select value={portfolio === records ? "all" : "current"} onChange={event => { setLifecycle(event.target.value); setMetric(""); setCell(""); setBand(""); }}>
          <option value="current">Open risks</option><option value="all">All non-archived records</option>
        </select></label>
        <button type="button" className={p.button} onClick={clear}>Clear filters</button>
      </div>
      <p className={s.muted} role="status">{visible.length} of {portfolio.length} risks shown{selectedMetric && " · " + selectedMetric.label}{band && " · Residual " + band}{cell && " · " + BASES[mode] + " cell " + cell.replace("-", " × ")}</p>
      <Table headers={["Risk / scope","Owner","Inherent","Residual","Target","Treatment / acceptance","SoA controls","Next review"]} rows={visible.map(record => {
        const {risk,controls:mapped,actions,acceptance}=record;
        return [risk.id,
          <><button type="button" className={s.textButton} onClick={() => openRisk(risk.id)}>{risk.risk_reference} · {risk.title}</button><small>{risk.scope || "Scope not recorded"}</small></>,
          risk.risk_owner, <Score risk={risk} basis="inherent"/>,
          <><Score risk={risk} basis="residual"/>{isAbove(record) && <small className={s.danger}>Above appetite</small>}</>,
          <Score risk={risk} basis="target"/>,
          <>{RESPONSES[risk.treatment_decision] || "Decision not recorded"} · {statusFor(risk,acceptance)}<small>{actions.filter(treatmentOpen).length} open · Acceptance {acceptanceState(risk,acceptance,today).toLowerCase()}</small></>,
          mapped.length ? <span className={s.controlLinks}>{mapped.map(control => <ControlLink key={control.id} control={control}/>)}</span> : "None linked",
          date(risk.review_due_date),
        ];
      })}/>
    </section>

    <dialog ref={dialog} className={s.dialog} aria-labelledby="ismsRiskDetails" onClose={() => setDetailId("")}>
      {detail && <>
        <div className={s.headingRow}><h2 id="ismsRiskDetails">{detail.risk.risk_reference} · {detail.risk.title}</h2>
          <button type="button" className={p.button} onClick={() => dialog.current.close()}>Close</button></div>
        <p>{detail.risk.risk_owner} · {detail.risk.scope || "Scope not recorded"} · Review {date(detail.risk.review_due_date)}</p>
        <div className={s.detailScores}>{Object.entries(BASES).map(([basis,label]) => <div key={basis}>{label} <Score risk={detail.risk} basis={basis}/></div>)}</div>
        <h3>SoA controls and evidence</h3>
        <Table headers={["Annex A control","State","Evidence"]} rows={detail.controls.map(control => [control.id,
          <><ControlLink control={control}/> {control.name}</>,<>{control.state}{control.needsAction && <small>Action outstanding</small>}</>,control.evidence || "Evidence not recorded",
        ])}/>
        <h3>Treatment and verification</h3>
        <Table headers={["Action / risk","Owner / target","Status","Evidence","Verification"]} rows={treatmentRows(detail.actions,byId,openRisk)}/>
        <h3>Residual-risk acceptance</h3>{isAbove(detail) && <p className={s.danger}>Above appetite · Exception decision</p>}
        <Acceptance key={detail.acceptance?.id || detailId} action={acceptanceAction} record={detail} today={today}/>
        <Link className={p.button} href={ROOT+"?risk="+encodeURIComponent(detailId)}>Open full risk assessment →</Link>
      </>}
    </dialog>
  </div>;
}
