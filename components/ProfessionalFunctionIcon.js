const common = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function Person({ x = 18 }) {
  return <><circle {...common} cx={x} cy="11" r="4"/><path {...common} d={`M${x-7} 28v-5c0-5 2.5-8 7-8s7 3 7 8v5M${x} 19v11`}/></>;
}

export default function ProfessionalFunctionIcon({ type, label, size = 62 }) {
  return <svg viewBox="0 0 64 48" width={size} height={Math.round(size * .75)} role="img" aria-label={`${label || type} icon`}>
    {type === "company_administrator" && <><Person/><circle {...common} cx="45" cy="27" r="8"/><path {...common} d="M45 15v4M45 35v4M33 27h4M53 27h4M37 19l3 3M50 32l3 3M53 19l-3 3M40 32l-3 3"/></>}
    {type === "lead_auditor" && <><Person x={16}/><rect {...common} x="31" y="8" width="23" height="31" rx="2"/><path {...common} d="M37 17h11M37 23h8M37 29h10"/><path {...common} d="m45 5 2 4 5 .7-3.5 3.4.8 4.9-4.3-2.3-4.3 2.3.8-4.9L38 9.7 43 9z"/></>}
    {type === "auditor" && <><Person x={15}/><rect {...common} x="29" y="6" width="22" height="31" rx="2"/><path {...common} d="m34 15 2 2 4-5M42 16h5M34 24l2 2 4-5M42 25h5"/><circle {...common} cx="49" cy="34" r="7"/><path {...common} d="m54 39 5 5"/></>}
    {type === "supplier_auditor" && <><Person x={12}/><path {...common} d="M26 37V19l10 5v-5l10 5V12h10v25M25 37h34M33 30h4M43 30h4M51 30h4"/><path {...common} d="m8 37 4 4 8-9"/></>}
    {type === "risk_assessor" && <><Person x={13}/><path {...common} d="M31 7h25v32H31zM31 18h25M31 29h25M39 7v32M48 7v32"/><path {...common} d="m34 34 5-5 6 3 8-10"/></>}
    {type === "bcp_leader" && <><Person x={31}/><path {...common} d="M14 21A18 18 0 0 1 45 10l5 5M50 8v7h-7M50 27A18 18 0 0 1 19 38l-5-5M14 40v-7h7"/></>}
    {type === "incident_controller" && <><Person x={14}/><rect {...common} x="28" y="19" width="30" height="20" rx="2"/><path {...common} d="M35 33v-5M43 33V24M51 33v-9M31 13h24M36 13c0-6 3-9 7-9s7 3 7 9"/></>}
    {type === "capa_owner" && <><Person x={14}/><rect {...common} x="29" y="6" width="21" height="31" rx="2"/><path {...common} d="m34 15 2 2 4-5M42 16h5M34 24l2 2 4-5M42 25h5"/><path {...common} d="m47 37 8 8M52 33l5 5-5 5-5-5z"/></>}
    {type === "effectiveness_verifier" && <><Person x={13}/><circle {...common} cx="42" cy="23" r="12"/><path {...common} d="m51 32 8 8M35 23l5 5 9-11"/></>}
    {type === "document_controller" && <><Person x={13}/><path {...common} d="M29 9h20l7 7v27H29zM49 9v8h7M35 24h15M35 30h15M35 36h10"/><path {...common} d="M24 13h-4v27h5"/></>}
    {type === "approver" && <><Person x={14}/><circle {...common} cx="44" cy="25" r="14"/><path {...common} d="m35 25 6 6 12-14M39 39l-2 6 7-3 7 3-2-6"/></>}
    {type === "viewer" && <><Person x={13}/><path {...common} d="M27 25s8-12 18-12 18 12 18 12-8 12-18 12-18-12-18-12z"/><circle {...common} cx="45" cy="25" r="5"/></>}
    {!['company_administrator','lead_auditor','auditor','supplier_auditor','risk_assessor','bcp_leader','incident_controller','capa_owner','effectiveness_verifier','document_controller','approver','viewer'].includes(type) && <><Person x={22}/><path {...common} d="m36 28 6 6 13-16"/></>}
  </svg>;
}

