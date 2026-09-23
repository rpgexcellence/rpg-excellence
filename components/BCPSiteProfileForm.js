import { useActionState, useMemo, useRef, useState } from "react";

 

const blankProcess = { name:"", description:"", owner:"", products:[], upstream:"", outputs:"", downstream:"", dependencyCategories:[], dependencyDetails:"", obligation:false, obligationDetails:"", stopsCritical:false, breachRisk:false, materialHarm:false, workableAlternative:true, biaOverride:"auto", saved:false };

const blankPerson = { name:"", role:"", email:"", phase:"Foundation" };

const blankDependency = { name:"", category:"People and competence", processes:[], owner:"", providerLocation:"", minimumRequirement:"", requiredAvailability:"", maximumOutage:"", existingResilience:"", alternative:"", alternativeAvailable:false, anotherSite:false, alternativeTested:false, sufficientCapacity:false, formalAgreement:false, singlePoint:false, lastTested:"", evidence:"", siteWide:false };

const blankInfoAsset = { name:"", owner:"", classification:"Internal", processes:[], systemLocation:"", disruptionNeed:"", lossImpact:"", authoritativeSource:"", backupAvailable:"Unknown", offlineCopy:"Unknown", retention:"", obligation:"" };

const blankSystem = { name:"", businessOwner:"", technicalOwner:"", hostingModel:"Cloud", hostingLocation:"", processes:[], authentication:"", backupFrequency:"", lastRestoreTest:"", redundancy:"", emergencyAccess:"", workaround:"", supplierContact:"" };

const blankRemoteSupport = { provider:"", service:"", countryLocation:"", systemsData:"", accessRoute:"", supportHours:"", crossBorder:false, slaReference:"", emergencyContact:"", alternative:"", lastTest:"" };

const serviceOptions = ["Customer support", "Manufacturing", "Materials testing", "Technical training", "Personnel certification", "Consultancy", "Digital platform", "Customer portal", "Product delivery", "Regulatory reporting"];

const regionCountries = {

  "Europe":["Austria","Belgium","Bulgaria","Croatia","Cyprus","Czech Republic","Denmark","Estonia","Finland","France","Germany","Greece","Hungary","Ireland","Italy","Latvia","Lithuania","Luxembourg","Netherlands","Norway","Poland","Portugal","Romania","Slovakia","Slovenia","Spain","Sweden","Switzerland","United Kingdom"],

  "Africa":["Algeria","Angola","Botswana","Egypt","Ethiopia","Ghana","Kenya","Morocco","Mozambique","Namibia","Nigeria","Rwanda","Senegal","South Africa","Tanzania","Tunisia","Uganda","Zambia","Zimbabwe"],

  "Middle East":["Bahrain","Israel","Jordan","Kuwait","Lebanon","Oman","Qatar","Saudi Arabia","Turkey","United Arab Emirates"],

  "Asia-Pacific":["Australia","Bangladesh","China","Hong Kong","India","Indonesia","Japan","Malaysia","New Zealand","Pakistan","Philippines","Singapore","South Korea","Sri Lanka","Taiwan","Thailand","Vietnam"],

  "North America":["Canada","Mexico","United States"],

  "Latin America and Caribbean":["Argentina","Bahamas","Barbados","Brazil","Chile","Colombia","Costa Rica","Dominican Republic","Ecuador","Jamaica","Panama","Peru","Trinidad and Tobago","Uruguay"]

};

const countryLocations = {

  "United Kingdom":["Belfast","Birmingham","Bristol","Cardiff","Edinburgh","Glasgow","Leeds","Liverpool","London","Manchester","Newcastle","Nottingham","Sheffield"],

  "United States":["Atlanta","Boston","Chicago","Dallas","Denver","Houston","Los Angeles","Miami","New York","Philadelphia","Phoenix","San Francisco","Seattle","Washington DC"],

  "Canada":["Calgary","Edmonton","Montreal","Ottawa","Toronto","Vancouver"], "Mexico":["Guadalajara","Mexico City","Monterrey"],

  "France":["Bordeaux","Lille","Lyon","Marseille","Paris","Toulouse"], "Germany":["Berlin","Cologne","Düsseldorf","Frankfurt","Hamburg","Munich","Stuttgart"],

  "Poland":["Gdańsk","Katowice","Kraków","Łódź","Poznań","Warsaw","Wrocław"], "Ireland":["Cork","Dublin","Galway","Limerick"],

  "Spain":["Barcelona","Bilbao","Madrid","Seville","Valencia"], "Italy":["Bologna","Milan","Naples","Rome","Turin"],

  "South Africa":["Cape Town","Durban","Johannesburg","Pretoria"], "Nigeria":["Abuja","Lagos","Port Harcourt"], "Kenya":["Mombasa","Nairobi"],

  "United Arab Emirates":["Abu Dhabi","Dubai","Sharjah"], "Saudi Arabia":["Dammam","Jeddah","Riyadh"],

  "India":["Ahmedabad","Bengaluru","Chennai","Delhi","Hyderabad","Kolkata","Mumbai","Pune"], "China":["Beijing","Chengdu","Guangzhou","Shanghai","Shenzhen"],

  "Australia":["Adelaide","Brisbane","Melbourne","Perth","Sydney"], "Japan":["Fukuoka","Nagoya","Osaka","Tokyo"],

  "Singapore":["Singapore"], "Brazil":["Brasília","Curitiba","Rio de Janeiro","São Paulo"], "Argentina":["Buenos Aires","Córdoba","Rosario"]

};

const dependencyCategories = ["People and competence","Premises and workspace","Technology, systems and data","Equipment and consumables","Utilities","Suppliers and outsourced services","Transport and logistics","Communications","Finance and insurance","Information and records"];

const steps = [

  ["identity","Site identity","Boundary, leaders and accountability"],

  ["operations","Operational profile","Products, services and operating pattern"],

  ["value","Value-chain processes","Activities that create or deliver value"],

  ["support","Support processes","Enabling activities and owners"],

  ["dependencies","Dependencies","People, premises, technology and supply"],

  ["security","Information and technology continuity","Essential information, ICT recovery and remote support"],

  ["learning","BCP participants","Awareness and role-specific learning"]

];

const governanceStyles=`.spxFormError{display:grid;gap:4px;margin-bottom:14px;padding:13px 16px;border:1px solid #f0b5ad;border-radius:10px;background:#fff1ef;color:#9c241a}.spxFormError span{font-size:12px}.spxGovernance{margin-top:18px;padding:18px;border:1px solid #c9d8ea;border-radius:13px;background:#f3f7ff}.spxGovernance header div{display:grid;gap:4px}.spxGovernance header small{color:#536f8e;text-transform:capitalize}.spxGovernance p{margin:14px 0 0;color:#60778e;font-size:11px}.spxFooter>div:first-child{display:flex;gap:7px}.spxFooter button.danger{border-color:#efbcb5;background:#fff3f1;color:#b42318}.spxFooter button:disabled{opacity:.45;cursor:not-allowed}@media(max-width:600px){.spxGovernance{padding:13px}.spxFooter>div:first-child{display:grid}}`;

 

