import Link from "next/link";

export default function PortalLayout({ children }) {
  return (
    <>
      {children}
      <Link
        href="/portal"
        aria-label="Return to RPG Excellence product dashboard"
        className="rpgGlobalDashboardLink"
      >
        <span aria-hidden="true">⌂</span>
        <span><strong>RPG Excellence</strong><small>Product Dashboard</small></span>
      </Link>
      <style>{`
        .rpgGlobalDashboardLink{
          position:fixed;right:22px;bottom:22px;z-index:9998;
          display:flex;align-items:center;gap:10px;min-height:52px;
          padding:9px 15px 9px 11px;border:1px solid #2f5d91;
          border-radius:13px;background:#082a54;color:#fff!important;
          text-decoration:none!important;box-shadow:0 12px 30px #071d3a40;
          font-family:Arial,sans-serif;transition:transform .15s ease,box-shadow .15s ease;
        }
        .rpgGlobalDashboardLink:hover{transform:translateY(-2px);box-shadow:0 16px 34px #071d3a50}
        .rpgGlobalDashboardLink:focus-visible{outline:3px solid #5dd8e5;outline-offset:3px}
        .rpgGlobalDashboardLink>span:first-child{
          display:grid;place-items:center;width:33px;height:33px;border-radius:9px;
          background:#1762ef;font-size:21px;font-weight:900;line-height:1;
        }
        .rpgGlobalDashboardLink>span:last-child{display:grid;gap:1px}
        .rpgGlobalDashboardLink strong{font-size:13px;line-height:1.2}
        .rpgGlobalDashboardLink small{font-size:11px;line-height:1.2;color:#bcd0e5}
        body:has(.pdPage) .rpgGlobalDashboardLink{display:none}
        @media(max-width:680px){
          .rpgGlobalDashboardLink{right:12px;bottom:12px;min-height:46px;padding:7px 11px 7px 8px}
          .rpgGlobalDashboardLink>span:first-child{width:31px;height:31px}
        }
        @media print{.rpgGlobalDashboardLink{display:none!important}}
      `}</style>
    </>
  );
}
