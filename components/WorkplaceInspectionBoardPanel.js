import Link from "next/link";

import { createAdminClient } from "../lib/supabase/admin";

const ROOT = "/portal/health-safety/workplace-inspections";
const CSS = ".wibPanel{margin-top:14px;padding:21px;border:1px solid #d5e2ea;border-radius:15px;background:#fff;color:#071d3a}.wibHead{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;flex-wrap:wrap}.wibHead h2{margin:0}.wibHead p{margin:6px 0 0;color:#6a8096}.wibHead a{padding:10px 13px;border:1px solid #cbd9e4;border-radius:9px;color:#173b59;text-decoration:none;font-weight:900}.wibMetrics{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin:17px 0}.wibMetric{padding:14px;border-radius:10px;background:#f1f6f9}.wibMetric span,.wibMetric strong,.wibMetric small{display:block}.wibMetric span{font-size:9px;color:#6d8194;font-weight:900;text-transform:uppercase}.wibMetric strong{margin:5px 0;font-size:24px}.wibMetric small{color:#7a8d9e}.wibRed{color:#bf312b}.wibAmber{color:#bb7100}.wibGreen{color:#087e61}.wibLayout{display:grid;grid-template-columns:1fr .8fr;gap:13px}.wibCalendar{border:1px solid #dce6ed;border-radius:11px;overflow:hidden}.wibMonth{padding:12px 14px;background:#0d3b62;color:#fff;font-weight:900}.wibWeek,.wibDays{display:grid;grid-template-columns:repeat(7,1fr)}.wibWeek span{padding:8px;text-align:center;background:#eaf1f6;color:#536e83;font-size:9px;font-weight:900}.wibDay{min-height:74px;padding:6px;border-top:1px solid #e1e9ef;border-right:1px solid #e1e9ef}.wibDay.muted{background:#f6f8fa;color:#a2afba}.wibDay>span{font-size:10px;font-weight:900}.wibDot{display:block;margin-top:4px;padding:3px 4px;border-radius:4px;background:#dce8ff;color:#234ca9;font-size:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.wibDot.high{background:#fff0db;color:#9a5800}.wibDot.critical{background:#ffe7e5;color:#a3231d}.wibList{display:grid;gap:8px}.wibItem{display:grid;grid-template-columns:1fr auto;gap:9px;padding:12px;border:1px solid #dde7ed;border-radius:9px;color:#173850;text-decoration:none}.wibItem strong,.wibItem small{display:block}.wibItem small{margin-top:4px;color:#75899c}.wibTag{align-self:start;padding:4px 7px;border-radius:999px;background:#e8f6f1;color:#087759;font-size:9px;font-weight:900;text-transform:uppercase}.wibTag.red{background:#fff0ee;color:#ae2a23}.wibEmpty{padding:16px;border-radius:9px;background:#f2f6f9;color:#697e91}@media(max-width:900px){.wibLayout{grid-template-columns:1fr}.wibMetrics{grid-template-columns:1fr 1fr}}@media(max-width:600px){.wibPanel{padding:15px}.wibDay{min-height:56px;padding:3px}.wibDot{font-size:0;height:7px;padding:0;border-radius:999px}.wibMetrics{grid-template-columns:1fr 1fr}}";

function dateOnly(value) {
  return value ? String(value).slice(0, 10) : null;
}

function dateLabel(value) {
  return value ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)) : "Not scheduled";
}

function calendarDays(anchor) {
  const first = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
  const start = new Date(first);
  const weekday = (first.getUTCDay() + 6) % 7;
  start.setUTCDate(start.getUTCDate() - weekday);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return { date, key: date.toISOString().slice(0, 10), current: date.getUTCMonth() === anchor.getUTCMonth() };
  });
}

