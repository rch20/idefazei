import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

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
  getFoundationActiveEnrollmentForPerson: vi.fn(),
  getFoundationEnrollmentForPerson: vi.fn(),
  resolveFoundationEnrollmentForPerson: vi.fn(),
  getFoundationLearningProgress: vi.fn(),
  getFoundationStudySession: vi.fn(),
  getFoundationStudentHistory: vi.fn(),
  getFoundationQuestionForAttempt: vi.fn(),
  getFoundationQuestionAttemptByClientId: vi.fn(),
  countFoundationQuestionAttempts: vi.fn(),
  recordFoundationQuestionAttempt: vi.fn(),
  touchFoundationLessonProgress: vi.fn(),
  touchFoundationBlockProgress: vi.fn(),
  completeFoundationBlockProgress: vi.fn(),
  saveFoundationLessonReflection: vi.fn(),
  saveFoundationBlockReflection: vi.fn(),
  completeFoundationLesson: vi.fn(),
  hasCompletedFoundationQuestions: vi.fn(),
  updateCourseEnrollment: vi.fn(),
}));

vi.mock("./db", async () => ({
  ...(await vi.importActual<typeof import("./db")>("./db")),
  ...dbMocks,
}));

import { appRouter } from "./routers";

const CHURCH_ID = 100;
const OTHER_CHURCH_ID = 200;
const COURSE_ID = 55;
const OTHER_COURSE_ID = 56;
const PERSON_ID = 77;
const CURRENT_ENROLLMENT_ID = 22;
const HISTORICAL_ENROLLMENT_ID = 11;
const STUDY_ID = 90;
const BLOCK_ID = 12;
const QUESTION_ID = 31;

const currentEnrollment = {
  id: CURRENT_ENROLLMENT_ID,
  courseId: COURSE_ID,
  personId: PERSON_ID,
  status: "em_andamento",
  enrolledAt: new Date("2026-10-02T12:00:00.000Z"),
};
const historicalEnrollment = {
  id: HISTORICAL_ENROLLMENT_ID,
  courseId: COURSE_ID,
  personId: PERSON_ID,
  status: "concluido",
  enrolledAt: new Date("2026-09-01T12:00:00.000Z"),
};
const study = {
  id: STUDY_ID,
  churchId: CHURCH_ID,
  courseId: COURSE_ID,
  title: "A fé",
  weekStart: "2020-01-05",
  active: true,
};

