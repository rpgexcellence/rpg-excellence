"use client";

import Link from "next/link";
import { useState } from "react";
import { RecordIcon } from "../../../../components/DocumentRecordTabs";
import { toRiskCsv } from "../../../../lib/isms-risk-assurance.mjs";
import { INCIDENT_SEVERITIES, RESPONSE_STAGES, incidentActive, incidentDateScope, incidentTrend, recoveryOverdue } from "../../../../lib/security-incident-register.mjs";
import DocumentRegisterFilter from "../../documents/DocumentRegisterFilter";
import hs from "../../health-safety/risk-assessment/risk-assurance.module.css";
import p from "../../health-safety/powra/powra.module.css";
import s from "./security-incident-register.module.css";

const ROOT = "/portal/information-security/incidents";
const label = value => String(value || "").replaceAll("_"," ").replace(/\b\w/g, letter => letter.toUpperCase());
const fullDate = new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeStyle:"short",timeZone:"Europe/London"});
const dayDate = new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeZone:"Europe/London"});
const format = (value,formatter=dayDate) => value && Number.isFinite(Date.parse(value)) ? formatter.format(new Date(value)) : "—";
const site = record => record.administration_location_label || "No location recorded";
const target = record => record.target_recovery_date || "none";
const fields = [
  ["record","Incident / reference",r=>r.id,r=>r.incident_reference+" · "+r.title],
  ["type","Type",r=>r.incident_type,r=>label(r.incident_type)],
  ["site","Site / location",site,site],
  ["severity","Severity",r=>r.severity,r=>label(r.severity)],
  ["status","Status",r=>r.status,r=>label(r.status)],
  ["target","Recovery target",target,r=>r.target_recovery_date?format(r.target_recovery_date):"No target recorded"],
  ["lead","Owner",r=>r.lead,r=>r.lead],
];
const headers = ["Incident / reference","Type","Site / location","Detected","Severity","Status","Recovery target","Owner","Quick actions"];

