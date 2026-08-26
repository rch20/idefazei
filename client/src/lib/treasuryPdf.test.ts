import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { createTreasuryReportPdf, treasuryPdfFileName } from "./treasuryPdf";

function reportInput(transactionCount = 0) {
  return {
    churchName: "Cristã Viver",
    periodLabel: "agosto de 2026",
    startDate: "2026-08-01",
    endDate: "2026-08-31",
    accountLabel: "Todas as contas",
    data: {
      entriesCents: 20000,
      expensesCents: 5000,
      resultCents: 15000,
      balanceCents: 15000,
      accountBalances: [{ account: { id: 1, name: "Caixa" }, balanceCents: 15000 }],
      categories: [{ categoryId: 1, categoryName: "Oferta", type: "entrada" as const, amountCents: 20000 }],
      transactions: Array.from({ length: transactionCount }, (_, index) => ({
        transaction: {
          id: index + 1,
          type: index % 3 === 0 ? "saida" as const : "entrada" as const,
          amountCents: 1000 + index * 50,
          transactionDate: `2026-08-${String((index % 28) + 1).padStart(2, "0")}`,
          paymentMethod: "pix",
          status: "confirmado" as const,
          description: `Lançamento financeiro ${index + 1}`,
        },
        account: { name: "Caixa" },
        category: { name: index % 3 === 0 ? "Manutenção" : "Oferta" },
      })),
    },
  };
}

describe("PDF compartilhável da Tesouraria", () => {
  it("gera um arquivo PDF real com assinatura binária válida", async () => {
    const blob = await createTreasuryReportPdf(reportInput());
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(blob.type).toBe("application/pdf");
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(bytes.byteLength).toBeGreaterThan(1_000);
  });

  it("pagina livros-caixa extensos sem depender da impressão HTML", async () => {
    const blob = await createTreasuryReportPdf(reportInput(80));
    const document = await PDFDocument.load(await blob.arrayBuffer());
    expect(document.getPageCount()).toBeGreaterThan(1);
  });

  it("cria um nome estável e seguro por competência", () => {
    expect(treasuryPdfFileName("2026-08")).toBe("relatorio-tesouraria-2026-08.pdf");
    expect(treasuryPdfFileName("../../segredo")).toMatch(/^relatorio-tesouraria-\d{4}-\d{2}\.pdf$/);
  });
});
