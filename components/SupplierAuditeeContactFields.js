"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuditSupplierLink } from "./AuditSupplierLinkProvider";

export default function SupplierAuditeeContactFields({ companyPeople = [] }) {
  const { approvedSuppliers, supplierAudit, supplierId } = useAuditSupplierLink();
  const supplier = useMemo(
    () => approvedSuppliers.find((item) => item.id === supplierId) || null,
    [approvedSuppliers, supplierId],
  );
  const contacts = supplier?.contacts || [];
  const [contactId, setContactId] = useState("");

  useEffect(() => {
    const primary = contacts.find((contact) => contact.is_primary) || contacts[0] || null;
    setContactId(primary?.id || "");
  }, [supplierId]);

  const contact = contacts.find((item) => item.id === contactId) || null;

  if (!supplierAudit) {
    return (
      <>
        <label className="iaField"><span>Primary auditee contact *</span><select name="auditee_contact_person_id" required defaultValue=""><option value="">Select active Company User</option>{companyPeople.map((person)=><option key={person.id} value={person.id}>{[person.first_name,person.last_name].filter(Boolean).join(" ")} · {person.position || person.email}</option>)}</select><small>Linked to Administration → People, Roles &amp; Access.</small></label>
      </>
    );
  }

  return (
    <>
      <label className="iaField iaSupplierContactField">
        <span>Primary auditee contact *</span>
        <select name="supplier_contact_id" required value={contactId} onChange={(event) => setContactId(event.target.value)}>
          <option value="">Select supplier contact</option>
          {contacts.map((item) => (
            <option value={item.id} key={item.id}>
              {item.first_name} {item.last_name || ""} · {item.business_title || item.department || "Supplier contact"}
            </option>
          ))}
        </select>
        {!contacts.length ? <small>Add an active contact in Supplier Assurance → Contact details first.</small> : null}
      </label>
      <label className="iaField iaSupplierContactField">
        <span>Auditee email *</span>
        <input name="auditee_contact_email" type="email" value={contact?.email || ""} readOnly required />
        <input name="auditee_contact_name" type="hidden" value={contact ? `${contact.first_name} ${contact.last_name || ""}`.trim() : ""} />
        <small>Automatically linked to the selected approved supplier contact.</small>
      </label>
    </>
  );
}
