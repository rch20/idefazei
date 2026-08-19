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
import { assignPersonToCell, canChurchUserManageJourney, closeFinancialPeriod, createCellMeetingWithAttendance, createFinancialTransaction, findPossiblePeopleByIdentity, getActiveChurchUserById, getActiveMembersByCell, getCareAttentionByChurch, getCellMembersCount, getCellMeetingByDate, getCellMeetingSummaries, getCellsByChurch, getChurchMemberByUserId, getComplementaryRolesByChurchUser, getCounselingSessionById, getFinancialAccountById, getFinancialCategoryById, getFinancialPeriodClosure, getPeopleByChurch, getPersonById, getTreasuryOverview, isActiveMinistryMember, setComplementaryRolesForChurchUser, setCurrentCareAssignment, updateChurchUserAssignment, updateConsolidation, updatePerson } from "./db";

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
  linkChurchUserToPerson: vi.fn().mockResolvedValue({ id: 1, personId: 10 }),
  updateChurchUserAssignment: vi.fn().mockResolvedValue({ id: 2, personId: 10, role: "lider" }),
  getComplementaryRolesByChurchUser: vi.fn().mockResolvedValue([]),
  setComplementaryRolesForChurchUser: vi.fn().mockResolvedValue(["diacono", "levita"]),
  getEventsByChurch: vi.fn().mockResolvedValue([]),
  createEvent: vi.fn().mockResolvedValue({ id: 1 }),
  getFinancialAccountsByChurch: vi.fn().mockResolvedValue([{ id: 91, churchId: 100, name: "Caixa", type: "caixa", openingBalanceCents: 0 }]),
  getFinancialAccountById: vi.fn().mockResolvedValue({ id: 91, churchId: 100, name: "Caixa", type: "caixa", openingBalanceCents: 0, active: true }),
  getFinancialCategoriesByChurch: vi.fn().mockResolvedValue([{ id: 81, churchId: 100, type: "entrada", key: "dizimo", name: "Dízimo", active: true }]),
  getFinancialCategoryById: vi.fn().mockResolvedValue({ id: 81, churchId: 100, type: "entrada", key: "dizimo", name: "Dízimo", active: true }),
  getFinancialPeriodClosure: vi.fn().mockResolvedValue(null),
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
  getMinistryMembers: vi.fn().mockResolvedValue([]),
  getMinistryMemberCounts: vi.fn().mockResolvedValue([]),
  isActiveMinistryMember: vi.fn().mockResolvedValue(true),
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
    it("bloqueia uma escala quando a Pessoa não pertence ao Ministério", async () => {
      (isActiveMinistryMember as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);
      const caller = appRouter.createCaller(createMemberContext());

      await expect(
        caller.schedules.create({
          churchId: CHURCH_ID,
          ministryId: 7,
          personId: 10,
          scheduledDate: "2026-06-28",
          role: "Recepção",
        })
      ).rejects.toThrow("precisa ser participante ativa deste Ministério");
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
  });
});
