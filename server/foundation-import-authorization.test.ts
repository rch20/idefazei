import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
const mocks = vi.hoisted(() => ({
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
  getFoundationImportDraft: vi.fn(),
  confirmFoundationImportDraft: vi.fn(),
  cancelFoundationImportDraft: vi.fn(),
}));
vi.mock("./db", async () => ({
  ...(await vi.importActual<typeof import("./db")>("./db")),
  ...mocks,
}));
import { appRouter } from "./routers";
import { FoundationImportError } from "./foundationImport";
const date = new Date("2026-10-17T00:00:00Z");
function context(): TrpcContext {
  return {
    user: {
      id: -42,
      openId: "church:42",
      name: "Professor sintético",
      email: "qa@example.test",
      loginMethod: "church-jwt",
      role: "pastor_local",
      churchId: 100,
      authSource: "church",
      createdAt: date,
      updatedAt: date,
      lastSignedIn: date,
    },
    req: {
      headers: {},
      socket: { remoteAddress: "127.0.0.1" },
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    tenantChurchId: 100,
    requestedTenantChurchId: 100,
    tenantSlug: "qa-local",
  };
}
const caller = (ctx = context()) =>
  appRouter.createCaller(ctx).foundationImport;
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getActiveChurchUserById.mockResolvedValue({
    id: 42,
    churchId: 100,
    personId: 77,
    role: "pastor_local",
    active: true,
    registrationStatus: "approved",
  });
  for (const key of [
    "getComplementaryRolesByChurchUser",
    "getActiveMinistryRoleKeysByPerson",
    "getActiveDepartmentRoleKeysByPerson",
    "getActiveCellRoleKeysByPerson",
    "getMinistryRoleDefinitionsByChurch",
  ] as const)
    mocks[key].mockResolvedValue([]);
  mocks.isActiveConsolidationMinistryMember.mockResolvedValue(false);
  mocks.isActiveVisitsMinistryMember.mockResolvedValue(false);
  mocks.isFoundationStudyAdministrator.mockResolvedValue(false);
  mocks.recordSecurityAccessAuditEvent.mockResolvedValue(1);
  mocks.getFoundationImportDraft.mockResolvedValue({
    id: 8,
    payload: { templateVersion: 2, questions: [{ correctOptionId: "b" }] },
    summary: { errors: 0 },
    status: "pendente",
    expiresAt: date,
    sourceFilename: "sintetico.xlsx",
  });
  mocks.confirmFoundationImportDraft.mockResolvedValue({
    draftId: 8,
    studyId: 99,
    blockCount: 4,
    questionCount: 1,
    materialCount: 0,
    classId: null,
  });
  mocks.cancelFoundationImportDraft.mockResolvedValue(undefined);
});
describe("permissões da importação no router real", () => {
  it.each(["getPreview", "confirm", "cancel"] as const)(
    "bloqueia %s sem sessão",
    async method => {
      const ctx = context();
      ctx.user = null;
      await expect(caller(ctx)[method]({ draftId: 8 })).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
      expect(mocks.getFoundationImportDraft).not.toHaveBeenCalled();
      expect(mocks.confirmFoundationImportDraft).not.toHaveBeenCalled();
      expect(mocks.cancelFoundationImportDraft).not.toHaveBeenCalled();
    }
  );
  it.each(["getPreview", "confirm", "cancel"] as const)(
    "bloqueia %s no host de outra igreja",
    async method => {
      const ctx = context();
      ctx.tenantChurchId = 200;
      ctx.requestedTenantChurchId = 200;
      await expect(caller(ctx)[method]({ draftId: 8 })).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      expect(mocks.confirmFoundationImportDraft).not.toHaveBeenCalled();
      expect(mocks.getFoundationImportDraft).not.toHaveBeenCalled();
    }
  );
  it.each(["getPreview", "confirm", "cancel"] as const)(
    "não permite ao aluno %s nem ler o gabarito administrativo",
    async method => {
      mocks.getActiveChurchUserById.mockResolvedValue({
        id: 42,
        churchId: 100,
        personId: 77,
        role: "membro",
        active: true,
        registrationStatus: "approved",
      });
      const ctx = context();
      ctx.user!.role = "membro";
      await expect(caller(ctx)[method]({ draftId: 8 })).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      expect(mocks.getFoundationImportDraft).not.toHaveBeenCalled();
      expect(mocks.confirmFoundationImportDraft).not.toHaveBeenCalled();
      expect(mocks.cancelFoundationImportDraft).not.toHaveBeenCalled();
    }
  );
  it("a leitura da prévia mantém igreja e autor da sessão", async () => {
    const preview = await caller().getPreview({ draftId: 8 });
    expect(mocks.getFoundationImportDraft).toHaveBeenCalledTimes(1);
    expect(mocks.getFoundationImportDraft).toHaveBeenCalledWith({
      churchId: 100,
      draftId: 8,
      createdByChurchUserId: 42,
    });
    expect(preview.payload).toMatchObject({ templateVersion: 2 });
    expect(mocks.confirmFoundationImportDraft).not.toHaveBeenCalled();
  });
  it("a confirmação usa somente o draftId e a autoridade da sessão", async () => {
    await caller().confirm({
      draftId: 8,
      churchId: 200,
      createdByChurchUserId: 3,
      payload: { study: { publish: true } },
    } as any);
    expect(mocks.confirmFoundationImportDraft).toHaveBeenCalledTimes(1);
    expect(mocks.confirmFoundationImportDraft).toHaveBeenCalledWith({
      churchId: 100,
      draftId: 8,
      createdByChurchUserId: 42,
    });
  });
  it("o descarte não apaga conteúdo nem chama a confirmação", async () => {
    await expect(caller().cancel({ draftId: 8 })).resolves.toEqual({
      success: true,
    });
    expect(mocks.cancelFoundationImportDraft).toHaveBeenCalledTimes(1);
    expect(mocks.cancelFoundationImportDraft).toHaveBeenCalledWith({
      churchId: 100,
      draftId: 8,
      createdByChurchUserId: 42,
    });
    expect(mocks.confirmFoundationImportDraft).not.toHaveBeenCalled();
  });
  it("não divulga a prévia pertencente a outro autor", async () => {
    mocks.getFoundationImportDraft.mockResolvedValue(null);
    await expect(caller().getPreview({ draftId: 8 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
  it("preserva o código de repetição bloqueada na confirmação", async () => {
    mocks.confirmFoundationImportDraft.mockRejectedValue(
      new FoundationImportError("Prévia encerrada.", "CONFLICT")
    );
    await expect(caller().confirm({ draftId: 8 })).rejects.toMatchObject({
      code: "CONFLICT",
      message: "Prévia encerrada.",
    });
  });
  it("o administrador designado pode importar sem promover sua função", async () => {
    mocks.getActiveChurchUserById.mockResolvedValue({
      id: 42,
      churchId: 100,
      personId: 77,
      role: "membro",
      active: true,
      registrationStatus: "approved",
    });
    mocks.isFoundationStudyAdministrator.mockResolvedValue(true);
    const ctx = context();
    ctx.user!.role = "membro";
    await expect(caller(ctx).confirm({ draftId: 8 })).resolves.toMatchObject({
      studyId: 99,
    });
    expect(mocks.isFoundationStudyAdministrator).toHaveBeenCalledWith(100, 42);
  });
});
