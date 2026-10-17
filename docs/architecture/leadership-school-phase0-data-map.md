# Fase 0 — Mapa de dados da Escola de Líderes

**Status:** contrato inicial para revisão, sem implementação de tabelas nesta fase.

**Branch:** `feat/leadership-school-parity-phase0-20261017`

**Commit-base:** `109720cf5396cd0c62317585c2e34625d0d79369`

**Worktree:** `/home/ubuntu/foundation-leadership-parity-phase0-20261017/source`

## 1. Objetivo e limites

Este documento define como a Escola de Líderes poderá receber a estrutura pedagógica completa do Fundamento Bíblico sem copiar dados, matrículas, estudos ou históricos.

A Fase 0 cria somente a branch isolada e este mapa. Ela não:

- altera `drizzle/schema.ts`;
- cria migration;
- cria tabela no banco;
- altera router ou frontend;
- cria módulos, estudos, aulas ou matrículas;
- modifica homologação ou produção;
- altera a Escola de Fundamentos.

A regra de separação é: **conteúdo, progresso, permissões e importação novos de Líderes devem usar tabelas e procedures próprias com prefixo `leadership_school_`; turmas, pessoas, professores e aulas atuais serão preservados.**

## 2. Relação de alto nível

```text
Igreja (`churchId`)
└── leadership_school_classes                 EXISTENTE
    ├── leadership_school_enrollments         EXISTENTE
    │   └── Pessoa (`personId`)
    ├── leadership_school_teachers             EXISTENTE
    │   └── Conta da igreja (`churchUserId`)
    ├── leadership_school_modules               NOVA
    │   └── leadership_school_studies           NOVA
    │       ├── leadership_school_study_blocks NOVA
    │       │   └── leadership_school_questions NOVA
    │       │       └── leadership_school_question_attempts NOVA
    │       ├── leadership_school_study_materials NOVA → Biblioteca Digital
    │       ├── leadership_school_study_progress NOVA
    │       └── leadership_school_block_progress NOVA
    ├── leadership_school_lessons              EXISTENTE
    │   ├── leadership_school_attendance       EXISTENTE
    │   └── leadership_school_progress         EXISTENTE
    ├── leadership_school_lesson_studies       NOVA → estudo digital opcional
    └── leadership_school_study_administrators NOVA

    leadership_school_import_drafts            NOVA, prévia editorial
```

A aula presencial e o estudo digital são entidades diferentes. Uma aula pode receber um vínculo opcional com um estudo, mas os registros antigos de aula, presença e revisão continuam válidos mesmo sem esse vínculo.

## 3. Tabelas existentes que serão preservadas

### 3.1 `leadership_school_classes`

Fonte atual das turmas da Escola de Líderes.

| Campo | Uso atual | Regra de preservação |
|---|---|---|
| `id` | Identificador da turma | Não reutilizar em outra igreja |
| `churchId` | Tenant da turma | Obrigatório em toda leitura/escrita |
| `name` | Nome da turma | Não alterar durante a criação da estrutura |
| `period` | Período | Preservar |
| `startDate`, `endDate` | Vigência | Preservar |
| `pastor` | Responsável legado | Preservar; não usar como única regra de permissão |
| `description` | Descrição | Preservar |
| `active` | Estado da turma | Validar no servidor |
| `createdAt` | Auditoria | Preservar |

### 3.2 `leadership_school_enrollments`

Fonte atual das matrículas e vínculo com `people`.

| Campo | Uso atual | Regra de preservação |
|---|---|---|
| `id` | Matrícula | Nunca criar segunda matrícula para substituir uma existente |
| `classId` | Turma | Deve pertencer ao mesmo `churchId` |
| `personId` | Pessoa | Resolver a identidade server-side |
| `churchId` | Tenant | Obrigatório em todas as queries |
| `status` | `matriculado`, `lider_em_formacao`, `concluido`, `cancelado` | Não mudar durante a Fase 0 |
| `grade` | Nota atual | Preservar; futuras avaliações devem ter contrato próprio |
| `attendance` | Percentual de presença | Não misturar com progresso digital |
| `certificateUrl` | Certificado | Preservar |
| `enrolledAt`, `completedAt` | Histórico | Preservar |

