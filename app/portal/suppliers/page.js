import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import SupplierAssuranceWorkspace from "../../../components/SupplierAssuranceWorkspace";
import { saveSupplier, generateSupplierCodeOfConduct } from "./actions";

export const metadata = { title: "Supplier Assurance Hub | RPG Excellence" };
export const dynamic = "force-dynamic";

export default async function SuppliersPage({ searchParams }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/suppliers");
  const { data: organization, error: organizationError } = await supabase.from("organizations").select("id,name,industry,country").eq("owner_id", user.id).order("created_at").limit(1).maybeSingle();
  if (organizationError) throw new Error(organizationError.message);
  let suppliers = [], selected = null, documents = [];
  if (organization) {
    const { data, error } = await supabase.from("suppliers").select("*").eq("organization_id", organization.id).eq("owner_id", user.id).order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    suppliers = data || [];
    if (params?.id) selected = suppliers.find((item) => item.id === params.id) || null;
    else if (params?.new !== "1") selected = suppliers[0] || null;
    if (selected) {
      const { data: docs, error: docsError } = await supabase.from("supplier_code_of_conduct_documents").select("id,document_reference,version,status,generated_at,review_date").eq("supplier_id", selected.id).eq("owner_id", user.id).order("version", { ascending: false });
      if (docsError) throw new Error(docsError.message);
      documents = docs || [];
    }
  }
  return <SupplierAssuranceWorkspace organization={organization} suppliers={suppliers} initial={params?.new === "1" ? null : selected} documents={documents} action={saveSupplier} generateAction={generateSupplierCodeOfConduct} saved={params?.saved === "1"} />;
}
