export const BODY_PARTS = [
 ['head','Head / face'],['eyes','Eyes'],['ears','Ears'],['neck','Neck'],['shoulder','Shoulder'],['arm','Arm / elbow'],['wrist','Wrist'],['hand','Hand'],['fingers','Fingers / thumb'],['chest','Chest / ribs'],['abdomen','Abdomen'],['back','Back / spine'],['hip','Hip / pelvis'],['leg','Leg / knee'],['ankle','Ankle'],['foot','Foot'],['toes','Toes'],['respiratory','Respiratory system'],['skin','Skin / multiple areas'],['whole_body','Whole body / multiple systems'],['psychological','Psychological impact'],['other','Other'],['unknown','Not known'],['not_applicable','Not applicable — no injury']
];
export function validateBodyParts(values) {
 if(!Array.isArray(values)||values.length>BODY_PARTS.length||values.some(x=>!BODY_PARTS.some(([k])=>k===x))) throw Error('Choose valid body parts.');
 const unique=[...new Set(values)];
 if(unique.length>1&&unique.some(x=>['unknown','not_applicable'].includes(x))) throw Error('Not known or not applicable must be selected on its own.');
 return unique;
}
export const EVENT_OUTCOMES = {
  "health_safety": [
    [
      "cut",
      "Cut / laceration"
    ],
    [
      "burn",
      "Burn / scald"
    ],
    [
      "bruise",
      "Bruise / contusion"
    ],
    [
      "sprain",
      "Sprain / strain"
    ],
    [
      "fracture",
      "Fracture / suspected fracture"
    ],
    [
      "eye",
      "Eye injury"
    ],
    [
      "crush",
      "Crush / amputation"
    ],
    [
      "exposure",
      "Exposure / inhalation"
    ],
    [
      "ill_health",
      "Ill health"
    ],
    [
      "fatality",
      "Fatality"
    ],
    [
      "damage",
      "Property / equipment damage"
    ],
    [
      "none",
      "No harm / loss observed"
    ],
    [
      "other",
      "Other consequence"
    ]
  ],
  "quality": [
    [
      "defect",
      "Defective product / service"
    ],
    [
      "damage",
      "Product / equipment damage"
    ],
    [
      "rework",
      "Rework / scrap"
    ],
    [
      "delivery",
      "Delivery / service failure"
    ],
    [
      "none",
      "No harm / loss observed"
    ],
    [
      "other",
      "Other consequence"
    ]
  ],
  "environment": [
    [
      "spill",
      "Spill / leak"
    ],
    [
      "pollution",
      "Pollution / contamination"
    ],
    [
      "waste",
      "Uncontrolled waste"
    ],
    [
      "habitat",
      "Habitat damage"
    ],
    [
      "none",
      "No harm / loss observed"
    ],
    [
      "other",
      "Other consequence"
    ]
  ],
  "information_security": [
    [
      "disclosure",
      "Information disclosure"
    ],
    [
      "data_loss",
      "Data loss / deletion"
    ],
    [
      "alteration",
      "Unauthorised data alteration"
    ],
    [
      "compromise",
      "Account / device compromise"
    ],
    [
      "outage",
      "Service unavailable"
    ],
    [
      "none",
      "No harm / loss observed"
    ],
    [
      "other",
      "Other consequence"
    ]
  ],
  "business_continuity": [
    [
      "interruption",
      "Service interruption"
    ],
    [
      "premises",
      "Premises unavailable"
    ],
    [
      "supplier",
      "Supply interruption"
    ],
    [
      "equipment",
      "Critical equipment unavailable"
    ],
    [
      "none",
      "No harm / loss observed"
    ],
    [
      "other",
      "Other consequence"
    ]
  ]
};
// Shared reporting vocabulary; public forms never load private record lists.
export const EVENT_CATEGORIES = {
  "health_safety": [
    [
      "slip_trip",
      "Slip, trip or fall"
    ],
    [
      "height",
      "Fall from height"
    ],
    [
      "struck_by",
      "Falling object / struck by"
    ],
    [
      "vehicle",
      "Vehicle or pedestrian interaction"
    ],
    [
      "machinery",
      "Machinery / entanglement"
    ],
    [
      "lifting",
      "Lifting operation"
    ],
    [
      "manual_handling",
      "Manual handling"
    ],
    [
      "electrical",
      "Electrical event"
    ],
    [
      "fire_explosion",
      "Fire / explosion"
    ],
    [
      "substance",
      "Hazardous substance / exposure"
    ],
    [
      "pressure",
      "Pressure release"
    ],
    [
      "confined_space",
      "Confined space / oxygen deficiency"
    ],
    [
      "radiation",
      "Radiation"
    ],
    [
      "noise_vibration",
      "Noise / vibration"
    ],
    [
      "ill_health",
      "Work-related ill health"
    ],
    [
      "violence",
      "Violence / aggression"
    ],
    [
      "other",
      "Other \u2014 describe"
    ]
  ],
  "quality": [
    [
      "defect",
      "Product / service defect"
    ],
    [
      "process",
      "Process deviation"
    ],
    [
      "test",
      "Inspection / test failure"
    ],
    [
      "traceability",
      "Traceability / records"
    ],
    [
      "calibration",
      "Calibration"
    ],
    [
      "supplier",
      "Supplier / material issue"
    ],
    [
      "complaint",
      "Customer complaint"
    ],
    [
      "product_safety",
      "Product safety"
    ],
    [
      "other",
      "Other \u2014 describe"
    ]
  ],
  "environment": [
    [
      "spill",
      "Spill / leak"
    ],
    [
      "air",
      "Air emission / dust"
    ],
    [
      "water",
      "Water / drain discharge"
    ],
    [
      "land",
      "Land contamination"
    ],
    [
      "waste",
      "Waste / hazardous waste"
    ],
    [
      "resources",
      "Resource use / loss"
    ],
    [
      "nuisance",
      "Noise / odour nuisance"
    ],
    [
      "habitat",
      "Habitat / wildlife"
    ],
    [
      "other",
      "Other \u2014 describe"
    ]
  ],
  "information_security": [
    [
      "phishing",
      "Phishing / social engineering"
    ],
    [
      "account",
      "Compromised account"
    ],
    [
      "access",
      "Unauthorised access"
    ],
    [
      "malware",
      "Malware / ransomware"
    ],
    [
      "device",
      "Lost / stolen device"
    ],
    [
      "disclosure",
      "Accidental disclosure / misdirected email"
    ],
    [
      "sharing",
      "Exposed file / sharing link"
    ],
    [
      "data_change",
      "Data altered / deleted"
    ],
    [
      "configuration",
      "Vulnerability / insecure configuration"
    ],
    [
      "availability",
      "Service attack / outage"
    ],
    [
      "third_party",
      "Third-party security issue"
    ],
    [
      "physical",
      "Physical security / unauthorised entry"
    ],
    [
      "other",
      "Other \u2014 describe"
    ]
  ],
  "business_continuity": [
    [
      "it_outage",
      "IT / communications outage"
    ],
    [
      "utilities",
      "Power / utilities failure"
    ],
    [
      "premises",
      "Loss of premises"
    ],
    [
      "equipment",
      "Critical equipment failure"
    ],
    [
      "supplier",
      "Supplier interruption"
    ],
    [
      "transport",
      "Transport disruption"
    ],
    [
      "people",
      "Workforce unavailability"
    ],
    [
      "weather",
      "Severe weather / flood"
    ],
    [
      "fire",
      "Fire disruption"
    ],
    [
      "cyber",
      "Cyber disruption"
    ],
    [
      "records",
      "Loss of critical records"
    ],
    [
      "other",
      "Other \u2014 describe"
    ]
  ]
};
export const INVESTIGATION_FIELDS = [
 ['scene_safe','Was the area / service made safe? What remains outstanding?'],
 ['activity','Activity taking place and equipment / service involved'],
 ['conditions','Working conditions, workload, supervision and organisation'],
 ['controls','Procedures and controls: available, suitable and followed?'],
 ['competence','Competence, information, training and human factors'],
 ['equipment','Maintenance, machinery and protective / security equipment'],
 ['layout','Workplace layout, access and housekeeping'],
 ['materials','Chemicals, materials or information assets involved'],
 ['risk_known','Was the risk known? Existing assessment and control gaps'],
 ['similar_risks','Could similar risks exist elsewhere? Wider review needed'],
 ['immediate_causes','Immediate causes supported by evidence'],
 ['underlying_causes','Underlying organisational / control weaknesses'],
 ['root_causes','Root causes and why existing controls failed'],
];
const limited = (v,max=2000) => {
 const s=String(v||'').trim();
 if(s.length>max) throw Error('An additional detail exceeds its permitted length.');
 return s;
};
export function reportingDetails(raw,domains) {
 const categories=domains.flatMap(domain=>{
  const category=limited(raw['category_'+domain],80);
  if(!category) return [];
  if(!EVENT_CATEGORIES[domain]?.some(([k])=>k===category)) throw Error('Choose an event category for the selected area.');
  const other=category==='other'?limited(raw['other_'+domain],180):'';
  if(category==='other'&&other.length<3) throw Error('Describe the other event category.');
  return [{domain,category,other}];
 });
 const stop_work=raw.stop_work||'unknown';
 const situation_safe=raw.situation_safe||'unknown';
 if(!['yes','no','unknown','not_applicable'].includes(stop_work)||!['yes','no','unknown'].includes(situation_safe)) throw Error('Check the stop-work and safety selections.');
 const outcomes=validateOutcomes(raw.outcomes||[],domains);
 const outcome_other=outcomes.some(x=>x.endsWith(':other'))?limited(raw.outcome_other,500):'';
 if(outcomes.some(x=>x.endsWith(':other'))&&outcome_other.length<3) throw Error('Describe the other consequence.');
 const requested_workflows=[...new Set(raw.requested_workflows||[])];
 if(!Array.isArray(raw.requested_workflows||[])||requested_workflows.some(x=>!['capa_8d','moc'].includes(x))) throw Error('Check the requested follow-up.');
 const report_type_other=raw.report_type==='other'?limited(raw.report_type_other,180):'';
 if(raw.report_type==='other'&&report_type_other.length<3) throw Error('Describe the other report type.');
 const body_parts=domains.includes('health_safety')?validateBodyParts(raw.body_parts||[]):[];
 const body_part_other=body_parts.includes('other')?limited(raw.body_part_other,180):'';
 if(body_parts.includes('other')&&body_part_other.length<3) throw Error('Describe the other body part.');
 return {categories,outcomes,outcome_other,body_parts,body_part_other,report_type_other,stop_work,situation_safe,requested_workflows,
  stop_work_details:limited(raw.stop_work_details,1000), activity:limited(raw.activity,500),
  asset:limited(raw.asset,500), additional_details:limited(raw.additional_details), reference_notes:limited(raw.reference_notes,1000)};
}
export function categoryLabel(item) {
 const label=EVENT_CATEGORIES[item.domain]?.find(([k])=>k===item.category)?.[1]||item.category;
 return item.category==='other'?(item.other||'Other'):label;
}
export function needsDirector(report) {
 return Boolean(report.requires_director_approval||report.immediate_danger||report.reported_criticality==='critical'||report.criticality==='critical');
}
export function directorApproved(report) {
 return Boolean(report.director_approved_at&&report.director_approved_version===report.version);
}
export function incidentStages(report) {
 const critical=needsDirector(report);
 const steps=[['reported','Report received'],['triaged','Triage & assignment'],['investigating','Investigation'],['actions_open','Actions & recovery'],['awaiting_verification','Independent verification']];
 if(critical) steps.push(['director_approval','Director approval']);
 steps.push(['closed','Closed']);
 let current=steps.findIndex(([key])=>key===report.status);
 if(report.status==='awaiting_verification'&&critical&&report.case_verified_at&&report.case_verified_version===report.version) current=steps.findIndex(([k])=>k==='director_approval');
 if(current<0) current=0;
 return {steps,current,exception:['rejected','duplicate'].includes(report.status)?report.status:null};
}

