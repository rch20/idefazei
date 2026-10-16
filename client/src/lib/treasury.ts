import {
  civilDateKey,
  civilDateParts,
  currentCivilDateKey,
  type CivilDateParts,
} from "./civilDate";

export type TreasuryTransactionRow = {
  transaction: {
    id: number;
    type: "entrada" | "saida";
    amountCents: number;
    transactionDate: Date | string;
    paymentMethod: string;
    status: "rascunho" | "confirmado" | "estornado";
    description?: string | null;
    reference?: string | null;
  };
  account: { name: string };
  category: { name: string };
};

export type TreasuryReportData = {
  entriesCents: number;
  expensesCents: number;
  approvedOnlineContributionsCents: number;
  approvedOnlineContributionsCount: number;
  resultCents: number;
  balanceCents: number;
  transactions: TreasuryTransactionRow[];
  accountBalances: Array<{
    account: { id: number; name: string };
    balanceCents: number;
  }>;
  categories: Array<{
    categoryId: number;
    categoryName: string;
    type: "entrada" | "saida";
    amountCents: number;
  }>;
};

export function formatBrl(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function formatApprovedOnlineContributionsDisclosure(
  data: Pick<
    TreasuryReportData,
    "approvedOnlineContributionsCents" | "approvedOnlineContributionsCount"
  >
) {
  return `Contribuições de membros aprovadas: ${formatBrl(data.approvedOnlineContributionsCents)} (${data.approvedOnlineContributionsCount}) — já incluídas nas entradas`;
}

/** Converte valores digitados em pt-BR para centavos, sem aceitar texto ou precisão acima de 2 casas. */
export function parseBrlToCents(value: string): number | null {
  const compact = value.replace(/\s|R\$/gi, "").trim();
  if (!compact || !/^-?[\d.,]+$/.test(compact)) return null;
  const negative = compact.startsWith("-");
  const unsigned = negative ? compact.slice(1) : compact;
  if (!unsigned || !/\d/.test(unsigned)) return null;

  const commaCount = (unsigned.match(/,/g) ?? []).length;
  const dotCount = (unsigned.match(/\./g) ?? []).length;
  if ((commaCount > 1 && dotCount === 0) || (dotCount > 1 && commaCount > 0))
    return null;
  if (
    dotCount > 1 &&
    commaCount === 0 &&
    unsigned
      .split(".")
      .slice(1)
      .some(group => group.length !== 3)
  )
    return null;
  const lastComma = unsigned.lastIndexOf(",");
  const lastDot = unsigned.lastIndexOf(".");
  const separatorIndex = Math.max(lastComma, lastDot);
  let integerPart = unsigned;
  let decimalPart = "";
  if (separatorIndex >= 0) {
    const candidate = unsigned.slice(separatorIndex + 1);
    if (candidate.length <= 2) {
      integerPart = unsigned.slice(0, separatorIndex);
      decimalPart = candidate;
    }
  }
  integerPart = integerPart.replace(/[.,]/g, "");
  if (
    !/^\d+$/.test(integerPart || "0") ||
    (decimalPart && !/^\d{1,2}$/.test(decimalPart))
  )
    return null;
  const units = Number(integerPart || "0");
  const fraction = Number(decimalPart.padEnd(2, "0") || "0");
  const cents = units * 100 + fraction;
  if (!Number.isSafeInteger(cents)) return null;
  return negative ? -cents : cents;
}

export type { CivilDateParts };

export function getCivilDateKey(value: Date | string) {
  return civilDateKey(value);
}

export function getCivilDateParts(value: Date | string): CivilDateParts | null {
  return civilDateParts(value);
}

export function formatDatePtBr(value: Date | string) {
  const parts = getCivilDateParts(value);
  if (!parts) return "Data inválida";
  const date = new Date(parts.year, parts.month - 1, parts.day, 12);
  return date.toLocaleDateString("pt-BR");
}

export function formatDateLongPtBr(value: Date | string) {
  const parts = getCivilDateParts(value);
  if (!parts) return "Data inválida";
  const date = new Date(parts.year, parts.month - 1, parts.day, 12);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatMonthShortPtBr(value: Date | string) {
  const parts = getCivilDateParts(value);
  if (!parts) return "Data inválida";
  return new Date(parts.year, parts.month - 1, 1, 12)
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "");
}

export function getTodayCivilDateInput(timeZone = "America/Sao_Paulo") {
  return currentCivilDateKey(timeZone);
}

export function formatEventTime(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(normalized)) return "";
  const [hours, minutes] = normalized.split(":");
  return minutes === "00" ? `${hours}h` : `${hours}h${minutes}`;
}

