"use client";

import { useAuditSupplierLink } from "./AuditSupplierLinkProvider";

const TYPE_LABELS = {
  internal_system: "Internal system audit",
  internal_process: "Internal process audit",
  internal_compliance: "Internal compliance audit",
  supplier: "Supplier audit",
  second_party: "Second-party audit",
  follow_up: "Follow-up audit",
  integrated: "Integrated audit",
};

export default function AuditTypeSupplierSelector() {
  const { approvedSuppliers, auditType, setAuditType, supplierId, setSupplierId, supplierAudit } = useAuditSupplierLink();

  return (
    <>
      <label className="iaField">
        <span>Audit type *</span>
        <select
          name="audit_type"
          value={auditType}
          onChange={(event) => {
            const value = event.target.value;
            setAuditType(value);
            if (value !== "supplier") setSupplierId("");
          }}
        >
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>

      {supplierAudit ? (
        <label className="iaField iaSupplierAuditSelector">
          <span>Approved supplier *</span>
          <select
            name="supplier_id"
            required
            value={supplierId}
            onChange={(event) => setSupplierId(event.target.value)}
          >
            <option value="">Select from approved supplier register</option>
            {approvedSuppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.legal_name} · {supplier.supplier_reference}
              </option>
            ))}
          </select>
          <small>
            The audit and any resulting findings will remain linked to this supplier’s assurance record.
          </small>
          {!approvedSuppliers.length ? (
            <strong>No approved suppliers are available. Approve a supplier in Supplier Assurance first.</strong>
          ) : null}
        </label>
      ) : (
        <input type="hidden" name="supplier_id" value="" />
      )}
    </>
  );
}
