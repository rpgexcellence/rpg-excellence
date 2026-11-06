import AssetWorkspace from "../AssetWorkspace";
export const metadata = { title: "Maintenance & PPM | RPG Excellence" };
export default async function Page({ searchParams }) { return <AssetWorkspace mode="maintenance" searchParams={await searchParams} />; }
