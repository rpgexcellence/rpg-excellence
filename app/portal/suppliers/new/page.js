import SuppliersPage from "../page";
export const dynamic="force-dynamic";
export default async function SupplierPage({params,searchParams}) {
 const query=await searchParams;
 return <SuppliersPage searchParams={{...query,new:"1",id:undefined}}/>;
}
