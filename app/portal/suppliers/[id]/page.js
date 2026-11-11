import SuppliersPage from "../page";
export const dynamic="force-dynamic";
export default async function SupplierPage({params,searchParams}) {
 const query=await searchParams;
 const {id}=await params;
 return <SuppliersPage searchParams={{...query,id}}/>;
}
