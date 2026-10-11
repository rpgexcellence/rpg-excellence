export const PERMIT_TYPES = [
  { value:"hot_work", label:"Hot work", description:"Flame, heat, sparks or another ignition source" },
  { value:"confined_space", label:"Confined space", description:"Restricted entry, hazardous atmosphere or difficult rescue" },
  { value:"electrical", label:"Electrical work", description:"Electrical isolation, testing or controlled live work" },
  { value:"work_at_height", label:"Work at height", description:"Work where a fall could cause injury" },
  { value:"excavation", label:"Excavation", description:"Ground disturbance, buried services or collapse risk" },
  { value:"lifting", label:"Lifting operation", description:"Cranes, hoists, lifting accessories or suspended loads" },
  { value:"general", label:"General permit", description:"Other non-routine controlled high-risk work" },
];

export const COMMON_HAZARDS = [
  "Fire or explosion","Hazardous atmosphere","Stored energy","Electricity",
  "Work at height","Falling objects","Moving plant or vehicles",
  "Excavation or ground collapse","Hazardous substances","Pressure or vacuum",
  "Lifting operations","Restricted access or escape","Simultaneous operations","Other",
];

export const COMMON_CONTROLS = [
  { key:"risk_assessment", label:"Approved risk assessment and method statement", critical:true },
  { key:"area_inspected", label:"Area inspected and boundaries confirmed", critical:true },
  { key:"work_party_briefed", label:"Work party briefed and competent", critical:true },
  { key:"ppe", label:"PPE/RPE specified, inspected and available" },
  { key:"adjacent_work", label:"Adjacent work and related permits coordinated" },
  { key:"emergency_briefed", label:"Emergency and stop-work arrangements briefed", critical:true },
];

const field=(key,label,type="text",guidance="",required=true,options=[])=>({key,label,type,guidance,required,options});
const check=(key,label,guidance="",critical=true)=>({key,label,guidance,critical});

