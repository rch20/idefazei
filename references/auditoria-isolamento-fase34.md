# Auditoria de Isolamento por Tenant, Hierarquia e Escopo Pastoral

## Escopo da revisão

>A auditoria revisou as rotas tRPC e os helpers de persistência que tratam dados de igrejas, Pessoas, Células, cuidado, aconselhamento, Eventos, matrículas, relatórios e rotas públicas. O foco foi impedir referências cruzadas por identificadores fornecidos pelo cliente e reduzir privilégios excessivos de perfis internos.

## Controles confirmados e endurecidos

| Camada | Controle aplicado |
| --- | --- |
| Tenant | Procedures autenticadas validam a vinculação da sessão ao `churchId`; a leitura de igreja por ID passou a exigir participação no tenant. |
| Diretório de Pessoas | Pastores e Secretários veem o diretório integral. Líderes, Supervisores e Consolidadores recebem somente a própria ficha e as Pessoas da carteira pastoral. |
| Jornada e cuidado | Mudança de estágio, transferência de Célula, leitura de responsável e histórico de cuidado exigem escopo pastoral real. |
| Células | Criação é limitada a Pastores, Supervisores ou ao próprio Líder designado; transferências exigem permissão de Jornada. |
| Aconselhamento | Acesso é limitado a Pastores e Supervisores. Supervisores veem, alteram e anotam apenas sessões atribuídas a si. |
| Eventos | Criação e QR Code exigem administração da igreja. A geração de QR e o check-in validam o tenant real do Evento e da Pessoa. |
| Matrículas | Fundamentos, Batismo, Encontro e Escola de Líderes validam que a turma/evento e a Pessoa pertencem à mesma igreja. Atualizações de matrícula passaram a receber `churchId`. |
| Dados administrativos | Relatórios, importação de membros, comunicações e ações estruturais são limitados a Pastores e Secretários autorizados. |
| Rotas públicas | Dados públicos de igreja foram reduzidos a identidade visual e localização. Pedidos de oração e leads públicos aceitam somente igreja ativa; solicitações de oração deixam de expor listagem pública. |

## Testes de regressão

Foram adicionados cenários para bloquear leitura de outra igreja por ID, consulta de cuidado fora da carteira, criação de Célula por membro comum e acesso de Supervisor a notas de aconselhamento de outra pessoa. A suíte final possui **71 testes** distribuídos em sete arquivos, além da checagem TypeScript sem erros.

## Limites e recomendação futura

Os controls críticos são aplicados no servidor; a interface continua apenas como conveniência visual, não como fronteira de segurança. Como próxima evolução arquitetural, recomenda-se criar procedures tRPC específicas por fonte de sessão (`churchProtectedProcedure` e `superAdminProcedure`) e um middleware de tenant que rejeite automaticamente `churchId` divergente. Isso reduziria a necessidade de repetição de guards em novos módulos.
