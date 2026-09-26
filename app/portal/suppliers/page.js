import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import SupplierAssuranceWorkspace from "../../../components/SupplierAssuranceWorkspace";
import {
  saveSupplier,
  generateSupplierCodeOfConduct,
} from "./actions";

export const metadata = {
  title: "Supplier Assurance Hub | RPG Excellence",
};

export const dynamic = "force-dynamic";

export default async function SuppliersPage({ searchParams }) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/portal/login?next=/portal/suppliers");
  }

  const {
    data: organization,
    error: organizationError,
  } = await supabase
    .from("organizations")
    .select("id,name,industry,country")
    .eq("owner_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (organizationError) {
    throw new Error(organizationError.message);
  }

  let suppliers = [];
  let selected = null;
  let documents = [];
  let approvers = [];
  let evidenceFiles = [];
  let subTierSuppliers = [];
  let supplierSites = [];

  if (organization) {
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("organization_id", organization.id)
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    suppliers = data || [];

    const { data: authorisedApprovers = [] } = await supabase
      .from("organization_person_authorizations")
      .select("person_id")
      .eq("organization_id", organization.id)
      .eq("function_key", "approver")
      .eq("status", "authorised");
    const approverIds = (authorisedApprovers || []).map((item) => item.person_id);
    if (approverIds.length) {
      const { data: people = [] } = await supabase
        .from("organization_people")
        .select("id,first_name,last_name,email,position,account_status")
        .eq("organization_id", organization.id)
        .in("id", approverIds)
        .in("account_status", ["active", "invited"])
        .order("last_name");
      approvers = people || [];
    }

    if (params?.id) {
      selected =
        suppliers.find((item) => item.id === params.id) ||
        null;
    } else if (params?.new !== "1") {
      selected = suppliers[0] || null;
    }

    if (selected) {
      const {
        data: docs,
        error: docsError,
      } = await supabase
        .from("supplier_code_of_conduct_documents")
        .select(
          "id,document_reference,version,status,generated_at,review_date"
        )
        .eq("supplier_id", selected.id)
        .eq("owner_id", user.id)
        .order("version", { ascending: false });

      if (docsError) {
        throw new Error(docsError.message);
      }

      documents = docs || [];

      const [{ data: evidence = [] }, { data: subtiers = [] }, { data: sites = [] }] = await Promise.all([
        supabase.from("supplier_evidence_files").select("id,control_id,file_name,storage_path,uploaded_at").eq("supplier_id", selected.id).order("uploaded_at", { ascending: false }),
        supabase.from("supplier_subtier_suppliers").select("*").eq("supplier_id", selected.id).order("created_at"),
        supabase.from("supplier_sites").select("*").eq("supplier_id", selected.id).order("created_at"),
      ]);
      evidenceFiles = await Promise.all((evidence || []).map(async (file) => {
        const { data: signed } = await supabase.storage.from("supplier-assurance-evidence").createSignedUrl(file.storage_path, 3600);
        return { ...file, download_url: signed?.signedUrl || "#" };
      }));
      subTierSuppliers = await Promise.all((subtiers || []).map(async (supplier) => {
        if (!supplier.certificate_storage_path) return { ...supplier, client_key: supplier.id };
        const { data: signed } = await supabase.storage.from("supplier-assurance-evidence").createSignedUrl(supplier.certificate_storage_path, 3600);
        return { ...supplier, client_key: supplier.id, certificate_url: signed?.signedUrl || "#" };
      }));
      supplierSites = (sites || []).map((site) => ({ ...site, client_key: site.id }));
    }
  }

  return (
    <SupplierAssuranceWorkspace
      organization={organization}
      suppliers={suppliers}
      initial={params?.new === "1" ? null : selected}
      documents={documents}
      approvers={approvers}
      evidenceFiles={evidenceFiles}
      subTierSuppliers={subTierSuppliers}
      supplierSites={supplierSites}
      action={saveSupplier}
      generateAction={generateSupplierCodeOfConduct}
      saved={params?.saved === "1"}
    />
  );
}
