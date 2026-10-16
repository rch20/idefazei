# PR #50 — Navegação progressiva da ficha de Pessoas no mobile

## Resumo executivo

O PR #50 reduz a densidade visual da ficha central de Pessoas em telas pequenas. A ficha continuará exibindo uma única seção por vez, mas deixará de apresentar seis botões de aba simultaneamente em uma grade estreita. No mobile, a liderança verá um seletor único com a seção ativa e sua descrição curta. No desktop, a navegação por abas existente será preservada.

A alteração é exclusivamente de experiência. Não haverá nova rota, nova fonte de dados, procedure, mutation, migration, alteração de permissões ou mudança no significado das seções.

> **Regra de produto:** o Resumo é a entrada padrão da ficha; as demais áreas são seções progressivas da mesma ficha, e não abas ou rotas independentes.

## Problema

A ficha atual já renderiza somente a seção ativa, mas o mobile apresenta todas as opções de navegação em uma grade de duas colunas. Essa solução consome espaço vertical, quebra rótulos longos como “Cobertura espiritual” e faz a ficha parecer um conjunto de módulos independentes.

A URL já possui o contrato oficial `/app/pessoas?personId=<id>&section=<seção>`. O problema é visual, não estrutural: a navegação precisa ficar mais compacta sem alterar esse contrato.

## Objetivo

Ao abrir uma ficha em uma tela pequena, a liderança deve compreender rapidamente que:

1. está dentro de uma única ficha de Pessoa;
2. o Resumo é a visão inicial;
3. apenas uma área está aberta por vez;
4. pode trocar de área pelo seletor;
5. a área escolhida permanece compartilhável e recarregável pela URL.

## Comportamento

### Desktop

A navegação atual por botões com `role="tab"` continua visível a partir do breakpoint `sm`. Os rótulos e a ordem permanecem os mesmos: Resumo, Jornada, Cuidado, Participações, Cobertura espiritual quando autorizada e Histórico.

### Mobile

A grade de abas fica oculta abaixo do breakpoint `sm`. Em seu lugar, a ficha mostra um bloco compacto com:

- o rótulo **Área da ficha**;
- uma explicação curta de que somente uma área é exibida por vez;
- um `Select` acessível com a seção ativa;
- as mesmas opções autorizadas da navegação desktop.

A troca pelo `Select` chama a mesma função `selectPersonSection`. Essa função mantém o estado local e atualiza `section=` na URL. Não deve haver segunda implementação de navegação nem nova fonte de estado.

### Seção inicial

A abertura sem `section=` continua usando `resumo`. Deep links com uma seção válida continuam abrindo diretamente a seção solicitada. Valores ausentes ou inválidos continuam resultando em Resumo.

### Cobertura espiritual

A opção **Cobertura espiritual** aparece no seletor mobile e nas abas desktop somente quando `canManagePastoralCoverage` for verdadeiro. O PR não muda a regra de autorização nem o conteúdo da seção.

## Arquivos

| Arquivo | Alteração |
|---|---|
| `client/src/pages/Pessoas.tsx` | Adicionar descrições das seções, seletor mobile e classes responsivas na navegação existente |
| `client/src/pages/PessoasJourney.test.ts` | Proteger a ordem, o contrato de URL e a condicional de Cobertura espiritual |
| `client/src/pages/MobileExperience.test.ts` | Proteger o seletor mobile, a ocultação da grade e a existência de uma seção ativa |
| `engineering/pr50-people-mobile-section-navigation.md` | Registrar a decisão arquitetural e os critérios de aceite |

Não serão alterados `server/routers.ts`, `server/db.ts`, `drizzle/schema.ts`, migrations, procedures ou dados reais.

## Critérios de aceite

1. A ficha continua usando uma única seção ativa por vez.
2. O Resumo continua sendo a seção inicial padrão.
3. A navegação desktop permanece disponível a partir de `sm`.
4. A grade de abas não aparece no mobile.
5. O seletor mobile mostra a seção ativa e todas as opções autorizadas.
6. A troca pelo seletor usa `selectPersonSection`.
7. A troca mantém `personId` e atualiza `section=` na URL.
8. Deep links continuam abrindo a seção correta.
9. A opção Cobertura espiritual continua condicionada a `canManagePastoralCoverage`.
10. Não há nova query, mutation, rota, migration ou regra de negócio.
11. O seletor possui rótulo acessível e alvo de toque adequado.
12. Typecheck, testes direcionados, suíte completa, build e `git diff --check` passam.
13. Nenhum dado funcional real é criado ou modificado para validar a melhoria.

## Fora do escopo

O PR não criará uma nova aba, não mudará o modelo de Pessoas, não alterará a Jornada, não modificará a participação em Célula, não adicionará filtros, não criará uma nova rota por seção e não mudará as permissões pastorais.

Também não substituirá o resumo executivo, a linha do tempo histórica ou o ciclo de ações dos PRs anteriores. O objetivo é somente tornar a navegação entre essas áreas mais clara no mobile.

## Plano de validação

A validação estrutural deve confirmar que o seletor mobile e as abas desktop compartilham as mesmas opções e a mesma função de troca. Os testes devem verificar o deep link existente, a seção padrão, a condicional de Cobertura espiritual e a ausência de contratos de backend novos.

A simulação visual deve considerar viewport de 320 px, 390 px e desktop. Deve confirmar ausência de overflow horizontal, rótulo legível, alvo de toque com pelo menos 44 px de altura e preservação do conteúdo da seção ativa.

A validação não usará sessão autenticada contra produção e não criará Pessoa, Célula, Jornada, caso de Consolidação, follow-up, visita ou qualquer outro dado funcional.

## Decisão arquitetural

O PR mantém a ficha como destino central definido em [routes-and-legacy.md]. O seletor mobile é apenas outra apresentação do mesmo parâmetro `section`; portanto, não cria uma segunda rota, uma segunda autorização ou uma segunda operação.

## Referências

[1]: https://github.com/rch20/idefazei/blob/main/engineering/routes-and-legacy.md "Rotas, aliases e modelos legados — Ide Fazei"

[2]: https://github.com/rch20/idefazei/blob/main/engineering/pr49-people-history-timeline.md "PR #49 — Linha do tempo histórica da ficha de Pessoas"
