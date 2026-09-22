import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createClient } from "../../../../../../lib/supabase/server";
import { SUPPLIER_STANDARDS } from "../../../../../../lib/supplier-assurance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE = { width: 595.28, height: 841.89, margin: 42 };

const C = {
  navy: rgb(0.025, 0.12, 0.25),
  blue: rgb(0.12, 0.34, 0.84),
  teal: rgb(0.08, 0.67, 0.61),
  ink: rgb(0.08, 0.16, 0.25),
  grey: rgb(0.37, 0.45, 0.54),
  pale: rgb(0.95, 0.97, 0.99),
  line: rgb(0.78, 0.83, 0.88),
  white: rgb(1, 1, 1),
};

const clean = (value, fallback = "Not recorded") =>
  String(value ?? fallback)
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim() || fallback;

const date = (value) =>
  value
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
      }).format(new Date(value))
    : "Not recorded";

export async function GET(request, { params }) {
  const { id } = await params;
  const documentId = new URL(request.url).searchParams.get("document");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorised", { status: 401 });
  }

  let query = supabase
    .from("supplier_code_of_conduct_documents")
    .select("*")
    .eq("supplier_id", id)
    .eq("owner_id", user.id);

  if (documentId) {
    query = query.eq("id", documentId);
  }

  const { data: document, error } = await query
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  if (!document) {
    return new Response("Supplier Code of Conduct not found", {
      status: 404,
    });
  }

  const supplier = document.supplier_snapshot || {};
  const organization = document.organization_snapshot || {};
  const pdf = await PDFDocument.create();

  pdf.setTitle(
    `${clean(document.document_reference)} - Supplier Code of Conduct`,
  );
  pdf.setAuthor("RPG Excellence");
  pdf.setSubject(
    `Controlled supplier requirements for ${clean(supplier.legalName)}`,
  );

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const width = PAGE.width - PAGE.margin * 2;

  let page;
  let y;

  const wrap = (
    value,
    font = regular,
    size = 9,
    maxWidth = width,
  ) => {
    const lines = [];
    let line = "";

    for (const word of clean(value).split(" ")) {
      const next = line ? `${line} ${word}` : word;

      if (font.widthOfTextAtSize(next, size) <= maxWidth) {
        line = next;
      } else {
        if (line) lines.push(line);
        line = word;
      }
    }

    if (line) lines.push(line);
    return lines;
  };

  const newPage = () => {
    page = pdf.addPage([PAGE.width, PAGE.height]);

    page.drawRectangle({
      x: 0,
      y: PAGE.height - 8,
      width: PAGE.width * 0.76,
      height: 8,
      color: C.navy,
    });

    page.drawRectangle({
      x: PAGE.width * 0.76,
      y: PAGE.height - 8,
      width: PAGE.width * 0.24,
      height: 8,
      color: C.teal,
    });

    page.drawText("RPG EXCELLENCE", {
      x: PAGE.margin,
      y: PAGE.height - 28,
      size: 9,
      font: bold,
      color: C.blue,
    });

    page.drawText("SUPPLIER CODE OF CONDUCT", {
      x: PAGE.margin + 93,
      y: PAGE.height - 28,
      size: 8,
      font: bold,
      color: C.navy,
    });

    page.drawText(clean(document.document_reference), {
      x: PAGE.width - PAGE.margin - 125,
      y: PAGE.height - 28,
      size: 7,
      font: bold,
      color: C.grey,
    });

    y = PAGE.height - 48;
  };

  const ensure = (height = 50) => {
    if (y - height < 52) newPage();
  };

  const lineText = (value, options = {}) => {
    const font = options.bold ? bold : regular;
    const size = options.size || 9;
    const colour = options.colour || C.ink;
    const indent = options.indent || 0;
    const leading = options.leading || size + 3;
    const lines = wrap(value, font, size, width - indent);

    ensure(lines.length * leading + 5);

    lines.forEach((line) => {
      page.drawText(line, {
        x: PAGE.margin + indent,
        y,
        size,
        font,
        color: colour,
      });
      y -= leading;
    });

    y -= options.after ?? 3;
  };

  const labelValue = (label, value, x, top, cellWidth) => {
    page.drawRectangle({
      x,
      y: top - 50,
      width: cellWidth,
      height: 50,
      color: C.pale,
      borderColor: C.line,
      borderWidth: 0.6,
    });

    page.drawText(clean(label).toUpperCase(), {
      x: x + 8,
      y: top - 12,
      size: 6,
      font: bold,
      color: C.blue,
    });

    wrap(value, bold, 8, cellWidth - 16)
      .slice(0, 3)
      .forEach((text, index) =>
        page.drawText(text, {
          x: x + 8,
          y: top - 26 - index * 10,
          size: 8,
          font: bold,
          color: C.ink,
        }),
      );
  };

  newPage();
  y -= 28;

  page.drawText("SUPPLIER CODE OF CONDUCT", {
    x: PAGE.margin,
    y,
    size: 21,
    font: bold,
    color: C.navy,
  });

  y -= 25;

  page.drawText("& ASSURANCE REQUIREMENTS", {
    x: PAGE.margin,
    y,
    size: 14,
    font: bold,
    color: C.blue,
  });

  y -= 23;

  lineText(
    `Issued by ${clean(organization.name, "RPG Excellence customer")} for the approved supply relationship described below.`,
    { size: 9, colour: C.grey, after: 13 },
  );

  labelValue(
    "Supplier",
    supplier.legalName,
    PAGE.margin,
    y,
    width / 2,
  );
  labelValue(
    "Effective / review",
    `${date(document.effective_date)} / ${date(document.review_date)}`,
    PAGE.margin + width / 2,
    y,
    width / 2,
  );
  y -= 58;

  labelValue(
    "Registered address",
    supplier.address,
    PAGE.margin,
    y,
    width / 2,
  );
  labelValue(
    "Approved supply",
    supplier.supplyDescription,
    PAGE.margin + width / 2,
    y,
    width / 2,
  );
  y -= 66;

  labelValue(
    "Registration / company number",
    supplier.companyNumber || "Not recorded",
    PAGE.margin,
    y,
    width / 2,
  );
  labelValue(
    "Supplier contact",
    [
      supplier.contactName,
      supplier.contactTitle,
      supplier.contactEmail,
    ]
      .filter(Boolean)
      .join(" | ") || "Not recorded",
    PAGE.margin + width / 2,
    y,
    width / 2,
  );
  y -= 66;

  page.drawRectangle({
    x: PAGE.margin,
    y: y - 45,
    width,
    height: 45,
    color: C.navy,
  });

  page.drawText("APPLICABLE ASSURANCE FRAMEWORKS", {
    x: PAGE.margin + 10,
    y: y - 13,
    size: 6.5,
    font: bold,
    color: C.teal,
  });

  const labels = (document.standards_snapshot || [])
    .map(
      (standardId) =>
        SUPPLIER_STANDARDS.find(
          (item) => item.id === standardId,
        )?.label || standardId,
    )
    .join("  |  ");

  wrap(labels, bold, 7.3, width - 20)
    .slice(0, 2)
    .forEach((text, index) =>
      page.drawText(text, {
        x: PAGE.margin + 10,
        y: y - 28 - index * 10,
        size: 7.3,
        font: bold,
        color: C.white,
      }),
    );

  y -= 61;

  (document.sections || []).forEach((section, index) => {
    const estimated =
      56 +
      (section.paragraphs || []).length * 30 +
      (section.requirements || []).length * 18;

    ensure(Math.min(estimated, 220));

    page.drawRectangle({
      x: PAGE.margin,
      y: y - 31,
      width: 35,
      height: 31,
      color: C.blue,
    });

    page.drawText(String(index + 1).padStart(2, "0"), {
      x: PAGE.margin + 11,
      y: y - 20,
      size: 10,
      font: bold,
      color: C.white,
    });

    page.drawText(clean(section.title).toUpperCase(), {
      x: PAGE.margin + 45,
      y: y - 13,
      size: 10,
      font: bold,
      color: C.navy,
    });

    page.drawText(`Applicability: ${clean(section.applicability)}`, {
      x: PAGE.margin + 45,
      y: y - 27,
      size: 6.5,
      font: regular,
      color: C.grey,
    });

    y -= 43;

    (section.paragraphs || []).forEach((paragraph) =>
      lineText(paragraph, {
        size: 8.5,
        colour: C.grey,
        after: 4,
      }),
    );

    (section.requirements || []).forEach((requirement) =>
      lineText(`- ${requirement}`, {
        size: 8.2,
        indent: 12,
        after: 2,
      }),
    );

    y -= 7;

    page.drawLine({
      start: { x: PAGE.margin, y },
      end: { x: PAGE.width - PAGE.margin, y },
      thickness: 0.5,
      color: C.line,
    });

    y -= 15;
  });

  ensure(235);

  page.drawRectangle({
    x: PAGE.margin,
    y: y - 205,
    width,
    height: 205,
    color: C.pale,
    borderColor: C.blue,
    borderWidth: 0.8,
  });

  page.drawText("SUPPLIER ACKNOWLEDGEMENT", {
    x: PAGE.margin + 16,
    y: y - 20,
    size: 7,
    font: bold,
    color: C.blue,
  });

  page.drawText("Declaration and acceptance", {
    x: PAGE.margin + 16,
    y: y - 40,
    size: 14,
    font: bold,
    color: C.navy,
  });

  wrap(
    document.declaration?.acknowledgement,
    regular,
    8,
    width - 32,
  ).forEach((text, index) =>
    page.drawText(text, {
      x: PAGE.margin + 16,
      y: y - 58 - index * 11,
      size: 8,
      font: regular,
      color: C.grey,
    }),
  );

  const signTop = y - 104;
  const cellWidth = (width - 32) / 2;

  [
    ["Authorised representative", 0, 0],
    ["Title", 1, 0],
    ["Signature", 0, 1],
    ["Date", 1, 1],
  ].forEach(([label, column, row]) => {
    const x = PAGE.margin + 16 + column * cellWidth;
    const top = signTop - row * 42;

    page.drawText(label, {
      x,
      y: top,
      size: 6.5,
      font: bold,
      color: C.grey,
    });

    page.drawLine({
      start: { x, y: top - 23 },
      end: { x: x + cellWidth - 14, y: top - 23 },
      thickness: 0.6,
      color: C.grey,
    });
  });

  page.drawText(
    `Return within ${document.declaration?.responseDueDays || 20} days unless otherwise agreed.`,
    {
      x: PAGE.margin + 16,
      y: y - 190,
      size: 7,
      font: bold,
      color: C.navy,
    },
  );

  y -= 215;

  const pages = pdf.getPages();

  pages.forEach((current, index) => {
    current.drawLine({
      start: { x: PAGE.margin, y: 36 },
      end: { x: PAGE.width - PAGE.margin, y: 36 },
      thickness: 0.5,
      color: C.line,
    });

    current.drawText(
      `CONTROLLED | ${clean(document.document_reference)} | Version ${document.version}.0`,
      {
        x: PAGE.margin,
        y: 22,
        size: 6.2,
        font: regular,
        color: C.grey,
      },
    );

    current.drawText(
      "Printed copies are uncontrolled unless formally issued.",
      {
        x: PAGE.width / 2 - 91,
        y: 22,
        size: 6.2,
        font: regular,
        color: C.grey,
      },
    );

    current.drawText(`Page ${index + 1} of ${pages.length}`, {
      x: PAGE.width - PAGE.margin - 47,
      y: 22,
      size: 6.2,
      font: regular,
      color: C.grey,
    });
  });

  const bytes = await pdf.save();
  const filename =
    `${clean(document.document_reference)}-${clean(supplier.legalName)}`.replace(
      /[^a-zA-Z0-9._-]/g,
      "-",
    ) + ".pdf";

  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
