"use client";

import { useActionState, useState } from "react";
import { completeAssetWorkOrder } from "../company/assets/actions";
import { CALIBRATION_RESULTS } from "../../../lib/asset-catalog";
import { RecordIcon } from "../../../components/DocumentRecordTabs";
import styles from "./asset-management.module.css";

export default function CompleteWorkOrder({ assetId, order, today, calibrationCriteria }) {
  const [state, action, pending] = useActionState(completeAssetWorkOrder.bind(null, assetId, order.id), {});
  const [fields, setFields] = useState({
    completed_date: today,
    performed_by: "",
    work_completed: "",
    evidence_reference: order.evidence_reference || "",
    calibration_result: "not_assessed",
    calibration_acceptance_criteria: order.calibration_acceptance_criteria || calibrationCriteria || "",
    calibration_next_due_date: "",
  });
  const entry = name => ({
    name, value: fields[name],
    onChange: event => setFields(current => ({ ...current, [name]: event.target.value })),
  });

  return <details className={styles.completeWork} id="complete-work-order">
    <summary><RecordIcon name="checkCircle"/> Complete work order</summary>
    <form action={action} aria-label={"Complete " + order.maintenance_reference}>
      <fieldset disabled={pending}>
        <legend>Complete {order.maintenance_reference}</legend>
        <label>Completion date<input {...entry("completed_date")} type="date" max={today} required/></label>
        <label>Performed by<input {...entry("performed_by")} maxLength={180} required/></label>
        <label>Work completed and outcome<textarea {...entry("work_completed")} rows={3} maxLength={2000} required/></label>
        {order.maintenance_type === "calibration" && <>
          <label>Calibration result<select {...entry("calibration_result")}>
            {CALIBRATION_RESULTS.map(([key, title]) => <option key={key} value={key}>{title}</option>)}
          </select></label>
          <label>Acceptance criteria / decision rule<input {...entry("calibration_acceptance_criteria")} maxLength={2000}/></label>
          <label>Next calibration due<input {...entry("calibration_next_due_date")} type="date"/></label>
        </>}
        <label>Evidence reference<input {...entry("evidence_reference")} maxLength={500}/></label>
        {!order.hasEvidence && <label>Evidence file (optional, up to 4 MB)
          <input type="file" name="evidence_file" accept=".pdf,.png,.jpg,.jpeg,.txt,.csv,.doc,.docx,.xls,.xlsx"/>
        </label>}
        <p>Closing the order records the outcome here. Asset schedules and operational status are managed from the asset record.</p>
        {state.error && <p role="alert" className={styles.completeError}>{state.error}</p>}
        <button type="submit">{pending ? "Closing work order…" : "Save and close work order"}</button>
      </fieldset>
    </form>
  </details>;
}