export function validateOutcomes(values,domains) {
 if(!Array.isArray(values)||values.length>30) throw Error('Choose valid consequences.');
 const unique=[...new Set(values)];
 for(const value of unique){
  const [domain,key]=String(value).split(':');
  if(value!==domain+':'+key||!domains.includes(domain)||!EVENT_OUTCOMES[domain]?.some(([k])=>k===key)) throw Error('Choose a consequence for a selected reporting area.');
 }
 for(const domain of domains) if(unique.includes(domain+':none')&&unique.some(x=>x.startsWith(domain+':')&&x!==domain+':none')) throw Error('No harm cannot be selected with an actual consequence in the same area.');
 return unique;
}
export function outcomeLabel(value) {
 const [domain,key]=String(value).split(':');
 return EVENT_OUTCOMES[domain]?.find(([k])=>k===key)?.[1]||value;
}
// One current classification per report. An explicitly reviewed empty list is
// authoritative: it must never resurrect the reporter's earlier observations.
export function incidentCurrentClassification(report) {
 const details=report.investigation_details||{},intake=report.intake_details||{};
 const assessedSeverity=Boolean(report.triaged_at&&['critical','high','medium','low'].includes(report.criticality));
 const outcomesReviewed=Array.isArray(details.reviewed_outcomes);
 const bodyReviewed=Array.isArray(details.reviewed_body_parts);
 return {
  severity:assessedSeverity?report.criticality:(['critical','high','medium','low'].includes(report.reported_criticality)?report.reported_criticality:'unknown'),
  severitySource:assessedSeverity?'assessed':'reported',
  outcomes:uniqueText(outcomesReviewed?details.reviewed_outcomes:intake.outcomes),
  outcomeSource:outcomesReviewed?'assessed':Array.isArray(intake.outcomes)?'reported':'not_recorded',
  bodyParts:uniqueText(bodyReviewed?details.reviewed_body_parts:intake.body_parts),
  bodyPartSource:bodyReviewed?'assessed':Array.isArray(intake.body_parts)?'reported':'not_recorded',
 };
}
export function incidentAnalytics(reports,snapshot=new Date()) {
 const active=reports.filter(r=>!['rejected','duplicate'].includes(r.status));
 const current=active.map(r=>({...r,current:incidentCurrentClassification(r)}));
 const confirmed=active.filter(r=>r.triaged_at);
 const severity=['critical','high','medium','low','unknown'].map(key=>{
  const matching=current.filter(r=>r.current.severity===key);
  return {key,label:key==='unknown'?'Not recorded':key[0].toUpperCase()+key.slice(1),count:matching.length,
   assessed:matching.filter(r=>r.current.severitySource==='assessed').length,
   reported:matching.filter(r=>r.current.severitySource!=='assessed').length};
 });
 const categories=new Map(),outcomes=new Map(),bodyParts=new Map();
 const add=(map,key,label,source)=>{const row=map.get(key)||{key,label,count:0,assessed:0,reported:0};row.count++;row[source==='assessed'?'assessed':'reported']++;map.set(key,row);};
 for(const r of current){
  const keys=new Set();
  for(const item of r.intake_details?.categories||[]){const key=item.domain+':'+item.category;if(keys.has(key))continue;keys.add(key);add(categories,key,categoryLabel({...item,other:''}),'reported');}
  for(const key of r.current.bodyParts){if(['unknown','not_applicable'].includes(key))continue;add(bodyParts,key,BODY_PARTS.find(([k])=>k===key)?.[1]||key,r.current.bodyPartSource);}
  for(const key of r.current.outcomes)add(outcomes,key,outcomeLabel(key),r.current.outcomeSource);
 }
 const sort=map=>[...map.values()].sort((a,b)=>b.count-a.count);
 const now=new Date(snapshot);
 const months=Array.from({length:6},(_,i)=>{
  const d=new Date(now);d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()-5+i);const key=d.toISOString().slice(0,7);
  return {key,count:active.filter(r=>(r.occurred_at||'').slice(0,7)===key).length};
 });
 return {severity,bodyParts:sort(bodyParts),categories:sort(categories),outcomes:sort(outcomes),months,
  included:active.length,assessed:confirmed.length,provisional:active.length-confirmed.length,
  byDomain:Object.fromEntries(EXPLORER_DOMAINS.map(([key])=>[key,active.filter(r=>r.domains?.includes(key)).length])),
  byType:Object.fromEntries(EXPLORER_TYPES.map(([key])=>[key,active.filter(r=>r.report_type===key).length])),
  consequencesPending:confirmed.filter(r=>!Array.isArray(r.investigation_details?.reviewed_outcomes)).length,
  stopWork:active.filter(r=>r.intake_details?.stop_work==='yes').length,
  awaitingDirector:active.filter(r=>needsDirector(r)&&r.status!=='closed'&&!directorApproved(r)).length};
}