function ProcessRepeater({ items, setItems, support=false, services=[], relatedProcesses=[] }) {

  const dependencyCategories=["People and competencies","Technology and data","Premises and utilities","Equipment","Suppliers","Information and records"];

  const ownerRoles=["Commercial Manager","Operations Manager","Site Manager","Quality Manager","IT Manager","HR Manager","Finance Manager","Supply Chain Manager","Facilities Manager","Process Owner","Other"];

  const update=(i,k,v)=>setItems(items.map((x,n)=>n===i?{...x,[k]:v}:x));

  const toggle=(i,k,v)=>update(i,k,(items[i][k]||[]).includes(v)?(items[i][k]||[]).filter(y=>y!==v):[...(items[i][k]||[]),v]);

  const recommendation=x=>x.biaOverride==="yes"||(x.biaOverride!=="no"&&(x.stopsCritical||x.breachRisk||x.materialHarm||!x.workableAlternative));

  const processNames=[...new Set([

    ...relatedProcesses.map(x=>x?.name),

    ...items.map(x=>x?.name),

  ].filter(Boolean))];

  const yesNo=(i,k,value)=><div className="spxYesNo"><button type="button" className={items[i][k]===value?"selected":""} onClick={()=>update(i,k,value)}>{value?"Yes":"No"}</button></div>;

  return <div className="spxRepeater">{!support&&processNames.length>0&&<div className="spxChain">{processNames.map((name,i)=><span key={name+i}><b>{name}</b>{i<processNames.length-1&&<i>→</i>}</span>)}</div>}{items.map((x,i)=>{

    const bia=recommendation(x);

    const upstreamOptions=[...new Set(["Customer enquiry",...processNames.filter(n=>n!==x.name),"External supplier or trigger","Other"])];

    const downstreamOptions=[...new Set([...processNames.filter(n=>n!==x.name),"Customer","Regulator or accreditation body","Operational planning","Other"])];

    if(x.saved)return <article className="spxProcessSummary" key={i}><div><b>{String(i+1).padStart(2,"0")}</b><span><strong>{x.name||((support?"Support":"Value-chain")+" process "+(i+1))}</strong><small>{x.owner||"Owner not assigned"} · {(x.products||[]).join(", ")||"No service linked"}</small></span></div><mark className={bia?"high":""}>{bia?"BIA recommended":"Initial screening complete"}</mark><nav><button type="button" onClick={()=>update(i,"saved",false)}>Edit</button><button type="button" onClick={()=>setItems([...items,{...x,name:(x.name||"Process")+" copy",saved:false}])}>Duplicate</button><button type="button" onClick={()=>setItems(items.filter((_,n)=>n!==i))}>Delete</button></nav></article>;

    return <article key={i}><header><div><b>{String(i+1).padStart(2,"0")}</b><strong>{x.name||((support?"Support":"Value-chain")+" process "+(i+1))}</strong></div><button type="button" onClick={()=>setItems(items.filter((_,n)=>n!==i))}>Remove</button></header><div className="spxGrid">

      <label>Process name<input value={x.name||""} onChange={e=>update(i,"name",e.target.value)} placeholder={support?"e.g. IT service management":"e.g. Product delivery"}/></label>

      <fieldset className="spxChoice"><legend>Process owner *</legend><div>{ownerRoles.map(r=><button type="button" key={r} className={x.owner===r?"selected":""} onClick={()=>update(i,"owner",r)}>{x.owner===r?"✓ ":"+ "}{r}</button>)}</div></fieldset>

      <label className="wide">Purpose and boundary<textarea value={x.description||""} onChange={e=>update(i,"description",e.target.value)} rows="2" placeholder="Briefly describe what starts and ends this process"/></label>

      <fieldset className="wide spxChoice"><legend>Products/services supported *</legend><p>Select from the services identified in Step 2.</p><div>{services.length?services.map(s=><button type="button" key={s} className={(x.products||[]).includes(s)?"selected":""} onClick={()=>toggle(i,"products",s)}>{(x.products||[]).includes(s)?"✓ "+s:"+ "+s}</button>):<small>Add critical products or services in Step 2 first.</small>}</div></fieldset>

      <fieldset className="spxChoice"><legend>Upstream process or input</legend><div>{upstreamOptions.map(option=><button type="button" key={option} className={x.upstream===option?"selected":""} onClick={()=>update(i,"upstream",option)}>{x.upstream===option?"✓ ":"+ "}{option}</button>)}</div></fieldset>

      <label>Critical outputs<textarea value={x.outputs||""} onChange={e=>update(i,"outputs",e.target.value)} rows="3" placeholder="One essential output per line"/></label>

      <fieldset className="spxChoice"><legend>Downstream process or recipient</legend><div>{downstreamOptions.map(option=><button type="button" key={option} className={x.downstream===option?"selected":""} onClick={()=>update(i,"downstream",option)}>{x.downstream===option?"✓ ":"+ "}{option}</button>)}</div></fieldset>

      <fieldset className="wide spxChoice"><legend>Dependencies</legend><p>Select every applicable category, then describe the actual dependencies.</p><div>{dependencyCategories.map(d=><button type="button" key={d} className={(x.dependencyCategories||[]).includes(d)?"selected":""} onClick={()=>toggle(i,"dependencyCategories",d)}>{(x.dependencyCategories||[]).includes(d)?"✓ "+d:"+ "+d}</button>)}</div><textarea value={x.dependencyDetails||""} onChange={e=>update(i,"dependencyDetails",e.target.value)} rows="3" placeholder="Name the people, systems, premises, equipment, suppliers or records relied upon"/></fieldset>

      <fieldset className="wide spxScreen"><legend>Regulatory or contractual obligation</legend><select value={x.obligation?"yes":"no"} onChange={e=>update(i,"obligation",e.target.value==="yes")}><option value="no">No identified obligation</option><option value="yes">Yes — legal, regulatory, accreditation or contractual</option></select>{x.obligation&&<textarea value={x.obligationDetails||""} onChange={e=>update(i,"obligationDetails",e.target.value)} rows="2" placeholder="Describe the applicable obligation"/>}</fieldset>

      <fieldset className="wide spxScreen"><legend>Continuity screening</legend><div className="spxScreenRow"><span>Would disruption stop or materially delay a priority service?</span>{yesNo(i,"stopsCritical",true)}{yesNo(i,"stopsCritical",false)}</div><div className="spxScreenRow"><span>Could disruption create a legal, contractual or accreditation breach?</span>{yesNo(i,"breachRisk",true)}{yesNo(i,"breachRisk",false)}</div><div className="spxScreenRow"><span>Could it cause significant safety, financial or reputational harm?</span>{yesNo(i,"materialHarm",true)}{yesNo(i,"materialHarm",false)}</div><div className="spxScreenRow"><span>Is there an established alternative or manual workaround?</span>{yesNo(i,"workableAlternative",true)}{yesNo(i,"workableAlternative",false)}</div><div className={"spxBiaResult "+(bia?"high":"")}><b>{bia?"✓ Recommended for detailed BIA — High priority":"Detailed BIA not automatically indicated"}</b><span>This is an initial screening result; recovery times are established during the detailed BIA.</span></div><label>Manual decision<select value={x.biaOverride||"auto"} onChange={e=>update(i,"biaOverride",e.target.value)}><option value="auto">Use automatic recommendation</option><option value="yes">Include in detailed BIA</option><option value="no">Do not include at this stage</option></select></label></fieldset>

    </div><button className="spxSaveProcess" type="button" onClick={()=>update(i,"saved",true)}>Save process and collapse</button></article>})}</div>;

}

 

function ParticipantRepeater({items,setItems}) {

  const update=(i,k,v)=>setItems(items.map((x,n)=>n===i?{...x,[k]:v}:x));

  return <div className="spxRepeater">{items.map((x,i)=><article key={i}><header><div><b>{String(i+1).padStart(2,"0")}</b><strong>{x.name||`Participant ${i+1}`}</strong></div><button type="button" onClick={()=>setItems(items.filter((_,n)=>n!==i))}>Remove</button></header><div className="spxGrid"><label>Name<input value={x.name} onChange={e=>update(i,"name",e.target.value)}/></label><label>Role<input value={x.role} onChange={e=>update(i,"role",e.target.value)}/></label><label>Email<input type="email" value={x.email} onChange={e=>update(i,"email",e.target.value)}/></label><label>Learning phase<select value={x.phase} onChange={e=>update(i,"phase",e.target.value)}>{["Foundation","Context and roles","Risk and BIA","Strategy and plans","Response and recovery","Exercise and assurance"].map(p=><option key={p}>{p}</option>)}</select></label></div></article>)}</div>;

}

 

