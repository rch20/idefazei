import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { formatBrl, formatDatePtBr, type TreasuryReportData } from "./treasury";

export type TreasuryPdfMode = "summary" | "detailed";

export type TreasuryPdfInput = {
  churchName: string;
  periodLabel: string;
  startDate: string;
  endDate: string;
  accountLabel: string;
  data: TreasuryReportData;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const NAVY = rgb(23 / 255, 47 / 255, 77 / 255);
const GOLD = rgb(154 / 255, 118 / 255, 40 / 255);
const GREEN = rgb(21 / 255, 115 / 255, 71 / 255);
const RED = rgb(180 / 255, 35 / 255, 24 / 255);
const MUTED = rgb(100 / 255, 116 / 255, 139 / 255);
const BORDER = rgb(217 / 255, 222 / 255, 229 / 255);
const SOFT = rgb(238 / 255, 242 / 255, 246 / 255);

const paymentLabels: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  transferencia: "Transferência",
  cartao: "Cartão",
  cheque: "Cheque",
  outro: "Outro",
};

export function treasuryPdfFileName(month: string, mode: TreasuryPdfMode = "detailed") {
  const safeMonth = /^\d{4}-\d{2}$/.test(month) ? month : new Date().toISOString().slice(0, 7);
  return mode === "summary" ? `resumo-tesouraria-${safeMonth}.pdf` : `relatorio-tesouraria-detalhado-${safeMonth}.pdf`;
}

function pdfText(value: unknown) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^\u0020-\u007e\u00a0-\u00ff]/g, "?");
}

function fitText(value: string, font: PDFFont, size: number, maxWidth: number) {
  const safe = pdfText(value);
  if (font.widthOfTextAtSize(safe, size) <= maxWidth) return safe;
  let output = safe;
  while (output.length > 1 && font.widthOfTextAtSize(`${output}...`, size) > maxWidth) output = output.slice(0, -1);
  return `${output.trimEnd()}...`;
}

function wrapText(value: string, font: PDFFont, size: number, maxWidth: number, maxLines = 2) {
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

function drawRight(page: PDFPage, value: string, xRight: number, y: number, font: PDFFont, size: number, color = NAVY) {
  const safe = pdfText(value);
  page.drawText(safe, { x: xRight - font.widthOfTextAtSize(safe, size), y, size, font, color });
}

function drawMetric(page: PDFPage, input: { x: number; y: number; width: number; label: string; value: string; valueColor: ReturnType<typeof rgb>; regular: PDFFont; bold: PDFFont }) {
  page.drawRectangle({ x: input.x, y: input.y, width: input.width, height: 60, borderColor: BORDER, borderWidth: 0.8, color: rgb(1, 1, 1) });
  page.drawText(pdfText(input.label).toUpperCase(), { x: input.x + 9, y: input.y + 41, size: 7, font: input.bold, color: MUTED });
  page.drawText(pdfText(input.value), { x: input.x + 9, y: input.y + 18, size: 12, font: input.bold, color: input.valueColor });
}

function drawSummaryPanel(page: PDFPage, input: { x: number; y: number; width: number; height: number; title: string; rows: Array<{ label: string; value: string; color?: ReturnType<typeof rgb> }>; regular: PDFFont; bold: PDFFont; empty: string }) {
  page.drawRectangle({ x: input.x, y: input.y, width: input.width, height: input.height, borderColor: BORDER, borderWidth: 0.8, color: rgb(1, 1, 1) });
  page.drawText(pdfText(input.title), { x: input.x + 12, y: input.y + input.height - 22, size: 11, font: input.bold, color: NAVY });
  if (!input.rows.length) {
    page.drawText(pdfText(input.empty), { x: input.x + 12, y: input.y + input.height - 45, size: 8, font: input.regular, color: MUTED });
    return;
  }
  input.rows.forEach((row, index) => {
    const rowY = input.y + input.height - 45 - index * 15;
    page.drawText(fitText(row.label, input.regular, 8, input.width - 95), { x: input.x + 12, y: rowY, size: 8, font: input.regular, color: MUTED });
    drawRight(page, row.value, input.x + input.width - 12, rowY, input.bold, 8, row.color ?? NAVY);
  });
}

async function savePdfBlob(pdf: PDFDocument) {
  const bytes = await pdf.save();
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy.buffer], { type: "application/pdf" });
}

