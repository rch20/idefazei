export const FOUNDATION_STAGES = [
  {
    key: "leia",
    label: "Leia",
    description: "O texto ou passagem para ler com calma.",
  },
  {
    key: "entenda",
    label: "Entenda",
    description: "A explicação e os principais ensinamentos.",
  },
  {
    key: "responda",
    label: "Responda",
    description: "A pergunta que ajuda a fixar o aprendizado.",
  },
  {
    key: "aplique",
    label: "Aplique",
    description: "A prática ou compromisso para a semana.",
  },
] as const;

export function getFoundationStageLabel(title: string, index: number) {
  const normalized = title.trim().toLocaleLowerCase("pt-BR");
  const match = FOUNDATION_STAGES.find(stage =>
    normalized.startsWith(stage.label.toLocaleLowerCase("pt-BR"))
  );
  return match?.label ?? `Etapa ${index + 1}`;
}
