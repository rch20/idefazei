/**
 * Geração de certificados em PDF — Ide Fazei.
 *
 * O PDF e a prévia usam o mesmo artboard lógico A4 horizontal definido em
 * shared/certificateTemplate.ts. O tenant personaliza significado e conteúdo;
 * a grade, tipografia, margens e moldura permanecem protegidas.
 */

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFImage } from "pdf-lib";
import {
  CERTIFICATE_ARTBOARD,
  CERTIFICATE_BRAND,
  CERTIFICATE_LAYOUT,
  CERTIFICATE_TEMPLATE_COPY,
  createCertificateRenderModel,
  type CertificateTemplateOverride,
  type CertificateType,
} from "../shared/certificateTemplate";

export type { CertificateType } from "../shared/certificateTemplate";

export interface CertificateData {
  type: CertificateType;
  memberName: string;
  churchName: string;
  pastorName?: string;
  signatureLabel?: string;
  logoUrl?: string;
  verse?: string;
  courseName?: string;
  date?: string;
  className?: string;
  template?: CertificateTemplateOverride;
}

const NAVY = rgb(0.118, 0.227, 0.373);
const GOLD = rgb(0.722, 0.537, 0.18);
const CREAM = rgb(0.973, 0.957, 0.922);
const DARK_GOLD = rgb(0.55, 0.42, 0.17);
const LIGHT_NAVY = rgb(0.2, 0.35, 0.55);
const PAPER = rgb(0.988, 0.976, 0.953);
const WHITE = rgb(1, 1, 1);
const SCALE = CERTIFICATE_ARTBOARD.pdfWidth / CERTIFICATE_ARTBOARD.width;

type CertificatePage = ReturnType<PDFDocument["addPage"]>;
type PdfColor = ReturnType<typeof rgb>;

function formatDate(dateStr?: string): string {
  if (!dateStr) {
    return new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  }
  const parsed = new Date(dateStr);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  }
  return dateStr;
}

function pdfX(x: number): number {
  return x * SCALE;
}

function pdfYFromTop(top: number, size: number): number {
  return CERTIFICATE_ARTBOARD.pdfHeight - (top + size) * SCALE;
}

function fitPdfFontSize(text: string, font: PDFFont, preferred: number, min: number, maxWidth: number): number {
  let size = preferred * SCALE;
  const minimum = min * SCALE;
  const width = pdfX(maxWidth);
  while (size > minimum && font.widthOfTextAtSize(text, size) > width) size -= 0.5;
  return Math.max(minimum, size);
}

function drawLineBlock(
  page: CertificatePage,
  text: string,
  box: { x: number; y: number; width: number; maxLines: number },
  font: PDFFont,
  preferredSize: number,
  minSize: number,
  color: PdfColor,
  align: "center" | "left" | "right" = "center",
  lineHeight = 1.18,
) {
  const lines = text.split("\n").slice(0, box.maxLines);
  const size = fitPdfFontSize(lines.join(" "), font, preferredSize, minSize, box.width);
  const lineGap = size * lineHeight;
  lines.forEach((line, index) => {
    const width = font.widthOfTextAtSize(line, size);
    const left = align === "center" ? pdfX(box.x + (box.width - width / SCALE) / 2) : align === "right" ? pdfX(box.x + box.width) - width : pdfX(box.x);
    page.drawText(line, { x: left, y: pdfYFromTop(box.y, preferredSize) - index * lineGap, size, font, color });
  });
}

function drawCenteredSingleLine(
  page: CertificatePage,
  text: string,
  y: number,
  width: number,
  font: PDFFont,
  preferredSize: number,
  minSize: number,
  color: PdfColor,
  centerX = CERTIFICATE_ARTBOARD.width / 2,
) {
  drawLineBlock(page, text, { x: centerX - width / 2, y, width, maxLines: 1 }, font, preferredSize, minSize, color);
}

function drawModernFrame(page: CertificatePage) {
  const { width, height } = CERTIFICATE_ARTBOARD;
  const outerInset = CERTIFICATE_LAYOUT.frame.outerInset;
  const innerInset = CERTIFICATE_LAYOUT.frame.innerInset;

  page.drawRectangle({ x: 0, y: 0, width: CERTIFICATE_ARTBOARD.pdfWidth, height: CERTIFICATE_ARTBOARD.pdfHeight, color: CREAM });

  page.drawEllipse({
    x: pdfX(-78),
    y: CERTIFICATE_ARTBOARD.pdfHeight - pdfX(196),
    xScale: pdfX(184),
    yScale: pdfX(212),
    borderColor: GOLD,
    borderWidth: pdfX(10),
    opacity: 0.62,
  });
  page.drawEllipse({
    x: pdfX(width + 78),
    y: -pdfX(18),
    xScale: pdfX(184),
    yScale: pdfX(212),
    borderColor: GOLD,
    borderWidth: pdfX(10),
    opacity: 0.62,
  });

  page.drawRectangle({
    x: pdfX(outerInset),
    y: pdfX(outerInset),
    width: pdfX(width - outerInset * 2),
    height: pdfX(height - outerInset * 2),
    color: PAPER,
    borderColor: GOLD,
    borderWidth: pdfX(2.4),
  });
  page.drawRectangle({
    x: pdfX(innerInset),
    y: pdfX(innerInset),
    width: pdfX(width - innerInset * 2),
    height: pdfX(height - innerInset * 2),
    borderColor: DARK_GOLD,
    borderWidth: pdfX(0.8),
  });
  page.drawLine({
    start: { x: pdfX(78), y: pdfYFromTop(167, 0) },
    end: { x: pdfX(width - 78), y: pdfYFromTop(167, 0) },
    thickness: pdfX(0.7),
    color: GOLD,
    opacity: 0.55,
  });
}

