# Radar Espiritual — desenho funcional

## Objetivo

O Radar Espiritual é uma central de **sinais objetivos de atenção pastoral**. Ele não diagnostica a vida espiritual, não rotula pessoas e não substitui o discernimento pastoral. Cada sinal deve mostrar a evidência operacional e uma próxima ação sugerida.

## Escopo e privacidade

Todas as consultas devem filtrar por `churchId`. Pastores locais e presidente podem ver a fila completa do próprio tenant. Perfis não pastorais recebem somente pessoas sob sua responsabilidade conforme `getJourneyManagedPersonIds` e `requireJourneyStagePermission`. O Radar não deve devolver telefone, WhatsApp, CPF, endereço ou notas pastorais; a ficha detalhada permanece protegida pelas permissões existentes.

## Sinais da primeira versão

| Sinal | Evidência | Prioridade | Próxima ação |
|---|---|---:|---|
| Consolidação pendente | Nova alma sem registro de consolidação | Alta | Abrir/atribuir Consolidação |
| Primeiro contato pendente | Consolidação existente sem primeiro contato | Alta | Registrar primeiro contato |
| Visita pendente ou atrasada | Visita solicitada/agendada sem conclusão; agenda vencida | Alta ou média | Abrir Visita e atribuir responsável |
| Follow-up vencido | Follow-up com `nextActionAt` anterior ao momento atual e sem ação posterior | Alta | Registrar retorno ou reagendar |
| Sem responsável | Pessoa ativa sem `care_assignments` ativo | Alta | Definir responsável |
| Sem célula | Pessoa ativa sem membro ativo em célula | Média | Encaminhar para uma célula |
| Sem discipulador | Pessoa em etapa que requer acompanhamento sem `discipledById` | Média | Definir discipulador |
| Ausências recentes | Duas ou mais ausências consecutivas em reuniões de célula | Média | Verificar situação antes de concluir afastamento |
| Sem curso de formação | Pessoa ativa sem matrícula ativa/concluída em curso | Normal | Recomendar curso adequado |

A pontuação é transparente: cada sinal tem peso documentado; a prioridade final é `alta` quando existe qualquer sinal de consolidação, visita vencida, follow-up vencido ou ausência de responsável; `media` para ausência de célula, discipulador ou ausências; e `normal` para recomendação de formação. O usuário sempre vê as razões que produziram a prioridade.

## Ações da primeira versão

O Radar deve permitir abrir a ficha da Pessoa, ir para a Central de Cuidado, abrir a Consolidação/Visita relacionada e registrar primeiro contato quando a autorização existente permitir. Não será criado um novo mecanismo paralelo de atribuição: as ações devem chamar os procedimentos já existentes e invalidar as filas correspondentes.

## Contrato proposto

`dashboard.radarEspiritual` continuará existindo para os contadores do Dashboard. A nova rota dedicada usará um procedimento `radar.list` ou equivalente, retornando `summary`, `items`, `availableSignals` e `scope`. Cada item conterá apenas identificação mínima, etapa, célula, prioridade, score, sinais, evidências, próxima ação e referências internas de navegação. O backend calculará o escopo a partir da sessão; `churchId` recebido será validado por `requireChurchMember`.

## Evolução futura

A segunda etapa pode incluir tendências de eventos, tarefas pastorais, aniversários, aconselhamento e análise temporal. Esses sinais só devem ser ativados quando houver dados consistentes e uma ação pastoral claramente definida; não serão usados como diagnóstico automático.