### 3.3 `leadership_school_teachers`

Fonte da atribuição explícita de professores por turma.

O novo editor deve reutilizar essa atribuição. Professor não atribuído não deve editar conteúdo ou diário da turma apenas porque consegue abrir a rota.

Índice único existente: igreja, turma e professor.

### 3.4 `leadership_school_lessons`

Fonte das aulas/encontros presenciais já existentes.

A tabela continua responsável por:

- título e resumo do encontro;
- roteiro legado;
- data;
- posição;
- status `rascunho`, `publicada` ou `concluida`;
- autoria e timestamps.

Não transformar automaticamente uma aula antiga em estudo digital. A relação será feita somente por vínculo explícito e aprovado.

### 3.5 `leadership_school_attendance`

Continua sendo a fonte de presença por encontro. Não deve ser usada para marcar automaticamente o estudo digital como concluído.

A unicidade existente por igreja, aula e matrícula deve ser preservada.

### 3.6 `leadership_school_progress`

Continua sendo a fonte de:

- progresso por aula presencial;
- reflexão geral atual da aula;
- revisão do professor;
- observação de reforço;
- liberação do próximo tema;
- auditoria de quem revisou ou liberou.

Ela não deve receber os estados granulares de Leia, Entenda, Responda e Aplique. Esses estados irão para `leadership_school_study_progress` e `leadership_school_block_progress`.

## 4. Tabelas novas propostas

As tabelas abaixo são propostas de contrato. Nenhuma delas foi adicionada ao schema nesta Fase 0.

### 4.1 `leadership_school_modules`

Organiza a sequência de estudos dentro de uma turma.

| Campo proposto | Tipo/semântica |
|---|---|
| `id` | inteiro autoincremental |
| `churchId` | inteiro obrigatório |
| `classId` | referência tenant-aware a `leadership_school_classes.id` |
| `title` | varchar obrigatório |
| `description` | varchar opcional |
| `position` | inteiro obrigatório |
| `active` | booleano obrigatório |
| `createdByChurchUserId` | conta que criou |
| `createdAt`, `updatedAt` | timestamps |

Índice proposto: `(churchId, classId, position)`.

A validação deve confirmar que `classId` pertence ao mesmo `churchId`. Não confiar apenas no `classId` enviado pelo cliente.

### 4.2 `leadership_school_studies`

Conteúdo digital publicado para uma turma e módulo opcional.

| Campo proposto | Tipo/semântica |
|---|---|
| `id` | inteiro autoincremental |
| `churchId` | inteiro obrigatório |
| `classId` | turma de Líderes |
| `moduleId` | módulo opcional, mas validado na mesma turma |
| `title` | título do estudo |
| `weekStart` | data civil opcional |
| `summary` | resumo curto |
| `content` | introdução opcional |
| `position` | ordem dentro do módulo/turma |
| `status` | `rascunho`, `publicada`, `arquivada` |
| `publishedAt` | timestamp de publicação |
| `publishedByChurchUserId` | responsável pela publicação |
| `active` | estado administrativo |
| `createdByChurchUserId` | autoria |
| `clientRequestId` | chave de idempotência da criação |
| `requestHash` | hash do payload confirmado |
| `requestSchemaVersion` | versão do contrato |
| `createdAt`, `updatedAt` | timestamps |

Índices propostos:

- `(churchId, classId, position)`;
- `(churchId, moduleId, position)`;
- `(churchId, classId, status, weekStart)`;
- unicidade de criação por `(churchId, createdByChurchUserId, clientRequestId)` quando a chave não for nula.

A publicação deve ser server-side. Um estudo em rascunho nunca deve aparecer no caminho do aluno.

