import { describe, expect, it } from "vitest";
import { createEventReportPdf, eventReportPdfFileName } from "./eventReportPdf";

describe("PDF do relatório de Eventos", () => {
  const baseInput = {
    churchName: "Igreja Cristã da Esperança",
    eventName: "Rede de Casais — Quatro Estações",
    startDate: "2026-09-19",
    startTime: "19:30",
    endTime: "22:00",
    location: "Igreja Central",
    registrationFeeCents: 3000,
    summary: {
      registeredCount: 2,
      attendeeCount: 3,
      checkedInAttendeeCount: 1,
      absentAttendeeCount: 0,
      expectedAmountCents: 6000,
      paidAmountCents: 3000,
      pendingAmountCents: 3000,
    },
    registrations: [
      {
        displayName: "Luiz Rocha",
        companionName: "Maria Rocha",
        participantPhone: "11999999999",
        amountCents: 3000,
        paymentStatus: "pago",
        presenceStatus: "presente",
        source: "manual",
      },
    ],
  } as const;

  it("gera um PDF válido com inscrições e resumo financeiro", async () => {
    const blob = await createEventReportPdf(baseInput);

    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(500);
    expect(eventReportPdfFileName(baseInput.eventName, baseInput.startDate)).toBe("relatorio-rede-de-casais-quatro-estacoes-19-09-2026.pdf");
  });

  it("gera um PDF válido para evento sem inscrições", async () => {
    const blob = await createEventReportPdf({
      ...baseInput,
      registrationFeeCents: 0,
      registrations: [],
      summary: { ...baseInput.summary, registeredCount: 0, attendeeCount: 0, expectedAmountCents: 0, paidAmountCents: 0, pendingAmountCents: 0 },
    });

    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(300);
  });
});
