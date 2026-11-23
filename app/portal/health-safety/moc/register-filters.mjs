export const statusLabels = {
  draft:"Draft", screening_complete:"Screening complete", returned:"Returned", hse_gate:"At H&S gate",
  risk_review:"Risk review", approval:"Awaiting approval", approved:"Approved", implementation:"Implementation",
  verification:"Verification", closed:"Closed", rejected:"Rejected", cancelled:"Cancelled",
};
export const stages = [
  ["initiate","Initiate & screen","blue","clipboard",["draft","screening_complete","returned"]],
  ["gate","H&S gate","amber","scope",["hse_gate"]],
  ["risk","Risk review","blue","scope",["risk_review"]],
  ["approvals","Approval","blue","person",["approval","approved"]],
  ["implement","Implement","green","play",["implementation"]],
  ["verify","Verify","violet","scope",["verification"]],
  ["closed","Close","closed","checkCircle",["closed"]],
];

export const views = [
  ["all","All changes","blue","clipboard"],
  ["active","In progress","green","play"],
  ["gate","At H&S gate","amber","scope"],
  ["approval","Awaiting approval","blue","distribution"],
  ["overdue","Overdue","red","alert"],
  ["closed","Closed","closed","checkCircle"],
];

const terminal = new Set(["closed","cancelled","rejected"]);
export const active = row => !terminal.has(row.status);
export const overdue = (row,today) => active(row) && Boolean(row.target_date && row.target_date < today);
export const areas = row => [...new Set([row.location,row.affected_area,row.department].filter(Boolean))];
export const filterValues = {type:row=>[row.change_type], pathway:row=>[row.pathway], area:areas, status:row=>[row.status]};
export const emptyFilters = {type:[],pathway:[],area:[],status:[]};
export const words = value => String(value || "").replaceAll("_"," ").replace(/\b\w/g,letter=>letter.toUpperCase());
export const optionLabel = (key,value) => key==="status" ? statusLabels[value] || words(value) : key==="area" ? value : words(value);

export function inView(row,view,today) {
  switch (view) {
    case "all": return true;
    case "active": return active(row);
    case "overdue": return overdue(row,today);
    case "approval": return row.status==="approval";
    default: return stages.find(([key])=>key===view)?.[4].includes(row.status) ?? false;
  }
}

export function filteredChanges(rows, {view, today, search, filters}) {
  const term = search.trim().toLowerCase();
  return rows.filter(row => inView(row,view,today) &&
    Object.entries(filterValues).every(([key,values])=>!filters[key].length || values(row).some(value=>filters[key].includes(value))) &&
    (!term || [row.moc_reference,row.title,...areas(row),row.asset?.asset_reference,row.asset?.asset_name,words(row.change_type)]
      .join(" ").toLowerCase().includes(term)));
}
