import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

export function assetRecordUrl(id) {
  if (!/^[0-9a-f-]{36}$/i.test(String(id))) {
    throw new Error("Invalid asset identifier.");
  }

  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL;

  if (!configured) {
    throw new Error(
      "Set the deployed HTTPS site address before printing asset labels.",
    );
  }

  const origin = new URL(configured);

  if (
    origin.protocol !== "https:" ||
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash
  ) {
    throw new Error(
      "The asset label site address must be an HTTPS origin without credentials or a path.",
    );
  }

  return new URL(
    "/portal/asset-management/records/".concat(id, ""),
    origin.origin,
  ).href;
}

const ascii = value =>
  String(value || "Not recorded")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, "?");

export async function makeAssetLabel({ asset, owner }) {
  const url = assetRecordUrl(asset.id);
  const doc = await PDFDocument.create();

  doc.setTitle("RPG Excellence asset identification label");
  doc.setSubject(
    "Identification only. Sign-in required for current asset information.",
  );

  // 90 x 60 mm. Print at actual size.
  const page = doc.addPage([255.12, 170.08]);

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const navy = rgb(0.04, 0.12, 0.23);
  const teal = rgb(0, 0.48, 0.52);

  const text = (
    value,
    x,
    y,
    size = 8,
    font = regular,
    color = navy,
  ) =>
    page.drawText(ascii(value), {
      x,
      y,
      size,
      font,
      color,
    });

  const wrap = (value, width, size, maxLines = 2) => {
    const words = ascii(value).split(/\s+/);
    const lines = [];
    let line = "";

    for (let word of words) {
      while (regular.widthOfTextAtSize(word, size) > width) {
        if (line) {
          lines.push(line);
          line = "";
        }

        let take = 1;

        while (
          take < word.length &&
          regular.widthOfTextAtSize(
            word.slice(0, take + 1),
            size,
          ) <= width
        ) {
          take++;
        }

        lines.push(word.slice(0, take));
        word = word.slice(take);
      }

      const candidate = "".concat(line, " ").concat(word, "").trim();

      if (
        regular.widthOfTextAtSize(candidate, size) > width &&
        line
      ) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }

    if (line) lines.push(line);

    const result = lines.slice(0, maxLines);

    if (lines.length > maxLines) {
      let last = result[maxLines - 1];

      while (
        regular.widthOfTextAtSize(last + "...", size) > width
      ) {
        last = last.slice(0, -1);
      }

      result[maxLines - 1] = last + "...";
    }

    return result;
  };

  text("RPG EXCELLENCE", 12, 151, 11, bold);
  text("ASSET IDENTIFICATION", 12, 138, 7, bold, teal);

  wrap(new URL(url).hostname, 96, 5.5, 1).forEach(line =>
    text(line, 147, 138, 5.5),
  );

  wrap(asset.asset_reference, 230, 11, 1).forEach((line, i) =>
    text(line, 12, 123 - i * 12, 11, bold),
  );

  const qr = await QRCode.toBuffer(url, {
    width: 900,
    margin: 4,
    errorCorrectionLevel: "M",
  });

  const image = await doc.embedPng(qr);

  page.drawImage(image, {
    x: 152,
    y: 30,
    width: 91,
    height: 91,
  });

  wrap(asset.asset_name, 133, 9, 2).forEach((line, i) =>
    text(line, 12, 96 - i * 11, 9, bold),
  );

  text("OWNER", 12, 69, 6, bold, teal);

  wrap(owner, 133, 7.5, 2).forEach((line, i) =>
    text(line, 12, 59 - i * 9, 7.5),
  );

  text("LOCATION", 12, 36, 6, bold, teal);

  wrap(asset.site_location_label, 133, 7, 2).forEach((line, i) =>
    text(line, 12, 26 - i * 8, 7),
  );

  text("Scan for current record", 151, 23, 6, bold);
  text("Sign-in required", 164, 14, 6);
  text("Identification only - not permission to use", 12, 7, 6);

  return doc.save();
}
