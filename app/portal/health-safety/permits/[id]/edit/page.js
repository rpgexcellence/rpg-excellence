import NewPermitPage from "../../new/page";
export const dynamic="force-dynamic";
export default async function EditPermitPage({params}) {const {id}=await params;return <NewPermitPage permitId={id}/>;}
