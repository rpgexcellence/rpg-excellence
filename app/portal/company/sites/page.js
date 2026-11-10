import { redirect } from "next/navigation";
import { locationSetupPath } from "../../../../lib/company-setup.mjs";
export default async function SitesRedirect({ searchParams }) { redirect(locationSetupPath(await searchParams)); }
