"use client";
import {useActionState, useEffect, useMemo, useRef, useState} from "react";
import {createPortal} from "react-dom";
import {incidentDrilldown} from "../lib/incident-reporting.mjs";
import {generateIncidentExecutiveReport} from "../app/portal/incidents/actions";
import Link from "next/link";
const colors={critical:"#b42335",high:"#d77618",medium:"#ae8613",low:"#178273",unknown:"#788899"};
export function IncidentBarChart({title,rows,description,filter,query={}}) {
 const max=Math.max(1,...rows.map(r=>r.count));
 return <section className="incidentCard incidentChart"><h2>{title}</h2><p className="incidentMuted">{description}</p>
  {!rows.length?<p className="incidentEmpty">No reports match this selection yet.</p>:<div className="incidentChartRows">{rows.map(row=>{
    const params=new URLSearchParams(Object.entries(query).filter(([,v])=>typeof v==="string"));
    if(filter) params.set(filter,row.key);
    return <div className="incidentChartRow" key={row.key}>
      <div>{filter?<Link href={"/portal/incidents?"+params}>{row.label}</Link>:<span>{row.label}</span>}<strong>{row.count}</strong></div>{Number.isFinite(row.assessed)&&<small className="incidentMuted">{row.assessed} assessed · {row.reported} reporter observations</small>}
      <div className="incidentChartTrack"><span style={{width:(row.count/max*100)+"%",background:colors[row.key]||"#177d83"}} /></div>
    </div>;
  })}</div>}
 </section>;
}
export function SeverityChart({rows,query={}}) {
 const total=rows.reduce((sum,r)=>sum+r.count,0);
 let start=0;
 const segments=rows.map(r=>{const from=start;start+=total?r.count/total*100:0;return `${colors[r.key]} ${from}% ${start}%`;}).join(",");
 return <section className="incidentCard incidentChart"><h2>Current severity</h2><p className="incidentMuted">All current reports. Reporter urgency is provisional until replaced by assessed severity. Rejected and duplicate reports are excluded.</p><div className="incidentDonutLayout">
  <div className="incidentDonut" role="img" aria-label={rows.map(r=>r.label+": "+r.count).join(", ")} style={{background:total?`conic-gradient(${segments})`:"#e7edf2"}}><div><strong>{total}</strong><span>reports</span></div></div>
  <ul className="incidentLegend">{rows.map(r=><li key={r.key}><i style={{background:colors[r.key]}} /><span>{r.key==='unknown'?r.label:<Link href={"/portal/incidents?"+new URLSearchParams({...Object.fromEntries(Object.entries(query).filter(([,v])=>typeof v==='string')),severity:r.key})}>{r.label}</Link>}<small style={{display:"block",fontSize:11,color:"#526579"}}>{r.assessed||0} assessed · {r.reported||0} provisional</small></span><strong>{r.count}</strong></li>)}</ul>
 </div></section>;
}
export function IncidentTrend({months}) {
 const max=Math.max(1,...months.map(m=>m.count));
 const points=months.map((m,i)=>[44+i*96,170-m.count/max*128]);
 return <section className="incidentCard incidentChart"><h2>Six-month occurrence trend</h2><p className="incidentMuted">Reported and assessed events by occurrence month. Rejected and duplicate reports are excluded. The current month may be incomplete; selected filters apply.</p>
  <svg className="incidentTrend" viewBox="0 0 568 224" role="img" aria-label={months.map(m=>m.key+": "+m.count).join(", ")}>
    {[0,1,2].map(i=><line key={i} x1="36" y1={42+i*64} x2="536" y2={42+i*64} stroke="#dce5ec" strokeDasharray="4 5" />)}
    <path d={"M "+points.map(p=>p.join(",")).join(" L ")+" L 524,170 L 44,170 Z"} fill="#e3f3f1" />
    <polyline points={points.map(p=>p.join(",")).join(" ")} fill="none" stroke="#14796e" strokeWidth="3" />
    {months.map((m,i)=><g key={m.key}><circle cx={points[i][0]} cy={points[i][1]} r="5" fill="#14796e" /><text x={points[i][0]} y={points[i][1]-13} textAnchor="middle" fontSize="14" fill="#142a43" fontWeight="700">{m.count}</text><text x={points[i][0]} y="201" textAnchor="middle" fontSize="12" fill="#526579">{new Date(m.key+"-01T00:00:00Z").toLocaleDateString("en-GB",{month:"short",year:"2-digit",timeZone:"UTC"})}</text></g>)}
  </svg>
 </section>;
}