export default async function WorkplaceInspectionBoardPanel({ organizationId }) {
  const admin = createAdminClient();
  const [programmesResult, inspectionsResult, actionsResult] = await Promise.all([
    admin.from("hs_inspection_programmes").select("id,title,next_inspection_date,risk_band,status,administration_location_label").eq("organization_id", organizationId).eq("status", "active").order("next_inspection_date"),
    admin.from("hs_workplace_inspections").select("id,title,planned_start_at,status,planning_risk_band,administration_location_label").eq("organization_id", organizationId).in("status", ["planned", "due", "in_progress"]).order("planned_start_at"),
    admin.from("hs_workplace_inspection_actions").select("id,inspection_id,target_date,status").eq("organization_id", organizationId).in("status", ["open", "accepted", "in_progress", "evidence_submitted", "awaiting_verification"]),
  ]);
  for (const result of [programmesResult, inspectionsResult, actionsResult]) if (result.error) throw new Error(result.error.message);

  const programmes = programmesResult.data || [];
  const inspections = inspectionsResult.data || [];
  const actions = actionsResult.data || [];
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const days = calendarDays(now);
  const overdueProgrammes = programmes.filter((item) => item.next_inspection_date < today);
  const overdueActions = actions.filter((item) => item.target_date && item.target_date < today);
  const critical = programmes.filter((item) => item.risk_band === "critical");
  const events = [
    ...programmes.map((item) => ({ id: "p-" + item.id, recordId: item.id, type: "programme", title: item.title, date: dateOnly(item.next_inspection_date), band: item.risk_band, location: item.administration_location_label })),
    ...inspections.map((item) => ({ id: "i-" + item.id, recordId: item.id, type: "inspection", title: item.title, date: dateOnly(item.planned_start_at), band: item.planning_risk_band, location: item.administration_location_label })),
  ];
  const eventsByDate = new Map();
  for (const event of events) {
    const current = eventsByDate.get(event.date) || [];
    current.push(event);
    eventsByDate.set(event.date, current);
  }

  return <section className="wibPanel"><style>{CSS}</style>
    <header className="wibHead"><div><h2>Workplace Inspection planning</h2><p>Risk-based programme dates, scheduled fieldwork and action escalation.</p></div><Link href={ROOT}>Open Workplace Inspections →</Link></header>
    <div className="wibMetrics">
      <div className="wibMetric"><span>Active programmes</span><strong>{programmes.length}</strong><small>Recurring controls</small></div>
      <div className="wibMetric"><span>Overdue inspections</span><strong className={overdueProgrammes.length ? "wibRed" : "wibGreen"}>{overdueProgrammes.length}</strong><small>Past planned date</small></div>
      <div className="wibMetric"><span>Critical priority</span><strong className={critical.length ? "wibRed" : "wibGreen"}>{critical.length}</strong><small>Accelerated planning</small></div>
      <div className="wibMetric"><span>Overdue actions</span><strong className={overdueActions.length ? "wibAmber" : "wibGreen"}>{overdueActions.length}</strong><small>Leadership attention</small></div>
    </div>
    <div className="wibLayout">
      <div className="wibCalendar"><div className="wibMonth">{new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(now)}</div><div className="wibWeek">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day}>{day}</span>)}</div><div className="wibDays">{days.map((day) => <div className={"wibDay " + (day.current ? "" : "muted")} key={day.key}><span>{day.date.getUTCDate()}</span>{(eventsByDate.get(day.key) || []).slice(0, 3).map((event) => <Link title={event.title} href={event.type === "programme" ? ROOT + "/programmes/" + event.recordId : ROOT + "/" + event.recordId} className={"wibDot " + event.band} key={event.id}>{event.title}</Link>)}</div>)}</div></div>
      <div><h3 style={{ marginTop: 0 }}>Next priorities</h3>{events.length ? <div className="wibList">{events.filter((item) => item.date).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8).map((event) => <Link className="wibItem" href={event.type === "programme" ? ROOT + "/programmes/" + event.recordId : ROOT + "/" + event.recordId} key={event.id}><div><strong>{event.title}</strong><small>{event.location} · {dateLabel(event.date)}</small></div><span className={"wibTag " + (event.date < today ? "red" : "")}>{event.date < today ? "overdue" : event.band}</span></Link>)}</div> : <div className="wibEmpty">No Workplace Inspection activity is currently scheduled.</div>}</div>
    </div>
  </section>;
}
