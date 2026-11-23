import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { closureLabels, decisionDetails, powraDate, powraDecision, powraStatus, powraTime } from "./powra-workflow.mjs";

const pageWidth = 841.89;
const pageHeight = 595.28;
const margin = 28;
const width = pageWidth - 2 * margin;
const bottom = 44;
const fontSize = 9;
const lineHeight = 12;
const padding = 6;
const colours = {
  navy:rgb(.025,.11,.23), blue:rgb(.08,.34,.84), ink:rgb(.07,.14,.23), grey:rgb(.31,.39,.48),
  pale:rgb(.94,.97,.985), line:rgb(.76,.82,.87), white:rgb(1,1,1),
  safe:rgb(.87,.95,.91), controls:rgb(.99,.94,.79), review:rgb(.91,.93,.98), stop:rgb(.99,.9,.89), neutral:rgb(.93,.95,.97),
};
const answerLabels = { yes:"Yes", no:"No", na:"Not applicable" };
const risks = { low:["Low","safe"], medium:["Medium","controls"], high:["High","stop"] };
const list = value => Array.isArray(value) ? value : [];

function printable(value,font) {
  return Array.from(String(value ?? "").trim() || "Not recorded", character => {
    if (/\s/.test(character)) return " ";
    try { font.encodeText(character); return character; }
    catch { return "?"; }
  }).join("").replace(/ +/g," ");
}

