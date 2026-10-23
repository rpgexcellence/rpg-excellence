// Scheduling, administration and fieldwork are separate responsibilities.
export const PRE_FIELDWORK = Object.freeze(['draft', 'planned', 'due']);
export const EDITABLE_APPOINTMENTS = Object.freeze([...PRE_FIELDWORK, 'in_progress', 'awaiting_review']);
export function canAdministerInspection(access) {
  return Boolean(access.isOwner || access.isCompanyAdministrator || access.isPlatformAdministrator || ['admin', 'owner'].includes(access.level));
}
export function isAssignedInspector(access, inspection) {
  return Boolean(access.person?.id && access.person.id === inspection.lead_inspector_person_id);
}
export function canStartInspection(access, inspection) {
  return isAssignedInspector(access, inspection) && PRE_FIELDWORK.includes(inspection.status);
}
export function canEditInspectionFieldwork(access, inspection) {
  return isAssignedInspector(access, inspection) && inspection.status === 'in_progress';
}
export function assertInspectionFieldwork(access, inspection) {
  if (!canEditInspectionFieldwork(access, inspection)) throw new Error('Only the assigned lead inspector can edit fieldwork after selecting Start inspection.');
}
export function inspectionStageTitle(status) {
  return ({draft:'Inspection draft', planned:'Inspection scheduled', due:'Inspection due', in_progress:'Fieldwork in progress', awaiting_review:'Awaiting independent review', actions_open:'Corrective actions open', awaiting_verification:'Awaiting effectiveness verification', completed:'Inspection completed', cancelled:'Inspection cancelled'})[status] || 'Controlled inspection record';
}
export function inspectionTimestamp(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Enter a valid planned date and time.');
  const date = new Date(value + ':00.000Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,16) !== value) throw new Error('Enter a valid planned date and time.');
  return date.toISOString();
}
export function validateAppointmentIndependence(people, leadId, reviewerId, assessorIds = []) {
  const lead = people.find(p => p.id === leadId), reviewer = people.find(p => p.id === reviewerId);
  if (!lead || !reviewer || leadId === reviewerId || (lead.user_id && lead.user_id === reviewer.user_id)) throw new Error('The reviewer must be independent of the lead inspector.');
  if (assessorIds.some(id => id === reviewerId || (reviewer.user_id && people.find(p => p.id === id)?.user_id === reviewer.user_id))) throw new Error('A person who recorded fieldwork cannot independently review this inspection.');
}
