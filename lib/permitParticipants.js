import { createAdminClient } from "./supabase/admin";

const personName = person => [person.first_name, person.last_name].filter(Boolean).join(" ").trim() || person.email || "Unnamed contact";
export async function loadPermitParticipants(organization) {
  const admin = createAdminClient();
  const results = await Promise.all([
    admin.from("organization_people").select("id,first_name,last_name,email,position").eq("organization_id", organization.id).eq("account_status", "active").order("last_name"),
    admin.from("suppliers").select("id,legal_name,approval_status").eq("organization_id", organization.id).eq("owner_id", organization.owner_id).order("legal_name"),
    admin.from("supplier_contacts").select("id,supplier_id,first_name,last_name,email,telephone,mobile,business_title").eq("organization_id", organization.id).eq("owner_id", organization.owner_id).eq("is_active", true).order("last_name")
  ]);
  for (const result of results) if (result.error) throw new Error(result.error.message);
  const suppliers = results[1].data || [];
  return {
    people: (results[0].data || []).map(person => ({...person, name:personName(person)})),
    suppliers,
    contacts: (results[2].data || []).filter(contact => suppliers.some(supplier => supplier.id === contact.supplier_id)).map(contact => ({...contact, name:personName(contact)}))
  };
}

export function resolvePermitParticipants(options, organization, formData) {
  const text = key => String(formData.get(key) || "").trim();
  const issuer = options.people.find(person => person.id === text("issuer_person_id"));
  if (!issuer) throw new Error("Select an active company user as Permit issuer. Add missing users under Administration → People, Roles & Access.");
  const kind = text("receiver_kind");
  const source = kind === "internal" ? "company_user" : text("receiver_source");
  if (!["internal", "external"].includes(kind) || !["company_user", "supplier_contact", "manual"].includes(source) || (kind === "external" && source === "company_user")) throw new Error("Select an internal company user or an external receiver source.");
  const snapshot = person => ({name:person.name, company:organization.name, email:person.email || "", telephone:""});
  let receiver, personId = null, contactId = null;
  if (source === "company_user") {
    const person = options.people.find(row => row.id === text("receiver_person_id"));
    if (!person) throw new Error("Select an active company user as Permit receiver.");
    receiver = snapshot(person); personId = person.id;
  } else if (source === "supplier_contact") {
    const supplier = options.suppliers.find(row => row.id === text("receiver_supplier_id"));
    const contact = options.contacts.find(row => row.id === text("receiver_supplier_contact_id") && row.supplier_id === supplier?.id);
    if (!supplier || !contact) throw new Error("Select a current supplier and an active contact from that supplier. Refresh if the contact has changed.");
    receiver = {name:contact.name, company:supplier.legal_name, email:contact.email || "", telephone:contact.telephone || contact.mobile || ""}; contactId = contact.id;
  } else {
    receiver = {name:text("receiver_manual_name"), company:text("receiver_manual_company"), email:text("receiver_manual_email"), telephone:text("receiver_manual_telephone")};
    if (!receiver.name || !receiver.company || (!receiver.email && !receiver.telephone)) throw new Error("Add the receiver's name, company and at least an email address or telephone number.");
    if (receiver.name.length > 180 || receiver.company.length > 180 || receiver.email.length > 254 || receiver.telephone.length > 60) throw new Error("Use up to 180 characters for name/company, 254 for email and 60 for telephone.");
    if (receiver.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(receiver.email)) throw new Error("Enter a valid receiver email address.");
  }
  return {
    issuer_person_id:issuer.id, issuer_name:issuer.name, issuer_contact_snapshot:snapshot(issuer),
    receiver_kind:kind, receiver_source:source, receiver_person_id:personId, receiver_supplier_contact_id:contactId,
    receiver_name:receiver.name, receiver_contact_snapshot:receiver
  };
}
