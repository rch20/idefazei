# PR #47 — Resumo executivo da ficha de Pessoas

## Objetivo

Melhorar a primeira leitura da ficha central de Pessoas/Discípulos em telas pequenas e grandes sem criar uma nova rota, uma nova aba ou uma segunda fonte de verdade. Ao abrir a ficha, a liderança deve entender rapidamente a situação da Pessoa e identificar um único próximo passo operacional.

A ficha continua sendo o destino central da Pessoa. A Jornada continua representando o progresso geral. A participação em Célula continua sendo independente da Jornada.

> **Regra de produto:** uma Pessoa possui uma ficha central, um resumo executivo e uma ação principal por contexto. Os detalhes permanecem disponíveis sem competir com a leitura inicial.

## Escopo do PR

O PR altera apenas a camada de apresentação da ficha central:

- extrai o resumo executivo para um componente visual reutilizável;
- prioriza próximo passo, Jornada, Célula atual e responsável pelo cuidado;
- reduz a quantidade de blocos concorrentes na primeira viewport mobile;
- agrupa contexto complementar em uma seção progressiva;
- preserva a navegação por `personId` e `section`;
- mantém as ações existentes e seus contratos tRPC.

O PR não altera banco de dados, migrations, permissões, procedures, regras de Jornada, regras de Célula ou dados reais.

## Modelo visual

A seção `Resumo` será organizada nesta ordem:

1. **Próximo passo**, com título, motivo resumido e uma ação principal contextual.
2. **Três indicadores compactos**, mostrando etapa principal da Jornada, Célula atual e responsável pelo cuidado.
3. **Contexto da situação**, recolhido por padrão no mobile, contendo os motivos de atenção e a explicação da independência entre Jornada e Célula.

O resumo não exibirá dados técnicos de acesso. Informações de login permanecem na seção `Participações`, onde possuem contexto administrativo.

## Estados funcionais

| Estado | Exibição principal | Ação |
|---|---|---|
| Sem pendência de cuidado | “Acompanhamento em dia” ou “Nenhum próximo passo definido” | Nenhuma ação principal obrigatória |
| Primeiro contato pendente | “Registrar primeiro contato” | Abrir Consolidação |
| Responsável ausente | “Definir responsável” ou “Iniciar consolidação” | Abrir Cuidado |
| Integração em Célula pendente | “Enviar para célula” | Abrir Participações |
| Célula ativa | Nome da Célula atual | Consultar Participações |
| Sem Célula | “Sem Célula” e status “Pendente” | Consultar Participações, quando autorizado |
| Histórico de Célula existente | “Sem Célula” com indicação de histórico preservado | Consultar Participações |

O texto “Pendente” permanece limitado à participação comunitária atual. Nunca será usado para indicar retrocesso na Jornada.

## Responsabilidade dos dados

O componente receberá dados já resolvidos pela página `Pessoas`:

- etapa principal e rótulo da Jornada;
- estado da participação em Célula;
- nome da Célula atual;
- existência de histórico de Célula;
- responsável atual pelo cuidado;
- próximo passo, prioridade e motivos;
- callback para abrir a seção contextual.

A página continuará responsável por queries, autorização, navegação e mutations. O componente não fará chamadas ao backend e não decidirá permissões.

## Responsividade e acessibilidade

No mobile, o resumo usará uma coluna, botões com altura mínima de toque e uma única ação principal em largura total. Os indicadores usarão duas colunas: Jornada e Célula atual ficarão lado a lado, enquanto o responsável pelo cuidado ocupará a largura restante.

No desktop, a ação principal e os indicadores usarão o espaço horizontal disponível sem criar uma grade densa. Os detalhes complementares permanecerão visualmente subordinados.

A seção progressiva usará `Collapsible` com botão de teclado, `aria-expanded` e `aria-controls`. Cores de prioridade serão acompanhadas por texto. O foco visível e a ordem de leitura permanecerão preservados.

## Arquivos previstos

| Arquivo | Alteração |
|---|---|
| `client/src/components/PersonExecutiveSummary.tsx` | Novo componente visual sem acesso direto ao backend |
| `client/src/pages/Pessoas.tsx` | Composição do componente e remoção do JSX duplicado do resumo |
| `client/src/pages/PessoasJourney.test.ts` | Regressões do contrato do resumo e da separação Jornada/Célula |
| `client/src/pages/MobileExperience.test.ts` | Regressões de layout mobile, toque e seção progressiva |
| `engineering/pr47-people-executive-summary.md` | Esta especificação |

## Critérios de aceite

1. Abrir uma Pessoa continua usando `/app/pessoas?personId=<id>&section=resumo`.
2. A primeira tela do resumo mostra próximo passo, Jornada, Célula atual e responsável.
3. Existe no máximo uma ação principal no resumo.
4. A ação leva ao contexto existente correto: Consolidação, Cuidado ou Participações.
5. “Sem Célula” não altera nem retrocede a Jornada.
6. O resumo não exibe dados técnicos de acesso.
7. O contexto complementar inicia recolhido no mobile e pode ser aberto por teclado ou toque.
8. A ficha continua rolável em viewport pequena e respeita a área segura inferior.
9. Nenhuma query ou mutation nova é adicionada.
10. Typecheck, testes direcionados, suíte completa, build e `git diff --check` passam.

## Fora do escopo

Não serão criados novos estados de Jornada. Não será criada uma aba “Visão geral”. Não serão duplicados os controles de Cuidado, Participações, Cobertura ou Histórico. Não haverá alteração de schema, migration, backend, autorização ou fluxo de deploy neste PR.

## Validação planejada

A validação será estática e automatizada. Serão cobertos o contrato do componente, o destino da ação principal, a independência entre Jornada e Célula, os estados sem Célula e o comportamento mobile do diálogo. Não serão criados registros reais nem realizados testes autenticados de mutação.