function DependencyMapper({items,setItems,processes=[]}) {

  const [selected,setSelected]=useState(0);

  const current=items[selected]||null;

  const update=(k,v)=>setItems(items.map((x,i)=>i===selected?{...x,[k]:v}:x));

  const toggleProcess=name=>update("processes",(current.processes||[]).includes(name)?current.processes.filter(x=>x!==name):[...(current.processes||[]),name]);

  const add=(preset={})=>{setItems([...items,{...blankDependency,...preset}]);setSelected(items.length)};

  const classification=d=>d.singlePoint?"Single point of failure":(!d.alternativeAvailable||!d.sufficientCapacity)?"Vulnerable":(!d.alternativeTested||!d.formalAgreement)?"Partially resilient":"Resilient";

  const context=processes.find(p=>p.name===(current?.processes||[])[0]);

  return <div className="spxDependencyTool">

    <div className="spxDependencyTop"><label>Which process are you mapping?<select value={current?.processes?.[0]||""} onChange={e=>{if(!current){add({processes:[e.target.value]});return}update("processes",e.target.value?[e.target.value]:[])}}><option value="">Select process</option>{processes.map(p=><option key={p.name}>{p.name}</option>)}</select></label><label className="spxSiteWide"><input type="checkbox" checked={!!current?.siteWide} disabled={!current} onChange={e=>update("siteWide",e.target.checked)}/> Site-wide dependency affecting several processes</label></div>

    {context&&<div className="spxProcessContext"><b>{context.name}</b><span>Supports: {(context.products||[]).join(", ")||"No product/service linked"}</span><span>Process owner: {context.owner||"Not assigned"}</span><span>BIA screening: {(context.stopsCritical||context.breachRisk||context.materialHarm||!context.workableAlternative)?"High priority":"Review during BIA"}</span></div>}

    <div className="spxDependencyExamples"><span>Quick add:</span>{[["Specialist technical competence","People and competence"],["Primary workplace","Premises and workspace"],["Core application","Technology, systems and data"],["Electricity supply","Utilities"],["Critical supplier","Suppliers and outsourced services"],["Controlled records","Information and records"]].map(([name,category])=><button type="button" key={name} onClick={()=>add({name,category,processes:current?.processes||[]})}>+ {name}</button>)}<button type="button" onClick={()=>add()}>+ Add dependency</button></div>

    <div className="spxDependencyLayout"><aside>{items.length?items.map((d,i)=><button type="button" className={selected===i?"active":""} key={i} onClick={()=>setSelected(i)}><b>{String(i+1).padStart(2,"0")} {d.name||"New dependency"}</b><small>{d.category} · {classification(d)}</small></button>):<p>No dependency records yet.</p>}</aside>

    {current&&<article className="spxDependencyRecord"><header><div><strong>{current.name||"Dependency record"}</strong><small>{classification(current)}</small></div><button type="button" onClick={()=>{const next=items.filter((_,i)=>i!==selected);setItems(next);setSelected(Math.max(0,selected-1))}}>Delete</button></header><div className="spxGrid">

      <label>Dependency<input value={current.name} onChange={e=>update("name",e.target.value)} placeholder="e.g. Specialist technical competence"/></label>

      <label>Category<select value={current.category} onChange={e=>update("category",e.target.value)}>{dependencyCategories.map(c=><option key={c}>{c}</option>)}</select></label>

      <fieldset className="wide spxChoice"><legend>Processes supported</legend><div>{processes.map(p=><button type="button" key={p.name} className={(current.processes||[]).includes(p.name)?"selected":""} onClick={()=>toggleProcess(p.name)}>{(current.processes||[]).includes(p.name)?"✓ ":"+ "}{p.name}</button>)}</div></fieldset>

      <label>Dependency owner<input value={current.owner} onChange={e=>update("owner",e.target.value)} placeholder="Role or accountable person"/></label>

      <label>Provider/location<input value={current.providerLocation} onChange={e=>update("providerLocation",e.target.value)} placeholder="Provider, site or workspace"/></label>

      <label>Minimum requirement<textarea value={current.minimumRequirement} onChange={e=>update("minimumRequirement",e.target.value)} rows="2" placeholder="Minimum capacity, quantity or competence"/></label>

      <label>Required availability<input value={current.requiredAvailability} onChange={e=>update("requiredAvailability",e.target.value)} placeholder="e.g. During operating hours"/></label>

      <label>Maximum outage before impact<input value={current.maximumOutage} onChange={e=>update("maximumOutage",e.target.value)} placeholder="Initial dependency tolerance, e.g. 4 hours"/></label>

      <label>Existing resilience<textarea value={current.existingResilience} onChange={e=>update("existingResilience",e.target.value)} rows="2" placeholder="Redundancy, deputies, backup or spare capacity"/></label>

      <label className="wide">Alternative/workaround<textarea value={current.alternative} onChange={e=>update("alternative",e.target.value)} rows="2" placeholder="Alternative provider, another site or manual workaround"/></label>

      <fieldset className="wide spxScreen"><legend>Resilience screening</legend>{[["alternativeAvailable","Is there an alternative?"],["anotherSite","Is it available from another site?"],["alternativeTested","Has the alternative been tested?"],["singlePoint","Is this a single point of failure?"],["sufficientCapacity","Is there sufficient capacity during disruption?"],["formalAgreement","Is a formal agreement or SLA in place?"]].map(([k,q])=><div className="spxScreenRow" key={k}><span>{q}</span><button type="button" className={current[k]===true?"selected":""} onClick={()=>update(k,true)}>Yes</button><button type="button" className={current[k]===false?"selected":""} onClick={()=>update(k,false)}>No</button></div>)}<label>When was the workaround last tested?<input type="date" value={current.lastTested} onChange={e=>update("lastTested",e.target.value)}/></label></fieldset>

      <label className="wide">Evidence/reference<input value={current.evidence} onChange={e=>update("evidence",e.target.value)} placeholder="Document, agreement, test record or competence matrix reference"/></label>

    </div><div className={"spxResilience "+classification(current).toLowerCase().replaceAll(" ","-")}><b>{classification(current)}</b><span>Validate the initial dependency tolerance and resilience during the detailed process BIA.</span></div></article>}</div>

    {items.length>0&&<div className="spxDependencyMap"><strong>Dependency map</strong>{items.map((d,i)=><div key={i}><b>{(d.processes||[]).join(", ")||"Site-wide"}</b><span>→</span><em>{d.name||"Unnamed dependency"}</em><mark>{classification(d)}</mark></div>)}</div>}

  </div>;

}

 

