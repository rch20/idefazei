export type FoundationStudyTemplateKey = "blank" | "biblico";

export type FoundationStudyTemplateBlock = {
  title: string;
  content: string;
};

/**
 * Modelo editorial simples para novos estudos.
 * Estudos já cadastrados não são alterados: o modelo só é usado na criação.
 */
export const FOUNDATION_STUDY_TEMPLATE_BLOCKS: readonly FoundationStudyTemplateBlock[] =
  [
    {
      title: "Leia",
      content:
        "Inclua aqui a passagem bíblica ou a leitura que o aluno deve fazer com calma.",
    },
    {
      title: "Entenda",
      content:
        "Explique o contexto, os principais ensinamentos e o que precisa ser compreendido.",
    },
    {
      title: "Responda",
      content:
        "Apresente a ideia principal desta etapa. Depois, adicione as perguntas e explicações abaixo desta parte.",
    },
    {
      title: "Aplique",
      content:
        "Descreva uma atividade prática ou um compromisso que o aluno poderá levar para a semana.",
    },
  ] as const;
