# Validação — Fase 60: Calendário de Escalas e Conflitos

Cada item de escala novo recebe data, início e término. O servidor confirma que a pessoa participa do Ministério e da mesma igreja antes de consultar qualquer sobreposição. Uma escala é bloqueada quando o mesmo voluntário possui intervalo sobreposto na mesma data; horários sem sobreposição, inclusive quando um termina exatamente no início do outro, permanecem permitidos.

| Controle validado | Resultado |
| --- | --- |
| Isolamento | Busca de conflitos filtra igreja, pessoa e data da escala |
| Autorização | A criação mantém o guard de membro e a regra de participação ativa no Ministério |
| Conflitos | Sobreposição é bloqueada no servidor e pré-sinalizada na interface |
| Calendário | Dias e itens com conflito recebem destaque visual; detalhes mostram nome, Ministério e horário |
| Regressões | TypeScript aprovado; 104 testes Vitest aprovados |
| Mobile sem sessão | A rota protegida redireciona corretamente ao login |