function InformationContinuity({data,setData,processes=[]}) {

  const controls=[

    ["isolatedBackups","Are critical backups isolated from the production environment?"],

    ["restoreTested","Has data restoration been tested?"],

    ["emergencyAccess","Is emergency privileged access available and controlled?"],

    ["mfaDisruption","Is multi-factor authentication available during disruption?"],

    ["alternativeComms","Are alternative communications available?"],

    ["loggingContinues","Can security logging and monitoring continue?"],

    ["failover","Is system redundancy or failover available?"],

    ["incidentEscalation","Are information-security incident and BCP escalation routes connected?"],

    ["offlineDocuments","Can controlled documents be accessed if the primary system is unavailable?"],

    ["supplierRecovery","Are third-party recovery obligations documented?"]

  ];

  const set=(key,value)=>setData({...data,[key]:value});

  const update=(key,i,k,v)=>set(key,data[key].map((x,n)=>n===i?{...x,[k]:v}:x));

  const toggleProcess=(key,i,name)=>{const row=data[key][i],list=row.processes||[];update(key,i,"processes",list.includes(name)?list.filter(x=>x!==name):[...list,name])};

  const remove=(key,i)=>set(key,data[key].filter((_,n)=>n!==i));

  const controlValues=Object.values(data.controls||{});

  const ready=controlValues.filter(x=>x==="yes").length;

  const gaps=controlValues.filter(x=>x==="no").length;

  const status=controlValues.length<controls.length?"Developing":gaps?"Partially ready":"Ready";

  return <div className="spxInfoContinuity">

    <div className="spxInfoImport"><b>Reuse controlled information</b><span>Future integration points: ISO/IEC 27001 risk register · Statement of Applicability · Document register · Technology dependency register</span></div>

    <InfoRegister title="1. Critical information assets" items={data.assets} add={()=>set("assets",[...data.assets,{...blankInfoAsset}])} remove={i=>remove("assets",i)}>{(x,i)=><div className="spxGrid"><label>Information asset<input value={x.name} onChange={e=>update("assets",i,"name",e.target.value)} placeholder="e.g. Customer test records"/></label><label>Asset owner<input value={x.owner} onChange={e=>update("assets",i,"owner",e.target.value)} placeholder="Accountable role"/></label><label>Classification<select value={x.classification} onChange={e=>update("assets",i,"classification",e.target.value)}><option>Public</option><option>Internal</option><option>Confidential</option><option>Restricted</option></select></label><label>System/location<input value={x.systemLocation} onChange={e=>update("assets",i,"systemLocation",e.target.value)} placeholder="System and hosting location"/></label><ProcessChoices processes={processes} selected={x.processes} toggle={name=>toggleProcess("assets",i,name)}/><label>Required during disruption<input value={x.disruptionNeed} onChange={e=>update("assets",i,"disruptionNeed",e.target.value)} placeholder="Read, update, approve, communicate..."/></label><label>Loss impact<input value={x.lossImpact} onChange={e=>update("assets",i,"lossImpact",e.target.value)} placeholder="Operational or compliance impact"/></label><label>Authoritative source<input value={x.authoritativeSource} onChange={e=>update("assets",i,"authoritativeSource",e.target.value)}/></label><label>Backup available<select value={x.backupAvailable} onChange={e=>update("assets",i,"backupAvailable",e.target.value)}><option>Unknown</option><option>Yes</option><option>No</option></select></label><label>Offline copy required<select value={x.offlineCopy} onChange={e=>update("assets",i,"offlineCopy",e.target.value)}><option>Unknown</option><option>Yes</option><option>No</option></select></label><label>Retention requirement<input value={x.retention} onChange={e=>update("assets",i,"retention",e.target.value)} placeholder="e.g. 10 years"/></label><label>Regulatory/contractual basis<input value={x.obligation} onChange={e=>update("assets",i,"obligation",e.target.value)}/></label></div>}</InfoRegister>

    <InfoRegister title="2. Critical systems and recovery arrangements" items={data.systems} add={()=>set("systems",[...data.systems,{...blankSystem}])} remove={i=>remove("systems",i)}>{(x,i)=><div className="spxGrid"><label>System/application<input value={x.name} onChange={e=>update("systems",i,"name",e.target.value)}/></label><label>Business owner<input value={x.businessOwner} onChange={e=>update("systems",i,"businessOwner",e.target.value)}/></label><label>Technical owner<input value={x.technicalOwner} onChange={e=>update("systems",i,"technicalOwner",e.target.value)}/></label><label>Hosting model<select value={x.hostingModel} onChange={e=>update("systems",i,"hostingModel",e.target.value)}><option>Cloud</option><option>On premises</option><option>Hybrid</option><option>Supplier hosted</option></select></label><label>Hosting location<input value={x.hostingLocation} onChange={e=>update("systems",i,"hostingLocation",e.target.value)}/></label><ProcessChoices processes={processes} selected={x.processes} toggle={name=>toggleProcess("systems",i,name)}/><label>Authentication method<input value={x.authentication} onChange={e=>update("systems",i,"authentication",e.target.value)}/></label><label>Backup frequency<input value={x.backupFrequency} onChange={e=>update("systems",i,"backupFrequency",e.target.value)}/></label><label>Last successful restore test<input type="date" value={x.lastRestoreTest} onChange={e=>update("systems",i,"lastRestoreTest",e.target.value)}/></label><label>Redundancy/failover<input value={x.redundancy} onChange={e=>update("systems",i,"redundancy",e.target.value)}/></label><label>Emergency access method<input value={x.emergencyAccess} onChange={e=>update("systems",i,"emergencyAccess",e.target.value)}/></label><label>Alternative/manual workaround<input value={x.workaround} onChange={e=>update("systems",i,"workaround",e.target.value)}/></label><label className="wide">Supplier and support contact<input value={x.supplierContact} onChange={e=>update("systems",i,"supplierContact",e.target.value)}/></label></div>}</InfoRegister>

    <InfoRegister title="3. Remote and cross-border support" items={data.remoteSupport} add={()=>set("remoteSupport",[...data.remoteSupport,{...blankRemoteSupport}])} remove={i=>remove("remoteSupport",i)}>{(x,i)=><div className="spxGrid"><label>Supporting team/provider<input value={x.provider} onChange={e=>update("remoteSupport",i,"provider",e.target.value)}/></label><label>Service provided<input value={x.service} onChange={e=>update("remoteSupport",i,"service",e.target.value)}/></label><label>Country/location<input value={x.countryLocation} onChange={e=>update("remoteSupport",i,"countryLocation",e.target.value)}/></label><label>Systems and data accessible<input value={x.systemsData} onChange={e=>update("remoteSupport",i,"systemsData",e.target.value)}/></label><label>Access route<input value={x.accessRoute} onChange={e=>update("remoteSupport",i,"accessRoute",e.target.value)} placeholder="VPN, privileged access, cloud portal..."/></label><label>Support hours/time zone<input value={x.supportHours} onChange={e=>update("remoteSupport",i,"supportHours",e.target.value)}/></label><label className="spxSiteWide"><input type="checkbox" checked={x.crossBorder} onChange={e=>update("remoteSupport",i,"crossBorder",e.target.checked)}/>Cross-border data access or transfer</label><label>Contract/SLA reference<input value={x.slaReference} onChange={e=>update("remoteSupport",i,"slaReference",e.target.value)}/></label><label>Emergency contact<input value={x.emergencyContact} onChange={e=>update("remoteSupport",i,"emergencyContact",e.target.value)}/></label><label>Alternative support arrangement<input value={x.alternative} onChange={e=>update("remoteSupport",i,"alternative",e.target.value)}/></label><label>Last continuity test<input type="date" value={x.lastTest} onChange={e=>update("remoteSupport",i,"lastTest",e.target.value)}/></label>{x.crossBorder&&<div className="wide spxJurisdictionWarning">Review jurisdiction, lawful transfer basis, contractual safeguards and emergency-access permissions.</div>}</div>}</InfoRegister>

    <fieldset className="spxScreen"><legend>4. Security continuity controls</legend>{controls.map(([k,q])=><div className="spxControlRow" key={k}><span>{q}</span>{["yes","partial","no"].map(v=><button type="button" key={v} className={data.controls?.[k]===v?"selected":""} onClick={()=>set("controls",{...data.controls,[k]:v})}>{v[0].toUpperCase()+v.slice(1)}</button>)}</div>)}</fieldset>

    <div className={"spxReadiness "+status.toLowerCase().replace(" ","-")}><span>INFORMATION CONTINUITY READINESS</span><strong>{status}</strong><p>{data.assets.length} critical assets identified · {data.systems.filter(x=>!x.lastRestoreTest).length} systems without a recorded restore test · {data.remoteSupport.filter(x=>x.crossBorder).length} cross-border arrangement(s) requiring review · {ready}/{controls.length} controls confirmed</p></div>

  </div>;

}

 

function ProcessChoices({processes,selected=[],toggle}) {

  return <fieldset className="wide spxChoice"><legend>Processes supported</legend><div>{processes.map(p=><button type="button" key={p.name} className={selected.includes(p.name)?"selected":""} onClick={()=>toggle(p.name)}>{selected.includes(p.name)?"✓ ":"+ "}{p.name}</button>)}</div></fieldset>;

}

 

function InfoRegister({title,items,add,remove,children}) {

  return <section className="spxInfoRegister"><header><h2>{title}</h2><button type="button" onClick={add}>+ Add record</button></header>{items.length?items.map((x,i)=><article key={i}><div className="spxRecordTitle"><b>{String(i+1).padStart(2,"0")} · {x.name||"New record"}</b><button type="button" onClick={()=>remove(i)}>Remove</button></div>{children(x,i)}</article>):<p>No records added yet.</p>}</section>;

}

 

