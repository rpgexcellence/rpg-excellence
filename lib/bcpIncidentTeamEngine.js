export const TEAM_AUTHORITIES = [
  ["activate", "Activate the incident response", "activate the approved incident response when the defined activation criteria are met"],
  ["protect", "Protect life / evacuate / lockdown", "order immediate protective measures, evacuation or lockdown under the applicable local emergency arrangements"],
  ["escalate", "Escalate to the coordination centre", "escalate the incident and request activation of the emergency response coordination centre"],
  ["suspend", "Suspend affected operations", "suspend unsafe or affected operations and secure the area"],
  ["resources", "Deploy available resources", "deploy available personnel and approved response resources within delegated limits"],
  ["spend", "Authorise emergency expenditure", "authorise emergency expenditure within documented financial delegation and escalate requests exceeding that limit"],
  ["statements", "Approve stakeholder statements", "approve verified stakeholder statements within the agreed communications authority"],
  ["recovery", "Authorise recovery / handback", "authorise recovery and operational handback only after the defined criteria and required approvals are satisfied"],
];
export const TEAM_RESPONSIBILITIES = [
  ["life", "Protect people and welfare", "protect people, account for personnel and coordinate welfare support"],
  ["environment", "Protect the environment", "coordinate containment and measures to prevent environmental harm"],
  ["stabilise", "Stabilise and contain the incident", "stabilise and contain the incident using the approved scenario response controls"],
  ["coordinate", "Coordinate the response", "coordinate response teams, dependencies and supporting resources"],
  ["reports", "Provide verified situation reports", "provide verified situation reports to the incident controller and coordination centre"],
  ["communications", "Communicate with stakeholders", "coordinate timely employee, customer and other stakeholder communications using primary and fallback channels"],
  ["technical", "Restore systems and processes", "restore priority systems and processes in the sequence agreed with the incident controller"],
  ["suppliers", "Coordinate suppliers and support", "coordinate approved suppliers, technical support and alternative resources"],
  ["review", "Capture lessons and improvements", "capture lessons, outstanding actions and recommendations for the post-incident review"],
];
export const TEAM_PROCEDURE_STEPS = [
  ["verify", "Receive and verify the alert", "Receive the alert, verify the available facts and compare them with the selected scenario activation thresholds."],
  ["command", "Confirm command and activate the team", "Confirm the incident controller, activate the team and record the command location and contact arrangements."],
  ["objectives", "Set objectives and assign actions", "Set immediate response objectives, assign named owners and record priorities in the Incident Action Plan."],
  ["protect", "Apply immediate protective controls", "Apply the linked scenario's protective controls and use the local emergency arrangements for urgent assistance."],
  ["reports", "Issue situation reports", "Issue verified situation reports at the agreed frequency and whenever the incident materially changes."],
  ["channels", "Use primary and fallback communications", "Use the approved warning and communication controls; switch to the documented fallback channel if the primary channel fails."],
  ["records", "Maintain the decision and action log", "Record decisions, actions, owners, times, communications and evidence in the incident decision and action log."],
  ["escalation", "Escalate beyond delegated limits", "Escalate decisions outside delegated authority, resource constraints and worsening conditions to the incident controller or coordination centre."],
  ["recovery", "Confirm recovery and handback", "Confirm recovery and operational handback against the agreed acceptance criteria before resuming affected operations."],
  ["standdown", "Stand down and review", "Stand down through the approved closure process, account for released resources and contribute to the post-incident review."],
];
const texts = (keys, catalogue) => (Array.isArray(keys) ? keys : []).map((key) => catalogue.find((item) => item[0] === key)?.[2]).filter(Boolean);
const clean = (value) => String(value || "").trim();
export function buildIncidentTeam(team, { people = [], siteName = "", scenarios = [] } = {}) {
  const personName = (id, fallback) => { const person = people.find((item) => item.id === id); return person ? `${person.first_name || ""} ${person.last_name || ""}`.trim() : clean(fallback) || "the appointed person"; };
  const authorities = [...texts(team.authoritySelections, TEAM_AUTHORITIES), clean(team.customAuthority)].filter(Boolean);
  const responsibilities = [...texts(team.responsibilitySelections, TEAM_RESPONSIBILITIES), clean(team.customResponsibilities)].filter(Boolean);
  if (team.procedureMode !== "automatic") return { ...team, authority: Array.isArray(team.authoritySelections) ? authorities.join("; ") : team.authority, responsibilities: Array.isArray(team.responsibilitySelections) ? responsibilities.join("; ") : team.responsibilities };
  const procedures = texts(team.procedureSelections, TEAM_PROCEDURE_STEPS);
  const name = clean(team.name) || "Response team", lead = personName(team.leadPersonId, team.lead), deputy = personName(team.alternatePersonId, team.alternate);
  const parts = [`${name}${siteName ? ` at ${siteName}` : ""} is led by ${lead}. ${deputy} acts as deputy when the leader is unavailable.`, authorities.length ? `Decision authority: the team leader may ${authorities.join("; ")}.` : "Decision authority: select the applicable delegated authorities before approval.", responsibilities.length ? `Responsibilities: the team shall ${responsibilities.join("; ")}.` : "Responsibilities: select the applicable responsibilities before approval."];
  const members = (Array.isArray(team.additionalMembers) ? team.additionalMembers : []).filter((member) => clean(member.name));
  if (members.length) parts.push(`Additional team members: ${members.map((member) => `${clean(member.name)}${clean(member.role) ? ` — ${clean(member.role)}` : ""}${clean(member.organisation) ? ` (${clean(member.organisation)})` : ""}`).join("; ")}. Coordinate their assigned duties through the team leader.`);
  if (scenarios.length) parts.push(`Applicable response scenarios: ${[...new Set(scenarios.map((row) => clean(row.scenario || row.name)).filter(Boolean))].join("; ")}. Apply the activation criteria and immediate controls recorded for each scenario.`);
  parts.push("Controlled response procedure:", ...procedures.map((text, index) => `${index + 1}. ${text}`));
  if (clean(team.procedureNotes)) parts.push(`Local instructions: ${clean(team.procedureNotes)}`);
  return { ...team, authority: authorities.join("; "), responsibilities: responsibilities.join("; "), procedure: parts.join("\n\n"), procedureEngineVersion: 1 };
}
export function initialiseIncidentTeam(team) {
  return { ...team, additionalMembers: Array.isArray(team.additionalMembers) ? team.additionalMembers : [], procedureMode: team.procedureMode || (clean(team.procedure) ? "custom" : "automatic"), authoritySelections: Array.isArray(team.authoritySelections) ? team.authoritySelections : [], responsibilitySelections: Array.isArray(team.responsibilitySelections) ? team.responsibilitySelections : [], procedureSelections: Array.isArray(team.procedureSelections) ? team.procedureSelections : ["verify", "command", "objectives", "reports", "records", "escalation"], customAuthority: team.customAuthority ?? (team.authoritySelections ? "" : clean(team.authority)), customResponsibilities: team.customResponsibilities ?? (team.responsibilitySelections ? "" : clean(team.responsibilities)) };
}