export function formatEventTimeRange(
  startTime: string | null | undefined,
  endTime: string | null | undefined
) {
  const start = formatEventTime(startTime);
  const end = formatEventTime(endTime);
  if (!start) return "";
  return end ? `Das ${start} às ${end}` : `A partir das ${start}`;
}

export function escapeTreasuryHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    character =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ] ?? character
  );
}

const PAYMENT_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  transferencia: "Transferência",
  cartao: "Cartão",
  cheque: "Cheque",
  outro: "Outro",
};

function financialDocumentStyles() {
  return `
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #172f4d; font-family: Arial, sans-serif; font-size: 11px; line-height: 1.4; }
    header { border-bottom: 3px solid #c9a84c; padding-bottom: 12px; margin-bottom: 20px; }
    .eyebrow { color: #9a7628; font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
    h1 { font-family: Georgia, serif; font-size: 25px; margin: 4px 0; }
    h2 { font-family: Georgia, serif; font-size: 16px; margin: 22px 0 9px; }
    .muted { color: #64748b; }
    .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 18px; }
    .metric { border: 1px solid #d9dee5; border-radius: 8px; padding: 10px; break-inside: avoid; }
    .metric span { display: block; color: #64748b; font-size: 9px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; }
    .metric strong { display: block; font-size: 15px; margin-top: 4px; }
    table { border-collapse: collapse; width: 100%; }
    thead { display: table-header-group; }
    th { background: #eef2f6; color: #172f4d; font-size: 9px; letter-spacing: .04em; padding: 7px; text-align: left; text-transform: uppercase; }
    td { border-bottom: 1px solid #e5e7eb; padding: 7px; vertical-align: top; }
    tr { break-inside: avoid; }
    .amount { text-align: right; white-space: nowrap; }
    .positive { color: #157347; }
    .negative { color: #b42318; }
    .two-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .panel { border: 1px solid #d9dee5; border-radius: 8px; padding: 10px; break-inside: avoid; }
    .summary-row { display: flex; justify-content: space-between; gap: 12px; padding: 4px 0; }
    footer { border-top: 1px solid #d9dee5; color: #64748b; font-size: 9px; margin-top: 24px; padding-top: 8px; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 42px; margin-top: 48px; text-align: center; }
    .signature { border-top: 1px solid #64748b; padding-top: 7px; }
    @media print { .no-print { display: none !important; } }
  `;
}