export const PERMIT_CONTROL_RULES = {
  hot_work:{
    title:"Hot-work controls",
    guidance:"Prevent ignition and verify that combustible materials, fire detection and post-work monitoring are controlled.",
    controls:[
      check("combustibles_cleared","Combustible materials removed or protected"),
      check("fire_detection_controlled","Fire detection or suppression impairment authorised, where applicable"),
      check("fire_watch","Competent fire watch appointed"),
      check("extinguishing_equipment","Suitable extinguishing equipment positioned"),
      check("adjacent_areas_checked","Opposite sides, floors and concealed spaces inspected"),
    ],
    fields:[
      field("fire_watch_person","Fire-watch person","person","Select an authorised company user or record the approved external person."),
      field("post_work_watch_minutes","Post-work fire-watch period","number","Record the minimum monitoring period after hot work ends."),
      field("flammable_material_controls","Flammable material and atmosphere controls","textarea","Describe removal, containment, ventilation and testing arrangements."),
    ],
    requiresAtmosphereWhen:["Hazardous atmosphere","Confined space","Hazardous substances"],
  },
  confined_space:{
    title:"Confined-space entry controls",
    guidance:"Entry must not start until isolation, atmosphere, attendant, communication and a practicable rescue plan are verified.",
    controls:[
      check("entry_authorised","Confined-space entry formally authorised"),
      check("isolations_verified","All process and energy isolations independently verified"),
      check("atmosphere_accepted","Pre-entry atmosphere accepted and monitoring arranged"),
      check("attendant_present","Dedicated attendant appointed"),
      check("rescue_ready","Rescue team and equipment immediately available"),
    ],
    fields:[
      field("entry_supervisor","Entry supervisor","person","Select the competent person controlling entry."),
      field("attendant","Confined-space attendant","person","The attendant must remain outside and must not undertake conflicting duties."),
      field("maximum_occupancy","Maximum authorised entrants","number","State the maximum number permitted inside at any time."),
      field("communication_method","Communication method","text","State how entrants, attendant and rescue personnel will communicate."),
      field("rescue_plan_reference","Approved rescue-plan reference","text","Reference the controlled plan; emergency services alone are not an adequate rescue plan."),
    ],
    requiresIsolation:true,
    requiresAtmosphere:true,
  },
  electrical:{
    title:"Electrical-work controls",
    guidance:"Identify the circuit, prove isolation and prevent re-energisation. Live work requires separate documented justification and authority.",
    controls:[
      check("isolation_identified","Circuit and every isolation point identified"),
      check("secured_against_reenergisation","Isolation locked and labelled"),
      check("proved_dead","Test-for-dead completed using an approved method"),
      check("tester_proved","Voltage detector proved before and after use"),
      check("stored_energy_discharged","Stored energy discharged or controlled"),
    ],
    fields:[
      field("system_voltage","System voltage","text","Record nominal and, where relevant, expected induced voltage."),
      field("authorised_electrical_person","Authorised electrical person","person","Select a user with the applicable electrical authorisation."),
      field("test_instrument","Test instrument and serial number","text","Identify the voltage detector or test equipment used."),
      field("live_work_status","Live-work status","select","Dead working should be the default. Live work needs specific justification.",true,["Dead working","Live diagnostic testing","Authorised live work"]),
      field("live_work_justification","Live-work justification","textarea","Complete only where dead working is unreasonable and suitable precautions are established.",false),
    ],
    requiresIsolation:true,
  },
  work_at_height:{
    title:"Work-at-height controls",
    guidance:"Follow the hierarchy: avoid work at height, prevent falls, then minimise distance and consequences.",
    controls:[
      check("access_equipment_inspected","Access equipment inspected and suitable"),
      check("edge_protection","Edge protection or equivalent fall prevention established"),
      check("dropped_objects","Dropped-object controls and exclusion zone established"),
      check("weather_checked","Weather and environmental limits accepted"),
      check("height_rescue_ready","Recovery/rescue arrangements available"),
    ],
    fields:[
      field("working_height","Maximum working height","number","Enter the approximate height in metres."),
      field("access_method","Access method","select","Select the primary means of access.",true,["Fixed platform","Scaffold","MEWP","Tower scaffold","Ladder","Rope access","Other"]),
      field("equipment_inspection_reference","Inspection/tag reference","text","Record the scaffold tag, MEWP inspection or other applicable reference."),
      field("weather_limits","Weather limits","textarea","State wind, rain, lightning, visibility or temperature stop limits."),
    ],
  },
  excavation:{
    title:"Excavation controls",
    guidance:"Confirm underground services, ground stability, safe access and statutory inspections before disturbance begins.",
    controls:[
      check("service_plans_reviewed","Current underground-service plans reviewed"),
      check("services_scanned","Service scan completed and route marked"),
      check("excavation_support","Support, battering or ground-stability controls verified"),
      check("safe_access","Safe access, barriers and vehicle controls established"),
      check("inspection_arranged","Competent-person inspection frequency established"),
    ],
    fields:[
      field("excavation_depth","Maximum excavation depth","number","Enter the planned depth in metres."),
      field("excavation_dimensions","Length and width","text","Record approximate dimensions and limits."),
      field("service_plan_reference","Service-plan/drawing reference","text","Reference or upload the current plan."),
      field("locator_details","Locator and scan details","textarea","Record equipment ID, scan date, operator and findings."),
      field("ground_conditions","Ground and support arrangements","textarea","Describe soil, water, contamination, shoring, battering and spoil placement."),
    ],
  },
  lifting:{
    title:"Lifting-operation controls",
    guidance:"The lift must be planned by a competent person and remain within the verified capacity of all equipment and accessories.",
    controls:[
      check("lift_plan_approved","Lift plan and method approved"),
      check("equipment_certified","Lifting equipment and accessories have current examinations"),
      check("load_verified","Load weight, centre of gravity and lifting points verified"),
      check("ground_verified","Set-up area and ground-bearing capacity verified"),
      check("exclusion_zone","Exclusion zone, signaller and communication established"),
    ],
    fields:[
      field("lift_classification","Lift classification","select","Use the organisation's lifting classification.",true,["Routine","Standard non-routine","Complex/critical"]),
      field("appointed_person","Appointed person/lift planner","person","Select the competent person who planned the lift."),
      field("crane_operator","Crane/hoist operator","person","Select or record the authorised operator."),
      field("signaller","Signaller/banksman","person","Select or record the designated signaller."),
      field("load_weight","Verified load weight","number","Enter the load weight in kilograms."),
      field("equipment_capacity","Minimum equipment capacity","number","Enter safe working capacity in kilograms."),
      field("lifting_equipment","Equipment and accessory IDs","textarea","List crane/hoist, slings, shackles and current examination references."),
      field("lifting_weather_limits","Weather limits","textarea","State wind and other environmental stop limits."),
    ],
  },
  general:{
    title:"General high-risk-work controls",
    guidance:"Explain why a specialist permit is not applicable and select every control required by the task risk assessment.",
    controls:[
      check("general_permit_justified","Use of a general permit justified"),
      check("task_controls_verified","All task-specific controls independently checked"),
      check("interfaces_controlled","Interfaces with operations and adjacent work controlled"),
    ],
    fields:[
      field("general_permit_justification","Reason for general permit","textarea","Confirm why no specialist permit category provides a better control."),
      field("additional_requirements","Task-specific requirements","textarea","List the requirements in numbered form and state how each was verified."),
    ],
  },
};

export function getPermitRule(type){
  return PERMIT_CONTROL_RULES[type] || PERMIT_CONTROL_RULES.general;
}

export function validatePermitSpecificControls(type,values={},selectedControls=[],hazards=[]){
  const rule=getPermitRule(type);
  const missingControls=rule.controls.filter(item=>item.critical&&!selectedControls.includes(item.key)).map(item=>item.label);
  const missingFields=rule.fields.filter(item=>item.required&&!String(values[item.key]??"").trim()).map(item=>item.label);
  const requiresAtmosphere=rule.requiresAtmosphere===true || (rule.requiresAtmosphereWhen||[]).some(item=>hazards.includes(item));
  return {valid:!missingControls.length&&!missingFields.length,missingControls,missingFields,requiresIsolation:!!rule.requiresIsolation,requiresAtmosphere};
}
