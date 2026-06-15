/**
 * Geração de Certificados em PDF — Lampas Igreja SaaS
 *
 * Usa pdf-lib para criar certificados com layout personalizado:
 * fundo pergaminho, bordas douradas, nome em destaque, dados da igreja.
 */

import fontkit from "@pdf-lib/fontkit";
import { degrees, PDFDocument, rgb, StandardFonts } from "pdf-lib";

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export type CertificateType = "fundamentos" | "batismo" | "lideres";

export interface CertificateData {
  type: CertificateType;
  memberName: string;
  churchName: string;
  pastorName?: string;
  courseName?: string; // Para fundamentos: nome do curso específico
  date?: string; // ISO string ou "DD/MM/YYYY"
  className?: string; // Nome da turma
}

// ─── CORES ────────────────────────────────────────────────────────────────────

const NAVY = rgb(0.118, 0.227, 0.373); // #1e3a5f
const GOLD = rgb(0.788, 0.659, 0.298); // #c9a84c
const CREAM = rgb(0.988, 0.976, 0.953); // #fcf9f3
const DARK_GOLD = rgb(0.6, 0.49, 0.18);
const WHITE = rgb(1, 1, 1);
const LIGHT_NAVY = rgb(0.2, 0.35, 0.55);

// ─── TÍTULOS POR TIPO ─────────────────────────────────────────────────────────

const CERTIFICATE_CONFIG: Record<
  CertificateType,
  { title: string; subtitle: string; body: string }
> = {
  fundamentos: {
    title: "CERTIFICADO DE CONCLUSÃO",
    subtitle: "Escola de Fundamentos",
    body: "concluiu com êxito o curso de",
  },
  batismo: {
    title: "CERTIFICADO DE BATISMO",
    subtitle: "Batismo nas Águas",
    body: "foi batizado(a) nas águas em obediência ao mandamento de Cristo,\nprofessando publicamente sua fé e compromisso com o Evangelho.",
  },
  lideres: {
    title: "CERTIFICADO DE FORMAÇÃO",
    subtitle: "Escola de Líderes",
    body: "concluiu com distinção o programa de formação de líderes",
  },
};

// ─── FORMATAÇÃO DE DATA ───────────────────────────────────────────────────────

function formatDate(dateStr?: string): string {
  if (!dateStr) {
    return new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }
  // Tenta parsear ISO ou DD/MM/YYYY
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }
  return dateStr;
}

// ─── DESENHAR BORDA ORNAMENTAL ────────────────────────────────────────────────

function drawBorder(page: ReturnType<PDFDocument["addPage"]>, width: number, height: number) {
  const margin = 20;
  const innerMargin = 28;

  // Borda externa dourada grossa
  page.drawRectangle({
    x: margin,
    y: margin,
    width: width - margin * 2,
    height: height - margin * 2,
    borderColor: GOLD,
    borderWidth: 3,
    color: undefined,
  });

  // Borda interna dourada fina
  page.drawRectangle({
    x: innerMargin,
    y: innerMargin,
    width: width - innerMargin * 2,
    height: height - innerMargin * 2,
    borderColor: DARK_GOLD,
    borderWidth: 1,
    color: undefined,
  });

  // Cantos ornamentais — quadradinhos dourados
  const cornerSize = 8;
  const corners = [
    { x: margin - cornerSize / 2, y: margin - cornerSize / 2 },
    { x: width - margin - cornerSize / 2, y: margin - cornerSize / 2 },
    { x: margin - cornerSize / 2, y: height - margin - cornerSize / 2 },
    { x: width - margin - cornerSize / 2, y: height - margin - cornerSize / 2 },
  ];
  for (const c of corners) {
    page.drawRectangle({
      x: c.x,
      y: c.y,
      width: cornerSize,
      height: cornerSize,
      color: GOLD,
    });
  }
}

// ─── LINHA DECORATIVA ─────────────────────────────────────────────────────────

function drawDecorativeLine(
  page: ReturnType<PDFDocument["addPage"]>,
  y: number,
  width: number,
  margin: number
) {
  const lineWidth = width - margin * 2 - 60;
  const startX = margin + 30;

  page.drawLine({
    start: { x: startX, y },
    end: { x: startX + lineWidth, y },
    thickness: 0.5,
    color: GOLD,
  });

  // Losango central
  const cx = startX + lineWidth / 2;
  const diamond = 4;
  page.drawRectangle({
    x: cx - diamond / 2,
    y: y - diamond / 2,
    width: diamond,
    height: diamond,
    color: GOLD,
    rotate: degrees(45),
  });
}

// ─── GERADOR PRINCIPAL ────────────────────────────────────────────────────────