async function embedLogo(pdfDoc: PDFDocument, logoUrl?: string): Promise<PDFImage | null> {
  if (!logoUrl) return null;
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("png") || logoUrl.toLowerCase().includes(".png")) return await pdfDoc.embedPng(bytes);
    return await pdfDoc.embedJpg(bytes);
  } catch {
    return null;
  }
}

export async function generateCertificatePDF(data: CertificateData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const page = pdfDoc.addPage([CERTIFICATE_ARTBOARD.pdfWidth, CERTIFICATE_ARTBOARD.pdfHeight]);
  drawModernFrame(page);

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const template = { ...CERTIFICATE_TEMPLATE_COPY[data.type], ...(data.template ?? {}) };
  const model = createCertificateRenderModel({
    type: data.type,
    memberName: data.memberName,
    churchName: data.churchName,
    pastorName: data.pastorName,
    signatureLabel: data.signatureLabel,
    verse: data.verse,
    courseName: data.courseName || data.className || template.course,
    dateLabel: formatDate(data.date),
    template: data.template,
  });
  const centerX = CERTIFICATE_ARTBOARD.width / 2;
  const logo = await embedLogo(pdfDoc, data.logoUrl);

  if (logo) {
    const size = CERTIFICATE_LAYOUT.brand.logoSize;
    const dimensions = logo.scaleToFit(pdfX(size), pdfX(size));
    page.drawImage(logo, {
      x: pdfX(CERTIFICATE_LAYOUT.brand.x),
      y: pdfYFromTop(CERTIFICATE_LAYOUT.brand.y, size) - pdfX(size * 0.08),
      width: dimensions.width,
      height: dimensions.height,
    });
  }

  drawLineBlock(page, model.churchName, { x: CERTIFICATE_LAYOUT.brand.x + 78, y: 74, width: 280, maxLines: 1 }, timesRoman, 18, 12, NAVY, "left");
  drawLineBlock(page, "AMAR · SERVIR · TRANSFORMAR", { x: CERTIFICATE_LAYOUT.brand.x + 80, y: 101, width: 260, maxLines: 1 }, helvetica, 7, 5, DARK_GOLD, "left");

  if (model.verse.text) {
    drawLineBlock(page, `“${model.verse.text}”`, CERTIFICATE_LAYOUT.verse, timesItalic, 10, 8, DARK_GOLD, "right", 1.15);
  }

  drawCenteredSingleLine(page, model.title.text, CERTIFICATE_LAYOUT.content.title.y, CERTIFICATE_LAYOUT.content.title.width, helveticaBold, model.title.fontSize, 12, NAVY, centerX);
  drawLineBlock(page, model.subtitle.text, CERTIFICATE_LAYOUT.content.subtitle, timesBold, model.subtitle.fontSize, 24, GOLD);

  page.drawLine({
    start: { x: pdfX(315), y: pdfYFromTop(319, 0) },
    end: { x: pdfX(808), y: pdfYFromTop(319, 0) },
    thickness: pdfX(1),
    color: GOLD,
  });

  drawCenteredSingleLine(page, "CERTIFICAMOS QUE", CERTIFICATE_LAYOUT.content.intro.y, CERTIFICATE_LAYOUT.content.intro.width, timesItalic, 16, 11, LIGHT_NAVY, centerX);
  drawLineBlock(page, model.memberName.text, CERTIFICATE_LAYOUT.content.member, timesBold, model.memberName.fontSize, 22, NAVY);

  page.drawLine({
    start: { x: pdfX(462), y: pdfYFromTop(470, 0) },
    end: { x: pdfX(661), y: pdfYFromTop(470, 0) },
    thickness: pdfX(1.2),
    color: GOLD,
  });

  drawLineBlock(page, model.body.text, CERTIFICATE_LAYOUT.content.body, timesRoman, model.body.fontSize, 11, LIGHT_NAVY);
  drawLineBlock(page, `“${model.course.text}”`, CERTIFICATE_LAYOUT.content.course, timesBold, model.course.fontSize, 10, DARK_GOLD);

  const footer = CERTIFICATE_LAYOUT.footer;
  page.drawLine({
    start: { x: pdfX(78), y: pdfYFromTop(footer.dividerY, 0) },
    end: { x: pdfX(CERTIFICATE_ARTBOARD.width - 78), y: pdfYFromTop(footer.dividerY, 0) },
    thickness: pdfX(0.8),
    color: GOLD,
    opacity: 0.7,
  });
  drawCenteredSingleLine(page, `${model.churchName} · ${model.dateLabel}`, footer.dateY, 460, helvetica, 11, 8, LIGHT_NAVY, centerX);

  for (const signature of [
    { x: footer.leftSignatureX, name: model.pastorName, label: model.signatureLabel },
    { x: footer.rightSignatureX, name: model.churchName, label: "Igreja" },
  ]) {
    page.drawLine({
      start: { x: pdfX(signature.x - footer.signatureWidth / 2), y: pdfYFromTop(footer.signatureLineY, 0) },
      end: { x: pdfX(signature.x + footer.signatureWidth / 2), y: pdfYFromTop(footer.signatureLineY, 0) },
      thickness: pdfX(0.9),
      color: NAVY,
    });
    drawCenteredSingleLine(page, signature.name, footer.signatureNameY, footer.signatureWidth, helveticaBold, 11, 8, NAVY, signature.x);
    drawCenteredSingleLine(page, signature.label, footer.signatureLabelY, footer.signatureWidth, helvetica, 9, 7, LIGHT_NAVY, signature.x);
  }

  drawCenteredSingleLine(page, "Certificado emitido pela igreja", footer.noteY, 460, helvetica, 7, 5, DARK_GOLD, centerX);
  return await pdfDoc.save();
}