const EVENT_COLORS={accident:"#d14849",incident:"#3178bd",near_miss:"#de9c22",concern:"#7f63b6",disruption:"#0b8c86",other:"#788899"};
const AREAS=[["health_safety","Health & safety"],["quality","Quality"],["environment","Environment"],["information_security","Information security"],["business_continuity","Business continuity"]];
const EXPLORER_CSS=`
.ixExplorer{min-width:0;background:linear-gradient(145deg,#f4faff,#fff);border-top:4px solid #2877af!important}.ixExplorer.ixExpanded{grid-column:1/-1}.ixHead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}.ixHead h2{margin:0}.ixButton{border:1px solid #9bb3c7;background:#fff;color:#123653;border-radius:8px;padding:10px 14px;font:inherit;font-weight:750;cursor:pointer;min-height:44px}.ixButton:disabled{opacity:.55;cursor:wait}.ixButton.primary{background:#123e63;color:#fff;border-color:#123e63}.ixCrumbs{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:18px 0}.ixCrumbs button{border:0;border-radius:6px;padding:8px;background:#e4eef7;color:#164269;font:inherit;cursor:pointer}.ixCrumbs button[aria-current]{background:#164269;color:white}.ixBars{display:grid;gap:14px;margin:20px 0}.ixBar{display:block;width:100%;text-align:left;border:1px solid #d8e4ee;border-radius:10px;padding:12px;background:#fff;color:#163650;cursor:pointer;font:inherit}.ixBar:hover{border-color:#2877af;background:#f2f8fd}.ixBarTop{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:9px}.ixBarTop span{overflow-wrap:anywhere}.ixBarTop strong{font-size:23px}.ixTrack{height:18px;border-radius:5px;background:#eaf0f5;overflow:hidden;display:flex}.ixTrack span{display:block;min-width:0}.ixLegend{display:flex;gap:12px;flex-wrap:wrap;font-size:12px;margin:12px 0}.ixLegend span{display:flex;align-items:center;gap:5px}.ixLegend i{width:10px;height:10px;border-radius:2px}.ixNote{font-size:13px;color:#536b80;line-height:1.55}.ixRecords{display:grid;gap:8px}.ixRecords a{padding:13px;border:1px solid #cadce9;border-radius:9px;color:#163e61;text-decoration:none;background:white}.ixRecords a strong,.ixRecords a small{display:block}.ixRecords small{margin-top:5px}.ixReportLauncher{display:flex;gap:15px;align-items:center;justify-content:flex-end;flex-wrap:wrap;margin:12px 0}.ixReportLauncher p{margin:0;font-size:13px;color:#536b80}.ixBar:focus-visible,.ixButton:focus-visible,.ixCrumbs button:focus-visible{outline:3px solid #edab2f;outline-offset:3px}
`;

