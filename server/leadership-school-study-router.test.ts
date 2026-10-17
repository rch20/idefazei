import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  getActiveChurchUserById: vi.fn(),
  getChurchMemberByUserId: vi.fn(),
  getLeadershipClassById: vi.fn(),
  getLeadershipLessonById: vi.fn(),
  getLeadershipTeachers: vi.fn(),
  getLibraryItemById: vi.fn(),
}));

const studyMocks = vi.hoisted(() => ({
  isLeadershipStudyAdministrator: vi.fn(),
  getLeadershipModuleById: vi.fn(),
  getLeadershipModulesByClass: vi.fn(),
  createLeadershipModule: vi.fn(),
  updateLeadershipModule: vi.fn(),
  moveLeadershipModule: vi.fn(),
  getLeadershipStudyById: vi.fn(),
  getLeadershipStudiesByClass: vi.fn(),
  getLeadershipStudyBlocks: vi.fn(),
  getLeadershipStudyBlockById: vi.fn(),
  getLeadershipStudyQuestions: vi.fn(),
  getLeadershipQuestionById: vi.fn(),
  getLeadershipStudyMaterials: vi.fn(),
  getLeadershipStudyCreationStatus: vi.fn(),
  createIdempotentLeadershipStudy: vi.fn(),
  updateLeadershipStudy: vi.fn(),
  publishLeadershipStudy: vi.fn(),
  archiveLeadershipStudy: vi.fn(),
  createLeadershipStudyBlock: vi.fn(),
  updateLeadershipStudyBlock: vi.fn(),
  moveLeadershipStudyBlock: vi.fn(),
  createIdempotentLeadershipQuestion: vi.fn(),
  updateLeadershipQuestion: vi.fn(),
  attachLeadershipStudyMaterial: vi.fn(),
  updateLeadershipStudyMaterialPosition: vi.fn(),
  detachLeadershipStudyMaterial: vi.fn(),
  getLeadershipStudyAdministrators: vi.fn(),
  assignLeadershipStudyAdministrator: vi.fn(),
  removeLeadershipStudyAdministrator: vi.fn(),
  getLeadershipLessonStudyLinks: vi.fn(),
  linkLeadershipLessonStudy: vi.fn(),
  unlinkLeadershipLessonStudy: vi.fn(),
  getLeadershipStudentStudy: vi.fn(),
  getLeadershipStudentStudySession: vi.fn(),
  getLeadershipStudiesForPerson: vi.fn(),
  touchLeadershipStudyProgress: vi.fn(),
  touchLeadershipBlockProgress: vi.fn(),
  completeLeadershipBlockProgress: vi.fn(),
  recordLeadershipQuestionAttempt: vi.fn(),
  saveLeadershipBlockReflection: vi.fn(),
  completeLeadershipStudy: vi.fn(),
}));

vi.mock("./db", async () => ({
  ...(await vi.importActual<typeof import("./db")>("./db")),
  ...dbMocks,
}));
vi.mock("./leadershipSchoolStudyDb", async () => ({
  ...(await vi.importActual<typeof import("./leadershipSchoolStudyDb")>(
    "./leadershipSchoolStudyDb"
  )),
  ...studyMocks,
}));

import { leadershipStudyRouter } from "./leadershipSchoolStudyRouter";

const CHURCH_ID = 100;
const OTHER_CHURCH_ID = 200;
const CLASS_ID = 10;
const STUDY_ID = 20;
const BLOCK_ID = 30;
const PERSON_ID = 77;

function context(userId = -42): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `church:${Math.abs(userId)}`,
      name: "Usuário sintético",
      email: "qa@example.test",
      loginMethod: "church-jwt",
      role: "membro",
      churchId: CHURCH_ID,
      authSource: "church",
      createdAt: new Date("2026-10-17T12:00:00.000Z"),
      updatedAt: new Date("2026-10-17T12:00:00.000Z"),
      lastSignedIn: new Date("2026-10-17T12:00:00.000Z"),
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
    role: "pastor_local",
    active: true,
  });
  dbMocks.getLeadershipClassById.mockResolvedValue({
    id: CLASS_ID,
    churchId: CHURCH_ID,
    active: true,
  });
  dbMocks.getLeadershipTeachers.mockResolvedValue([]);
  studyMocks.isLeadershipStudyAdministrator.mockResolvedValue(false);
  studyMocks.getLeadershipModuleById.mockResolvedValue({
    id: 40,
    classId: CLASS_ID,
    churchId: CHURCH_ID,
  });
  studyMocks.getLeadershipStudyById.mockResolvedValue({
    study: {
      id: STUDY_ID,
      churchId: CHURCH_ID,
      classId: CLASS_ID,
      status: "rascunho",
    },
    class: { id: CLASS_ID, churchId: CHURCH_ID },
    module: null,
  });
  studyMocks.getLeadershipStudyBlocks.mockResolvedValue([]);
  studyMocks.getLeadershipStudyQuestions.mockResolvedValue([]);
  studyMocks.getLeadershipStudyMaterials.mockResolvedValue([]);
  studyMocks.getLeadershipStudyCreationStatus.mockResolvedValue({
    canPublish: false,
  });
});

