import { describe, expect, it } from "vitest";
import { shouldFlagLegacyConsolidationPending, shouldFlagModernFirstContactPending } from "../shared/consolidation";

describe("pendência legada de Consolidação", () => {
  it("não sinaliza uma Pessoa em Célula com registro histórico de Nova Alma", () => {
    expect(shouldFlagLegacyConsolidationPending({
      soulStatus: "nova_alma",
      discipleshipStage: "celula",
      hasLegacyConsolidation: false,
    })).toBe(false);
  });

  it("não sinaliza uma Pessoa avançada para liderança por causa do registro legado", () => {
    expect(shouldFlagLegacyConsolidationPending({
      soulStatus: "nova_alma",
      discipleshipStage: "lideranca",
      hasLegacyConsolidation: false,
    })).toBe(false);
  });

  it("sinaliza uma Nova Alma ainda nas fases iniciais sem Consolidação", () => {
    expect(shouldFlagLegacyConsolidationPending({
      soulStatus: "nova_alma",
      discipleshipStage: "nova_alma",
      hasLegacyConsolidation: false,
    })).toBe(true);
    expect(shouldFlagLegacyConsolidationPending({
      soulStatus: "nova_alma",
      discipleshipStage: "consolidacao",
      hasLegacyConsolidation: false,
    })).toBe(true);
  });

  it("não confunde status já iniciado/concluído com Consolidação não iniciada", () => {
    expect(shouldFlagLegacyConsolidationPending({
      soulStatus: "em_consolidacao",
      discipleshipStage: "consolidacao",
      hasLegacyConsolidation: false,
    })).toBe(false);
    expect(shouldFlagLegacyConsolidationPending({
      soulStatus: "consolidado",
      discipleshipStage: "nova_alma",
      hasLegacyConsolidation: false,
    })).toBe(false);
  });

  it("não gera pendência legada quando já existe Consolidação ou encaminhamento moderno", () => {
    expect(shouldFlagLegacyConsolidationPending({
      soulStatus: "nova_alma",
      discipleshipStage: "nova_alma",
      hasLegacyConsolidation: true,
    })).toBe(false);
    expect(shouldFlagLegacyConsolidationPending({
      soulStatus: "nova_alma",
      discipleshipStage: "nova_alma",
      hasLegacyConsolidation: false,
      hasActiveReferral: true,
    })).toBe(false);
  });

  it("só sinaliza primeiro contato para encaminhamento moderno assumido", () => {
    expect(shouldFlagModernFirstContactPending({
      hasActiveReferral: true,
      hasResponsible: true,
      firstContactAt: null,
    })).toBe(true);
    expect(shouldFlagModernFirstContactPending({
      hasActiveReferral: true,
      hasResponsible: true,
      firstContactAt: new Date(),
    })).toBe(false);
    expect(shouldFlagModernFirstContactPending({
      hasActiveReferral: true,
      hasResponsible: false,
      firstContactAt: null,
    })).toBe(false);
    expect(shouldFlagModernFirstContactPending({
      hasActiveReferral: false,
      hasResponsible: true,
      firstContactAt: null,
    })).toBe(false);
  });
});
