import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const compactSource = (source: string) =>
  source
    .replace(/\s+/g, " ")
    .replace(/\basync\s+\(\s*([A-Za-z_$][\w$]*)\s*\)/g, "async $1")
    .replace(/\(\s*([A-Za-z_$][\w$]*)\s*\)\s*=>/g, "$1 =>")
    .replace(/\s+\./g, ".")
    .replace(/\.\s+/g, ".")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/,\s*}/g, "}")
    .replace(/\s+}/g, "}")
    .trim();

const schema = compactSource(readFileSync("drizzle/schema.ts", "utf8"));
const migration = compactSource(
  readFileSync("drizzle/0079_foundation_mobile_progress.sql", "utf8")
);
const ledger = compactSource(
  readFileSync("drizzle/custom-migrations.json", "utf8")
);
const db = compactSource(readFileSync("server/db.ts", "utf8"));
const router = compactSource(readFileSync("server/routers.ts", "utf8"));
const experience = compactSource(
  readFileSync(
    "client/src/pages/foundation/StudentLearningExperience.tsx",
    "utf8"
  ) +
    readFileSync("client/src/pages/foundation/FoundationStageNotes.tsx", "utf8")
);
const page = compactSource(
  readFileSync("client/src/pages/EscolaFundamentos.tsx", "utf8")
);

