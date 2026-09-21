import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  getActiveChurchUserById: vi.fn(),
  getCoursesByChurch: vi.fn(),
  getFoundationStudiesByCourse: vi.fn(),
  getFoundationModulesByCourse: vi.fn(),
  getFoundationEnrollmentForPerson: vi.fn(),
  getFoundationActiveEnrollmentForPerson: vi.fn(),
  getFoundationLearningProgress: vi.fn(),
  getFoundationStudyQuestions: vi.fn(),
  getFoundationQuestionForAttempt: vi.fn(),
  countFoundationQuestionAttempts: vi.fn(),
  recordFoundationQuestionAttempt: vi.fn(),
  hasCompletedFoundationQuestions: vi.fn(),
  recordSecurityAccessAuditEvent: vi.fn(),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");

  return {
    ...actual,
    ...dbMocks,
  };
});

import { appRouter } from "./routers";

const CHURCH_A = 100;
const CHURCH_B = 200;
const COURSE_ID = 55;
const STUDY_ID = 90;

function createChurchContext(options?: {
  userChurchId?: number;
  tenantChurchId?: number | null;
  tenantSlug?: string | null;
}): TrpcContext {
  const userChurchId = options?.userChurchId ?? CHURCH_A;

  return {
    user: {
      id: -42,
      openId: "church:42",
      name: "Usuário fictício",
      email: "usuario@example.test",
      loginMethod: "church-jwt",
      role: "membro",
      churchId: userChurchId,
      authSource: "church",
      createdAt: new Date("2026-09-21T12:00:00.000Z"),
      updatedAt: new Date("2026-09-21T12:00:00.000Z"),
      lastSignedIn: new Date("2026-09-21T12:00:00.000Z"),
    },
    req: {
      headers: {},
      socket: { remoteAddress: "127.0.0.1" },
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    tenantChurchId: options?.tenantChurchId ?? userChurchId,
    requestedTenantChurchId:
      options?.tenantChurchId === null
        ? null
        : (options?.tenantChurchId ?? userChurchId),
    tenantSlug: options?.tenantSlug ?? `igreja-${userChurchId}`,
  };
}

function configureActiveChurchUser(churchId: number) {
  dbMocks.getActiveChurchUserById.mockResolvedValue({
    id: 42,
    userId: 42,
    churchId,
    personId: 77,
    role: "membro",
    active: true,
    registrationStatus: "approved",
  });
}

describe("isolamento tenant-aware das rotas da Escola de Fundamentos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configureActiveChurchUser(CHURCH_A);
    dbMocks.getCoursesByChurch.mockResolvedValue([
      {
        id: COURSE_ID,
        churchId: CHURCH_A,
        name: "Fundamentos da Fé",
        active: true,
      },
    ]);
    dbMocks.getFoundationStudiesByCourse.mockResolvedValue([]);
    dbMocks.getFoundationModulesByCourse.mockResolvedValue([]);
    dbMocks.getFoundationEnrollmentForPerson.mockResolvedValue(null);
    dbMocks.getFoundationActiveEnrollmentForPerson.mockResolvedValue(null);
    dbMocks.getFoundationLearningProgress.mockResolvedValue([]);
    dbMocks.getFoundationStudyQuestions.mockResolvedValue([]);
    dbMocks.getFoundationQuestionForAttempt.mockResolvedValue(null);
    dbMocks.countFoundationQuestionAttempts.mockResolvedValue(0);
    dbMocks.recordFoundationQuestionAttempt.mockResolvedValue(1);
    dbMocks.hasCompletedFoundationQuestions.mockResolvedValue(true);
    dbMocks.recordSecurityAccessAuditEvent.mockResolvedValue(1);
  });

  it("permite consultar cursos somente no tenant autenticado", async () => {
    const caller = appRouter.createCaller(
      createChurchContext({ userChurchId: CHURCH_A })
    );

    await expect(
      caller.escolaFundamentos.listCourses({ churchId: CHURCH_A })
    ).resolves.toEqual([
      expect.objectContaining({ id: COURSE_ID, churchId: CHURCH_A }),
    ]);

    expect(dbMocks.getCoursesByChurch).toHaveBeenCalledWith(CHURCH_A);
  });

  it("não permite que uma sessão de superadmin use o tenantProcedure", async () => {
    const context = createChurchContext();
    context.user = {
      ...context.user!,
      id: -9,
      openId: "admin:9",
      role: "admin",
      churchId: undefined,
      authSource: "admin",
    };
    const caller = appRouter.createCaller(context);

    await expect(
      caller.escolaFundamentos.listCourses({ churchId: CHURCH_A })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.recordSecurityAccessAuditEvent).not.toHaveBeenCalled();
    expect(dbMocks.getCoursesByChurch).not.toHaveBeenCalled();
  });

  it("bloqueia usuário da Igreja A ao solicitar cursos da Igreja B", async () => {
    const caller = appRouter.createCaller(
      createChurchContext({ userChurchId: CHURCH_A })
    );

    await expect(
      caller.escolaFundamentos.listCourses({ churchId: CHURCH_B })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    expect(dbMocks.getCoursesByChurch).not.toHaveBeenCalled();
  });

  it("bloqueia estudos de outro tenant antes de consultar o conteúdo", async () => {
    const caller = appRouter.createCaller(
      createChurchContext({ userChurchId: CHURCH_A })
    );

    await expect(
      caller.escolaFundamentos.listStudies({
        churchId: CHURCH_B,
        courseId: COURSE_ID,
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    expect(dbMocks.getCoursesByChurch).not.toHaveBeenCalled();
    expect(dbMocks.getFoundationStudiesByCourse).not.toHaveBeenCalled();
  });

  it("bloqueia módulos de outro tenant antes de consultar o conteúdo", async () => {
    const caller = appRouter.createCaller(
      createChurchContext({ userChurchId: CHURCH_A })
    );

    await expect(
      caller.escolaFundamentos.listModules({
        churchId: CHURCH_B,
        courseId: COURSE_ID,
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    expect(dbMocks.getCoursesByChurch).not.toHaveBeenCalled();
    expect(dbMocks.getFoundationModulesByCourse).not.toHaveBeenCalled();
  });

  it("bloqueia a matrícula antes de consultar o conteúdo quando o tenant diverge", async () => {
    const caller = appRouter.createCaller(
      createChurchContext({ userChurchId: CHURCH_A })
    );

    await expect(
      caller.escolaFundamentos.learningPath({
        churchId: CHURCH_B,
        courseId: COURSE_ID,
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    expect(dbMocks.getFoundationEnrollmentForPerson).not.toHaveBeenCalled();
    expect(dbMocks.getFoundationLearningProgress).not.toHaveBeenCalled();
  });

  it("resolve automaticamente a preparação ativa do discípulo no tenant autenticado", async () => {
    dbMocks.getFoundationActiveEnrollmentForPerson.mockResolvedValue({
      enrollment: { id: 91, courseId: COURSE_ID, personId: 77, status: "em_andamento" },
      course: { id: COURSE_ID, churchId: CHURCH_A, name: "Fundamentos da Fé", active: true },
    });
    dbMocks.getFoundationLearningProgress.mockResolvedValue([
      { study: { id: STUDY_ID, courseId: COURSE_ID, title: "A fé", active: true }, progress: null },
    ]);

    const caller = appRouter.createCaller(createChurchContext({ userChurchId: CHURCH_A }));
    const result = await caller.escolaFundamentos.studentPath({ churchId: CHURCH_A });

    expect(result).toMatchObject({
      course: { id: COURSE_ID, churchId: CHURCH_A },
      enrollment: { id: 91, personId: 77 },
      items: [{ study: { id: STUDY_ID }, available: true }],
    });
    expect(dbMocks.getFoundationActiveEnrollmentForPerson).toHaveBeenCalledWith(77, CHURCH_A);
    expect(dbMocks.getFoundationLearningProgress).toHaveBeenCalledWith(CHURCH_A, 91, COURSE_ID);
  });

  it("entrega perguntas sem expor a alternativa correta", async () => {
    dbMocks.getFoundationEnrollmentForPerson.mockResolvedValue({ id: 91, courseId: COURSE_ID, personId: 77, status: "em_andamento" });
    dbMocks.getFoundationLearningProgress.mockResolvedValue([
      { study: { id: STUDY_ID, courseId: COURSE_ID, title: "A fé", active: true }, progress: null },
    ]);
    dbMocks.getFoundationStudyQuestions.mockResolvedValue([
      {
        block: { id: 12, studyId: STUDY_ID, title: "O fundamento", content: "Leia o texto.", position: 0 },
        question: {
          id: 31,
          blockId: 12,
          prompt: "O que é a fé?",
          options: [{ id: "a", label: "Confiança em Deus" }, { id: "b", label: "Apenas informação" }],
          correctOptionId: "a",
          explanation: "A fé envolve confiança.",
          position: 0,
        },
      },
    ]);

    const caller = appRouter.createCaller(createChurchContext({ userChurchId: CHURCH_A }));
    const result = await caller.escolaFundamentos.studyQuestions({ churchId: CHURCH_A, courseId: COURSE_ID, studyId: STUDY_ID });

    expect(result[0]?.question).toEqual({
      id: 31,
      blockId: 12,
      prompt: "O que é a fé?",
      options: [{ id: "a", label: "Confiança em Deus" }, { id: "b", label: "Apenas informação" }],
      position: 0,
    });
    expect(result[0]?.question).not.toHaveProperty("correctOptionId");
  });

  it("registra a resposta e devolve explicação sem bloquear nova tentativa", async () => {
    dbMocks.getFoundationEnrollmentForPerson.mockResolvedValue({ id: 91, courseId: COURSE_ID, personId: 77, status: "em_andamento" });
    dbMocks.getFoundationLearningProgress.mockResolvedValue([
      { study: { id: STUDY_ID, courseId: COURSE_ID, title: "A fé", active: true }, progress: null },
    ]);
    dbMocks.getFoundationQuestionForAttempt.mockResolvedValue({
      block: { id: 12, studyId: STUDY_ID },
      question: {
        id: 31,
        blockId: 12,
        prompt: "O que é a fé?",
        options: [{ id: "a", label: "Confiança em Deus" }, { id: "b", label: "Apenas informação" }],
        correctOptionId: "a",
        explanation: "A fé envolve confiança.",
        position: 0,
      },
    });
    dbMocks.countFoundationQuestionAttempts.mockResolvedValue(1);

    const caller = appRouter.createCaller(createChurchContext({ userChurchId: CHURCH_A }));
    const result = await caller.escolaFundamentos.answerQuestion({ churchId: CHURCH_A, courseId: COURSE_ID, studyId: STUDY_ID, questionId: 31, selectedOptionId: "a" });

    expect(result).toEqual({ isCorrect: true, explanation: "A fé envolve confiança.", attemptNumber: 2 });
    expect(dbMocks.recordFoundationQuestionAttempt).toHaveBeenCalledWith(expect.objectContaining({ churchId: CHURCH_A, enrollmentId: 91, questionId: 31, selectedOptionId: "a", isCorrect: true, attemptNumber: 2 }));
  });

  it("não permite concluir o estudo enquanto houver pergunta sem acerto", async () => {
    dbMocks.getFoundationEnrollmentForPerson.mockResolvedValue({ id: 91, courseId: COURSE_ID, personId: 77, status: "em_andamento" });
    dbMocks.getFoundationLearningProgress.mockResolvedValue([
      { study: { id: STUDY_ID, courseId: COURSE_ID, title: "A fé", active: true }, progress: null },
    ]);
    dbMocks.hasCompletedFoundationQuestions.mockResolvedValue(false);

    const caller = appRouter.createCaller(createChurchContext({ userChurchId: CHURCH_A }));

    await expect(caller.escolaFundamentos.completeLesson({ churchId: CHURCH_A, courseId: COURSE_ID, studyId: STUDY_ID, lastBlockPosition: 0, reflection: null })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });

  it("bloqueia mismatch entre tenant resolvido pelo host e tenant da sessão", async () => {
    // Contrato de hardening: a sessão pertence à Igreja A, mas o host resolveu
    // a Igreja B. A rota tenant-scoped deve falhar antes da query de conteúdo.
    const caller = appRouter.createCaller(
      createChurchContext({
        userChurchId: CHURCH_A,
        tenantChurchId: CHURCH_B,
        tenantSlug: "igreja-b",
      })
    );

    await expect(
      caller.escolaFundamentos.listCourses({ churchId: CHURCH_A })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    expect(dbMocks.getCoursesByChurch).not.toHaveBeenCalled();
    expect(dbMocks.recordSecurityAccessAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        churchId: CHURCH_B,
        event: expect.objectContaining({
          eventType: "security.tenant_access_denied",
          reason: "jwt_host_mismatch",
          sessionChurchId: CHURCH_A,
          targetChurchId: CHURCH_B,
        }),
      })
    );
  });

  it("não confia em um tenant enviado pelo cliente quando ele diverge do contexto", async () => {
    const caller = appRouter.createCaller(
      createChurchContext({
        userChurchId: CHURCH_A,
        tenantChurchId: CHURCH_B,
        tenantSlug: "igreja-b",
      })
    );

    await expect(
      caller.escolaFundamentos.listStudies({
        // O cliente tenta usar o ID da sessão da Igreja A para contornar o host.
        churchId: CHURCH_A,
        courseId: COURSE_ID,
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    expect(dbMocks.getFoundationStudiesByCourse).not.toHaveBeenCalled();
  });

  it("mantém a mesma origem de correlação ao alternar entre tenants", async () => {
    const firstCaller = appRouter.createCaller(
      createChurchContext({
        userChurchId: CHURCH_A,
        tenantChurchId: CHURCH_B,
        tenantSlug: "igreja-b",
      })
    );
    const secondCaller = appRouter.createCaller(
      createChurchContext({
        userChurchId: CHURCH_A,
        tenantChurchId: 300,
        tenantSlug: "igreja-c",
      })
    );

    await expect(
      firstCaller.escolaFundamentos.listCourses({ churchId: CHURCH_A })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      secondCaller.escolaFundamentos.listCourses({ churchId: CHURCH_A })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const events = dbMocks.recordSecurityAccessAuditEvent.mock.calls.map(
      ([data]) => data.event
    );
    expect(events).toHaveLength(2);
    expect(events[0]?.sourceFingerprint).toBe(events[1]?.sourceFingerprint);
    expect(events.map(event => event.targetChurchId)).toEqual([CHURCH_B, 300]);
  });

  it("continua negando o acesso quando a auditoria falha", async () => {
    dbMocks.recordSecurityAccessAuditEvent.mockRejectedValueOnce(
      new Error("database unavailable")
    );
    const caller = appRouter.createCaller(
      createChurchContext({
        userChurchId: CHURCH_A,
        tenantChurchId: CHURCH_B,
        tenantSlug: "igreja-b",
      })
    );

    await expect(
      caller.escolaFundamentos.listCourses({ churchId: CHURCH_A })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.getCoursesByChurch).not.toHaveBeenCalled();
  });
});
