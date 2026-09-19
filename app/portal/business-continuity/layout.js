import Link from "next/link";

export default function BusinessContinuityLayout({ children }) {
  return (
    <>
      {children}
      <Link className="bcpProductReturn" href="/portal">
        <b>RPG Excellence</b>
        <span>Product Dashboard</span>
      </Link>
      <style>{`.bcpProductReturn{position:fixed;right:18px;bottom:18px;z-index:80;display:grid;gap:1px;padding:10px 13px;border:3px solid #09294f;border-radius:10px;background:#2e5be2;color:#fff;text-decoration:none;box-shadow:0 8px 22px #08294f40;font:700 11px Arial,sans-serif}.bcpProductReturn b{font-size:11px}.bcpProductReturn span{font-size:9px}@media(max-width:700px){.bcpProductReturn{right:10px;bottom:10px;padding:8px 10px}}`}</style>
    </>
  );
}