export default function BCPSiteProfileForm({ action, initial, organisationName="", startStep=0 }) {

  const [formState,formAction,isPending]=useActionState(action,{error:""});

  const formRef=useRef(null);

  const initialInformation=(()=>{try{const parsed=JSON.parse(initial?.infosec_description||"{}");return {assets:parsed.assets||[],systems:parsed.systems||[],remoteSupport:parsed.remoteSupport||[],controls:parsed.controls||{}}}catch{return {assets:[],systems:[],remoteSupport:[],controls:{}}}})();

  const storedCountry=initial?.country||"";

  const countryIsListed=(regionCountries[initial?.region]||[]).includes(storedCountry);

  const storedLocation=initial?.location_name||"";

  const locationIsListed=(countryLocations[storedCountry]||[]).includes(storedLocation);

  const [step,setStep]=useState(Math.max(0,Math.min(6,Number(startStep)||0)));

  const [value,setValue]=useState(initial?.value_chain_processes?.length?initial.value_chain_processes:[{...blankProcess}]);

  const [support,setSupport]=useState(initial?.support_processes?.length?initial.support_processes:[{...blankProcess}]);

  const [people,setPeople]=useState(initial?.training_participants?.length?initial.training_participants:[{...blankPerson}]);

  const [dependencies,setDependencies]=useState(Array.isArray(initial?.site_dependencies?.records)?initial.site_dependencies.records:[]);

  const [information,setInformation]=useState(initialInformation);

  const initialServices=(initial?.critical_products_services||"").split(/[\n,]+/).map(x=>x.trim()).filter(Boolean);

  const [services,setServices]=useState(initialServices);

  const [customService,setCustomService]=useState("");

  const [operatingPattern,setOperatingPattern]=useState(initial?.operating_pattern||"Monday-Friday");

  const [coreHours,setCoreHours]=useState(initial?.core_hours||"08:00-17:00");

  const [reviewFrequency,setReviewFrequency]=useState(initial?.review_frequency||"Annually");

  const [region,setRegion]=useState(initial?.region||"");

  const [country,setCountry]=useState(storedCountry?(countryIsListed?storedCountry:"Other"):"");

  const [customCountry,setCustomCountry]=useState(storedCountry&&!countryIsListed?storedCountry:"");

  const [location,setLocation]=useState(storedLocation?(locationIsListed?storedLocation:"Other"):"");

  const [customLocation,setCustomLocation]=useState(storedLocation&&!locationIsListed?storedLocation:"");

  const [tick,setTick]=useState(0);

  const countries=regionCountries[region]||[];

  const effectiveCountry=country==="Other"?customCountry:country;

  const locations=countryLocations[effectiveCountry]||[];

  const effectiveLocation=location==="Other"?customLocation:location;

 

  const completion=useMemo(()=>{

    const form=formRef.current;

    const get=(name,fallback="")=>{const field=form?.elements?.namedItem(name);return field?String(field.value??"").trim():String(fallback??"").trim()};

    const complete=[get("location_name",effectiveLocation)&&get("site_leader",initial?.site_leader)&&get("local_facilitator",initial?.local_facilitator),get("operational_description",initial?.operational_description)&&services.length,value.some(x=>x.name&&x.owner&&x.products?.length),support.some(x=>x.name&&x.owner&&x.products?.length),dependencies.some(x=>x.name&&x.category&&(x.siteWide||x.processes?.length)),information.assets.some(x=>x.name&&x.owner)||information.systems.some(x=>x.name&&x.businessOwner),people.some(x=>x.name&&x.role&&(!x.email||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.email)))].map(Boolean);

    return {complete,percent:Math.round(complete.filter(Boolean).length/steps.length*100)};

  },[tick,services,value,support,dependencies,information,people,effectiveLocation]);

 

  const selectService=s=>setServices(items=>items.includes(s)?items.filter(x=>x!==s):[...items,s]);

  const addCustom=()=>{const s=customService.trim();if(s&&!services.includes(s))setServices([...services,s]);setCustomService("")};

  const previous=()=>{setStep(x=>Math.max(0,x-1));window.scrollTo({top:0,behavior:"smooth"})};

  const suggest=()=>{const form=formRef.current;const text=`${organisationName||"The organisation"} delivers products and services through customer-facing, operational and enabling activities. Define the activities performed at this location and the customers or sites they support.`;form.elements.namedItem("operational_description").value=text;setTick(x=>x+1)};

  const useSuggestedChain=()=>setValue([

    {...blankProcess,name:"Customer enquiry",owner:"Commercial Manager",description:"Receive and qualify the customer requirement.",products:[...services],upstream:"Customer enquiry",downstream:"Contract review"},

    {...blankProcess,name:"Contract review",owner:"Commercial Manager",description:"Confirm requirements, capability, delivery timescale and applicable obligations.",products:[...services],upstream:"Customer enquiry",downstream:"Operational planning"},

    {...blankProcess,name:"Operational planning",owner:"Operations Manager",description:"Plan people, resources, controls and delivery activities.",products:[...services],upstream:"Contract review",downstream:"Product or service delivery"},

    {...blankProcess,name:"Product or service delivery",owner:"Process Owner",description:"Deliver the agreed product or service under controlled conditions.",products:[...services],upstream:"Operational planning",downstream:"Customer"}

  ]);

 

  return <div className="spxShell"><aside className="spxSide"><div className="spxBrand">RPG <span>Excellence</span></div><small>BCP SITE PROFILE</small><div className="spxOverall"><div><strong>{completion.percent}%</strong><span>complete</span></div><i><b style={{width:`${completion.percent}%`}}/></i><em>Save progress with “Save &amp; continue”</em></div><nav>{steps.map((s,i)=><button type="button" key={s[0]} onClick={()=>setStep(i)} className={step===i?"active":""}><b>{completion.complete[i]?"✓":String(i+1).padStart(2,"0")}</b><span><strong>{s[1]}</strong><small>{s[2]}</small></span></button>)}</nav><section className="spxOutputs"><strong>Generated outputs</strong><span className={completion.percent>=29?"ready":""}>BIA scope</span><span className={completion.percent>=57?"ready":""}>Critical-activity register</span><span className={completion.percent>=86?"ready":""}>Draft continuity-plan scope</span></section></aside>

    <form ref={formRef} action={formAction} className="spx" onInput={()=>setTick(x=>x+1)}>{formState?.error&&<div className="spxFormError" role="alert"><b>Cannot save this site profile</b><span>{formState.error}</span></div>}<input type="hidden" name="profile_id" value={initial?.id||""}/><input type="hidden" name="next_step" value={Math.min(6,step+1)}/><input type="hidden" name="region" value={region}/><input type="hidden" name="country" value={country}/><input type="hidden" name="country_custom" value={customCountry}/><input type="hidden" name="location_name" value={effectiveLocation}/><input type="hidden" name="value_chain_processes" value={JSON.stringify(value)}/><input type="hidden" name="support_processes" value={JSON.stringify(support)}/><input type="hidden" name="dependency_records" value={JSON.stringify(dependencies)}/><input type="hidden" name="information_continuity" value={JSON.stringify(information)}/><input type="hidden" name="training_participants" value={JSON.stringify(people)}/><input type="hidden" name="critical_products_services" value={services.join("\n")}/><input type="hidden" name="operating_pattern" value={operatingPattern}/><input type="hidden" name="core_hours" value={coreHours}/><input type="hidden" name="review_frequency" value={reviewFrequency}/>

      {step!==0&&<><input type="hidden" name="address" value={initial?.address||""}/><input type="hidden" name="headcount" value={initial?.headcount||""}/><input type="hidden" name="site_leader" value={initial?.site_leader||""}/><input type="hidden" name="site_leader_email" value={initial?.site_leader_email||""}/><input type="hidden" name="regional_facilitator" value={initial?.regional_facilitator||""}/><input type="hidden" name="local_facilitator" value={initial?.local_facilitator||""}/></>}

      {step!==1&&<><input type="hidden" name="operational_description" value={initial?.operational_description||""}/><input type="hidden" name="review_due_date" value={initial?.review_due_date||""}/></>}

      <header className="spxHeader"><div><span>STEP {step+1} OF {steps.length} · {completion.percent}% COMPLETE</span><h1>{steps[step][1]}</h1><p>{steps[step][2]}</p></div><div className="spxSaved">Saved securely when you continue</div></header><div className="spxBar"><i style={{width:`${completion.percent}%`}}/></div>

 

      {step===0&&<section className="spxCard"><div className="spxIntro"><b>Define the accountable site boundary.</b><p>Select the operating region first. The country list will then update, followed by suggested locations for the selected country.</p></div><div className="spxGrid spxLocationGrid"><label>Region *<select defaultValue={region} onChange={e=>{setRegion(e.currentTarget.value);setCountry("");setCustomCountry("");setLocation("");setCustomLocation("")}}><option value="">Select operating region</option>{Object.keys(regionCountries).map(x=><option key={x} value={x}>{x}</option>)}</select></label><label>Country *<select key={`country-${region}`} defaultValue={country} disabled={!region} onChange={e=>{setCountry(e.currentTarget.value);setLocation("");setCustomLocation("")}}><option value="">{region?"Select country":"Select region first"}</option>{countries.map(x=><option key={x} value={x}>{x}</option>)}<option value="Other">Other</option></select></label>{country==="Other"&&<label>Country name *<input value={customCountry} onChange={e=>setCustomCountry(e.target.value)} placeholder="Enter country"/></label>}<label>{locations.length?"Location / nearest city *":"Location name *"}<select key={`location-${effectiveCountry}`} defaultValue={location} disabled={!effectiveCountry} onChange={e=>setLocation(e.currentTarget.value)}><option value="">{effectiveCountry?"Select location":"Select country first"}</option>{locations.map(x=><option key={x} value={x}>{x}</option>)}<option value="Other">Other</option></select></label>{location==="Other"&&<label>Custom location *<input value={customLocation} onChange={e=>setCustomLocation(e.target.value)} placeholder="Enter town, city or site name"/></label>}<label>Approximate headcount<input name="headcount" type="number" min="0" defaultValue={initial?.headcount||""}/></label><label className="wide">Site address<textarea name="address" defaultValue={initial?.address||""} rows="2" placeholder="Street, town/city and postal code"/></label><label>Site leader *<input name="site_leader" defaultValue={initial?.site_leader||""}/></label><label>Site leader email<input name="site_leader_email" type="email" defaultValue={initial?.site_leader_email||""}/></label><label>Regional BCP facilitator<input name="regional_facilitator" defaultValue={initial?.regional_facilitator||""}/></label><label>Local BCP facilitator *<input name="local_facilitator" defaultValue={initial?.local_facilitator||""}/></label></div></section>}

 

      {step===1&&<section className="spxCard"><div className="spxIntro"><b>Define what this site delivers.</b><p>Your answers will pre-populate the BIA scope and identify products or services that must be recovered after disruption.</p></div><label>Principal activities<textarea name="operational_description" defaultValue={initial?.operational_description||""} rows="5" placeholder={'Use one activity per line, for example:\nMaterials testing\nTechnical training\nPersonnel certification'}/></label><div className="spxAssist"><button type="button" onClick={suggest}>✦ Suggest from organisation profile</button><button type="button" onClick={()=>{formRef.current.elements.namedItem("operational_description").value="Customer enquiry and order intake\nService or product delivery\nQuality verification and release\nCustomer support and reporting";setTick(x=>x+1)}}>Use a service template</button></div><fieldset className="spxServices"><legend>Critical products and services</legend><p>Select everything that must be restored after disruption, then add anything unique.</p><div>{serviceOptions.map(s=><button type="button" className={services.includes(s)?"selected":""} onClick={()=>selectService(s)} key={s}>{services.includes(s)?"✓ ":"+ "}{s}</button>)}</div><div className="spxAdd"><input value={customService} onChange={e=>setCustomService(e.target.value)} placeholder="Add a custom service"/><button type="button" onClick={addCustom}>Add</button></div></fieldset><div className="spxGrid"><label>Operating pattern<select value={operatingPattern} onChange={e=>setOperatingPattern(e.target.value)}><option>Monday-Friday</option><option>Seven days</option><option>24/7 continuous</option><option>Seasonal or variable</option><option>Project based</option></select></label><label>Core hours<input value={coreHours} onChange={e=>setCoreHours(e.target.value)} placeholder="08:00-17:00"/></label><label>Next review<input name="review_due_date" type="date" defaultValue={initial?.review_due_date||""}/></label><label>Review frequency<select value={reviewFrequency} onChange={e=>setReviewFrequency(e.target.value)}><option>Quarterly</option><option>Every 6 months</option><option>Annually</option><option>After material change</option></select></label></div></section>}

 

      {step===2&&<section className="spxCard"><div className="spxIntro"><b>Build the operational chain first.</b><p>Each process is linked to products and services, upstream inputs, downstream recipients and dependencies. Recovery times are established later through detailed BIA.</p><button className="spxSuggestChain" type="button" onClick={useSuggestedChain}>✦ Use suggested value chain</button></div><ProcessRepeater items={value} setItems={setValue} services={services}/><button className="spxAddProcess" type="button" onClick={()=>setValue([...value,{...blankProcess}])}>+ Add value-chain process</button></section>}

      {step===3&&<section className="spxCard"><div className="spxIntro"><b>Identify the activities that enable recovery.</b><p>Support processes are connected to the products, services and value-chain activities they enable. Recovery times are established later through detailed BIA.</p></div><ProcessRepeater items={support} setItems={setSupport} support services={services} relatedProcesses={value}/><button className="spxAddProcess" type="button" onClick={()=>setSupport([...support,{...blankProcess}])}>+ Add support process</button></section>}

      {step===4&&<section className="spxCard"><div className="spxIntro"><b>Connect each process to the resources it relies upon.</b><p>Create structured dependency records, identify site-wide resources and screen resilience before the detailed BIA validates tolerances.</p></div><DependencyMapper items={dependencies} setItems={setDependencies} processes={[...value,...support].filter(x=>x.name)}/></section>}

      {step===5&&<section className="spxCard"><div className="spxIntro"><b>Maintain access to essential information and systems during disruption.</b><p>Register critical information, ICT recovery arrangements and cross-border support, then screen the controls required to sustain secure operations.</p></div><InformationContinuity data={information} setData={setInformation} processes={[...value,...support].filter(x=>x.name)}/></section>}

      {step===6&&<section className="spxCard"><div className="spxIntro"><b>Build the initial learning population.</b><p>Participants are assigned to foundation or role-specific phases so competence develops before each implementation activity.</p></div><ParticipantRepeater items={people} setItems={setPeople}/><button className="spxAddProcess" type="button" onClick={()=>setPeople([...people,{...blankPerson}])}>+ Add participant</button><div className="spxReady"><span>PROFILE READINESS</span><strong>{completion.percent}%</strong><p>{completion.percent===100?"All seven sections contain the minimum information required for review.":`${completion.complete.filter(x=>!x).length} section(s) still need minimum information before review.`}</p></div><section className="spxGovernance"><header><div><b>Review, approval and document control</b><small>Version {initial?.version||1} · {(initial?.status||"draft").replaceAll("_"," ")}</small></div></header><div className="spxGrid"><label>Competent reviewer / approver<input name="reviewer_name" defaultValue={initial?.reviewed_by||initial?.approved_by||initial?.site_leader||""} placeholder="Name or accountable role"/></label><label>Review decision comment<textarea name="review_comment" defaultValue={initial?.review_comment||""} rows="3" placeholder="Approval rationale or changes required"/></label></div><p>Prepared by: {initial?.prepared_by||"Current account owner"} · Last reviewed: {initial?.reviewed_at?new Date(initial.reviewed_at).toLocaleDateString("en-GB"):"Not reviewed"} · Approved: {initial?.approved_at?new Date(initial.approved_at).toLocaleDateString("en-GB"):"Not approved"}</p></section></section>}

 

      <footer className="spxFooter"><div>{step>0&&<button type="button" disabled={isPending} onClick={previous}>← Previous</button>}{initial?.id&&<button className="danger" name="intent" value="archive" disabled={isPending} onClick={event=>{if(!window.confirm("Archive this site profile? It will be retained but removed from active selection."))event.preventDefault()}}>Archive</button>}</div><span>{isPending?"Saving…":step===1?`${services.length} critical services selected`:"Progress saves to your account"}</span>{step<steps.length-1?<button className="primary" name="intent" value="continue" disabled={isPending}>Save &amp; continue →</button>:<div className="spxFinal"><button name="intent" value="draft" disabled={isPending}>Save draft</button>{initial?.status==="ready_for_review"&&<button name="intent" value="changes" disabled={isPending}>Request changes</button>}<button name="intent" value="review" disabled={isPending}>Submit for review</button><button className="primary" name="intent" value="approve" disabled={isPending}>Approve controlled version →</button></div>}</footer>

      <style>{styles}</style><style>{dependencyStyles}</style><style>{informationStyles}</style><style>{governanceStyles}</style><style>{mobileStyles}</style>

    </form></div>;

}

 

