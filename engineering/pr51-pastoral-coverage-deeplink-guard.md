# PR #51 — Guard de deep link da Cobertura espiritual na ficha de Pessoas

**Status:** especificação técnica para implementação

**Escopo:** navegação e experiência da ficha central de Pessoas

**Base do sistema:** commit `a704cff`, após o PR #50

## Resumo executivo

O PR #51 deve corrigir uma inconsistência de navegação na ficha central de Pessoas. Atualmente, a URL aceita `section=cobertura` como uma seção válida antes de confirmar se o usuário possui autorização pastoral e se a Pessoa selecionada é um Pastor. Quando o acesso não é permitido, o conteúdo da seção fica oculto, mas a ficha pode permanecer posicionada em uma seção sem conteúdo visível.

A correção deve normalizar o deep link antes de exibir a seção protegida. Usuários autorizados continuam abrindo **Cobertura espiritual** diretamente. Usuários sem autorização são direcionados para **Resumo**, e a URL é canonicalizada para refletir o estado efetivo da ficha.

A mudança é exclusivamente de experiência e consistência de navegação. Não haverá nova rota, procedure, mutation, migration, alteração de schema, alteração de permissões server-side ou mudança no significado da Cobertura espiritual.

> **Regra de produto:** conhecer ou editar manualmente o parâmetro `section=cobertura` não concede acesso. Se a seção não estiver autorizada para o usuário e para a Pessoa selecionada, a ficha deve abrir no Resumo.

## Problema atual

A ficha usa o contrato canônico `/app/pessoas?personId=<id>&section=<seção>`. O parâmetro `section` é validado atualmente apenas contra a lista geral de seções. A seção `cobertura` também depende de `canManagePastoralCoverage`, que exige o papel de Pastor Presidente e uma Pessoa identificada como Pastor.

Como essas duas validações ocorrem em momentos diferentes, um deep link manual ou antigo pode produzir esta sequência:

1. `section=cobertura` é reconhecida como uma seção sintaticamente válida;
2. a ficha é aberta com `personSection="cobertura"`;
3. a autorização pastoral ou a identidade pastoral da Pessoa é confirmada como ausente;
4. o conteúdo protegido não é renderizado;
5. o usuário permanece em uma ficha sem conteúdo correspondente à seção selecionada.

O servidor continua protegendo as procedures de Cobertura espiritual. O problema do PR #51 é a experiência do cliente diante de um contexto inválido ou não autorizado, não uma tentativa de substituir a autorização server-side.

## Objetivo

Ao receber um deep link para Cobertura espiritual, a aplicação deve produzir um estado determinístico:

- se o usuário for Pastor Presidente e a Pessoa selecionada for Pastor, abrir Cobertura espiritual;
- se o usuário não tiver o papel necessário, abrir Resumo;
- se a Pessoa não for Pastor, abrir Resumo;
- se as informações de autorização ainda estiverem carregando, não exibir conteúdo protegido nem deixar uma seção vazia;
- quando houver fallback, atualizar `section=resumo` mantendo o mesmo `personId` e os demais parâmetros contextuais compatíveis;
- impedir que o fallback reabra a ficha ou crie um loop de navegação.

## Comportamento esperado

| Cenário | Seção inicial | URL após a resolução |
|---|---|---|
| Sem `section` | Resumo | Mantém ausência de seção ou usa o comportamento atual |
| `section` inválida | Resumo | `section=resumo` quando houver Pessoa selecionada |
| `section=cobertura`, usuário Pastor Presidente e Pessoa Pastor | Cobertura espiritual | Mantém `section=cobertura` |
| `section=cobertura`, usuário sem papel de Pastor Presidente | Resumo | `section=resumo` |
| `section=cobertura`, Pessoa não é Pastor | Resumo | `section=resumo` |
| `section=cobertura`, autorização ainda carregando | Estado de resolução sem conteúdo protegido | Não canonicalizar até haver decisão |
| Troca normal pelo seletor ou pelas abas | Seção escolhida | Mantém a seção autorizada selecionada |

A resolução deve ser aplicada tanto ao deep link inicial quanto a uma mudança externa de URL enquanto a ficha estiver aberta. O comportamento normal de abrir, trocar de seção e fechar a ficha deve continuar usando as funções existentes, especialmente `selectPersonSection`, `getPersonHref` e `closePersonJourney`.

## Decisão de implementação

A página `Pessoas.tsx` deve separar três conceitos que hoje estão implicitamente combinados:

1. **seção solicitada:** valor recebido pelo parâmetro `section`;
2. **seção autorizada:** valor que o usuário e a Pessoa podem visualizar;
3. **seção efetiva:** valor que será exibido pela ficha.

A decisão deve ser realizada por uma função pura ou por uma pequena camada de normalização testável. A lógica deve tratar Cobertura espiritual como uma seção condicionada, sem transformar a lista de seções públicas em uma nova matriz de permissões.

Enquanto a autorização necessária estiver pendente, a aplicação não deve renderizar a seção protegida. Ela pode manter o Resumo como estado visual provisório ou apresentar um estado de carregamento da ficha, desde que não mostre conteúdo pastoral reservado e não produza um redirecionamento prematuro. Depois da resolução, deve aplicar exatamente uma decisão: Cobertura espiritual ou Resumo.

Quando ocorrer fallback, a URL deve ser atualizada sem criar uma nova entrada desnecessária no histórico do navegador. A implementação deve preferir a navegação já usada pela ficha e evitar uma segunda função de roteamento. O `personId` deve permanecer intacto.

O servidor não deve ser alterado neste PR. As procedures de leitura e gravação de Cobertura espiritual continuam sendo a autoridade final para autenticação, papel, tenant e pessoa acessível.

