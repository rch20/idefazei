# PR #49 — Linha do tempo histórica da ficha de Pessoas

## Resumo executivo

O PR #49 propõe organizar a seção **Histórico** da ficha central de Pessoas como uma linha do tempo única, legível e explicitamente histórica. A melhoria vem depois do resumo executivo do PR #47 e do ciclo de ação do PR #48 porque esses dois incrementos já resolveram a leitura inicial e os encaminhamentos. O próximo risco de confusão está na interpretação do histórico: o usuário precisa distinguir o estado atual da Pessoa dos eventos que já aconteceram.

A mudança será exclusivamente de experiência. Não haverá nova rota, nova aba, nova fonte de dados, procedure, mutation, migration ou alteração de registros reais.

> **Regra de produto:** o resumo mostra a situação atual; a Jornada mostra o progresso; Participações mostra os vínculos comunitários; Histórico mostra acontecimentos anteriores em ordem cronológica.

## Problema atual

A página `Pessoas.tsx` já constrói `careTimeline` combinando eventos de cuidado, Consolidação, Jornada e Células. Entretanto, a apresentação atual usa títulos e detalhes genéricos, mostra somente a data e não identifica de forma visual o domínio de cada evento. O usuário pode interpretar um evento antigo como se fosse o estado atual ou confundir um registro histórico de Célula com uma participação ativa.

A implementação atual também usa a fonte moderna de Consolidação quando existe histórico moderno e recorre aos registros legados somente quando não existe histórico moderno. Essa regra evita duplicações, mas não é explicada visualmente. O PR deve preservar essa decisão e tornar a origem compreensível sem transformar o legado em uma segunda operação.

## Objetivo

Ao abrir a seção **Histórico**, a liderança deve conseguir responder rapidamente a quatro perguntas:

1. Qual foi a última atividade registrada?
2. O que aconteceu e em qual domínio?
3. Quando aconteceu?
4. Esse item é um registro moderno do fluxo atual ou uma informação histórica de compatibilidade?

A resposta deve aparecer sem criar um painel denso. Em telas pequenas, cada evento deve continuar legível sem exigir rolagem horizontal ou abrir uma nova rota.

## Comportamento proposto

### 1. Componente visual dedicado

Extrair a apresentação da linha do tempo para um componente sem acesso direto ao backend, por exemplo `PersonHistoryTimeline.tsx`. A página `Pessoas.tsx` continuará responsável por queries, autorização, composição dos eventos e navegação.

O componente receberá um modelo visual já resolvido, com os seguintes campos mínimos:

- `id` estável para a chave do React;
- `date` em formato de data válido;
- `title` legível para a liderança;
- `detail` opcional;
- `category`, com uma das categorias `jornada`, `cuidado`, `consolidacao` ou `celula`;
- `source`, com `moderno`, `anterior` ou `jornada` quando necessário;
- `isLatest`, calculado pela página após a ordenação.

O componente não deve interpretar IDs, papéis, status de banco ou regras de autoridade.

### 2. Identificação visual por domínio

Cada evento exibirá uma identificação textual e visual de domínio. A cor não será a única forma de diferenciação.

| Categoria | Rótulo visual | Exemplo de evento |
|---|---|---|
| Jornada | Jornada | “Fundamentos: Etapa concluída” |
| Cuidado | Cuidado | “Responsável pelo cuidado definido” |
| Consolidação | Consolidação | “Primeiro contato registrado” |
| Célula | Célula | “Entrada na Célula Esperança” |

Os registros históricos de compatibilidade usarão o texto **Registro anterior**. A interface não deve chamar um registro legado de “caso atual” nem apresentá-lo como equivalente a um caso moderno.

### 3. Última atividade

O primeiro evento da lista, depois da ordenação decrescente por data, receberá a indicação textual **Última atividade**. Essa indicação será informativa e não substituirá o estado atual exibido no Resumo.

A linha do tempo não deve afirmar que a última atividade é o estado atual. Quando o evento representar uma participação antiga em Célula ou uma etapa anterior da Jornada, o texto deve manter caráter histórico.

### 4. Limite progressivo de eventos

Para manter a leitura minimalista, a seção exibirá inicialmente os eventos mais recentes já carregados. A quantidade inicial será pequena o suficiente para preservar a primeira leitura mobile, sem descartar os demais eventos.

Quando houver eventos adicionais, a própria seção exibirá um controle acessível, como **Mostrar mais histórico**. A expansão será local, sem nova query e sem navegação. O controle deve poder recolher novamente a lista com o texto **Mostrar menos histórico**.

Não haverá paginação, filtro ou busca novos neste PR. Esses mecanismos só devem ser considerados em uma etapa posterior caso o volume real de histórico justifique a complexidade.

### 5. Estado vazio

Quando não houver eventos, a seção mostrará uma mensagem que não sugira erro:

> Ainda não há atividades históricas registradas. A situação atual da Pessoa está disponível no Resumo, na Jornada e em Participações.

A mensagem deve deixar claro que ausência de histórico não significa ausência de Pessoa, ausência de Jornada ou falha de cadastro.

### 6. Datas e detalhes

Cada item mostrará a data em formato local brasileiro. Quando houver horário confiável no valor recebido, a interface poderá exibir data e hora em uma segunda linha de baixa hierarquia visual. A transformação deve continuar usando o timezone local da interface, sem alterar os timestamps recebidos.

