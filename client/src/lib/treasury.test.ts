import { describe, expect, it, vi } from "vitest";
import { buildTreasuryEntrySheetEmailUrl, buildTreasuryEntrySheetWhatsAppUrl, buildTreasuryReceiptHtml, buildTreasuryReportHtml, escapeTreasuryHtml, formatApprovedOnlineContributionsDisclosure, formatDateLongPtBr, formatDatePtBr, formatEventTime, formatEventTimeRange, getCivilDateKey, getCivilDateParts, parseBrlToCents, shareTreasuryEntrySheet, treasuryEntrySheetMessageText } from "./treasury";

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
    expect(getCivilDateKey(value)).toBe("2026-09-19");
    expect(getCivilDateParts(value)).toEqual({ year: 2026, month: 9, day: 19 });
    expect(formatDatePtBr(value)).toBe("19/09/2026");
    expect(formatDateLongPtBr(value)).toContain("19");
    expect(formatDateLongPtBr(value)).toContain("2026");
  });

  it("formata o horário do Evento sem conversão de fuso", () => {
    expect(formatEventTime("19:30")).toBe("19h30");
    expect(formatEventTimeRange("19:30", null)).toBe("A partir das 19h30");
    expect(formatEventTimeRange("19:30", "21:00")).toBe("Das 19h30 às 21h");
    expect(formatEventTime("19:3")).toBe("");
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
        entriesCents: 20000, expensesCents: 5000, approvedOnlineContributionsCents: 12500, approvedOnlineContributionsCount: 2, resultCents: 15000, balanceCents: 15000,
        accountBalances: [{ account: { id: 1, name: "Caixa" }, balanceCents: 15000 }],
        categories: [{ categoryId: 1, categoryName: "Oferta", type: "entrada", amountCents: 20000 }],
        transactions: [{ transaction: { id: 1, type: "entrada", amountCents: 20000, transactionDate: "2026-08-10", paymentMethod: "pix", status: "confirmado", description: "Culto" }, account: { name: "Caixa" }, category: { name: "Oferta" } }],
      },
    });
    expect(report).toContain("Relatório de Tesouraria");
    expect(report).toContain("Livro-caixa");
    expect(report.replace(/\u00a0/g, " ")).toContain("R$ 200,00");
    expect(report).toContain("Contribuições de membros aprovadas");
    expect(report).toContain("window.print");
  });

  it("explica que o subtotal online já está dentro das entradas", () => {
    expect(formatApprovedOnlineContributionsDisclosure({ approvedOnlineContributionsCents: 12500, approvedOnlineContributionsCount: 2 })).toBe("Contribuições de membros aprovadas: R$ 125,00 (2) — já incluídas nas entradas");
  });

  it("compartilha a ficha com o arquivo quando o navegador aceita anexos", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      share,
      canShare: vi.fn().mockReturnValue(true),
      clipboard: { writeText: vi.fn() },
    });

    await expect(
      shareTreasuryEntrySheet({
        sheet: { id: 7, status: "finalizada", postingStatus: "nao_lancada", totalCents: 12500 },
        lines: [{ contributionType: "oferta", paymentMethod: "pix", amountCents: 12500 }],
        service: { name: "Culto de teste", serviceDate: "2026-09-19" },
      })
    ).resolves.toBe("shared");
    expect(share).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it("usa compartilhamento de texto e depois cópia quando o anexo falha", async () => {
    const share = vi.fn().mockRejectedValue(new Error("file not supported"));
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      share,
      canShare: vi.fn().mockReturnValue(true),
      clipboard: { writeText },
    });

    await expect(
      shareTreasuryEntrySheet({
        sheet: { id: 8, status: "finalizada", postingStatus: "lancada", totalCents: 1000 },
        lines: [{ contributionType: "dizimo", paymentMethod: "dinheiro", amountCents: 1000 }],
        service: { name: "Culto de fallback", serviceDate: "2026-09-19" },
      })
    ).resolves.toBe("copied");
    expect(share).toHaveBeenCalledTimes(2);
    expect(writeText).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it("monta rascunhos de e-mail e WhatsApp sem destinatário predefinido", () => {
    const document = {
      sheet: {
        id: 12,
        status: "rascunho",
        postingStatus: "nao_lancada",
        totalCents: 15750,
      },
      lines: [
        {
          contributionType: "oferta",
          paymentMethod: "pix",
          amountCents: 15750,
          description: "Culto de gratidão",
        },
      ],
      service: {
        name: "Culto especial",
        serviceDate: "2026-09-19",
      },
    } as const;
    const message = treasuryEntrySheetMessageText(document);
    const emailUrl = buildTreasuryEntrySheetEmailUrl(document);
    const whatsappUrl = buildTreasuryEntrySheetWhatsAppUrl(document);

    expect(message).toContain("Comprovante da ficha financeira do culto");
    expect(message).toContain("Total recebido: R$ 157,50");
    expect(emailUrl).toMatch(/^mailto:\?subject=.*&body=/);
    expect(emailUrl).not.toMatch(/mailto:[^?]+@/);
    expect(decodeURIComponent(emailUrl)).toContain("Culto especial");
    expect(whatsappUrl).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(whatsappUrl).not.toMatch(/wa\.me\/\d/);
    expect(decodeURIComponent(whatsappUrl)).toContain("não lançada");
  });
});