describe("experiência mobile-first da Escola de Fundamentos", () => {
  it("cria progresso detalhado por bloco sem substituir o progresso geral", () => {
    expect(schema).toContain(
      compactSource('mysqlTable("foundation_block_progress"')
    );
    expect(schema).toContain(
      compactSource("foundation_block_progress_enrollment_study_block_unique")
    );
    expect(migration).toContain(
      compactSource("CREATE TABLE IF NOT EXISTS foundation_block_progress")
    );
    expect(migration).toContain(
      compactSource(
        "UNIQUE KEY foundation_block_progress_enrollment_study_block_unique"
      )
    );
    expect(schema).toContain(compactSource("foundationLessonProgress"));
  });

  it("registra a migration no ledger com checksum calculado", () => {
    expect(ledger).toContain(compactSource('"id": "0079"'));
    expect(ledger).toContain(
      compactSource("drizzle/0079_foundation_mobile_progress.sql")
    );
    expect(ledger).not.toContain(compactSource("TO_BE_CALCULATED"));
  });

  it("usa uma sessão única para desktop e mobile", () => {
    expect(router).toContain(compactSource("studySession: tenantProcedure"));
    expect(router).toContain(compactSource("getFoundationStudySession"));
    expect(experience).toContain(compactSource("studySession.useQuery"));
    expect(experience).toContain(
      compactSource(
        'AdaptiveFormDialogContent className="sm:max-w-6xl lg:max-h-[calc(100dvh-3rem)]"'
      )
    );
    expect(experience).toContain(
      compactSource("lg:grid-cols-[minmax(0,1fr)_280px]")
    );
  });

  it("preserva espaço para o rodapé sem esconder perguntas interativas", () => {
    expect(experience).toContain(
      compactSource("pb-[calc(5rem+env(safe-area-inset-bottom))]")
    );
    expect(experience).toContain(compactSource("sm:pb-20"));
    expect(experience).toContain(compactSource("<AdaptiveFormDialogFooter>"));
  });

  it("salva visualização, conclusão de bloco e reflexão automaticamente", () => {
    expect(router).toContain(compactSource("viewStudyBlock: tenantProcedure"));
    expect(router).toContain(
      compactSource("completeStudyBlock: tenantProcedure")
    );
    expect(router).toContain(compactSource("saveReflection: tenantProcedure"));
    expect(experience).toContain(compactSource("viewStudyBlock.useMutation"));
    expect(experience).toContain(
      compactSource("completeStudyBlock.useMutation")
    );
    expect(experience).toContain(compactSource("void sessionQuery.refetch()"));
    expect(experience).not.toContain(
      compactSource("onSuccess: async (result) =>")
    );
    expect(router).toContain(
      compactSource("saveBlockReflection: tenantProcedure")
    );
    expect(experience).toContain(
      compactSource("saveBlockReflection.useMutation")
    );
    expect(experience).toContain(compactSource("Salvo automaticamente"));
  });

  it("mantém a pergunta depois da leitura e só libera avanço após acerto", () => {
    expect(router).toContain(
      compactSource(
        "Responda corretamente às perguntas deste bloco antes de avançar."
      )
    );
    expect(router).toContain(
      compactSource(
        "Conclua todos os blocos do estudo antes de finalizar a preparação."
      )
    );
    expect(experience).toContain(compactSource("Responda"));
    expect(experience).toContain(compactSource("Tentar novamente"));
    expect(experience).toContain(compactSource("Concluir etapa"));
    expect(experience).toContain(compactSource("Responda à pergunta"));
  });

  it("preserva conclusão e maior posição ao revisar um estudo", () => {
    expect(db).toContain(
      compactSource(
        "CASE WHEN ${foundationLessonProgress.status} = 'concluida'"
      )
    );
    expect(db).toContain(
      compactSource(
        "GREATEST(${foundationLessonProgress.lastBlockPosition}, ${data.lastBlockPosition})"
      )
    );
  });

  it("usa clientAttemptId para impedir duplicidade de tentativas", () => {
    expect(schema).toContain(compactSource("clientAttemptId"));
    expect(migration).toContain(
      compactSource("ADD COLUMN IF NOT EXISTS clientAttemptId")
    );
    expect(router).toContain(
      compactSource("getFoundationQuestionAttemptByClientId")
    );
    expect(router).toContain(
      compactSource(
        "clientAttemptId: z.string().trim().min(8).max(80).optional()"
      )
    );
    expect(experience).toContain(
      compactSource("clientAttemptId: createClientAttemptId()")
    );
  });

  it("preserva entrada simples sem escolha manual de turma", () => {
    expect(page).toContain(
      compactSource("Você não precisa escolher uma turma")
    );
    expect(page).toContain(compactSource("StudentLearningExperience"));
    expect(experience).toContain(compactSource("estudo disponível"));
  });

  it("trata a semana como coletiva e remove a liberação individual da interface", () => {
    expect(router).toContain(
      compactSource("isFoundationStudyCollectivelyAvailable")
    );
    expect(router).toContain(compactSource('availabilityMode: "coletiva"'));
    expect(router).toContain(compactSource("study.weekStart <= today"));
    expect(router).toContain(
      compactSource("if (study.weekStart) throw new TRPCError")
    );
    expect(router).toContain(compactSource("não há liberação individual"));
    expect(page).toContain(compactSource("A semana é coletiva"));
    expect(page).not.toContain(compactSource("releaseNextStudy.useMutation"));
    expect(page).not.toContain(compactSource("Liberar próximo tema"));
  });

  it("oferece histórico individual separado da preparação atual", () => {
    expect(db).toContain(compactSource("getFoundationStudentHistory"));
    expect(router).toContain(compactSource("studentHistory: tenantProcedure"));
    expect(router).toContain(
      compactSource("getFoundationStudentHistoryForPerson(input.churchId")
    );
    expect(db).toContain(
      compactSource("!item.study.weekStart || item.study.weekStart <= today")
    );
    expect(experience).toContain(compactSource("studentHistory.useQuery"));
    expect(experience).toContain(compactSource("Meu histórico"));
    expect(experience).toContain(compactSource("Não iniciado"));
    expect(experience).toContain(compactSource("Presença registrada"));
  });

  it("oferece um resumo semanal antes do acompanhamento detalhado", () => {
    expect(db).toContain(compactSource("getFoundationWeeklyOverview"));
    expect(db).toContain(compactSource("selectFoundationWeeklyStudy"));
    expect(db).toContain(compactSource("startedPercent"));
    expect(router).toContain(compactSource("weeklyOverview: tenantProcedure"));
    expect(page).toContain(compactSource("function WeeklyOverview"));
    expect(page).toContain(compactSource("Semana atual"));
    expect(page).toContain(compactSource("Para reforçar no domingo"));
    expect(page).toContain(compactSource("Acompanhamento detalhado"));
    expect(page).toContain(compactSource("Trilha e conteúdo"));
  });

  it("abre as anotações dos estudos concluídos sem reabrir o estudo", () => {
    expect(experience).toContain(compactSource("Ver minhas anotações"));
    expect(experience).toContain(compactSource("notesDialogOpen"));
    expect(experience).toContain(compactSource("completedHistoryItems"));
    expect(experience).toContain(compactSource("sem precisar"));
    expect(experience).toContain(
      compactSource("item.progress?.reflection?.trim()")
    );
    expect(experience).toContain(compactSource("Anotações por etapa"));
  });
});

export {};