### 4.3 `leadership_school_study_blocks`

Representa as etapas pedagógicas do estudo.

| Campo proposto | Tipo/semântica |
|---|---|
| `id` | inteiro autoincremental |
| `churchId` | inteiro obrigatório |
| `studyId` | estudo de Líderes |
| `stageKey` | `leia`, `entenda`, `responda` ou `aplique` |
| `title` | título visível |
| `content` | conteúdo da etapa |
| `reflectionPrompt` | pergunta `Para refletir` opcional |
| `position` | ordem |
| `active` | visibilidade durante a preparação |
| `createdByChurchUserId` | autoria |
| `createdAt`, `updatedAt` | timestamps |

A etapa deve ter `stageKey` explícito. Não usar somente o texto do título para descobrir se é Leia, Entenda, Responda ou Aplique.

A primeira versão pode usar um bloco principal de cada etapa. Se houver necessidade pedagógica real de mais de um bloco por etapa, a ordem deve ser suportada sem mudar o significado do `stageKey`.

Índice proposto: `(churchId, studyId, position)`.

### 4.4 `leadership_school_questions`

Perguntas vinculadas aos blocos de estudo.

| Campo proposto | Tipo/semântica |
|---|---|
| `id` | inteiro autoincremental |
| `churchId` | inteiro obrigatório |
| `blockId` | bloco de Líderes |
| `prompt` | pergunta |
| `options` | JSON validado de alternativas |
| `correctOptionId` | gabarito protegido |
| `explanation` | explicação após a tentativa |
| `position` | ordem |
| `active` | estado |
| `createdByChurchUserId` | autoria |
| `clientRequestId` | idempotência |
| `requestHash` | hash do payload |
| `requestSchemaVersion` | versão do contrato |
| `createdAt`, `updatedAt` | timestamps |

Índice proposto: `(churchId, blockId, position)`.

O servidor deve confirmar que o bloco pertence ao estudo e à turma informados. O payload público da pergunta não deve conter `correctOptionId` nem dados internos de idempotência.

### 4.5 `leadership_school_question_attempts`

Tentativas append-only do aluno.

| Campo proposto | Tipo/semântica |
|---|---|
| `id` | inteiro autoincremental |
| `churchId` | tenant |
| `enrollmentId` | matrícula de Líderes |
| `questionId` | pergunta de Líderes |
| `selectedOptionId` | alternativa escolhida |
| `isCorrect` | resultado calculado no servidor |
| `attemptNumber` | número da tentativa |
| `clientAttemptId` | idempotência/reenvio |
| `answeredAt` | timestamp |

Índices e unicidade propostas:

- `(churchId, enrollmentId, questionId)`;
- `(churchId, enrollmentId, questionId, clientAttemptId)` único quando aplicável.

A tentativa deve verificar matrícula, estudo, bloco, turma e igreja antes de gravar.

### 4.6 `leadership_school_study_materials`

Vínculos próprios entre um estudo de Líderes e a Biblioteca Digital.

| Campo proposto | Tipo/semântica |
|---|---|
| `id` | inteiro |
| `churchId` | tenant |
| `studyId` | estudo de Líderes |
| `libraryItemId` | item existente da Biblioteca |
| `position` | ordem |
| `notes` | observação do vínculo |
| `createdAt` | timestamp |

Índice proposto: `(churchId, studyId, position)` e unicidade `(churchId, studyId, libraryItemId)`.

O arquivo não será copiado. Desvincular o material do estudo não remove o item da Biblioteca.

### 4.7 `leadership_school_study_progress`

Progresso digital da matrícula em cada estudo.

