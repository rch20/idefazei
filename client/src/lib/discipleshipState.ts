export const DISCIPLESHIP_STAGE_LABELS = {
  nova_alma: "Nova Alma",
  consolidacao: "Consolidação",
  fundamentos: "Fundamentos",
  celula: "Célula",
  batismo: "Batismo",
  encontro_com_deus: "Encontro com Deus",
  escola_de_lideres: "Escola de Líderes",
  lideranca: "Liderança",
  multiplicador: "Multiplicador",
} as const;

export type DiscipleshipStage = keyof typeof DISCIPLESHIP_STAGE_LABELS;

export type DiscipleshipDisplayState =
  | {
      kind: "cadastro_pendente";
      label: "Nova Alma — cadastro pendente";
      stage: null;
    }
  | {
      kind: "disciple";
      label: string;
      stage: DiscipleshipStage;
    };

export function getDiscipleshipStageLabel(stage: string | null | undefined) {
  return stage && stage in DISCIPLESHIP_STAGE_LABELS
    ? DISCIPLESHIP_STAGE_LABELS[stage as DiscipleshipStage]
    : DISCIPLESHIP_STAGE_LABELS.nova_alma;
}

export function deriveDiscipleshipDisplayState(input: {
  personId: number | null | undefined;
  discipleshipStage?: string | null;
}): DiscipleshipDisplayState {
  if (!input.personId) {
    return {
      kind: "cadastro_pendente",
      label: "Nova Alma — cadastro pendente",
      stage: null,
    };
  }

  const stage = input.discipleshipStage && input.discipleshipStage in DISCIPLESHIP_STAGE_LABELS
    ? input.discipleshipStage as DiscipleshipStage
    : "nova_alma";

  return {
    kind: "disciple",
    label: `Discípulo — etapa ${getDiscipleshipStageLabel(stage)}`,
    stage,
  };
}

export function isPendingNewSoul(input: { personId: number | null | undefined }) {
  return !input.personId;
}