export function contextualReportTypes(domains,types) {
 return types.filter(([key])=>key!=='accident'||domains.includes('health_safety')).filter(([key])=>key!=='disruption'||domains.includes('business_continuity'));
}

// The caller must supply only records already authorised by loadIncidentRegister.
// This projection deliberately excludes contacts, photos and investigation narratives.
const EXPLORER_TYPES = [
 ['accident','Accident / injury'],['incident','Incident'],['near_miss','Near miss'],
 ['concern','Hazard / concern'],['disruption','Business disruption'],['other','Other'],
];
const EXPLORER_DOMAINS = [
 ['health_safety','Health & safety'],['quality','Quality / product'],
 ['environment','Environment'],['information_security','Information security'],
 ['business_continuity','Business disruption'],
];
const uniqueText = values => [...new Set((Array.isArray(values)?values:[]).filter(v=>typeof v==='string'&&v.trim()).map(v=>v.trim()))];
const finiteNonnegative = value => {
 if(value===null||value===undefined||value==='') return null;
 const number=Number(value);return Number.isFinite(number)&&number>=0?number:null;
};
export function incidentExplorerRows(reports) {
 return (reports||[]).map(r=>({
  id:r.id,reference:r.reference||'Unreferenced report',title:r.title||'Untitled report',
  siteId:r.site_id||'',zoneId:r.zone_id||'',
  location:r.location_label||'Location not recorded',
  zoneKey:r.zone_id?'zone:'+r.zone_id:'site:'+(r.site_id||'unknown')+':unallocated',
  zoneLabel:(r.location_label||'Location not recorded')+(r.zone_id?'':' · no zone assigned'),
  type:r.report_type||'other',domains:uniqueText(r.domains),status:r.status||'reported',
  occurredAt:r.occurred_at||null,receivedAt:r.created_at||null,closedAt:r.closed_at||null,
  confirmed:Boolean(r.triaged_at&&!['rejected','duplicate'].includes(r.status)),
  severity:incidentCurrentClassification(r).severity,reportedSeverity:r.reported_criticality||null,
  severitySource:incidentCurrentClassification(r).severitySource,
  immediateDanger:Boolean(r.immediate_danger),
  outcomes:incidentCurrentClassification(r).outcomes,
  outcomeSource:incidentCurrentClassification(r).outcomeSource,
  bodyParts:incidentCurrentClassification(r).bodyParts,
  bodyPartSource:incidentCurrentClassification(r).bodyPartSource,
  asset:String(r.intake_details?.asset||'').trim(),
  securityImpacts:uniqueText(r.security_impacts),
  stopWork:r.intake_details?.stop_work==='yes',
  requiresDirector:needsDirector(r),directorApproved:directorApproved(r),
  lostDays:finiteNonnegative(r.lost_time_days),
  // New reports start with a database default of zero. Treat that zero as
  // unreviewed until investigation evidence establishes a real assessment.
  lostDaysAssessed:Boolean(r.triaged_at&&finiteNonnegative(r.lost_time_days)!==null&&
   (finiteNonnegative(r.lost_time_days)>0||Array.isArray(r.investigation_details?.reviewed_outcomes)||
    (typeof r.investigation_summary==='string'&&r.investigation_summary.trim().length>=10))),
  disruptionMinutes:finiteNonnegative(r.disruption_minutes),
 }));
}

