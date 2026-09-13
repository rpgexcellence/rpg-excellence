"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { label: "Overview", href: "/portal/health-safety", icon: "⌂", exact: true },
  { label: "Risk Assessments", href: "/portal/health-safety/risk-assessment", icon: "▣" },
  { label: "POWRA", href: "/portal/health-safety/powra", icon: "⚑" },
  { label: "Permit to Work", href: "/portal/health-safety/permits", icon: "◆" },
  { label: "Actions & Verification", href: "/portal/health-safety/actions", icon: "✓" },
  { label: "Training Academy", href: "/portal/health-safety/training", icon: "◇" },
  { label: "Management Board", href: "/portal/health-safety/management-board", icon: "▥" },
  { label: "New Assessment", href: "/portal/health-safety/risk-assessment/new", icon: "+" },
];

function isCurrent(pathname, item) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export default function HealthSafetySectionShell({ children }) {
  const pathname = usePathname();

  // The Hub overview already contains its full navigation shell.
  if (pathname === "/portal/health-safety") return children;

  return (
    <div className="hssLayout">
      <style>{`
        *{box-sizing:border-box}
        .hssLayout{min-height:100vh;display:grid;grid-template-columns:238px minmax(0,1fr);background:#edf3fa;color:#071d3a;font-family:Arial,sans-serif}
        .hssSide{position:sticky;top:0;display:flex;flex-direction:column;height:100vh;padding:28px 20px 22px;background:linear-gradient(180deg,#06264d,#071c38);color:#d6e4f1}
        .hssBrand{margin:0 10px 8px;color:#fff;font-size:25px;font-weight:950;letter-spacing:0;text-decoration:none}
        .hssBrand span{display:block;color:#61dbc0}
        .hssSection{margin:0 10px 26px;color:#83a2c2;font-size:10px;font-weight:900;letter-spacing:.14em}
        .hssNav{display:grid;gap:7px}
        .hssNav a{display:flex;align-items:center;gap:12px;min-height:44px;padding:12px 14px;border-radius:9px;color:#c9d9e8;text-decoration:none;font-size:13px;font-weight:800;transition:background .15s ease,color .15s ease}
        .hssNav a:hover{background:#124b82;color:#fff}
        .hssNav a.active{background:#1762a3;color:#fff;box-shadow:inset 3px 0 #55ded2}
        .hssNav i{display:grid;place-items:center;width:20px;height:20px;border:1px solid #6c8baa;border-radius:5px;color:#8fe4d5;font-size:11px;font-style:normal;font-weight:900}
        .hssNav a.active i{border-color:#55ded2;background:#55ded2;color:#06264d}
        .hssSideFoot{margin-top:auto;padding:18px;border:1px solid #ffffff1d;border-radius:14px;background:#ffffff09;color:#9fe3d5;font-size:12px;font-weight:850;line-height:1.45}
        .hssMain{min-width:0;min-height:100vh;background:#edf3fa}
        .hssMobile{display:none}
        @media(max-width:1050px){
          .hssLayout{grid-template-columns:78px minmax(0,1fr)}
          .hssSide{padding:24px 10px}
          .hssBrand{margin:0 0 8px;text-align:center;font-size:0}
          .hssBrand:first-letter{font-size:24px}
          .hssSection,.hssSideFoot{display:none}
          .hssNav a{justify-content:center;padding:12px;font-size:0}
          .hssNav i{width:27px;height:27px;font-size:12px}
        }
        @media(max-width:700px){
          .hssLayout{display:block;padding-bottom:58px}
          .hssSide{display:none}
          .hssMobile{position:fixed;right:0;bottom:0;left:0;z-index:100;display:grid;grid-template-columns:repeat(6,1fr);padding:7px 5px;background:#06264d;box-shadow:0 -5px 20px #061a3530}
          .hssMobile a{display:grid;place-items:center;min-height:43px;padding:4px 2px;border-radius:7px;color:#c9d9e8;text-decoration:none;font-size:9px;font-weight:800;text-align:center}
          .hssMobile a.active{background:#1762a3;color:#fff}
          .hssMobile a:nth-last-child(-n+2){display:none}
        }
      `}</style>

      <aside className="hssSide">
        <Link className="hssBrand" href="/portal/health-safety">
          RPG <span>EXCELLENCE</span>
        </Link>
        <div className="hssSection">H&amp;S CONTROL CENTRE</div>
        <nav className="hssNav" aria-label="Health and Safety Hub">
          {navigation.map((item) => (
            <Link
              className={isCurrent(pathname, item) ? "active" : ""}
              href={item.href}
              key={item.href}
            >
              <i aria-hidden="true">{item.icon}</i>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hssSideFoot">
          Safer people.<br />
          Stronger businesses.
        </div>
      </aside>

      <div className="hssMain">{children}</div>

      <nav className="hssMobile" aria-label="Health and Safety Hub mobile navigation">
        {navigation.map((item) => (
          <Link
            className={isCurrent(pathname, item) ? "active" : ""}
            href={item.href}
            key={item.href}
          >
            {item.label.replace(" & Verification", "")}
          </Link>
        ))}
      </nav>
    </div>
  );
}
