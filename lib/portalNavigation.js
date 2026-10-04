// Shared across every portal workspace. Keep routes and view names in one place.
const item = (label, href) => ({ label, href });
export const PORTAL_NAVIGATION = [
  { id:"dashboard", label:"Dashboard", href:"/portal", exact:true },
  { id:"assessments", label:"Assessments", href:"/portal/history", matches:["/portal/assessments"], children:[item("Gap Analysis Register","/portal/history"),item("Gap Analysis Board","/portal/history?view=management-board"),item("In Progress","/portal/history?view=in-progress"),item("Completed","/portal/history?view=completed"),item("Archived","/portal/history?view=archived")] },
  { id:"audits", label:"Internal Audits", href:"/portal/internal-audits", matches:["/portal/internal-audit","/portal/internal-audit-programme","/portal/internal-audit-fmea-planning","/portal/internal-auditor-verification"], children:[item("Audit Command Centre","/portal/internal-audits"),item("Internal Audit Hub","/portal/internal-audit"),item("3-Year Audit Programme","/portal/internal-audit-programme"),item("FMEA Risk Planning","/portal/internal-audit-fmea-planning"),item("Auditor Verification","/portal/internal-auditor-verification"),item("Audit Training","/portal/internal-audit/training")] },
  { id:"findings", label:"Findings & Actions", href:"/portal/internal-audit-actions", children:[item("NC Register","/portal/internal-audit-actions"),item("NC Management Board","/portal/internal-audit-actions?view=management")] },
  { id:"capa", label:"CAPA-8D", href:"/portal/rca", expanded:true, children:[item("CAPA-8D Register","/portal/rca"),item("Management Board","/portal/rca?view=management-board"),item("Open Cases","/portal/rca?view=open"),item("Awaiting Verification","/portal/rca?view=verification"),item("Closed Cases","/portal/rca?view=closed"),item("RCA–8D Training","/portal/rca/training")] },
  { id:"health", label:"Health & Safety Hub", href:"/portal/health-safety", expanded:true, children:[item("H&S Dashboard","/portal/health-safety"),item("Risk Assessments","/portal/health-safety/risk-assessment"),item("Create Risk Assessment","/portal/health-safety/risk-assessment/new"),item("POWRA","/portal/health-safety/powra"),item("Permit to Work","/portal/health-safety/permits"),item("Management of Change","/portal/health-safety/moc"),item("Actions & Verification","/portal/health-safety/actions"),item("Management Board","/portal/health-safety/management-board"),item("Training Academy","/portal/health-safety/training"),item("My Certificates","/portal/health-safety/training/certificates")] },
  { id:"bcp", label:"Business Continuity", href:"/portal/business-continuity", expanded:true, children:[item("BCP Dashboard","/portal/business-continuity"),item("Site Profile","/portal/business-continuity/site-profile"),item("Learning Path","/portal/business-continuity/training"),item("Context & Interested Parties","/portal/business-continuity/context"),item("Roles & Responsibilities","/portal/business-continuity/roles"),item("Hazard Scenarios","/portal/business-continuity/hazard-scenarios"),item("Business Impact Analysis","/portal/business-continuity/bia"),item("Outsourced Processes","/portal/business-continuity/outsourced-processes"),item("Strategies & Solutions","/portal/business-continuity/strategies-solutions"),item("Incident Management","/portal/business-continuity/incident-management"),item("BCP Plan","/portal/business-continuity/plans"),item("ISO 22301 Assessment","/portal?standard=ISO%2022301%3A2019#new-assessment")] },
  { id:"evidence", label:"Evidence", href:"/portal/documents", children:[item("Document Library","/portal/documents"),...[["ISO 9001","ISO 9001:2015/Amd 1:2024"],["ISO 14001","ISO 14001:2026"],["ISO 45001","ISO 45001:2018"],["ISO 22301","ISO 22301:2019"],["ISO/IEC 27001","ISO/IEC 27001:2022"],["ISO/IEC 17024","ISO/IEC 17024:2026"],["RCA–CAPA","RCA & CAPA"],["Internal Audit","Internal Audit"]].map(([label,family])=>item(label,`/portal/documents?family=${encodeURIComponent(family)}`))] },
  { id:"reports", label:"Reports", href:"/portal/reports" },
  { id:"isms", label:"Information Security", href:"/portal/information-security", matches:["/portal/soa"], children:[item("ISMS Dashboard","/portal/information-security"),item("Risk Management","/portal/information-security/risk-management"),item("Statement of Applicability","/portal/soa"),item("Management Board","/portal/soa/management-board"),item("Executive Report","/portal/soa/management-board/executive-report")] },
  { id:"suppliers", label:"Supplier Assurance", href:"/portal/suppliers", children:[item("Supplier Register","/portal/suppliers"),item("Management Board","/portal/suppliers?view=board"),item("New Supplier","/portal/suppliers?new=1")] },
  { id:"people", label:"People, Roles & Access", href:"/portal/company/people", matches:["/portal/company"] },
];
const under = (path,base) => path===base || path.startsWith(`${base}/`);
export function portalGroupActive(group,path) {
  if (/^\/portal\/assessments\/[^/]+\/soa(?:\/|$)/.test(path)) return group.id === "isms";
  return group.exact ? path===group.href : [group.href,...(group.matches||[])].some((base)=>under(path,base)); }
export function portalActiveChild(group,path,search="") {
  if(group.id === "isms" && /^\/portal\/assessments\/[^/]+\/soa(?:\/|$)/.test(path))return "/portal/soa";
  const current=new URLSearchParams(search);
  const matches=(group.children||[]).filter((entry)=>{
    const url=new URL(entry.href,"https://portal.invalid");
    if(!under(path,url.pathname))return false;
    for(const [key,value] of url.searchParams)if(current.get(key)!==value)return false;
    // The register is the default view; query view/family links take precedence.
    if(!url.search && ((path==="/portal/history"||path==="/portal/rca"||path==="/portal/internal-audit-actions") && current.has("view") && !["register","all"].includes(current.get("view"))))return false;
    if(!url.search && path==="/portal/documents" && current.has("family"))return false;
    return true;
  });
  return matches.sort((a,b)=>{const au=new URL(a.href,"https://portal.invalid"),bu=new URL(b.href,"https://portal.invalid");return bu.pathname.length-au.pathname.length || Number(Boolean(bu.search))-Number(Boolean(au.search));})[0]?.href || null;
}
export function portalStandalone(path) {
  return ["/portal/login","/portal/forgot-password","/portal/reset-password","/portal/update-password","/portal/signup","/portal/register"].some((base)=>under(path,base)) || /\/(print|pdf)(\/|$)/.test(path);
}
