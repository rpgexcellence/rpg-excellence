// RPG asset taxonomy. These are operational categories, not statutory applicability decisions.
export const ASSET_CATEGORIES = [
 ['plant','Plant / machinery','plant'],['production_machinery','Production machinery','plant'],['welding_cutting','Welding / cutting equipment','plant'],['machine_tools','Machine tools / CNC','plant'],['lifting_equipment','Lifting equipment / accessories','plant'],['pressure_systems','Pressure systems / vessels','plant'],['compressors_pumps','Compressors / pumps','plant'],['mobile_plant','Mobile plant / forklifts','plant'],
 ['equipment','General equipment','equipment'],['measuring_instruments','Measuring instruments / gauges','equipment'],['reference_standards','Reference standards / artefacts','equipment'],['laboratory_test','Laboratory / test equipment','equipment'],['ndt_equipment','NDT equipment','equipment'],['balances_scales','Balances / weighing equipment','equipment'],['temperature_humidity','Temperature / humidity instruments','equipment'],['pressure_vacuum','Pressure / vacuum instruments','equipment'],['electrical_measurement','Electrical measurement / test instruments','equipment'],['dimensional_measurement','Dimensional / metrology equipment','equipment'],['torque_force','Torque / force / materials test equipment','equipment'],['gas_detection','Gas detection / monitoring','equipment'],['safety_equipment','Safety / emergency equipment','equipment'],['ppe_fall_protection','PPE / fall protection','equipment'],['hand_power_tools','Hand / portable power tools','equipment'],['access_equipment','Ladders / access equipment','equipment'],['it_equipment','IT / communications hardware','equipment'],['office_furniture','Office equipment / furniture','equipment'],
 ['room_area','Room / area','room_area'],['building_fabric','Buildings / structural fabric','room_area'],['laboratory_facility','Laboratory / workshop facility','room_area'],['storage_racking','Storage / racking','room_area'],
 ['electrical_system','Electrical system','electrical_system'],['fixed_electrical','Fixed electrical installation','electrical_system'],['ups_generators','UPS / generators / power supply','electrical_system'],['fire_emergency','Fire detection / emergency lighting','electrical_system'],['security_access','Security / access control','electrical_system'],
 ['process_system','Process system','process_system'],['hvac_refrigeration','HVAC / refrigeration','process_system'],['lev_extraction','LEV / ventilation / extraction','process_system'],['water_systems','Water / treatment systems','process_system'],['gas_distribution','Gas / fuel distribution','process_system'],['environmental_controls','Environmental monitoring / control','process_system'],['control_automation','Control / automation systems','process_system'],
 ['vehicle','Vehicle','vehicle'],['fleet_road','Road vehicles / fleet','vehicle'],['trailers','Trailers / transport equipment','vehicle'],['other','Other asset','other']
];
export const CATEGORY_BY_ID = new Map(ASSET_CATEGORIES.map(([id,label,primary])=>[id,{id,label,primary}]));
export const assetCategories = asset => Array.isArray(asset.asset_categories)&&asset.asset_categories.length ? asset.asset_categories : [asset.asset_type||'other'];
export const categoryLabel = id => CATEGORY_BY_ID.get(id)?.label || String(id||'Other').replaceAll('_',' ');
export const CALIBRATION_RESULTS=[['not_assessed','Not assessed / review required'],['within_limits','Within stated acceptance limits'],['out_of_tolerance','Outside acceptance limits'],['conditional','Conditional / restricted result']];
export const FREQUENCY_UNITS=['days','weeks','months','years'];
export function validDay(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return false;const t=new Date(value+'T12:00:00Z');return Number.isFinite(t.getTime())&&t.toISOString().slice(0,10)===value;}
export function addAssetInterval(day,value,unit){
 if(!validDay(day)||!Number.isInteger(value)||value<1||value>1000||!FREQUENCY_UNITS.includes(unit))throw Error('Set a valid date and an interval from 1 to 1000.');
 const date=new Date(day+'T12:00:00Z');
 if(unit==='days'||unit==='weeks')date.setUTCDate(date.getUTCDate()+value*(unit==='weeks'?7:1));
 else {const d=date.getUTCDate();date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()+value*(unit==='years'?12:1));const end=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();date.setUTCDate(Math.min(d,end));}
 const result=date.toISOString().slice(0,10);if(!validDay(result))throw Error('The calculated due date is outside the supported range.');return result;
}
export function parseAssetControls(form,existing={},today=new Date().toISOString().slice(0,10)){
 const text=(key,max=2000)=>String(form.get(key)||'').trim().slice(0,max), yes=key=>text(key)==='true';
 const cats=[...new Set(form.getAll('asset_categories').map(String).filter(Boolean))];if(!cats.length)cats.push(text('asset_type')||existing.asset_type||'equipment');
 if(cats.length>ASSET_CATEGORIES.length||cats.some(id=>!CATEGORY_BY_ID.has(id)))throw Error('Choose one or more valid asset categories.');
 const categories=cats, primary=CATEGORY_BY_ID.get(cats[0]).primary;
 const past=(value,label)=>{if(value&&(!validDay(value)||value>today))throw Error(label+' must be a valid date on or before today.');return value||null};
 const due=(value,label,last)=>{if(value&&(!validDay(value)||(last&&value<=last)))throw Error(label+' must be a valid date after the last completed event.');return value||null};
 const interval=(prefix,required,last,explicit)=>{const n=Number(text(prefix+'_frequency_value')),unit=text(prefix+'_frequency_unit');if(!required)return {n:null,unit:null,next:null};if(explicit&&!text(prefix+'_frequency_value'))return {n:null,unit:null,next:due(explicit,'Next due date',last)};if(!Number.isInteger(n)||n<1||n>1000||!FREQUENCY_UNITS.includes(unit))throw Error('Set the '+prefix.toUpperCase()+' interval or an explicit next due date.');if(!explicit&&!last)throw Error('Enter the next '+prefix+' due date when no last completed date is known.');return{n,unit,next:due(explicit||addAssetInterval(last,n,unit),'Next due date',last)}};
 const service=yes('initial_service_required'),cal=yes('calibration_required');
 const serviceDate=past(service?text('initial_service_date'):(form.has('last_maintenance_date')?text('last_maintenance_date'):existing.last_maintenance_date||''),'Last service date');
 if(service&&!serviceDate)throw Error('Enter the completed date for the existing service / PPM record.');
 const serviceType=text('initial_service_type')||'planned';if(!['planned','inspection','statutory','repair','breakdown','other'].includes(serviceType))throw Error('Choose a valid existing service type.');
 const ppm=yes('ppm_required'),ppmInterval=interval('ppm',ppm,serviceDate,text('next_maintenance_date'));
 // PPM already requires a frequency in the existing database; preserve that rule.
 if(ppm&&!ppmInterval.n)throw Error('Set a positive PPM frequency as well as the due date.');
 const calHistory=cal&&yes('initial_calibration_required');
 const lastCal=calHistory?past(text('last_calibration_date'),'Last calibration date'):existing.last_calibration_date||null;
 if(calHistory&&!lastCal)throw Error('Enter the completed calibration date.');
 const calInterval=interval('calibration',cal,lastCal,text('next_calibration_date'));
 const result=text('calibration_result')||'not_assessed';if(!CALIBRATION_RESULTS.some(([id])=>id===result))throw Error('Choose a valid calibration result.');
 if(cal&&!text('calibration_interval_basis'))throw Error('Record the basis for the calibration interval / due date.');
 if(calHistory&&result!=='not_assessed'&&!text('calibration_acceptance_criteria'))throw Error('Record the acceptance criteria / decision rule reference before assigning a calibration result.');
 if(calHistory&&!text('calibration_provider'))throw Error('Enter the calibration provider / laboratory for the completed calibration.');
 const values={asset_type:primary,asset_categories:categories,ppm_required:ppm,ppm_frequency_value:ppmInterval.n,ppm_frequency_unit:ppmInterval.unit,last_maintenance_date:serviceDate,next_maintenance_date:ppmInterval.next,calibration_required:cal};
 if(cal)Object.assign(values,{last_calibration_date:lastCal,next_calibration_date:calInterval.next,calibration_frequency_value:calInterval.n,calibration_frequency_unit:calInterval.unit,calibration_interval_basis:text('calibration_interval_basis'),calibration_provider:calHistory?text('calibration_provider',180):existing.calibration_provider||null,calibration_certificate_reference:calHistory?text('calibration_certificate_reference',500):existing.calibration_certificate_reference||null,calibration_result:calHistory?result:existing.calibration_result||'not_assessed',calibration_scope:text('calibration_scope'),calibration_acceptance_criteria:text('calibration_acceptance_criteria')});
 const records=[];
 if(service)records.push({kind:'service',maintenance_type:serviceType,date:serviceDate,reference:text('initial_service_reference',500),performed_by:text('initial_service_provider',180),work_completed:text('initial_service_notes'),next_due_date:ppmInterval.next});
 if(calHistory)records.push({kind:'calibration',maintenance_type:'calibration',date:lastCal,reference:text('calibration_certificate_reference',500),performed_by:text('calibration_provider',180),work_completed:text('calibration_scope'),calibration_result:result,calibration_acceptance_criteria:text('calibration_acceptance_criteria'),next_due_date:calInterval.next});
 for(const [field,enabled] of [['initial_service_file',service],['calibration_file',calHistory]]){const f=form.get(field);if(f&&typeof f!=='string'&&f.size&&!enabled)throw Error('Enter the corresponding completed date before attaching evidence.');}
 return {values,records};
}
