# PR #53 — Confirmação acessível de ações destrutivas

**Status:** implementação inicial concluída; validação e PR em andamento

**Escopo:** confirmação segura e consistente de remoções na experiência autenticada de Pessoas e Células

**Base:** commit `9242dae`, após o PR #52

## Resumo executivo

O próximo problema de UX identificado após o PR #52 é a confirmação de ações destrutivas por meio de `window.confirm`. Atualmente, a ficha de Pessoas e o painel de Células usam a confirmação nativa do navegador para retirar uma Pessoa de uma Célula. A ficha de Pessoas também usa esse mecanismo para remover uma Cobertura espiritual.

O PR #53 deve substituir essas confirmações nativas por um diálogo de alerta reutilizável, acessível e responsivo. A mudança deve melhorar a clareza da ação sem alterar os contratos server-side, as permissões, as mutations, o histórico da Pessoa ou a regra oficial de independência entre Jornada e Célula.

> **Regra de produto:** nenhuma remoção deve ser enviada ao servidor antes de uma confirmação explícita no diálogo. Cancelar, fechar ou pressionar Escape não pode executar mutation.

O PR será exclusivamente de interface e comportamento de confirmação. Não deve criar migration, alterar schema, criar nova rota ou mudar o significado de qualquer estado de negócio.

## Motivo da mudança

`window.confirm` é controlado pelo navegador e não participa do design system do Ide Fazei. Esse comportamento gera quatro problemas práticos:

1. A aparência e o posicionamento variam entre navegador, sistema operacional e dispositivo.
2. O texto não possui a hierarquia visual necessária para explicar a consequência da remoção.
3. O fluxo não oferece um estado controlado para indicar que a mutation está em andamento.
4. A interação é difícil de cobrir de forma determinística em testes de acessibilidade, teclado e viewport mobile.

O repositório já possui `AlertDialog` baseado em Radix UI. O PR deve reutilizar esse componente em vez de criar uma confirmação paralela ou uma implementação manual de modal.

## Ações incluídas

### 1. Retirar uma Pessoa da Célula pela ficha de Pessoas

Arquivo atual: `client/src/pages/Pessoas.tsx`.

O botão **Sair da Célula** deve abrir o diálogo antes de chamar `trpc.cells.removePerson`. O diálogo deve identificar a Pessoa e a Célula quando esses dados estiverem disponíveis.

Texto mínimo recomendado:

- **Título:** `Retirar da Célula?`
- **Descrição:** `Você está prestes a retirar [Pessoa] da Célula [Célula]. O histórico da participação será preservado e a Jornada principal não será alterada.`
- **Cancelar:** `Manter na Célula`
- **Confirmar:** `Retirar da Célula`

A mutation continuará usando os mesmos valores de `churchId`, `personId` e `cellId`. O callback atual de sucesso continuará atualizando participação, histórico, cuidado, atenção, ficha e diretório. O toast atual também deve ser preservado.

### 2. Retirar uma Pessoa da Célula pelo painel de Células

Arquivo atual: `client/src/pages/Celulas.tsx`.

O botão iconográfico de remoção na lista de Pessoas deve abrir o mesmo padrão de diálogo antes de chamar `trpc.cells.removePerson`. O texto deve identificar a Pessoa e a Célula selecionada.

O fluxo deve manter o callback atual, incluindo a atualização da lista de membros, candidatos, contagens e lista de Células. O histórico da participação continua preservado.

A confirmação visual não concede capacidade de gestão. O botão continua condicionado a `selectedCell.canManage`, e o servidor continua sendo a autoridade final da operação.

### 3. Remover uma Cobertura espiritual pela ficha de Pessoas

Arquivo atual: `client/src/pages/Pessoas.tsx`.

O botão **Remover cobertura** deve abrir o mesmo componente compartilhado antes de chamar `trpc.people.removePastoralCoverage`.

Texto mínimo recomendado:

- **Título:** `Remover cobertura espiritual?`
- **Descrição:** `A cobertura espiritual atual será removida desta ficha. O histórico da cobertura será preservado.`
- **Cancelar:** `Manter cobertura`
- **Confirmar:** `Remover cobertura`

A mutation permanece protegida pelo requisito server-side de Pastor Presidente. O PR não deve alterar a regra de autoridade, os dados enviados, a trilha histórica ou o toast existente.

## Componente reutilizável

Criar `client/src/components/ConfirmDestructiveActionDialog.tsx` como componente presentational e controlado. Ele deve compor os componentes existentes de `client/src/components/ui/alert-dialog.tsx`.

