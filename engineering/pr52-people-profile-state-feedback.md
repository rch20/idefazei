# PR #52 — Estados confiáveis da ficha de Pessoas

**Status:** especificação técnica para implementação

**Escopo:** experiência da ficha central de Pessoas/Discípulos

**Base:** commit `ac16153`, após o PR #51

## Resumo executivo

O PR #52 deve tornar os estados da ficha de Pessoas mais confiáveis e previsíveis. A ficha já possui resumo executivo, navegação progressiva, linha do tempo e proteção de deep links. O próximo problema é que algumas áreas ainda usam o mesmo texto para representar situações diferentes: carregamento, ausência de registro, falta de permissão e erro de consulta.

A melhoria deve padronizar esses estados sem criar nova fonte de dados, nova rota ou novo contrato de servidor. O usuário precisa saber se uma informação ainda está carregando, se não existe, se está indisponível para seu perfil ou se ocorreu uma falha temporária.

> **Regra de produto:** ausência de dados só pode ser apresentada como estado final depois que a consulta correspondente terminar com sucesso. Carregamento e erro não podem ser apresentados como “Pendente”, “Sem Célula”, “Não definido” ou “Nenhum registro”.

A alteração será exclusivamente de experiência no cliente. O servidor continuará sendo a autoridade para autenticação, tenant, escopo e autorização.

## Problema atual

A página `Pessoas.tsx` consulta vários contextos da ficha em paralelo. Entre eles estão o cuidado atual, o histórico de cuidado, a participação em Célula, o histórico de Células, a Jornada, as participações em Ministérios, os acessos efetivos, a Cobertura espiritual e o painel de atenção.

Essas consultas não apresentam uma política uniforme para os estados de leitura. Há exemplos de comportamentos que podem confundir a liderança:

1. O indicador de Célula pode exibir **Pendente** enquanto a consulta ainda não terminou, embora a situação real ainda não tenha sido determinada.
2. A ficha pode exibir **Nenhum responsável definido** quando a consulta de cuidado falhou, confundindo falha técnica com ausência de responsável.
3. O resumo pode exibir **Nenhum próximo passo definido** enquanto o painel de atenção ainda está carregando ou quando o perfil não possui acesso a essa projeção.
4. Participações ministeriais, funções e acessos podem parecer vazios sem que o usuário saiba se a lista está carregando, se não há registros ou se a leitura falhou.
5. Os textos de carregamento variam entre as seções e alguns erros são enviados somente para o console ou não possuem uma ação de recuperação visível.
6. Após uma atualização, uma nova consulta pode estar em andamento enquanto o conteúdo anterior continua válido. Substituir imediatamente o conteúdo por um estado vazio cria uma sensação de perda ou inconsistência.

O problema não é falta de dados de negócio. É falta de distinção visual entre estados de leitura.

## Objetivo

Ao abrir ou atualizar uma ficha, a liderança deve conseguir distinguir rapidamente:

- **Carregando:** a informação ainda está sendo consultada;
- **Disponível:** a consulta terminou e há dados para mostrar;
- **Vazio válido:** a consulta terminou e não há registros para aquele contexto;
- **Indisponível:** o perfil não possui acesso à projeção ou à seção;
- **Erro temporário:** a consulta falhou e pode ser repetida;
- **Atualizando:** havia dados válidos e uma nova leitura está ocorrendo em segundo plano.

O resumo executivo deve evitar inferências incorretas. A ação principal só deve ser exibida quando o estado de atenção estiver suficientemente resolvido e a capacidade de executar a ação estiver confirmada.

## Escopo funcional

### 1. Componente visual comum para estados de seção

Criar um componente presentacional pequeno, por exemplo `PersonSectionState`, em `client/src/components/PersonSectionState.tsx`. Esse componente não deve consultar backend, decidir permissões ou navegar.

Ele deve aceitar, no mínimo:

- variante `loading`, `empty`, `error` ou `unavailable`;
- título curto;
- descrição opcional;
- ação opcional de repetição;
- estado de atualização em segundo plano, quando aplicável;
- identificação acessível para `role="status"` ou `role="alert"`.

A variante de erro deve oferecer **Tentar novamente** somente quando a página fornecer uma função de `refetch`. O retry deve repetir uma leitura existente. Ele não pode executar mutation, alterar dados ou conceder acesso.

O componente deve ser compacto e adequado ao uso dentro de cards, grids e seções do diálogo. Não deve bloquear a ficha inteira por causa da falha de uma consulta secundária.

### 2. Resumo executivo

O `PersonExecutiveSummary` deve receber um estado explícito para o painel de atenção, em vez de interpretar `undefined` como uma única situação.

A matriz mínima deve distinguir:

