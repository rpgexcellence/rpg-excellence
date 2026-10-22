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
export function incidentAnalytics(reports) {
 const confirmed=reports.filter(r=>r.triaged_at&&!['rejected','duplicate'].includes(r.status));
 const severity=['critical','high','medium','low'].map(key=>({key,label:key[0].toUpperCase()+key.slice(1),count:confirmed.filter(r=>r.criticality===key).length}));
 const categories=new Map(),outcomes=new Map(),bodyParts=new Map();
 for(const r of confirmed){
  for(const item of r.intake_details?.categories||[]){const key=item.domain+':'+item.category;const row=categories.get(key)||{key,label:categoryLabel({...item,other:''}),count:0};row.count++;categories.set(key,row);}
  for(const key of r.investigation_details?.reviewed_body_parts||[]){if(['unknown','not_applicable'].includes(key)) continue;const row=bodyParts.get(key)||{key,label:BODY_PARTS.find(([k])=>k===key)?.[1]||key,count:0};row.count++;bodyParts.set(key,row);}
  for(const key of r.investigation_details?.reviewed_outcomes||[]){const row=outcomes.get(key)||{key,label:outcomeLabel(key),count:0};row.count++;outcomes.set(key,row);}
 }
 return {severity,bodyParts:[...bodyParts.values()].sort((a,b)=>b.count-a.count),categories:[...categories.values()].sort((a,b)=>b.count-a.count),outcomes:[...outcomes.values()].sort((a,b)=>b.count-a.count),
  consequencesPending:confirmed.filter(r=>!Array.isArray(r.investigation_details?.reviewed_outcomes)).length,
  stopWork:reports.filter(r=>r.intake_details?.stop_work==='yes'&&!['rejected','duplicate'].includes(r.status)).length,
  awaitingDirector:reports.filter(r=>needsDirector(r)&&!['closed','rejected','duplicate'].includes(r.status)&&!directorApproved(r)).length};
}

export function contextualReportTypes(domains,types) {
 return types.filter(([key])=>key!=='accident'||domains.includes('health_safety')).filter(([key])=>key!=='disruption'||domains.includes('business_continuity'));
}