| Campo proposto | Tipo/semântica |
|---|---|
| `id` | inteiro |
| `churchId` | tenant |
| `enrollmentId` | matrícula existente |
| `studyId` | estudo de Líderes |
| `status` | `nao_iniciada`, `em_andamento`, `concluida` |
| `lastBlockPosition` | retomada |
| `startedAt`, `lastAccessedAt`, `completedAt` | timestamps |
| `reflection` | anotação geral opcional, se aprovada |
| `reflectionVersion` | controle de conflito |
| `reviewStatus` | revisão pedagógica, se aplicável |
| `reviewNotes` | observação do professor |
| `reviewedAt`, `reviewedByChurchUserId` | auditoria |
| `releasedAt`, `releasedByChurchUserId` | liberação específica, se necessária |
| `createdAt`, `updatedAt` | timestamps |

Unicidade proposta: `(churchId, enrollmentId, studyId)`.

A presença continuará fora desta tabela.

### 4.8 `leadership_school_block_progress`

Progresso granular e anotações individuais por etapa.

| Campo proposto | Tipo/semântica |
|---|---|
| `id` | inteiro |
| `churchId` | tenant |
| `enrollmentId` | matrícula |
| `studyId` | estudo |
| `blockId` | etapa/bloco |
| `status` | `em_andamento` ou `concluida` |
| `firstViewedAt`, `lastViewedAt`, `completedAt` | timestamps |
| `reflection` | anotação do aluno |
| `reflectionVersion` | versão para conflito |
| `createdAt`, `updatedAt` | timestamps |

Unicidade proposta: `(churchId, enrollmentId, studyId, blockId)`.

A anotação do aluno não deve ser um campo do professor e não deve ser compartilhada com outra escola.

### 4.9 `leadership_school_lesson_studies`

Vínculo opcional entre a aula presencial existente e o estudo digital.

| Campo proposto | Tipo/semântica |
|---|---|
| `id` | inteiro |
| `churchId` | tenant |
| `lessonId` | aula existente |
| `studyId` | estudo digital de Líderes |
| `createdByChurchUserId` | autoria do vínculo |
| `createdAt` | timestamp |

Unicidade proposta: `(churchId, lessonId, studyId)`.

A exclusão do vínculo não exclui nem a aula nem o estudo.

### 4.10 `leadership_school_study_administrators`

Delegação própria para administrar o conteúdo da Escola de Líderes.

| Campo proposto | Tipo/semântica |
|---|---|
| `id` | inteiro |
| `churchId` | tenant |
| `churchUserId` | administrador designado |
| `assignedByChurchUserId` | pastor responsável |
| `createdAt` | timestamp |

Unicidade proposta: `(churchId, churchUserId)`.

Essa delegação não concede automaticamente administração de Fundamentos.

### 4.11 `leadership_school_import_drafts`

Prévia editorial para futuro Excel de Líderes.

| Campo proposto | Tipo/semântica |
|---|---|
| `id` | inteiro |
| `churchId` | tenant |
| `classId` | turma destino |
| `createdByChurchUserId` | autor do upload |
| `sourceFilename` | nome sanitizado |
| `fileSha256` | hash do arquivo |
| `status` | pendente, confirmado, cancelado ou expirado |
| `payload` | conteúdo validado da prévia |
| `summary` | contagens e avisos |
| `expiresAt` | expiração |
| `createdAt`, `confirmedAt` | auditoria |

O parser de Fundamentos pode fornecer infraestrutura técnica, mas o contrato do workbook e o destino transacional de Líderes devem ser explícitos e separados.

## 5. Relação entre fontes de verdade

| Conceito | Fundamentos | Líderes após a evolução |
|---|---|---|
| Turma | `courses` | `leadership_school_classes` |
| Matrícula | `course_enrollments` | `leadership_school_enrollments` |
| Módulo | `foundation_modules` | `leadership_school_modules` |
| Estudo | `foundation_studies` | `leadership_school_studies` |
| Etapa | `foundation_study_blocks` | `leadership_school_study_blocks` |
| Pergunta | `foundation_questions` | `leadership_school_questions` |
| Tentativa | `foundation_question_attempts` | `leadership_school_question_attempts` |
| Material | `foundation_study_materials` | `leadership_school_study_materials` |
| Progresso do estudo | `foundation_lesson_progress` | `leadership_school_study_progress` |
| Progresso da etapa | `foundation_block_progress` | `leadership_school_block_progress` |
| Aula presencial | `foundation_classes` | `leadership_school_lessons` |
| Presença | `foundation_class_attendance` | `leadership_school_attendance` |
| Revisão/liberação | progresso de Fundamentos | `leadership_school_progress` e/ou estudo de Líderes, conforme contrato final |
| Biblioteca | `library_items` | `library_items`, com vínculo próprio |

