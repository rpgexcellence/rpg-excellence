"use client";

import { toRiskCsv } from "../../../lib/isms-risk-assurance.mjs";
import { RecordIcon } from "../../../components/DocumentRecordTabs";
import s from "./asset-management.module.css";

export default function ExportAssets({ rows }) {
  function download() {
    const headings = ["Asset number", "Name", "Serial", "Location", "Accountable owner", "Criticality", "Operational status", "Next PPM"];
    const csv = toRiskCsv([headings, ...rows]);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "asset-register.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <button type="button" className={s.assetButton} disabled={!rows.length} onClick={download}><RecordIcon name="download"/> Export filtered CSV</button>;
}
