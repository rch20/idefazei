# Escola de Líderes — contrato server-side da Fase 2

## Escopo

A Fase 2 adiciona o namespace `trpc.escolaLideres.study` para o conteúdo pedagógico independente da Escola de Líderes. Os endpoints legados de turma, matrícula, professor, aula, presença, revisão presencial e liberação continuam no namespace `trpc.escolaLideres` sem alteração de contrato.

As tabelas usadas são exclusivamente `leadership_school_*`. A Biblioteca Digital continua sendo a fonte dos materiais; o vínculo guarda apenas `libraryItemId` dentro do mesmo `churchId`.

## Namespaces

| Namespace | Responsabilidade | Regra principal |
|---|---|---|
| `modules` | listar, criar, editar e mover módulos | turma e `churchId` validados no servidor |
| `studies` | criar, editar, consultar, publicar e arquivar estudos | publicação exige Leia, Entenda, Responda, Aplique e pergunta em Responda |
| `blocks` | criar, editar, mover e listar etapas | `stageKey`: `leia`, `entenda`, `responda`, `aplique` |
| `questions` | criar, editar e listar perguntas | pergunta somente em Responda; resposta correta nunca é enviada à sessão do aluno |
| `materials` | vincular, ordenar e remover referências da Biblioteca | item da biblioteca precisa pertencer à mesma igreja |
| `administrators` | delegar e remover administração pedagógica | somente liderança executiva delega |
| `lessonStudies` | vincular estudo digital a aula presencial | aula e estudo precisam pertencer à mesma turma |
| `student` | trilha, sessão, progresso, respostas, reflexões e conclusão | matrícula ativa, pessoa autenticada, estudo publicado e mesmo tenant |

## Autorização

- Executivos (`pastor_presidente`, `pastor_local`, `secretario`, `supervisor`) podem administrar o conteúdo.
- Um usuário com delegação em `leadership_school_study_administrators` pode administrar o conteúdo.
- Um professor atribuído à turma pode administrar somente a turma atribuída.
- O aluno só recebe estudos publicados da sua própria matrícula ativa e a sessão é resolvida pela Pessoa autenticada.
- Relações cruzadas são conferidas novamente: turma, módulo, estudo, bloco, pergunta, aula, biblioteca e matrícula precisam pertencer à mesma igreja.

## Idempotência e concorrência

A criação de estudos e perguntas exige `clientRequestId` UUID e `requestSchemaVersion`. A mesma chave com o mesmo payload retorna o registro existente; a mesma chave com payload diferente retorna conflito.

As tentativas de resposta aceitam `clientAttemptId` para impedir duplicação por reenvio. As anotações individuais por bloco usam `expectedVersion`; divergência retorna conflito e não sobrescreve a anotação mais nova.

## Proteção de resposta correta

O registro de `correctOptionId` permanece no servidor. A consulta `student.session` retorna apenas `id`, `prompt` e `options`; `student.answerQuestion` calcula `isCorrect` e devolve a explicação depois da tentativa, sem enviar `correctOptionId`.

## Preservação

Esta fase não altera experiência visual, não cria dados, não aplica migration, não executa `pnpm db:push` e não publica em homologação ou produção. A migration 0098 continua aditiva e pendente do fluxo operacional autorizado.
