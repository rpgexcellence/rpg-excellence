import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { createClient } from "../../../../../../../lib/supabase/server";

export const dynamic = "force-dynamic";

function formatDate(value) {
  if (!value) return "Not specified";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function fitSize(font, text, preferred, maximumWidth, minimum = 16) {
  let size = preferred;
  while (size > minimum && font.widthOfTextAtSize(text, size) > maximumWidth) {
    size -= 1;
  }
  return size;
}

function drawCentered(page, text, font, size, y, color) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: (page.getWidth() - width) / 2,
    y,
    size,
    font,
    color,
  });
}

export async function GET(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.redirect(new URL(`/portal/login?next=/portal/internal-audit/training/${id}/certificate/pdf`, request.url), 303);
  }

  const { data: enrolment, error: enrolmentError } = await supabase
    .from("hs_training_enrolments")
    .select("id,learner_id,course_id,status")
    .eq("id", id)
    .eq("learner_id", user.id)
    .maybeSingle();

  if (enrolmentError) {
    return new Response("Unable to load the training record.", { status: 500 });
  }

  if (!enrolment || enrolment.status !== "passed") {
    return new Response("A valid completed training record was not found.", { status: 404 });
  }

  const { data: course, error: courseError } = await supabase
    .from("hs_training_courses")
    .select("id,course_code,academy_code")
    .eq("id", enrolment.course_id)
    .maybeSingle();

  if (courseError) {
    return new Response("Unable to validate the Internal Auditor Refresher course.", { status: 500 });
  }

  if (
    !course ||
    course.course_code !== "IA-REFRESHER-001" ||
    course.academy_code !== "internal_audit"
  ) {
    return new Response("This certificate is not an Internal Auditor Refresher record.", { status: 404 });
  }

  const { data: certificate, error: certificateError } = await supabase
    .from("hs_training_certificates")
    .select(`
      certificate_number,
      verification_code,
      learner_name,
      course_title,
      course_version,
      score_percent,
      issued_at,
      valid_until,
      revoked_at,
      revocation_reason
    `)
    .eq("enrolment_id", id)
    .eq("learner_id", user.id)
    .maybeSingle();

  if (certificateError) {
    return new Response("Unable to load the certificate.", { status: 500 });
  }

  if (!certificate) {
    return new Response("Certificate not found.", { status: 404 });
  }

  const pdf = await PDFDocument.create();
  pdf.setTitle(`${certificate.course_title} - ${certificate.learner_name}`);
  pdf.setAuthor("RPG Excellence");
  pdf.setSubject("Internal Auditor Refresher certificate of completion");
  pdf.setKeywords(["RPG Excellence", "internal audit", "auditor refresher", "certificate"]);
  pdf.setCreationDate(new Date(certificate.issued_at));

  const page = pdf.addPage([841.89, 595.28]);
  const { width, height } = page.getSize();
  const navy = rgb(0.03, 0.16, 0.31);
  const green = rgb(0.03, 0.51, 0.38);
  const grey = rgb(0.35, 0.44, 0.52);
  const pale = rgb(0.93, 0.97, 0.96);
  const red = rgb(0.69, 0.14, 0.1);
  const white = rgb(1, 1, 1);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);

  page.drawRectangle({ x: 18, y: 18, width: width - 36, height: height - 36, borderColor: navy, borderWidth: 4 });
  page.drawRectangle({ x: 27, y: 27, width: width - 54, height: height - 54, borderColor: green, borderWidth: 1.5 });
  page.drawRectangle({ x: 43, y: height - 93, width: width - 86, height: 46, color: navy });
  drawCentered(page, "RPG EXCELLENCE", sansBold, 17, height - 76, white);

  drawCentered(page, "CERTIFICATE OF COMPLETION", sansBold, 12, height - 132, green);
  drawCentered(page, "Internal Audit Learning", serif, 35, height - 180, navy);
  drawCentered(page, "This certificate is awarded to", sans, 12, height - 215, grey);

  const nameSize = fitSize(serif, certificate.learner_name, 28, width - 180, 18);
  drawCentered(page, certificate.learner_name, serif, nameSize, height - 258, green);
  page.drawLine({ start: { x: 120, y: height - 268 }, end: { x: width - 120, y: height - 268 }, thickness: 0.8, color: rgb(0.67, 0.73, 0.78) });

  drawCentered(page, "for successfully completing", sans, 12, height - 298, grey);
  const courseSize = fitSize(sansBold, certificate.course_title, 23, width - 150, 15);
  drawCentered(page, certificate.course_title, sansBold, courseSize, height - 337, navy);
  drawCentered(page, "and achieving the required standard in the Internal Auditor Refresher assessment.", sans, 11, height - 366, grey);

  page.drawRectangle({ x: 92, y: 116, width: width - 184, height: 75, color: pale });
  const columns = [width * 0.25, width * 0.5, width * 0.75];
  const labels = ["ASSESSMENT SCORE", "DATE ISSUED", "VALID UNTIL"];
  const values = [`${certificate.score_percent}%`, formatDate(certificate.issued_at), formatDate(certificate.valid_until)];
  columns.forEach((x, index) => {
    const labelWidth = sansBold.widthOfTextAtSize(labels[index], 8);
    const valueSize = fitSize(sansBold, values[index], 12, 180, 9);
    const valueWidth = sansBold.widthOfTextAtSize(values[index], valueSize);
    page.drawText(labels[index], { x: x - labelWidth / 2, y: 164, size: 8, font: sansBold, color: grey });
    page.drawText(values[index], { x: x - valueWidth / 2, y: 138, size: valueSize, font: sansBold, color: navy });
  });

  if (certificate.revoked_at) {
    page.drawRectangle({ x: 140, y: 88, width: width - 280, height: 22, color: rgb(1, 0.92, 0.91) });
    drawCentered(page, `REVOKED ${formatDate(certificate.revoked_at)}`, sansBold, 10, 95, red);
  }

  const origin = new URL(request.url).origin;
  const verificationUrl = `${origin}/verify/training/${certificate.verification_code}`;
  const verifySize = fitSize(sans, verificationUrl, 8, width - 120, 6);
  drawCentered(page, `Certificate ${certificate.certificate_number} | Course version ${certificate.course_version}`, sansBold, 8, 72, navy);
  drawCentered(page, verificationUrl, sans, verifySize, 55, grey);
  drawCentered(page, "Refresher completion supports auditor knowledge; competence also requires appropriate experience, observed practice and evaluation.", sans, 7, 38, grey);

  const bytes = await pdf.save();
  const safeNumber = certificate.certificate_number.replace(/[^a-zA-Z0-9_-]/g, "-");

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeNumber}.pdf"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}


