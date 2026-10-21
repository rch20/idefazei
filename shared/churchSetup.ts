/** Passos do trilho de configuração do primeiro acesso (todos opcionais). */
export const CHURCH_SETUP_STEP_KEYS = [
  "identidade",
  "dados",
  "redes",
  "celula",
  "estudo",
  "ministerio",
  "pix",
  "membros",
  "palavra",
] as const;

export type ChurchSetupStepKey = (typeof CHURCH_SETUP_STEP_KEYS)[number];

export const CHURCH_SETUP_STEPS: Record<ChurchSetupStepKey, { title: string; description: string; path: string; action: string }> = {
  identidade: { title: "Logo e cor da igreja", description: "Envie a logo e escolha as cores. Elas aparecem no painel, no site e nos certificados.", path: "/app/configuracoes?aba=identidade", action: "Escolher logo e cor" },
  dados: { title: "Dados e contato da igreja", description: "Endereço, telefone ou WhatsApp e horários, para o visitante saber como chegar.", path: "/app/configuracoes?aba=geral", action: "Preencher dados" },
  redes: { title: "Redes sociais", description: "Instagram, Facebook, YouTube e TikTok aparecem na página pública da igreja.", path: "/app/configuracoes?aba=geral", action: "Adicionar redes" },
  celula: { title: "Sua primeira célula", description: "Cadastre uma célula com líder, dia e local de encontro.", path: "/app/celulas", action: "Cadastrar célula" },
  estudo: { title: "Primeiro estudo de célula", description: "Escreva o estudo na plataforma ou anexe um PDF para os líderes.", path: "/app/estudos-celulas", action: "Criar estudo" },
  ministerio: { title: "Primeiro ministério", description: "Louvor, recepção, mídia ou outro. Depois dá para montar escalas.", path: "/app/ministerios", action: "Criar ministério" },
  pix: { title: "Pix da igreja", description: "Cadastre a chave para receber ofertas e doações.", path: "/app/tesouraria", action: "Cadastrar Pix" },
  membros: { title: "Membros e líderes", description: "Cadastre ou importe por planilha as pessoas da igreja.", path: "/app/pessoas", action: "Adicionar pessoas" },
  palavra: { title: "Primeira palavra do dia", description: "Publique uma mensagem curta para acompanhar a igreja durante a semana.", path: "/app/mural", action: "Publicar palavra" },
};