function explorerGroups(rows,keys,label) {
 const groups=new Map();
 for(const row of rows) for(const key of new Set(keys(row))) {
  const group=groups.get(key)||{key,label:label(key,row),count:0};
  group.count++;groups.set(key,group);
 }
 return [...groups.values()].sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label));
}
function impactKeys(row,selection) {
 if(selection.outcome==='unassessed') {
  const recorded=[];
  if(row.domains.includes('health_safety'))recorded.push(...row.bodyParts.map(k=>'body:'+k));
  if(row.domains.includes('information_security'))recorded.push(...row.securityImpacts.map(k=>'security:'+k));
  if(row.asset)recorded.push('asset:'+row.asset);
  return recorded.length?recorded:['impact:unknown'];
 }
 if(selection.outcome?.startsWith('health_safety:')) {
  if(selection.outcome==='health_safety:none') return ['body:not_applicable'];
  return row.bodyParts.length?row.bodyParts.map(k=>'body:'+k):['body:unknown'];
 }
 if(selection.outcome?.startsWith('information_security:')) {
  return row.securityImpacts.length?row.securityImpacts.map(k=>'security:'+k):['security:unknown'];
 }
 return [row.asset?'asset:'+row.asset:'asset:unknown'];
}
function impactLabel(key) {
 if(key==='impact:unknown')return 'Impact / body part not recorded';
 if(key.startsWith('body:'))return BODY_PARTS.find(([k])=>k===key.slice(5))?.[1]||key.slice(5);
 if(key==='security:unknown')return 'Security impact not assessed';
 if(key.startsWith('security:'))return key.slice(9).replace(/^./,v=>v.toUpperCase());
 return key==='asset:unknown'?'Asset / equipment not recorded':key.slice(6);
}
export function incidentDrilldown(rows,selection={}) {
 const included=(rows||[]).filter(r=>!['rejected','duplicate'].includes(r.status));
 const inZone=included.filter(r=>!selection.zone||r.zoneKey===selection.zone);
 const inType=inZone.filter(r=>!selection.type||r.type===selection.type);
 const inOutcome=inType.filter(r=>!selection.outcome||(selection.outcome==='unassessed'?r.outcomes.length===0:r.outcomes.includes(selection.outcome)));
 const matching=inOutcome.filter(r=>!selection.impact||impactKeys(r,selection).includes(selection.impact));
 let stage='zones',groups,title='Events by zone',overlap=false;
 if(!selection.zone) groups=explorerGroups(included,r=>[r.zoneKey],(_key,r)=>r.zoneLabel);
 else if(!selection.type) {
  stage='types';title='Event types';groups=explorerGroups(inZone,r=>[r.type],key=>EXPLORER_TYPES.find(([k])=>k===key)?.[1]||key);
 } else if(!selection.outcome) {
  stage='outcomes';title=selection.type==='near_miss'?'Current consequences — near misses':'Current injuries / consequences';
  groups=explorerGroups(inType,r=>r.outcomes.length?r.outcomes:['unassessed'],key=>key==='unassessed'?'Consequences not recorded / none selected':outcomeLabel(key));overlap=true;
 } else if(!selection.impact) {
  stage='impacts';title=selection.outcome==='unassessed'?'Recorded impacts / body parts':selection.outcome.startsWith('health_safety:')?'Current body parts':selection.outcome.startsWith('information_security:')?'Recorded security impacts':'Reported assets / equipment';
  groups=explorerGroups(inOutcome,r=>impactKeys(r,selection),impactLabel);overlap=true;
 } else {stage='reports';title='Reports behind the numbers';groups=[];}
 return {stage,title,groups,rows:matching,count:matching.length,overlap,
  assessed:matching.filter(r=>r.confirmed).length,provisional:matching.filter(r=>!r.confirmed).length,
  untriaged:(rows||[]).filter(r=>!r.confirmed&&!['rejected','duplicate'].includes(r.status)).length,
  types:EXPLORER_TYPES,
 };
}

