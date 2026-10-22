import Link from "next/link";
const colors={critical:"#b42335",high:"#d77618",medium:"#ae8613",low:"#178273"};
export function IncidentBarChart({title,rows,description,filter,query={}}) {
 const max=Math.max(1,...rows.map(r=>r.count));
 return <section className="incidentCard incidentChart"><h2>{title}</h2><p className="incidentMuted">{description}</p>
  {!rows.length?<p className="incidentEmpty">No assessed data yet. New reports will appear after review.</p>:<div className="incidentChartRows">{rows.map(row=>{
    const params=new URLSearchParams(Object.entries(query).filter(([,v])=>typeof v==="string"));
    if(filter) params.set(filter,row.key);
    return <div className="incidentChartRow" key={row.key}>
      <div>{filter?<Link href={"/portal/incidents?"+params}>{row.label}</Link>:<span>{row.label}</span>}<strong>{row.count}</strong></div>
      <div className="incidentChartTrack"><span style={{width:(row.count/max*100)+"%",background:colors[row.key]||"#177d83"}} /></div>
    </div>;
  })}</div>}
 </section>;
}
export function SeverityChart({rows}) {
 const total=rows.reduce((sum,r)=>sum+r.count,0);
 let start=0;
 const segments=rows.map(r=>{const from=start;start+=total?r.count/total*100:0;return `${colors[r.key]} ${from}% ${start}%`;}).join(",");
 return <section className="incidentCard incidentChart"><h2>Assessed severity</h2><p className="incidentMuted">Reviewed cases only. Reporter urgency remains separate.</p><div className="incidentDonutLayout">
  <div className="incidentDonut" role="img" aria-label={rows.map(r=>r.label+": "+r.count).join(", ")} style={{background:total?`conic-gradient(${segments})`:"#e7edf2"}}><div><strong>{total}</strong><span>assessed</span></div></div>
  <ul className="incidentLegend">{rows.map(r=><li key={r.key}><i style={{background:colors[r.key]}} /><span>{r.label}</span><strong>{r.count}</strong></li>)}</ul>
 </div></section>;
}
export function IncidentTrend({months}) {
 const max=Math.max(1,...months.map(m=>m.count));
 const points=months.map((m,i)=>[44+i*96,170-m.count/max*128]);
 return <section className="incidentCard incidentChart"><h2>Six-month occurrence trend</h2><p className="incidentMuted">Confirmed events by occurrence month. The current month may be incomplete; selected filters apply.</p>
  <svg className="incidentTrend" viewBox="0 0 568 224" role="img" aria-label={months.map(m=>m.key+": "+m.count).join(", ")}>
    {[0,1,2].map(i=><line key={i} x1="36" y1={42+i*64} x2="536" y2={42+i*64} stroke="#dce5ec" strokeDasharray="4 5" />)}
    <path d={"M "+points.map(p=>p.join(",")).join(" L ")+" L 524,170 L 44,170 Z"} fill="#e3f3f1" />
    <polyline points={points.map(p=>p.join(",")).join(" ")} fill="none" stroke="#14796e" strokeWidth="3" />
    {months.map((m,i)=><g key={m.key}><circle cx={points[i][0]} cy={points[i][1]} r="5" fill="#14796e" /><text x={points[i][0]} y={points[i][1]-13} textAnchor="middle" fontSize="14" fill="#142a43" fontWeight="700">{m.count}</text><text x={points[i][0]} y="201" textAnchor="middle" fontSize="12" fill="#526579">{new Date(m.key+"-01T00:00:00Z").toLocaleDateString("en-GB",{month:"short",year:"2-digit",timeZone:"UTC"})}</text></g>)}
  </svg>
 </section>;
}
