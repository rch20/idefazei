import { describe, expect, it } from "vitest";
import { buildTreasuryReceiptHtml, buildTreasuryReportHtml, escapeTreasuryHtml, formatDateLongPtBr, formatDatePtBr, getCivilDateParts, parseBrlToCents } from "./treasury";

describe("utilitários da Tesouraria", () => {
  it("converte valores brasileiros em centavos sem usar ponto flutuante financeiro", () => {
    expect(parseBrlToCents("1.234,56")).toBe(123456);
    expect(parseBrlToCents("R$ 10,5")).toBe(1050);
    expect(parseBrlToCents("1.234")).toBe(123400);
    expect(parseBrlToCents("-42,90")).toBe(-4290);
  });

  it("rejeita valores vazios, textuais ou com precisão inválida", () => {
    expect(parseBrlToCents("")).toBeNull();
    expect(parseBrlToCents("abc")).toBeNull();
    expect(parseBrlToCents("10,999")).toBe(1099900);
    expect(parseBrlToCents("1,2,3")).toBeNull();
  });

  it("preserva a data civil quando recebe timestamp em meia-noite UTC", () => {
    const value = new Date("2026-09-19T00:00:00.000Z");
    expect(getCivilDateParts(value)).toEqual({ year: 2026, month: 9, day: 19 });
    expect(formatDatePtBr(value)).toBe("19/09/2026");
    expect(formatDateLongPtBr(value)).toContain("19");
    expect(formatDateLongPtBr(value)).toContain("2026");
  });

  it("escapa conteúdo financeiro antes de gerar recibos e relatórios", () => {
    expect(escapeTreasuryHtml('<script>alert("x")</script>')).toBe("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    const receipt = buildTreasuryReceiptHtml({
      churchName: "Igreja <Teste>", receiptNumber: 7, contributorName: '<img src=x onerror="x">',
      date: "2026-08-20", categoryName: "Oferta", paymentMethod: "pix", amountCents: 12500, description: "Contribuição & missão",
    });
    expect(receipt).not.toContain("<img src=x");
    expect(receipt).toContain("&lt;img src=x onerror=&quot;x&quot;&gt;");
  });

  it("gera relatório dedicado com resumo e livro-caixa", () => {
    const report = buildTreasuryReportHtml({
      churchName: "Cristã Viver", periodLabel: "agosto de 2026", startDate: "2026-08-01", endDate: "2026-08-31", accountLabel: "Todas as contas",
      data: {
        entriesCents: 20000, expensesCents: 5000, resultCents: 15000, balanceCents: 15000,
        accountBalances: [{ account: { id: 1, name: "Caixa" }, balanceCents: 15000 }],
        categories: [{ categoryId: 1, categoryName: "Oferta", type: "entrada", amountCents: 20000 }],
        transactions: [{ transaction: { id: 1, type: "entrada", amountCents: 20000, transactionDate: "2026-08-10", paymentMethod: "pix", status: "confirmado", description: "Culto" }, account: { name: "Caixa" }, category: { name: "Oferta" } }],
      },
    });
    expect(report).toContain("Relatório de Tesouraria");
    expect(report).toContain("Livro-caixa");
    expect(report.replace(/\u00a0/g, " ")).toContain("R$ 200,00");
    expect(report).toContain("window.print");
  });
});
