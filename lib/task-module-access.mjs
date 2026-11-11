// Workspace entitlements, rather than training-only navigation, control task sources.
const sources={incident:'incidents',audit:'audits',inspection:'health',rca:'capa',capa:'assessments',risk:'health',moc:'health',bcp:'bcp',supplier:'suppliers',isms:'isms',security_incident:'isms',maintenance:'assets',documents:'evidence'};
export function allowedTaskSources(portalAccess) {
 const groups=new Set(portalAccess?.workspaceGroups||[]);
 return new Set(Object.entries(sources).filter(([,group])=>groups.has(group)).map(([source])=>source));
}