export function IncidentExplorer({rows=[]}) {
 const [path,setPath]=useState([]),[expanded,setExpanded]=useState(false);
 const keys=["zone","type","outcome","impact"];
 const selection=Object.fromEntries(path.map((p,i)=>[keys[i],p.key]));
 const chart=useMemo(()=>incidentDrilldown(rows,selection),[rows,JSON.stringify(selection)]);
 const max=Math.max(1,...chart.groups.map(g=>g.count));
 const go=(group)=>{setPath(previous=>[...previous,{key:group.key,label:group.label}]);setExpanded(true);};
 const label=g=>g.key==="body:unknown"?"Body part not recorded":g.key==="body:not_applicable"?"No injury / not applicable":g.label;
 return <section className={"incidentCard ixExplorer "+(expanded?"ixExpanded":"")} aria-label="Interactive incident explorer">
  <style>{EXPLORER_CSS}</style>
  <div className="ixHead"><div><h2>Explore events</h2><p className="ixNote">Select a bar to explore zone → event → consequence → body part or asset → reports.</p></div><button type="button" className="ixButton" onClick={()=>setExpanded(v=>!v)} aria-expanded={expanded}>{expanded?"Collapse graph":"Expand graph"}</button></div>
  <nav className="ixCrumbs" aria-label="Graph drill-down"><button type="button" onClick={()=>setPath([])} aria-current={!path.length?"step":undefined}>All zones</button>{path.map((p,i)=><button type="button" key={i} onClick={()=>setPath(path.slice(0,i+1))} aria-current={i===path.length-1?"step":undefined}>{p.label}</button>)}</nav>
  <div aria-live="polite"><h3>{chart.title}</h3><p className="ixNote">{chart.count} reports in this selection: {chart.assessed} triaged · {chart.provisional} awaiting triage.</p></div>
  {chart.stage==="reports"?<div className="ixRecords">{chart.rows.map(r=><Link key={r.id} href={"/portal/incidents/"+encodeURIComponent(r.id)}><strong>{r.reference} · {r.title}</strong><small>{r.location} · {r.occurredAt?String(r.occurredAt).slice(0,10):"Date not recorded"} · {r.status.replaceAll("_"," ")} · {r.confirmed?"Triaged":"Awaiting triage"} · Consequences: {r.outcomeSource==="assessed"?"assessed":"reporter / not reviewed"} · Body parts: {r.bodyPartSource==="assessed"?"assessed":"reporter / not reviewed"} → Open report</small></Link>)}</div>:chart.groups.length?<div className="ixBars">{chart.groups.map(g=>{
   const scoped=chart.stage==="zones"?chart.rows.filter(r=>r.zoneKey===g.key):[];
   return <button type="button" className="ixBar" key={g.key} onClick={()=>go({...g,label:label(g)})} aria-label={`${label(g)}: ${g.count} reports. Explore next level`}><span className="ixBarTop"><span>{label(g)}</span><strong>{g.count} <small aria-hidden="true">›</small></strong></span><span className="ixTrack" aria-hidden="true">{chart.stage==="zones"?chart.types.map(([key])=>{const count=scoped.filter(r=>r.type===key).length;return count?<span key={key} style={{width:(count/max*100)+"%",background:EVENT_COLORS[key]||EVENT_COLORS.other}}/>:null;}):<span style={{width:(g.count/max*100)+"%",background:EVENT_COLORS[g.key]||"#247f9e"}}/>}</span></button>;
  })}</div>:<p className="incidentEmpty">No reports match this selection. Use the breadcrumbs to return.</p>}
  {chart.stage==="zones"&&<div className="ixLegend">{chart.types.map(([key,name])=><span key={key}><i style={{background:EVENT_COLORS[key]}}/>{name}</span>)}</div>}
  <p className="ixNote">Dashboard filters apply. Counts represent reports, not injured people. {chart.overlap?"One report may appear in multiple consequence or impact groups. ":""}Reporter selections appear immediately and remain provisional until an assessor reviews the relevant fields. Assessed values replace them, including explicit empty assessments. Rejected and duplicate reports are excluded. Injury and cause are never inferred.</p>
 </section>;
}

