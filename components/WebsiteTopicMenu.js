"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import styles from "./WebsiteTopicMenu.module.css";

export default function WebsiteTopicMenu({ locale, title, groups, mobile = false, wide = false, footer }) {
  const ref = useRef(null);
  useEffect(() => {
    const closeOutside = event => {
      if (ref.current?.open && !ref.current.contains(event.target)) ref.current.open = false;
    };
    const escape = event => {
      if (event.key === "Escape" && ref.current?.open) {
        ref.current.open = false;
        ref.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  const closeMenu = () => {
    if (!ref.current) return;
    ref.current.open = false;
    const outer = ref.current.closest(".mobileNav");
    if (outer) outer.open = false;
  };
  const href = path => path.startsWith("/portal") ? path : `/${locale}${path}`;
  return <details ref={ref} className={`${styles.root} ${mobile ? styles.mobile : ""} ${wide ? styles.wide : ""}`}>
    <summary>{title}<span aria-hidden="true">⌄</span></summary>
    <div className={styles.panel} aria-label={`${title} topics`}>
      <div className={styles.columns}>{groups.map(group => <section key={group.title}>
        <h2>{group.title}</h2>{group.caption && <p>{group.caption}</p>}
        <ul>{group.links.map(([label, path]) => <li key={label}><Link href={href(path)} onClick={closeMenu}>{label}<span aria-hidden="true">→</span></Link></li>)}</ul>
      </section>)}</div>
      {footer && <Link className={styles.footer} href={href(footer[1])} onClick={closeMenu}>{footer[0]} <span aria-hidden="true">→</span></Link>}
    </div>
  </details>;
}
