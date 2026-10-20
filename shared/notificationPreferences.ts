/** Catálogo dos avisos do sistema que a igreja pode ligar ou desligar. */
export const NOTIFICATION_EVENT_CATALOG = [
  { type: "cadastro_pendente", group: "Pessoas", label: "Cadastro aguardando aprovação", description: "Alguém pediu acesso à igreja e precisa ser aprovado." },
  { type: "pessoa_aprovada", group: "Pessoas", label: "Pessoa aprovada", description: "Um cadastro foi aprovado e a pessoa já pode entrar." },
  { type: "responsabilidade_atribuida", group: "Pessoas", label: "Responsabilidade atribuída", description: "Alguém recebeu uma pessoa para acompanhar." },
  { type: "encaminhamento_sem_aceite", group: "Pessoas", label: "Encaminhamento sem aceite", description: "Um encaminhamento ficou sem resposta de quem deveria aceitar." },
  { type: "visita_agendada", group: "Visitas", label: "Visita agendada", description: "Uma visita foi marcada para você ou sua equipe." },
  { type: "lembrete_visita", group: "Visitas", label: "Lembrete de visita", description: "Lembrete de uma visita que se aproxima." },
  { type: "visita_nao_realizada", group: "Visitas", label: "Visita não realizada", description: "Uma visita marcada não foi registrada como realizada." },
  { type: "funcao_ministerial_atribuida", group: "Ministérios e escalas", label: "Função em ministério atribuída", description: "Alguém recebeu uma função dentro de um ministério." },
  { type: "escala_atribuida", group: "Ministérios e escalas", label: "Nova escala atribuída", description: "Uma pessoa ou equipe foi escalada." },
  { type: "escala_alterada", group: "Ministérios e escalas", label: "Escala alterada", description: "Data, horário ou função de uma escala mudou." },
  { type: "escala_cancelada", group: "Ministérios e escalas", label: "Escala cancelada", description: "Uma escala foi cancelada." },
  { type: "lembrete_escala", group: "Ministérios e escalas", label: "Lembrete de escala", description: "Lembrete de uma escala que se aproxima." },
  { type: "escala_confirmada", group: "Ministérios e escalas", label: "Presença confirmada na escala", description: "Uma pessoa confirmou presença; avisa pastores e o líder do ministério." },
  { type: "evento_igreja", group: "Igreja e células", label: "Evento da igreja", description: "Um evento novo ou atualizado da igreja." },
  { type: "comunicado_lideranca", group: "Igreja e células", label: "Comunicado da liderança", description: "Um comunicado enviado à liderança." },
  { type: "celula_encontro_registrado", group: "Igreja e células", label: "Encontro de célula registrado", description: "Uma célula registrou o encontro da semana." },
  { type: "celula_aviso", group: "Igreja e células", label: "Aviso de célula", description: "Um aviso enviado aos participantes de uma célula." },
] as const;

export type NotificationEventCatalogType = (typeof NOTIFICATION_EVENT_CATALOG)[number]["type"];
export const NOTIFICATION_EVENT_TYPES = NOTIFICATION_EVENT_CATALOG.map((item) => item.type) as [NotificationEventCatalogType, ...NotificationEventCatalogType[]];