| Estado | Apresentação esperada | Ação principal |
|---|---|---:|
| Carregando | Skeleton ou mensagem compacta de carregamento | Não exibir |
| Erro sem dado anterior | Estado de erro com **Tentar novamente** | Não exibir |
| Indisponível para o perfil | Mensagem neutra de indisponibilidade | Não exibir |
| Disponível com atenção | Próximo passo, prioridade e motivos | Exibir somente se autorizado |
| Disponível sem atenção | Acompanhamento em dia ou ausência válida de pendência | Não exibir |
| Atualizando com dado anterior | Manter o último conteúdo válido e indicar atualização discreta | Manter se ainda autorizado |

O componente não deve mostrar **Pendente**, **Não definido** ou **Nenhum próximo passo definido** enquanto a consulta ainda estiver pendente ou em erro.

A ausência de um item no painel de atenção, depois de uma consulta bem-sucedida, deve ser apresentada como um estado válido. Ela não deve ser confundida com ausência de acesso ao painel.

### 3. Participação em Célula

A seção de Participações e o indicador do Resumo devem usar a mesma regra de estado:

- enquanto `personParticipation` estiver carregando, mostrar **Carregando participação**;
- se a consulta falhar sem dado anterior, mostrar erro local com retry;
- somente após sucesso, mostrar **Integrada** ou **Pendente**;
- somente após sucesso, mostrar **Célula atual: Sem Célula**;
- somente após sucesso, informar se há ou não histórico anterior.

A regra de negócio já definida deve ser preservada:

> Jornada representa o progresso geral. Participação em Célula representa a integração comunitária atual. Sem Célula é uma situação válida. Pendente não retrocede a Jornada. Histórico preserva participações anteriores.

O PR não deve alterar a mutation de integração, transferência ou saída de Célula.

### 4. Cuidado e Consolidação

Na seção de Cuidado:

- o responsável atual deve ter skeleton durante o carregamento;
- erro de leitura não deve ser apresentado como **Nenhum responsável definido**;
- ausência de responsável só deve aparecer depois de uma resposta bem-sucedida sem responsável;
- o histórico de cuidado deve distinguir carregamento, erro e zero atribuições;
- o formulário de atualização continua visível somente conforme a capacidade já existente;
- o encaminhamento para Consolidação continua pertencendo à área dona da Consolidação e não ganha uma segunda fila na ficha.

As mutations atuais continuam usando os toasts existentes para sucesso e falha. O PR pode acrescentar `aria-busy` e feedback visual de atualização, mas não deve criar uma segunda confirmação para a mesma operação.

### 5. Jornada

A seção de Jornada deve manter os skeletons atuais durante o carregamento inicial e apresentar um estado de erro local quando a consulta falhar sem dados anteriores.

Quando houver dados válidos e uma atualização em segundo plano, a lista deve permanecer visível. Um indicador discreto pode informar que a Jornada está sendo atualizada, sem remover os cards nem substituí-los por um estado vazio.

Os seguintes significados permanecem inalterados:

- a etapa principal continua sendo o progresso geral;
- frentes paralelas continuam independentes da etapa principal;
- uma etapa anterior permanece histórica;
- ações de Jornada continuam sujeitas à autoridade existente;
- o PR não cria nova etapa, status ou mutation.

### 6. Cobertura espiritual

O guard implementado no PR #51 deve ser preservado.

Enquanto a autorização pastoral ou a identidade pastoral estiverem carregando, nenhum conteúdo reservado deve ser mostrado. Se a consulta autorizada falhar, a tela deve mostrar um erro local neutro ou manter o estado seguro definido pelo guard. Não deve revelar IDs, papéis internos, detalhes do tenant ou informação pastoral reservada.

O PR não deve modificar:

- `resolvePersonSection`;
- a regra de Pastor Presidente;
- a validação server-side das procedures de Cobertura espiritual;
- a lista de opções autorizadas no seletor mobile e nas abas desktop.

### 7. Participações, Ministérios e acessos

Na seção de Participações:

- Ministérios, atuações e acessos devem possuir estados de loading, erro e vazio distintos;
- **Nenhum Ministério ativo** só pode aparecer após sucesso com lista vazia;
- **Nenhuma função manual atribuída** só pode aparecer após sucesso com lista vazia;
- falta de login vinculado deve continuar sendo um estado de dados válido, diferente de falha de leitura;
- erro de uma das três consultas não deve apagar visualmente as outras duas áreas que carregaram com sucesso.

A ficha continua sendo uma visão contextual. A administração de membros e funções permanece no Ministério correspondente.

### 8. Histórico

A linha do tempo do PR #49 deve continuar sendo somente de leitura. O estado vazio atual deve permanecer quando todas as fontes terminarem com sucesso e não houver eventos.

Se uma fonte necessária falhar, o componente não deve afirmar que não há histórico. Deve apresentar um estado de erro ou uma indicação de que o histórico está incompleto, conforme a disponibilidade do modelo atual.

