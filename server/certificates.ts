/**
 * Geração de Certificados em PDF — Ide Fazei.
 *
 * O PDF usa o mesmo contrato moderno de conteúdo da pré-visualização:
 * identidade no topo, título hierárquico, nome central, mensagem, data,
 * duas assinaturas e versículo no rodapé. O tenant personaliza conteúdo;
 * a composição visual permanece protegida.
 */

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, StandardFonts, type PDFFont } from "pdf-lib";
import { CERTIFICATE_TEMPLATE_COPY, type CertificateTemplateOverride, type CertificateType } from "../shared/certificateTemplate";

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
const WHITE = rgb(1, 1, 1);

type CertificatePage = ReturnType<PDFDocument["addPage"]>;

function formatDate(dateStr?: string): string {
  if (!dateStr) {
    return new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  const parsed = new Date(dateStr);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  return dateStr;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (!words.length) return [];

  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function fitTextSize(text: string, font: PDFFont, preferred: number, min: number, maxWidth: number): number {
  let size = preferred;
  while (size > min && font.widthOfTextAtSize(text, size) > maxWidth) size -= 1;
  return size;
}

function drawCenteredText(
  page: CertificatePage,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  color: ReturnType<typeof rgb>,
  centerX: number,
) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: centerX - width / 2, y, size, font, color });
}

function drawCenteredWrapped(
  page: CertificatePage,
  text: string,
  topY: number,
  font: PDFFont,
  size: number,
  color: ReturnType<typeof rgb>,
  centerX: number,
  maxWidth: number,
  lineGap: number,
  maxLines = 3,
): number {
  const lines = wrapText(text, font, size, maxWidth).slice(0, maxLines);
  lines.forEach((line, index) => drawCenteredText(page, line, topY - index * lineGap, font, size, color, centerX));
  return lines.length;
}

function drawModernBorder(page: CertificatePage, width: number, height: number) {
  const margin = 20;
  const innerMargin = 28;

  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: CREAM,
  });

  page.drawEllipse({
    x: -45,
    y: height - 160,
    xScale: 150,
    yScale: 180,
    borderColor: GOLD,
    borderWidth: 12,
    opacity: 0.82,
  });

  page.drawEllipse({
    x: width + 45,
    y: -10,
    xScale: 150,
    yScale: 180,
    borderColor: GOLD,
    borderWidth: 12,
    opacity: 0.82,
  });

  page.drawRectangle({
    x: margin,
    y: margin,
    width: width - margin * 2,
    height: height - margin * 2,
    borderColor: GOLD,
    borderWidth: 3,
  });

  page.drawRectangle({
    x: innerMargin,
    y: innerMargin,
    width: width - innerMargin * 2,
    height: height - innerMargin * 2,
    borderColor: DARK_GOLD,
    borderWidth: 1,
  });
}

async function embedLogo(pdfDoc: PDFDocument, logoUrl?: string) {
  if (!logoUrl) return null;
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("png") || logoUrl.toLowerCase().includes(".png")) {
      return await pdfDoc.embedPng(bytes);
    }
    return await pdfDoc.embedJpg(bytes);
  } catch {
    return null;
  }
}

export async function generateCertificatePDF(data: CertificateData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const width = 841.89;
  const height = 595.28;
  const centerX = width / 2;
  const page = pdfDoc.addPage([width, height]);
  drawModernBorder(page, width, height);

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const copy = { ...CERTIFICATE_TEMPLATE_COPY[data.type], ...(data.template ?? {}) };

  const logo = await embedLogo(pdfDoc, data.logoUrl);
  if (logo) {
    const logoDims = logo.scaleToFit(68, 68);
    page.drawImage(logo, {
      x: 94,
      y: height - 86,
      width: logoDims.width,
      height: logoDims.height,
    });
  }

  drawCenteredText(page, data.churchName || "Igreja", height - 55, timesRoman, 18, NAVY, 360);
  drawCenteredText(page, "AMAR · SERVIR · TRANSFORMAR", height - 73, helvetica, 7, DARK_GOLD, 360);

  if (data.verse) {
    drawCenteredWrapped(page, `“${data.verse}”`, height - 45, timesItalic, 7, DARK_GOLD, 735, 145, 10, 3);
  }

  drawCenteredText(page, copy.title, height - 132, helveticaBold, 16, NAVY, centerX);
  const subtitleSize = fitTextSize(copy.subtitle, timesBold, 31, 20, 520);
  drawCenteredText(page, copy.subtitle, height - 174, timesBold, subtitleSize, GOLD, centerX);
  page.drawLine({
    start: { x: centerX - 220, y: height - 194 },
    end: { x: centerX + 220, y: height - 194 },
    thickness: 1,
    color: GOLD,
  });

  drawCenteredText(page, "CERTIFICAMOS QUE", height - 226, timesItalic, 11, LIGHT_NAVY, centerX);
  const nameSize = fitTextSize(data.memberName, timesBold, 34, 18, 550);
  drawCenteredText(page, data.memberName, height - 268, timesBold, nameSize, NAVY, centerX);
  page.drawLine({
    start: { x: centerX - 105, y: height - 284 },
    end: { x: centerX + 105, y: height - 284 },
    thickness: 1.4,
    color: GOLD,
  });

  const bodyLines = drawCenteredWrapped(
    page,
    copy.body,
    height - 317,
    timesRoman,
    12,
    LIGHT_NAVY,
    centerX,
    535,
    16,
    2,
  );
  const courseLabel = data.courseName || data.className || copy.subtitle;
  drawCenteredText(page, `“${courseLabel}”`, height - 350 - (bodyLines - 1) * 14, timesRoman, 13, DARK_GOLD, centerX);

  page.drawLine({
    start: { x: 125, y: 175 },
    end: { x: width - 125, y: 175 },
    thickness: 0.8,
    color: GOLD,
  });

  drawCenteredText(page, `${data.churchName} — ${formatDate(data.date)}`, 153, helvetica, 10, LIGHT_NAVY, centerX);

  const signatureY = 118;
  const signatureWidth = 165;
  const leftSignatureX = 260;
  const rightSignatureX = 580;
  page.drawLine({
    start: { x: leftSignatureX - signatureWidth / 2, y: signatureY },
    end: { x: leftSignatureX + signatureWidth / 2, y: signatureY },
    thickness: 0.8,
    color: NAVY,
  });
  page.drawLine({
    start: { x: rightSignatureX - signatureWidth / 2, y: signatureY },
    end: { x: rightSignatureX + signatureWidth / 2, y: signatureY },
    thickness: 0.8,
    color: NAVY,
  });

  const pastorName = data.pastorName || "Nome do Pastor / Líder";
  drawCenteredText(page, pastorName, 103, helveticaBold, 10, NAVY, leftSignatureX);
  drawCenteredText(page, data.signatureLabel || "Pastor(a) Presidente", 91, helvetica, 9, LIGHT_NAVY, leftSignatureX);
  drawCenteredText(page, data.churchName || "Igreja", 103, helveticaBold, 10, NAVY, rightSignatureX);
  drawCenteredText(page, "Igreja", 91, helvetica, 9, LIGHT_NAVY, rightSignatureX);

  if (data.verse) {
    drawCenteredWrapped(page, `“${data.verse}”`, 67, timesItalic, 8, DARK_GOLD, centerX, 560, 10, 2);
  }

  const footerText = `Certificado emitido por ${data.churchName || "sua igreja"}`;
  drawCenteredText(page, footerText, 31, helvetica, 7, DARK_GOLD, centerX);

  return await pdfDoc.save();
}
