import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { formatBrl, formatDatePtBr } from "./treasury";

export type EventReportPdfRegistration = {
  displayName: string;
  companionName?: string | null;
  participantPhone?: string | null;
  amountCents: number;
  paymentStatus?: string | null;
  presenceStatus?: string | null;
  source?: string | null;
};

export type EventReportPdfInput = {
  eventName: string;
  startDate: string | Date;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  registrationFeeCents: number;
  summary: {
    registeredCount: number;
    attendeeCount: number;
    checkedInAttendeeCount: number;
    absentAttendeeCount: number;
    expectedAmountCents: number;
    paidAmountCents: number;
    pendingAmountCents: number;
  };
  registrations: EventReportPdfRegistration[];
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const NAVY = rgb(23 / 255, 47 / 255, 77 / 255);
const GOLD = rgb(154 / 255, 118 / 255, 40 / 255);
const GREEN = rgb(21 / 255, 115 / 255, 71 / 255);
const AMBER = rgb(153 / 255, 91 / 255, 7 / 255);
const MUTED = rgb(100 / 255, 116 / 255, 139 / 255);
const BORDER = rgb(217 / 255, 222 / 255, 229 / 255);
const SOFT = rgb(238 / 255, 242 / 255, 246 / 255);

function pdfText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u00a0/g, " ");
}

function fitText(value: unknown, font: PDFFont, size: number, maxWidth: number) {
  const safe = pdfText(value);
  if (font.widthOfTextAtSize(safe, size) <= maxWidth) return safe;
  let output = safe;
  while (output.length > 1 && font.widthOfTextAtSize(`${output}...`, size) > maxWidth) output = output.slice(0, -1);
  return `${output.trimEnd()}...`;
}

function wrapText(value: unknown, font: PDFFont, size: number, maxWidth: number, maxLines = 2) {
  const words = pdfText(value).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = fitText(word, font, size, maxWidth);
    if (lines.length >= maxLines - 1) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines.length ? lines : [""];
}

function drawMetric(page: PDFPage, input: { x: number; y: number; width: number; label: string; value: string; color: ReturnType<typeof rgb>; bold: PDFFont }) {
  page.drawRectangle({ x: input.x, y: input.y, width: input.width, height: 56, borderColor: BORDER, borderWidth: 0.8, color: rgb(1, 1, 1) });
  page.drawText(pdfText(input.label).toUpperCase(), { x: input.x + 9, y: input.y + 38, size: 6.8, font: input.bold, color: MUTED });
  page.drawText(pdfText(input.value), { x: input.x + 9, y: input.y + 16, size: 13, font: input.bold, color: input.color });
}

function paymentLabel(status: string | null | undefined) {
  return ({ pendente: "Pendente", pago: "Pago", isento: "Isento", reembolsado: "Reembolsado" } as Record<string, string>)[status ?? "pendente"] ?? "Pendente";
}

function presenceLabel(status: string | null | undefined) {
  return ({ pendente: "Pendente", presente: "Presente", ausente: "Nao compareceu", cancelado: "Cancelado" } as Record<string, string>)[status ?? "pendente"] ?? "Pendente";
}

function sourceLabel(source: string | null | undefined) {
  return source === "manual" ? "Painel" : "Link";
}

