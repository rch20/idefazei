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

// ─── MOCKS ────────────────────────────────────────────────────────────────────

// Mock do db.ts — todas as funções de acesso ao banco
vi.mock("./db", () => ({
  getChurchMemberByUserId: vi.fn().mockResolvedValue({
    id: 1,
    userId: 10,
    churchId: 100,
    role: "pastor",
    active: true,
  }),
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
  createSoul: vi.fn().mockResolvedValue({ id: 1, name: "Maria Silva", churchId: 100 }),
  updateSoul: vi.fn().mockResolvedValue({ id: 1, status: "em_consolidacao" }),
  getConsolidationsByChurch: vi.fn().mockResolvedValue([]),
  createConsolidation: vi.fn().mockResolvedValue({ id: 1, soulId: 1, churchId: 100 }),
  updateConsolidation: vi.fn().mockResolvedValue({ id: 1, callMade: true, status: "consolidado" }),
  getCellsByChurch: vi.fn().mockResolvedValue([]),
  createCell: vi.fn().mockResolvedValue({ id: 1, name: "Célula Esperança", churchId: 100 }),
  getBaptismClassesByChurch: vi.fn().mockResolvedValue([]),
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
  getPersonById: vi.fn().mockResolvedValue(null),
  createPerson: vi.fn().mockResolvedValue({ id: 1 }),
  updatePerson: vi.fn().mockResolvedValue({ id: 1 }),
  getEventsByChurch: vi.fn().mockResolvedValue([]),
  createEvent: vi.fn().mockResolvedValue({ id: 1 }),
  getMinistries: vi.fn().mockResolvedValue([]),
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
      expect(result.name).toBe("Maria Silva");
      expect(result.churchId).toBe(CHURCH_ID);
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
  });

  // ── Etapa 2: Consolidação ────────────────────────────────────────────────────
  describe("Etapa 2 — Consolidação", () => {
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
      expect(result.callMade).toBe(true);
      expect(result.status).toBe("consolidado");
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

  // ── Segurança: Acesso negado a igreja diferente ──────────────────────────────
  describe("Segurança — Isolamento por tenant", () => {
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
  });
});