export function buildTreasuryReportHtml(input: {
  churchName: string;
  periodLabel: string;
  startDate: string;
  endDate: string;
  accountLabel: string;
  data: TreasuryReportData;
}) {
  const transactions = input.data.transactions;
  const transactionRows = transactions
    .map(
      ({ transaction, account, category }) => `
    <tr>
      <td>${escapeTreasuryHtml(formatDatePtBr(transaction.transactionDate))}</td>
      <td>${escapeTreasuryHtml(category.name)}${transaction.description ? `<br><span class="muted">${escapeTreasuryHtml(transaction.description)}</span>` : ""}</td>
      <td>${escapeTreasuryHtml(account.name)}</td>
      <td>${escapeTreasuryHtml(PAYMENT_LABELS[transaction.paymentMethod] ?? transaction.paymentMethod)}</td>
      <td>${escapeTreasuryHtml(transaction.status)}</td>
      <td class="amount ${transaction.type === "entrada" ? "positive" : "negative"}">${transaction.type === "entrada" ? "+" : "−"}${escapeTreasuryHtml(formatBrl(transaction.amountCents))}</td>
    </tr>`
    )
    .join("");
  const accountRows = input.data.accountBalances
    .map(
      ({ account, balanceCents }) =>
        `<div class="summary-row"><span>${escapeTreasuryHtml(account.name)}</span><strong>${escapeTreasuryHtml(formatBrl(balanceCents))}</strong></div>`
    )
    .join("");
  const categoryRows = input.data.categories
    .map(
      category =>
        `<div class="summary-row"><span>${escapeTreasuryHtml(category.categoryName)}</span><strong class="${category.type === "entrada" ? "positive" : "negative"}">${escapeTreasuryHtml(formatBrl(category.amountCents))}</strong></div>`
    )
    .join("");
  const issuedAt = new Date().toLocaleString("pt-BR");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Relatório de Tesouraria</title><style>${financialDocumentStyles()}</style></head><body>
    <header><div class="eyebrow">Ide Fazei · Prestação de contas</div><h1>Relatório de Tesouraria</h1><div><strong>${escapeTreasuryHtml(input.churchName)}</strong></div><div class="muted">${escapeTreasuryHtml(input.periodLabel)} · ${escapeTreasuryHtml(input.accountLabel)} · Emitido em ${escapeTreasuryHtml(issuedAt)}</div></header>
    <section class="metrics">
      <div class="metric"><span>Saldo até ${escapeTreasuryHtml(formatDatePtBr(input.endDate))}</span><strong>${escapeTreasuryHtml(formatBrl(input.data.balanceCents))}</strong></div>
      <div class="metric"><span>Entradas</span><strong class="positive">${escapeTreasuryHtml(formatBrl(input.data.entriesCents))}</strong></div>
      <div class="metric"><span>Saídas</span><strong class="negative">${escapeTreasuryHtml(formatBrl(input.data.expensesCents))}</strong></div>
      <div class="metric"><span>Resultado</span><strong class="${input.data.resultCents >= 0 ? "positive" : "negative"}">${escapeTreasuryHtml(formatBrl(input.data.resultCents))}</strong></div>
    </section>
    <p class="muted">${escapeTreasuryHtml(formatApprovedOnlineContributionsDisclosure(input.data))}</p>
    <section class="two-columns"><div class="panel"><h2>Saldos por conta</h2>${accountRows || '<p class="muted">Sem contas.</p>'}</div><div class="panel"><h2>Categorias no período</h2>${categoryRows || '<p class="muted">Sem movimentos confirmados.</p>'}</div></section>
    <h2>Livro-caixa</h2>
    <table><thead><tr><th>Data</th><th>Categoria e descrição</th><th>Conta</th><th>Forma</th><th>Status</th><th class="amount">Valor</th></tr></thead><tbody>${transactionRows || '<tr><td colspan="6" class="muted">Nenhum lançamento neste período.</td></tr>'}</tbody></table>
    <div class="signatures"><div class="signature">Tesoureiro(a)</div><div class="signature">Pastor(a) responsável</div></div>
    <footer>Período de ${escapeTreasuryHtml(formatDatePtBr(input.startDate))} a ${escapeTreasuryHtml(formatDatePtBr(input.endDate))}. Valores expressos em reais, pelo regime de caixa. Documento gerado pelo módulo Tesouraria da Ide Fazei.</footer>
    <script>window.addEventListener('load',()=>window.print())<\/script>
  </body></html>`;
}

export function buildTreasuryReceiptHtml(input: {
  churchName: string;
  receiptNumber: number;
  contributorName: string;
  date: Date | string;
  categoryName: string;
  paymentMethod: string;
  amountCents: number;
  description: string;
}) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Recibo ${input.receiptNumber}</title><style>${financialDocumentStyles()}</style></head><body>
    <header><div class="eyebrow">Ide Fazei · Tesouraria</div><h1>Recibo de contribuição</h1><div><strong>${escapeTreasuryHtml(input.churchName)}</strong> · Recibo nº ${input.receiptNumber}</div></header>
    <section class="two-columns"><div class="panel"><span class="muted">Recebemos de</span><h2>${escapeTreasuryHtml(input.contributorName)}</h2></div><div class="panel"><span class="muted">Data</span><h2>${escapeTreasuryHtml(formatDatePtBr(input.date))}</h2></div><div class="panel"><span class="muted">Referente a</span><h2>${escapeTreasuryHtml(input.categoryName)}</h2></div><div class="panel"><span class="muted">Forma de recebimento</span><h2>${escapeTreasuryHtml(PAYMENT_LABELS[input.paymentMethod] ?? input.paymentMethod)}</h2></div></section>
    <h2>Valor recebido</h2><p style="font-size:28px;font-weight:700;color:#157347">${escapeTreasuryHtml(formatBrl(input.amountCents))}</p><p>${escapeTreasuryHtml(input.description)}</p>
    <div class="signatures"><div class="signature">Tesoureiro(a)</div><div class="signature">Contribuinte</div></div>
    <footer>Recibo emitido eletronicamente pelo módulo Tesouraria da Ide Fazei.</footer><script>window.addEventListener('load',()=>window.print())<\/script>
  </body></html>`;
}