function strictReportDate(value,label) {
 const text=String(value||'');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(text))throw Error('Choose a valid '+label+' date.');
 const parsed=new Date(text+'T00:00:00Z');
 if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==text)throw Error('Choose a valid '+label+' date.');
 return text;
}
export function incidentExecutiveBrief(reports,tasks,options={},snapshot=new Date()) {
 const from=strictReportDate(options.from,'start'),to=strictReportDate(options.to,'end');
 if(from>to)throw Error('The start date must be before or equal to the end date.');
 const areas=uniqueText(options.areas),sites=uniqueText(options.sites),zones=uniqueText(options.zones);
 if(areas.some(key=>!EXPLORER_DOMAINS.some(([k])=>k===key)))throw Error('Select valid reporting areas.');
 const all=incidentExplorerRows(reports);
 const selected=all.filter(r=>{
  if(!r.occurredAt)return false;
  const instant=new Date(r.occurredAt);if(!Number.isFinite(instant.getTime()))return false;
  const date=instant.toISOString().slice(0,10);
  return date>=from&&date<=to&&(!areas.length||areas.some(a=>r.domains.includes(a)))&&(!sites.length||sites.includes(r.siteId))&&(!zones.length||zones.includes(r.zoneKey));
 });
 const confirmed=selected.filter(r=>r.confirmed),ids=new Set(selected.map(r=>r.id));
 const open=confirmed.filter(r=>r.status!=='closed');
 const urgent=selected.filter(r=>!['closed','rejected','duplicate'].includes(r.status)&&(r.immediateDanger||r.severity==='critical'||r.reportedSeverity==='critical'));
 const high=open.filter(r=>['critical','high'].includes(r.severity));
 const scopedTasks=(tasks||[]).filter(t=>ids.has(t.incident_id));
 const now=new Date(snapshot);if(!Number.isFinite(now.getTime()))throw Error('Invalid report snapshot.');
 const overdue=scopedTasks.filter(t=>!['verified','cancelled'].includes(t.status)&&t.due_at&&Number.isFinite(Date.parse(t.due_at))&&Date.parse(t.due_at)<now.getTime());
 const included=selected.filter(r=>!['rejected','duplicate'].includes(r.status));
 const counts=EXPLORER_TYPES.map(([key,label])=>({key,label,count:included.filter(r=>r.type===key).length}));
 const zoneCounts=explorerGroups(included,r=>[r.zoneKey],(_key,r)=>r.zoneLabel).map(z=>({...z,types:EXPLORER_TYPES.map(([key,label])=>({key,label,count:included.filter(r=>r.zoneKey===z.key&&r.type===key).length}))}));
 const pending=selected.filter(r=>!r.confirmed&&!['rejected','duplicate'].includes(r.status));
 const bodyCounts=explorerGroups(included,r=>r.bodyParts.filter(k=>!['unknown','not_applicable'].includes(k)),key=>BODY_PARTS.find(([k])=>k===key)?.[1]||key);
 const outcomeCounts=explorerGroups(included,r=>r.outcomes,outcomeLabel);
 const summary=selected.length===0
  ?'No reports match the selected period and scope. Confirm reporting coverage before drawing an assurance conclusion.'
  :selected.length+' reports fall within the selected occurrence period. '+confirmed.length+' are confirmed following triage and '+pending.length+' await triage. '+open.length+' confirmed cases remain open at this snapshot. '+(urgent.length?urgent.length+' open reports carry a critical classification or immediate-danger alert and require an urgent review.':'No critical or immediate-danger alerts are recorded in the open reports selected.');
 const performance=incidentDashboardPerformance(selected,all,{sites,zones},now);
 const decisions=[];
 if(urgent.length)decisions.push('Confirm immediate controls, an accountable lead and the required escalation for the '+urgent.length+' critical / immediate-danger reports. Distinguish reporter alerts from assessed severity.');
 if(overdue.length)decisions.push('Require a recovery plan for '+overdue.length+' overdue incident actions, with named owners, revised dates and an explicit decision on resource constraints.');
 if(high.length)decisions.push('Review interim controls and investigation progress for '+high.length+' open confirmed High / Critical cases. Challenge whether the response addresses the underlying failure.');
 if(pending.length)decisions.push('Confirm ownership and timing of triage for '+pending.length+' reports. The confirmed statistics do not yet describe these events.');
 if(!decisions.length)decisions.push(selected.length?'Review the evidence supporting the recorded case position and confirm whether the lessons apply in other areas.':'Confirm the selected scope and reporting coverage. No event-specific management conclusion is supported by an empty selection.');
 return {from,to,snapshot:now.toISOString(),areas,sites,zones,received:selected.length,confirmed:confirmed.length,pending:pending.length,
  open:open.length,urgent:urgent.length,high:high.length,overdueActions:overdue.length,
  awaitingDirector:open.filter(r=>r.requiresDirector&&!r.directorApproved).length,
  counts,zoneCounts,bodyCounts,outcomeCounts,summary,decisions,performance,
  included:included.length,
  outcomesReported:included.filter(r=>r.outcomeSource==='reported'&&r.outcomes.length).length,
  bodyPartsReported:included.filter(r=>r.bodyPartSource==='reported'&&r.bodyParts.length).length,
  lostDays:performance.lostDays.value??0,lostDaysMissing:confirmed.filter(r=>r.domains.includes('health_safety')&&!r.lostDaysAssessed).length,
  disruptionMinutes:confirmed.reduce((s,r)=>s+(r.disruptionMinutes??0),0),
  disruptionMissing:confirmed.filter(r=>r.disruptionMinutes===null).length,
  limitations:[
   'Occurrence dates use UTC. Case and action status reflect this report snapshot, not a reconstructed position at the period end.',
   'Only records authorised for the current user are included. Report totals are not an organisation-wide assurance statement when access is restricted.',
   'Charts include reports awaiting triage and confirmed cases; rejected and duplicate submissions are excluded. Assessor-reviewed values replace reporter observations field by field, including explicit empty assessments. Unreviewed values remain provisional. Consequences and body parts may overlap; counts refer to reports, not injured people.',
   'Report volumes are not exposure-adjusted rates. Root causes, statutory reportability and control effectiveness are not inferred from classification counts.',
  ]};
}