const dependencyStyles=`.spxDependencyTool{display:grid;gap:16px}.spxDependencyTop{display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:end}.spxSiteWide{display:flex!important;align-items:center}.spxSiteWide input{width:auto!important}.spxProcessContext{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:14px;border-left:5px solid #315ee8;border-radius:10px;background:#eef4ff}.spxProcessContext b,.spxProcessContext span{display:block}.spxProcessContext span{font-size:12px;color:#526a82}.spxDependencyExamples{display:flex;flex-wrap:wrap;gap:7px;align-items:center}.spxDependencyExamples button{padding:8px 10px;border:1px solid #cbd9e5;border-radius:999px;background:#f6f9fc;color:#29465f;font-weight:800}.spxDependencyLayout{display:grid;grid-template-columns:270px 1fr;gap:14px;align-items:start}.spxDependencyLayout>aside{display:grid;gap:7px}.spxDependencyLayout>aside>button{display:grid;gap:3px;padding:11px;border:1px solid #d4e0ea;border-radius:9px;background:#fff;color:#29465f;text-align:left}.spxDependencyLayout>aside>button.active{border-color:#315ee8;background:#eef3ff}.spxDependencyLayout aside small{color:#71859a}.spxDependencyRecord{padding:18px;border:1px solid #d5e1eb;border-radius:13px;background:#f8fafc}.spxDependencyRecord>header{display:flex;justify-content:space-between;align-items:center;margin-bottom:15px}.spxDependencyRecord>header small{display:block;color:#08785d}.spxDependencyRecord>header button{padding:7px 9px;border:0;border-radius:7px;background:#fff0ef;color:#b52c25;font-weight:800}.spxDependencyRecord .spxScreenRow button{padding:9px;border:1px solid #cbd9e5;border-radius:8px;background:#fff;color:#61758a}.spxDependencyRecord .spxScreenRow button.selected{border-color:#315ee8;background:#315ee8;color:#fff}.spxResilience{display:grid;gap:3px;margin-top:15px;padding:14px;border-radius:10px;background:#e7f7f1;color:#08795e}.spxResilience.vulnerable,.spxResilience.single-point-of-failure{background:#fff0ee;color:#ad3028}.spxResilience.partially-resilient{background:#fff6df;color:#916112}.spxResilience span{font-size:12px}.spxDependencyMap{display:grid;gap:7px;padding:17px;border:1px solid #d5e1eb;border-radius:12px;background:#0d315a;color:#fff}.spxDependencyMap>div{display:grid;grid-template-columns:1fr auto 1fr auto;gap:10px;align-items:center;padding:9px;border-radius:8px;background:#ffffff0b}.spxDependencyMap em{font-style:normal}.spxDependencyMap mark{padding:5px 7px;border-radius:6px;background:#e6f8f2;color:#08795e;font-size:10px;font-weight:900}@media(max-width:900px){.spxDependencyTop,.spxDependencyLayout,.spxProcessContext{grid-template-columns:1fr}.spxDependencyMap>div{grid-template-columns:1fr auto}.spxDependencyMap mark{grid-column:1/-1}}`;

 

