import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { renderPowraReport } from "../lib/powra-report.mjs";

test("POWRA PDF uses landscape A4 and paginates long control text",async()=>{
  const item={powra_reference:"POWRA-DEMO",task:"Test fieldwork",decision:"stop_work",status:"closed",
    hazards:[{name:"Changed condition",control:"Detailed control measure. ".repeat(480),remaining_risk:"high",verified:false,changed:true}],
    end_review:{outcome:"stopped",stop_event:{previous_decision:"safe_to_start"}}};
  const pdf=await PDFDocument.load(await renderPowraReport(item,{assessmentReference:"RA-DEMO"}));
  assert.equal(pdf.getTitle(),"POWRA POWRA-DEMO");
  assert.ok(pdf.getPageCount()>3);
  for(const page of pdf.getPages()) assert.deepEqual(page.getSize(),{width:841.89,height:595.28});
});