export type TreasuryEntrySheetDocument = {
  sheet: {
    id: number;
    status: string;
    postingStatus: string;
    totalCents: number;
    notes?: string | null;
    signedAt?: Date | string | null;
  };
  lines: Array<{
    contributionType: string;
    paymentMethod: string;
    amountCents: number;
    description?: string | null;
  }>;
  service: {
    name: string;
    serviceDate: Date | string;
    startTime?: string | null;
    location?: string | null;
  };
};

const ENTRY_SHEET_CONTRIBUTION_LABELS: Record<string, string> = {
  dizimo: "Dízimo",
  oferta: "Oferta",
  oferta_especial: "Oferta especial",
  outra: "Outra contribuição",
};

export function buildTreasuryEntrySheetHtml(
  document: TreasuryEntrySheetDocument
) {
  const { sheet, lines, service } = document;
  const rows = lines
    .map(
      line =>
        `<tr><td>${escapeTreasuryHtml(ENTRY_SHEET_CONTRIBUTION_LABELS[line.contributionType] ?? line.contributionType)}</td><td>${escapeTreasuryHtml(PAYMENT_LABELS[line.paymentMethod] ?? line.paymentMethod)}</td><td>${escapeTreasuryHtml(line.description ?? "—")}</td><td class="amount">${escapeTreasuryHtml(formatBrl(line.amountCents))}</td></tr>`
    )
    .join("");
  const signedLabel = sheet.signedAt
    ? `Assinada em ${formatDatePtBr(sheet.signedAt)}`
    : "Assinatura não realizada";
  const postingLabel =
    sheet.postingStatus === "lancada"
      ? "Lançada no livro-caixa"
      : "Ainda não lançada no livro-caixa";
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Ficha financeira do culto</title><style>${financialDocumentStyles()}</style></head><body>
    <header><div class="eyebrow">Ide Fazei · Relatórios de cultos</div><h1>Ficha financeira do culto</h1><div><strong>${escapeTreasuryHtml(service.name)}</strong></div><div class="muted">${escapeTreasuryHtml(formatDatePtBr(service.serviceDate))}${service.startTime ? ` · ${escapeTreasuryHtml(service.startTime)}` : ""}${service.location ? ` · ${escapeTreasuryHtml(service.location)}` : ""} · Ficha nº ${sheet.id}</div></header>
    <section class="metrics"><div class="metric"><span>Total recebido</span><strong>${escapeTreasuryHtml(formatBrl(sheet.totalCents))}</strong></div><div class="metric"><span>Linhas</span><strong>${lines.length}</strong></div><div class="metric"><span>Assinatura</span><strong>${escapeTreasuryHtml(signedLabel)}</strong></div><div class="metric"><span>Livro-caixa</span><strong>${escapeTreasuryHtml(postingLabel)}</strong></div></section>
    <h2>Contribuições recebidas</h2><table><thead><tr><th>Tipo</th><th>Forma</th><th>Descrição</th><th class="amount">Valor</th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="muted">Nenhuma contribuição informada.</td></tr>'}</tbody></table>
    <section class="panel" style="margin-top:18px"><strong>Observações</strong><p class="muted">${escapeTreasuryHtml(sheet.notes || "Nenhuma")}</p></section>
    <div class="signatures"><div class="signature">Tesoureiro(a)</div><div class="signature">Pastor(a) responsável</div></div>
    <footer>Documento gerado a partir da ficha financeira do culto. O saldo da Tesouraria só é alterado quando o lançamento protegido estiver marcado como lançado.</footer>
    <script>window.addEventListener('load',()=>window.print())<\/script>
  </body></html>`;
}

export function treasuryEntrySheetShareText(
  document: TreasuryEntrySheetDocument
) {
  const { sheet, service } = document;
  return `Ficha financeira — ${service.name} · ${formatDatePtBr(service.serviceDate)} · Total recebido: ${formatBrl(sheet.totalCents)} · ${sheet.signedAt ? "assinada" : "assinatura pendente"} · ${sheet.postingStatus === "lancada" ? "lançada no livro-caixa" : "não lançada no livro-caixa"}.`;
}

function normalizeTreasuryMessagePart(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

export function treasuryEntrySheetMessageText(
  document: TreasuryEntrySheetDocument
) {
  const { sheet, lines, service } = document;
  const serviceName = normalizeTreasuryMessagePart(service.name) || "Culto";
  const lineText = lines
    .map(line => {
      const contribution =
        ENTRY_SHEET_CONTRIBUTION_LABELS[line.contributionType] ??
        (normalizeTreasuryMessagePart(line.contributionType) || "Contribuição");
      const payment =
        PAYMENT_LABELS[line.paymentMethod] ??
        (normalizeTreasuryMessagePart(line.paymentMethod) || "Forma não informada");
      const description = normalizeTreasuryMessagePart(line.description);
      return `- ${contribution} (${payment})${description ? ` — ${description}` : ""}: ${formatBrl(line.amountCents)}`;
    })
    .join("\n");

  return [
    "Comprovante da ficha financeira do culto",
    `Culto: ${serviceName}`,
    `Data: ${formatDatePtBr(service.serviceDate)}`,
    `Ficha nº: ${sheet.id}`,
    "",
    "Contribuições:",
    lineText || "- Nenhuma contribuição informada",
    `Total recebido: ${formatBrl(sheet.totalCents)}`,
    `Assinatura: ${sheet.signedAt ? `realizada em ${formatDatePtBr(sheet.signedAt)}` : "não realizada"}`,
    `Livro-caixa: ${sheet.postingStatus === "lancada" ? "lançada" : "não lançada"}`,
  ].join("\n");
}

export function buildTreasuryEntrySheetEmailUrl(
  document: TreasuryEntrySheetDocument
) {
  const subject = `Comprovante — ficha financeira do culto · ${normalizeTreasuryMessagePart(document.service.name) || "Culto"}`;
  const body = treasuryEntrySheetMessageText(document);
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function buildTreasuryEntrySheetWhatsAppUrl(
  document: TreasuryEntrySheetDocument
) {
  return `https://wa.me/?text=${encodeURIComponent(treasuryEntrySheetMessageText(document))}`;
}