A tabela `library_items` é um acervo compartilhado por igreja. O compartilhamento é intencional e não representa compartilhamento de conteúdo pedagógico ou progresso.

## 6. Router e camada de banco previstos

### Procedures atuais de Líderes que permanecem

O namespace `escolaLideres` já possui contratos para:

- `studentPath`;
- `startStudentLesson`;
- `completeStudentLesson`;
- `access`;
- `teacherCandidates`;
- `teachers`;
- `teacherClasses`;
- `lessons`;
- `lessonRoster`;
- `assignTeacher` e `removeTeacher`;
- `createLesson` e `updateLesson`;
- `saveAttendance`;
- `reviewProgress`;
- `releaseNextLesson`;
- `listClasses`, `getEnrollments`, `createClass`, `enroll` e `updateEnrollment`.

Esses contratos devem continuar atendendo os dados atuais.

### Procedures novas previstas

Os nomes abaixo são um mapa inicial, não implementação:

- `listModules` / `createModule` / `updateModule` / `moveModule`;
- `listStudies` / `createStudy` / `updateStudy` / `publishStudy` / `moveStudy`;
- `studySession` / `startStudy` / `viewStudyBlock` / `completeStudyBlock`;
- `studentHistory` / `studyProgress`;
- `listQuestionBlocks` / `manageStudyQuestions`;
- `createQuestionBlock` / `updateQuestionBlock` / `moveQuestionBlock`;
- `createStudyQuestion` / `updateStudyQuestion`;
- `answerQuestion`;
- `saveReflection` / `saveBlockReflection`;
- `listStudyMaterials` / `attachStudyMaterial` / `moveStudyMaterial` / `detachStudyMaterial`;
- `listStudyAdministrators` / `assignStudyAdministrator` / `removeStudyAdministrator`;
- `linkLessonStudy` / `unlinkLessonStudy`;
- `getStudyCreationStatus`;
- `leadershipImport.getPreview` / `confirm` / `cancel`, se o Excel for aprovado.

Cada procedure deve usar guards próprios e verificar relações completas dentro do mesmo tenant.

### Helpers previstos em `server/db.ts`

Os helpers devem usar o prefixo `getLeadershipStudy*`, `createLeadershipStudy*`, `updateLeadershipStudy*` e não chamar helpers de Fundamentos para gravar dados.

Quando um helper precisar consultar uma tabela compartilhada, como `library_items`, ele deve aplicar o filtro de `churchId` da sessão e validar a relação com o estudo de Líderes.

## 7. Permissões previstas

| Ação | Pastor/supervisor autorizado | Administrador designado de Líderes | Professor atribuído | Aluno matriculado |
|---|---:|---:|---:|---:|
| Criar/editar turma | Sim | Conforme regra atual | Não | Não |
| Matricular aluno | Sim | Conforme regra atual | Não | Não |
| Atribuir professor | Sim | Conforme regra atual | Não | Não |
| Criar/editar módulo | Sim | Sim | Conforme decisão de produto, preferencialmente sim na turma atribuída | Não |
| Criar/editar estudo | Sim | Sim | Sim, apenas turma atribuída, se aprovado | Não |
| Publicar estudo | Sim | Sim | Conforme regra explícita, nunca apenas no cliente | Não |
| Responder pergunta | Não | Não | Não | Sim, na própria matrícula |
| Salvar anotação | Não | Não | Não | Sim, na própria matrícula |
| Registrar presença | Sim | Sim | Sim, turma atribuída | Não |
| Revisar/liberar aula | Sim | Sim | Sim, turma atribuída | Não |
| Ver progresso de alunos | Sim | Sim | Apenas turmas atribuídas | Somente o próprio |

