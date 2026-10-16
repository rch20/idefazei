import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import {
  FoundationCreationPayloadMismatchError,
  hashFoundationQuestionCreationPayload,
  hashFoundationStudyCreationPayload,
} from "./foundationCreationIdempotency";

// API simulada: prova contratos/autorização. A concorrência física é testada
// separadamente em foundation-creation-mysql.integration.test.ts.
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
  createIdempotentFoundationStudy: vi.fn(),
  createIdempotentFoundationQuestion: vi.fn(),
  getFoundationCreationStatus: vi.fn(),
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

const CHURCH_ID = 100,
  COURSE_ID = 55,
  STUDY_ID = 90,
  BLOCK_ID = 12,
  PERSON_ID = 77;
const key = "4b4c0f32-7043-4306-a489-a91d6325e8de";
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
  clientRequestId: key,
};
const studyInput = {
  churchId: CHURCH_ID,
  courseId: COURSE_ID,
  title: "Estudo sintético local",
  weekStart: "2026-01-01",
  clientRequestId: key,
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
const member = {
  id: 42,
  userId: 42,
  churchId: CHURCH_ID,
  personId: PERSON_ID,
  role: "pastor_presidente",
  active: true,
  registrationStatus: "approved",
};
beforeEach(() => {
  vi.resetAllMocks();
  dbMocks.getActiveChurchUserById.mockResolvedValue(member);
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
  dbMocks.getCoursesByChurch.mockResolvedValue([
    { id: COURSE_ID, churchId: CHURCH_ID, active: true },
  ]);
  dbMocks.createIdempotentFoundationStudy.mockResolvedValue({
    id: 301,
    replayed: false,
  });
  dbMocks.createIdempotentFoundationQuestion.mockResolvedValue({
    id: 901,
    replayed: false,
  });
  dbMocks.getFoundationCreationStatus.mockResolvedValue({
    status: "confirmed",
    id: 301,
  });
});

describe("contrato de criação idempotente do professor", () => {
  it("envia chave/version e resolve autor pela sessão, ignorando autor forjado", async () => {
    await appRouter
      .createCaller(context())
      .escolaFundamentos.createStudyQuestion({
        ...questionInput,
        createdByChurchUserId: 999,
      } as any);
    expect(dbMocks.createIdempotentFoundationQuestion).toHaveBeenCalledWith(
      expect.objectContaining({
        clientRequestId: key,
        requestSchemaVersion: 1,
        createdByChurchUserId: 42,
      })
    );
    expect(dbMocks.createFoundationQuestion).not.toHaveBeenCalled();
  });
  it("replay da pergunta retorna o mesmo ID e indicador da proteção", async () => {
    dbMocks.createIdempotentFoundationQuestion
      .mockResolvedValueOnce({ id: 901, replayed: false })
      .mockResolvedValueOnce({ id: 901, replayed: true });
    const caller = appRouter.createCaller(context());
    expect(
      await caller.escolaFundamentos.createStudyQuestion(questionInput)
    ).toEqual({ id: 901, replayed: false });
    expect(
      await caller.escolaFundamentos.createStudyQuestion(questionInput)
    ).toEqual({ id: 901, replayed: true });
  });
  it("bloqueia chave ausente e UUID inválida antes de criar", async () => {
    const { clientRequestId: _key, ...old } = questionInput;
    await expect(
      appRouter
        .createCaller(context())
        .escolaFundamentos.createStudyQuestion(old)
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Atualize a página antes de criar este registro.",
    });
    await expect(
      appRouter
        .createCaller(context())
        .escolaFundamentos.createStudyQuestion({
          ...questionInput,
          clientRequestId: "invalid",
        })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.createIdempotentFoundationQuestion).not.toHaveBeenCalled();
  });
  it("nega versão não suportada", async () => {
    await expect(
      appRouter
        .createCaller(context())
        .escolaFundamentos.createStudyQuestion({
          ...questionInput,
          requestSchemaVersion: 2,
        } as any)
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.createIdempotentFoundationQuestion).not.toHaveBeenCalled();
  });
  it("nega outro tenant antes da criação", async () => {
    await expect(
      appRouter
        .createCaller(context())
        .escolaFundamentos.createStudyQuestion({
          ...questionInput,
          churchId: 200,
        })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.createIdempotentFoundationQuestion).not.toHaveBeenCalled();
  });
  it("bloco fora do estudo e gabarito inválido continuam bloqueados", async () => {
    dbMocks.getFoundationStudyBlockById.mockResolvedValue(null);
    await expect(
      appRouter
        .createCaller(context())
        .escolaFundamentos.createStudyQuestion(questionInput)
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    dbMocks.getFoundationStudyBlockById.mockResolvedValue({
      id: BLOCK_ID,
      studyId: STUDY_ID,
    });
    await expect(
      appRouter
        .createCaller(context())
        .escolaFundamentos.createStudyQuestion({
          ...questionInput,
          correctOptionId: "c",
        })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.createIdempotentFoundationQuestion).not.toHaveBeenCalled();
  });
  it("permite estudo bíblico e vazio apenas pelo helper idempotente", async () => {
    const caller = appRouter.createCaller(context());
    expect(
      await caller.escolaFundamentos.createStudy({
        ...studyInput,
        template: "biblico",
      })
    ).toEqual({ success: true, studyId: 301, replayed: false });
    expect(dbMocks.createIdempotentFoundationStudy).toHaveBeenCalledWith(
      expect.objectContaining({
        template: "biblico",
        clientRequestId: key,
        createdByChurchUserId: 42,
      })
    );
    await caller.escolaFundamentos.createStudy(studyInput);
    expect(
      dbMocks.createIdempotentFoundationStudy.mock.calls[1][0].template
    ).toBe("blank");
    expect(dbMocks.createFoundationStudy).not.toHaveBeenCalled();
    expect(dbMocks.createFoundationStudyWithBlocks).not.toHaveBeenCalled();
  });
  it("estudo sem chave é bloqueado; confirmação recuperada conserva ID", async () => {
    const { clientRequestId: _key, ...old } = studyInput;
    await expect(
      appRouter.createCaller(context()).escolaFundamentos.createStudy(old)
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    dbMocks.createIdempotentFoundationStudy.mockResolvedValue({
      id: 301,
      replayed: true,
    });
    expect(
      await appRouter
        .createCaller(context())
        .escolaFundamentos.createStudy(studyInput)
    ).toEqual({ success: true, studyId: 301, replayed: true });
  });
  it.each(["study", "question"] as const)(
    "conflito de payload em %s é sanitizado",
    async operation => {
      dbMocks.createIdempotentFoundationStudy.mockRejectedValue(
        new FoundationCreationPayloadMismatchError()
      );
      dbMocks.createIdempotentFoundationQuestion.mockRejectedValue(
        new FoundationCreationPayloadMismatchError()
      );
      const caller = appRouter.createCaller(context());
      const request =
        operation === "study"
          ? caller.escolaFundamentos.createStudy(studyInput)
          : caller.escolaFundamentos.createStudyQuestion(questionInput);
      await expect(request).rejects.toMatchObject({
        code: "CONFLICT",
        message: "Esta tentativa já foi usada com outro conteúdo.",
      });
    }
  );
  it("erros brutos de banco não vazam SQL/conteúdo", async () => {
    dbMocks.createIdempotentFoundationStudy.mockRejectedValue(
      new Error("SQL params SENSITIVE_SYNTHETIC_MARKER")
    );
    const request = appRouter
      .createCaller(context())
      .escolaFundamentos.createStudy(studyInput);
    await expect(request).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
    await expect(request).rejects.not.toHaveProperty(
      "message",
      expect.stringContaining("SENSITIVE_SYNTHETIC_MARKER")
    );
  });
  it("recuperação é limitada ao autor autenticado e sem conteúdo", async () => {
    const result = await appRouter
      .createCaller(context())
      .escolaFundamentos.getCreationStatus({
        churchId: CHURCH_ID,
        operation: "study",
        clientRequestId: key,
      });
    expect(result).toEqual({ status: "confirmed", id: 301 });
    expect(dbMocks.getFoundationCreationStatus).toHaveBeenCalledWith({
      churchId: CHURCH_ID,
      operation: "study",
      clientRequestId: key,
      createdByChurchUserId: 42,
    });
    expect(Object.keys(result).sort()).toEqual(["id", "status"]);
  });
  it("permissão revogada bloqueia criação e recuperação, inclusive com chave válida", async () => {
    dbMocks.getActiveChurchUserById.mockResolvedValue({
      ...member,
      role: "membro",
    });
    const caller = appRouter.createCaller(context());
    await expect(
      caller.escolaFundamentos.createStudy(studyInput)
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.escolaFundamentos.getCreationStatus({
        churchId: CHURCH_ID,
        operation: "study",
        clientRequestId: key,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.createIdempotentFoundationStudy).not.toHaveBeenCalled();
    expect(dbMocks.getFoundationCreationStatus).not.toHaveBeenCalled();
  });
  it("not_found não cria outra entidade", async () => {
    dbMocks.getFoundationCreationStatus.mockResolvedValue({
      status: "not_found",
    });
    expect(
      await appRouter
        .createCaller(context())
        .escolaFundamentos.getCreationStatus({
          churchId: CHURCH_ID,
          operation: "question",
          clientRequestId: key,
        })
    ).toEqual({ status: "not_found" });
    expect(dbMocks.createIdempotentFoundationQuestion).not.toHaveBeenCalled();
  });
});

describe("hash canônico versionado", () => {
  it("ordem das propriedades e normalização de texto não mudam o hash", () => {
    const input = { ...studyInput, template: "biblico" as const };
    expect(hashFoundationStudyCreationPayload(input)).toBe(
      hashFoundationStudyCreationPayload({
        title: input.title + "  ",
        courseId: COURSE_ID,
        churchId: CHURCH_ID,
        weekStart: input.weekStart,
        template: "biblico",
      })
    );
  });
  it("gabarito, alternativas e texto significativo mudam o hash", () => {
    const original = hashFoundationQuestionCreationPayload(questionInput);
    expect(
      hashFoundationQuestionCreationPayload({
        ...questionInput,
        correctOptionId: "b",
      })
    ).not.toBe(original);
    expect(
      hashFoundationQuestionCreationPayload({
        ...questionInput,
        options: [...questionInput.options].reverse(),
      })
    ).not.toBe(original);
    expect(
      hashFoundationQuestionCreationPayload({
        ...questionInput,
        prompt: "Outro princípio?",
      })
    ).not.toBe(original);
  });
});

describe("matrícula unificada e leitura do aluno preservadas", () => {
  it("cartão e sessão mantêm a mesma matrícula e ocultam metadados de criação", async () => {
    const current = {
      id: 22,
      courseId: COURSE_ID,
      personId: PERSON_ID,
      status: "matriculado",
    };
    const study = {
      id: STUDY_ID,
      churchId: CHURCH_ID,
      courseId: COURSE_ID,
      title: "Estudo local",
      weekStart: "2026-01-01",
      active: true,
      clientRequestId: key,
      requestHash: "opaque",
      requestSchemaVersion: 1,
    };
    dbMocks.resolveFoundationEnrollmentForPerson.mockResolvedValue({
      enrollment: current,
      course: { id: COURSE_ID, churchId: CHURCH_ID, active: true },
    });
    dbMocks.getFoundationLearningProgress.mockResolvedValue([
      { study, progress: null },
    ]);
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
    expect(session.enrollmentId).toBe(22);
    expect(dbMocks.getFoundationStudySession).toHaveBeenCalledWith(
      CHURCH_ID,
      22,
      STUDY_ID
    );
    for (const field of [
      "clientRequestId",
      "requestHash",
      "requestSchemaVersion",
    ]) {
      expect(card.items[0].study).not.toHaveProperty(field);
      expect(session.study).not.toHaveProperty(field);
    }
    expect(dbMocks.getFoundationEnrollmentForPerson).not.toHaveBeenCalled();
  });
});
