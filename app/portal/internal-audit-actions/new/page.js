import NonconformityRegister from "../page";
export const dynamic = "force-dynamic";
export default function NewFindingPage({searchParams}) {
  return <NonconformityRegister searchParams={searchParams} pageMode="new" />;
}
