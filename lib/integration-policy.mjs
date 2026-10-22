// Released capabilities only. UI, validation, documentation and SQL checks use this registry.
export const INTEGRATION_PERMISSION_GROUPS = [
 {title:'Assurance records',options:[['audits:read','Read audits'],['findings:read','Read findings and nonconformities'],['capa:read','Read CAPA-8D records']]},
 {title:'Operational registers',options:[['assets:read','Read assets'],['suppliers:read','Read suppliers'],['people:read','Read company-user directory'],['workplace_inspections:read','Read workplace inspection programmes and records']]},
 {title:'Restricted security information',options:[['security_incidents:read','Read security incident summaries'],['security_incidents:detail','Read sensitive security incident narratives (also requires summary scope)']]},
];
export const INTEGRATION_PERMISSIONS=INTEGRATION_PERMISSION_GROUPS.flatMap(g=>g.options.map(([key])=>key));
export const LEGACY_INTEGRATION_PERMISSIONS=['audits:write','findings:write','capa:write','assets:write','suppliers:write','webhooks:manage'];
export const INSPECTION_RISK_BANDS=['routine','medium','high','critical'];
export function normaliseInspectionBand(value){return value==='low'?'routine':value==='moderate'?'medium':value;}
export function validateIntegrationPermissions(values){
 if(!Array.isArray(values)||values.some(v=>!INTEGRATION_PERMISSIONS.includes(v))) throw Error('Choose only the released API permissions. Write and webhook permissions are not available in this release.');
 const unique=[...new Set(values)];if(!unique.length) throw Error('Select at least one API permission.');
 if(unique.includes('security_incidents:detail')&&!unique.includes('security_incidents:read')) throw Error('Security incident detail access also requires the summary read permission.');
 return unique;
}
export function integrationDateOnly(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||''))) return false;
 const d=new Date(value+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;
}
