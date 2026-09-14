import { describe, expect, it } from "vitest";
import { deriveDiscipleshipDisplayState, getDiscipleshipStageLabel, isPendingNewSoul } from "./discipleshipState";

describe("estado visual de Nova Alma e Discípulo", () => {
  it("mostra Nova Alma pendente quando não existe ficha vinculada", () => {
    expect(deriveDiscipleshipDisplayState({ personId: null, discipleshipStage: "nova_alma" })).toEqual({
      kind: "cadastro_pendente",
      label: "Nova Alma — cadastro pendente",
      stage: null,
    });
    expect(isPendingNewSoul({ personId: null })).toBe(true);
  });

  it("mostra Discípulo com etapa Nova Alma quando a ficha existe", () => {
    expect(deriveDiscipleshipDisplayState({ personId: 42, discipleshipStage: "nova_alma" })).toEqual({
      kind: "disciple",
      label: "Discípulo — etapa Nova Alma",
      stage: "nova_alma",
    });
    expect(isPendingNewSoul({ personId: 42 })).toBe(false);
  });

  it("mantém a etapa principal independente do status do cadastro público", () => {
    expect(deriveDiscipleshipDisplayState({ personId: 42, discipleshipStage: "consolidacao" })).toMatchObject({
      kind: "disciple",
      label: "Discípulo — etapa Consolidação",
      stage: "consolidacao",
    });
  });

  it("usa Nova Alma como fallback para etapa desconhecida", () => {
    expect(deriveDiscipleshipDisplayState({ personId: 42, discipleshipStage: "estado_invalido" })).toEqual({
      kind: "disciple",
      label: "Discípulo — etapa Nova Alma",
      stage: "nova_alma",
    });
  });

  it("centraliza os rótulos da Jornada", () => {
    expect(getDiscipleshipStageLabel("multiplicador")).toBe("Multiplicador");
    expect(getDiscipleshipStageLabel(null)).toBe("Nova Alma");
  });
});
