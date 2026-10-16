import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

// Matrícula: regressão da correção local. Criação: lacuna de idempotência ainda atual.
// Todas as leituras/gravações usadas pelas procedures abaixo são simuladas.
const dbMocks = vi.hoisted(() => ({
  getActiveChurchUserById: vi.fn(),
  getComplementaryRolesByChurchUser: vi.fn(),
  getActiveMinistryRoleKeysByPerson: vi.fn(),
  getActiveDepartmentRoleKeysByPerson: vi.fn(),
  getActiveCellRoleKeysByPerson: vi.fn(),
  getMinistryRoleDefinitionsByChurch: vi.fn(),
  isActiveConsolidationMinistryMember: vi.fn(),
  isActiveVisitsMinistryMember: vi.fn(),
  isFoundationStudyAdministrator: vi.fn(),
  recordSecurityAccessAuditEvent: vi.fn(),
  getCoursesByChurch: vi.fn(),
  getFoundationStudiesByCourse: vi.fn(),
  createFoundationStudy: vi.fn(),
  createFoundationStudyWithBlocks: vi.fn(),
  getFoundationStudyById: vi.fn(),
  getFoundationStudyBlockById: vi.fn(),
  createFoundationQuestion: vi.fn(),
  getFoundationActiveEnrollmentForPerson: vi.fn(),
  getFoundationEnrollmentForPerson: vi.fn(),
  resolveFoundationEnrollmentForPerson: vi.fn(),
  getFoundationLearningProgress: vi.fn(),
  getFoundationStudySession: vi.fn(),
}));

vi.mock("./db", async () => ({
  ...(await vi.importActual<typeof import("./db")>("./db")),
  ...dbMocks,
}));

import { appRouter } from "./routers";

const CHURCH_ID = 100;
const COURSE_ID = 55;
const STUDY_ID = 90;
const BLOCK_ID = 12;
const PERSON_ID = 77;
const questionInput = {
  churchId: CHURCH_ID,
  studyId: STUDY_ID,
  blockId: BLOCK_ID,
  prompt: "Qual é o princípio apresentado?",
  options: [
    { id: "a", label: "Amar ao próximo" },
    { id: "b", label: "Ignorar ao próximo" },
  ],
  correctOptionId: "a",
  explanation: "O ensino orienta a amar ao próximo.",
};

