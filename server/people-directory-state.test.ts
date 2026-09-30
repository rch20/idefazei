import { describe, expect, it } from "vitest";
import { resolveDirectoryCareState } from "../shared/peopleDirectory";

describe("estado de cuidado do diretório", () => {
  it("mantém sem responsável como prioridade alta quando não há cuidado nem cobertura", () => {
    expect(resolveDirectoryCareState({
      hasAssignment: false,
      hasReferral: false,
      hasReferralResponsible: false,
      isOverdue: false,
      hasPastoralCoverage: false,
    })).toEqual({
      status: "sem_responsavel",
      priority: "alta",
      nextStep: "Definir responsável",
    });
  });

  it("classifica Pastor com cobertura sem cuidado como cobertura pastoral, sem gerar falso positivo", () => {
    expect(resolveDirectoryCareState({
      hasAssignment: false,
      hasReferral: false,
      hasReferralResponsible: false,
      isOverdue: false,
      hasPastoralCoverage: true,
    })).toEqual({
      status: "cobertura_pastoral",
      priority: "normal",
      nextStep: "Cobertura pastoral registrada",
    });
  });

  it("preserva o cuidado operacional quando a pessoa tem cobertura e responsável interno", () => {
    expect(resolveDirectoryCareState({
      hasAssignment: true,
      hasReferral: false,
      hasReferralResponsible: false,
      isOverdue: false,
      hasPastoralCoverage: true,
    })).toEqual({
      status: "acompanhamento",
      priority: "normal",
      nextStep: "Acompanhamento em dia",
    });
  });

  it("não deixa a cobertura esconder uma fila de Consolidação sem responsável", () => {
    expect(resolveDirectoryCareState({
      hasAssignment: false,
      hasReferral: true,
      hasReferralResponsible: false,
      isOverdue: false,
      hasPastoralCoverage: true,
    })).toEqual({
      status: "na_fila",
      priority: "media",
      nextStep: "Definir responsável",
    });
  });

  it("preserva a prioridade de um encaminhamento atrasado mesmo com cobertura cadastrada", () => {
    expect(resolveDirectoryCareState({
      hasAssignment: false,
      hasReferral: true,
      hasReferralResponsible: true,
      isOverdue: true,
      hasPastoralCoverage: true,
    })).toEqual({
      status: "atrasado",
      priority: "alta",
      nextStep: "Registrar acompanhamento",
    });
  });
});
