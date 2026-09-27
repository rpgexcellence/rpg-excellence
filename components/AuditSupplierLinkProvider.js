"use client";

import { createContext, useContext, useState } from "react";

const AuditSupplierLinkContext = createContext(null);

export function useAuditSupplierLink() {
  const value = useContext(AuditSupplierLinkContext);
  if (!value) throw new Error("Audit supplier fields must be inside AuditSupplierLinkProvider.");
  return value;
}

export default function AuditSupplierLinkProvider({
  approvedSuppliers = [],
  initialSupplierId = "",
  children,
}) {
  const [auditType, setAuditType] = useState(initialSupplierId ? "supplier" : "internal_system");
  const [supplierId, setSupplierId] = useState(initialSupplierId);

  return (
    <AuditSupplierLinkContext.Provider value={{
      approvedSuppliers,
      auditType,
      setAuditType,
      supplierId,
      setSupplierId,
      supplierAudit: auditType === "supplier",
    }}>
      {children}
    </AuditSupplierLinkContext.Provider>
  );
}