function context(): TrpcContext {
  return {
    user: {
      id: -42,
      openId: "church:42",
      name: "Professor sintético local",
      email: "qa@example.test",
      loginMethod: "church-jwt",
      role: "membro",
      churchId: CHURCH_ID,
      authSource: "church",
      createdAt: new Date("2026-10-01T12:00:00Z"),
      updatedAt: new Date("2026-10-01T12:00:00Z"),
      lastSignedIn: new Date("2026-10-01T12:00:00Z"),
    },
    req: {
      headers: {},
      socket: { remoteAddress: "127.0.0.1" },
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    tenantChurchId: CHURCH_ID,
    requestedTenantChurchId: CHURCH_ID,
    tenantSlug: "qa-local",
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  dbMocks.getActiveChurchUserById.mockResolvedValue({
    id: 42,
    userId: 42,
    churchId: CHURCH_ID,
    personId: PERSON_ID,
    role: "pastor_presidente",
    active: true,
    registrationStatus: "approved",
  });
  for (const name of [
    "getComplementaryRolesByChurchUser",
    "getActiveMinistryRoleKeysByPerson",
    "getActiveDepartmentRoleKeysByPerson",
    "getActiveCellRoleKeysByPerson",
    "getMinistryRoleDefinitionsByChurch",
  ] as const)
    dbMocks[name].mockResolvedValue([]);
  dbMocks.isActiveConsolidationMinistryMember.mockResolvedValue(false);
  dbMocks.isActiveVisitsMinistryMember.mockResolvedValue(false);
  dbMocks.isFoundationStudyAdministrator.mockResolvedValue(false);
  dbMocks.recordSecurityAccessAuditEvent.mockResolvedValue(1);
  dbMocks.getFoundationStudyById.mockResolvedValue({
    id: STUDY_ID,
    churchId: CHURCH_ID,
  });
  dbMocks.getFoundationStudyBlockById.mockResolvedValue({
    id: BLOCK_ID,
    studyId: STUDY_ID,
    churchId: CHURCH_ID,
  });
});

describe("diagnóstico da criação de perguntas — lacuna de idempotência", () => {
  it("hoje delega duas inserções quando o mesmo payload é reenviado", async () => {
    dbMocks.createFoundationQuestion
      .mockResolvedValueOnce(901)
      .mockResolvedValueOnce(902);
    const caller = appRouter.createCaller(context());
    const first =
      await caller.escolaFundamentos.createStudyQuestion(questionInput);
    const retry =
      await caller.escolaFundamentos.createStudyQuestion(questionInput);
    expect(first).toEqual({ id: 901 });
    expect(retry).toEqual({ id: 902 });
    expect(dbMocks.createFoundationQuestion).toHaveBeenCalledTimes(2);
  });

  it("não basta enviar idempotencyKey pelo cliente: o contrato atual remove o campo", async () => {
    dbMocks.createFoundationQuestion.mockResolvedValue(901);
    const input = { ...questionInput, idempotencyKey: "qa-retry-00000001" };
    await appRouter
      .createCaller(context())
      .escolaFundamentos.createStudyQuestion(input);
    expect(
      dbMocks.createFoundationQuestion.mock.calls[0][0]
    ).not.toHaveProperty("idempotencyKey");
  });

  it("preserva a autorização: nega outro tenant antes da inserção", async () => {
    await expect(
      appRouter.createCaller(context()).escolaFundamentos.createStudyQuestion({
        ...questionInput,
        churchId: 200,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.createFoundationQuestion).not.toHaveBeenCalled();
  });

  it("não insere uma pergunta quando o bloco não pertence ao estudo consultado", async () => {
    dbMocks.getFoundationStudyBlockById.mockResolvedValue(null);
    await expect(
      appRouter
        .createCaller(context())
        .escolaFundamentos.createStudyQuestion(questionInput)
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(dbMocks.getFoundationStudyBlockById).toHaveBeenCalledWith(
      CHURCH_ID,
      STUDY_ID,
      BLOCK_ID
    );
    expect(dbMocks.createFoundationQuestion).not.toHaveBeenCalled();
  });

  it("não aceita gabarito ausente nas alternativas", async () => {
    await expect(
      appRouter.createCaller(context()).escolaFundamentos.createStudyQuestion({
        ...questionInput,
        correctOptionId: "c",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.createFoundationQuestion).not.toHaveBeenCalled();
  });
});

describe("diagnóstico da seleção de matrícula — sem consolidação de históricos", () => {
  it("cartão e sessão usam a mesma matrícula sem copiar o progresso histórico", async () => {
    const legacy = {
      id: 11,
      courseId: COURSE_ID,
      personId: PERSON_ID,
      status: "em_andamento",
    };
    const current = {
      id: 22,
      courseId: COURSE_ID,
      personId: PERSON_ID,
      status: "matriculado",
    };
    const legacyProgress = {
      status: "concluida",
      lastBlockPosition: 0,
      reflection: "Anotação histórica preservada",
    };
    const study = {
      id: STUDY_ID,
      churchId: CHURCH_ID,
      courseId: COURSE_ID,
      title: "Estudo local",
      weekStart: "2026-01-01",
      active: true,
    };
    const before = JSON.stringify({ legacy, current, legacyProgress });
    dbMocks.getFoundationActiveEnrollmentForPerson.mockResolvedValue({
      enrollment: current,
      course: { id: COURSE_ID, churchId: CHURCH_ID, active: true },
    });
    dbMocks.resolveFoundationEnrollmentForPerson.mockResolvedValue({
      enrollment: current,
      course: { id: COURSE_ID, churchId: CHURCH_ID, active: true },
    });
    dbMocks.getFoundationEnrollmentForPerson.mockResolvedValue(legacy);
    dbMocks.getFoundationLearningProgress.mockImplementation(
      async (_churchId, enrollmentId) => [
        { study, progress: enrollmentId === 11 ? legacyProgress : null },
      ]
    );
    dbMocks.getFoundationStudySession.mockResolvedValue({
      study,
      progress: null,
      blocks: [],
      blockProgress: [],
      questionRows: [],
      correctQuestionIds: new Set(),
    });
    const caller = appRouter.createCaller(context());
    const card = await caller.escolaFundamentos.studentPath({
      churchId: CHURCH_ID,
    });
    const session = await caller.escolaFundamentos.studySession({
      churchId: CHURCH_ID,
      courseId: COURSE_ID,
      studyId: STUDY_ID,
    });
    expect(card.enrollment?.id).toBe(22);
    expect(card.items[0].progress).toBeNull();
    expect(dbMocks.getFoundationStudySession).toHaveBeenCalledWith(
      CHURCH_ID,
      22,
      STUDY_ID
    );
    expect(session.enrollmentId).toBe(22);
    expect(session.progress).toBeNull();
    expect(dbMocks.getFoundationEnrollmentForPerson).not.toHaveBeenCalled();
    expect(JSON.stringify({ legacy, current, legacyProgress })).toBe(before);
    expect(dbMocks.createFoundationQuestion).not.toHaveBeenCalled();
  });
});

describe("diagnóstico da criação de estudo — transação não é idempotência", () => {
  const studyInput = {
    churchId: CHURCH_ID,
    courseId: COURSE_ID,
    title: "Estudo sintético local",
    weekStart: "2026-01-01",
    summary: "Conteúdo de diagnóstico, sem banco real.",
  };

  it("hoje delega duas criações no reenvio do estudo sem modelo", async () => {
    dbMocks.getCoursesByChurch.mockResolvedValue([
      { id: COURSE_ID, churchId: CHURCH_ID, active: true },
    ]);
    dbMocks.getFoundationStudiesByCourse.mockResolvedValue([]);
    dbMocks.createFoundationStudy
      .mockResolvedValueOnce({ id: 301 })
      .mockResolvedValueOnce({ id: 302 });
    const caller = appRouter.createCaller(context());
    expect(
      await caller.escolaFundamentos.createStudy(studyInput)
    ).toMatchObject({ success: true, studyId: 301 });
    expect(
      await caller.escolaFundamentos.createStudy(studyInput)
    ).toMatchObject({ success: true, studyId: 302 });
    expect(dbMocks.createFoundationStudy).toHaveBeenCalledTimes(2);
    expect(dbMocks.createFoundationStudyWithBlocks).not.toHaveBeenCalled();
  });

  it("o modelo das quatro etapas também é delegado novamente se a criação for reenviada", async () => {
    dbMocks.getCoursesByChurch.mockResolvedValue([
      { id: COURSE_ID, churchId: CHURCH_ID, active: true },
    ]);
    dbMocks.getFoundationStudiesByCourse.mockResolvedValue([]);
    dbMocks.createFoundationStudyWithBlocks
      .mockResolvedValueOnce({ id: 401 })
      .mockResolvedValueOnce({ id: 402 });
    const caller = appRouter.createCaller(context());
    const payload = { ...studyInput, template: "biblico" as const };
    expect(await caller.escolaFundamentos.createStudy(payload)).toMatchObject({
      studyId: 401,
    });
    expect(await caller.escolaFundamentos.createStudy(payload)).toMatchObject({
      studyId: 402,
    });
    expect(dbMocks.createFoundationStudyWithBlocks).toHaveBeenCalledTimes(2);
    expect(
      dbMocks.createFoundationStudyWithBlocks.mock.calls[0][1]
    ).toHaveLength(4);
    expect(
      dbMocks.createFoundationStudyWithBlocks.mock.calls[1][1]
    ).toHaveLength(4);
    expect(dbMocks.createFoundationStudy).not.toHaveBeenCalled();
  });
});