A precedência moderna/legada, as categorias e a regra de não duplicação do PR #49 permanecem intactas.

## Modelo de estado recomendado

A página pode derivar um estado de visualização a partir das queries existentes. Não deve ser criada uma nova fonte persistente nem uma nova query agregadora apenas para a UX.

Um tipo local equivalente ao seguinte pode ser usado, com nomes ajustados ao código existente:

```ts
type PersonReadState =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "empty" }
  | { kind: "unavailable" }
  | { kind: "error"; retry: () => void }
  | { kind: "refreshing" };
```

A implementação deve respeitar estas regras:

1. `isLoading` sem dados deve produzir `loading`.
2. `isError` sem dados deve produzir `error`.
3. Dados carregados com lista vazia devem produzir `empty`.
4. Dados carregados com conteúdo devem produzir `ready`.
5. Query desabilitada por falta de capacidade deve produzir `unavailable`, não `empty`.
6. Refetch com dados anteriores deve preservar o conteúdo e indicar `refreshing`, sem apagar a tela.
7. O estado de autorização da Cobertura espiritual continua sendo resolvido separadamente pelo guard do PR #51.

O modelo é somente de apresentação. Ele não pode substituir os gates server-side nem representar um novo estado de negócio.

## Arquivos previstos

| Arquivo | Alteração planejada |
|---|---|
| `client/src/components/PersonSectionState.tsx` | Novo componente presentational para loading, vazio, erro, indisponível e retry acessível |
| `client/src/components/PersonExecutiveSummary.tsx` | Receber estado explícito do painel de atenção e evitar valores finais durante loading/erro |
| `client/src/pages/Pessoas.tsx` | Derivar os estados das queries existentes, aplicar mensagens consistentes e conectar retries locais |
| `client/src/pages/PessoasJourney.test.ts` | Proteger a matriz de estados do resumo, Cuidado, Célula, Jornada e Histórico |
| `client/src/pages/MobileExperience.test.ts` | Proteger legibilidade, altura de toque, foco, `aria-live` e ausência de overflow |
| `client/src/components/PersonSectionState.test.ts` | Testar as variantes visuais e a ação de retry sem backend |
| `engineering/pr52-people-profile-state-feedback.md` | Registrar esta especificação e os critérios de aceite |

Não devem ser alterados `server/routers.ts`, `server/db.ts`, `drizzle/schema.ts`, migrations, tabelas, procedures, permissões ou dados reais.

## Critérios de aceite

1. Nenhuma seção apresenta estado vazio enquanto sua consulta ainda estiver carregando.
2. Nenhuma seção apresenta estado vazio como consequência de erro de consulta.
3. O Resumo não mostra uma ação principal enquanto o painel de atenção estiver carregando, indisponível ou em erro sem dado anterior.
4. O Resumo mostra uma ação principal somente quando a capacidade existente permite executá-la.
5. A participação em Célula só mostra **Integrada** ou **Pendente** depois de uma resposta bem-sucedida.
6. **Sem Célula** só é mostrado depois que a participação foi carregada com sucesso.
7. **Nenhum responsável definido** só é mostrado depois de uma resposta bem-sucedida sem responsável.
8. Ministérios, atuações e acessos distinguem loading, erro, vazio e falta de login vinculado.
9. A Jornada preserva o conteúdo anterior durante refetch em segundo plano.
10. O Histórico não informa ausência de atividades quando uma fonte essencial falhou.
11. Cada estado de erro possui uma mensagem neutra e uma ação acessível de retry quando o refetch estiver disponível.
12. Retry repete somente a leitura existente e não realiza mutation.
13. Mutations continuam com os contratos, guards, idempotência e toasts atuais.
14. O guard de deep link de Cobertura espiritual do PR #51 permanece intacto.
15. O mobile mantém alvos de toque com pelo menos 44 px, foco visível, `aria-live` ou `role` adequado e nenhuma rolagem horizontal.
16. A ficha não bloqueia todas as seções porque uma consulta secundária falhou.
17. Não é criada nova rota, nova query agregadora, nova procedure, nova tabela, migration ou fonte paralela de estado.
18. Typecheck, testes direcionados, suíte completa, build e `git diff --check` passam.
19. Nenhuma Pessoa, Célula, Jornada, Consolidação, follow-up, visita, cobertura pastoral, notificação ou registro financeiro real é criado ou alterado durante a validação.

## Matriz mínima de testes

A cobertura deve incluir, no mínimo:

- resumo com atenção carregando;
- resumo com atenção disponível e próximo passo autorizado;
- resumo com atenção disponível sem pendência;
- resumo sem acesso ao painel de atenção;
- erro do painel de atenção sem dado anterior;
- refetch do painel de atenção com dado anterior preservado;
- participação em Célula carregando;
- participação em Célula integrada;
- participação pendente depois de sucesso;
- participação sem histórico depois de sucesso;
- erro na participação sem ser exibido como Pendente;
- Cuidado sem responsável depois de sucesso;
- erro de Cuidado sem ser exibido como ausência de responsável;
- Ministérios carregando, vazio, preenchido e com erro;
- Jornada carregando, preenchida e atualizando em segundo plano;
- Histórico vazio depois de sucesso;
- Histórico com erro sem mensagem falsa de ausência;
- Cobertura espiritual protegida durante carregamento e após fallback do PR #51;
- retry acionável por teclado e com feedback acessível;
- viewport de 320 px e 390 px sem overflow.

## Simulação visual

A revisão visual deve usar uma prévia local temporária com dados fictícios. A prévia deve cobrir pelo menos quatro cenários:

1. ficha completamente carregando;
2. ficha carregada com dados e próxima ação;
3. ficha carregada sem Célula e sem responsável;
4. erro de uma consulta secundária com as demais áreas disponíveis.

A simulação deve ser executada em 320×844, 390×844 e desktop. O estado de erro deve permitir acionar um retry fictício sem fazer chamada ao backend. A prévia e sua rota devem ser removidas antes do commit.

Não deve ser usado login autenticado contra produção. Não devem ser criados registros reais para testar os estados.

## Segurança e limites

Este PR melhora a representação visual do estado de leitura. Ele não é uma fronteira de segurança.

O cliente não pode inferir autorização a partir de `personId`, `section`, papel enviado pela URL ou qualquer dado controlado pelo navegador. A ausência de uma opção no menu não substitui a proteção server-side.

Mensagens de erro não devem expor stack trace, SQL, IDs internos, tokens, nomes de tabelas, detalhes de tenant ou dados pastorais reservados. O texto mostrado à liderança deve ser curto e acionável.

Retry deve repetir somente uma consulta já autorizada. Se a query estiver desabilitada por capacidade, a interface deve usar o estado **indisponível**, não tentar contornar a decisão executando uma chamada manual.

## Fora do escopo

O PR não criará uma segunda ficha, uma nova aba, uma nova rota ou uma nova fila. Não alterará a Jornada, a participação em Célula, a Cobertura espiritual, o fluxo de Consolidação, a matriz de permissões ou o modelo de dados.

Também não introduzirá uma central global de notificações, não substituirá o sistema de toasts, não criará auditoria nova, não fará persistência de estados de UI e não alterará o conteúdo ou a ordem das seções.

A confirmação de ações potencialmente destrutivas, como sair de Célula ou remover Cobertura espiritual, permanece fora deste PR. Essas operações podem ser tratadas em um PR de segurança de ações separado para não misturar dois problemas de UX.

## Plano de implementação

A implementação deve seguir esta ordem:

1. criar o componente presentational de estados;
2. definir as cópias curtas e acessíveis para loading, erro, indisponível e vazio;
3. adaptar o resumo executivo para receber um estado explícito de atenção;
4. aplicar os estados às áreas de Cuidado, Célula, Jornada, Participações, Cobertura e Histórico;
5. conectar retries às queries existentes;
6. adicionar testes estruturais e de componente;
7. simular os quatro cenários em mobile e desktop;
8. remover a prévia temporária;
9. executar typecheck, testes direcionados, suíte completa, build e `git diff --check`;
10. revisar o diff para garantir que nenhum arquivo de servidor, schema, migration ou dado real entrou no escopo.

## Decisão arquitetural

A ficha de Pessoas continua sendo a rota canônica e o destino central da identidade da Pessoa. O PR adiciona uma camada de apresentação para tornar explícitos os estados das leituras que já existem.

A camada de estado visual não será uma máquina de estados de negócio. Ela não criará novos status persistentes, não substituirá os estados de Jornada, não alterará a participação em Célula e não duplicará a fila de Consolidação.

A separação segue o princípio de uma fonte principal por conceito e uma área dona por ação. A ficha continua consultando projeções autorizadas e encaminhando operações para os domínios donos [1]. O PR #50 permanece responsável pela navegação progressiva no mobile [2], e o PR #51 permanece responsável pelo fallback seguro de deep links pastorais [3].

## Referências

[1]: https://github.com/rch20/idefazei/blob/main/engineering/routes-and-legacy.md "Rotas, aliases e modelos legados — Ide Fazei"

[2]: https://github.com/rch20/idefazei/blob/main/engineering/pr50-people-mobile-section-navigation.md "PR #50 — Navegação progressiva da ficha de Pessoas no mobile"

[3]: https://github.com/rch20/idefazei/blob/main/engineering/pr51-pastoral-coverage-deeplink-guard.md "PR #51 — Guard de deep link da Cobertura espiritual na ficha de Pessoas"