const REPORT_CSS=`
.ixReportDialog{width:min(1140px,96vw);max-width:96vw;max-height:94dvh;border:1px solid #cad7e3;border-radius:14px;padding:0;color:#14324c;background:#eff4f8}.ixReportDialog::backdrop{background:#071e36aa}.ixReportDialog *{box-sizing:border-box}.ixReportToolbar{position:sticky;top:0;z-index:2;background:#123653;color:#fff;padding:14px 20px;display:flex;gap:10px;justify-content:space-between;align-items:center;flex-wrap:wrap}.ixReportSettings{padding:20px;display:grid;gap:16px;background:#fff}.ixReportDates{display:flex;gap:14px;flex-wrap:wrap}.ixReportSettings label{font-size:14px;display:flex;gap:7px;align-items:center}.ixReportSettings input[type=date]{padding:10px;border:1px solid #9cb3c5;border-radius:6px;font:inherit;max-width:100%}.ixReportSettings fieldset{border:1px solid #cddce7;border-radius:8px;padding:12px}.ixReportSettings legend{font-weight:750}.ixReportChoices{display:flex;gap:10px 18px;flex-wrap:wrap;max-height:180px;overflow:auto}.ixReportSettings input[type=checkbox]{width:18px;height:18px;flex-shrink:0}.ixReportStatus{margin:0;padding:12px 20px;background:#fff2d3;color:#634400}.ixReportError{color:#9f202b;background:#fff0ef;padding:12px}.ixReportPaper{background:#fff;margin:20px;padding:32px;border:1px solid #d6e0e8;font:14px/1.55 Arial,sans-serif;color:#182f43}.ixReportBrand{display:flex;align-items:center;justify-content:space-between;gap:24px;border-bottom:3px solid #16476c;padding-bottom:16px}.ixReportBrand img{width:210px;height:74px;object-fit:contain}.ixReportPaper h1{font-size:27px;margin:20px 0 8px}.ixReportPaper h2{font-size:18px;margin-top:25px;color:#16476c}.ixReportPaper h3{font-size:15px}.ixReportPaper table{width:100%;border-collapse:collapse;margin:10px 0;table-layout:fixed}.ixReportPaper th,.ixReportPaper td{text-align:left;border-bottom:1px solid #d5e1e8;padding:9px;overflow-wrap:anywhere}.ixReportPaper th{background:#edf4f8}.ixReportPaper td:last-child,.ixReportPaper th:last-child{text-align:right;width:100px}.ixReportKpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:18px 0}.ixReportKpis div{padding:12px;background:#edf4f8;border-radius:7px}.ixReportKpis strong,.ixReportKpis span{display:block}.ixReportKpis strong{font-size:26px}.ixPrintOnly{display:none}.ixReportFooter{font-size:11px;margin-top:26px;padding-top:12px;border-top:1px solid #d5e1e8;color:#536778}
@media(max-width:600px){.ixReportPaper{margin:10px;padding:16px}.ixReportBrand{gap:10px;flex-wrap:wrap}.ixReportBrand img{width:150px;height:54px}.ixReportKpis{grid-template-columns:repeat(2,1fr)}.ixReportSettings{padding:14px}.ixReportPaper h1{font-size:22px}}
@media print{@page{size:A4;margin:14mm}body>*:not(.incidentExecutivePortal){display:none!important}.incidentExecutivePortal{display:block!important}.ixReportDialog{display:block!important;position:static!important;width:100%!important;max-width:none!important;max-height:none!important;height:auto!important;overflow:visible!important;margin:0!important;padding:0!important;border:0!important;background:#fff!important}.ixReportDialog::backdrop{display:none}.ixNoPrint{display:none!important}.ixPrintOnly{display:block}.ixReportPaper{border:0;margin:0;padding:0;font-size:10pt}.ixReportPaper h2,.ixReportPaper h3{break-after:avoid}.ixReportPaper tr,.ixReportKpis,.ixReportBrand{break-inside:avoid}.ixReportPaper thead{display:table-header-group}.ixReportPaper a{color:inherit;text-decoration:none}.ixReportPaper *{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
`;