function download(records,today) {
  const rows = [["Reference","Title","Type","Site","Detected","Severity","Status","Recovery target","Owner"],
    ...records.map(r=>[r.incident_reference,r.title,label(r.incident_type),site(r),r.detected_at,label(r.severity),label(r.status),r.target_recovery_date,r.lead])];
  const url = URL.createObjectURL(new Blob([toRiskCsv(rows)],{type:"text/csv;charset=utf-8"}));
  const link = document.createElement("a");
  link.href=url; link.download="Security_Incident_Register_"+today+".csv";
  document.body.append(link); link.click(); link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function ChartPanel({ name,icon,children }) {
  return <section className={hs.panel}><h2 className={s.heading}><RecordIcon name={icon}/>{name}</h2>{children}</section>;
}

export default function SecurityIncidentRegister({ organization,today,records,canCreate }) {
  const [range,setRange] = useState({from:"",to:""});
  const [rangeError,setRangeError] = useState("");
  const [severityScope,setSeverityScope] = useState("active");
  const [drill,setDrill] = useState(null);
  const [checked,setChecked] = useState({});
  const [filterVersion,setFilterVersion] = useState(0);
  const [rangeVersion,setRangeVersion] = useState(0);

  const scoped = incidentDateScope(records,range.from,range.to);
  const active = scoped.filter(incidentActive);
  const severityRows = severityScope === "active" ? active : scoped;
  const closedCritical = scoped.filter(record=>record.status==="closed"&&record.severity==="critical").length;
  const trend = incidentTrend(scoped,range.from,range.to,today);
  const max = Math.max(1,...trend.buckets.map(bucket=>bucket.count));
  const metrics = [
    ["Active incidents","scope","blue",incidentActive,scoped.length+" total records"],
    ["High or critical","alert","red",r=>incidentActive(r)&&["high","critical"].includes(r.severity),"Active cases"],
    ["Overdue recovery","calendar","amber",r=>recoveryOverdue(r,today),"Active cases past recovery target"],
    ["Awaiting verification","checkCircle","green",r=>r.status==="awaiting_verification","Independent decision due"],
  ];
  const visible = scoped.filter(row =>
    (!drill || drill.match(row)) && fields.every(([key,,get])=>!checked[key]?.length || checked[key].includes(String(get(row) || ""))));
  const choices = fields.map(([key,heading,get,display])=>[key,heading,
    [...new Map(records.filter(r=>get(r)).map(r=>[String(get(r)),{value:String(get(r)),label:display(r)}])).values()]
      .sort((a,b)=>a.label.localeCompare(b.label,"en-GB"))]);
  const severities = INCIDENT_SEVERITIES.map(([key,name,colour])=>[key,name,colour,severityRows.filter(row=>row.severity===key).length]);
  let offset = 0;
  const slices = severities.flatMap(([, ,colour,n])=>{
    if (!n) return [];
    const start=offset;
    offset+=100*n/severityRows.length;
    return [colour+" "+start+"% "+offset+"%"];
  });

  function select(key,label,match) {
    setDrill(drill?.key===key?null:{key,label,match});
  }
  function applyRange(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const from = String(data.get("from") || ""), to = String(data.get("to") || "");
    if (from && to && from > to) {
      setRangeError("The start date must be on or before the end date.");
      return;
    }
    setRangeError("");
    setRange({from,to});
    setDrill(null);
  }
  function changeScope(value) {
    setSeverityScope(value);
    if (drill?.key.startsWith("severity:")) setDrill(null);
  }
  function applyFilters(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setChecked(Object.fromEntries(fields.map(([key])=>[key,data.getAll(key)])));
    setFilterVersion(v=>v+1);
  }
  function clearFilters() {
    setChecked({}); setDrill(null); setFilterVersion(v=>v+1);
  }

  return <main className={hs.page + " " + s.registerPage}>
    <p className={p.crumb}><Link href="/portal/information-security">Information Security</Link> / Security Incidents</p>
    <header className={p.hero}>
      <div className={p.identity}><span className={p.iconBox}><RecordIcon name="scope"/></span><div><strong>RPG EXCELLENCE / INFORMATION SECURITY</strong>
        <h1>Security Incident Register</h1><p>{organization} · Report, contain, investigate, recover and verify.</p></div></div>
      <div className={p.actions}><Link className={p.button} href="/portal/information-security">ISMS Hub</Link>
        <Link className={p.button} href="/portal/incidents?domain=information_security">Unified reporting &amp; triage</Link>
        {canCreate && <Link className={p.primary} href={ROOT+"/new"}>+ Report incident</Link>}</div>
    </header>

    <form className={s.dateBar} onSubmit={applyRange} key={rangeVersion} aria-label="Detection date range">
      <strong>Detection date range</strong>
      <label>From <input type="date" name="from" defaultValue={range.from} min="0001-01-01" max="9999-12-31"/></label>
      <label>To <input type="date" name="to" defaultValue={range.to} min="0001-01-01" max="9999-12-31"/></label>
      <button type="submit" className={hs.primary}>Apply dates</button>
      <button type="button" className={hs.button} onClick={()=>{setRange({from:"",to:""});setRangeError("");setDrill(null);setRangeVersion(v=>v+1);}}>Clear dates</button>
      {rangeError && <span role="alert" className={hs.overdue}>{rangeError}</span>}
    </form>

    <section className={s.kpis} aria-label="Incident indicators">
      {metrics.map(([name,icon,tone,predicate,note],i)=><button key={name} type="button" className={p.metric + " " + s[tone]}
        aria-pressed={drill?.key==="kpi:"+i} onClick={()=>select("kpi:"+i,name,predicate)}><span className={p.metricIcon}><RecordIcon name={icon}/></span>
        <span className={p.metricContent}><strong>{scoped.filter(predicate).length}</strong>{name}<small>{note}</small></span></button>)}
    </section>

    <div className={s.board}>
      <ChartPanel name="Incident trend" icon="matrix">
        <p className={hs.sub}>Detected incidents · All statuses{!range.from && " · Six months"}</p>
        <div className={s.trend} style={{"--columns":trend.buckets.length}}>{trend.buckets.map(bucket=><button key={bucket.key} type="button"
          aria-label={bucket.label+" · "+bucket.count+" detected"} aria-pressed={drill?.key==="month:"+bucket.key}
          onClick={()=>select("month:"+bucket.key,bucket.label+" detections",r=>trend.keyFor(r)===bucket.key)}>
          <i aria-hidden="true" style={{height:bucket.count/max*100+"%",visibility:bucket.count?"visible":"hidden"}}/>
          <span>{bucket.label}<br/><strong>{bucket.count}</strong></span>
        </button>)}</div>
      </ChartPanel>
      <ChartPanel name="Incidents by severity" icon="details">
        <div className={s.chartHead}><p className={hs.sub}>Select a severity to filter the register.</p>
          <div className={s.segment} role="group" aria-label="Severity scope">
            <button type="button" aria-pressed={severityScope==="active"} onClick={()=>changeScope("active")}>Active</button>
            <button type="button" aria-pressed={severityScope==="all"} onClick={()=>changeScope("all")}>All records</button>
          </div></div>
        <div className={s.ringRow}>
          <div className={s.ring} style={{background:slices.length?"conic-gradient("+slices.join(",")+")":undefined}}>
            <div><strong>{severityRows.length}</strong><span>{severityScope==="active"?"Active":"All records"}</span></div>
          </div>
          <div className={s.drills}>{severities.map(([key,name,colour,count])=><button type="button" key={key} aria-pressed={drill?.key==="severity:"+key}
            onClick={()=>select("severity:"+key,name+" · "+(severityScope==="active"?"active incidents":"all records"),
              row=>row.severity===key&&(severityScope==="all"||incidentActive(row)))}>
            <span><i className={s.dot} style={{background:colour}}/>{name}</span>
            <strong>{count}{severityRows.length ? " · "+Math.round(100*count/severityRows.length)+"%" : ""}</strong>
          </button>)}</div>
        </div>
        {closedCritical>0 && <p className={hs.sub}>{closedCritical} closed critical {closedCritical===1?"record":"records"}.</p>}
      </ChartPanel>
      <ChartPanel name="Incident response stages" icon="workflow">
        <p className={hs.sub}>Active incidents by current stage</p>
        {!active.length && <p className={hs.empty}>No active incidents in this date range.</p>}
        <div className={s.drills}>{RESPONSE_STAGES.map(([name,statuses])=><button type="button" key={name} aria-pressed={drill?.key==="stage:"+name}
          onClick={()=>select("stage:"+name,name,r=>incidentActive(r)&&statuses.includes(r.status))}>
          <span>{name}</span><strong>{active.filter(r=>statuses.includes(r.status)).length}</strong>
        </button>)}</div>
      </ChartPanel>
    </div>

    <section id="incident-register" className={hs.panel + " " + hs.register} aria-labelledby="incidentRegisterTitle">
      <header className={hs.panelHead}><h2 id="incidentRegisterTitle" className={s.heading}><RecordIcon name="clipboard"/>Controlled incidents</h2>
        <button type="button" className={hs.button} onClick={()=>download(visible,today)} disabled={!visible.length}>Export filtered CSV</button></header>
      <form className={s.filters} onSubmit={applyFilters}>
        {choices.map(([key,heading,options])=><DocumentRegisterFilter key={key+filterVersion} name={key} label={heading}
          choices={options} selected={checked[key] || []} emptyLabel="All" searchOptions/>)}
        <div className={hs.filterActions}><button type="submit" className={hs.primary}>Apply</button>
          <button type="button" className={hs.button} onClick={clearFilters}>Clear filters</button></div>
      </form>
      <div className={hs.selection}><span role="status">{visible.length} of {scoped.length} records{range.from || range.to ? " in date range" : ""}</span>
        {drill && <><strong>{drill.label}</strong><button className={hs.linkButton} type="button" onClick={()=>setDrill(null)}>Clear chart selection</button></>}</div>
      {visible.length ? <div className={hs.tableWrap} tabIndex={0} role="region" aria-label="Incident records"><table className={hs.records}>
        <thead><tr>{headers.map(header=><th scope="col" key={header}>{header}</th>)}</tr></thead>
        <tbody>{visible.map(r=>{
          const href=ROOT+"/"+encodeURIComponent(r.id);
          const band=["critical","high"].includes(r.severity)?"unacceptable":r.severity==="medium"?"adequate":"acceptable";
          return <tr key={r.id}>
            <th scope="row"><Link href={href}>{r.title}</Link><small>{r.incident_reference}</small></th>
            <td>{label(r.incident_type)}</td><td>{site(r)}</td><td>{format(r.detected_at,fullDate)}</td>
            <td><span className={hs.badge} data-band={band}>{label(r.severity)}</span></td>
            <td><span className={hs.workflow}>{label(r.status)}</span></td>
            <td className={recoveryOverdue(r,today)?hs.overdue:undefined}>{format(r.target_recovery_date)}{recoveryOverdue(r,today)&&<small>Overdue</small>}</td>
            <td>{r.lead}</td><td><div className={hs.rowActions}><Link href={href}>Open</Link>
              <Link href={href+"/report#investigation"}>Investigation</Link><Link href={href+"/report#recovery"}>Recovery</Link>
              <Link href={href+"/report#verification"}>Verification</Link></div></td>
          </tr>;
        })}</tbody>
      </table></div>:<p className={hs.empty}>No incidents match this view.</p>}
    </section>
  </main>;
}
