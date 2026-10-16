# Implementação controlada — Ministério de Consolidação e Visitas

**Data:** 26 de agosto de 2026
**Estado de produção antes desta entrega:** uma igreja, sem Pessoas, Ministérios, Consolidações, encaminhamentos ou Visitas operacionais no momento da última auditoria. A produção permanece no commit `e9e761d` até a conclusão do deploy controlado.

## Estrutura funcional

O módulo foi estruturado como um Ministério do tipo `consolidacao`, com dois Departamentos sistêmicos: **Consolidação** e **Visitas**. Cada Departamento possui campos próprios de Líder e Supervisor. A nomeação atualiza, em uma única transação, a liderança, a supervisão, a participação da Pessoa no Ministério, a participação no Departamento e as funções departamentais correspondentes.

| Papel | Escopo operacional |
|---|---|
| Pastor | Cria a estrutura, nomeia Líder/Supervisor e gerencia todos os casos e Visitas do tenant. |
| Líder ou Supervisor de Consolidação | Visualiza e distribui a fila de casos do Departamento de Consolidação. |
| Líder ou Supervisor de Visitas | Visualiza, atribui, reagenda, devolve à fila e cancela Visitas do Departamento de Visitas. |
| Consolidador | Visualiza casos disponíveis ou atribuídos, aceita o próprio caso e registra o acompanhamento. |
| Visitador | Visualiza a Visita atribuída, acessa contato/endereço autorizado e registra a conclusão. |

A criação da estrutura é idempotente. A migração não cria automaticamente o Ministério nem os Departamentos; o Pastor executa essa configuração no próprio painel do tenant.

## Indicações para Consolidação

A indicação registra **motivo obrigatório**, observação opcional, autor, origem, data, prioridade, prazo e status. As origens aceitas são `pastoral`, `celula`, `ministerio` e `departamento`.

| Origem | Regra validada pelo backend |
|---|---|
| Pastoral | O Pastor pode indicar qualquer Pessoa ativa do próprio tenant. |
| Célula | Líder ou Supervisor pode indicar somente Pessoa vinculada à própria Célula. |
| Ministério | O Líder pode indicar somente participante ativo de Ministério sob sua gestão. |
| Departamento | Líder ou Supervisor pode indicar somente participante ativo do próprio Departamento. |

A criação do caso é transacional, bloqueia dois casos ativos para a mesma Pessoa e sempre registra a origem e o motivo apresentados na fila. O App do Líder e as telas de Ministério, Departamento e Célula usam o contrato tipado; a prioridade pode ser definida como normal, alta ou urgente nas interfaces ampliadas.

## Casos e atribuições

`consolidation_referrals` permanece como a identidade do caso. A entidade recebeu Departamento, prioridade, origem e dados de atribuição. A tabela imutável `consolidation_case_assignments` registra atribuição, reatribuição, aceite e devolução à fila.

Pastores, Líderes e Supervisores de Consolidação podem atribuir ou reatribuir casos. O Consolidador só aceita caso disponível ou destinado a ele. Contato telefônico só é exposto ao gestor autorizado ou ao responsável depois do aceite. Casos encerrados ou cancelados não podem ser reatribuídos.

## Visitas

A tabela `care_visits` fornece **ID próprio** para cada Visita, com caso, Departamento, solicitante, Visitador, prioridade, status, agenda, conclusão e cancelamento. `care_visit_events` preserva criação, atribuição, reatribuição, agendamento, reagendamento, início, conclusão e cancelamento.

A devolução de uma Visita à fila remove o responsável sem apagar a agenda nem o histórico. Uma Visita realizada não pode ser cancelada; uma Visita cancelada não pode ser concluída. A Central de Cuidado consulta as Visitas persistidas, em vez de reconstruí-las a partir do último acompanhamento legado. As colunas legadas de Visita em `consolidation_follow_ups` continuam preservadas nesta entrega para compatibilidade histórica.

## Migração 0035

A migração `drizzle/0035_awesome_richard_fisk.sql` é aditiva, exceto pela extensão do enum `ministries.type` com `consolidacao`.

| Alteração | Finalidade |
|---|---|
| `departments.systemKey` e `departments.supervisorId` | Identificar os Departamentos sistêmicos e sua supervisão. |
| Campos em `consolidation_referrals` | Registrar origem, prioridade, Departamento e atribuição do caso. |
| `consolidation_case_assignments` | Preservar o histórico imutável de distribuição dos casos. |
| `care_visits` | Manter Visitas com identidade e ciclo próprios. |
| `care_visit_events` | Preservar o histórico operacional das Visitas. |
| Índices por `churchId` | Otimizar fila, responsável, status, prazo e histórico dentro do tenant. |

A validação estrutural do Drizzle foi executada com `drizzle-kit check` e retornou **Everything's fine**. Na VPS, a aplicação não deve enviar os marcadores `--> statement-breakpoint` diretamente ao cliente MySQL. O arquivo será copiado para uma versão temporária com esses marcadores removidos e será aplicado apenas depois do dump integral do banco.

## Evidências locais

| Validação | Resultado |
|---|---|
| TypeScript (`pnpm check`) | Aprovado. |
| Testes dirigidos de discipulado | 114 de 114 aprovados. |
| Suíte completa | 229 de 229 testes aprovados em 28 arquivos. |
| Build de produção | Aprovado. |
| Integridade das migrações | Aprovada pelo `drizzle-kit check`. |
| `git diff --check` | Aprovado antes da revisão final. |

Os testes cobrem estrutura idempotente, nomeação pastoral, origem e escopo de Célula, bloqueio de duplicidade ativa, atribuição/devolução à fila, conclusão autorizada de Visita, bloqueio por Visitador indevido e isolamento por igreja já exercitado pela suíte existente.

## Deploy e rollback

Antes do deploy serão registrados commit atual, árvore de trabalho, serviço, porta, ambiente, banco, migrações aplicadas e espaço disponível. Serão salvos dump integral do banco e cópia do código/build vigente.

O rollback restaurará **banco, código, `dist` e serviço**. Depois da restauração serão novamente validados `systemctl`, porta local `127.0.0.1:3000`, HTTP/HTTPS, logs e presença/ausência das estruturas da migração. Nenhum rollback ou deploy será declarado concluído sem essas evidências.

## Critérios de aceite

| Critério | Estado local |
|---|---|
| Lideranças indicam somente Pessoas do próprio escopo | Validado. |
| Caso exibe motivo, origem, prioridade e prazo | Implementado. |
| Duplicidade ativa é bloqueada | Validado. |
| Pastor atribui Líder e Supervisor | Implementado de forma transacional. |
| Líder/Supervisor distribui casos e Visitas | Validado. |
| Visitador atua por `visitId` | Validado. |
| Ações respeitam `churchId` | Revisado e coberto pela suíte multi-tenant. |
| Botões seguem capacidades do backend | Implementado. |
| Testes, TypeScript, migração e build passam antes do deploy | Validado localmente. |

O primeiro passo operacional após a publicação será **cadastrar Pessoas e vincular a conta pastoral a uma Pessoa**; somente depois o Pastor deverá estruturar o Ministério e nomear Líderes e Supervisores.