## Arquivos previstos

| Arquivo | Alteração planejada |
|---|---|
| `client/src/pages/Pessoas.tsx` | Normalizar a seção solicitada, evitar seção protegida vazia, canonicalizar o fallback e preservar o fluxo existente de abertura/fechamento |
| `client/src/pages/PessoasJourney.test.ts` | Adicionar contratos estruturais para autorização, fallback, preservação de `personId` e ausência de loop |
| `client/src/pages/MobileExperience.test.ts` | Confirmar que o seletor mobile não apresenta Cobertura não autorizada e continua exibindo Resumo de forma estável |
| `engineering/pr51-pastoral-coverage-deeplink-guard.md` | Registrar esta decisão arquitetural e os critérios de aceite |

Não devem ser alterados `server/routers.ts`, `server/db.ts`, `drizzle/schema.ts`, migrations, tabelas, procedures ou dados reais.

## Critérios de aceite

1. Um usuário autorizado continua abrindo `section=cobertura` diretamente quando a Pessoa selecionada é Pastor.
2. Um usuário sem `pastor_presidente` não visualiza conteúdo nem opção de Cobertura espiritual por meio de deep link manual.
3. Um usuário autorizado que abre a ficha de uma Pessoa que não é Pastor recebe Resumo, sem painel vazio.
4. O fallback mantém o `personId` e atualiza somente a seção necessária.
5. O fallback não cria loop, não reabre a ficha após o fechamento e não adiciona entradas repetidas ao histórico do navegador.
6. O seletor mobile e as abas desktop continuam mostrando somente as opções autorizadas.
7. A abertura sem `section` continua usando Resumo.
8. Valores de seção desconhecidos continuam resultando em Resumo.
9. A troca normal entre seções autorizadas permanece inalterada.
10. Nenhum conteúdo reservado é renderizado durante a resolução de autorização.
11. Nenhuma query, mutation, procedure ou migration nova é criada.
12. A proteção server-side existente permanece intacta.
13. Typecheck, testes direcionados, suíte completa, build e `git diff --check` passam.
14. Nenhuma Pessoa, Célula, Jornada, Consolidação, follow-up, visita, notificação ou registro financeiro real é criado ou alterado durante a validação.

## Testes obrigatórios

Os testes devem proteger o comportamento da função de normalização e os contratos da página. A matriz mínima deve conter os seguintes casos:

- seção ausente;
- seção desconhecida;
- Cobertura solicitada por Pastor Presidente para Pessoa que é Pastor;
- Cobertura solicitada por Pastor Presidente para Pessoa que não é Pastor;
- Cobertura solicitada por perfil sem autorização pastoral;
- autorização em carregamento;
- URL canonicalizada para Resumo preservando `personId`;
- fechamento da ficha depois do fallback sem reabertura automática;
- seletor mobile sem item de Cobertura quando o acesso não é permitido;
- abas desktop com a mesma lista autorizada do mobile.

A validação visual deve considerar pelo menos 320 px, 390 px e desktop. Deve confirmar que não existe painel vazio, que o Resumo é identificável após o fallback e que não ocorre overflow horizontal.

A validação não deve usar sessão autenticada contra produção para criar dados. A simulação deve usar dados fictícios ou testes estruturais locais.

## Segurança e limites

O guard é uma melhoria de UX e não uma fronteira de segurança. O cliente não pode conceder acesso por meio de `personId`, `section`, papel ou qualquer outro parâmetro enviado pelo navegador. Toda leitura e toda alteração de Cobertura espiritual devem continuar submetidas às guards server-side existentes.

O PR não deve transformar o fallback em uma mensagem de erro alarmante. Para o usuário, a experiência correta é abrir a ficha no Resumo, sem expor a existência de uma configuração pastoral que ele não pode administrar. Logs de desenvolvimento podem registrar o motivo de forma não sensível, mas a interface não deve exibir IDs, papéis internos ou detalhes de autorização.

## Fora do escopo

O PR não mudará os papéis da igreja, não criará uma nova permissão, não alterará quem pode administrar Cobertura espiritual, não mudará a ficha de Pastor, não criará uma página de erro, não introduzirá uma nova rota e não modificará o conteúdo do Resumo.

Também não corrigirá outras regras de negócio da Jornada, da Participação em Célula ou da Consolidação. Essas áreas continuam independentes conforme as decisões dos PRs anteriores.

## Plano de validação

A implementação deve começar por uma função pura de normalização, seguida da integração com o efeito que consome deep links. Depois, devem ser executados typecheck, testes direcionados e `git diff --check`. A suíte completa e o build devem ser executados antes da abertura do PR.

A experiência deve ser simulada localmente com três perfis fictícios: Pastor Presidente acessando um Pastor, Pastor Presidente acessando uma Pessoa comum e liderança sem autorização pastoral. A simulação deve abrir URLs diretas, trocar seções, recarregar a rota e fechar a ficha.

O relatório do PR deve registrar explicitamente que não houve chamada autenticada de produção para criar ou modificar dados e que o servidor continua sendo a autoridade de acesso.

## Decisão arquitetural

O PR mantém `/app/pessoas` como rota canônica e `personId`/`section` como contexto da ficha única. O guard apenas converte uma solicitação de seção em uma seção efetivamente autorizada. Ele não cria uma segunda rota, uma segunda fonte de estado, uma segunda procedure ou uma nova fila.

A alteração também reforça a regra do documento oficial de rotas: o deep link da ficha deve abrir uma seção autorizada, e conhecer a URL não pode substituir a capacidade reconhecida pelo servidor [1].

## Referências

[1]: https://github.com/rch20/idefazei/blob/main/engineering/routes-and-legacy.md "Rotas, aliases e modelos legados — Ide Fazei"
