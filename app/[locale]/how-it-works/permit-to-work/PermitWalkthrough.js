import WorkflowSteps from "../WorkflowSteps";

const imageDirectory = "/how-it-works/permit-to-work";
const draftAuthorisation = {
  src: `${imageDirectory}/draft-authorisation-and-validity.png`,
  width: 1318,
  height: 248,
  title: "Authorisation and validity",
  alt: "RPG draft fields for validity, issuer and receiver, with entries removed.",
  caption: "Actual draft form showing where the validity window and roles are set.",
};

const stages = [
  {
    title: "Define the work",
    status: "Draft",
    role: "Permit preparer",
    text: "Set the task and scope limits. Select the controlled Site Profile, work area and asset, identify the work party and link the approved CNC risk assessment.",
    action: "Submit for verification",
    detail: "Record the hazards, required precautions, validity window and permit roles before progressing the draft.",
    screenshot: {
      src: `${imageDirectory}/define-controlled-work.png`,
      width: 1318,
      height: 633,
      title: "Define the controlled work",
      alt: "RPG scope form with Electrical work selected and CNC risk assessment RA-2026-0002 linked.",
      caption: "Actual draft form showing the work scope and risk assessment link.",
    },
    event: "Draft submitted for verification",
  },
  {
    title: "Verify the controls",
    status: "Awaiting verification",
    role: "Permit verifier",
    text: "Open Safety controls to check the evidence for the electrical permit. Record the applicable isolation and its independent verification.",
    action: "Complete verification",
    detail: "If the required isolation record is missing, verification cannot be completed. The permit remains awaiting verification.",
    blocker: "Show the missing isolation example",
    feedback: "Verification is blocked in this example. The required isolation record is missing from Safety controls.",
    resolve: "Switch to the example with verified isolation",
    evidence: ["Required isolation record", "Recorded and independently verified", "Missing"],
    screenshot: {
      src: `${imageDirectory}/draft-hazards-and-controls.png`,
      width: 1310,
      height: 285,
      title: "Identify hazards and controls",
      alt: "Actual RPG draft form listing hazards including electricity and stored energy.",
      caption: "Actual draft hazard section. The verifier reviews isolation evidence separately in Safety controls.",
    },
    event: "Verification completed",
  },
  {
    title: "Accept control of work",
    status: "Awaiting acceptance",
    role: "Permit receiver",
    text: "The nominated receiver reviews the scope and conditions and records acceptance of control of the work.",
    action: "Accept control of work",
    detail: "Acceptance is recorded at this stage. The permit still shows Awaiting acceptance until the issuer issues it.",
    screenshot: draftAuthorisation,
    event: "Receiver accepted control of work",
  },
  {
    title: "Issue the permit",
    status: "Awaiting acceptance",
    role: "Permit issuer",
    text: "The issuer checks readiness. RPG checks the receiver’s declaration, the validity window and the evidence required for this type of permit.",
    action: "Issue permit",
    detail: "The record moves to Issued when the required checks pass.",
    screenshot: draftAuthorisation,
    event: "Permit issued",
  },
  {
    title: "Declare work complete",
    status: "Issued",
    role: "Permit receiver",
    text: "The receiver records that the defined work is complete and submits the permit for hand-back.",
    action: "Declare work complete",
    detail: "An issued permit also has separate Suspend permit and Start handover actions. This example follows the planned completion path.",
    evidence: ["Completion confirmation", "Defined work complete. Record ready for hand-back."],
    event: "Work declared complete",
  },
  {
    title: "Accept hand-back",
    status: "Awaiting hand-back",
    role: "Permit issuer",
    text: "Review the hand-back and confirm reinstatement. Where an isolation record exists, RPG checks that reinstatement and its independent verification are recorded before closure.",
    action: "Accept hand-back and close",
    detail: "If the required reinstatement evidence is incomplete, the permit remains awaiting hand-back.",
    blocker: "Show the incomplete reinstatement example",
    feedback: "Close-out is blocked in this example. The isolation still needs a recorded reinstatement and independent verification.",
    resolve: "Switch to the example with verified reinstatement",
    evidence: ["Reinstatement evidence", "Reinstatement recorded and independently verified", "Independent verification outstanding"],
    event: "Hand-back accepted and permit closed",
  },
  {
    title: "Review the audit trail",
    status: "Closed",
    role: "Authorised reviewer",
    text: "Review the sequence of decisions. The live record logs when each action happened, who performed it and the reason where one was recorded.",
  },
];

export default function PermitWalkthrough() {
  return <WorkflowSteps
    title="Walk through a permit"
    intro="Follow a fictional CNC permit. Stages 1–4 include screenshots of the RPG draft form. Completion, hand-back and the audit trail use example records."
    stageLabel="Permit stages"
    stages={stages}
  />;
}
