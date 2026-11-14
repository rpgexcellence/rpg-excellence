"use client";
import styles from "./terms.module.css";
export default function PrintTermsButton(){
 return <button type="button" className={styles.print} onClick={()=>window.print()}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 8V3h10v5M7 17H4V9h16v8h-3M7 14h10v7H7z"/><path d="M16 11h1"/></svg>Print or save as PDF</button>;
}
