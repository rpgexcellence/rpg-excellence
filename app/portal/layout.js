import PortalQuickNav from "./PortalQuickNav";

export default function PortalLayout({ children }) {
  return (
    <>
      {children}
      <PortalQuickNav />
      <style>{`
        .rpgQuickNav{
          position:fixed;right:22px;bottom:22px;z-index:9998;
          display:flex;align-items:center;gap:4px;min-height:52px;
          padding:6px;border:1px solid #2f5d91;
          border-radius:13px;background:#082a54;color:#fff!important;
          box-shadow:0 12px 30px #071d3a40;font-family:Arial,sans-serif;
        }
        .rpgQuickNav a{padding:10px 11px;border-radius:8px;color:#d7e5f4;text-decoration:none;font-size:12px;font-weight:800;white-space:nowrap}
        .rpgQuickNav a:hover{background:#174e86;color:#fff}.rpgQuickNav a:focus-visible{outline:3px solid #5dd8e5;outline-offset:2px}
        .rpgQuickNav .home{display:grid;gap:1px;margin-left:3px;padding:8px 12px;background:#1762ef;color:#fff}
        .rpgQuickNav .home strong{font-size:12px;line-height:1.2}.rpgQuickNav .home small{font-size:10px;line-height:1.2;color:#dbe8ff}
        @media(max-width:680px){
          .rpgQuickNav{left:8px;right:8px;bottom:8px;overflow-x:auto;justify-content:flex-start}
          .rpgQuickNav a{padding:9px 10px}.rpgQuickNav .home{margin-left:auto}
        }
        @media print{.rpgQuickNav{display:none!important}}
      `}</style>
    </>
  );
}
