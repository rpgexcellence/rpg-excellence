import { redirect } from "next/navigation";
export default async function LegacyCompanyAssets({ searchParams }) {
 const query = await searchParams;
 redirect(`/portal/asset-management/register${query?.edit ? `?edit=${encodeURIComponent(query.edit)}` : ""}`);
}
