export const BUSINESS_PLANS = [
  { id: "team", name: "Team", users: 5, monthlyPence: 7900, label: "01 / SMALL TEAMS", description: "Start with a controlled company workspace.", features: ["One organisation workspace", "Connected audit, risk and CAPA workflows", "Documents, roles and independent approvals", "Incident reporting and investigations", "Inspections, assets, BCP and SoA tools", "Email support; setup scope agreed upfront"] },
  { id: "business", name: "Business", users: 20, monthlyPence: 24900, label: "02 / GROWING ORGANISATIONS", description: "Bring departments and action owners together.", features: ["Everything in Team", "20 named users in one workspace", "Roles and independent approvals included", "Management visibility across departments", "Guided onboarding scope agreed upfront", "Support arrangements stated in your quote"] },
  { id: "scale", name: "Scale", users: 50, monthlyPence: 49900, label: "03 / WIDER TEAMS", description: "Extend consistent assurance across your business.", features: ["Everything in Business", "A larger licence for wider participation", "The same core governance across every band", "Controlled API access by agreement", "Implementation planning with RPG", "Onboarding scope agreed in your quote"] },
];

export const USER_BANDS = [
  { id: "team", label: "1–5 users" },
  { id: "business", label: "6–20 users" },
  { id: "scale", label: "21–50 users" },
  { id: "enterprise", label: "51+ users / multiple organisations" },
];

export const TRAINING_COURSES = [
  { product: "risk-assessment-initial", title: "Risk Assessment Training", cover: "Assess the risk. Choose the control.", label: "FOUNDATION", price: "£19.99", detail: "Interactive initial course with practical scenarios, final assessment and a verifiable certificate.", image: "/pricing/assess.webp", path: "hs-hub/training#initial-course" },
  { product: "risk-assessment-refresher", title: "Risk Assessment Refresher", cover: "Refresh your judgement.", label: "REFRESHER", price: "£12.99", detail: "Focused refresher covering risk evaluation, controls, recording and review.", image: "/pricing/record.webp", path: "hs-hub/training#refresher-course" },
  { product: "internal-auditor-refresher", title: "Internal Auditor Refresher", cover: "Follow the evidence.", label: "REFRESHER", price: "£19.99", detail: "Evidence-led audit judgement, findings, follow-up and effectiveness verification.", image: "/pricing/review.webp", path: "internal-audit-training" },
  { product: "rca-8d-practitioner", title: "RCA & Corrective Action Practitioner", cover: "Find the cause. Verify the change.", label: "PRACTITIONER", price: "£49.99", detail: "180-minute structured RCA–8D course with a downloadable workbook and certificate.", image: "/pricing/inspect.webp", path: "rca-8d-training" },
];

export function formatPrice(pence) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: pence % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(pence / 100);
}

// Future VAT is an illustration only. This module does not create checkout
// sessions, change Stripe prices or activate tax collection.
export function businessPrice(plan, billing = "monthly") {
  const annual = billing === "annual";
  const billedPence = annual ? plan.monthlyPence * 12 : plan.monthlyPence;
  return { annual, billedPence, monthlyEquivalentPence: annual ? Math.round(billedPence / 12) : billedPence, futureVatInclusivePence: Math.round(billedPence * 1.2) };
}

export function licenceEnquiryHref(locale, name, billing = "monthly", bandId = "business") {
  const band = USER_BANDS.find(item => item.id === bandId) || USER_BANDS[1];
  const query = new URLSearchParams({
    topic: "Pricing and subscription",
    message: `I would like to discuss ${name}.\nNamed-user band: ${band.label}.\nBilling preference: ${billing === "annual" ? "Annual" : "Monthly"}.\nPlease confirm the licence scope, total price, onboarding and applicable tax treatment.`,
  });
  return `/${locale}/contact?${query}`;
}
