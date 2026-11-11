import Link from "next/link";
import styles from "./CompanySetupNav.module.css";
export default function CompanySetupNav({ section = "details" }) {
  return <nav className={styles.tabs} aria-label="Company setup">
    {[["details", "/portal/company/setup", "Company details"], ["locations", "/portal/company/setup?section=locations", "Locations, buildings & zones"], ["departments", "/portal/company/setup?section=departments", "Departments"], ["people", "/portal/company/setup?section=people", "People & access"]].map(([key, href, label]) => <Link key={key} href={href} aria-current={section === key ? "page" : undefined}>{label}</Link>)}
  </nav>;
}