O componente não deve conhecer Pessoas, Células, Cobertura espiritual, tRPC, permissões ou IDs. Sua responsabilidade é somente apresentar o risco e devolver a decisão do usuário.

Contrato mínimo recomendado:

```ts
type ConfirmDestructiveActionDialogProps = {
  open: boolean;
  title: string;
  description: string;
  cancelLabel?: string;
  confirmLabel?: string;
  pending?: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
};
```

Regras do componente:

1. O componente deve usar `AlertDialog`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogCancel` e `AlertDialogAction` existentes.
2. O título deve indicar claramente que a ação remove, retira ou desvincula algo.
3. A descrição deve explicar o que será alterado e o que será preservado.
4. O botão de confirmação deve usar aparência destrutiva, com contraste suficiente e rótulo verbal. Não usar apenas ícone.
5. O botão de cancelamento deve ser facilmente identificável e permanecer disponível no mobile.
6. Enquanto `pending` estiver ativo, os dois controles devem ficar desabilitados e o botão destrutivo deve indicar o progresso, por exemplo `Retirando…` ou `Removendo…`.
7. O diálogo não deve fechar automaticamente quando a confirmação iniciar a mutation. Ele deve permanecer controlado até sucesso ou cancelamento explícito.
8. A confirmação deve ser executada uma única vez por abertura. Cliques repetidos durante `pending` não podem disparar chamadas duplicadas.
9. Cancelamento, Escape e fechamento do diálogo devem apenas limpar o alvo pendente. Nenhuma mutation deve ser chamada.
10. O foco deve ser devolvido ao botão que abriu o diálogo quando a interação terminar, conforme o comportamento padrão do Radix UI.
11. O conteúdo deve funcionar em viewport de 320 px e 390 px sem rolagem horizontal.
12. Os controles interativos devem manter alvo de toque de pelo menos 44 px e foco visível.

## Estado local nas páginas

Cada página deve manter um alvo de confirmação local, sem persistência. O alvo deve ser um tipo discriminado, não um conjunto de booleanos independentes que possa abrir dois diálogos ao mesmo tempo.

Exemplo conceitual para Pessoas:

```ts
type PendingDestructiveAction =
  | { kind: "cell-removal"; personId: number; cellId: number; personName: string; cellName: string }
  | { kind: "pastoral-coverage-removal"; pastorPersonId: number; personName: string }
  | null;