O detalhe deve ser curto e contextual. Observações longas não devem aumentar indefinidamente a altura do card; quando necessário, devem ser truncadas visualmente sem apagar o valor original no modelo ou criar uma nova mutation.

## Regra de compatibilidade entre fontes

A composição dos eventos continuará respeitando a separação entre modelos modernos e legados:

1. O histórico moderno de Consolidação continuará sendo a fonte preferencial quando existir.
2. Os eventos legados de Consolidação continuarão sendo usados somente quando não houver histórico moderno correspondente.
3. A interface poderá indicar **Registro anterior**, mas não somará eventos equivalentes das duas fontes.
4. Eventos de Jornada, Célula e Cuidado continuarão sendo adicionados conforme os dados já carregados.
5. A linha do tempo não criará nem inferirá um novo estado atual.

Essa regra é necessária para evitar que um primeiro contato apareça duas vezes ou que um checklist legado seja interpretado como um follow-up moderno.

## Responsabilidade por área

| Área | Responsabilidade no PR #49 |
|---|---|
| `Pessoas` | Resolver os dados autorizados, ordenar eventos, classificar categoria e fonte |
| `PersonHistoryTimeline` | Renderizar a linha do tempo, estado vazio, expansão e acessibilidade |
| `PessoasJourney.test.ts` | Proteger composição, precedência moderna/legada e nomenclatura |
| `MobileExperience.test.ts` | Proteger densidade, expansão, leitura mobile e estado vazio |
| Backend | Nenhuma alteração |
| Banco de dados | Nenhuma alteração |

## Arquivos previstos

| Arquivo | Alteração prevista |
|---|---|
| `client/src/components/PersonHistoryTimeline.tsx` | Novo componente visual puro da linha do tempo |
| `client/src/pages/Pessoas.tsx` | Extrair o modelo visual e substituir a renderização inline do Histórico |
| `client/src/pages/PessoasJourney.test.ts` | Adicionar contratos de categoria, fonte, precedência e ausência de duplicação |
| `client/src/pages/MobileExperience.test.ts` | Adicionar contratos de responsividade, expansão e estado vazio |
| `engineering/pr49-people-history-timeline.md` | Esta especificação |

A criação do componente é preferível a manter outro bloco grande dentro de `Pessoas.tsx`, mas não deve resultar em uma segunda fonte de dados ou em uma nova rota.

## Critérios de aceite

1. A rota oficial continua sendo `/app/pessoas?personId=<id>&section=historico`.
2. A ficha continua possuindo uma única seção de Histórico.
3. O primeiro evento aparece como **Última atividade** sem ser apresentado como estado atual.
4. Cada evento possui categoria textual entre Jornada, Cuidado, Consolidação ou Célula.
5. Registros de compatibilidade são identificados como **Registro anterior**.
6. Eventos modernos e legados equivalentes não são somados nem duplicados.
7. Entrada antiga em Célula permanece histórica e não altera o indicador “Célula atual”.
8. Etapa anterior da Jornada permanece histórica e não altera a etapa principal exibida no Resumo.
9. O histórico inicial é compacto no mobile e possui expansão local quando houver mais eventos.
10. O estado vazio explica que a ausência de histórico não é erro de cadastro.
11. O componente não realiza queries, mutations, navegação ou decisões de permissão.
12. Nenhuma alteração é feita em `server/routers.ts`, `server/db.ts`, `drizzle/schema.ts` ou migrations.
13. Typecheck, testes direcionados, suíte completa, build e `git diff --check` passam.
14. Nenhum registro real é criado, alterado ou excluído para validar a mudança.

## Fora do escopo

O PR não criará uma nova aba de atividades, uma nova rota, um filtro global de histórico, uma pesquisa textual, paginação server-side, exportação, comentários, novas categorias de Jornada ou um novo modelo de auditoria.

Também não fará alterações nos textos ou contratos operacionais de Consolidação, Células, Jornada ou Cuidado. O objetivo é somente tornar o histórico já existente mais compreensível.

## Plano de validação

A validação estática deve confirmar que a página produz um modelo único de eventos, que a precedência moderna/legada continua explícita e que o componente apresenta categorias e fonte sem executar backend.

A validação mobile deve considerar viewport estreita, evento com título longo, detalhe ausente, vários eventos, expansão e estado vazio. Deve verificar também foco visível, teclado, `aria-label`, `aria-expanded` e ausência de overflow horizontal.

A validação não usará sessão autenticada contra produção e não criará Pessoa, Célula, Jornada, caso de Consolidação, follow-up, visita ou qualquer outro dado funcional.

## Decisão arquitetural

O PR #49 reforça o princípio definido em [routes-and-legacy.md]: uma ficha central para a Pessoa, uma área dona para cada operação e uma linha do tempo somente para leitura histórica. A melhoria deve ser bloqueada se exigir nova mutation, segunda fila, nova fonte de verdade ou mistura entre estado atual e evento passado.

## Referências

[1]: https://github.com/rch20/idefazei/blob/main/engineering/pr47-people-executive-summary.md "Especificação do PR #47 — Resumo executivo da ficha de Pessoas"

[2]: https://github.com/rch20/idefazei/blob/main/engineering/pr48-profile-action-cycle.md "Especificação do PR #48 — Ciclo de ação da ficha central"

[3]: https://github.com/rch20/idefazei/blob/main/engineering/routes-and-legacy.md "Rotas, aliases e modelos legados — Ide Fazei"
