import AssetWorkspace from "../AssetWorkspace";
export const metadata = { title: "Asset Register | RPG Excellence" };
export default async function Page({ searchParams }) { return <AssetWorkspace mode="register" searchParams={await searchParams} />; }