O desenho final das permissões de criação por professor será aprovado antes da Fase 2. O guard server-side será obrigatório em qualquer opção.

## 8. Invariantes de isolamento

1. Todo registro novo terá `churchId`.
2. `classId`, `moduleId`, `studyId`, `blockId`, `lessonId`, `enrollmentId` e `personId` serão conferidos em cadeia no servidor.
3. Nenhum ID de Fundamentos será aceito em uma procedure de Líderes.
4. Nenhuma procedure de Líderes gravará em tabelas `foundation_*`.
5. Nenhuma procedure de Fundamentos passará a ler tabelas `leadership_school_*` sem contrato explícito.
6. Matrículas atuais não serão recriadas para habilitar a nova experiência.
7. Aulas antigas continuarão acessíveis mesmo sem estudo digital.
8. Presença não marcará estudo como concluído automaticamente.
9. Estudo em rascunho não aparecerá no caminho do aluno.
10. Resposta correta não aparecerá no payload público antes da tentativa.
11. Biblioteca será compartilhada somente como acervo tenant-aware; vínculos serão próprios.
12. Prévia e importação não gravarão conteúdo definitivo antes da confirmação.
13. Conflito de anotação não sobrescreverá silenciosamente uma versão mais nova.

## 9. Arquivos previstos para a próxima fase

Apenas como allowlist inicial, sujeita à revisão:

- `drizzle/schema.ts`;
- nova migration aditiva gerada pelo fluxo oficial;
- `server/db.ts` ou módulo de banco de Líderes extraído;
- `server/routers.ts` ou router de Líderes extraído;
- `server/leadership-school-study*.test.ts`;
- `client/src/pages/EscolaLideres.tsx`;
- `client/src/pages/EscolaLideresProfessor.tsx`;
- `client/src/pages/EscolaLideresAluno.tsx`;
- novos componentes `client/src/pages/leadership/`;
- `client/src/pages/EscolaLideresFlows.test.ts`;
- novos testes de isolamento, matrícula, publicação e progresso.

Arquivos proibidos nesta iniciativa sem aprovação específica:

- dados ou dumps;
- `.env`, cookies, storage state e tokens;
- produção e wrappers de deploy;
- tabelas `foundation_*` para gravação de Líderes;
- exclusão ou alteração de registros existentes de Líderes;
- criação de uma terceira rota ou uma terceira escola.

## 10. Decisões que precisam ser fechadas antes da migration

1. Se cada etapa terá exatamente um bloco principal ou vários blocos ordenados.
2. Se professor atribuído poderá publicar ou se publicação ficará restrita à liderança.
3. Se estudo publicado libera automaticamente a primeira etapa e as demais, ou se haverá liberação após revisão presencial.
4. Se estudos digitais sempre serão vinculados a uma aula presencial ou poderão existir independentemente.
5. Se a reflexão geral atual da aula será mantida separada da anotação por etapa do estudo.
6. Qual será o contrato do Excel de Líderes, se a importação for priorizada.
7. Quais relatórios serão obrigatórios na primeira entrega.
8. Como o certificado atual usará estudos digitais sem alterar o histórico já concluído.

## 11. Critério de encerramento da Fase 0

A Fase 0 será considerada encerrada quando:

- a branch isolada existir a partir do commit-base registrado;
- o mapa de dados estiver versionado nessa branch;
- as tabelas atuais e propostas estiverem distinguidas;
- não houver migration ou alteração de schema nesta fase;
- as invariantes de tenant e histórico estiverem registradas;
- as decisões pendentes forem aprovadas antes da Fase 1.
