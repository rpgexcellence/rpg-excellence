"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PermitValidityRefresh({ checkedAt, boundaries }) {
  const router = useRouter();
  useEffect(() => {
    const next = Math.min(...boundaries.map(value => Date.parse(value)).filter(value => value > checkedAt));
    const delay = Number.isFinite(next) ? Math.min(next - checkedAt + 100, 60000) : 60000;
    const refresh = () => { if (document.visibilityState === "visible") router.refresh(); };
    const timer = setInterval(refresh, delay);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [boundaries, checkedAt, router]);
  return null;
}