export async function createTreasurySummaryPdf(input: TreasuryPdfInput) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  page.drawText("IDE FAZEI - PRESTACAO DE CONTAS", { x: MARGIN, y: 804, size: 8, font: bold, color: GOLD });
  page.drawText("Resumo de Tesouraria", { x: MARGIN, y: 775, size: 22, font: bold, color: NAVY });
  page.drawText(fitText(input.churchName, bold, 11, PAGE_WIDTH - MARGIN * 2), { x: MARGIN, y: 755, size: 11, font: bold, color: NAVY });
  const issuedAt = new Date().toLocaleString("pt-BR");
  page.drawText(fitText(`${input.periodLabel} - ${input.accountLabel} - Emitido em ${issuedAt}`, regular, 8, PAGE_WIDTH - MARGIN * 2), { x: MARGIN, y: 739, size: 8, font: regular, color: MUTED });
  page.drawLine({ start: { x: MARGIN, y: 725 }, end: { x: PAGE_WIDTH - MARGIN, y: 725 }, thickness: 2, color: GOLD });

  const metricGap = 7;
  const metricWidth = (PAGE_WIDTH - MARGIN * 2 - metricGap * 3) / 4;
  const metrics = [
    { label: `Saldo ate ${formatDatePtBr(input.endDate)}`, value: formatBrl(input.data.balanceCents), color: NAVY },
    { label: "Entradas", value: formatBrl(input.data.entriesCents), color: GREEN },
    { label: "Saidas", value: formatBrl(input.data.expensesCents), color: RED },
    { label: "Resultado", value: formatBrl(input.data.resultCents), color: input.data.resultCents >= 0 ? GREEN : RED },
  ];
  metrics.forEach((metric, index) => drawMetric(page, { x: MARGIN + index * (metricWidth + metricGap), y: 648, width: metricWidth, label: metric.label, value: metric.value, valueColor: metric.color, regular, bold }));

  const accountRows = input.data.accountBalances.slice(0, 8).map(({ account, balanceCents }) => ({ label: account.name, value: formatBrl(balanceCents) }));
  if (input.data.accountBalances.length > 8) accountRows.push({ label: `+ ${input.data.accountBalances.length - 8} contas`, value: "" });
  const categoryRows = input.data.categories.slice(0, 9).map((category) => ({ label: category.categoryName, value: formatBrl(category.amountCents), color: category.type === "entrada" ? GREEN : RED }));
  if (input.data.categories.length > 9) categoryRows.push({ label: `+ ${input.data.categories.length - 9} categorias`, value: "", color: NAVY });
  const panelGap = 12;
  const panelWidth = (PAGE_WIDTH - MARGIN * 2 - panelGap) / 2;
  drawSummaryPanel(page, { x: MARGIN, y: 475, width: panelWidth, height: 153, title: "Saldos por conta", rows: accountRows, regular, bold, empty: "Nenhuma conta disponivel." });
  drawSummaryPanel(page, { x: MARGIN + panelWidth + panelGap, y: 475, width: panelWidth, height: 153, title: "Categorias no periodo", rows: categoryRows, regular, bold, empty: "Sem movimentos confirmados." });

  const confirmed = input.data.transactions.filter(({ transaction }) => transaction.status === "confirmado").length;
  const drafts = input.data.transactions.filter(({ transaction }) => transaction.status === "rascunho").length;
  const reversed = input.data.transactions.filter(({ transaction }) => transaction.status === "estornado").length;
  page.drawRectangle({ x: MARGIN, y: 370, width: PAGE_WIDTH - MARGIN * 2, height: 82, borderColor: BORDER, borderWidth: 0.8, color: rgb(1, 1, 1) });
  page.drawText("Movimentacao do periodo", { x: MARGIN + 12, y: 429, size: 11, font: bold, color: NAVY });
  const operationMetrics = [["Lancamentos", String(input.data.transactions.length)], ["Confirmados", String(confirmed)], ["Rascunhos", String(drafts)], ["Estornados", String(reversed)]];
  operationMetrics.forEach(([label, value], index) => {
    const x = MARGIN + 12 + index * 124;
    page.drawText(label.toUpperCase(), { x, y: 405, size: 6.5, font: bold, color: MUTED });
    page.drawText(value, { x, y: 385, size: 12, font: bold, color: NAVY });
  });

  page.drawText("Resumo executivo", { x: MARGIN, y: 337, size: 12, font: bold, color: NAVY });
  page.drawText(fitText(`No periodo, a igreja registrou ${formatBrl(input.data.entriesCents)} em entradas e ${formatBrl(input.data.expensesCents)} em saidas, com resultado de ${formatBrl(input.data.resultCents)}.`, regular, 8, PAGE_WIDTH - MARGIN * 2), { x: MARGIN, y: 317, size: 8, font: regular, color: MUTED });
  page.drawText("Este documento apresenta indicadores consolidados. O livro-caixa completo esta disponivel no relatorio detalhado.", { x: MARGIN, y: 302, size: 7, font: regular, color: MUTED });

  const signatureY = 218;
  const signatureWidth = 205;
  page.drawLine({ start: { x: MARGIN, y: signatureY }, end: { x: MARGIN + signatureWidth, y: signatureY }, thickness: 0.7, color: MUTED });
  page.drawLine({ start: { x: PAGE_WIDTH - MARGIN - signatureWidth, y: signatureY }, end: { x: PAGE_WIDTH - MARGIN, y: signatureY }, thickness: 0.7, color: MUTED });
  page.drawText("Tesoureiro(a)", { x: MARGIN + 70, y: signatureY - 13, size: 7, font: regular, color: NAVY });
  page.drawText("Pastor(a) responsavel", { x: PAGE_WIDTH - MARGIN - signatureWidth + 61, y: signatureY - 13, size: 7, font: regular, color: NAVY });
  page.drawLine({ start: { x: MARGIN, y: 145 }, end: { x: PAGE_WIDTH - MARGIN, y: 145 }, thickness: 0.5, color: BORDER });
  page.drawText(fitText(`Periodo de ${formatDatePtBr(input.startDate)} a ${formatDatePtBr(input.endDate)}. Valores expressos em reais, pelo regime de caixa.`, regular, 6.5, PAGE_WIDTH - MARGIN * 2), { x: MARGIN, y: 128, size: 6.5, font: regular, color: MUTED });
  page.drawText("Resumo de uma pagina gerado pelo modulo Tesouraria da Ide Fazei.", { x: MARGIN, y: 116, size: 6.5, font: regular, color: MUTED });
  drawRight(page, "1/1", PAGE_WIDTH - MARGIN, 21, regular, 6.5, MUTED);

  return savePdfBlob(pdf);
}