export type TreasuryEntrySheetShareResult = "shared" | "copied";

async function copyTreasuryEntrySheetText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  if (typeof document === "undefined" || !document.body) return false;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  let copied = false;
  try {
    copied = Boolean(document.execCommand?.("copy"));
  } finally {
    textarea.remove();
  }
  return copied;
}

export async function shareTreasuryEntrySheet(
  document: TreasuryEntrySheetDocument
): Promise<TreasuryEntrySheetShareResult> {
  const text = treasuryEntrySheetShareText(document);
  const file = new File(
    [buildTreasuryEntrySheetHtml(document)],
    `ficha-culto-${document.sheet.id}.html`,
    { type: "text/html", lastModified: Date.now() }
  );
  const shareData: ShareData = {
    title: `Ficha financeira — ${document.service.name}`,
    text,
    files: [file],
  };
  if (navigator.share) {
    if (!navigator.canShare || navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return "shared";
      } catch (error) {
        if ((error as { name?: string })?.name === "AbortError") throw error;
      }
    }
    try {
      await navigator.share({ title: shareData.title, text });
      return "shared";
    } catch (error) {
      if ((error as { name?: string })?.name === "AbortError") throw error;
    }
  }
  if (await copyTreasuryEntrySheetText(text)) return "copied";
  throw new Error("SHARE_UNAVAILABLE");
}

export function openTreasuryPrintDocument(html: string) {
  const printWindow = window.open("", "_blank", "width=980,height=800");
  if (!printWindow) return false;
  printWindow.opener = null;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  return true;
}