export async function generateCertificatePDF(data: CertificateData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  // Página A4 landscape
  const width = 841.89;
  const height = 595.28;
  const page = pdfDoc.addPage([width, height]);

  const margin = 20;
  const centerX = width / 2;

  // ── Fundo creme ──
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: CREAM,
  });

  // ── Faixa decorativa superior (azul-marinho) ──
  page.drawRectangle({
    x: margin + 1,
    y: height - margin - 1 - 60,
    width: width - (margin + 1) * 2,
    height: 60,
    color: NAVY,
  });

  // ── Faixa decorativa inferior (azul-marinho) ──
  page.drawRectangle({
    x: margin + 1,
    y: margin + 1,
    width: width - (margin + 1) * 2,
    height: 50,
    color: NAVY,
  });

  // ── Borda ornamental ──
  drawBorder(page, width, height);

  // ── Fontes padrão ──
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  const config = CERTIFICATE_CONFIG[data.type];

  // ── TÍTULO (na faixa superior) ──
  const titleSize = 18;
  const titleWidth = helveticaBold.widthOfTextAtSize(config.title, titleSize);
  page.drawText(config.title, {
    x: centerX - titleWidth / 2,
    y: height - margin - 1 - 38,
    size: titleSize,
    font: helveticaBold,
    color: GOLD,
  });

  // ── SUBTÍTULO (abaixo da faixa) ──
  const subtitleSize = 13;
  const subtitleWidth = helvetica.widthOfTextAtSize(config.subtitle, subtitleSize);
  page.drawText(config.subtitle, {
    x: centerX - subtitleWidth / 2,
    y: height - margin - 1 - 60 - 28,
    size: subtitleSize,
    font: helvetica,
    color: NAVY,
  });

  // ── Linha decorativa 1 ──
  drawDecorativeLine(page, height - margin - 60 - 50, width, margin);

  // ── Texto "Certificamos que" ──
  const certText = "Certificamos que";
  const certSize = 12;
  const certWidth = timesItalic.widthOfTextAtSize(certText, certSize);
  page.drawText(certText, {
    x: centerX - certWidth / 2,
    y: height - margin - 60 - 80,
    size: certSize,
    font: timesItalic,
    color: LIGHT_NAVY,
  });

  // ── NOME DO MEMBRO (destaque) ──
  const nameSize = 36;
  const nameWidth = timesBold.widthOfTextAtSize(data.memberName, nameSize);
  page.drawText(data.memberName, {
    x: centerX - nameWidth / 2,
    y: height - margin - 60 - 130,
    size: nameSize,
    font: timesBold,
    color: NAVY,
  });

  // Linha abaixo do nome
  const nameLineY = height - margin - 60 - 140;
  page.drawLine({
    start: { x: centerX - nameWidth / 2 - 10, y: nameLineY },
    end: { x: centerX + nameWidth / 2 + 10, y: nameLineY },
    thickness: 1.5,
    color: GOLD,
  });

  // ── Corpo do texto ──
  const bodyY = height - margin - 60 - 175;

  if (data.type === "batismo") {
    // Texto de batismo em duas linhas
    const line1 = "foi batizado(a) nas águas em obediência ao mandamento de Cristo,";
    const line2 = "professando publicamente sua fé e compromisso com o Evangelho.";
    const bodySize = 12;

    const l1Width = timesRoman.widthOfTextAtSize(line1, bodySize);
    page.drawText(line1, {
      x: centerX - l1Width / 2,
      y: bodyY,
      size: bodySize,
      font: timesRoman,
      color: LIGHT_NAVY,
    });

    const l2Width = timesRoman.widthOfTextAtSize(line2, bodySize);
    page.drawText(line2, {
      x: centerX - l2Width / 2,
      y: bodyY - 18,
      size: bodySize,
      font: timesRoman,
      color: LIGHT_NAVY,
    });
  } else {
    // Fundamentos e Líderes
    const bodyText = config.body;
    const bodySize = 12;
    const bodyWidth = timesRoman.widthOfTextAtSize(bodyText, bodySize);
    page.drawText(bodyText, {
      x: centerX - bodyWidth / 2,
      y: bodyY,
      size: bodySize,
      font: timesRoman,
      color: LIGHT_NAVY,
    });

    // Nome do curso/turma
    if (data.courseName || data.className) {
      const courseName = data.courseName ?? data.className ?? "";
      const courseSize = 16;
      const courseWidth = timesBold.widthOfTextAtSize(`"${courseName}"`, courseSize);
      page.drawText(`"${courseName}"`, {
        x: centerX - courseWidth / 2,
        y: bodyY - 28,
        size: courseSize,
        font: timesBold,
        color: NAVY,
      });
    }
  }

  // ── Linha decorativa 2 ──
  drawDecorativeLine(page, bodyY - 60, width, margin);

  // ── Data e Igreja ──
  const dateStr = formatDate(data.date);
  const dateText = `${data.churchName} — ${dateStr}`;
  const dateSize = 10;
  const dateWidth = helvetica.widthOfTextAtSize(dateText, dateSize);
  page.drawText(dateText, {
    x: centerX - dateWidth / 2,
    y: bodyY - 80,
    size: dateSize,
    font: helvetica,
    color: LIGHT_NAVY,
  });

  // ── Assinatura do Pastor (se fornecida) ──
  if (data.pastorName) {
    const sigY = bodyY - 115;
    const sigLineWidth = 160;

    // Linha de assinatura
    page.drawLine({
      start: { x: centerX - sigLineWidth / 2, y: sigY },
      end: { x: centerX + sigLineWidth / 2, y: sigY },
      thickness: 0.8,
      color: NAVY,
    });

    // Nome do pastor
    const pastorSize = 10;
    const pastorWidth = helveticaBold.widthOfTextAtSize(data.pastorName, pastorSize);
    page.drawText(data.pastorName, {
      x: centerX - pastorWidth / 2,
      y: sigY - 14,
      size: pastorSize,
      font: helveticaBold,
      color: NAVY,
    });

    // Cargo
    const cargoText = "Pastor Presidente";
    const cargoSize = 9;
    const cargoWidth = helvetica.widthOfTextAtSize(cargoText, cargoSize);
    page.drawText(cargoText, {
      x: centerX - cargoWidth / 2,
      y: sigY - 26,
      size: cargoSize,
      font: helvetica,
      color: LIGHT_NAVY,
    });
  }

  // ── Rodapé (na faixa inferior) ──
  const footerText = "Lampas • Plataforma de Crescimento e Discipulado";
  const footerSize = 8;
  const footerWidth = helvetica.widthOfTextAtSize(footerText, footerSize);
  page.drawText(footerText, {
    x: centerX - footerWidth / 2,
    y: margin + 18,
    size: footerSize,
    font: helvetica,
    color: GOLD,
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