const informationStyles=`.spxInfoContinuity{display:grid;gap:18px}.spxInfoImport{display:grid;gap:5px;padding:15px;border-left:5px solid #315ee8;border-radius:10px;background:#eef4ff;color:#29465f}.spxInfoImport span{font-size:12px}.spxInfoRegister{display:grid;gap:12px;padding:18px;border:1px solid #d4e0ea;border-radius:13px;background:#f8fafc}.spxInfoRegister>header{display:flex;justify-content:space-between;align-items:center}.spxInfoRegister h2{margin:0;color:#143653;font-size:20px}.spxInfoRegister>header button{padding:9px 11px;border:1px solid #c8d8e5;border-radius:8px;background:#fff;color:#1c58d3;font-weight:900}.spxInfoRegister>article{padding:16px;border:1px solid #d8e3ec;border-radius:11px;background:#fff}.spxRecordTitle{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}.spxRecordTitle button{padding:6px 8px;border:0;border-radius:6px;background:#fff0ef;color:#b52c25;font-weight:800}.spxJurisdictionWarning{padding:13px;border-radius:9px;background:#fff3dd;color:#87580b;font-weight:800}.spxControlRow{display:grid;grid-template-columns:1fr auto auto auto;gap:7px;align-items:center;padding:9px 0;border-bottom:1px solid #e1e8ef}.spxControlRow button{padding:8px 10px;border:1px solid #cbd9e5;border-radius:8px;background:#fff;color:#61758a}.spxControlRow button.selected{border-color:#315ee8;background:#315ee8;color:#fff}.spxReadiness{display:grid;gap:6px;padding:20px;border-radius:13px;background:#fff5df;color:#8a5a0b}.spxReadiness.ready{background:#e3f8f0;color:#08775c}.spxReadiness.partially-ready{background:#fff0e9;color:#a84626}.spxReadiness span{font-size:10px;font-weight:950;letter-spacing:.13em}.spxReadiness strong{font-size:28px}.spxReadiness p{margin:0;line-height:1.5}@media(max-width:900px){.spxControlRow{grid-template-columns:1fr auto auto auto}.spxInfoRegister{padding:12px}}`;

 

const mobileStyles=`@media(max-width:600px){html,body{max-width:100%;overflow-x:hidden}.spxShell,.spx,.spxMain,.spxCard,.spxRepeater,.spxRepeater article,.spxDependencyTool,.spxDependencyLayout,.spxDependencyRecord,.spxInfoContinuity,.spxInfoRegister,.spxInfoRegister>article{width:100%;max-width:100%;min-width:0}.spxShell{display:block}.spxSide{width:100%;margin:0 0 14px;padding:14px;border-radius:13px;overflow:hidden}.spxBrand,.spxSide>small,.spxOutputs{display:none}.spxOverall{margin:0 0 10px;padding:11px}.spxOverall strong{font-size:23px}.spxSide nav{display:flex;width:100%;gap:6px;overflow-x:auto;overscroll-behavior-inline:contain;scroll-snap-type:x proximity;padding-bottom:4px}.spxSide nav button{display:grid;grid-template-columns:25px 1fr;min-width:145px;padding:9px;scroll-snap-align:start}.spxSide nav button>b{width:24px;height:24px}.spxHeader{display:block;min-width:0}.spxHeader h1{font-size:28px;line-height:1.08;overflow-wrap:anywhere}.spxHeader p{font-size:14px}.spxSaved{margin-top:8px;font-size:11px}.spxBar{margin:14px 0}.spxCard{padding:14px;border-radius:13px;overflow:hidden}.spxIntro{margin:0 0 18px;padding:14px}.spxIntro b{font-size:17px}.spxIntro p{font-size:13px}.spxGrid,.spxDependencyTop,.spxDependencyLayout,.spxProcessContext{display:grid;grid-template-columns:minmax(0,1fr);width:100%}.spx label,.spx input,.spx select,.spx textarea{min-width:0;max-width:100%}.spx input,.spx select,.spx textarea{font-size:16px;padding:13px}.spxServices{margin:16px 0;padding:13px;min-width:0}.spxServices>div,.spxAssist,.spxDependencyExamples,.spxMiniChips{max-width:100%;overflow:hidden}.spxServices button,.spxAssist button,.spxAddProcess,.spxDependencyExamples button{white-space:normal;text-align:left}.spxServices .spxAdd{grid-template-columns:minmax(0,1fr) auto}.spxRepeater header,.spxDependencyRecord>header,.spxInfoRegister>header,.spxRecordTitle{align-items:flex-start;gap:8px}.spxRepeater header>div{min-width:0}.spxRepeater header strong,.spxRecordTitle strong{overflow-wrap:anywhere}.spxProcessSummary{grid-template-columns:minmax(0,1fr)!important}.spxProcessSummary>div,.spxProcessSummary span{min-width:0}.spxProcessSummary nav{flex-wrap:wrap}.spxChoice,.spxScreen{padding:12px;min-width:0}.spxScreenRow,.spxControlRow{grid-template-columns:minmax(0,1fr) auto auto!important;gap:5px}.spxControlRow button,.spxYesNo button{padding:8px;font-size:12px}.spxDependencyMap{padding:11px;overflow:hidden}.spxDependencyMap>div{grid-template-columns:minmax(0,1fr)!important;gap:6px}.spxDependencyMap em{display:none}.spxDependencyMap mark{grid-column:auto}.spxChain{width:100%;max-width:100%;overflow-x:auto}.spxFooter{position:static;display:grid;grid-template-columns:1fr;margin-top:12px;padding:10px}.spxFooter>div,.spxFooter>div:last-child,.spxFinal{grid-column:1;width:100%;justify-self:stretch}.spxFooter>div:first-child:empty{display:none}.spxFooter button,.spxFooter .primary{width:100%;min-height:46px}.spxFinal{display:grid;grid-template-columns:1fr;gap:7px}.spxInfoRegister h2{font-size:17px}.spxInfoRegister>header{flex-wrap:wrap}.spxInfoRegister>header button{width:100%}}`;

 