export function eventReportPdfFileName(eventName: string, startDate: string | Date) {
  const safeName = pdfText(eventName).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "evento";
  const date = pdfText(formatDatePtBr(startDate)).replace(/\//g, "-");
  return `relatorio-${safeName}-${date}.pdf`;
}

export async function createEventReportPdf(input: EventReportPdfInput) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pages: PDFPage[] = [];
  const addPage = () => {
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(page);
    return page;
  };

  let page = addPage();
  page.drawText("IDE FAZEI - RELATORIO DE EVENTO", { x: MARGIN, y: 804, size: 8, font: bold, color: GOLD });
  page.drawText(fitText(input.eventName, bold, 21, PAGE_WIDTH - MARGIN * 2), { x: MARGIN, y: 774, size: 21, font: bold, color: NAVY });
  const eventMeta = [formatDatePtBr(input.startDate), input.startTime ? `${input.startTime}${input.endTime ? ` - ${input.endTime}` : ""}` : "", input.location || "Local nao informado"].filter(Boolean).join(" · ");
  page.drawText(fitText(eventMeta, regular, 9, PAGE_WIDTH - MARGIN * 2), { x: MARGIN, y: 748, size: 9, font: regular, color: MUTED });
  page.drawLine({ start: { x: MARGIN, y: 732 }, end: { x: PAGE_WIDTH - MARGIN, y: 732 }, thickness: 2, color: GOLD });

  const metricGap = 8;
  const metricWidth = (PAGE_WIDTH - MARGIN * 2 - metricGap * 3) / 4;
  const metrics = [
    { label: "Inscricoes", value: String(input.summary.registeredCount), color: NAVY },
    { label: "Pessoas", value: String(input.summary.attendeeCount), color: NAVY },
    { label: "Presentes", value: String(input.summary.checkedInAttendeeCount), color: GREEN },
    { label: "Nao vieram", value: String(input.summary.absentAttendeeCount), color: AMBER },
  ];
  metrics.forEach((metric, index) => drawMetric(page, { x: MARGIN + index * (metricWidth + metricGap), y: 660, width: metricWidth, label: metric.label, value: metric.value, color: metric.color, bold }));

  if (input.registrationFeeCents > 0) {
    const financialY = 584;
    const financialWidth = (PAGE_WIDTH - MARGIN * 2 - metricGap * 2) / 3;
    [
      { label: "Previsto", value: formatBrl(input.summary.expectedAmountCents), color: NAVY },
      { label: "Recebido", value: formatBrl(input.summary.paidAmountCents), color: GREEN },
      { label: "Pendente", value: formatBrl(input.summary.pendingAmountCents), color: AMBER },
    ].forEach((metric, index) => drawMetric(page, { x: MARGIN + index * (financialWidth + metricGap), y: financialY, width: financialWidth, label: metric.label, value: metric.value, color: metric.color, bold }));
  }

  const tableTop = input.registrationFeeCents > 0 ? 510 : 590;
  page.drawText("Lista de inscritos", { x: MARGIN, y: tableTop, size: 13, font: bold, color: NAVY });
  const columns = { name: MARGIN + 4, companion: MARGIN + 175, phone: MARGIN + 288, payment: MARGIN + 370, presence: MARGIN + 444 };
  const headerY = tableTop - 20;
  page.drawRectangle({ x: MARGIN, y: headerY - 5, width: PAGE_WIDTH - MARGIN * 2, height: 19, color: SOFT });
  page.drawText("INSCRICAO", { x: columns.name, y: headerY, size: 6.5, font: bold, color: NAVY });
  page.drawText("ACOMPANHANTE", { x: columns.companion, y: headerY, size: 6.5, font: bold, color: NAVY });
  page.drawText("TELEFONE", { x: columns.phone, y: headerY, size: 6.5, font: bold, color: NAVY });
  page.drawText("PAGAMENTO", { x: columns.payment, y: headerY, size: 6.5, font: bold, color: NAVY });
  page.drawText("PRESENCA", { x: columns.presence, y: headerY, size: 6.5, font: bold, color: NAVY });

  let y = headerY - 23;
  if (!input.registrations.length) {
    page.drawText("Nenhuma inscricao registrada.", { x: MARGIN + 4, y, size: 8, font: regular, color: MUTED });
    y -= 28;
  } else {
    input.registrations.forEach((registration) => {
      const nameLines = wrapText(`${registration.displayName} (${sourceLabel(registration.source)})`, regular, 7.2, 160, 2);
      const companionLines = wrapText(registration.companionName || "-", regular, 7.2, 105, 2);
      const rowHeight = Math.max(nameLines.length, companionLines.length) > 1 ? 27 : 19;
      if (y - rowHeight < 86) {
        page = addPage();
        page.drawText("Relatorio de Evento - continua", { x: MARGIN, y: 802, size: 11, font: bold, color: NAVY });
        page.drawText(fitText(input.eventName, regular, 8, PAGE_WIDTH - MARGIN * 2), { x: MARGIN, y: 786, size: 8, font: regular, color: MUTED });
        y = 754;
        page.drawRectangle({ x: MARGIN, y: y - 5, width: PAGE_WIDTH - MARGIN * 2, height: 19, color: SOFT });
        page.drawText("INSCRICAO", { x: columns.name, y, size: 6.5, font: bold, color: NAVY });
        page.drawText("ACOMPANHANTE", { x: columns.companion, y, size: 6.5, font: bold, color: NAVY });
        page.drawText("TELEFONE", { x: columns.phone, y, size: 6.5, font: bold, color: NAVY });
        page.drawText("PAGAMENTO", { x: columns.payment, y, size: 6.5, font: bold, color: NAVY });
        page.drawText("PRESENCA", { x: columns.presence, y, size: 6.5, font: bold, color: NAVY });
        y -= 23;
      }
      const baseY = y - 10;
      nameLines.forEach((line, index) => page.drawText(line, { x: columns.name, y: baseY - index * 9, size: 7.2, font: regular, color: NAVY }));
      companionLines.forEach((line, index) => page.drawText(line, { x: columns.companion, y: baseY - index * 9, size: 7.2, font: regular, color: MUTED }));
      page.drawText(fitText(registration.participantPhone || "-", regular, 7, 75), { x: columns.phone, y: baseY, size: 7, font: regular, color: MUTED });
      page.drawText(fitText(input.registrationFeeCents > 0 ? `${formatBrl(registration.amountCents)} · ${paymentLabel(registration.paymentStatus)}` : "Sem cobranca", regular, 6.8, 68), { x: columns.payment, y: baseY, size: 6.8, font: regular, color: registration.paymentStatus === "pago" ? GREEN : NAVY });
      page.drawText(fitText(presenceLabel(registration.presenceStatus), regular, 6.8, 68), { x: columns.presence, y: baseY, size: 6.8, font: regular, color: registration.presenceStatus === "presente" ? GREEN : NAVY });
      page.drawLine({ start: { x: MARGIN, y: y - rowHeight + 3 }, end: { x: PAGE_WIDTH - MARGIN, y: y - rowHeight + 3 }, thickness: 0.4, color: BORDER });
      y -= rowHeight;
    });
  }

  if (y < 125) {
    page = addPage();
    y = 735;
  }
  page.drawLine({ start: { x: MARGIN, y: y - 18 }, end: { x: PAGE_WIDTH - MARGIN, y: y - 18 }, thickness: 0.5, color: BORDER });
  page.drawText("Documento gerado pelo modulo Eventos do Ide Fazei.", { x: MARGIN, y: y - 36, size: 7, font: regular, color: MUTED });
  pages.forEach((currentPage, index) => currentPage.drawText(`${index + 1}/${pages.length}`, { x: PAGE_WIDTH - MARGIN - 18, y: 21, size: 6.5, font: regular, color: MUTED }));

  const bytes = await pdf.save();
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy.buffer], { type: "application/pdf" });
}
