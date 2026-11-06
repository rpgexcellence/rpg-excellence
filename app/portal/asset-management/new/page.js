import AssetWorkspace from "../AssetWorkspace";
export const metadata = { title: "Create New Asset | RPG Excellence" };
export default async function Page({ searchParams }) { return <AssetWorkspace mode="new" searchParams={await searchParams} />; }