describe("Escola de Líderes — router pedagógico da Fase 2", () => {
  it("permite ao executivo criar módulo no escopo da turma e igreja", async () => {
    studyMocks.createLeadershipModule.mockResolvedValue({ id: 41 });

    const result = await leadershipStudyRouter
      .createCaller(context())
      .modules.create({
        churchId: CHURCH_ID,
        classId: CLASS_ID,
        title: "Fundamentos da liderança",
      });

    expect(result).toEqual({ id: 41 });
    expect(studyMocks.createLeadershipModule).toHaveBeenCalledWith(
      expect.objectContaining({
        churchId: CHURCH_ID,
        classId: CLASS_ID,
        createdByChurchUserId: 42,
      })
    );
  });

  it("bloqueia turma de outra igreja antes de consultar o conteúdo", async () => {
    dbMocks.getLeadershipClassById.mockResolvedValue(null);

    await expect(
      leadershipStudyRouter.createCaller(context()).modules.list({
        churchId: OTHER_CHURCH_ID,
        classId: CLASS_ID,
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(studyMocks.getLeadershipModulesByClass).not.toHaveBeenCalled();
  });

  it("permite professor atribuído sem transformar a atribuição em acesso global", async () => {
    dbMocks.getActiveChurchUserById.mockResolvedValue({
      id: 42,
      churchId: CHURCH_ID,
      personId: PERSON_ID,
      role: "membro",
      active: true,
    });
    dbMocks.getLeadershipTeachers.mockResolvedValue([
      { assignment: { churchUserId: 42 } },
    ]);
    studyMocks.getLeadershipModulesByClass.mockResolvedValue([]);

    const result = await leadershipStudyRouter
      .createCaller(context())
      .modules.list({ churchId: CHURCH_ID, classId: CLASS_ID });

    expect(result).toEqual([]);
    expect(studyMocks.getLeadershipModulesByClass).toHaveBeenCalledWith(
      CLASS_ID,
      CHURCH_ID,
      true
    );
  });

  it("entrega ao aluno uma sessão sem expor a resposta correta", async () => {
    dbMocks.getActiveChurchUserById.mockResolvedValue({
      id: 42,
      churchId: CHURCH_ID,
      personId: PERSON_ID,
      role: "membro",
      active: true,
    });
    studyMocks.getLeadershipStudentStudy.mockResolvedValue({
      enrollment: { id: 50, personId: PERSON_ID },
      study: { id: STUDY_ID, classId: CLASS_ID, status: "publicada" },
      class: { id: CLASS_ID, churchId: CHURCH_ID },
    });
    studyMocks.getLeadershipStudentStudySession.mockResolvedValue({
      study: { id: STUDY_ID },
      blocks: [
        {
          id: BLOCK_ID,
          stageKey: "responda",
          questions: [
            { id: 90, prompt: "Pergunta", options: [{ id: "a", label: "A" }] },
          ],
        },
      ],
    });

    const result = await leadershipStudyRouter
      .createCaller(context())
      .student.session({
        churchId: CHURCH_ID,
        enrollmentId: 50,
        studyId: STUDY_ID,
      });

    expect(result.blocks[0].questions[0]).not.toHaveProperty("correctOptionId");
    expect(studyMocks.getLeadershipStudentStudySession).toHaveBeenCalledWith({
      churchId: CHURCH_ID,
      enrollmentId: 50,
      studyId: STUDY_ID,
      personId: PERSON_ID,
    });
  });

  it("mantém a publicação sob validação server-side e converte falha pedagógica em 400", async () => {
    studyMocks.getLeadershipStudyBlocks.mockResolvedValue([
      { id: BLOCK_ID, stageKey: "leia", active: true },
      { id: 31, stageKey: "entenda", active: true },
      { id: 32, stageKey: "responda", active: true },
      { id: 33, stageKey: "aplique", active: true },
    ]);
    studyMocks.getLeadershipStudyQuestions.mockResolvedValue([
      { block: { stageKey: "responda" }, question: { id: 90 } },
    ]);
    studyMocks.publishLeadershipStudy.mockRejectedValue(
      new Error("O estudo precisa de todos os campos obrigatórios.")
    );

    await expect(
      leadershipStudyRouter.createCaller(context()).studies.publish({
        churchId: CHURCH_ID,
        id: STUDY_ID,
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("faz a resposta do aluno passar pelo servidor e retorna somente o resultado da tentativa", async () => {
    dbMocks.getActiveChurchUserById.mockResolvedValue({
      id: 42,
      churchId: CHURCH_ID,
      personId: PERSON_ID,
      role: "membro",
      active: true,
    });
    studyMocks.getLeadershipStudentStudy.mockResolvedValue({
      enrollment: { id: 50, personId: PERSON_ID },
      study: { id: STUDY_ID, classId: CLASS_ID, status: "publicada" },
      class: { id: CLASS_ID, churchId: CHURCH_ID },
    });
    studyMocks.getLeadershipStudyBlocks.mockResolvedValue([
      { id: BLOCK_ID, stageKey: "responda", active: true },
    ]);
    studyMocks.getLeadershipQuestionById.mockResolvedValue({
      block: { id: BLOCK_ID, stageKey: "responda" },
      question: { id: 90, correctOptionId: "a" },
    });
    studyMocks.recordLeadershipQuestionAttempt.mockResolvedValue({
      questionId: 90,
      selectedOptionId: "a",
      isCorrect: true,
      explanation: "Muito bem.",
    });

    const result = await leadershipStudyRouter
      .createCaller(context())
      .student.answerQuestion({
        churchId: CHURCH_ID,
        enrollmentId: 50,
        studyId: STUDY_ID,
        blockId: BLOCK_ID,
        questionId: 90,
        selectedOptionId: "a",
        clientAttemptId: "attempt-123",
      });

    expect(result).toMatchObject({ isCorrect: true });
    expect(result).not.toHaveProperty("correctOptionId");
  });
});