export async function createTreasuryReportPdf(input: TreasuryPdfInput) {
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
  page.drawText("IDE FAZEI - PRESTACAO DE CONTAS", { x: MARGIN, y: 804, size: 8, font: bold, color: GOLD });
  page.drawText("Relatorio de Tesouraria", { x: MARGIN, y: 775, size: 22, font: bold, color: NAVY });
  page.drawText(fitText(input.churchName, bold, 11, PAGE_WIDTH - MARGIN * 2), { x: MARGIN, y: 755, size: 11, font: bold, color: NAVY });
  const issuedAt = new Date().toLocaleString("pt-BR");
  page.drawText(fitText(`${input.periodLabel} - ${input.accountLabel} - Emitido em ${issuedAt}`, regular, 8, PAGE_WIDTH - MARGIN * 2), { x: MARGIN, y: 739, size: 8, font: regular, color: MUTED });
  page.drawLine({ start: { x: MARGIN, y: 725 }, end: { x: PAGE_WIDTH - MARGIN, y: 725 }, thickness: 2, color: GOLD });

  const metricGap = 7;
  const metricWidth = (PAGE_WIDTH - MARGIN * 2 - metricGap * 3) / 4;
  const metrics = [
    { label: `Saldo ate ${formatDatePtBr(input.endDate)}`, value: formatBrl(input.data.balanceCents), color: NAVY },
    { label: "Entradas", value: formatBrl(input.data.entriesCents), color: GREEN },
    { label: "Saidas", value: formatBrl(input.data.expensesCents), color: RED },
    { label: "Resultado", value: formatBrl(input.data.resultCents), color: input.data.resultCents >= 0 ? GREEN : RED },
  ];
  metrics.forEach((metric, index) => drawMetric(page, { x: MARGIN + index * (metricWidth + metricGap), y: 648, width: metricWidth, label: metric.label, value: metric.value, valueColor: metric.color, regular, bold }));

  const accountRows = input.data.accountBalances.slice(0, 6).map(({ account, balanceCents }) => ({ label: account.name, value: formatBrl(balanceCents) }));
  if (input.data.accountBalances.length > 6) accountRows.push({ label: `+ ${input.data.accountBalances.length - 6} contas`, value: "" });
  const categoryRows = input.data.categories.slice(0, 7).map((category) => ({ label: category.categoryName, value: formatBrl(category.amountCents), color: category.type === "entrada" ? GREEN : RED }));
  if (input.data.categories.length > 7) categoryRows.push({ label: `+ ${input.data.categories.length - 7} categorias`, value: "", color: NAVY });
  const panelGap = 12;
  const panelWidth = (PAGE_WIDTH - MARGIN * 2 - panelGap) / 2;
  drawSummaryPanel(page, { x: MARGIN, y: 500, width: panelWidth, height: 128, title: "Saldos por conta", rows: accountRows, regular, bold, empty: "Nenhuma conta disponivel." });
  drawSummaryPanel(page, { x: MARGIN + panelWidth + panelGap, y: 500, width: panelWidth, height: 128, title: "Categorias no periodo", rows: categoryRows, regular, bold, empty: "Sem movimentos confirmados." });

  page.drawText("Livro-caixa", { x: MARGIN, y: 475, size: 14, font: bold, color: NAVY });
  let y = 452;
  const columns = {
    date: MARGIN,
    description: MARGIN + 55,
    account: MARGIN + 210,
    method: MARGIN + 300,
    status: MARGIN + 365,
    amountRight: PAGE_WIDTH - MARGIN,
  };

  const drawTableHeader = (target: PDFPage, top: number) => {
    target.drawRectangle({ x: MARGIN, y: top - 16, width: PAGE_WIDTH - MARGIN * 2, height: 18, color: SOFT });
    target.drawText("DATA", { x: columns.date + 4, y: top - 11, size: 6.8, font: bold, color: NAVY });
    target.drawText("CATEGORIA E DESCRICAO", { x: columns.description, y: top - 11, size: 6.8, font: bold, color: NAVY });
    target.drawText("CONTA", { x: columns.account, y: top - 11, size: 6.8, font: bold, color: NAVY });
    target.drawText("FORMA", { x: columns.method, y: top - 11, size: 6.8, font: bold, color: NAVY });
    target.drawText("STATUS", { x: columns.status, y: top - 11, size: 6.8, font: bold, color: NAVY });
    drawRight(target, "VALOR", columns.amountRight - 4, top - 11, bold, 6.8, NAVY);
    return top - 22;
  };

  y = drawTableHeader(page, y);
  if (!input.data.transactions.length) {
    page.drawText("Nenhum lancamento neste periodo.", { x: MARGIN + 5, y: y - 13, size: 8, font: regular, color: MUTED });
    y -= 32;
  } else {
    input.data.transactions.forEach(({ transaction, account, category }) => {
      const descriptionLines = wrapText(transaction.description || "", regular, 6.8, 145, 1);
      const rowHeight = transaction.description ? 28 : 20;
      if (y - rowHeight < 82) {
        page = addPage();
        page.drawText("Relatorio de Tesouraria", { x: MARGIN, y: 802, size: 11, font: bold, color: NAVY });
        page.drawText(fitText(`${input.churchName} - ${input.periodLabel}`, regular, 8, PAGE_WIDTH - MARGIN * 2), { x: MARGIN, y: 787, size: 8, font: regular, color: MUTED });
        y = drawTableHeader(page, 762);
      }
      const baseY = y - 12;
      page.drawText(pdfText(formatDatePtBr(transaction.transactionDate)), { x: columns.date + 4, y: baseY, size: 6.8, font: regular, color: NAVY });
      page.drawText(fitText(category.name, regular, 7.2, 145), { x: columns.description, y: baseY, size: 7.2, font: regular, color: NAVY });
      if (transaction.description) page.drawText(descriptionLines[0], { x: columns.description, y: baseY - 9, size: 6.2, font: regular, color: MUTED });
      page.drawText(fitText(account.name, regular, 6.8, 82), { x: columns.account, y: baseY, size: 6.8, font: regular, color: NAVY });
      page.drawText(fitText(paymentLabels[transaction.paymentMethod] ?? transaction.paymentMethod, regular, 6.8, 58), { x: columns.method, y: baseY, size: 6.8, font: regular, color: NAVY });
      page.drawText(fitText(transaction.status, regular, 6.8, 55), { x: columns.status, y: baseY, size: 6.8, font: regular, color: NAVY });
      drawRight(page, `${transaction.type === "entrada" ? "+" : "-"}${formatBrl(transaction.amountCents)}`, columns.amountRight - 4, baseY, bold, 6.8, transaction.type === "entrada" ? GREEN : RED);
      page.drawLine({ start: { x: MARGIN, y: y - rowHeight + 3 }, end: { x: PAGE_WIDTH - MARGIN, y: y - rowHeight + 3 }, thickness: 0.4, color: BORDER });
      y -= rowHeight;
    });
  }

  if (y < 135) {
    page = addPage();
    y = 735;
  }
  const signatureY = y - 45;
  const signatureWidth = 205;
  page.drawLine({ start: { x: MARGIN, y: signatureY }, end: { x: MARGIN + signatureWidth, y: signatureY }, thickness: 0.7, color: MUTED });
  page.drawLine({ start: { x: PAGE_WIDTH - MARGIN - signatureWidth, y: signatureY }, end: { x: PAGE_WIDTH - MARGIN, y: signatureY }, thickness: 0.7, color: MUTED });
  page.drawText("Tesoureiro(a)", { x: MARGIN + 70, y: signatureY - 13, size: 7, font: regular, color: NAVY });
  page.drawText("Pastor(a) responsavel", { x: PAGE_WIDTH - MARGIN - signatureWidth + 61, y: signatureY - 13, size: 7, font: regular, color: NAVY });
  page.drawLine({ start: { x: MARGIN, y: signatureY - 45 }, end: { x: PAGE_WIDTH - MARGIN, y: signatureY - 45 }, thickness: 0.5, color: BORDER });
  page.drawText(fitText(`Periodo de ${formatDatePtBr(input.startDate)} a ${formatDatePtBr(input.endDate)}. Valores expressos em reais, pelo regime de caixa.`, regular, 6.5, PAGE_WIDTH - MARGIN * 2), { x: MARGIN, y: signatureY - 61, size: 6.5, font: regular, color: MUTED });
  page.drawText("Documento gerado pelo modulo Tesouraria da Ide Fazei.", { x: MARGIN, y: signatureY - 72, size: 6.5, font: regular, color: MUTED });

  pages.forEach((currentPage, index) => {
    const label = `${index + 1}/${pages.length}`;
    drawRight(currentPage, label, PAGE_WIDTH - MARGIN, 21, regular, 6.5, MUTED);
  });

  return savePdfBlob(pdf);
}