const styles=`*{box-sizing:border-box}.spxShell{display:grid;grid-template-columns:320px minmax(0,1fr);gap:30px;align-items:start}.spxSide{position:sticky;top:18px;min-height:calc(100vh - 36px);padding:28px 21px;border-radius:18px;background:#09294f;color:#fff}.spxBrand{font-size:23px;font-weight:950}.spxBrand span{font-weight:500}.spxSide>small{display:block;margin-top:8px;color:#5ee3d0;font-weight:900;letter-spacing:.14em}.spxOverall{margin:22px 0;padding:16px;border-radius:12px;background:#ffffff0c}.spxOverall>div{display:flex;justify-content:space-between;align-items:end}.spxOverall strong{font-size:30px}.spxOverall span,.spxOverall em{color:#bcd0e3;font-size:11px;font-style:normal}.spxOverall>i{display:block;height:6px;margin:12px 0;border-radius:5px;background:#315071;overflow:hidden}.spxOverall>i b{display:block;height:100%;background:#5ee3d0}.spxSide nav{display:grid;gap:5px}.spxSide nav button{display:grid;grid-template-columns:33px 1fr;gap:10px;width:100%;padding:11px;border:0;border-radius:9px;background:transparent;color:#d8e4ef;text-align:left}.spxSide nav button.active{background:#1b4d83;color:#fff}.spxSide nav button>b{display:grid;place-items:center;width:28px;height:28px;border:1px solid #ffffff35;border-radius:8px;color:#5ee3d0;font-size:10px}.spxSide nav strong,.spxSide nav small{display:block}.spxSide nav small{margin-top:3px;color:#91aac1;font-size:9px}.spxOutputs{display:grid;gap:8px;margin-top:25px;padding-top:18px;border-top:1px solid #ffffff20}.spxOutputs span{padding:8px;border-radius:7px;background:#ffffff08;color:#829ab1;font-size:10px}.spxOutputs span.ready{background:#0d715d;color:#dffff8}.spx{min-width:0}.spxHeader{display:flex;justify-content:space-between;gap:20px;align-items:center}.spxHeader span{color:#2863e7;font-size:11px;font-weight:950;letter-spacing:.12em}.spxHeader h1{margin:7px 0;font-size:43px;color:#071d3a}.spxHeader p{margin:0;color:#657b91;font-size:16px}.spxSaved{color:#087c61;font-weight:900}.spxBar{height:7px;margin:20px 0;border-radius:6px;background:#d7e2ee;overflow:hidden}.spxBar i{display:block;height:100%;background:#2863e7;transition:width .3s}.spxCard{padding:34px;border:1px solid #d3e0eb;border-radius:18px;background:#fff;box-shadow:0 12px 32px #183b6010}.spxIntro{margin:-5px -5px 25px;padding:19px;border-radius:12px;background:#f0f5fa}.spxIntro b{font-size:20px;color:#0a284b}.spxIntro p{margin:6px 0 0;color:#637990;line-height:1.55;font-size:15px}.spxGrid{display:grid;grid-template-columns:1fr 1fr;gap:15px}.spx label{display:grid;gap:7px;color:#183652;font-size:14px;font-weight:850}.spx label>small{color:#71849a;font-weight:500}.spx .wide{grid-column:1/-1}.spx input,.spx textarea,.spx select{width:100%;padding:15px;border:1px solid #b9ccdd;border-radius:9px;background:#fff;color:#0b2545;font:16px Arial,sans-serif}.spx textarea{line-height:1.5}.spxAssist{display:flex;gap:8px;margin:10px 0 23px}.spxAssist button,.spxAddProcess{padding:11px 13px;border:1px solid #bcd0e2;border-radius:999px;background:#f6f9fc;color:#153858;font-weight:850}.spxServices{margin:20px 0;padding:20px;border:1px solid #d2dfea;border-radius:13px}.spxServices legend{font-weight:900;color:#0b294b}.spxServices>p{color:#6b8094}.spxServices>div{display:flex;flex-wrap:wrap;gap:8px}.spxServices button{padding:9px 12px;border:1px solid #c6d6e4;border-radius:999px;background:#f6f9fc;color:#27445f;font-weight:800}.spxServices button.selected{background:#2863e7;border-color:#2863e7;color:#fff}.spxServices .spxAdd{display:grid;grid-template-columns:1fr auto;margin-top:13px}.spxServices .spxAdd input{border-radius:9px 0 0 9px}.spxServices .spxAdd button{border-radius:0 9px 9px 0;background:#102f55;color:#fff}.spxRepeater{display:grid;gap:13px}.spxRepeater article{padding:17px;border:1px solid #d6e2ec;border-radius:13px;background:#f8fafc}.spxRepeater header{display:flex;justify-content:space-between;align-items:center;margin-bottom:15px}.spxRepeater header>div{display:flex;gap:10px;align-items:center}.spxRepeater header b{display:grid;place-items:center;width:30px;height:30px;border-radius:8px;background:#e5edff;color:#1d5bdd}.spxRepeater header button{border:0;background:#fff0ef;color:#b52c25;padding:8px 10px;border-radius:7px;font-weight:800}.spxAddProcess{margin-top:15px;border-radius:9px;background:#eaf1ff;color:#1b5cdb}.spxMiniChips{display:flex;flex-wrap:wrap;gap:5px}.spxMiniChips button{padding:5px 7px;border:1px solid #d3dfeb;border-radius:999px;background:#f5f8fb;color:#476079;font-size:9px}.spxReady{margin-top:20px;padding:20px;border-radius:14px;background:#0d315a;color:#fff}.spxReady span{color:#5ee3d0;font-size:10px;font-weight:900;letter-spacing:.12em}.spxReady strong{display:block;margin-top:7px;font-size:33px}.spxReady p{color:#bfd0e1}.spxFooter{position:sticky;bottom:12px;z-index:8;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:15px;margin-top:16px;padding:13px;border:1px solid #d1deea;border-radius:13px;background:#ffffffef;box-shadow:0 13px 35px #163a5e25;backdrop-filter:blur(8px)}.spxFooter>span{text-align:center;color:#657b91;font-size:11px}.spxFooter>div:last-child,.spxFinal{justify-self:end}.spxFooter button{padding:12px 15px;border:1px solid #bfd0df;border-radius:8px;background:#fff;color:#173a5d;font-weight:900}.spxFooter .primary{border-color:#2863e7;background:#2863e7;color:#fff}.spxFinal{display:flex;gap:7px}.spxSuggestChain{margin-top:14px;padding:11px 15px;border:1px solid #c5d5e4;border-radius:9px;background:#fff;color:#173a5d;font-weight:900}.spxChain{display:flex;align-items:center;gap:9px;overflow:auto;padding:13px;border:1px solid #d7e2ec;border-radius:12px;background:#f3f7fb}.spxChain span{display:flex;align-items:center;gap:9px;white-space:nowrap}.spxChain b{padding:9px 12px;border:1px solid #c9d8e6;border-radius:9px;background:#fff;color:#173a5d}.spxChain i{color:#6d8297;font-style:normal}.spxChoice,.spxScreen{margin:0;padding:17px;border:1px solid #d4e0ea;border-radius:12px;background:#fff}.spxChoice legend,.spxScreen legend{padding:0 6px;color:#173a5d;font-weight:900}.spxChoice p{margin:3px 0 12px;color:#71859a}.spxChoice>div{display:flex;flex-wrap:wrap;gap:7px}.spxChoice button{padding:9px 11px;border:1px solid #c8d8e5;border-radius:999px;background:#f6f9fc;color:#29455f;font-weight:800}.spxChoice button.selected{border-color:#315ee8;background:#315ee8;color:#fff}.spxChoice textarea{margin-top:12px}.spxScreen{display:grid;gap:10px}.spxScreenRow{display:grid;grid-template-columns:1fr auto auto;gap:7px;align-items:center;padding:9px 0;border-bottom:1px solid #e1e8ef;color:#203c58}.spxYesNo button{padding:9px 11px;border:1px solid #cbd9e5;border-radius:8px;background:#fff;color:#61758a}.spxYesNo button.selected{border-color:#315ee8;background:#315ee8;color:#fff}.spxBiaResult{display:grid;gap:3px;padding:14px;border-radius:10px;background:#eef2f6;color:#52677c}.spxBiaResult.high{background:#e6f8f2;color:#08795e}.spxBiaResult span{font-size:12px}.spxSaveProcess{margin-top:15px;padding:11px 14px;border:0;border-radius:9px;background:#173b63;color:#fff;font-weight:900}.spxProcessSummary{display:grid!important;grid-template-columns:1fr auto auto;gap:12px;align-items:center}.spxProcessSummary>div{display:flex;gap:10px;align-items:center}.spxProcessSummary>div>b{padding:8px;border-radius:8px;background:#e5edff;color:#255dde}.spxProcessSummary span small{display:block;margin-top:3px;color:#71859a}.spxProcessSummary mark{padding:7px 9px;border-radius:8px;background:#edf2f6;color:#536a80;font-size:11px;font-weight:850}.spxProcessSummary mark.high{background:#e0f7ef;color:#08785d}.spxProcessSummary nav{display:flex;gap:5px}.spxProcessSummary nav button{padding:7px;border:0;background:transparent;color:#526b83;font-weight:800}@media(max-width:900px){.spxShell{grid-template-columns:1fr}.spxSide{position:static;min-height:auto;padding:16px}.spxSide nav{display:flex;overflow-x:auto}.spxSide nav button{min-width:170px}.spxOutputs{display:none}.spxGrid{grid-template-columns:1fr}.spx .wide{grid-column:auto}.spxHeader h1{font-size:29px}.spxSaved{font-size:11px}.spxCard{padding:18px}.spxFooter{bottom:7px;grid-template-columns:auto 1fr}.spxFooter>span{display:none}.spxFooter>div:last-child,.spxFinal{grid-column:2;justify-self:end}.spxAssist{flex-wrap:wrap}.spxProcessSummary{grid-template-columns:1fr}.spxScreenRow{grid-template-columns:1fr auto auto}}`;