function ReportTable({title,rows}) {
 const maximum=Math.max(1,...rows.map(row=>row.count));
 return <section><h2>{title}</h2>{rows.length?<table><thead><tr><th scope="col">Classification</th><th scope="col">Reports</th></tr></thead><tbody>{rows.map(row=><tr key={row.key}><td>{row.label}<span aria-hidden="true" style={{display:"block",height:7,marginTop:5,background:"#e5edf3",borderRadius:3}}><span style={{display:"block",height:"100%",width:(row.count/maximum*100)+"%",background:"#277aa0",borderRadius:3}}/></span></td><td>{row.count}</td></tr>)}</tbody></table>:<p>No assessed data recorded for this selection.</p>}</section>;
}
function ExecutiveBuilder({onClose,sites,zones}) {
 const today=new Date().toISOString().slice(0,10);
 const [from,setFrom]=useState(today.slice(0,4)+"-01-01"),[to,setTo]=useState(today);
 const [areas,setAreas]=useState(AREAS.map(([key])=>key)),[siteIds,setSiteIds]=useState([]),[zoneIds,setZoneIds]=useState([]);
 const [logo,setLogo]=useState(null),[logoError,setLogoError]=useState(""),[brandError,setBrandError]=useState(false);
 const dialog=useRef(null),upload=useRef(0);
 const signature=JSON.stringify({from,to,areas:[...areas].sort(),sites:[...siteIds].sort(),zones:[...zoneIds].sort()});
 const [state,action,pending]=useActionState(async(previous,fd)=>{
  const submitted=JSON.stringify({from:fd.get("from"),to:fd.get("to"),areas:fd.getAll("areas").sort(),sites:fd.getAll("sites").sort(),zones:fd.getAll("zones").sort()});
  const result=await generateIncidentExecutiveReport(previous,fd);
  return {...result,signature:submitted};
 },null);
 const fresh=Boolean(state?.report&&state.signature===signature&&!state.error&&!pending);
 const report=state?.report;
 useEffect(()=>{const node=dialog.current;node?.showModal();return()=>{upload.current++;node?.close();};},[]);
 useEffect(()=>()=>{if(logo)URL.revokeObjectURL(logo);},[logo]);
 const toggle=(setter,key)=>setter(values=>values.includes(key)?values.filter(v=>v!==key):[...values,key]);
 const scopedZones=zones.filter(z=>!siteIds.length||siteIds.includes(z.siteId));
 async function chooseLogo(event){
  const file=event.target.files?.[0],token=++upload.current;setLogoError("");if(!file)return;
  if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>2*1024*1024){setLogoError("Choose a PNG, JPEG or WebP logo up to 2 MB.");event.target.value="";return;}
  const url=URL.createObjectURL(file);const image=new Image();image.src=url;
  try{await image.decode();if(!image.width||!image.height||image.width>12000||image.height>12000)throw Error();if(token===upload.current)setLogo(url);else URL.revokeObjectURL(url);}
  catch{URL.revokeObjectURL(url);if(token===upload.current)setLogoError("This image could not be read. Choose a smaller valid logo.");}
 }
 const areaLabels=report?.areas.map(key=>AREAS.find(([k])=>k===key)?.[1]||key).join(", ");
 const selectedLabels=(items,ids)=>ids.length?items.filter(item=>ids.includes(item.id)).map(item=>item.label).join("; "):"All authorised locations";
 return createPortal(<div className="incidentExecutivePortal"><style>{REPORT_CSS}</style><dialog ref={dialog} className="ixReportDialog" onCancel={event=>{event.preventDefault();onClose();}} aria-labelledby="ixReportTitle">
  <div className="ixReportToolbar ixNoPrint"><strong id="ixReportTitle">Executive report builder</strong><div><button type="button" className="ixButton" disabled={!fresh||Boolean(logoError)} onClick={()=>window.print()}>Print / Save PDF</button>{" "}<button type="button" className="ixButton" onClick={onClose}>Close</button></div></div>
  <form action={action} className="ixReportSettings ixNoPrint">
   <div className="ixReportDates"><label>From (UTC) <input type="date" name="from" value={from} required onChange={e=>setFrom(e.target.value)}/></label><label>To (UTC) <input type="date" name="to" value={to} min={from} required onChange={e=>setTo(e.target.value)}/></label></div>
   <fieldset><legend>Reporting areas</legend><div className="ixReportChoices">{AREAS.map(([key,label])=><label key={key}><input type="checkbox" name="areas" value={key} checked={areas.includes(key)} onChange={()=>toggle(setAreas,key)}/>{label}</label>)}</div></fieldset>
   <fieldset><legend>Sites — leave clear for all authorised sites</legend><div className="ixReportChoices">{sites.map(site=><label key={site.id}><input type="checkbox" name="sites" value={site.id} checked={siteIds.includes(site.id)} onChange={()=>{toggle(setSiteIds,site.id);setZoneIds([]);}}/>{site.label}</label>)}{!sites.length&&<span>No site choices recorded.</span>}</div></fieldset>
   <fieldset><legend>Zones — leave clear for all zones in the selected sites</legend><div className="ixReportChoices">{scopedZones.map(zone=><label key={zone.id}><input type="checkbox" name="zones" value={zone.id} checked={zoneIds.includes(zone.id)} onChange={()=>toggle(setZoneIds,zone.id)}/>{zone.label}</label>)}{!scopedZones.length&&<span>No zone choices in this selection.</span>}</div></fieldset>
   <div><label>Optional company logo <input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseLogo}/></label><p className="ixNote">Logo stays in this browser session. PNG, JPEG or WebP, up to 2 MB.</p>{logo&&<><button type="button" className="ixButton" onClick={()=>{upload.current++;setLogo(null);setLogoError("");}}>Remove company logo</button>{" "}<a href={logo} download="company-report-logo">Download company logo</a></>}{" "}<a href="/rpg-report-logo.png" download="rpg-report-logo.png">Download RPG logo</a>{logoError&&<p role="alert" className="ixReportError">{logoError}</p>}</div>
   <button className="ixButton primary" disabled={pending||!areas.length}>{pending?"Generating authorised report…":"Generate executive report"}</button>
   {state?.error&&<p className="ixReportError" role="alert">{state.error}</p>}
  </form>
  {report&&!fresh&&<p className="ixReportStatus ixNoPrint" role="status">This draft needs to be regenerated before printing. Current selections or generation status differ from the displayed draft.</p>}
  {report?<article className="ixReportPaper" aria-label="Executive report draft">
   <header className="ixReportBrand">{!brandError?<img src="/rpg-report-logo.png" alt="RPG Excellence" onError={()=>setBrandError(true)}/>:<strong>RPG Excellence</strong>}{logo&&<img src={logo} alt="Company logo"/>}</header>
   <h1>{report.companyName} · Incident executive review</h1><p><strong>{report.status}</strong> · Occurrence period {report.from} to {report.to} (UTC)</p><p>Snapshot: {report.snapshot.replace("T"," ").slice(0,19)} UTC<br/>Areas: {areaLabels}<br/>Sites: {selectedLabels(sites,report.sites)}<br/>Zones: {selectedLabels(zones,report.zones)}</p>
   <h2>Leadership position</h2><p>{report.summary}</p>
   <div className="ixReportKpis">{[["Received",report.received],["Confirmed",report.confirmed],["Awaiting triage",report.pending],["Open confirmed",report.open],["Critical / danger alerts",report.urgent],["Overdue actions",report.overdueActions]].map(([label,value])=><div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
   <h2>Decisions and accountability</h2><ol>{report.decisions.map((text,i)=><li key={i}>{text}</li>)}</ol><p>Confirmed cases awaiting required director approval: <strong>{report.awaitingDirector}</strong>. Agree accountable owners, resources and review dates through the existing case and action controls.</p>
   <h2>Current reporting picture</h2><p>Charts include {report.included} reports, including cases awaiting triage. Assessor-reviewed values replace reporter observations. {report.outcomesReported} reports contribute provisional consequences and {report.bodyPartsReported} contribute provisional body-part selections. Rejected and duplicate reports are excluded.</p><ReportTable title="Current event types" rows={report.counts}/><ReportTable title="Current events by zone" rows={report.zoneCounts}/><ReportTable title="Current injuries and consequences" rows={report.outcomeCounts}/><ReportTable title="Current body parts" rows={report.bodyCounts}/>
   <h2>Recorded operational impact</h2><p>Lost working days recorded: <strong>{report.lostDays}</strong>; {report.lostDaysMissing} confirmed reports have no recorded value. Business disruption recorded: <strong>{report.disruptionMinutes} minutes</strong>; {report.disruptionMissing} confirmed reports have no recorded value. Missing values are not evidence of zero impact.</p>
   <h2>Basis and limitations</h2><ul>{report.limitations.map((text,i)=><li key={i}>{text}</li>)}</ul>
   <footer className="ixReportFooter">Confidential · Leadership review draft · Review accuracy, scope and approval before circulation. Generated from authorised RPG Excellence records.</footer>
  </article>:<p className="ixReportStatus">Select a period and scope, then generate a draft from your authorised records.</p>}
 </dialog></div>,document.body);
}

export function IncidentExecutiveReport({canGenerate=false,sites=[],zones=[]}) {
 const [open,setOpen]=useState(false);
 return <div className="ixReportLauncher"><style>{EXPLORER_CSS}</style>{canGenerate?<button type="button" className="ixButton primary" onClick={()=>setOpen(true)}>Create executive report →</button>:<><p>Executive reports are included in Consultant access.</p><Link className="ixButton" href="/en/pricing">View plans</Link></>}{open&&<ExecutiveBuilder sites={sites} zones={zones} onClose={()=>setOpen(false)}/>}</div>;
}