function wrap(value,font,size,maxWidth) {
  const lines = [];
  let line = "";
  for (const word of printable(value,font).split(" ")) {
    const next = line ? line+" "+word : word;
    if (font.widthOfTextAtSize(next,size)<=maxWidth) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = "";
    for (const character of word) {
      if (font.widthOfTextAtSize(line+character,size)>maxWidth) {
        lines.push(line);
        line = "";
      }
      line += character;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function renderPowraReport(item,{assessmentReference}={}) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ref = printable(item.powra_reference,bold);
  const status = powraStatus(item);
  const [decision,tone] = decisionDetails[powraDecision(item)];
  const review = item.end_review ?? {};
  const work = review.point_of_work ?? {};

  pdf.setTitle("POWRA "+ref);
  pdf.setAuthor("RPG Excellence");
  pdf.setSubject("Point of work risk assessment record");

  let page, y;
  function newPage() {
    page = pdf.addPage([pageWidth,pageHeight]);
    page.drawRectangle({x:0,y:pageHeight-7,width:pageWidth,height:7,color:colours.blue});
    page.drawText("RPG EXCELLENCE",{x:margin,y:pageHeight-24,size:8,font:bold,color:colours.blue});
    page.drawText("POINT OF WORK RISK ASSESSMENT",{x:margin+83,y:pageHeight-24,size:8,font:bold,color:colours.navy});
    const header = wrap(ref,bold,8,205)[0];
    page.drawText(header,{x:pageWidth-margin-bold.widthOfTextAtSize(header,8),y:pageHeight-24,size:8,font:bold,color:colours.grey});
    y = pageHeight-39;
  }

  function section(label) {
    y -= 6;
    page.drawRectangle({x:margin,y:y-21,width,height:21,color:colours.navy});
    page.drawText(label.toUpperCase(),{x:margin+8,y:y-14,size:9,font:bold,color:colours.white});
    y -= 25;
  }

  function table(label, widths, headings, rows) {
    function draw(cells, offset, count, height) {
      let x = margin;
      for (const [index,cell] of cells.entries()) {
        const cellWidth = widths[index];
        page.drawRectangle({x,y:y-height,width:cellWidth,height,color:colours[cell.fill||"white"],borderColor:colours.line,borderWidth:.6});
        cell.lines.slice(offset,offset+count).forEach(([text,font,size,colour],n) => {
          page.drawText(text,{x:x+padding,y:y-padding-fontSize-n*lineHeight,size,font,color:colours[colour]});
        });
        x += cellWidth;
      }
      y -= height;
    }
    function format(row) {
      return row.map((value,index)=>{
        const cell = value && typeof value==="object" ? value : {value};
        const font = cell.bold ? bold : regular;
        const lines = wrap(cell.value,font,fontSize,widths[index]-2*padding)
          .map(text=>[text,font,fontSize,"ink"]);
        if (cell.label) lines.unshift([cell.label.toUpperCase(),bold,7,"grey"]);
        return {...cell,lines};
      });
    }
    const header = headings?.length ? format(headings.map(value=>({value,bold:true,fill:"pale"}))) : [];
    const headerLines = header.length ? Math.max(...header.map(cell=>cell.lines.length)) : 0;
    const headerHeight = headerLines ? padding*2+lineHeight*headerLines : 0;
    function tableHeader() {
      section(label);
      if (header.length) draw(header,0,headerLines,headerHeight);
    }
    const first = format(rows[0]);
    const minimum = Math.min(3,Math.max(...first.map(cell=>cell.lines.length)));
    if (y - 31 - headerHeight - padding*2 - minimum*lineHeight < bottom) newPage();
    tableHeader();
    for (const row of rows) {
      const cells = format(row);
      const maxLines = Math.max(...cells.map(cell=>cell.lines.length));
      let offset = 0;
      while (offset < maxLines) {
        let count = Math.floor((y-bottom-padding*2)/lineHeight);
        if (count<Math.min(2,maxLines-offset)) {
          newPage();
          tableHeader();
          count = Math.floor((y-bottom-padding*2)/lineHeight);
        }
        count = Math.min(count,maxLines-offset);
        draw(cells,offset,count,padding*2+count*lineHeight);
        offset += count;
      }
    }
  }

  const four = Array(4).fill(width/4);
  const details = entries => entries.map(([label,value,fill="pale"])=>({label,value,fill,bold:true}));
  const fact = (label,value) => [{value:label,bold:true,fill:"pale"},value];

  newPage();
  page.drawText("POINT OF WORK RISK ASSESSMENT",{x:margin,y:y-18,size:19,font:bold,color:colours.navy});
  y -= 29;
  table("Assessment and decision",four,null,[
    details([["Reference",ref],["Task / activity",item.task],["Recorded decision",decision,tone],["Record status",status]]),
    details([["Location",item.site_location],["Work area / zone",item.work_area],["Assessment date",powraDate(item.assessment_date)],["Recorded at",powraTime(item.created_at)]]),
    details([["Assessor",item.completed_by],["Team",item.team_members],["Supervisor",item.supervisor_name],["Supervisor review",powraTime(item.supervisor_approved_at)]]),
    [{value:"Decision notes",bold:true,fill:"pale"},item.decision_reason,{value:"Closure outcome",bold:true,fill:"pale"},closureLabels[review.outcome]],
  ]);
  table("Linked safety records",[width*.23,width*.77],null,[
    fact("Risk assessment",assessmentReference || (item.linked_assessment_id ? "Linked in POWRA record" : null)),
    fact("Permit to work",item.linked_permit_reference),
    fact("Workplace inspection",work.inspection_reference),
  ]);

  const checks = list(item.prestart_checks);
  table("Pre-start checks",[width*.78,width*.22],["Check","Recorded answer"],checks.length
    ? checks.map(row=>[{value:row.question}, {value:answerLabels[row.answer],bold:true,fill:row.answer==="yes"?"safe":row.answer==="no"?"stop":"neutral"}])
    : [["No pre-start checks recorded.",null]]);

  const hazards = list(item.hazards);
  table("Hazards and controls",[width*.25,width*.42,width*.13,width*.2],
    ["Hazard / change","Control measures","Remaining risk","Verification"],hazards.length
      ? hazards.map((hazard,index)=>{
        const risk = Object.hasOwn(risks,hazard.remaining_risk) ? risks[hazard.remaining_risk] : ["Not recorded","neutral"];
        return [{value:`${index+1}. ${hazard.name || "Hazard not recorded"}${hazard.changed ? " - New or significantly changed" : ""}`,bold:true},
          hazard.control,{value:risk[0],fill:risk[1],bold:true},
          hazard.verified===true ? "Control verified" : hazard.verified===false ? "Verification outstanding" : null];
      })
      : [[work.no_additional_hazards ? "No additional hazards identified." : "No hazards recorded.",null,null,null]]);

  table("Verification and close-out",[width*.23,width*.77],null,[
    fact("Conditions changed",answerLabels[review.conditions_changed]),fact("New hazards identified",answerLabels[review.new_hazards]),
    fact("Controls effective",answerLabels[review.controls_effective]),fact("Incident or near miss",answerLabels[review.incident]),
    fact("Closure outcome",closureLabels[review.outcome]),fact("Closed at",powraTime(item.closed_at)),
    fact("Closure notes",review.comments),fact("Follow-up action",review.follow_up),
    fact("Evidence reference",review.evidence_reference),fact("Incident reference",review.incident_reference),
  ]);
  if (review.stop_event) {
    table("Decision history",[width*.23,width*.77],null,[
      fact("Initial decision",decisionDetails[review.stop_event.previous_decision]?.[0]),
      fact("Initial decision notes",review.stop_event.previous_reason),fact("Stop Work recorded",powraTime(review.stop_event.at)),
    ]);
  }

  const pages = pdf.getPages();
  for (const [index,sheet] of pages.entries()) {
    sheet.drawLine({start:{x:margin,y:31},end:{x:pageWidth-margin,y:31},thickness:.6,color:colours.line});
    sheet.drawText("POWRA RECORD | "+wrap(ref,regular,7,175)[0],{x:margin,y:18,size:7,font:regular,color:colours.grey});
    const caption = "Record snapshot. Refer to the online record for the latest status.";
    sheet.drawText(caption,{x:(pageWidth-regular.widthOfTextAtSize(caption,7))/2,y:18,size:7,font:regular,color:colours.grey});
    const number = `Page ${index+1} of ${pages.length}`;
    sheet.drawText(number,{x:pageWidth-margin-regular.widthOfTextAtSize(number,7),y:18,size:7,font:regular,color:colours.grey});
  }
  return pdf.save();
}
