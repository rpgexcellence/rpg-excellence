export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function canReadZone(zone, access, preview = false) {
  if (!zone || zone.site_status !== 'active' || zone.status === 'archived') return false;
  const member = Boolean(access?.user && access?.organization?.id === zone.organization_id);
  const administrator = member && (access.isOwner || access.isCompanyAdministrator);
  if (preview && administrator) return true;
  return zone.status === 'published' && (zone.access_mode === 'link' || member);
}
export const readableAssessment = assessment => ['approved','communicated'].includes(assessment.status);
export const openAction = action => !['closed','cancelled'].includes(action.status);
export function assessmentDue(assessment, today) {
  return Boolean(assessment.review_date && assessment.review_date.slice(0,10) <= today);
}
export function siteToday(timezone, now = new Date()) {
  try { return new Intl.DateTimeFormat('en-CA', {timeZone: timezone || 'UTC', year:'numeric',month:'2-digit',day:'2-digit'}).format(now); }
  catch { return now.toISOString().slice(0,10); }
}

export function siteTimezone(value) {try {new Intl.DateTimeFormat('en-GB',{timeZone:value||'UTC'});return value||'UTC';}catch{return 'UTC';}}