```

A implementação pode usar nomes equivalentes, desde que preserve as seguintes invariantes:

- o alvo contém os mesmos IDs que seriam enviados pela ação atual;
- o texto é derivado do alvo selecionado, sem confiar em valores digitados pelo usuário;
- abrir o diálogo não chama backend;
- confirmar chama somente a mutation correspondente;
- sucesso limpa o alvo e mantém os refetches atuais;
- erro não altera os dados locais e preserva o toast existente;
- cancelar limpa o alvo sem refetch e sem mutation.

No painel de Células, o alvo deve conter a Pessoa e a Célula selecionadas para que a confirmação continue correta mesmo que a lista seja rerenderizada enquanto o diálogo está aberto.

## Fluxo de estados

| Estado | Interface | Mutation |
|---|---|---:|
| Inativo | Nenhum diálogo visível | Não executar |
| Confirmação aberta | Título, consequência, cancelar e confirmar | Não executar |
| Confirmando | Botões desabilitados e rótulo de progresso | Uma chamada |
| Sucesso | Diálogo fechado, refetch atual e toast atual | Concluída |
| Erro | Diálogo ou alvo permanece recuperável, toast atual visível, ação novamente disponível | Nenhuma nova chamada automática |
| Cancelado | Diálogo fechado e alvo limpo | Não executar |

O PR não deve adicionar retry automático. Se a mutation falhar, a liderança pode decidir manualmente se deseja confirmar novamente.

## Preservação das regras de negócio

A retirada de uma Pessoa da Célula continua significando somente que a Pessoa deixou a Célula atual. O histórico da participação permanece disponível. A etapa principal da Jornada não retrocede e não é recalculada pela UI.

A remoção de Cobertura espiritual continua sendo uma alteração da cobertura atual com histórico preservado. Ela não deve apagar eventos históricos nem alterar automaticamente a Jornada, a Célula, o Cuidado ou a Consolidação.

O PR não deve transformar a confirmação visual em uma nova etapa de negócio, em um evento de auditoria adicional ou em uma autorização alternativa.

## Segurança e autoridade

A confirmação de UI não é uma fronteira de segurança. Os procedures atuais permanecem responsáveis por autenticação, tenant, escopo e autorização:

- `cells.removePerson` continua validando a capacidade de gestão da Célula e a Pessoa dentro da igreja;
- `people.removePastoralCoverage` continua exigindo a autoridade de Pastor Presidente e a Pessoa pastoral pertencente à igreja;
- `churchId`, `personId`, `cellId` e `pastorPersonId` continuam sendo validados pelo servidor;
- a interface não deve aceitar IDs de confirmação digitados ou alterar os IDs recebidos do estado selecionado;
- esconder um botão não substitui o gate server-side.

Mensagens de erro devem continuar usando o toast existente. Não exibir stack trace, SQL, IDs internos, dados de outro tenant ou detalhes de autorização.

## Arquivos previstos

| Arquivo | Alteração planejada |
|---|---|
| `client/src/components/ConfirmDestructiveActionDialog.tsx` | Novo diálogo controlado, reutilizável e acessível |
| `client/src/pages/Pessoas.tsx` | Substituir os dois `window.confirm` por estado local e diálogo compartilhado |
| `client/src/pages/Celulas.tsx` | Substituir o `window.confirm` da remoção de membro por estado local e diálogo compartilhado |
| `client/src/components/ConfirmDestructiveActionDialog.test.ts` | Cobrir variantes, foco, pending, cancelamento e confirmação única |
| `client/src/pages/PessoasJourney.test.ts` | Proteger retirada de Célula, remoção de Cobertura, textos e preservação da Jornada |
| `client/src/pages/LeadershipFlows.test.ts` | Proteger o fluxo de remoção no painel de Células e a capacidade calculada |
| `engineering/pr53-destructive-action-confirmation.md` | Registrar esta especificação e os critérios de aceite |

Não devem ser alterados `server/routers.ts`, `server/db.ts`, `drizzle/schema.ts`, migrations, tabelas, procedures, permissões ou dados reais.

## Ações explicitamente fora do escopo

O PR não deve alterar o comportamento de:

- `Remover frente atual` da Jornada, que é uma alteração reversível de frente paralela e não usa `window.confirm` hoje;
- marcar etapa da Jornada como pendente ou não registrada;
- transferir uma Pessoa entre Células;
- remover ou excluir uma Célula inteira;
- remover membros de Ministérios, Eventos ou Escalas;
- remover uma Pessoa do cadastro ou desativar uma identidade;
- reabrir casos de Consolidação;
- alterar a política de responsável de Cuidado;
- criar auditoria ou evento histórico novo;
- modificar a regra de autorização server-side;
- criar uma confirmação global para todas as mutations do sistema.

Esses fluxos podem exigir decisões de negócio próprias. Misturá-los neste PR aumentaria o risco de alterar semântica ou criar um padrão incompleto.

## Critérios de aceite

1. Nenhum dos três fluxos incluídos usa `window.confirm`.
2. Clicar em uma ação destrutiva abre um diálogo acessível e não chama mutation.
3. Cancelar, fechar ou pressionar Escape não chama mutation.
4. Confirmar retirada de Célula chama exatamente uma vez `cells.removePerson` com os IDs atuais.
5. Confirmar remoção de Cobertura chama exatamente uma vez `people.removePastoralCoverage` com os IDs atuais.
6. Enquanto a mutation estiver pendente, o botão de confirmação fica desabilitado e mostra progresso.
7. Sucesso fecha o diálogo e preserva os callbacks atuais de toast e refetch.
8. Erro não limpa falsamente a Pessoa, a Célula, a Cobertura ou o histórico. O toast existente continua sendo exibido.
9. A ficha continua afirmando que a Jornada principal não é alterada pela saída de Célula.
10. O histórico da participação e o histórico da Cobertura continuam preservados pela mesma mutation atual.
11. Os botões continuam sujeitos às capacidades calculadas e às guards server-side existentes.
12. O diálogo funciona por teclado, com foco visível e retorno de foco ao acionador.
13. O diálogo funciona em 320 px, 390 px e desktop sem overflow horizontal.
14. Os alvos de toque principais têm pelo menos 44 px.
15. Não é criada nova rota, query, procedure, migration, tabela ou fonte paralela de estado.
16. Não há alteração em dados reais durante desenvolvimento, testes ou simulação visual.
17. Typecheck, testes direcionados, suíte completa, build e `git diff --check` passam.

## Matriz mínima de testes

A implementação deve cobrir, no mínimo:

- diálogo fechado por padrão;
- abertura da confirmação pela ficha de Pessoas para saída de Célula;
- abertura da confirmação pela ficha de Pessoas para remoção de Cobertura;
- abertura da confirmação pelo painel de Células;
- texto com nome da Pessoa e da Célula quando aplicável;
- descrição de preservação de histórico e Jornada;
- cancelamento sem mutation;
- Escape sem mutation;
- confirmação única mesmo com cliques repetidos;
- botões desabilitados durante `isPending`;
- fechamento e refetch após sucesso;
- manutenção do alvo e toast após erro;
- botão de saída ausente quando a capacidade de gestão não existe;
- Cobertura protegida pela capacidade atual, sem concessão por URL ou ID;
- foco no título ou no primeiro controle ao abrir;
- foco devolvido ao acionador ao fechar;
- navegação por Tab e Enter/Space;
- viewport de 320 px e 390 px sem overflow;
- regressão de que a mutation continua sendo a mesma, sem mutation paralela;
- preservação da Jornada e do histórico no contrato de `cells.removePerson`;
- preservação da trilha no contrato de `people.removePastoralCoverage`.

## Simulação visual

A revisão deve usar uma prévia local temporária ou uma rota de desenvolvimento removível com dados fictícios. A prévia deve representar os três casos de confirmação:

1. retirada da Pessoa da Célula pela ficha;
2. remoção de Cobertura espiritual pela ficha;
3. retirada de uma Pessoa pelo painel de Células.

Cada cenário deve ser testado em estado inativo, aberto, confirmando e cancelado. A simulação deve incluir viewport de 320×844, 390×844 e desktop.

A confirmação deve ser exercitada por teclado e por clique. A prévia não pode chamar tRPC real, acessar produção, exigir sessão autenticada real ou criar qualquer registro.

A rota e os dados fictícios da prévia devem ser removidos antes do commit.

## Plano de implementação

1. Criar o componente `ConfirmDestructiveActionDialog` usando o `AlertDialog` existente.
2. Definir o contrato controlado e os estados `open`, `pending`, cancelado e confirmado.
3. Substituir os dois `window.confirm` de `Pessoas.tsx` por um alvo discriminado único.
4. Substituir o `window.confirm` de `Celulas.tsx` por um alvo de remoção que congele Pessoa e Célula selecionadas.
5. Preservar mutations, toasts, refetches, guards e textos de domínio já existentes.
6. Adicionar testes estruturais e de componente para decisão, pending, cancelamento, erro e acessibilidade.
7. Executar a simulação visual local nos três viewports e remover a prévia.
8. Executar `pnpm check`, testes direcionados, `pnpm test`, `pnpm build` e `git diff --check`.
9. Revisar o diff para confirmar que não houve alteração em servidor, schema, migration, permissões ou dados.
10. Abrir o PR #53 somente após a validação completa. Merge e deploy devem permanecer como etapas separadas e exigir autorização própria.

## Decisão arquitetural

O PR #53 adota um único componente de confirmação visual para ações irreversíveis ou potencialmente destrutivas observadas neste fluxo. O componente é compartilhado, mas o ownership da operação permanece no domínio que já possui a mutation.

Pessoas continua sendo a ficha canônica para contexto da identidade e pode iniciar a remoção dentro das capacidades permitidas. Células continua sendo a área dona da gestão de membros. Cobertura espiritual continua sendo uma operação pastoral protegida pelo procedure existente.

A confirmação não cria uma nova fila, não cria uma nova fonte de dados e não materializa um novo estado. Ela apenas interrompe a cadeia de eventos antes da mutation para que o usuário compreenda a consequência e escolha continuar.

Essa decisão segue o princípio de uma área dona por ação. O PR também preserva a definição oficial de que **Jornada representa progresso**, enquanto **Célula representa participação comunitária atual** e **Histórico preserva participações anteriores** [1].

## Referências

[1]: ./routes-and-legacy.md "Rotas, aliases e modelos legados — Ide Fazei"
[2]: ./pr52-people-profile-state-feedback.md "PR #52 — Estados confiáveis da ficha de Pessoas"
[3]: ./permissions-matrix.md "Matriz inicial de permissões e guards — Ide Fazei"
[4]: ./test-matrix.md "Matriz inicial de testes e gates — Ide Fazei"
[5]: ../client/src/components/ui/alert-dialog.tsx "Componente AlertDialog do design system"
[6]: ../client/src/pages/Pessoas.tsx "Ficha de Pessoas, Jornada, Célula e Cobertura espiritual"
[7]: ../client/src/pages/Celulas.tsx "Gestão de Células e Pessoas vinculadas"
[8]: ../server/routers.ts "Routers, autorização, tenant e procedures server-side"

**Responsável editorial:** Manus AI

**Data:** 20/09/2026

**Status da edição:** especificação acompanhada da implementação inicial do PR #53. Nesta etapa não foram alterados schema, migrations, backend, dados reais, produção ou deploy.