function context(): TrpcContext {
  return {
    user: {
      id: -42,
      openId: "church:42",
      name: "Pessoa sintética",
      email: "qa@example.test",
      loginMethod: "church-jwt",
      role: "membro",
      churchId: CHURCH_ID,
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
    tenantChurchId: CHURCH_ID,
    requestedTenantChurchId: CHURCH_ID,
    tenantSlug: "qa-local",
  };
}

function sessionWithBlock() {
  return {
    study,
    progress: { status: "em_andamento", lastBlockPosition: 0 },
    blocks: [{ id: BLOCK_ID, position: 0, title: "Leia" }],
    blockProgress: [],
    questionRows: [],
    correctQuestionIds: new Set<number>(),
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  dbMocks.getActiveChurchUserById.mockResolvedValue({
    id: 42,
    userId: 42,
    churchId: CHURCH_ID,
    personId: PERSON_ID,
    role: "membro",
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
  dbMocks.getCoursesByChurch.mockResolvedValue([
    { id: COURSE_ID, churchId: CHURCH_ID, name: "Fundamentos", active: true },
  ]);
  dbMocks.getFoundationActiveEnrollmentForPerson.mockResolvedValue({
    enrollment: currentEnrollment,
    course: {
      id: COURSE_ID,
      churchId: CHURCH_ID,
      name: "Fundamentos",
      active: true,
    },
  });
  dbMocks.getFoundationEnrollmentForPerson.mockImplementation(
    async (
      courseId: number,
      personId: number,
      churchId: number,
      enrollmentId?: number
    ) => {
      if (
        courseId !== COURSE_ID ||
        personId !== PERSON_ID ||
        churchId !== CHURCH_ID
      )
        return null;
      if (enrollmentId === HISTORICAL_ENROLLMENT_ID) return null;
      return currentEnrollment;
    }
  );
  dbMocks.resolveFoundationEnrollmentForPerson.mockImplementation(
    async (input: {
      courseId?: number;
      personId: number;
      churchId: number;
      enrollmentId?: number;
      context?: string;
    }) => {
      if (
        input.personId !== PERSON_ID ||
        input.churchId !== CHURCH_ID ||
        (input.courseId !== undefined && input.courseId !== COURSE_ID)
      )
        return null;
      if (input.context === "historical") {
        return input.enrollmentId === HISTORICAL_ENROLLMENT_ID
          ? {
              enrollment: historicalEnrollment,
              course: {
                id: COURSE_ID,
                churchId: CHURCH_ID,
                name: "Fundamentos",
                active: true,
              },
            }
          : null;
      }
      if (
        input.enrollmentId !== undefined &&
        input.enrollmentId !== CURRENT_ENROLLMENT_ID
      )
        return null;
      return {
        enrollment: currentEnrollment,
        course: {
          id: COURSE_ID,
          churchId: CHURCH_ID,
          name: "Fundamentos",
          active: true,
        },
      };
    }
  );
  dbMocks.getFoundationLearningProgress.mockResolvedValue([
    { study, progress: null },
  ]);
  dbMocks.getFoundationStudentHistory.mockResolvedValue([
    {
      study,
      progress: {
        status: "concluida",
        reflection: "Nota histórica preservada",
      },
    },
  ]);
  dbMocks.getFoundationStudySession.mockResolvedValue(sessionWithBlock());
  dbMocks.getFoundationQuestionForAttempt.mockResolvedValue({
    block: { id: BLOCK_ID },
    question: {
      id: QUESTION_ID,
      blockId: BLOCK_ID,
      options: [{ id: "a", label: "Sim" }],
      correctOptionId: "a",
      explanation: "Explicação",
    },
  });
  dbMocks.getFoundationQuestionAttemptByClientId.mockResolvedValue(null);
  dbMocks.countFoundationQuestionAttempts.mockResolvedValue(0);
  dbMocks.recordFoundationQuestionAttempt.mockResolvedValue(1);
  dbMocks.touchFoundationLessonProgress.mockResolvedValue(undefined);
  dbMocks.touchFoundationBlockProgress.mockResolvedValue(undefined);
  dbMocks.completeFoundationBlockProgress.mockResolvedValue(undefined);
  dbMocks.saveFoundationLessonReflection.mockResolvedValue(undefined);
  dbMocks.saveFoundationBlockReflection.mockResolvedValue(undefined);
  dbMocks.completeFoundationLesson.mockResolvedValue(undefined);
  dbMocks.hasCompletedFoundationQuestions.mockResolvedValue(true);
  dbMocks.updateCourseEnrollment.mockResolvedValue(undefined);
});

describe("resolução única da matrícula da Escola de Fundamentos", () => {
  it("mantém cartão e sessão na matrícula atual sem escolher pela maior progresso", async () => {
    const caller = appRouter.createCaller(context());
    const card = await caller.escolaFundamentos.studentPath({
      churchId: CHURCH_ID,
    });
    const session = await caller.escolaFundamentos.studySession({
      churchId: CHURCH_ID,
      courseId: COURSE_ID,
      studyId: STUDY_ID,
    });

    expect(card.enrollment?.id).toBe(CURRENT_ENROLLMENT_ID);
    expect(session.enrollmentId).toBe(CURRENT_ENROLLMENT_ID);
    expect(dbMocks.resolveFoundationEnrollmentForPerson).toHaveBeenCalledWith(
      expect.objectContaining({
        courseId: COURSE_ID,
        personId: PERSON_ID,
        churchId: CHURCH_ID,
        context: "current",
      })
    );
  });

  it("rejeita uma matrícula histórica ou ID de escopo divergente antes de ler/gravar", async () => {
    const caller = appRouter.createCaller(context());

    for (const enrollmentId of [
      HISTORICAL_ENROLLMENT_ID,
      999,
      OTHER_COURSE_ID,
    ]) {
      await expect(
        caller.escolaFundamentos.startLesson({
          churchId: CHURCH_ID,
          courseId:
            enrollmentId === OTHER_COURSE_ID ? OTHER_COURSE_ID : COURSE_ID,
          studyId: STUDY_ID,
          enrollmentId,
          lastBlockPosition: 0,
        })
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    }

    expect(dbMocks.touchFoundationLessonProgress).not.toHaveBeenCalled();
  });

  it("transporta o mesmo ID em todas as mutations do percurso", async () => {
    const caller = appRouter.createCaller(context());
    const input = {
      churchId: CHURCH_ID,
      courseId: COURSE_ID,
      studyId: STUDY_ID,
      enrollmentId: CURRENT_ENROLLMENT_ID,
    };

    await caller.escolaFundamentos.startLesson({
      ...input,
      lastBlockPosition: 0,
    });
    await caller.escolaFundamentos.viewStudyBlock({
      ...input,
      blockId: BLOCK_ID,
    });
    await caller.escolaFundamentos.answerQuestion({
      ...input,
      questionId: QUESTION_ID,
      selectedOptionId: "a",
      clientAttemptId: "attempt-0001",
    });
    await caller.escolaFundamentos.completeStudyBlock({
      ...input,
      blockId: BLOCK_ID,
    });
    await caller.escolaFundamentos.saveReflection({
      ...input,
      reflection: "Geral",
    });
    await caller.escolaFundamentos.saveBlockReflection({
      ...input,
      blockId: BLOCK_ID,
      reflection: "Por etapa",
    });
    dbMocks.getFoundationStudySession.mockResolvedValue({
      ...sessionWithBlock(),
      blockProgress: [
        { block: { id: BLOCK_ID }, progress: { status: "concluida" } },
      ],
    });
    await caller.escolaFundamentos.completeLesson({
      ...input,
      lastBlockPosition: 0,
      reflection: "Geral",
    });

    expect(dbMocks.resolveFoundationEnrollmentForPerson).toHaveBeenCalledTimes(
      7
    );
    for (const [call] of dbMocks.resolveFoundationEnrollmentForPerson.mock
      .calls) {
      expect(call).toMatchObject({
        courseId: COURSE_ID,
        personId: PERSON_ID,
        churchId: CHURCH_ID,
        enrollmentId: CURRENT_ENROLLMENT_ID,
        context: "current",
      });
    }
    expect(dbMocks.touchFoundationLessonProgress).toHaveBeenCalledWith(
      expect.objectContaining({ enrollmentId: CURRENT_ENROLLMENT_ID })
    );
    expect(dbMocks.recordFoundationQuestionAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ enrollmentId: CURRENT_ENROLLMENT_ID })
    );
    expect(dbMocks.saveFoundationBlockReflection).toHaveBeenCalledWith(
      expect.objectContaining({ enrollmentId: CURRENT_ENROLLMENT_ID })
    );
    expect(dbMocks.completeFoundationLesson).toHaveBeenCalledWith(
      expect.objectContaining({ enrollmentId: CURRENT_ENROLLMENT_ID })
    );
  });
  it("consulta a matrícula histórica explicitamente sem executar mutations", async () => {
    const result = await appRouter
      .createCaller(context())
      .escolaFundamentos.studentHistory({
        churchId: CHURCH_ID,
        enrollmentId: HISTORICAL_ENROLLMENT_ID,
      });
    expect(result.items[0]).toMatchObject({
      enrollmentId: HISTORICAL_ENROLLMENT_ID,
      progress: { reflection: "Nota histórica preservada" },
    });
    expect(dbMocks.getFoundationStudentHistory).toHaveBeenCalledWith(
      CHURCH_ID,
      HISTORICAL_ENROLLMENT_ID,
      COURSE_ID,
      expect.any(String)
    );
    expect(dbMocks.touchFoundationLessonProgress).not.toHaveBeenCalled();
    expect(dbMocks.saveFoundationBlockReflection).not.toHaveBeenCalled();
  });
  it("nega histórico de ID não autorizado antes da leitura de notas", async () => {
    await expect(
      appRouter.createCaller(context()).escolaFundamentos.studentHistory({
        churchId: CHURCH_ID,
        enrollmentId: 999,
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(dbMocks.getFoundationStudentHistory).not.toHaveBeenCalled();
  });
  it("nega outra igreja antes de resolver a matrícula ou gravar", async () => {
    await expect(
      appRouter.createCaller(context()).escolaFundamentos.saveBlockReflection({
        churchId: OTHER_CHURCH_ID,
        courseId: COURSE_ID,
        studyId: STUDY_ID,
        enrollmentId: CURRENT_ENROLLMENT_ID,
        blockId: BLOCK_ID,
        reflection: "Não gravar",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.resolveFoundationEnrollmentForPerson).not.toHaveBeenCalled();
    expect(dbMocks.saveFoundationBlockReflection).not.toHaveBeenCalled();
  });

  it("mantém a ordenação estável por data e ID e isola cache/drafts por matrícula", () => {
    const db = readFileSync("server/db.ts", "utf8");
    const experience = readFileSync(
      "client/src/pages/foundation/StudentLearningExperience.tsx",
      "utf8"
    );
    expect(db).toContain(
      ".orderBy(desc(courseEnrollments.enrolledAt), desc(courseEnrollments.id))"
    );
    expect(db).toContain("eq(courseEnrollments.personId, data.personId)");
    expect(db).toContain("eq(courses.churchId, data.churchId)");
    expect(db).toContain("eq(courseEnrollments.id, data.enrollmentId)");
    expect(experience).toContain(
      '`${churchId}:${resolvedEnrollmentId ?? "enrollment"}:${studyId}:${blockId ?? "legacy"}`'
    );
    expect(experience).toContain("enrollmentId: variables.enrollmentId");
  });

  it("preserva leitura explícita de histórico sem reutilizá-la para mutations atuais", () => {
    const router = readFileSync("server/routers.ts", "utf8");
    expect(router).toContain('context: "historical"');
    expect(router).toContain("getFoundationStudentHistory(");
    expect(router).toContain(
      "requireFoundationStudentLesson(ctx.user.id, input.churchId, input.courseId, input.studyId, input.enrollmentId)"
    );
  });
});

export {};
