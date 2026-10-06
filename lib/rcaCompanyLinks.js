import { createAdminClient } from "./supabase/admin";

const name = person => [person.first_name,person.last_name].filter(Boolean).join(" ").trim() || person.email || "Unnamed contact";
export function rcaAdministrationLocations(organization) {
  const address = site => [site.address_line_1,site.address_line_2,site.city,site.region,site.postal_code,site.country].filter(Boolean).join(", ");
  const locations=[];
  if (organization.address_line_1 || organization.city || organization.postal_code) locations.push({id:"registered",label:`Site 1 · ${organization.name} · ${address(organization)}`});
  if (organization.business_site_mode === "multiple" && Array.isArray(organization.business_additional_sites)) organization.business_additional_sites.forEach((site,index)=>{
    if(site.address_line_1 || site.city) locations.push({id:`additional:${index}`,label:`Site ${index+2} · ${site.site_name || "Additional address"} · ${address(site)}`});
  });
  return locations;
}
export async function loadRcaCompanyLinks(organization) {
  const admin=createAdminClient();
  const tables=[
    ["organization_people","id,first_name,last_name,email,position,user_id"],
    ["suppliers","id,legal_name"],
    ["supplier_contacts","id,supplier_id,first_name,last_name,email,telephone,mobile,business_title"],
    ["internal_audits","id,audit_reference,title,supplier_id"],
    ["internal_audit_findings","id,audit_id,supplier_id,finding_reference,title,failure_statement,finding_type,status,linked_rca_case_id"]
  ];
  const results=await Promise.all(tables.map(([table,fields])=>{
    let query=admin.from(table).select(fields);
    if(table!=="internal_audit_findings")query=query.eq("organization_id",organization.id);
    if(table!=="organization_people")query=query.eq("owner_id",organization.owner_id);
    if(table==="organization_people")query=query.eq("account_status","active");
    if(table==="supplier_contacts")query=query.eq("is_active",true);
    if(table==="internal_audit_findings")query=query.in("finding_type",["major_nc","minor_nc"]);
    return query.order(table==="organization_people" || table==="supplier_contacts" ? "last_name" : table==="suppliers" ? "legal_name" : "created_at");
  }));
  results.forEach(result=>{if(result.error)throw new Error(result.error.message)});
  return {organizationId:organization.id,people:(results[0].data || []).map(person=>({...person,name:name(person)})),suppliers:results[1].data || [],contacts:(results[2].data || []).map(person=>({...person,name:name(person)})),audits:results[3].data || [],findings:(results[4].data || []).filter(row=>(row.audit_id ? (results[3].data || []).some(audit=>audit.id===row.audit_id) : row.supplier_id && (results[1].data || []).some(supplier=>supplier.id===row.supplier_id)) && (!row.supplier_id || (results[1].data || []).some(supplier=>supplier.id===row.supplier_id))),locations:rcaAdministrationLocations(organization)};
}
export async function rcaLinkedFinding(supabase,rcaCase,userId) {
  const {data,error}=await supabase.from("internal_audit_findings").select("id,audit_id,supplier_id,finding_reference").eq("linked_rca_case_id",rcaCase.id).eq("owner_id",userId).limit(1).maybeSingle();
  if(error)throw new Error(error.message);
  return data;
}
export function resolveRcaSource(options,formData) {
  const text=key=>String(formData.get(key)||"").trim(),source=text("source_type");
  if(!["audit","supplier"].includes(source))return null;
  const finding=options.findings.find(row=>row.id===text("linked_finding_id"));
  if(!finding || finding.status==="withdrawn")throw new Error("Select a current nonconformity for this company.");
  const audit=options.audits.find(row=>row.id===text("linked_audit_id"));
  const supplier=options.suppliers.find(row=>row.id===text("supplier_id"));
  if(source==="audit" && (!audit || finding.audit_id!==audit.id))throw new Error("Select an NC from the selected audit.");
  if(source==="supplier" && (!supplier || finding.supplier_id!==supplier.id))throw new Error("Select an NC from the selected supplier.");
  return {finding,audit:source==="audit"?audit:null,supplier:source==="supplier"?supplier:null};
}
export function resolveRcaCaseControl(options,rcaCase,linkedFinding,formData) {
  const text=key=>String(formData.get(key)||"").trim();
  const person=(key,legacyKey)=>{
    const id=text(key);
    if(!id)return {id:null,name:null};
    if(id==="legacy" && rcaCase[legacyKey])return {id:null,name:rcaCase[legacyKey]};
    const row=options.people.find(person=>person.id===id);
    if(!row)throw new Error("Select an active user from this company's user list.");
    return {id:row.id,name:row.name};
  };
  const sponsor=person("sponsor_person_id","sponsor_name"),leader=person("leader_person_id","leader_name");
  const supplierId=linkedFinding?.supplier_id || rcaCase.supplier_id || options.audits.find(row=>row.id===linkedFinding?.audit_id)?.supplier_id;
  let stakeholder=null,stakeholderPersonId=null,supplierContactId=null;
  const source=text("stakeholder_source");
  if(source==="company_user"){
    const row=options.people.find(person=>person.id===text("stakeholder_person_id"));
    if(!row)throw new Error("Select an active company stakeholder.");
    stakeholder=row.name;stakeholderPersonId=row.id;
  }else if(source==="supplier_contact"){
    const row=options.contacts.find(person=>person.id===text("stakeholder_supplier_contact_id") && person.supplier_id===supplierId);
    if(!supplierId || !row)throw new Error("Select an active contact from the supplier linked to this case.");
    stakeholder=[row.name,row.email].filter(Boolean).join(" · ");supplierContactId=row.id;
  }else if(source==="legacy" && rcaCase.customer_or_stakeholder)stakeholder=rcaCase.customer_or_stakeholder;
  else if(source)throw new Error("Select a valid stakeholder source.");
  const locationId=text("administration_location_id");
  const location=options.locations.find(row=>row.id===locationId);
  if(location && text("administration_location_label")!==location.label)throw new Error("The Administration address changed. Refresh and select it again.");
  if(locationId && !location && !(locationId==="legacy" && rcaCase.location))throw new Error("The selected Administration address has changed. Refresh and select again.");
  return {sponsor_person_id:sponsor.id,sponsor_name:sponsor.name,leader_person_id:leader.id,leader_name:leader.name,
    stakeholder_person_id:stakeholderPersonId,stakeholder_supplier_contact_id:supplierContactId,customer_or_stakeholder:stakeholder,
    administration_location_id:location?.id || null,location:location?.label || (locationId==="legacy"?rcaCase.location:null)};
}
export function resolveRcaReviewer(options,formData) {
  const row=options.people.find(person=>person.id===formData.get("reviewer_person_id"));
  if(!row)throw new Error("Select an active company reviewer before confirming this gate.");
  return {reviewer_person_id:row.id,reviewer_name:row.name,reviewer_email:row.email || null};
}