// Read-only performance measures. Supply only authorised incidentExplorerRows;
// never use these functions to expand case access or authorise a workflow step.
export const INCIDENT_CLOSURE_BANDS = Object.freeze([
 {key:'same_day',label:'Closed same day',description:'0 calendar days'},
 {key:'within_3_days',label:'Closed within 3 days',description:'1–3 calendar days'},
 {key:'within_1_week',label:'Closed within 1 week',description:'4–7 calendar days'},
 {key:'over_1_week',label:'Longer than 1 week',description:'8+ calendar days'},
 {key:'still_open',label:'Still open',description:'Current case status'},
 {key:'unknown',label:'Closure timing unavailable',description:'Closed case with missing or invalid dates'},
]);
function metricTimestamp(value) {
 if(value===null||value===undefined||value==='')return null;
 const timestamp=value instanceof Date?value.getTime():
  typeof value==='string'||typeof value==='number'?new Date(value).getTime():NaN;
 return Number.isFinite(timestamp)?timestamp:null;
}
function metricSnapshot(value) {
 const timestamp=metricTimestamp(value);
 if(timestamp===null)throw Error('Choose a valid incident performance snapshot.');
 return timestamp;
}
function metricCalendarDays(from,to) {
 return Math.floor(to/86400000)-Math.floor(from/86400000);
}
function performanceRows(rows) {
 return (rows||[]).filter(row=>row&&!['rejected','duplicate'].includes(row.status));
}
function closedDuration(row,snapshot) {
 const received=metricTimestamp(row.receivedAt),closed=metricTimestamp(row.closedAt);
 if(received===null||closed===null||closed<received||closed>snapshot)return null;
 return metricCalendarDays(received,closed);
}
export function incidentClosureKey(row,snapshot=new Date()) {
 if(!row||['rejected','duplicate'].includes(row.status))return null;
 const instant=metricSnapshot(snapshot);
 if(row.status!=='closed')return 'still_open';
 const days=closedDuration(row,instant);
 return days===null?'unknown':days===0?'same_day':days<=3?'within_3_days':days<=7?'within_1_week':'over_1_week';
}
export function incidentClosureSummary(rows,snapshot=new Date()) {
 const instant=metricSnapshot(snapshot),included=performanceRows(rows);
 const groups=INCIDENT_CLOSURE_BANDS.map(band=>({...band,count:0,reportIds:[]}));
 const byKey=new Map(groups.map(group=>[group.key,group]));
 const months=new Map(),durations=[];
 for(const row of included){
  const key=incidentClosureKey(row,instant),group=byKey.get(key);
  group.count++;group.reportIds.push(row.id);
  const received=metricTimestamp(row.receivedAt);
  const monthKey=received===null?'not_recorded':new Date(received).toISOString().slice(0,7);
  if(!months.has(monthKey))months.set(monthKey,{key:monthKey,count:0,groups:INCIDENT_CLOSURE_BANDS.map(b=>({key:b.key,label:b.label,count:0}))});
  const month=months.get(monthKey);month.count++;month.groups.find(b=>b.key===key).count++;
  if(row.status==='closed'){const duration=closedDuration(row,instant);if(duration!==null)durations.push(duration);}
 }
 durations.sort((a,b)=>a-b);const mid=Math.floor(durations.length/2);
 return {included:included.length,closed:included.filter(r=>r.status==='closed').length,
  open:byKey.get('still_open').count,unknown:byKey.get('unknown').count,
  medianDays:durations.length?(durations.length%2?durations[mid]:(durations[mid-1]+durations[mid])/2):null,
  measuredClosures:durations.length,groups,
  months:[...months.values()].sort((a,b)=>a.key.localeCompare(b.key)),
  snapshot:new Date(instant).toISOString(),
  basis:'UTC calendar days from receipt to the current closure. Reopened cases count as still open. Rejected and duplicate submissions are excluded. Still open does not mean overdue.'};
}
export function incidentLtiBand(days) {
 if(typeof days!=='number'||!Number.isFinite(days)||days<0)return 'unknown';
 return days<=30?'red':days<=60?'orange':'green';
}
export function incidentLtiSummary(history,scope={},snapshot=new Date()) {
 const instant=metricSnapshot(snapshot);
 const sites=Array.isArray(scope.sites)?scope.sites:[],zones=Array.isArray(scope.zones)?scope.zones:[];
 // Location and access scopes apply to the all-date history. Occurrence-period,
 // severity, status, event type and reporting-area filters never reset the clock.
 const candidates=performanceRows(history).filter(row=>row.confirmed&&row.domains?.includes('health_safety')&&
  row.lostDaysAssessed===true&&typeof row.lostDays==='number'&&row.lostDays>0&&
  (!sites.length||sites.includes(row.siteId))&&(!zones.length||zones.includes(row.zoneKey)));
 const invalid=candidates.filter(row=>metricTimestamp(row.occurredAt)===null||metricTimestamp(row.occurredAt)>instant);
 const dated=candidates.filter(row=>metricTimestamp(row.occurredAt)!==null&&metricTimestamp(row.occurredAt)<=instant)
  .sort((a,b)=>metricTimestamp(b.occurredAt)-metricTimestamp(a.occurredAt));
 const latest=dated[0]||null;
 // An undated/future-dated LTI may be newer than the last valid one. Do not
 // publish a reassuring colour from incomplete chronology.
 const established=Boolean(latest&&!invalid.length);
 const days=established?metricCalendarDays(metricTimestamp(latest.occurredAt),instant):null;
 return {days,band:incidentLtiBand(days),established,cases:candidates.length,invalidDates:invalid.length,
  lastReport:latest?{id:latest.id,reference:latest.reference,title:latest.title,
   location:latest.location,occurredAt:latest.occurredAt,lostDays:latest.lostDays}:null,
  snapshot:new Date(instant).toISOString(),
  reason:invalid.length?'An assessed lost-time case has a missing or future occurrence date.':
   !latest?'No confirmed lost-time occurrence date is available in your authorised location history.':null,
  basis:'Latest assessor-confirmed health-and-safety case with more than zero lost working days, across all available authorised dates in the selected locations. UTC calendar days. This is a recency band, not proof of safety or complete historical coverage.'};
}
export function incidentDashboardPerformance(rows,history=rows,scope={},snapshot=new Date()) {
 const instant=metricSnapshot(snapshot),included=performanceRows(rows);
 const health=included.filter(row=>row.domains?.includes('health_safety'));
 const measured=health.filter(row=>row.confirmed&&row.lostDaysAssessed===true&&typeof row.lostDays==='number'&&row.lostDays>=0);
 return {closure:incidentClosureSummary(included,instant),lti:incidentLtiSummary(history,scope,instant),
  lostDays:{value:measured.length?measured.reduce((sum,row)=>sum+row.lostDays,0):health.length?null:0,assessedReports:measured.length,
   awaitingAssessment:health.length-measured.length,totalReports:health.length,
   basis:'Assessed lost working days within the dashboard selection; missing/unreviewed values are not zero.'},
  snapshot:new Date(instant).toISOString()};
}
