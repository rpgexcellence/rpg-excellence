"use client";

import { useState } from "react";

export default function ManualNonconformityForm({ action, suppliers = [], initialSupplierId = "" }) {
  const [source, setSource] = useState(initialSupplierId ? "supplier" : "operations");
  return <form className="ncrManualForm" action={action}>
    <label>NC classification *<select name="finding_type" required defaultValue="minor_nc"><option value="minor_nc">Minor NC</option><option value="major_nc">Major NC</option></select></label>
    <label>Source *<select name="source_category" required value={source} onChange={(event) => setSource(event.target.value)}><option value="operations">Operational activity</option><option value="supplier">Supplier issue</option><option value="customer_complaint">Customer complaint</option><option value="product_service">Product or service failure</option><option value="process_monitoring">Process monitoring / KPI</option><option value="incident">Incident or near miss</option><option value="management_review">Management review</option><option value="external_audit">External audit</option><option value="other">Other source</option></select></label>
    {source === "supplier" ? <label className="wide supplierSelector">Supplier from approved register *<select name="supplier_id" required defaultValue={initialSupplierId}><option value="">Select supplier</option>{suppliers.map((supplier) => <option value={supplier.id} key={supplier.id}>{supplier.legal_name} · {supplier.supplier_reference} · {String(supplier.approval_status || "draft").replaceAll("_", " ")}</option>)}</select><small>The NC and any linked CAPA–8D will remain visible against this supplier’s live assurance record.</small></label> : <input type="hidden" name="supplier_id" value=""/>}
    <label className="wide">NC title *<input name="title" required maxLength="220"/></label>
    <label>Source reference<input name="source_reference" placeholder="Complaint, PO, delivery, incident or record reference"/></label>
    <label>Date detected *<input name="detected_at" type="date" required defaultValue={new Date().toISOString().slice(0,10)}/></label>
    <label className="wide">Requirement / criteria *<textarea name="criteria" required placeholder="Applicable standard clause, procedure, contract, specification or legal requirement"/></label>
    <label className="wide">Objective evidence *<textarea name="objective_evidence" required placeholder="What was examined, observed, measured or confirmed?"/></label>
    <label className="wide">Statement of nonconformity *<textarea name="failure_statement" required placeholder="State clearly how the evidence demonstrates failure to meet the requirement."/></label>
    <label>Process / location<input name="process_area"/></label>
    <label>Risk level *<select name="risk_level" required defaultValue="medium"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
    <label>Responsible owner<input name="responsible_owner_name"/></label><label>Owner email<input name="responsible_owner_email" type="email"/></label>
    <label>Target response date<input name="agreed_date" type="date"/></label><label>Evidence attachment<input name="evidence_file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.docx,.xlsx"/></label>
    <div className="wide"><button className="ncrSubmit">Create Controlled NC</button></div>
  </form>;
}
