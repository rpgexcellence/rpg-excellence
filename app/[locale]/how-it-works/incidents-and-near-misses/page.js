import { notFound } from "next/navigation";
import { locales } from "../../../../lib/i18n";
import SafeOperationsPage from "../SafeOperationsPage";
import { safeOperationsWorkflows } from "../safeOperationsWorkflows";

const workflow = safeOperationsWorkflows.incidents;

export const metadata = {
  title: `${workflow.title} walkthrough`,
  description: workflow.description,
  alternates: { canonical: `/en/how-it-works/${workflow.slug}` },
};

export default async function Page({ params }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  return <SafeOperationsPage locale={locale} workflow={workflow} />;
}
