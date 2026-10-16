export type DirectoryCareStatus =
  | "sem_responsavel"
  | "na_fila"
  | "atrasado"
  | "acompanhamento"
  | "em_dia"
  | "cobertura_pastoral";

export type DirectoryCareStateInput = {
  hasAssignment: boolean;
  hasReferral: boolean;
  hasReferralResponsible: boolean;
  isOverdue: boolean;
  hasPastoralCoverage: boolean;
};

export type DirectoryCareState = {
  status: DirectoryCareStatus;
  priority: "alta" | "media" | "normal";
  nextStep: string;
};

/**
 * A cobertura pastoral é uma relação administrativa do Pastor e não substitui
 * o cuidado operacional. Ela evita o falso positivo de "Sem responsável",
 * mas nunca preenche responsibleName nem cria um care assignment.
 */
export function resolveDirectoryCareState(input: DirectoryCareStateInput): DirectoryCareState {
  const hasResponsible = input.hasAssignment || (input.hasReferral && input.hasReferralResponsible);
  const status: DirectoryCareStatus = input.isOverdue
    ? "atrasado"
    : input.hasReferral && !hasResponsible
      ? "na_fila"
      : input.hasAssignment || input.hasReferral
        ? "acompanhamento"
        : input.hasPastoralCoverage
          ? "cobertura_pastoral"
          : "sem_responsavel";

  return {
    status,
    priority: status === "atrasado" || status === "sem_responsavel"
      ? "alta"
      : status === "na_fila"
        ? "media"
        : "normal",
    nextStep: status === "atrasado"
      ? "Registrar acompanhamento"
      : status === "na_fila" || status === "sem_responsavel"
        ? "Definir responsável"
        : status === "cobertura_pastoral"
          ? "Cobertura pastoral registrada"
          : "Acompanhamento em dia",
  };
}
