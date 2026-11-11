import NonconformityRegister from "../page";
export const dynamic = "force-dynamic";
export default async function FindingRecordPage({params,searchParams}) {
  const {id}=await params;
  const query=await searchParams;
  return <NonconformityRegister searchParams={{...query,record:id}} pageMode="record" />;
}
