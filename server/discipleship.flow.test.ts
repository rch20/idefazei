/**
 * Testes de integração end-to-end — Fluxo de Discipulado
 *
 * Cobre o ciclo completo de uma nova alma:
 * 1. Cadastro de nova alma (souls.create)
 * 2. Abertura de consolidação (consolidation.create)
 * 3. Atualização do checklist de consolidação (consolidation.updateChecklist)
 * 4. Criação de turma de batismo (batismo.createClass)
 * 5. Inscrição no batismo (batismo.enroll)
 * 6. Conclusão do batismo (batismo.updateEnrollment)
 * 7. Criação de célula (cells.create)
 * 8. Geração de certificado — validação de acesso negado para pessoa de outra igreja
 *
 * Estratégia de mock:
 * - vi.mock intercepta os módulos de db.ts e storage.ts para evitar conexão real
 * - requireChurchMember é satisfeito retornando um membro válido
 * - Cada teste valida a resposta do router e a chamada ao helper correto
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { assignMinistryRole, assignPersonToCell, canChurchUserManageJourney, closeFinancialPeriod, createCellMeetingWithAttendance, createConsolidationFollowUp, createFinancialAccount, createFinancialCategory, createFinancialTransaction, findPossiblePeopleByIdentity, getActiveChurchUserById, getActiveMembersByCell, getActiveMinistryRoleKeysByPerson, getMinistryRoleDefinitionsByChurch, getCareAttentionByChurch, getCellMembersCount, getCellMeetingByDate, getCellMeetingSummaries, getCellsByChurch, getChurchMemberByUserId, getComplementaryRolesByChurchUser, getConsolidationsByChurch, getConsolidationFollowUpsByChurch, getConsolidationFollowUpsByReferral, getConsolidationReferralById, getConsolidationReferralsByChurch, getCounselingSessionById, getBookBalanceAt, getEventAttendanceReport, getFinancialAccountById, getFinancialCategoryById, getFinancialPeriodClosure, getFinancialReceiptData, getFinancialReconciliationAttachments, getFinancialReconciliationById, getJourneyManagedPersonIds, getMinistriesByChurch, getPeopleByChurch, getPendingChurchUsers, getPersonById, getSoulsByChurch, getTreasuryOverview, isActiveMinistryMember, removeFinancialReconciliationAttachment, resolveChurchUserRegistration, saveFinancialReconciliation, setComplementaryRolesForChurchUser, setCurrentCareAssignment, updateChurchUserAssignment, updateConsolidation, updateConsolidationReferral, updatePerson } from "./db";

// ─── MOCKS ────────────────────────────────────────────────────────────────────

// Mock do db.ts — todas as funções de acesso ao banco
vi.mock("./db", () => ({
  getChurchMemberByUserId: vi.fn().mockResolvedValue({
    id: 1,
    userId: 10,
    churchId: 100,
    role: "pastor_presidente",
    active: true,
  }),
  getActiveChurchUserById: vi.fn().mockResolvedValue({ id: 2, churchId: 100, personId: 10, role: "lider", active: true }),
  getChurchById: vi.fn().mockResolvedValue({
    id: 100,
    name: "Igreja Teste",
    slug: "igreja-teste",
    certPastorName: "Pastor João",
    certLogoUrl: null,
    certVerseFundamentos: "João 3:16",
    certVerseBatismo: "Mateus 28:19",
    certVerseLideres: "Marcos 16:15",
    certSignatureLabel: "Pastor(a) Presidente",
  }),
  getSoulsByChurch: vi.fn().mockResolvedValue([]),
  getSoulById: vi.fn().mockResolvedValue({ id: 1, churchId: 100, personId: 1, status: "nova_alma" }),
  createSoul: vi.fn().mockResolvedValue({ id: 1, name: "Maria Silva", churchId: 100 }),
  linkSoulToPerson: vi.fn().mockResolvedValue(undefined),
  updateSoul: vi.fn().mockResolvedValue({ id: 1, status: "em_consolidacao" }),
  getConsolidationsByChurch: vi.fn().mockResolvedValue([]),
  getConsolidationsBySoul: vi.fn().mockResolvedValue([]),
  getConsolidationById: vi.fn().mockResolvedValue({ id: 1, churchId: 100, soulId: 1, status: "em_consolidacao" }),
  createConsolidation: vi.fn().mockResolvedValue({ id: 1, soulId: 1, churchId: 100 }),
  updateConsolidation: vi.fn().mockResolvedValue({ id: 1, callMade: true, status: "consolidado" }),
  getConsolidationReferralsByChurch: vi.fn().mockResolvedValue([]),
  getConsolidationReferralById: vi.fn().mockResolvedValue({ id: 51, churchId: 100, personId: 1, referredByPersonId: 10, status: "pendente" }),
  createConsolidationReferral: vi.fn().mockResolvedValue({ id: 51, churchId: 100, status: "pendente" }),
  updateConsolidationReferral: vi.fn().mockResolvedValue({ id: 51, churchId: 100, status: "aceito" }),
  getConsolidationFollowUpsByReferral: vi.fn().mockResolvedValue([]),
  getConsolidationFollowUpsByChurch: vi.fn().mockResolvedValue([]),
  createConsolidationFollowUp: vi.fn().mockResolvedValue({ id: 91, churchId: 100, referralId: 51 }),
  getCellsByChurch: vi.fn().mockResolvedValue([]),
  getCellMembersCount: vi.fn().mockResolvedValue([]),
  getActiveMembersByCell: vi.fn().mockResolvedValue([]),
  getCellById: vi.fn().mockResolvedValue({ id: 2, churchId: 100, name: "Célula Vida", leaderId: 10, active: true }),
  getCellMeetingSummaries: vi.fn().mockResolvedValue([]),
  getCellMeetingByDate: vi.fn().mockResolvedValue(null),
  createCellMeetingWithAttendance: vi.fn().mockResolvedValue({ id: 9, cellId: 2, churchId: 100, meetingDate: "2026-08-18" }),
  getActiveCellMembership: vi.fn().mockResolvedValue(null),
  getCellMembershipHistory: vi.fn().mockResolvedValue([]),
  assignPersonToCell: vi.fn().mockResolvedValue({ id: 3, cellId: 2, personId: 10, active: true }),
  createCell: vi.fn().mockResolvedValue({ id: 1, name: "Célula Esperança", churchId: 100 }),
  getBaptismClassesByChurch: vi.fn().mockResolvedValue([{ id: 1, churchId: 100, name: "Turma Batismo Junho" }]),
  getBaptismEnrollments: vi.fn().mockResolvedValue([]),
  createBaptismClass: vi.fn().mockResolvedValue({ id: 1, name: "Turma Batismo Junho", churchId: 100 }),
  enrollInBaptism: vi.fn().mockResolvedValue({ id: 1, baptismClassId: 1, personId: 1 }),
  updateBaptismEnrollment: vi.fn().mockResolvedValue({ id: 1, status: "concluiu" }),
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([{ id: 1 }]), // pessoa existe na igreja
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  }),
  // helpers adicionais usados por outros routers
  getAllChurches: vi.fn().mockResolvedValue([]),
  getChurchBySlug: vi.fn().mockResolvedValue(null),
  createChurch: vi.fn().mockResolvedValue({ id: 100 }),
  getPeopleByChurch: vi.fn().mockResolvedValue([]),
  findPossiblePeopleByIdentity: vi.fn().mockResolvedValue([]),
  getPersonById: vi.fn().mockResolvedValue({ id: 10, churchId: 100, fullName: "Líder Teste" }),
  createPerson: vi.fn().mockResolvedValue({ id: 1 }),
  updatePerson: vi.fn().mockResolvedValue({ id: 1 }),
  getCurrentCareAssignment: vi.fn().mockResolvedValue(null),
  getCareHistoryByPerson: vi.fn().mockResolvedValue([]),
  getCareAttentionByChurch: vi.fn().mockResolvedValue([]),
  setCurrentCareAssignment: vi.fn().mockResolvedValue({ id: 1, personId: 1, responsiblePersonId: 10 }),
  canChurchUserManageJourney: vi.fn().mockResolvedValue(true),
  getJourneyManagedPersonIds: vi.fn().mockResolvedValue([]),
  getChurchUsersByChurch: vi.fn().mockResolvedValue([]),
  getStartupDiagnostics: vi.fn().mockResolvedValue([]),
  getPendingChurchUsers: vi.fn().mockResolvedValue([]),
  resolveChurchUserRegistration: vi.fn().mockResolvedValue({ id: 77, churchId: 100, active: true, registrationStatus: "approved" }),
  linkChurchUserToPerson: vi.fn().mockResolvedValue({ id: 1, personId: 10 }),
  updateChurchUserAssignment: vi.fn().mockResolvedValue({ id: 2, personId: 10, role: "lider" }),
  getComplementaryRolesByChurchUser: vi.fn().mockResolvedValue([]),
  getActiveMinistryRoleKeysByPerson: vi.fn().mockResolvedValue([]),
  getMinistryRoleDefinitionsByChurch: vi.fn().mockResolvedValue([]),
  getMinistryRoleAssignmentsByPerson: vi.fn().mockResolvedValue([]),
  assignMinistryRole: vi.fn().mockResolvedValue({ id: 1, alreadyAssigned: false }),
  deactivateMinistryRole: vi.fn().mockResolvedValue(undefined),
  setComplementaryRolesForChurchUser: vi.fn().mockResolvedValue(["diacono", "levita"]),
  getEventsByChurch: vi.fn().mockResolvedValue([]),
  getEventAttendanceReport: vi.fn().mockResolvedValue({
    event: { id: 31, churchId: 100, name: "Conferência de Fé", startDate: new Date("2026-08-15") },
    summary: { registeredCount: 3, checkedInCount: 2, absentCount: 1, cancelledCount: 0 },
    registrations: [],
  }),
  createEvent: vi.fn().mockResolvedValue({ id: 1 }),
  getFinancialAccountsByChurch: vi.fn().mockResolvedValue([{ id: 91, churchId: 100, name: "Caixa", type: "caixa", openingBalanceCents: 0 }]),
  getFinancialAccountById: vi.fn().mockResolvedValue({ id: 91, churchId: 100, name: "Caixa", type: "caixa", openingBalanceCents: 0, active: true }),
  getFinancialCategoriesByChurch: vi.fn().mockResolvedValue([{ id: 81, churchId: 100, type: "entrada", key: "dizimo", name: "Dízimo", active: true }]),
  getFinancialCategoryById: vi.fn().mockResolvedValue({ id: 81, churchId: 100, type: "entrada", key: "dizimo", name: "Dízimo", active: true }),
  getFinancialPeriodClosure: vi.fn().mockResolvedValue(null),
  getFinancialReceiptData: vi.fn().mockResolvedValue({ transaction: { id: 71, churchId: 100, type: "entrada", status: "confirmado", amountCents: 125000, transactionDate: new Date("2026-08-01"), paymentMethod: "pix", contributorPersonId: null, contributorName: "Ana" }, account: { id: 91, churchId: 100, name: "Banco", type: "banco" }, category: { id: 81, churchId: 100, name: "Dízimo", type: "entrada" }, contributor: null }),
  getFinancialReconciliation: vi.fn().mockResolvedValue(null),
  getFinancialReconciliationById: vi.fn().mockResolvedValue({ id: 4, churchId: 100, accountId: 91 }),
  getFinancialReconciliationAttachments: vi.fn().mockResolvedValue([{ id: 9, churchId: 100, reconciliationId: 4, fileName: "extrato-agosto.pdf", url: "/manus-storage/churches/100/proof.pdf" }]),
  removeFinancialReconciliationAttachment: vi.fn().mockResolvedValue(true),
  getBookBalanceAt: vi.fn().mockResolvedValue(125000),
  saveFinancialReconciliation: vi.fn().mockResolvedValue({ id: 4, churchId: 100, status: "com_divergencia", differenceCents: -5000 }),
  getFinancialTransactionById: vi.fn().mockResolvedValue({ id: 71, churchId: 100, status: "confirmado", transactionDate: new Date("2026-08-01T12:00:00.000Z") }),
  getTreasuryOverview: vi.fn().mockResolvedValue({ accounts: [], transactions: [], entriesCents: 0, expensesCents: 0, resultCents: 0, balanceCents: 0, accountBalances: [], categories: [] }),
  isFinancialPeriodClosed: vi.fn().mockResolvedValue(false),
  createFinancialAccount: vi.fn().mockResolvedValue({ id: 91, churchId: 100, name: "Caixa" }),
  createFinancialCategory: vi.fn().mockResolvedValue({ id: 81, churchId: 100, name: "Dízimo" }),
  createFinancialTransaction: vi.fn().mockResolvedValue({ id: 71, churchId: 100, status: "confirmado" }),
  updateFinancialDraft: vi.fn().mockResolvedValue({ id: 71, churchId: 100, status: "rascunho" }),
  confirmFinancialTransaction: vi.fn().mockResolvedValue({ id: 71, churchId: 100, status: "confirmado" }),
  reverseFinancialTransaction: vi.fn().mockResolvedValue({ id: 71, churchId: 100, status: "estornado" }),
  closeFinancialPeriod: vi.fn().mockResolvedValue({ id: 1, churchId: 100, status: "fechado" }),
  reopenFinancialPeriod: vi.fn().mockResolvedValue({ id: 1, churchId: 100, status: "reaberto" }),
  getMinistries: vi.fn().mockResolvedValue([]),
  getMinistriesByChurch: vi.fn().mockResolvedValue([{ id: 7, churchId: 100, name: "Ministério de Consolidação", type: "outro", active: true }]),
  getMinistryMembers: vi.fn().mockResolvedValue([]),
  getMinistryMemberCounts: vi.fn().mockResolvedValue([]),
  isActiveMinistryMember: vi.fn().mockResolvedValue(true),
  getScheduleTimeConflicts: vi.fn().mockResolvedValue([]),
  getScheduleItemById: vi.fn().mockResolvedValue({ id: 41, churchId: 100, ministryId: 7, personId: 10, scheduledDate: new Date("2026-06-28T12:00:00.000Z"), startTime: "09:00", endTime: "11:00", role: "Recepção", status: "agendada" }),
  updateScheduleItem: vi.fn().mockResolvedValue({ id: 41, churchId: 100, ministryId: 7, personId: 10, status: "agendada" }),
  cancelScheduleItem: vi.fn().mockResolvedValue({ id: 41, churchId: 100, ministryId: 7, personId: 10, status: "cancelada", cancelReason: "Voluntário indisponível" }),
  assignPersonToMinistry: vi.fn().mockResolvedValue({ id: 1 }),
  createMinistry: vi.fn().mockResolvedValue({ id: 1 }),
  getAnnouncements: vi.fn().mockResolvedValue([]),
  createAnnouncement: vi.fn().mockResolvedValue({ id: 1 }),
  getPrayerRequests: vi.fn().mockResolvedValue([]),
  createPrayerRequest: vi.fn().mockResolvedValue({ id: 1 }),
  getDashboardStats: vi.fn().mockResolvedValue({}),
  getFamiliesByChurch: vi.fn().mockResolvedValue([]),
  createFamily: vi.fn().mockResolvedValue({ id: 1 }),
  getSchedulesByChurch: vi.fn().mockResolvedValue([]),
  createSchedule: vi.fn().mockResolvedValue({ id: 1 }),
  getLibraryItems: vi.fn().mockResolvedValue([]),
  createLibraryItem: vi.fn().mockResolvedValue({ id: 1 }),
  getOnboardingProgress: vi.fn().mockResolvedValue(null),
  updateOnboardingProgress: vi.fn().mockResolvedValue({ id: 1 }),
  getChurchMembersByChurch: vi.fn().mockResolvedValue([]),
  getCoursesByChurch: vi.fn().mockResolvedValue([{ id: 55, churchId: 100, name: "Fundamentos da Fé", type: "salvacao", active: true }]),
  createCourse: vi.fn().mockResolvedValue({ id: 55 }),
  getCourseEnrollments: vi.fn().mockResolvedValue([]),
  getCourseEnrollmentById: vi.fn().mockResolvedValue({ id: 1, courseId: 55 }),
  enrollInCourse: vi.fn().mockResolvedValue({ id: 1 }),
  updateCourseEnrollment: vi.fn().mockResolvedValue(undefined),
  getFoundationStudiesByCourse: vi.fn().mockResolvedValue([]),
  getFoundationStudyById: vi.fn().mockResolvedValue({ id: 90, churchId: 100, courseId: 55, title: "Salvação" }),
  getFoundationModulesByCourse: vi.fn().mockResolvedValue([]),
  getFoundationModuleById: vi.fn().mockResolvedValue({ id: 71, churchId: 100, courseId: 55, title: "Alicerces" }),
  createFoundationStudy: vi.fn().mockResolvedValue({ id: 90 }),
  createFoundationModule: vi.fn().mockResolvedValue({ id: 71 }),
  updateFoundationStudy: vi.fn().mockResolvedValue(undefined),
  updateFoundationModule: vi.fn().mockResolvedValue(undefined),
  getLibraryItemById: vi.fn().mockResolvedValue({ id: 301, churchId: 100, title: "Apostila de Fundamentos", type: "pdf" }),
  getFoundationStudyMaterials: vi.fn().mockResolvedValue([]),
  attachFoundationStudyMaterial: vi.fn().mockResolvedValue(undefined),
  updateFoundationStudyMaterialPosition: vi.fn().mockResolvedValue(undefined),
  detachFoundationStudyMaterial: vi.fn().mockResolvedValue(undefined),
  getFoundationStudyAdministrators: vi.fn().mockResolvedValue([]),
  isFoundationStudyAdministrator: vi.fn().mockResolvedValue(false),
  assignFoundationStudyAdministrator: vi.fn().mockResolvedValue(undefined),
  removeFoundationStudyAdministrator: vi.fn().mockResolvedValue(undefined),
  getFoundationCoursesByChurch: vi.fn().mockResolvedValue([]),
  getFoundationEnrollments: vi.fn().mockResolvedValue([]),
  createFoundationCourse: vi.fn().mockResolvedValue({ id: 1 }),
  enrollInFoundation: vi.fn().mockResolvedValue({ id: 1 }),
  updateFoundationEnrollment: vi.fn().mockResolvedValue({ id: 1 }),
  getEncounterEventsByChurch: vi.fn().mockResolvedValue([]),
  getEncounterEnrollments: vi.fn().mockResolvedValue([]),
  createEncounterEvent: vi.fn().mockResolvedValue({ id: 1 }),
  enrollInEncounter: vi.fn().mockResolvedValue({ id: 1 }),
  updateEncounterEnrollment: vi.fn().mockResolvedValue({ id: 1 }),
  getLeadershipClassesByChurch: vi.fn().mockResolvedValue([]),
  getLeadershipEnrollments: vi.fn().mockResolvedValue([]),
  createLeadershipClass: vi.fn().mockResolvedValue({ id: 1 }),
  enrollInLeadership: vi.fn().mockResolvedValue({ id: 1 }),
  updateLeadershipEnrollment: vi.fn().mockResolvedValue({ id: 1 }),
  getLeadershipHistory: vi.fn().mockResolvedValue([]),
  createLeadershipHistory: vi.fn().mockResolvedValue({ id: 1 }),
  updateLeadershipHistory: vi.fn().mockResolvedValue({ id: 1 }),
  getCounselingSessions: vi.fn().mockResolvedValue([]),
  getCounselingSessionsByChurch: vi.fn().mockResolvedValue([]),
  getCounselingSessionById: vi.fn().mockResolvedValue({ id: 20, churchId: 100, counselorId: 10 }),
  createCounselingSession: vi.fn().mockResolvedValue({ id: 1 }),
  updateCounselingSession: vi.fn().mockResolvedValue({ id: 1 }),
  getCounselingNotes: vi.fn().mockResolvedValue([]),
  createCounselingNote: vi.fn().mockResolvedValue({ id: 1 }),
  getCommunicationLogs: vi.fn().mockResolvedValue([]),
  createCommunicationLog: vi.fn().mockResolvedValue({ id: 1 }),
  getVisitorByToken: vi.fn().mockResolvedValue(null),
  createVisitor: vi.fn().mockResolvedValue({ id: 1 }),
  getInviteByToken: vi.fn().mockResolvedValue(null),
  createInvite: vi.fn().mockResolvedValue({ id: 1, token: "abc123" }),
  getReportData: vi.fn().mockResolvedValue({}),
  getCellAttendance: vi.fn().mockResolvedValue([]),
  createCellAttendance: vi.fn().mockResolvedValue({ id: 1 }),
  getDiscipleshipFunnel: vi.fn().mockResolvedValue([]),
  updateDiscipleshipStage: vi.fn().mockResolvedValue({ id: 1 }),
}));

// Mock do storage.ts — evita chamadas reais ao S3
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({
    key: "churches/100/certificates/batismo-maria-silva-123.pdf",
    url: "/manus-storage/churches/100/certificates/batismo-maria-silva-123.pdf",
  }),
  storageGet: vi.fn().mockResolvedValue({ key: "test", url: "/manus-storage/test" }),
}));

// Mock do certificates.ts — evita geração real de PDF
vi.mock("./certificates", () => ({
  generateCertificatePDF: vi.fn().mockResolvedValue(Buffer.from("PDF_BYTES")),
}));

// Mock do _core/notification.ts
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

vi.mock("./notifications", () => ({
  emitInternalNotification: vi.fn().mockResolvedValue({ created: true, eventId: 1, deliveries: 1 }),
}));

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function createMemberContext(userId = 10): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `user-${userId}`,
      email: `user${userId}@example.com`,
      name: "Líder Teste",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

const CHURCH_ID = 100;

// ─── TESTES ───────────────────────────────────────────────────────────────────

describe("Fluxo completo de discipulado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getChurchMemberByUserId as ReturnType<typeof vi.fn>).mockReset().mockResolvedValue({
      id: 1,
      userId: 10,
      churchId: CHURCH_ID,
      role: "pastor_presidente",
      active: true,
    });
    (getComplementaryRolesByChurchUser as ReturnType<typeof vi.fn>).mockReset().mockResolvedValue([]);
  });

  describe("Diagnósticos de inicialização", () => {
    it("permite a consulta somente pelo Super Admin", async () => {
      const { getStartupDiagnostics } = await import("./db");
      (getStartupDiagnostics as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        { id: 1, churchId: 100, kind: "startup_timeout", message: "A inicialização excedeu nove segundos", path: "/", userAgent: "Safari", createdAt: new Date() },
      ]);
      const adminCaller = appRouter.createCaller({
        ...createMemberContext(),
        user: { ...createMemberContext().user!, role: "admin", authSource: "admin" },
      });

      await expect(adminCaller.diagnostics.recent({ limit: 20 })).resolves.toHaveLength(1);
      await expect(appRouter.createCaller(createMemberContext()).diagnostics.recent({ limit: 20 })).rejects.toThrow("required permission");
      expect(getStartupDiagnostics).toHaveBeenCalledWith(20);
    });
  });

  // ── Etapa 1: Cadastro de nova alma ──────────────────────────────────────────
  describe("Etapa 1 — Cadastro de nova alma", () => {
    it("cria uma nova alma com dados válidos", async () => {
      const ctx = createMemberContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.souls.create({
        churchId: CHURCH_ID,
        name: "Maria Silva",
        decisionDate: "2026-06-15",
        origin: "culto",
        acceptedJesus: true,
        reconciliation: false,
        firstVisit: false,
        wonById: 10,
      });

      expect(result).toBeDefined();
      expect(result.soul.name).toBe("Maria Silva");
      expect(result.soul.churchId).toBe(CHURCH_ID);
      expect(result.person.id).toBe(1);
      expect(setCurrentCareAssignment).toHaveBeenCalledWith(
        expect.objectContaining({ personId: 1, responsiblePersonId: 10, role: "quem_ganhou" })
      );
    });

    it("permite registrar visita espontânea sem exigir quem ganhou", async () => {
      const caller = appRouter.createCaller(createMemberContext());

      const result = await caller.souls.create({
        churchId: CHURCH_ID,
        name: "Visitante Espontânea",
        decisionDate: "2026-06-15",
        origin: "visita_espontanea",
        acceptedJesus: false,
        reconciliation: false,
        firstVisit: true,
      });

      expect(result.person.id).toBe(1);
      expect(result.needsConsolidator).toBe(true);
      expect(setCurrentCareAssignment).not.toHaveBeenCalled();
    });

    it("rejeita nome muito curto", async () => {
      const ctx = createMemberContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.souls.create({
          churchId: CHURCH_ID,
          name: "M", // mínimo 2 caracteres
          decisionDate: "2026-06-15",
          origin: "culto",
          acceptedJesus: true,
          reconciliation: false,
          firstVisit: false,
          wonById: 10,
        })
      ).rejects.toThrow();
    });

    it("rejeita responsável que não pertence à igreja", async () => {
      (getPersonById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
      const caller = appRouter.createCaller(createMemberContext());

      await expect(
        caller.souls.create({
          churchId: CHURCH_ID,
          name: "Maria Silva",
          decisionDate: "2026-06-15",
          origin: "culto",
          acceptedJesus: true,
          reconciliation: false,
          firstVisit: false,
          wonById: 999,
        })
      ).rejects.toThrow("Selecione uma pessoa válida da sua igreja.");
    });

    it("evita duplicidade quando o telefone já pertence a outra ficha", async () => {
      (findPossiblePeopleByIdentity as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        { id: 55, churchId: CHURCH_ID, fullName: "Maria Já Cadastrada", phone: "11999999999", whatsapp: null },
      ]);
      const caller = appRouter.createCaller(createMemberContext());

      await expect(
        caller.souls.create({
          churchId: CHURCH_ID,
          name: "Maria Silva",
          phone: "11999999999",
          decisionDate: "2026-06-15",
          origin: "culto",
          acceptedJesus: true,
          reconciliation: false,
          firstVisit: false,
          wonById: 10,
        })
      ).rejects.toThrow("Já existe uma Pessoa com este telefone");
    });
  });

  // ── Etapa 2: Consolidação ────────────────────────────────────────────────────
  describe("Etapa 2 — Consolidação", () => {
    it("permite corrigir uma etapa retornando a Pessoa para o ponto anterior", async () => {
      const caller = appRouter.createCaller(createMemberContext());

      await caller.people.update({
        id: 10,
        churchId: CHURCH_ID,
        discipleshipStage: "consolidacao",
      });

      expect(updatePerson).toHaveBeenCalledWith(10, CHURCH_ID, { discipleshipStage: "consolidacao" });
    });

    it("bloqueia movimentação de etapa fora da responsabilidade do usuário", async () => {
      (canChurchUserManageJourney as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);
      const caller = appRouter.createCaller(createMemberContext());

      await expect(
        caller.people.update({ id: 10, churchId: CHURCH_ID, discipleshipStage: "fundamentos" })
      ).rejects.toThrow("sob sua responsabilidade pastoral");
    });

    it("abre processo de consolidação para a nova alma", async () => {
      const ctx = createMemberContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.consolidation.create({
        churchId: CHURCH_ID,
        soulId: 1,
        consolidatorId: 10,
      });

      expect(result).toBeDefined();
      expect(result.soulId).toBe(1);
      expect(result.churchId).toBe(CHURCH_ID);
    });

    it("atualiza o checklist de consolidação marcando visita e entrega de bíblia", async () => {
      const ctx = createMemberContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.consolidation.updateChecklist({
        id: 1,
        churchId: CHURCH_ID,
        callMade: true,
        visitMade: true,
        bibleDelivered: true,
        status: "consolidado",
      });

      expect(result).toBeDefined();
      expect(updateConsolidation).toHaveBeenCalledWith(
        1,
        CHURCH_ID,
        expect.objectContaining({
          callMade: true,
          visitMade: true,
          bibleDelivered: true,
          status: "consolidado",
          callDate: expect.any(Date),
          visitDate: expect.any(Date),
          bibleDate: expect.any(Date),
        })
      );
    });
  });

  // ── Etapa 2.5: Integração em Célula ─────────────────────────────────────────
  describe("Etapa 2.5 — Integração em Célula", () => {
    it("integra a Pessoa em uma única célula e atualiza o responsável pelo cuidado", async () => {
      const caller = appRouter.createCaller(createMemberContext());

      const result = await caller.cells.assignPerson({
        churchId: CHURCH_ID,
        personId: 10,
        cellId: 2,
      });

      expect(result.transferred).toBe(false);
      expect(assignPersonToCell).toHaveBeenCalledWith({ churchId: CHURCH_ID, personId: 10, cellId: 2 });
      expect(setCurrentCareAssignment).toHaveBeenCalledWith(
        expect.objectContaining({ personId: 10, responsiblePersonId: 10, role: "lider_celula" })
      );
    });

    it("lista as Pessoas ativas quando os detalhes da Célula são abertos", async () => {
      (getActiveMembersByCell as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        { membership: { id: 8, cellId: 2, personId: 10, active: true }, person: { id: 10, fullName: "Ana Silva" } },
      ]);
      const caller = appRouter.createCaller(createMemberContext());

      const members = await caller.cells.members({ churchId: CHURCH_ID, cellId: 2 });

      expect(members).toHaveLength(1);
      expect(members[0].person.fullName).toBe("Ana Silva");
      expect(getActiveMembersByCell).toHaveBeenCalledWith(2, CHURCH_ID);
    });

    it("calcula o total real de Pessoas com vínculo ativo em Células", async () => {
      (getCellMembersCount as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        { cellId: 2, count: 8 },
        { cellId: 3, count: 6 },
      ]);
      const caller = appRouter.createCaller(createMemberContext());

      const counts = await caller.cells.memberCounts({ churchId: CHURCH_ID });

      expect(counts).toEqual([{ cellId: 2, count: 8 }, { cellId: 3, count: 6 }]);
      expect(getCellMembersCount).toHaveBeenCalledWith(CHURCH_ID);
    });

    it("permite que o líder registre um encontro com toda a lista de presença", async () => {
      (getActiveMembersByCell as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        { membership: { id: 8, cellId: 2, personId: 10, active: true }, person: { id: 10, fullName: "Ana Silva" } },
        { membership: { id: 9, cellId: 2, personId: 11, active: true }, person: { id: 11, fullName: "Bruno Lima" } },
      ]);
      const caller = appRouter.createCaller(createMemberContext(-2));

      const result = await caller.cells.recordMeeting({
        churchId: CHURCH_ID,
        cellId: 2,
        meetingDate: "2026-08-18",
        topic: "Comunhão e oração",
        attendance: [
          { personId: 10, status: "presente" },
          { personId: 11, status: "ausente" },
        ],
      });

      expect(result).toMatchObject({ cellId: 2, meetingDate: "2026-08-18" });
      expect(createCellMeetingWithAttendance).toHaveBeenCalledWith(expect.objectContaining({
        cellId: 2,
        churchId: CHURCH_ID,
        attendance: [
          { personId: 10, status: "presente" },
          { personId: 11, status: "ausente" },
        ],
      }));
    });

    it("rejeita presença de Pessoa que não pertence à Célula", async () => {
      (getActiveMembersByCell as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        { membership: { id: 8, cellId: 2, personId: 10, active: true }, person: { id: 10, fullName: "Ana Silva" } },
      ]);
      const caller = appRouter.createCaller(createMemberContext(-2));

      await expect(caller.cells.recordMeeting({
        churchId: CHURCH_ID,
        cellId: 2,
        meetingDate: "2026-08-19",
        attendance: [{ personId: 999, status: "presente" }],
      })).rejects.toThrow("Registre a presença de todas as Pessoas atualmente vinculadas à Célula");
    });

    it("bloqueia outro encontro da mesma Célula na mesma data", async () => {
      (getCellMeetingByDate as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 9, cellId: 2, meetingDate: new Date("2026-08-18T00:00:00.000Z") });
      const caller = appRouter.createCaller(createMemberContext(-2));

      await expect(caller.cells.recordMeeting({
        churchId: CHURCH_ID,
        cellId: 2,
        meetingDate: "2026-08-18",
        attendance: [],
      })).rejects.toThrow("Já existe um encontro registrado para esta data");
      expect(createCellMeetingWithAttendance).not.toHaveBeenCalled();
    });

    it("consulta o histórico resumido de encontros da Célula", async () => {
      (getCellMeetingSummaries as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        { meeting: { id: 9, meetingDate: "2026-08-18" }, present: 7, absent: 1, total: 8 },
      ]);
      const caller = appRouter.createCaller(createMemberContext());

      const history = await caller.cells.meetingHistory({ churchId: CHURCH_ID, cellId: 2 });

      expect(history[0]).toMatchObject({ present: 7, absent: 1, total: 8 });
      expect(getCellMeetingSummaries).toHaveBeenCalledWith(2, CHURCH_ID);
    });

    it("integra a Nova Alma em uma Célula real e atualiza o cuidado", async () => {
      const caller = appRouter.createCaller(createMemberContext());

      const result = await caller.consolidation.integrateIntoCell({
        churchId: CHURCH_ID,
        consolidationId: 1,
        cellId: 2,
      });

      expect(assignPersonToCell).toHaveBeenCalledWith({ churchId: CHURCH_ID, personId: 1, cellId: 2 });
      expect(updateConsolidation).toHaveBeenCalledWith(1, CHURCH_ID, expect.objectContaining({ addedToCell: true }));
      expect(setCurrentCareAssignment).toHaveBeenCalledWith(expect.objectContaining({
        churchId: CHURCH_ID,
        personId: 1,
        responsiblePersonId: 10,
        role: "lider_celula",
      }));
      expect(result.membership).toMatchObject({ cellId: 2 });
    });
  });

  // ── Etapa 2.6: Serviço em Ministério ───────────────────────────────────────
  describe("Etapa 2.6 — Serviço em Ministério", () => {
    it("bloqueia membro comum de criar Ministério, alterar participantes ou montar Escalas", async () => {
      (getChurchMemberByUserId as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 12,
        userId: 44,
        churchId: CHURCH_ID,
        personId: 44,
        role: "membro",
        active: true,
      });
      const caller = appRouter.createCaller(createMemberContext(44));

      await expect(caller.ministries.create({ churchId: CHURCH_ID, name: "Recepção" })).rejects.toThrow("não tem permissão");
      await expect(caller.ministries.assignPerson({ churchId: CHURCH_ID, ministryId: 7, personId: 10 })).rejects.toThrow("responsáveis por este Ministério");
      await expect(caller.schedules.create({
        churchId: CHURCH_ID,
        ministryId: 7,
        personId: 10,
        scheduledDate: "2026-06-28",
        startTime: "09:00",
        endTime: "11:00",
      })).rejects.toThrow("responsáveis por este Ministério");
    });

    it("permite ao responsável nomeado do Ministério atribuir participantes e criar Escalas", async () => {
      (getChurchMemberByUserId as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 13,
        userId: 45,
        churchId: CHURCH_ID,
        personId: 10,
        role: "membro",
        active: true,
      });
      (getMinistriesByChurch as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        { id: 7, churchId: CHURCH_ID, name: "Ministério de Consolidação", type: "outro", leaderId: 10, active: true },
      ]);
      const caller = appRouter.createCaller(createMemberContext(45));

      await expect(caller.ministries.assignPerson({ churchId: CHURCH_ID, ministryId: 7, personId: 10 })).resolves.toMatchObject({ success: true });
    });

    it("bloqueia uma escala quando a Pessoa não pertence ao Ministério", async () => {
      (isActiveMinistryMember as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);
      const caller = appRouter.createCaller(createMemberContext());

      await expect(
        caller.schedules.create({
          churchId: CHURCH_ID,
          ministryId: 7,
          personId: 10,
          scheduledDate: "2026-06-28",
          startTime: "09:00",
          endTime: "11:00",
          role: "Recepção",
        })
      ).rejects.toThrow("precisa ser participante ativa deste Ministério");
    });

    it("bloqueia uma escala quando o voluntário já possui horário sobreposto na mesma igreja", async () => {
      const { getScheduleTimeConflicts } = await import("./db");
      (getScheduleTimeConflicts as ReturnType<typeof vi.fn>).mockResolvedValueOnce([{ id: 88, churchId: CHURCH_ID }]);
      const caller = appRouter.createCaller(createMemberContext());

      await expect(caller.schedules.create({
        churchId: CHURCH_ID,
        ministryId: 7,
        personId: 10,
        scheduledDate: "2026-06-28",
        startTime: "09:30",
        endTime: "11:30",
        role: "Vocal",
      })).rejects.toThrow("horário sobreposto");

      expect(getScheduleTimeConflicts).toHaveBeenCalledWith(expect.objectContaining({ churchId: CHURCH_ID, personId: 10, startTime: "09:30", endTime: "11:30" }));
    });

    it("edita uma Escala ativa sem contar a própria Escala como conflito", async () => {
      const { getScheduleItemById, getScheduleTimeConflicts, updateScheduleItem, getChurchUsersByChurch } = await import("./db");
      const { emitInternalNotification } = await import("./notifications");
      (getScheduleItemById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 41, churchId: CHURCH_ID, ministryId: 7, personId: 10,
        scheduledDate: new Date("2026-06-28T12:00:00.000Z"), startTime: "09:00", endTime: "11:00", status: "agendada",
      });
      (getScheduleTimeConflicts as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
      (getChurchUsersByChurch as ReturnType<typeof vi.fn>).mockResolvedValueOnce([{ id: 88, churchId: CHURCH_ID, personId: 10, active: true }]);
      const caller = appRouter.createCaller(createMemberContext());

      await expect(caller.schedules.update({
        id: 41, churchId: CHURCH_ID, ministryId: 7, personId: 10,
        scheduledDate: "2026-06-28", startTime: "09:30", endTime: "11:30", role: "Recepção",
      })).resolves.toMatchObject({ id: 41, status: "agendada" });

      expect(getScheduleTimeConflicts).toHaveBeenCalledWith(expect.objectContaining({ excludeScheduleItemId: 41 }));
      expect(updateScheduleItem).toHaveBeenCalledWith(expect.objectContaining({ id: 41, churchId: CHURCH_ID, role: "Recepção" }));
      expect(emitInternalNotification).toHaveBeenCalledWith(expect.objectContaining({
        churchId: CHURCH_ID,
        type: "escala_alterada",
        recipientChurchUserIds: [88],
        entityType: "schedule_item",
        entityId: 41,
      }));
    });

    it("bloqueia a edição que cria um conflito de horário e mantém a Escala existente", async () => {
      const { getScheduleItemById, getScheduleTimeConflicts, updateScheduleItem } = await import("./db");
      (getScheduleItemById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 41, churchId: CHURCH_ID, ministryId: 7, personId: 10,
        scheduledDate: new Date("2026-06-28T12:00:00.000Z"), startTime: "09:00", endTime: "11:00", status: "agendada",
      });
      (getScheduleTimeConflicts as ReturnType<typeof vi.fn>).mockResolvedValueOnce([{ id: 99, churchId: CHURCH_ID }]);
      const caller = appRouter.createCaller(createMemberContext());

      await expect(caller.schedules.update({
        id: 41, churchId: CHURCH_ID, ministryId: 7, personId: 10,
        scheduledDate: "2026-06-28", startTime: "09:30", endTime: "11:30",
      })).rejects.toThrow("horário sobreposto");

      expect(updateScheduleItem).not.toHaveBeenCalled();
    });

    it("cancela uma Escala mantendo o registro e o motivo no histórico", async () => {
      const { getScheduleItemById, cancelScheduleItem, getChurchUsersByChurch } = await import("./db");
      const { emitInternalNotification } = await import("./notifications");
      (getScheduleItemById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 41, churchId: CHURCH_ID, ministryId: 7, personId: 10,
        scheduledDate: new Date("2026-06-28T12:00:00.000Z"), startTime: "09:00", endTime: "11:00", status: "agendada",
      });
      (getChurchUsersByChurch as ReturnType<typeof vi.fn>).mockResolvedValueOnce([{ id: 88, churchId: CHURCH_ID, personId: 10, active: true }]);
      const caller = appRouter.createCaller(createMemberContext());

      await expect(caller.schedules.cancel({ id: 41, churchId: CHURCH_ID, reason: "Voluntário indisponível" })).resolves.toMatchObject({ id: 41, status: "cancelada" });

      expect(cancelScheduleItem).toHaveBeenCalledWith(expect.objectContaining({ id: 41, churchId: CHURCH_ID, cancelledByChurchUserId: 1, cancelReason: "Voluntário indisponível" }));
      expect(emitInternalNotification).toHaveBeenCalledWith(expect.objectContaining({
        churchId: CHURCH_ID,
        type: "escala_cancelada",
        recipientChurchUserIds: [88],
        entityType: "schedule_item",
        entityId: 41,
      }));
    });

    it("impede membro comum de editar ou cancelar uma Escala sem responsabilidade ministerial", async () => {
      const { getScheduleItemById, updateScheduleItem, cancelScheduleItem } = await import("./db");
      (getChurchMemberByUserId as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 12, userId: 44, churchId: CHURCH_ID, personId: 44, role: "membro", active: true,
      });
      (getScheduleItemById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 41, churchId: CHURCH_ID, ministryId: 7, personId: 10,
        scheduledDate: new Date("2026-06-28T12:00:00.000Z"), startTime: "09:00", endTime: "11:00", status: "agendada",
      });
      const caller = appRouter.createCaller(createMemberContext(44));

      await expect(caller.schedules.update({
        id: 41, churchId: CHURCH_ID, ministryId: 7, personId: 10,
        scheduledDate: "2026-06-28", startTime: "09:30", endTime: "11:30",
      })).rejects.toThrow("responsáveis por este Ministério");
      await expect(caller.schedules.cancel({ id: 41, churchId: CHURCH_ID, reason: "Voluntário indisponível" })).rejects.toThrow("responsáveis por este Ministério");

      expect(updateScheduleItem).not.toHaveBeenCalled();
      expect(cancelScheduleItem).not.toHaveBeenCalled();
    });
  });

  // ── Etapa 3: Batismo ─────────────────────────────────────────────────────────
  describe("Etapa 3 — Batismo nas Águas", () => {
    it("cria uma turma de batismo", async () => {
      const ctx = createMemberContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.batismo.createClass({
        churchId: CHURCH_ID,
        name: "Turma Batismo Junho 2026",
        date: "2026-06-29",
        location: "Tanque Batismal",
        pastor: "Pastor João",
      });

      expect(result).toEqual({ success: true });
    });

    it("inscreve a nova alma na turma de batismo", async () => {
      const ctx = createMemberContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.batismo.enroll({
        churchId: CHURCH_ID,
        baptismClassId: 1,
        personId: 1,
      });

      expect(result).toEqual({ success: true });
    });

    it("marca a conclusão do batismo", async () => {
      const ctx = createMemberContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.batismo.updateEnrollment({
        id: 1,
        churchId: CHURCH_ID,
        status: "concluiu",
        completedAt: new Date(),
      });

      expect(result).toEqual({ success: true });
    });
  });

  // ── Etapa 4: Célula ──────────────────────────────────────────────────────────
  describe("Etapa 4 — Integração em Célula", () => {
    it("cria uma nova célula para receber o membro", async () => {
      const ctx = createMemberContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.cells.create({
        churchId: CHURCH_ID,
        name: "Célula Esperança",
        leaderId: 10,
        meetingDay: "quarta",
        meetingTime: "19:30",
      });

      expect(result).toBeDefined();
      expect(result.name).toBe("Célula Esperança");
    });

    it("rejeita criação de célula sem nome", async () => {
      const ctx = createMemberContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.cells.create({
          churchId: CHURCH_ID,
          name: "X", // mínimo 2 caracteres
          leaderId: 10,
        })
      ).rejects.toThrow();
    });
  });

  // ── Etapa 5: Certificado ─────────────────────────────────────────────────────
  describe("Etapa 5 — Geração de Certificado", () => {
    it("gera certificado de batismo para membro válido da igreja", async () => {
      const ctx = createMemberContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.certificates.generate({
        type: "batismo",
        memberName: "Maria Silva",
        churchId: CHURCH_ID,
        personId: 1,
        className: "Turma Batismo Junho 2026",
        date: "2026-06-29",
      });

      expect(result).toBeDefined();
      expect(result.url).toContain("/manus-storage/");
      expect(result.fileName).toContain("batismo");
    });

    it("rejeita geração de certificado para membro de outra igreja", async () => {
      // Sobrescreve o mock do getDb para retornar pessoa não encontrada
      const { getDb } = await import("./db");
      vi.mocked(getDb).mockResolvedValueOnce({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]), // pessoa NÃO encontrada
      } as any);

      const ctx = createMemberContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.certificates.generate({
          type: "batismo",
          memberName: "Pessoa de Outra Igreja",
          churchId: CHURCH_ID,
          personId: 999, // ID de pessoa de outra igreja
        })
      ).rejects.toThrow("Pessoa não encontrada nesta igreja");
    });

    it("gera certificado de fundamentos sem validação de pessoa (sem personId)", async () => {
      const ctx = createMemberContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.certificates.generate({
        type: "fundamentos",
        memberName: "João Batista",
        churchId: CHURCH_ID,
        courseName: "Escola de Fundamentos — Módulo 1",
      });

      expect(result.url).toContain("/manus-storage/");
      expect(result.fileName).toContain("fundamentos");
    });

    it("gera certificado de líderes com dados personalizados da igreja", async () => {
      const ctx = createMemberContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.certificates.generate({
        type: "lideres",
        memberName: "Ana Souza",
        churchId: CHURCH_ID,
        className: "Escola de Líderes 2026",
        date: "2026-06-15",
      });

      expect(result.url).toContain("/manus-storage/");
      expect(result.fileName).toContain("lideres");
    });
  });

  describe("Permissões — Atribuição de conta e função", () => {
    it("lista e aprova cadastros pendentes somente pelo administrador da própria igreja", async () => {
      const pendingUser = { id: 77, churchId: CHURCH_ID, name: "Novo Discípulo", email: "novo@igreja.com", active: false, registrationStatus: "pending" };
      (getPendingChurchUsers as ReturnType<typeof vi.fn>).mockResolvedValueOnce([pendingUser]);
      const caller = appRouter.createCaller(createMemberContext());

      const pending = await caller.churchAuth.pendingRegistrations({ churchId: CHURCH_ID });
      const approved = await caller.churchAuth.resolveRegistration({ churchId: CHURCH_ID, userId: pendingUser.id, approved: true });

      expect(pending).toEqual([pendingUser]);
      expect(approved).toMatchObject({ id: pendingUser.id, active: true, registrationStatus: "approved" });
      expect(resolveChurchUserRegistration).toHaveBeenCalledWith(pendingUser.id, CHURCH_ID, 10, true, undefined);
    });

    it("permite que um Pastor vincule uma Pessoa e defina a função operacional", async () => {
      const caller = appRouter.createCaller(createMemberContext());

      const result = await caller.churchAuth.updateAssignment({
        churchId: CHURCH_ID,
        userId: 2,
        personId: 10,
        role: "lider",
      });

      expect(result).toMatchObject({ id: 2, personId: 10, role: "lider" });
      expect(updateChurchUserAssignment).toHaveBeenCalledWith(2, CHURCH_ID, { personId: 10, role: "lider" });
    });

    it("permite que um Pastor defina funções complementares sem mudar a função principal", async () => {
      const caller = appRouter.createCaller(createMemberContext());

      const result = await caller.churchAuth.updateComplementaryRoles({
        churchId: CHURCH_ID,
        userId: 2,
        roles: ["diacono", "levita"],
      });

      expect(result).toEqual({ userId: 2, roles: ["diacono", "levita"] });
      expect(setComplementaryRolesForChurchUser).toHaveBeenCalledWith(2, CHURCH_ID, ["diacono", "levita"]);
    });

    it("reúne as funções de Líder, Consolidador e Tesoureiro no mesmo login", async () => {
      (getChurchMemberByUserId as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 2,
        userId: 2,
        churchId: CHURCH_ID,
        personId: 10,
        role: "lider",
        active: true,
      });
      (getComplementaryRolesByChurchUser as ReturnType<typeof vi.fn>).mockResolvedValueOnce(["consolidador", "tesoureiro"]);
      const caller = appRouter.createCaller(createMemberContext(-2));

      const roles = await caller.churchAuth.effectiveRoles({ churchId: CHURCH_ID });

      expect(roles).toEqual(expect.arrayContaining(["lider", "consolidador", "tesoureiro"]));
      (getChurchMemberByUserId as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1,
        userId: 10,
        churchId: CHURCH_ID,
        role: "pastor_presidente",
        active: true,
      });
      (getComplementaryRolesByChurchUser as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    });
  });

  describe("App do Líder — escopo real", () => {
    it("exibe somente a Célula liderada e as Pessoas vinculadas à conta do líder", async () => {
      (getCellsByChurch as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        { id: 1, churchId: CHURCH_ID, name: "Célula Esperança", leaderId: 10, supervisorId: 20 },
        { id: 2, churchId: CHURCH_ID, name: "Célula Vida", leaderId: 30, supervisorId: 20 },
      ]);
      (getActiveMembersByCell as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        { person: { id: 10, fullName: "Líder Teste" }, membership: { id: 1, cellId: 1, personId: 10 } },
      ]);
      (getPeopleByChurch as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        { id: 10, churchId: CHURCH_ID, fullName: "Líder Teste" },
        { id: 30, churchId: CHURCH_ID, fullName: "Pessoa de outra célula" },
      ]);

      const caller = appRouter.createCaller(createMemberContext(-2));
      const overview = await caller.leader.overview({ churchId: CHURCH_ID });

      expect(overview.cells).toHaveLength(1);
      expect(overview.cells[0].name).toBe("Célula Esperança");
      expect(overview.people.map((person) => person.id)).toEqual([10]);
    });

    it("bloqueia a atualização de Consolidação fora da responsabilidade da conta", async () => {
      (canChurchUserManageJourney as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);
      const caller = appRouter.createCaller(createMemberContext(-2));

      await expect(
        caller.consolidation.updateChecklist({ id: 1, churchId: CHURCH_ID, callMade: true })
      ).rejects.toThrow("Você só pode movimentar pessoas que estão sob sua responsabilidade pastoral.");
      expect(updateConsolidation).not.toHaveBeenCalled();
    });
  });

  describe("Consolidação — fila pessoal", () => {
    it("mostra ao Consolidador somente as Novas Almas atribuídas à sua responsabilidade", async () => {
      (getActiveChurchUserById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 2,
        churchId: CHURCH_ID,
        personId: 10,
        role: "consolidador",
        active: true,
      });
      (getJourneyManagedPersonIds as ReturnType<typeof vi.fn>).mockResolvedValueOnce([10]);
      const consolidations = [
        { id: 41, churchId: CHURCH_ID, soulId: 1, consolidatorId: 10, status: "em_consolidacao" },
        { id: 42, churchId: CHURCH_ID, soulId: 2, consolidatorId: 99, status: "em_consolidacao" },
      ];
      (getConsolidationsByChurch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(consolidations)
        .mockResolvedValueOnce(consolidations);
      const souls = [
        { id: 1, churchId: CHURCH_ID, personId: 10 },
        { id: 2, churchId: CHURCH_ID, personId: 99 },
      ];
      (getSoulsByChurch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(souls)
        .mockResolvedValueOnce(souls);

      const caller = appRouter.createCaller(createMemberContext(-2));
      const queue = await caller.consolidation.list({ churchId: CHURCH_ID });
      const visibleSouls = await caller.consolidation.souls({ churchId: CHURCH_ID });

      expect(queue.map((item) => item.id)).toEqual([41]);
      expect(visibleSouls.map((soul) => soul.id)).toEqual([1]);
    });

    it("bloqueia a leitura da Consolidação por membro sem responsabilidade pastoral", async () => {
      (getChurchMemberByUserId as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 3,
        userId: 10,
        churchId: CHURCH_ID,
        role: "membro",
        personId: 10,
        active: true,
      });
      const caller = appRouter.createCaller(createMemberContext());

      await expect(caller.consolidation.list({ churchId: CHURCH_ID })).rejects.toThrow("Consolidação é restrita");
    });
  });

  describe("Consolidação — encaminhamento de resgate", () => {
    it("permite que a liderança encaminhe uma Pessoa da sua responsabilidade com motivo", async () => {
      const { createConsolidationReferral } = await import("./db");
      const caller = appRouter.createCaller(createMemberContext(-2));

      await caller.consolidation.createReferral({
        churchId: CHURCH_ID,
        personId: 1,
        reason: "Faltou às últimas reuniões e não responde",
        notes: "Líder tentou contato por WhatsApp.",
      });

      expect(createConsolidationReferral).toHaveBeenCalledWith(expect.objectContaining({
        churchId: CHURCH_ID,
        personId: 1,
        referredByPersonId: 10,
        status: "pendente",
        careDueAt: expect.any(Date),
      }));
    });

    it("permite que o Consolidador responsável ajuste um prazo futuro de cuidado", async () => {
      (getActiveChurchUserById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 2, churchId: CHURCH_ID, personId: 10, role: "consolidador", active: true });
      vi.mocked(getConsolidationReferralById).mockResolvedValueOnce({ id: 51, churchId: CHURCH_ID, acceptedByPersonId: 10, status: "aceito" } as any);
      const caller = appRouter.createCaller(createMemberContext(-2));
      const careDueAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

      await caller.consolidation.updateReferralCareDue({ churchId: CHURCH_ID, id: 51, careDueAt });

      expect(updateConsolidationReferral).toHaveBeenCalledWith(51, CHURCH_ID, expect.objectContaining({ careDueAt: expect.any(Date) }));
    });

    it("bloqueia ajuste de prazo por Consolidador sem responsabilidade no caso", async () => {
      (getActiveChurchUserById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 2, churchId: CHURCH_ID, personId: 10, role: "consolidador", active: true });
      vi.mocked(getConsolidationReferralById).mockResolvedValueOnce({ id: 51, churchId: CHURCH_ID, acceptedByPersonId: 99, status: "aceito" } as any);
      const caller = appRouter.createCaller(createMemberContext(-2));
      const careDueAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

      await expect(caller.consolidation.updateReferralCareDue({ churchId: CHURCH_ID, id: 51, careDueAt })).rejects.toThrow("Somente o Consolidador responsável");
    });

    it("permite que um Consolidador assuma o encaminhamento e registre o cuidado", async () => {
      const { getConsolidationReferralById, setCurrentCareAssignment, updateConsolidationReferral } = await import("./db");
      (getActiveChurchUserById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 2, churchId: CHURCH_ID, personId: 10, role: "consolidador", active: true });
      vi.mocked(getConsolidationReferralById).mockResolvedValueOnce({
        id: 51,
        churchId: CHURCH_ID,
        personId: 1,
        referredByPersonId: 20,
        preferredConsolidatorId: null,
        status: "pendente",
      } as any);
      const caller = appRouter.createCaller(createMemberContext(-2));

      await caller.consolidation.acceptReferral({ churchId: CHURCH_ID, id: 51 });

      expect(setCurrentCareAssignment).toHaveBeenCalledWith(expect.objectContaining({
        personId: 1,
        responsiblePersonId: 10,
        role: "consolidador",
      }));
      expect(updateConsolidationReferral).toHaveBeenCalledWith(51, CHURCH_ID, expect.objectContaining({
        status: "aceito",
        acceptedByPersonId: 10,
      }));
    });

    it("bloqueia o primeiro contato por Consolidador que não assumiu o encaminhamento", async () => {
      const { getConsolidationReferralById } = await import("./db");
      (getActiveChurchUserById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 2, churchId: CHURCH_ID, personId: 10, role: "consolidador", active: true });
      vi.mocked(getConsolidationReferralById).mockResolvedValueOnce({
        id: 51,
        churchId: CHURCH_ID,
        acceptedByPersonId: 99,
        status: "aceito",
      } as any);
      const caller = appRouter.createCaller(createMemberContext(-2));

      await expect(caller.consolidation.registerReferralContact({ churchId: CHURCH_ID, id: 51 })).rejects.toThrow("Somente o Consolidador responsável");
    });

    it("preserva o resultado ao encerrar o acompanhamento assumido", async () => {
      const { getConsolidationReferralById, updateConsolidationReferral } = await import("./db");
      (getActiveChurchUserById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 2, churchId: CHURCH_ID, personId: 10, role: "consolidador", active: true });
      vi.mocked(getConsolidationReferralById).mockResolvedValueOnce({
        id: 51,
        churchId: CHURCH_ID,
        acceptedByPersonId: 10,
        status: "em_acompanhamento",
      } as any);
      const caller = appRouter.createCaller(createMemberContext(-2));

      await caller.consolidation.closeReferral({ churchId: CHURCH_ID, id: 51, closeNotes: "Contato retomado e retorno combinado com o Líder." });

      expect(updateConsolidationReferral).toHaveBeenCalledWith(51, CHURCH_ID, expect.objectContaining({
        status: "encerrado",
        closeNotes: "Contato retomado e retorno combinado com o Líder.",
      }));
    });

    it("expõe o contato apenas depois que o Consolidador assume o encaminhamento", async () => {
      const { getConsolidationReferralsByChurch, getPeopleByChurch } = await import("./db");
      (getActiveChurchUserById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 2, churchId: CHURCH_ID, personId: 10, role: "consolidador", active: true });
      vi.mocked(getConsolidationReferralsByChurch).mockResolvedValueOnce([
        { id: 51, churchId: CHURCH_ID, personId: 1, referredByPersonId: 20, preferredConsolidatorId: 10, acceptedByPersonId: null, status: "pendente" },
        { id: 52, churchId: CHURCH_ID, personId: 1, referredByPersonId: 20, preferredConsolidatorId: 10, acceptedByPersonId: 10, status: "aceito" },
      ] as any);
      vi.mocked(getPeopleByChurch).mockResolvedValueOnce([
        { id: 1, churchId: CHURCH_ID, fullName: "Discípulo Teste", phone: "11999990000", whatsapp: "11999990000" },
        { id: 10, churchId: CHURCH_ID, fullName: "Consolidador Teste" },
        { id: 20, churchId: CHURCH_ID, fullName: "Líder Teste" },
      ] as any);
      const caller = appRouter.createCaller(createMemberContext(-2));

      const referrals = await caller.consolidation.referrals({ churchId: CHURCH_ID });

      expect(referrals.find((item) => item.id === 51)?.contactNumber).toBeNull();
      expect(referrals.find((item) => item.id === 52)?.contactNumber).toBe("11999990000");
    });

    it("registra contato, próxima ação e solicitação de visita somente para o Consolidador responsável", async () => {
      (getActiveChurchUserById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 2, churchId: CHURCH_ID, personId: 10, role: "consolidador", active: true });
      vi.mocked(getConsolidationReferralById).mockResolvedValueOnce({
        id: 51,
        churchId: CHURCH_ID,
        personId: 1,
        acceptedByPersonId: 10,
        firstContactAt: null,
        status: "aceito",
      } as any);
      const caller = appRouter.createCaller(createMemberContext(-2));

      await caller.consolidation.recordFollowUp({
        churchId: CHURCH_ID,
        referralId: 51,
        contactChannel: "whatsapp",
        outcome: "agendou_visita",
        notes: "A pessoa respondeu e pediu uma visita esta semana.",
        nextAction: "Confirmar horário da visita",
        nextActionAt: "2026-08-21T14:00:00.000Z",
        visitStatus: "solicitada",
      });

      expect(createConsolidationFollowUp).toHaveBeenCalledWith(expect.objectContaining({
        churchId: CHURCH_ID,
        referralId: 51,
        recordedByPersonId: 10,
        contactChannel: "whatsapp",
        visitStatus: "solicitada",
      }));
      expect(updateConsolidationReferral).toHaveBeenCalledWith(51, CHURCH_ID, expect.objectContaining({
        status: "em_acompanhamento",
      }));
    });

    it("bloqueia o registro de acompanhamento por Consolidador que não assumiu o caso", async () => {
      (getActiveChurchUserById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 2, churchId: CHURCH_ID, personId: 10, role: "consolidador", active: true });
      vi.mocked(getConsolidationReferralById).mockResolvedValueOnce({ id: 51, churchId: CHURCH_ID, personId: 1, acceptedByPersonId: 99, status: "aceito" } as any);
      const caller = appRouter.createCaller(createMemberContext(-2));

      await expect(caller.consolidation.recordFollowUp({
        churchId: CHURCH_ID,
        referralId: 51,
        contactChannel: "ligacao",
        outcome: "sem_resposta",
        notes: "Tentativa de ligação sem retorno.",
        visitStatus: "nao_necessaria",
      })).rejects.toThrow("Somente o Consolidador responsável");
    });
  });

  describe("Central de Cuidado — fila pessoal", () => {
    it("mostra ao líder somente pendências da sua carteira de cuidado", async () => {
      (getCareAttentionByChurch as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        {
          person: { id: 10, fullName: "Ana sob cuidado" },
          careAssignment: { responsiblePersonId: 10, role: "consolidador" },
          consolidation: null,
          cell: null,
          nextStep: "Iniciar consolidação",
          priority: "alta",
          reasons: ["Consolidação não iniciada"],
        },
        {
          person: { id: 11, fullName: "Pessoa de outro responsável" },
          careAssignment: { responsiblePersonId: 99, role: "consolidador" },
          consolidation: null,
          cell: null,
          nextStep: "Iniciar consolidação",
          priority: "alta",
          reasons: ["Consolidação não iniciada"],
        },
      ]);

      const caller = appRouter.createCaller(createMemberContext(-2));
      const queue = await caller.care.myQueue({ churchId: CHURCH_ID });

      expect(queue).toHaveLength(1);
      expect(queue[0].person.fullName).toBe("Ana sob cuidado");
    });

    it("permite registrar primeiro contato apenas para pessoa no escopo pastoral", async () => {
      (getCareAttentionByChurch as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        {
          person: { id: 10, fullName: "Ana" },
          careAssignment: { responsiblePersonId: 10, role: "consolidador" },
          consolidation: { id: 31, soulId: 1 },
          cell: null,
          nextStep: "Registrar primeiro contato",
          priority: "alta",
          reasons: ["Sem primeiro contato registrado"],
        },
      ]);

      const caller = appRouter.createCaller(createMemberContext(-2));
      await caller.care.registerFirstContact({ churchId: CHURCH_ID, personId: 10 });

      expect(updateConsolidation).toHaveBeenCalledWith(31, CHURCH_ID, expect.objectContaining({ callMade: true }));
    });

    it("bloqueia a troca de responsável fora do escopo pastoral", async () => {
      (canChurchUserManageJourney as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);
      const caller = appRouter.createCaller(createMemberContext(-2));

      await expect(
        caller.care.assign({ churchId: CHURCH_ID, personId: 10, responsiblePersonId: 11, role: "consolidador" })
      ).rejects.toThrow("sob sua responsabilidade pastoral");
    });

    it("reflete uma visita solicitada na fila de cuidado com o histórico do encaminhamento", async () => {
      (getConsolidationFollowUpsByChurch as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        {
          id: 91,
          churchId: CHURCH_ID,
          referralId: 51,
          visitStatus: "solicitada",
          notes: "A família pediu uma visita nesta semana.",
          nextAction: "Confirmar horário com a família",
          nextActionAt: new Date("2026-08-22T14:00:00.000Z"),
          createdAt: new Date("2026-08-20T12:00:00.000Z"),
        },
      ]);
      (getConsolidationReferralsByChurch as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        { id: 51, churchId: CHURCH_ID, personId: 1, referredByPersonId: 10, acceptedByPersonId: 10, reason: "Ausência recorrente na Célula", status: "em_acompanhamento" },
      ]);
      (getPeopleByChurch as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        { id: 1, churchId: CHURCH_ID, fullName: "Discípulo Teste", phone: "11999990000", whatsapp: "11999990000" },
      ]);
      const caller = appRouter.createCaller(createMemberContext());

      const visits = await caller.care.visits({ churchId: CHURCH_ID });

      expect(visits).toHaveLength(1);
      expect(visits[0]).toEqual(expect.objectContaining({
        referralId: 51,
        personName: "Discípulo Teste",
        visitStatus: "solicitada",
        nextAction: "Confirmar horário com a família",
      }));
    });
  });

  // ── Segurança: Acesso negado a igreja diferente ──────────────────────────────
  describe("Segurança — isolamento e escopo pastoral", () => {
    it("bloqueia acesso a igreja diferente da do usuário", async () => {
      // Sobrescreve o mock para simular usuário sem acesso à igreja 999
      const { getChurchMemberByUserId } = await import("./db");
      vi.mocked(getChurchMemberByUserId).mockResolvedValueOnce(null);

      const ctx = createMemberContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.souls.list({ churchId: 999 })
      ).rejects.toThrow("Acesso negado a esta igreja");
    });

    it("permite acesso à própria igreja do usuário", async () => {
      const ctx = createMemberContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.souls.list({ churchId: CHURCH_ID });

      expect(Array.isArray(result)).toBe(true);
    });

    it("bloqueia a leitura de configuração de uma igreja que não pertence à sessão", async () => {
      (getChurchMemberByUserId as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
      const caller = appRouter.createCaller(createMemberContext());

      await expect(caller.churches.getById({ id: 999 })).rejects.toThrow("Acesso negado a esta igreja");
    });

    it("bloqueia o histórico de cuidado fora do escopo pastoral", async () => {
      (canChurchUserManageJourney as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);
      const caller = appRouter.createCaller(createMemberContext(-2));

      await expect(caller.care.history({ churchId: CHURCH_ID, personId: 99 })).rejects.toThrow("sob sua responsabilidade pastoral");
    });

    it("bloqueia a criação de Célula por membro sem responsabilidade de liderança", async () => {
      (getChurchMemberByUserId as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 3,
        userId: 10,
        churchId: CHURCH_ID,
        role: "membro",
        personId: 10,
        active: true,
      });
      const caller = appRouter.createCaller(createMemberContext());

      await expect(
        caller.cells.create({ churchId: CHURCH_ID, name: "Célula sem autorização", leaderId: 11 })
      ).rejects.toThrow("Somente Pastores, Supervisores ou o próprio Líder");
    });

    it("bloqueia um Supervisor de ler notas de aconselhamento que não são suas", async () => {
      (getChurchMemberByUserId as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 4,
        userId: 10,
        churchId: CHURCH_ID,
        role: "supervisor",
        personId: 10,
        active: true,
      });
      (getCounselingSessionById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 20,
        churchId: CHURCH_ID,
        counselorId: 99,
      });
      const caller = appRouter.createCaller(createMemberContext());

      await expect(caller.aconselhamento.getNotes({ churchId: CHURCH_ID, sessionId: 20 })).rejects.toThrow("sob sua responsabilidade");
    });
  });

  describe("Eventos — relatório de presença", () => {
    it("consulta inscritos, check-ins e ausentes somente dentro do tenant administrativo", async () => {
      const caller = appRouter.createCaller(createMemberContext());
      const report = await caller.events.attendanceReport({ churchId: CHURCH_ID, eventId: 31 });
      expect(report.summary).toEqual({ registeredCount: 3, checkedInCount: 2, absentCount: 1, cancelledCount: 0 });
      expect(getEventAttendanceReport).toHaveBeenCalledWith({ churchId: CHURCH_ID, eventId: 31 });
    });
  });

  describe("Tesouraria — segurança e cálculos", () => {
    const validEntry = {
      churchId: CHURCH_ID,
      accountId: 91,
      categoryId: 81,
      type: "entrada" as const,
      amountCents: 125000,
      transactionDate: "2026-08-18",
      paymentMethod: "pix" as const,
      description: "Dízimos do culto",
      status: "confirmado" as const,
    };

    it("entrega o resumo apenas ao perfil com permissão de Tesouraria", async () => {
      const caller = appRouter.createCaller(createMemberContext());
      await caller.treasury.overview({ churchId: CHURCH_ID, startDate: "2026-08-01", endDate: "2026-08-31" });
      expect(getTreasuryOverview).toHaveBeenCalledWith({ churchId: CHURCH_ID, startDate: "2026-08-01", endDate: "2026-08-31" });
    });

    it("permite que a função complementar de Tesoureiro acesse a Tesouraria", async () => {
      (getActiveChurchUserById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 2, churchId: CHURCH_ID, personId: 10, role: "lider", active: true });
      (getComplementaryRolesByChurchUser as ReturnType<typeof vi.fn>).mockResolvedValueOnce(["tesoureiro"]);
      const caller = appRouter.createCaller(createMemberContext(-2));
      await expect(caller.treasury.accounts({ churchId: CHURCH_ID })).resolves.toHaveLength(1);
    });

    it("bloqueia um membro comum de consultar dados financeiros", async () => {
      (getChurchMemberByUserId as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 1, userId: 10, churchId: CHURCH_ID, role: "membro", active: true });
      const caller = appRouter.createCaller(createMemberContext());
      await expect(caller.treasury.overview({ churchId: CHURCH_ID, startDate: "2026-08-01", endDate: "2026-08-31" })).rejects.toThrow("Tesouraria é restrita");
    });

    it("rejeita lançamento com conta de outra igreja", async () => {
      (getFinancialAccountById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
      const caller = appRouter.createCaller(createMemberContext());
      await expect(caller.treasury.createTransaction(validEntry)).rejects.toThrow("Conta ou categoria financeira não encontrada");
      expect(createFinancialTransaction).not.toHaveBeenCalled();
    });

    it("rejeita categoria de natureza diferente do lançamento", async () => {
      (getFinancialCategoryById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 81, churchId: CHURCH_ID, type: "saida", key: "aluguel", name: "Aluguel", active: true });
      const caller = appRouter.createCaller(createMemberContext());
      await expect(caller.treasury.createTransaction(validEntry)).rejects.toThrow("mesmo tipo do lançamento");
    });

    it("registra valores em centavos e associa o lançamento ao usuário de igreja", async () => {
      const caller = appRouter.createCaller(createMemberContext());
      await caller.treasury.createTransaction(validEntry);
      expect(createFinancialTransaction).toHaveBeenCalledWith(expect.objectContaining({ amountCents: 125000, actorChurchUserId: 1, churchId: CHURCH_ID }));
    });

    it("impede que Tesoureiro estorne lançamento confirmado sem supervisão pastoral", async () => {
      (getChurchMemberByUserId as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 1, userId: 10, churchId: CHURCH_ID, role: "tesoureiro", active: true });
      const caller = appRouter.createCaller(createMemberContext());
      await expect(caller.treasury.reverseTransaction({ churchId: CHURCH_ID, id: 71, reason: "Registro duplicado" })).rejects.toThrow("Somente Pastores podem estornar");
    });

    it("permite fechar novamente um período que foi reaberto", async () => {
      (getFinancialPeriodClosure as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 5, churchId: CHURCH_ID, periodStart: new Date("2026-08-01"), status: "reaberto" });
      const caller = appRouter.createCaller(createMemberContext());
      await caller.treasury.closePeriod({ churchId: CHURCH_ID, periodStart: "2026-08-01", periodEnd: "2026-08-31" });
      expect(closeFinancialPeriod).toHaveBeenCalledWith(expect.objectContaining({ churchId: CHURCH_ID, periodStart: "2026-08-01", periodEnd: "2026-08-31", actorChurchUserId: 1 }));
    });

    it("emite recibo somente para uma entrada confirmada da mesma igreja", async () => {
      const caller = appRouter.createCaller(createMemberContext());
      const receipt = await caller.treasury.receipt({ churchId: CHURCH_ID, id: 71 });
      expect(receipt).toMatchObject({ transaction: { id: 71, type: "entrada", status: "confirmado" }, category: { name: "Dízimo" } });
      expect(getFinancialReceiptData).toHaveBeenCalledWith(71, CHURCH_ID);
    });

    it("calcula a divergência com o saldo do livro antes de salvar a conciliação", async () => {
      (getFinancialAccountById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 91, churchId: CHURCH_ID, name: "Banco", type: "banco", active: true });
      (getBookBalanceAt as ReturnType<typeof vi.fn>).mockResolvedValueOnce(125000);
      const caller = appRouter.createCaller(createMemberContext());
      await caller.treasury.saveReconciliation({ churchId: CHURCH_ID, accountId: 91, periodStart: "2026-08-01", periodEnd: "2026-08-31", bankClosingBalanceCents: 120000, notes: "Tarifa pendente" });
      expect(saveFinancialReconciliation).toHaveBeenCalledWith(expect.objectContaining({ churchId: CHURCH_ID, accountId: 91, bookBalanceCents: 125000, differenceCents: -5000, status: "com_divergencia", actorChurchUserId: 1 }));
    });

    it("lista comprovantes somente da conciliação pertencente à igreja autenticada", async () => {
      const caller = appRouter.createCaller(createMemberContext());
      const attachments = await caller.treasury.reconciliationAttachments({ churchId: CHURCH_ID, reconciliationId: 4 });
      expect(attachments).toHaveLength(1);
      expect(getFinancialReconciliationById).toHaveBeenCalledWith(4, CHURCH_ID);
      expect(getFinancialReconciliationAttachments).toHaveBeenCalledWith(4, CHURCH_ID);
    });

    it("remove somente o vínculo do comprovante dentro da conciliação e igreja autenticadas", async () => {
      const caller = appRouter.createCaller(createMemberContext());
      await expect(caller.treasury.removeReconciliationAttachment({ churchId: CHURCH_ID, reconciliationId: 4, attachmentId: 9 })).resolves.toEqual({ success: true });
      expect(removeFinancialReconciliationAttachment).toHaveBeenCalledWith({ id: 9, reconciliationId: 4, churchId: CHURCH_ID });
    });

    it("rejeita uma data inexistente no calendário", async () => {
      const caller = appRouter.createCaller(createMemberContext());
      await expect(caller.treasury.overview({ churchId: CHURCH_ID, startDate: "2026-02-30", endDate: "2026-02-28" })).rejects.toThrow("calendário");
    });

    it("rejeita um intervalo financeiro invertido", async () => {
      const caller = appRouter.createCaller(createMemberContext());
      await expect(caller.treasury.overview({ churchId: CHURCH_ID, startDate: "2026-09-01", endDate: "2026-08-31" })).rejects.toThrow("posterior ou igual");
    });

    it("rejeita filtro de conta que não pertence à igreja", async () => {
      (getTreasuryOverview as ReturnType<typeof vi.fn>).mockClear();
      (getFinancialAccountById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
      const caller = appRouter.createCaller(createMemberContext());
      await expect(caller.treasury.overview({ churchId: CHURCH_ID, startDate: "2026-08-01", endDate: "2026-08-31", accountId: 999 })).rejects.toThrow("Conta financeira não encontrada");
      expect(getTreasuryOverview).not.toHaveBeenCalled();
    });

    it("rejeita valor acima do limite inteiro persistido", async () => {
      const caller = appRouter.createCaller(createMemberContext());
      await expect(caller.treasury.createTransaction({ ...validEntry, amountCents: 2_147_483_648 })).rejects.toThrow("limite permitido");
    });

    it("traduz conflito de conta duplicada para uma mensagem segura", async () => {
      (createFinancialAccount as ReturnType<typeof vi.fn>).mockRejectedValueOnce(Object.assign(new Error("duplicate"), { code: "ER_DUP_ENTRY" }));
      const caller = appRouter.createCaller(createMemberContext());
      await expect(caller.treasury.createAccount({ churchId: CHURCH_ID, name: "Caixa", type: "caixa", openingBalanceCents: 0 })).rejects.toThrow("Já existe uma conta financeira");
    });

    it("traduz conflito de categoria duplicada para uma mensagem segura", async () => {
      (createFinancialCategory as ReturnType<typeof vi.fn>).mockRejectedValueOnce(Object.assign(new Error("duplicate"), { code: "ER_DUP_ENTRY" }));
      const caller = appRouter.createCaller(createMemberContext());
      await expect(caller.treasury.createCategory({ churchId: CHURCH_ID, name: "Oferta especial", type: "entrada" })).rejects.toThrow("Já existe uma categoria equivalente");
    });
  });

  describe("Funções ministeriais e Visitas", () => {
    it("atribui uma função de Visitador à Pessoa dentro do Ministério de Consolidação", async () => {
      const caller = appRouter.createCaller(createMemberContext());
      await caller.ministries.assignFunction({ churchId: CHURCH_ID, personId: 10, ministryId: 7, roleKey: "visitador" });
      expect(assignMinistryRole).toHaveBeenCalledWith(expect.objectContaining({ churchId: CHURCH_ID, personId: 10, ministryId: 7, roleKey: "visitador" }));
      expect(getMinistriesByChurch).toHaveBeenCalledWith(CHURCH_ID);
    });

    it("permite ao Visitador ver somente a visita atribuída à sua função", async () => {
      (getActiveChurchUserById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 2, churchId: CHURCH_ID, personId: 10, role: "membro", active: true });
      (getActiveMinistryRoleKeysByPerson as ReturnType<typeof vi.fn>).mockResolvedValueOnce(["visitador"]);
      (getConsolidationFollowUpsByChurch as ReturnType<typeof vi.fn>).mockResolvedValueOnce([{ id: 301, churchId: CHURCH_ID, referralId: 51, recordedByPersonId: 12, visitStatus: "agendada", visitAssigneePersonId: 10, visitScheduledAt: new Date("2026-08-25T19:00:00Z"), notes: "Visita de acolhimento", createdAt: new Date("2026-08-20T12:00:00Z") }]);
      (getConsolidationReferralsByChurch as ReturnType<typeof vi.fn>).mockResolvedValueOnce([{ id: 51, churchId: CHURCH_ID, personId: 1, acceptedByPersonId: 12, reason: "Ausência recorrente" }]);
      (getPeopleByChurch as ReturnType<typeof vi.fn>).mockResolvedValueOnce([{ id: 1, churchId: CHURCH_ID, fullName: "Pessoa Visitada", phone: "11999999999", street: "Rua da Paz", number: "20", neighborhood: "Centro", city: "São Paulo", state: "SP" }, { id: 10, churchId: CHURCH_ID, fullName: "Visitador" }, { id: 12, churchId: CHURCH_ID, fullName: "Consolidador" }]);
      const caller = appRouter.createCaller(createMemberContext(-2));
      const visits = await caller.consolidation.visits({ churchId: CHURCH_ID });
      expect(visits).toHaveLength(1);
      expect(visits[0]).toMatchObject({ personName: "Pessoa Visitada", assignedToName: "Visitador", status: "agendada" });
    });
  });

  describe("Escola de Fundamentos — estudos e administradores", () => {
    it("permite que o Pastor crie um estudo na turma da própria igreja", async () => {
      const { createFoundationStudy } = await import("./db");
      const caller = appRouter.createCaller(createMemberContext());

      await expect(caller.escolaFundamentos.createStudy({
        churchId: CHURCH_ID,
        courseId: 55,
        title: "A graça e a salvação",
        summary: "Compreender a salvação pela graça.",
        content: "Efésios 2:8-9",
      })).resolves.toEqual({ success: true, studyId: 90 });

      expect(createFoundationStudy).toHaveBeenCalledWith(expect.objectContaining({
        churchId: CHURCH_ID,
        courseId: 55,
        createdByChurchUserId: 1,
      }));
    });

    it("permite que o Pastor crie um módulo para organizar a trilha da própria turma", async () => {
      const { createFoundationModule } = await import("./db");
      const caller = appRouter.createCaller(createMemberContext());

      await expect(caller.escolaFundamentos.createModule({ churchId: CHURCH_ID, courseId: 55, title: "Alicerces da fé" })).resolves.toEqual({ success: true, moduleId: 71 });
      expect(createFoundationModule).toHaveBeenCalledWith(expect.objectContaining({ churchId: CHURCH_ID, courseId: 55, createdByChurchUserId: 1 }));
    });

    it("bloqueia a associação de um estudo a módulo de outra turma", async () => {
      const { getFoundationModuleById, createFoundationStudy } = await import("./db");
      (getFoundationModuleById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 72, churchId: CHURCH_ID, courseId: 999, title: "Outra turma" });
      const caller = appRouter.createCaller(createMemberContext());

      await expect(caller.escolaFundamentos.createStudy({ churchId: CHURCH_ID, courseId: 55, moduleId: 72, title: "Estudo inválido" })).rejects.toThrow("Módulo não encontrado nesta turma");
      expect(createFoundationStudy).not.toHaveBeenCalled();
    });

    it("permite que uma conta designada pelo Pastor gerencie estudos", async () => {
      const { getActiveChurchUserById, isFoundationStudyAdministrator, createFoundationStudy } = await import("./db");
      (getActiveChurchUserById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 88, churchId: CHURCH_ID, personId: 20, role: "membro", active: true });
      (isFoundationStudyAdministrator as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);
      const caller = appRouter.createCaller(createMemberContext(-88));

      await expect(caller.escolaFundamentos.createStudy({ churchId: CHURCH_ID, courseId: 55, title: "Vida de oração" })).resolves.toEqual({ success: true, studyId: 90 });
      expect(createFoundationStudy).toHaveBeenCalledWith(expect.objectContaining({ createdByChurchUserId: 88 }));
    });

    it("bloqueia a criação de estudos por membro não designado", async () => {
      const { getChurchMemberByUserId, createFoundationStudy } = await import("./db");
      (getChurchMemberByUserId as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 3, userId: 10, churchId: CHURCH_ID, role: "membro", active: true });
      const caller = appRouter.createCaller(createMemberContext());

      await expect(caller.escolaFundamentos.createStudy({ churchId: CHURCH_ID, courseId: 55, title: "Estudo sem autorização" })).rejects.toThrow("gestão de estudos é restrita");
      expect(createFoundationStudy).not.toHaveBeenCalled();
    });

    it("mantém a definição de administradores restrita ao Pastor", async () => {
      const { getChurchMemberByUserId, assignFoundationStudyAdministrator } = await import("./db");
      (getChurchMemberByUserId as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 4, userId: 10, churchId: CHURCH_ID, role: "secretario", active: true });
      const caller = appRouter.createCaller(createMemberContext());

      await expect(caller.escolaFundamentos.assignStudyAdministrator({ churchId: CHURCH_ID, churchUserId: 88 })).rejects.toThrow("Somente Pastores");
      expect(assignFoundationStudyAdministrator).not.toHaveBeenCalled();
    });

    it("vincula um material do acervo ao estudo sem criar cópia do arquivo", async () => {
      const { attachFoundationStudyMaterial } = await import("./db");
      const caller = appRouter.createCaller(createMemberContext());

      await expect(caller.escolaFundamentos.attachStudyMaterial({ churchId: CHURCH_ID, studyId: 90, libraryItemId: 301 })).resolves.toEqual({ success: true });
      expect(attachFoundationStudyMaterial).toHaveBeenCalledWith({ churchId: CHURCH_ID, studyId: 90, libraryItemId: 301, position: 0 });
    });

    it("bloqueia vínculo de material que não pertence à Biblioteca da igreja", async () => {
      const { getLibraryItemById, attachFoundationStudyMaterial } = await import("./db");
      (getLibraryItemById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
      const caller = appRouter.createCaller(createMemberContext());

      await expect(caller.escolaFundamentos.attachStudyMaterial({ churchId: CHURCH_ID, studyId: 90, libraryItemId: 999 })).rejects.toThrow("Material não encontrado na Biblioteca desta igreja");
      expect(attachFoundationStudyMaterial).not.toHaveBeenCalled();
    });

    it("bloqueia membro não designado de adicionar materiais a um estudo", async () => {
      const { getChurchMemberByUserId, attachFoundationStudyMaterial } = await import("./db");
      (getChurchMemberByUserId as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 3, userId: 10, churchId: CHURCH_ID, role: "membro", active: true });
      const caller = appRouter.createCaller(createMemberContext());

      await expect(caller.escolaFundamentos.attachStudyMaterial({ churchId: CHURCH_ID, studyId: 90, libraryItemId: 301 })).rejects.toThrow("gestão de estudos é restrita");
      expect(attachFoundationStudyMaterial).not.toHaveBeenCalled();
    });
  });
});
