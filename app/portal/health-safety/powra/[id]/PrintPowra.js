"use client";

import styles from "../powra.module.css";
export default function PrintPowra() {
  return <button type="button" className={styles.button} onClick={() => window.print()}>Print record</button>;
}
