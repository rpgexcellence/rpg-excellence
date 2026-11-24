import { siteToday } from "./zone-policy.mjs";

export const INCIDENT_SEVERITIES = [["critical","Critical","#a72d3b"],["high","High","#b96631"],["medium","Medium","#ca9f39"],["low","Low","#16785a"]];
export const RESPONSE_STAGES = [
  ["Detection & triage",["reported","triage"]], ["Containment",["contained"]], ["Investigation",["investigating"]],
  ["Recovery",["recovery"]], ["Corrective action",["action_required"]], ["Verification & closure",["awaiting_verification"]],
];
export const incidentActive = record => !["closed", "cancelled"].includes(record.status);
export const recoveryOverdue = (record,today) => incidentActive(record) && Boolean(record.target_recovery_date && record.target_recovery_date < today);
export const detectionDay = timestamp => {
  const value = Date.parse(timestamp);
  return Number.isFinite(value) ? siteToday("Europe/London", new Date(value)) : "";
};
export function incidentDateScope(records, from, to) {
  return from || to ? records.filter(row => {
    const day = detectionDay(row.detected_at);
    return day && (!from || day >= from) && (!to || day <= to);
  }) : records;
}

const monthIndex = day => Number(day.slice(0,4))*12 + Number(day.slice(5,7)) - 1;
const monthName = new Intl.DateTimeFormat("en-GB", { month:"short", year:"2-digit", timeZone:"UTC" });
const monthDate = index => new Date(Date.UTC(2000, index - 24000, 1));
export function incidentTrend(records, from, to, today) {
  const end = monthIndex(to || today);
  const start = Math.min(end, from ? monthIndex(from) : end - 5);
  const length = end - start + 1;
  const step = Math.ceil(length / 12);
  const buckets = Array.from({length:Math.ceil(length/step)}, (_,index) => {
    const first = start + index*step;
    const last = Math.min(first + step - 1, end);
    const label = first === last ? monthName.format(monthDate(first)) :
      monthName.format(monthDate(first)) + " – " + monthName.format(monthDate(last));
    return { key:String(first),label,count:0 };
  });
  for (const row of records) {
    const month = monthIndex(detectionDay(row.detected_at));
    if (month >= start && month <= end) buckets[Math.floor((month - start)/step)].count++;
  }
  return { buckets, keyFor: record => String(start + Math.floor((monthIndex(detectionDay(record.detected_at)) - start) / step)*step) };
}
