import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync("drizzle/schema.ts", "utf8");
const migration = readFileSync("drizzle/0079_foundation_mobile_progress.sql", "utf8");
const ledger = readFileSync("drizzle/custom-migrations.json", "utf8");
const db = readFileSync("server/db.ts", "utf8");
const router = readFileSync("server/routers.ts", "utf8");
const experience = readFileSync("client/src/pages/foundation/StudentLearningExperience.tsx", "utf8");
const page = readFileSync("client/src/pages/EscolaFundamentos.tsx", "utf8");

describe("experiência mobile-first da Escola de Fundamentos", () => {
  it("cria progresso detalhado por bloco sem substituir o progresso geral", () => {
    expect(schema).toContain('mysqlTable("foundation_block_progress"');
    expect(schema).toContain("foundation_block_progress_enrollment_study_block_unique");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS foundation_block_progress");
    expect(migration).toContain("UNIQUE KEY foundation_block_progress_enrollment_study_block_unique");
    expect(schema).toContain("foundationLessonProgress");
  });

  it("registra a migration no ledger com checksum calculado", () => {
    expect(ledger).toContain('"id": "0079"');
    expect(ledger).toContain("drizzle/0079_foundation_mobile_progress.sql");
    expect(ledger).not.toContain("TO_BE_CALCULATED");
  });

  it("usa uma sessão única para desktop e mobile", () => {
    expect(router).toContain("studySession: tenantProcedure");
    expect(router).toContain("getFoundationStudySession");
    expect(experience).toContain("studySession.useQuery");
    expect(experience).toContain("AdaptiveFormDialogContent className=\"sm:max-w-5xl\"");
    expect(experience).toContain("lg:grid-cols-[minmax(0,1fr)_220px]");
  });

  it("salva visualização, conclusão de bloco e reflexão automaticamente", () => {
    expect(router).toContain("viewStudyBlock: tenantProcedure");
    expect(router).toContain("completeStudyBlock: tenantProcedure");
    expect(router).toContain("saveReflection: tenantProcedure");
    expect(experience).toContain("viewStudyBlock.useMutation");
    expect(experience).toContain("completeStudyBlock.useMutation");
    expect(experience).toContain("Salva automaticamente enquanto você escreve.");
  });

  it("mantém a pergunta depois da leitura e só libera avanço após acerto", () => {
    expect(router).toContain("Responda corretamente às perguntas deste bloco antes de avançar.");
    expect(router).toContain("Conclua todos os blocos do estudo antes de finalizar a preparação.");
    expect(experience).toContain("Pergunta do bloco");
    expect(experience).toContain("Tentar novamente");
    expect(experience).toContain("Concluir bloco");
    expect(experience).toContain("Responda à pergunta");
  });

  it("preserva conclusão e maior posição ao revisar um estudo", () => {
    expect(db).toContain("CASE WHEN ${foundationLessonProgress.status} = 'concluida'");
    expect(db).toContain("GREATEST(${foundationLessonProgress.lastBlockPosition}, ${data.lastBlockPosition})");
  });

  it("usa clientAttemptId para impedir duplicidade de tentativas", () => {
    expect(schema).toContain("clientAttemptId");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS clientAttemptId");
    expect(router).toContain("getFoundationQuestionAttemptByClientId");
    expect(router).toContain("clientAttemptId: z.string().trim().min(8).max(80).optional()");
    expect(experience).toContain("clientAttemptId: createClientAttemptId()");
  });

  it("preserva entrada simples sem escolha manual de turma", () => {
    expect(page).toContain("Você não precisa escolher uma turma");
    expect(page).toContain("StudentLearningExperience");
    expect(page).toContain("O estudo da semana aparece aqui automaticamente");
  });

  it("trata a semana como coletiva e remove a liberação individual da interface", () => {
    expect(router).toContain("isFoundationStudyCollectivelyAvailable");
    expect(router).toContain('availabilityMode: "coletiva"');
    expect(router).toContain("study.weekStart <= today");
    expect(page).toContain("A semana é coletiva");
    expect(page).not.toContain("releaseNextStudy.useMutation");
    expect(page).not.toContain("Liberar próximo tema");
  });

  it("oferece histórico individual separado da preparação atual", () => {
    expect(db).toContain("getFoundationStudentHistory");
    expect(router).toContain("studentHistory: tenantProcedure");
    expect(router).toContain("getFoundationStudentHistoryForPerson(input.churchId");
    expect(db).toContain("!item.study.weekStart || item.study.weekStart <= today");
    expect(experience).toContain("studentHistory.useQuery");
    expect(experience).toContain("Meu histórico");
    expect(experience).toContain("Não iniciado");
    expect(experience).toContain("Presença registrada");
  });

  it("oferece um resumo semanal antes do acompanhamento detalhado", () => {
    expect(db).toContain("getFoundationWeeklyOverview");
    expect(router).toContain("weeklyOverview: tenantProcedure");
    expect(page).toContain("function WeeklyOverview");
    expect(page).toContain("Semana atual");
    expect(page).toContain("Para reforçar no domingo");
  });
});

export {};
