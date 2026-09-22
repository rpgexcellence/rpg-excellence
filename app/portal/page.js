import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import {
  getUserSubscription,
  getPlanLabel,
  hasActiveSubscription,
  hasPlanAccess,
  getAvailableAssessmentPasses,
  getAvailableStandaloneSoaPasses,
} from "../../lib/subscription";
import {
  createOrganization,
  createAssessment,
  createStandaloneSoa,
} from "./actions";
import { calculateSimpleOverallScore } from "./assessments/[id]/scoring";

export const metadata = { title: "RPG Intelligence Dashboard" };

const assessmentStandards = [
  ["ISO 9001:2015/Amd 1:2024", "ISO 9001 — Quality Management"],
  ["ISO 14001:2026", "ISO 14001 — Environmental Management"],
  [
    "ISO 45001:2018",
    "ISO 45001:2018/Amd 1:2024 — Occupational Health & Safety",
  ],
  [
    "ISO/IEC 27001:2022",
    "ISO/IEC 27001:2022/Amd 1:2024 — Information Security",
  ],
  ["ISO/IEC 17024:2026", "ISO/IEC 17024 — Certification of Persons"],
  ["ISO 22301:2019", "ISO 22301:2019 — Business Continuity Management"],
];
const label = (value) =>
  String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
const date = (value) =>
  value
    ? new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "—";
const maturity = (score) =>
  score === null
    ? "Not assessed"
    : score <= 20
      ? "Initial"
      : score <= 40
        ? "Developing"
        : score <= 60
          ? "Managed"
          : score <= 80
            ? "Controlled"
            : "Optimised";

function SideLink({ href, children, active = false }) {
  return (
    <Link href={href} className={active ? "pdSideLink active" : "pdSideLink"}>
      <i />
      {children}
    </Link>
  );
}
function Metric({ label: title, value, detail, tone = "blue", href }) {
  const body = (
    <>
      <span>{title}</span>
      <strong className={tone}>{value}</strong>
      <small>{detail}</small>
    </>
  );
  return href ? (
    <Link href={href} className="pdMetric">
      {body}
    </Link>
  ) : (
    <div className="pdMetric">{body}</div>
  );
}

export default async function PortalPage({ searchParams }) {
  const query = await searchParams;
  const requestedStandard = assessmentStandards.some(
    ([value]) => value === query?.standard,
  )
    ? query.standard
    : "";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");
