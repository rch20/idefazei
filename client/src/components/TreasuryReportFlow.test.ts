// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildReportHtml,
  filterTreasuryReports,
  reportShareText,
  shareReport,
} from "./TreasuryServiceSection";

type TestReport = Parameters<typeof reportShareText>[0];

function makeReport(overrides: Partial<TestReport> = {}): TestReport {
  return {
    id: 42,
    serviceId: 7,
    version: 1,
    status: "emitido",
    snapshot: {
      service: {
        name: "Culto de domingo",
        serviceDate: "2026-10-04",
        startTime: "18:00",
        location: "Templo central",
      },
      countSheet: {
        cashCents: 10000,
        pixCents: 2500,
        transferCents: 0,
        cardCents: 0,
        checkCents: 0,
        otherCents: 0,
        totalCents: 12500,
        notes: "Conferido pelos contadores",
      },
      counters: { one: "Pessoa A", two: "Pessoa B" },
      deposit: null,
      transactions: [
        { type: "entrada", amountCents: 12500, description: "Oferta", status: "confirmado" },
      ],
      issuedAt: "2026-10-04T21:00:00.000Z",
    },
    issuedAt: "2026-10-04T21:00:00.000Z",
    signedByCounterOneAt: null,
    signedByCounterTwoAt: null,
    signedByTreasurerAt: null,
    signedByPastorAt: null,
    ...overrides,
  };
}

function setNavigatorProperty(name: string, value: unknown) {
  Object.defineProperty(navigator, name, {
    configurable: true,
    value,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const name of ["share", "canShare", "clipboard"]) {
    delete (navigator as unknown as Record<string, unknown>)[name];
  }
});

describe("fluxo automatizado do relatório da Tesouraria", () => {
  it("gera HTML auditável com status, assinaturas e escape de conteúdo", () => {
    const report = makeReport({
      status: "assinado",
      signedByPastorAt: "2026-10-04T22:00:00.000Z",
    });

    const html = buildReportHtml({ ...report, snapshot: { ...report.snapshot, service: { ...report.snapshot.service, name: "Culto <principal>" } } });

    expect(html).toContain("Documento assinado");
    expect(html).toContain("Pastor(a) responsável · assinado em");
    expect(html).toContain("&lt;principal&gt;");
    expect(html).not.toContain("<principal>");
    expect(html).toContain("Lançamentos vinculados");
  });

  it("calcula o resumo com a quantidade auditável de assinaturas", () => {
    const report = makeReport({
      signedByCounterOneAt: "2026-10-04T21:30:00.000Z",
      signedByTreasurerAt: "2026-10-04T21:45:00.000Z",
    });

    expect(reportShareText(report)).toContain("2/4 assinaturas auditáveis");
    expect(reportShareText(report)).toMatch(/R\$\s*125,00/);
  });

  it("compartilha o arquivo HTML pelo mecanismo nativo quando disponível", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);
    setNavigatorProperty("share", share);
    setNavigatorProperty("canShare", canShare);

    await expect(shareReport(makeReport())).resolves.toBe(true);

    expect(canShare).toHaveBeenCalledTimes(1);
    expect(share).toHaveBeenCalledTimes(1);
    const payload = share.mock.calls[0][0] as ShareData;
    expect(payload.title).toContain("Culto de domingo");
    expect(payload.text).toContain("0/4 assinaturas auditáveis");
    expect(payload.files).toHaveLength(1);
    expect(payload.files?.[0].name).toBe("prestacao-42-v1.html");
    expect(payload.files?.[0].type).toBe("text/html");
  });

  it("usa o clipboard como fallback quando o compartilhamento nativo não está disponível", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setNavigatorProperty("clipboard", { writeText });

    await expect(shareReport(makeReport({ signedByPastorAt: "2026-10-04T22:00:00.000Z" }))).resolves.toBe(false);

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toContain("1/4 assinaturas auditáveis");
  });

  it("retorna fallback neutro quando não há APIs de compartilhamento no navegador", async () => {
    await expect(shareReport(makeReport())).resolves.toBe(false);
  });

  it("filtra relatórios por data exata, culto e intervalo", () => {
    const sunday = makeReport();
    const wednesday = makeReport({
      id: 43,
      serviceId: 8,
      snapshot: {
        ...sunday.snapshot,
        service: { ...sunday.snapshot.service, name: "Culto de quarta", serviceDate: "2026-10-07" },
      },
    });

    expect(filterTreasuryReports([sunday, wednesday], { date: "2026-10-04" })).toEqual([sunday]);
    expect(filterTreasuryReports([sunday, wednesday], { serviceId: "8" })).toEqual([wednesday]);
    expect(filterTreasuryReports([sunday, wednesday], { from: "2026-10-05", to: "2026-10-07" })).toEqual([wednesday]);
  });
});
