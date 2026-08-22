import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  loginChurchUser,
  loginSuperAdmin,
  createChurchUser,
  createSuperAdmin,
  createInitialSuperAdmin,
  isInitialSuperAdminSetupAvailable,
} from "./auth";
import {
  createAnnouncement,
  createCell,
  assignPersonToCell,
  createChurch,
  createConsolidation,
  createConsolidationReferral,
  createConsolidationFollowUp,
  createEvent,
  createPerson,
  createPrayerRequest,
  createSoul,
  findPossiblePeopleByIdentity,
  getAnnouncementsByChurch,
  getCellsByChurch,
  getCellMembersCount,
  getActiveMembersByCell,
  getCellById,
  getCellMeetingByDate,
  getCellMeetingSummaries,
  getStartupDiagnostics,
  createCellMeetingWithAttendance,
  getActiveCellMembership,
  getCellMembershipHistory,
  getChurchById,
  getChurchBySlug,
  getChurchMemberByUserId,
  getActiveChurchUserById,
  getChurchMembersByChurch,
  getChurchUsersByChurch,
  getPendingChurchUsers,
  resolveChurchUserRegistration,
  linkChurchUserToPerson,
  updateChurchUserAssignment,
  getComplementaryRolesByChurchUser,
  setComplementaryRolesForChurchUser,
  canChurchUserManageJourney,
  getJourneyManagedPersonIds,
  getNotificationsForChurchUser,
  getUnreadNotificationCount,
  markNotificationRead,
  getConsolidationsByChurch,
  getConsolidationsBySoul,
  getConsolidationById,
  getConsolidationReferralById,
  getConsolidationReferralsByChurch,
  getConsolidationFollowUpsByReferral,
  getConsolidationFollowUpsByChurch,
  getCareAttentionByChurch,
  getDashboardStats,
  getDiscipleshipFunnel,
  getDiscipleshipTree,
  getEventAttendanceReport,
  getEventsByChurch,
  createFinancialAccount,
  createFinancialCategory,
  createFinancialTransaction,
  getFinancialAccountById,
  getFinancialAccountsByChurch,
  getFinancialCategoriesByChurch,
  getFinancialCategoryById,
  getFinancialPeriodClosure,
  getFinancialReceiptData,
  getFinancialReconciliation,
  getFinancialReconciliationAttachments,
  getFinancialReconciliationById,
  getBookBalanceAt,
  getFinancialTransactionById,
  getTreasuryOverview,
  isFinancialPeriodClosed,
  updateFinancialDraft,
  confirmFinancialTransaction,
  reverseFinancialTransaction,
  removeFinancialReconciliationAttachment,
  saveFinancialReconciliation,
  closeFinancialPeriod,
  reopenFinancialPeriod,
  getMinistriesByChurch,
  getMinistryMembers,
  getMinistryMemberCounts,
  isActiveMinistryMember,
  getScheduleTimeConflicts,
  getScheduleItemById,
  updateScheduleItem,
  cancelScheduleItem,
  assignPersonToMinistry,
  assignMinistryRole,
  deactivateMinistryRole,
  getActiveMinistryRoleKeysByPerson,
  getMinistryRoleAssignmentsByPerson,
  getMinistryRoleDefinitionsByChurch,
  createMinistryRoleDefinition,
  getPeopleByChurch,
  getPersonById,
  getPrayerRequestsByChurch,
  getCareHistoryByPerson,
  getCurrentCareAssignment,
  getRadarEspiritual,
  getSoulById,
  getSoulsByChurch,
  updateChurch,
  updateConsolidation,
  updateConsolidationReferral,
  linkSoulToPerson,
  setCurrentCareAssignment,
  updatePerson,
  updateSoul,
  getAllChurches,
  getAllChurchesAdmin,
  getGlobalStats,
  getPendingRegistrations,
  updateChurchRegistration,
  createChurchRegistration,
  createVisitorLead,
  getVisitorLeadsByChurch,
  getOnboardingProgress,
  upsertOnboardingProgress,
  importPeopleFromCSV,
  // Escola de Fundamentos
  getCoursesByChurch,
  getCourseEnrollments,
  getCourseEnrollmentById,
  enrollInCourse,
  updateCourseEnrollment,
  // Batismo
  getBaptismClassesByChurch,
  getBaptismEnrollments,
  createBaptismClass,
  enrollInBaptism,
  updateBaptismEnrollment,
  // Encontro com Deus
  getEncounterEventsByChurch,
  getEncounterEnrollments,
  createEncounterEvent,
  enrollInEncounter,
  updateEncounterEnrollment,
  // Escola de Líderes
  getLeadershipClassesByChurch,
  getLeadershipEnrollments,
  createLeadershipClass,
  enrollInLeadershipSchool,
  updateLeadershipEnrollment,
  // Histórico de Liderança
  getLeadershipHistory,
  getLeadershipHistoryByPerson,
  addLeadershipHistory,
  // Aconselhamento Pastoral
  getCounselingSessionsByChurch,
  getCounselingSessionById,
  createCounselingSession,
  updateCounselingSession,
  getCounselingNotes,
  addCounselingNote,
  // Comunicação
  getCommunicationLogs,
  logCommunication,
} from "./db";
import { getDb } from "./db";
import { events } from "../drizzle/schema";
import { and, eq } from "drizzle-orm";
import { generateReportHTML, htmlToBase64 } from "./reports";
import { emitInternalNotification } from "./notifications";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

async function requireChurchMember(userId: number, churchId: number) {
  if (userId < 0) {
    const churchUser = await getActiveChurchUserById(Math.abs(userId));
    if (!churchUser || churchUser.churchId !== churchId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado a esta igreja" });
    }
    return churchUser;
  }

  const member = await getChurchMemberByUserId(userId, churchId);
if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado a esta igreja" });
	return member;
}

async function emitNotificationWithoutBlocking(data: Parameters<typeof emitInternalNotification>[0]) {
  try {
    await emitInternalNotification(data);
  } catch (error) {
    console.error("[notifications] Failed to emit internal notification:", error);
  }
}

const CHURCH_ADMIN_ROLES = new Set(["pastor_presidente", "pastor_local", "secretario"]);
const CHURCH_ROLE_MANAGER_ROLES = new Set(["pastor_presidente", "pastor_local"]);
const COUNSELING_ROLES = new Set(["pastor_presidente", "pastor_local", "supervisor"]);
const PASTORAL_ACTION_ROLES = new Set(["pastor_presidente", "pastor_local", "supervisor", "lider", "consolidador"]);
const TREASURY_ROLES = new Set(["pastor_presidente", "pastor_local", "tesoureiro"]);
const VISIT_ROLES = new Set(["pastor_presidente", "pastor_local", "supervisor", "consolidador", "visitador"]);
const MINISTRY_MANAGEMENT_ROLE_KEYS = new Set(["lider_louvor"]);

/**
 * Catálogo central: a igreja atribui uma função, nunca permissões isoladas por pessoa.
 * Novas funções podem ser acrescidas aqui sem alterar o histórico de atribuições.
 */
const MINISTRY_FUNCTION_CATALOG = [
  { key: "visitador", label: "Visitador", ministryTypes: ["consolidacao"], grants: ["visitador"] },
  { key: "lider_consolidacao", label: "Líder de Consolidação", ministryTypes: ["consolidacao"], grants: ["consolidador"] },
  { key: "supervisor_consolidacao", label: "Supervisor de Consolidação", ministryTypes: ["consolidacao"], grants: ["consolidador", "supervisor_consolidacao"] },
  { key: "lider_celula", label: "Líder de Célula", ministryTypes: ["celulas"], grants: ["lider"] },
  { key: "supervisor_celulas", label: "Supervisor de Células", ministryTypes: ["celulas"], grants: ["supervisor"] },
  { key: "musico", label: "Músico", ministryTypes: ["louvor"], grants: [] },
  { key: "vocalista", label: "Vocalista", ministryTypes: ["louvor"], grants: [] },
  { key: "lider_louvor", label: "Líder de Louvor", ministryTypes: ["louvor"], grants: ["lider_louvor"] },
  { key: "membro_ministerio", label: "Membro de Ministério", ministryTypes: ["*"], grants: [] },
] as const;

const MINISTRY_FUNCTION_GRANTS = new Map<string, readonly string[]>(MINISTRY_FUNCTION_CATALOG.map((item) => [item.key, item.grants]));
const CUSTOM_PERMISSION_PACKAGE_GRANTS: Record<string, readonly string[]> = {
  member: [],
  cell_leader: ["lider"],
  consolidator: ["consolidador"],
  visitor: ["visitador"],
  treasurer: ["tesoureiro"],
  ministry_leader: ["lider_ministerio"],
  communication_leader: ["comunicacao"],
};

const DEFAULT_REFERRAL_CARE_DUE_DAYS = 3;
const CARE_DUE_WARNING_WINDOW_MS = 48 * 60 * 60 * 1000;

function getReferralCareDueState(referral: { careDueAt?: Date | null; referredAt: Date; status: string }) {
  const careDueAt = referral.careDueAt ?? new Date(new Date(referral.referredAt).getTime() + DEFAULT_REFERRAL_CARE_DUE_DAYS * 24 * 60 * 60 * 1000);
  if (["encerrado", "cancelado"].includes(referral.status)) return { careDueAt, careDueStatus: "encerrado" as const, hoursUntilCareDue: null };
  const hoursUntilCareDue = Math.ceil((careDueAt.getTime() - Date.now()) / (60 * 60 * 1000));
  if (hoursUntilCareDue < 0) return { careDueAt, careDueStatus: "atrasado" as const, hoursUntilCareDue };
  if (careDueAt.getTime() - Date.now() <= CARE_DUE_WARNING_WINDOW_MS) return { careDueAt, careDueStatus: "proximo" as const, hoursUntilCareDue };
  return { careDueAt, careDueStatus: "em_dia" as const, hoursUntilCareDue };
}

function getMinistryFunctionCatalogFor(ministry: { type: string; name: string }) {
  const normalizedName = ministry.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const context = normalizedName.includes("consolid") ? "consolidacao"
    : normalizedName.includes("celula") ? "celulas"
    : ministry.type;
  return MINISTRY_FUNCTION_CATALOG.filter(
    (item) => (item.ministryTypes as readonly string[]).includes("*") || (item.ministryTypes as readonly string[]).includes(context)
  );
}

async function requireChurchAdministrator(userId: number, churchId: number) {
  const member = await requireChurchMember(userId, churchId);
  const roles = await getEffectiveChurchRoles(userId, churchId, member);
  if (!roles.some((role) => CHURCH_ADMIN_ROLES.has(role))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Seu perfil não tem permissão para esta ação" });
  }
  return member;
}

async function requireTreasuryAccess(userId: number, churchId: number) {
  const actor = await requireChurchMember(userId, churchId);
  const roles = await getEffectiveChurchRoles(userId, churchId, actor);
  if (!roles.some((role) => TREASURY_ROLES.has(role))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Tesouraria é restrita a Pastores e Tesoureiros autorizados." });
  }
  return {
    actor,
    roles,
    canManageStructure: roles.some((role) => ["pastor_presidente", "pastor_local"].includes(role)),
    canClosePeriod: roles.includes("pastor_presidente"),
  };
}

async function requirePastoralAction(userId: number, churchId: number) {
  const actor = await requireChurchMember(userId, churchId);
  const roles = await getEffectiveChurchRoles(userId, churchId, actor);
  if (!roles.some((role) => PASTORAL_ACTION_ROLES.has(role))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Seu perfil não tem permissão para esta ação pastoral." });
  }
  return actor;
}

async function getAccessiblePersonIds(userId: number, churchId: number) {
  const actor = await requireChurchMember(userId, churchId);
  const roles = await getEffectiveChurchRoles(userId, churchId, actor);
  const canReadFullDirectory = roles.some((role) => ["pastor_presidente", "pastor_local", "secretario"].includes(role));
  if (canReadFullDirectory) return null;
  const ids = new Set(
    await getJourneyManagedPersonIds({
      churchId,
      actorPersonId: actor.personId ?? null,
      actorRoles: roles,
    })
  );
  if (actor.personId) ids.add(actor.personId);
  return ids;
}

async function requireChurchRoleManager(userId: number, churchId: number) {
  const member = await requireChurchMember(userId, churchId);
  if (!CHURCH_ROLE_MANAGER_ROLES.has(member.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Somente Pastores podem definir funções de acesso." });
  }
  return member;
}

async function requireCounselingRole(userId: number, churchId: number) {
  const actor = await requireChurchMember(userId, churchId);
  const roles = await getEffectiveChurchRoles(userId, churchId, actor);
  if (!roles.some((role) => COUNSELING_ROLES.has(role))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Aconselhamento é restrito a Pastores e Supervisores autorizados." });
  }
  return { actor, roles, hasFullAccess: roles.some((role) => ["pastor_presidente", "pastor_local"].includes(role)) };
}

async function requireCounselingSessionAccess(userId: number, churchId: number, sessionId: number) {
  const authorization = await requireCounselingRole(userId, churchId);
  const session = await getCounselingSessionById(sessionId, churchId);
  if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Sessão de aconselhamento não encontrada." });
  if (!authorization.hasFullAccess && session.counselorId !== authorization.actor.personId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Você só pode acessar sessões sob sua responsabilidade." });
  }
  return { ...authorization, session };
}

async function requireCellManagementPermission(userId: number, churchId: number, leaderId?: number) {
  const actor = await requireChurchMember(userId, churchId);
  const roles = await getEffectiveChurchRoles(userId, churchId, actor);
  const canManageAll = roles.some((role) => ["pastor_presidente", "pastor_local", "supervisor"].includes(role));
  const canCreateOwnCell = roles.includes("lider") && actor.personId !== null && actor.personId !== undefined && leaderId === actor.personId;
  if (!canManageAll && !canCreateOwnCell) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Somente Pastores, Supervisores ou o próprio Líder podem estruturar uma Célula." });
  }
  return { actor, roles, canManageAll };
}

/**
 * Protege participantes e Escalas: a autoridade precisa ser administrativa ou
 * pertencer especificamente ao Ministério que sofrerá a alteração.
 */
async function requireMinistryManagementPermission(userId: number, churchId: number, ministryId: number) {
  const actor = await requireChurchMember(userId, churchId);
  const roles = await getEffectiveChurchRoles(userId, churchId, actor);
  const ministry = (await getMinistriesByChurch(churchId)).find((item) => item.id === ministryId);
  if (!ministry) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Ministério não encontrado nesta igreja." });
  }

  const canManageAll = roles.some((role) => CHURCH_ADMIN_ROLES.has(role));
  const isNamedLeader = Boolean(actor.personId && ministry.leaderId === actor.personId);
  let hasMinistryLeadershipAssignment = false;

  if (!canManageAll && !isNamedLeader && actor.personId) {
    const [assignments, definitions] = await Promise.all([
      getMinistryRoleAssignmentsByPerson(actor.personId, churchId),
      getMinistryRoleDefinitionsByChurch(churchId),
    ]);
    const definitionByKey = new Map(definitions.map((definition) => [definition.key, definition]));
    hasMinistryLeadershipAssignment = assignments.some(({ assignment }) =>
      assignment.ministryId === ministryId && (
        MINISTRY_MANAGEMENT_ROLE_KEYS.has(assignment.roleKey)
        || definitionByKey.get(assignment.roleKey)?.permissionPackage === "ministry_leader"
      )
    );
  }

  if (!canManageAll && !isNamedLeader && !hasMinistryLeadershipAssignment) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Somente Pastores, Secretários ou responsáveis por este Ministério podem gerenciar participantes e Escalas.",
    });
  }

  return { actor, roles, ministry, canManageAll };
}

async function getEffectiveChurchRoles(userId: number, churchId: number, actor: { role: string; personId?: number | null }) {
  if (userId >= 0) return [actor.role];
  const complementary = await getComplementaryRolesByChurchUser(Math.abs(userId), churchId);
  const ministryRoleKeys = actor.personId ? await getActiveMinistryRoleKeysByPerson(actor.personId, churchId) : [];
  const customDefinitions = await getMinistryRoleDefinitionsByChurch(churchId);
  const customGrants = new Map(customDefinitions.map((definition) => [definition.key, CUSTOM_PERMISSION_PACKAGE_GRANTS[definition.permissionPackage] ?? []]));
  const ministryGrants = ministryRoleKeys.flatMap((key) => MINISTRY_FUNCTION_GRANTS.get(key) ?? customGrants.get(key) ?? []);
  return Array.from(new Set([actor.role, ...complementary, ...ministryGrants]));
}

async function requireJourneyStagePermission(userId: number, churchId: number, targetPersonId: number) {
  const actor = await requireChurchMember(userId, churchId);
  const actorRoles = await getEffectiveChurchRoles(userId, churchId, actor);
  const allowed = await canChurchUserManageJourney({
    churchId,
    actorPersonId: actor.personId ?? null,
    actorRoles,
    targetPersonId,
  });
  if (!allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Você só pode movimentar pessoas que estão sob sua responsabilidade pastoral.",
    });
  }
  return actor;
}

async function getCellMeetingAuthorization(userId: number, churchId: number, cellId: number) {
  const actor = await requireChurchMember(userId, churchId);
  const cell = await getCellById(cellId, churchId);
  if (!cell || !cell.active) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Célula não encontrada." });
  }
  const actorRoles = await getEffectiveChurchRoles(userId, churchId, actor);
  const hasPastoralOversight = actorRoles.some((role) => ["pastor_presidente", "pastor_local"].includes(role));
  const isCellResponsible = Boolean(
    actor.personId && (cell.leaderId === actor.personId || cell.supervisorId === actor.personId)
  );
  return { cell, canRecord: hasPastoralOversight || isCellResponsible };
}

async function requireCellMeetingAuthorization(userId: number, churchId: number, cellId: number) {
  const authorization = await getCellMeetingAuthorization(userId, churchId, cellId);
  if (!authorization.canRecord) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Somente o líder, supervisor ou pastor responsável por esta Célula pode registrar o encontro.",
    });
  }
  return authorization.cell;
}

// ─── ROUTERS ──────────────────────────────────────────────────────────────────

const churchRouter = router({
  list: publicProcedure.query(async () => {
    const churches = await getAllChurches();
    return churches.map(({ id, name, slug, logoUrl, primaryColor, secondaryColor, city, state }) => ({
      id,
      name,
      slug,
      logoUrl,
      primaryColor,
      secondaryColor,
      city,
      state,
    }));
  }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const church = await getChurchBySlug(input.slug);
      if (!church?.active) return null;
      return {
        id: church.id,
        name: church.name,
        slug: church.slug,
        logoUrl: church.logoUrl,
        primaryColor: church.primaryColor,
        secondaryColor: church.secondaryColor,
        city: church.city,
        state: church.state,
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.id);
      return getChurchById(input.id);
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2),
        slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
        logoUrl: z.string().optional(),
        primaryColor: z.string().optional(),
        secondaryColor: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().max(2).optional(),
        zipCode: z.string().optional(),
        phone: z.string().optional(),
        whatsapp: z.string().optional(),
        email: z.string().email().optional(),
        website: z.string().optional(),
        vision: z.string().optional(),
        mission: z.string().optional(),
        values: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return createChurch(input);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        logoUrl: z.string().optional(),
        primaryColor: z.string().optional(),
        secondaryColor: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        phone: z.string().optional(),
        whatsapp: z.string().optional(),
        email: z.string().optional(),
        vision: z.string().optional(),
        mission: z.string().optional(),
        values: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await requireChurchAdministrator(ctx.user.id, id);
      return updateChurch(id, data);
    }),
});

const peopleRouter = router({
  list: protectedProcedure
    .input(z.object({ churchId: z.number(), search: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const accessibleIds = await getAccessiblePersonIds(ctx.user.id, input.churchId);
      const people = await getPeopleByChurch(input.churchId, input.search);
      return accessibleIds === null ? people : people.filter((person) => accessibleIds.has(person.id));
    }),

  findPossibleMatches: protectedProcedure
    .input(
      z.object({
        churchId: z.number(),
        fullName: z.string().min(2),
        phone: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      return findPossiblePeopleByIdentity(input.churchId, input);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number(), churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      const accessibleIds = await getAccessiblePersonIds(ctx.user.id, input.churchId);
      if (accessibleIds !== null && !accessibleIds.has(input.id)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem acesso a esta Pessoa." });
      }
      return getPersonById(input.id, input.churchId);
    }),

  create: protectedProcedure
    .input(
      z.object({
        churchId: z.number(),
        fullName: z.string().min(2),
        cpf: z.string().optional(),
        rg: z.string().optional(),
        birthDate: z.string().optional(),
        gender: z.enum(["masculino", "feminino", "outro"]).optional(),
        maritalStatus: z
          .enum(["solteiro", "casado", "divorciado", "viuvo", "uniao_estavel"])
          .optional(),
        profession: z.string().optional(),
        education: z.string().optional(),
        phone: z.string().optional(),
        whatsapp: z.string().optional(),
        email: z.string().email().optional(),
        zipCode: z.string().optional(),
        street: z.string().optional(),
        number: z.string().optional(),
        neighborhood: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        conversionDate: z.string().optional(),
        baptismDate: z.string().optional(),
        previousChurch: z.string().optional(),
        pastoralNotes: z.string().optional(),
        discipleshipStage: z
          .enum([
            "nova_alma",
            "consolidacao",
            "fundamentos",
            "celula",
            "batismo",
            "encontro_com_deus",
            "escola_de_lideres",
            "lideranca",
            "multiplicador",
          ])
          .optional(),
        wonById: z.number().optional(),
        discipledById: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requireChurchAdministrator(ctx.user.id, input.churchId);
      return createPerson(input as any);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        churchId: z.number(),
        fullName: z.string().optional(),
        phone: z.string().optional(),
        whatsapp: z.string().optional(),
        email: z.string().optional(),
        discipleshipStage: z
          .enum([
            "nova_alma",
            "consolidacao",
            "fundamentos",
            "celula",
            "batismo",
            "encontro_com_deus",
            "escola_de_lideres",
            "lideranca",
            "multiplicador",
          ])
          .optional(),
        pastoralNotes: z.string().optional(),
        wonById: z.number().optional(),
        discipledById: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, churchId, ...data } = input;
      if (data.discipleshipStage !== undefined) {
        await requireJourneyStagePermission(ctx.user.id, churchId, id);
      } else {
        await requireChurchAdministrator(ctx.user.id, churchId);
      }
      return updatePerson(id, churchId, data as any);
    }),

  journeyScope: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      const actor = await requireChurchMember(ctx.user.id, input.churchId);
      const actorRoles = await getEffectiveChurchRoles(ctx.user.id, input.churchId, actor);
      const canManageAll = actorRoles.some((role) => ["pastor_presidente", "pastor_local"].includes(role));
      const personIds = canManageAll
        ? []
        : await getJourneyManagedPersonIds({
            churchId: input.churchId,
            actorPersonId: actor.personId ?? null,
            actorRoles,
          });
      return {
        canManageAll,
        actorRole: actor.role,
        actorRoles,
        linkedPersonId: actor.personId ?? null,
        personIds,
      };
    }),
});

const soulsRouter = router({
  list: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      return getSoulsByChurch(input.churchId);
    }),

  create: protectedProcedure
    .input(
      z.object({
        churchId: z.number(),
        name: z.string().min(2),
        phone: z.string().optional(),
        address: z.string().optional(),
        decisionDate: z.string(),
        origin: z.enum([
          "culto",
          "evangelismo",
          "celula",
          "evento",
          "redes_sociais",
          "indicacao",
          "visita_espontanea",
        ]),
        acceptedJesus: z.boolean().default(false),
        reconciliation: z.boolean().default(false),
        firstVisit: z.boolean().default(false),
        wonById: z.number().nullable().optional(),
        existingPersonId: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requirePastoralAction(ctx.user.id, input.churchId);
      const isSpontaneousVisit = input.origin === "visita_espontanea";
      if (!isSpontaneousVisit && !input.wonById) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Informe quem ganhou a Nova Alma ou selecione visita espontânea." });
      }
      const winner = input.wonById ? await getPersonById(input.wonById, input.churchId) : null;
      if (input.wonById && !winner) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione uma pessoa válida da sua igreja." });
      }

      let person = input.existingPersonId
        ? await getPersonById(input.existingPersonId, input.churchId)
        : null;
      if (input.existingPersonId && !person) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A Pessoa selecionada não pertence a esta igreja." });
      }

      if (!person) {
        const possibleMatches = await findPossiblePeopleByIdentity(input.churchId, {
          fullName: input.name,
          phone: input.phone,
        });
        const phoneMatch = input.phone?.trim()
          ? possibleMatches.find((candidate) => candidate.phone === input.phone?.trim() || candidate.whatsapp === input.phone?.trim())
          : undefined;
        if (phoneMatch) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Já existe uma Pessoa com este telefone: ${phoneMatch.fullName}. Selecione-a para evitar duplicidade.`,
          });
        }
        person = await createPerson({
          churchId: input.churchId,
          fullName: input.name.trim(),
          phone: input.phone?.trim() || null,
          whatsapp: input.phone?.trim() || null,
          conversionDate: new Date(`${input.decisionDate}T12:00:00.000Z`),
          discipleshipStage: "nova_alma",
          wonById: input.wonById ?? null,
        });
      }
      if (!person) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível criar a ficha da Pessoa." });
      }

      const { existingPersonId: _existingPersonId, ...soulInput } = input;
      const soul = await createSoul({ ...soulInput, wonById: input.wonById ?? null, personId: person.id } as any);
      if (!soul) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível registrar a Nova Alma." });
      }
      await linkSoulToPerson(soul.id, input.churchId, person.id);
      const careAssignment = winner
        ? await setCurrentCareAssignment({
            churchId: input.churchId,
            personId: person.id,
            responsiblePersonId: winner.id,
            role: "quem_ganhou",
            notes: "Responsável inicial definido no registro da Nova Alma.",
          })
        : null;
      return { soul, person, careAssignment, createdPerson: !input.existingPersonId, needsConsolidator: !winner };
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        churchId: z.number(),
        status: z.enum(["nova_alma", "em_consolidacao", "consolidado"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const soul = await getSoulById(input.id, input.churchId);
      if (!soul?.personId) throw new TRPCError({ code: "NOT_FOUND", message: "Nova Alma não encontrada." });
      await requireJourneyStagePermission(ctx.user.id, input.churchId, soul.personId);
      return updateSoul(input.id, input.churchId, { status: input.status });
    }),
});

const consolidationRouter = router({
  consolidators: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requirePastoralAction(ctx.user.id, input.churchId);
      const [accounts, churchPeople] = await Promise.all([
        getChurchUsersByChurch(input.churchId),
        getPeopleByChurch(input.churchId),
      ]);
      const names = new Map(churchPeople.map((person) => [person.id, person.fullName]));
      return accounts
        .filter((account) => account.active && account.personId && (account.role === "consolidador" || account.complementaryRoles.includes("consolidador")))
        .map((account) => ({ personId: account.personId!, name: names.get(account.personId!) ?? account.name }));
    }),
  visitors: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requirePastoralAction(ctx.user.id, input.churchId);
      const [accounts, churchPeople] = await Promise.all([
        getChurchUsersByChurch(input.churchId),
        getPeopleByChurch(input.churchId),
      ]);
      const names = new Map(churchPeople.map((person) => [person.id, person.fullName]));
      const candidates = await Promise.all(accounts.filter((account) => account.active && account.personId).map(async (account) => {
        const roleKeys = await getActiveMinistryRoleKeysByPerson(account.personId!, input.churchId);
        const grants = roleKeys.flatMap((key) => MINISTRY_FUNCTION_GRANTS.get(key) ?? []);
        const roles = new Set([account.role, ...account.complementaryRoles, ...grants]);
        return roles.has("visitador") || roles.has("pastor_presidente") || roles.has("pastor_local") || roles.has("supervisor")
          ? { personId: account.personId!, name: names.get(account.personId!) ?? account.name }
          : null;
      }));
      return candidates.filter((candidate): candidate is { personId: number; name: string } => Boolean(candidate));
    }),

  referrals: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      const actor = await requireChurchMember(ctx.user.id, input.churchId);
      const roles = await getEffectiveChurchRoles(ctx.user.id, input.churchId, actor);
      const canViewAll = roles.some((role) => ["pastor_presidente", "pastor_local"].includes(role));
      const hasPastoralResponsibility = roles.some((role) => PASTORAL_ACTION_ROLES.has(role));
      if (!hasPastoralResponsibility) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Encaminhamentos de consolidação são restritos a responsáveis pastorais." });
      }

      const [referrals, managedPersonIds, churchPeople] = await Promise.all([
        getConsolidationReferralsByChurch(input.churchId),
        canViewAll
          ? Promise.resolve<number[]>([])
          : getJourneyManagedPersonIds({ churchId: input.churchId, actorPersonId: actor.personId ?? null, actorRoles: roles }),
        getPeopleByChurch(input.churchId),
      ]);
      const managedIds = new Set(managedPersonIds);
      const visible = canViewAll
        ? referrals
        : referrals.filter((referral) => referral.referredByPersonId === actor.personId || referral.preferredConsolidatorId === actor.personId || referral.acceptedByPersonId === actor.personId || managedIds.has(referral.personId));
      const peopleById = new Map(churchPeople.map((person) => [person.id, person]));
      return visible.map((referral) => {
        const person = peopleById.get(referral.personId);
        const canViewContact = canViewAll || (referral.acceptedByPersonId === actor.personId && referral.status !== "pendente");
        return {
          ...referral,
          ...getReferralCareDueState(referral),
          personName: person?.fullName ?? "Pessoa vinculada",
          contactNumber: canViewContact ? (person?.whatsapp || person?.phone || null) : null,
          referredByName: peopleById.get(referral.referredByPersonId)?.fullName ?? "Liderança",
          preferredConsolidatorName: referral.preferredConsolidatorId ? peopleById.get(referral.preferredConsolidatorId)?.fullName ?? "Consolidador indicado" : null,
          acceptedByName: referral.acceptedByPersonId ? peopleById.get(referral.acceptedByPersonId)?.fullName ?? "Consolidador" : null,
        };
      });
    }),
  visits: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      const actor = await requireChurchMember(ctx.user.id, input.churchId);
      if (!actor.personId) throw new TRPCError({ code: "FORBIDDEN", message: "Vincule sua conta a uma Pessoa para acessar Visitas." });
      const roles = await getEffectiveChurchRoles(ctx.user.id, input.churchId, actor);
      if (!roles.some((role) => VISIT_ROLES.has(role))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sua função não possui acesso à aba Visitas." });
      }
      const [followUps, referrals, churchPeople] = await Promise.all([
        getConsolidationFollowUpsByChurch(input.churchId),
        getConsolidationReferralsByChurch(input.churchId),
        getPeopleByChurch(input.churchId),
      ]);
      const referralsById = new Map(referrals.map((referral) => [referral.id, referral]));
      const peopleById = new Map(churchPeople.map((person) => [person.id, person]));
      const latestByReferral = new Map<number, typeof followUps[number]>();
      for (const followUp of followUps) {
        if (followUp.visitStatus === "nao_necessaria") continue;
        const current = latestByReferral.get(followUp.referralId);
        if (!current || new Date(followUp.createdAt).getTime() > new Date(current.createdAt).getTime()) latestByReferral.set(followUp.referralId, followUp);
      }
      const canMonitorAll = roles.some((role) => ["pastor_presidente", "pastor_local", "supervisor", "supervisor_consolidacao"].includes(role));
      return Array.from(latestByReferral.values())
        .filter((followUp) => ["solicitada", "agendada"].includes(followUp.visitStatus))
        .filter((followUp) => {
          const referral = referralsById.get(followUp.referralId);
          return canMonitorAll || followUp.visitAssigneePersonId === actor.personId || referral?.acceptedByPersonId === actor.personId;
        })
        .map((followUp) => {
          const referral = referralsById.get(followUp.referralId)!;
          const person = peopleById.get(referral.personId);
          return {
            id: followUp.id,
            referralId: referral.id,
            personId: referral.personId,
            personName: person?.fullName ?? "Pessoa vinculada",
            contactNumber: person?.whatsapp || person?.phone || null,
            address: [person?.street, person?.number, person?.neighborhood, person?.city, person?.state].filter(Boolean).join(", ") || null,
            reason: referral.reason,
            notes: followUp.notes,
            status: followUp.visitStatus,
            scheduledAt: followUp.visitScheduledAt,
            assignedToName: followUp.visitAssigneePersonId ? peopleById.get(followUp.visitAssigneePersonId)?.fullName ?? "Visitador designado" : null,
            requestedByName: peopleById.get(followUp.recordedByPersonId)?.fullName ?? "Consolidador",
          };
        });
    }),

  createReferral: protectedProcedure
    .input(z.object({
      churchId: z.number(),
      personId: z.number(),
      reason: z.string().trim().min(3).max(255),
      notes: z.string().trim().max(2000).optional(),
      preferredConsolidatorId: z.number().optional(),
      careDueInDays: z.number().int().min(1).max(14).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const actor = await requireJourneyStagePermission(ctx.user.id, input.churchId, input.personId);
      if (!actor.personId) throw new TRPCError({ code: "FORBIDDEN", message: "Vincule sua conta a uma Pessoa antes de encaminhar para consolidação." });
      if (input.preferredConsolidatorId) {
        const accounts = await getChurchUsersByChurch(input.churchId);
        const selected = accounts.find((account) => account.active && account.personId === input.preferredConsolidatorId && (account.role === "consolidador" || account.complementaryRoles.includes("consolidador")));
        if (!selected) throw new TRPCError({ code: "BAD_REQUEST", message: "A Pessoa indicada não possui uma função ativa de Consolidador nesta igreja." });
      }
      return createConsolidationReferral({
        churchId: input.churchId,
        personId: input.personId,
        referredByPersonId: actor.personId,
        preferredConsolidatorId: input.preferredConsolidatorId,
        reason: input.reason,
        notes: input.notes || null,
        status: "pendente",
        careDueAt: new Date(Date.now() + (input.careDueInDays ?? DEFAULT_REFERRAL_CARE_DUE_DAYS) * 24 * 60 * 60 * 1000),
      });
    }),

  updateReferralCareDue: protectedProcedure
    .input(z.object({ churchId: z.number(), id: z.number(), careDueAt: z.string().datetime() }))
    .mutation(async ({ input, ctx }) => {
      const actor = await requireChurchMember(ctx.user.id, input.churchId);
      const roles = await getEffectiveChurchRoles(ctx.user.id, input.churchId, actor);
      const referral = await getConsolidationReferralById(input.id, input.churchId);
      if (!referral) throw new TRPCError({ code: "NOT_FOUND", message: "Encaminhamento não encontrado." });
      const canOverride = roles.some((role) => ["pastor_presidente", "pastor_local"].includes(role));
      if (!canOverride && referral.acceptedByPersonId !== actor.personId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Somente o Consolidador responsável ou Pastores podem ajustar este prazo." });
      }
      if (["encerrado", "cancelado"].includes(referral.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Não é possível alterar o prazo de um encaminhamento encerrado." });
      }
      const dueAt = new Date(input.careDueAt);
      if (dueAt.getTime() <= Date.now()) throw new TRPCError({ code: "BAD_REQUEST", message: "Defina um prazo futuro para o cuidado." });
      return updateConsolidationReferral(input.id, input.churchId, { careDueAt: dueAt });
    }),

  acceptReferral: protectedProcedure
    .input(z.object({ churchId: z.number(), id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const actor = await requireChurchMember(ctx.user.id, input.churchId);
      const roles = await getEffectiveChurchRoles(ctx.user.id, input.churchId, actor);
      const canOverride = roles.some((role) => ["pastor_presidente", "pastor_local"].includes(role));
      const canConsolidate = roles.includes("consolidador") || canOverride;
      if (!canConsolidate || !actor.personId) throw new TRPCError({ code: "FORBIDDEN", message: "Somente Consolidadores ou Pastores podem assumir este encaminhamento." });
      const referral = await getConsolidationReferralById(input.id, input.churchId);
      if (!referral || referral.status !== "pendente") throw new TRPCError({ code: "BAD_REQUEST", message: "Este encaminhamento não está disponível para aceite." });
      if (referral.preferredConsolidatorId && referral.preferredConsolidatorId !== actor.personId && !canOverride) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Este encaminhamento foi indicado para outro Consolidador." });
      }
      await setCurrentCareAssignment({
        churchId: input.churchId,
        personId: referral.personId,
        responsiblePersonId: actor.personId,
        role: "consolidador",
        notes: `Encaminhamento de resgate aceito: ${referral.reason}`,
      });
      return updateConsolidationReferral(input.id, input.churchId, {
        status: "aceito",
        acceptedByPersonId: actor.personId,
        acceptedAt: new Date(),
      });
    }),

  registerReferralContact: protectedProcedure
    .input(z.object({ churchId: z.number(), id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const actor = await requireChurchMember(ctx.user.id, input.churchId);
      const roles = await getEffectiveChurchRoles(ctx.user.id, input.churchId, actor);
      const referral = await getConsolidationReferralById(input.id, input.churchId);
      if (!referral) throw new TRPCError({ code: "NOT_FOUND", message: "Encaminhamento não encontrado." });
      const canOverride = roles.some((role) => ["pastor_presidente", "pastor_local"].includes(role));
      if (!canOverride && referral.acceptedByPersonId !== actor.personId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Somente o Consolidador responsável pode registrar este contato." });
      }
      return updateConsolidationReferral(input.id, input.churchId, {
        status: "em_acompanhamento",
        firstContactAt: referral.firstContactAt ?? new Date(),
      });
    }),

  followUps: protectedProcedure
    .input(z.object({ churchId: z.number(), referralId: z.number() }))
    .query(async ({ input, ctx }) => {
      const actor = await requireChurchMember(ctx.user.id, input.churchId);
      const roles = await getEffectiveChurchRoles(ctx.user.id, input.churchId, actor);
      const referral = await getConsolidationReferralById(input.referralId, input.churchId);
      if (!referral) throw new TRPCError({ code: "NOT_FOUND", message: "Encaminhamento não encontrado." });
      const canOverride = roles.some((role) => ["pastor_presidente", "pastor_local"].includes(role));
      const isResponsible = referral.acceptedByPersonId === actor.personId;
      if (!canOverride && !isResponsible) {
        await requireJourneyStagePermission(ctx.user.id, input.churchId, referral.personId);
      }
      const [followUps, churchPeople] = await Promise.all([
        getConsolidationFollowUpsByReferral(input.referralId, input.churchId),
        getPeopleByChurch(input.churchId),
      ]);
      const names = new Map(churchPeople.map((person) => [person.id, person.fullName]));
      return followUps.map((followUp) => ({
        ...followUp,
        recordedByName: names.get(followUp.recordedByPersonId) ?? "Responsável de cuidado",
        visitAssigneeName: followUp.visitAssigneePersonId ? names.get(followUp.visitAssigneePersonId) ?? "Visitador designado" : null,
      }));
    }),

  recordFollowUp: protectedProcedure
    .input(z.object({
      churchId: z.number(),
      referralId: z.number(),
      contactChannel: z.enum(["whatsapp", "ligacao", "mensagem", "visita", "presencial", "outro"]),
      outcome: z.enum(["conversou", "sem_resposta", "retornar", "agendou_visita", "visitou", "recusou_contato", "outro"]),
      notes: z.string().trim().min(3).max(3000),
      nextAction: z.string().trim().max(255).optional(),
      nextActionAt: z.string().datetime().optional(),
      visitStatus: z.enum(["nao_necessaria", "solicitada", "agendada", "realizada", "cancelada"]).default("nao_necessaria"),
      visitAssigneePersonId: z.number().optional(),
      visitScheduledAt: z.string().datetime().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const actor = await requireChurchMember(ctx.user.id, input.churchId);
      if (!actor.personId) throw new TRPCError({ code: "FORBIDDEN", message: "Vincule sua conta a uma Pessoa antes de registrar acompanhamento." });
      const roles = await getEffectiveChurchRoles(ctx.user.id, input.churchId, actor);
      const referral = await getConsolidationReferralById(input.referralId, input.churchId);
      if (!referral || !referral.acceptedByPersonId) throw new TRPCError({ code: "BAD_REQUEST", message: "O encaminhamento precisa ser assumido antes do acompanhamento." });
      const canOverride = roles.some((role) => ["pastor_presidente", "pastor_local"].includes(role));
      if (!canOverride && referral.acceptedByPersonId !== actor.personId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Somente o Consolidador responsável pode registrar este acompanhamento." });
      }
      if (input.visitAssigneePersonId) {
        const visitorRoles = await getActiveMinistryRoleKeysByPerson(input.visitAssigneePersonId, input.churchId);
        const visitorGrants = visitorRoles.flatMap((key) => MINISTRY_FUNCTION_GRANTS.get(key) ?? []);
        const visitorAccount = (await getChurchUsersByChurch(input.churchId)).find((account) => account.active && account.personId === input.visitAssigneePersonId);
        const targetRoles = new Set(visitorAccount ? [visitorAccount.role, ...visitorAccount.complementaryRoles, ...visitorGrants] : []);
        const isVisitor = Boolean(visitorAccount && (["visitador", "pastor_presidente", "pastor_local", "supervisor"].some((role) => targetRoles.has(role))));
        if (!isVisitor) throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione uma Pessoa autorizada como Visitador." });
      }
      const followUp = await createConsolidationFollowUp({
        churchId: input.churchId,
        referralId: input.referralId,
        recordedByPersonId: actor.personId,
        contactChannel: input.contactChannel,
        outcome: input.outcome,
        notes: input.notes,
        nextAction: input.nextAction || null,
        nextActionAt: input.nextActionAt ? new Date(input.nextActionAt) : null,
        visitStatus: input.visitStatus,
        visitAssigneePersonId: input.visitAssigneePersonId ?? null,
        visitScheduledAt: input.visitScheduledAt ? new Date(input.visitScheduledAt) : null,
      });
      await updateConsolidationReferral(input.referralId, input.churchId, {
        status: "em_acompanhamento",
        firstContactAt: referral.firstContactAt ?? new Date(),
      });
      return followUp;
    }),
  completeVisit: protectedProcedure
    .input(z.object({ churchId: z.number(), referralId: z.number(), notes: z.string().trim().min(3).max(3000) }))
    .mutation(async ({ input, ctx }) => {
      const actor = await requireChurchMember(ctx.user.id, input.churchId);
      if (!actor.personId) throw new TRPCError({ code: "FORBIDDEN", message: "Vincule sua conta a uma Pessoa antes de registrar a visita." });
      const roles = await getEffectiveChurchRoles(ctx.user.id, input.churchId, actor);
      if (!roles.some((role) => VISIT_ROLES.has(role))) throw new TRPCError({ code: "FORBIDDEN", message: "Sua função não possui permissão para registrar visitas." });
      const referral = await getConsolidationReferralById(input.referralId, input.churchId);
      if (!referral) throw new TRPCError({ code: "NOT_FOUND", message: "Encaminhamento não encontrado." });
      const followUps = await getConsolidationFollowUpsByReferral(input.referralId, input.churchId);
      const latestVisit = followUps
        .filter((followUp) => ["solicitada", "agendada"].includes(followUp.visitStatus))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      const canMonitorAll = roles.some((role) => ["pastor_presidente", "pastor_local", "supervisor", "supervisor_consolidacao"].includes(role));
      if (!latestVisit || (!canMonitorAll && latestVisit.visitAssigneePersonId !== actor.personId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Esta visita não está atribuída à sua função." });
      }
      const created = await createConsolidationFollowUp({
        churchId: input.churchId,
        referralId: input.referralId,
        recordedByPersonId: actor.personId,
        contactChannel: "visita",
        outcome: "visitou",
        notes: input.notes,
        visitStatus: "realizada",
        visitAssigneePersonId: actor.personId,
      });
      await updateConsolidationReferral(input.referralId, input.churchId, {
        status: "em_acompanhamento",
        firstContactAt: referral.firstContactAt ?? new Date(),
      });
      return created;
    }),

  closeReferral: protectedProcedure
    .input(z.object({ churchId: z.number(), id: z.number(), closeNotes: z.string().trim().min(3).max(2000) }))
    .mutation(async ({ input, ctx }) => {
      const actor = await requireChurchMember(ctx.user.id, input.churchId);
      const roles = await getEffectiveChurchRoles(ctx.user.id, input.churchId, actor);
      const referral = await getConsolidationReferralById(input.id, input.churchId);
      if (!referral) throw new TRPCError({ code: "NOT_FOUND", message: "Encaminhamento não encontrado." });
      const canOverride = roles.some((role) => ["pastor_presidente", "pastor_local"].includes(role));
      if (!canOverride && referral.acceptedByPersonId !== actor.personId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Somente o Consolidador responsável pode encerrar este acompanhamento." });
      }
      return updateConsolidationReferral(input.id, input.churchId, {
        status: "encerrado",
        closedAt: new Date(),
        closeNotes: input.closeNotes,
      });
    }),

  souls: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      const actor = await requireChurchMember(ctx.user.id, input.churchId);
      const roles = await getEffectiveChurchRoles(ctx.user.id, input.churchId, actor);
      const canViewAll = roles.some((role) => ["pastor_presidente", "pastor_local"].includes(role));
      const hasPastoralResponsibility = roles.some((role) => PASTORAL_ACTION_ROLES.has(role));
      if (!hasPastoralResponsibility) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Consolidação é restrita a responsáveis de cuidado autorizados." });
      }

      const souls = await getSoulsByChurch(input.churchId);
      if (canViewAll) return souls;

      const [consolidations, managedPersonIds] = await Promise.all([
        getConsolidationsByChurch(input.churchId),
        getJourneyManagedPersonIds({
          churchId: input.churchId,
          actorPersonId: actor.personId ?? null,
          actorRoles: roles,
        }),
      ]);
      const managedIdSet = new Set(managedPersonIds);
      const accessibleSoulIds = new Set(
        consolidations
          .filter((consolidation) => {
            const soul = souls.find((item) => item.id === consolidation.soulId);
            return (soul?.personId !== null && soul?.personId !== undefined && managedIdSet.has(soul.personId)) || consolidation.consolidatorId === actor.personId;
          })
          .map((consolidation) => consolidation.soulId)
      );
      return souls.filter((soul) => accessibleSoulIds.has(soul.id));
    }),

  list: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      const actor = await requireChurchMember(ctx.user.id, input.churchId);
      const roles = await getEffectiveChurchRoles(ctx.user.id, input.churchId, actor);
      const canViewAll = roles.some((role) => ["pastor_presidente", "pastor_local"].includes(role));
      const hasPastoralResponsibility = roles.some((role) => PASTORAL_ACTION_ROLES.has(role));
      if (!hasPastoralResponsibility) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Consolidação é restrita a responsáveis de cuidado autorizados." });
      }

      const consolidations = await getConsolidationsByChurch(input.churchId);
      if (canViewAll) return consolidations;

      const managedPersonIds = new Set(
        await getJourneyManagedPersonIds({
          churchId: input.churchId,
          actorPersonId: actor.personId ?? null,
          actorRoles: roles,
        })
      );
      const souls = await getSoulsByChurch(input.churchId);
      const soulPersonIds = new Map(souls.map((soul) => [soul.id, soul.personId]));

      return consolidations.filter((consolidation) => {
        const personId = soulPersonIds.get(consolidation.soulId);
        return (personId !== null && personId !== undefined && managedPersonIds.has(personId)) || consolidation.consolidatorId === actor.personId;
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        churchId: z.number(),
        soulId: z.number(),
        consolidatorId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [soul, consolidator, existing] = await Promise.all([
        getSoulById(input.soulId, input.churchId),
        getPersonById(input.consolidatorId, input.churchId),
        getConsolidationsBySoul(input.soulId, input.churchId),
      ]);
      if (!soul) throw new TRPCError({ code: "NOT_FOUND", message: "Nova Alma não encontrada." });
      if (!soul.personId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Esta Nova Alma precisa estar vinculada a uma Pessoa antes da consolidação." });
      }
      await requireJourneyStagePermission(ctx.user.id, input.churchId, soul.personId);
      if (!consolidator) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione um consolidador válido da sua igreja." });
      }
      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Esta Nova Alma já possui uma consolidação em andamento." });
      }
      const consolidation = await createConsolidation(input);
      await updateSoul(soul.id, input.churchId, { status: "em_consolidacao" });
      if (soul.personId) {
        await updatePerson(soul.personId, input.churchId, { discipleshipStage: "consolidacao" });
        await setCurrentCareAssignment({
          churchId: input.churchId,
          personId: soul.personId,
          responsiblePersonId: input.consolidatorId,
          role: "consolidador",
          notes: "Responsável atualizado ao iniciar a consolidação.",
        });
      }
      return consolidation;
    }),

  updateChecklist: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        churchId: z.number(),
        callMade: z.boolean().optional(),
        messageSent: z.boolean().optional(),
        visitMade: z.boolean().optional(),
        bibleDelivered: z.boolean().optional(),
        whatsappGroupAdded: z.boolean().optional(),
        prayerMade: z.boolean().optional(),
        addedToCell: z.boolean().optional(),
        notes: z.string().optional(),
        status: z.enum(["em_consolidacao", "consolidado"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, churchId, ...data } = input;
      await requireChurchMember(ctx.user.id, churchId);
      const consolidation = await getConsolidationById(id, churchId);
      if (!consolidation) throw new TRPCError({ code: "NOT_FOUND", message: "Consolidação não encontrada." });
      const soulForPermission = await getSoulById(consolidation.soulId, churchId);
      if (soulForPermission?.personId) {
        await requireJourneyStagePermission(ctx.user.id, churchId, soulForPermission.personId);
      }
      const timestampFields = {
        callMade: "callDate",
        messageSent: "messageDate",
        visitMade: "visitDate",
        bibleDelivered: "bibleDate",
        whatsappGroupAdded: "whatsappDate",
        prayerMade: "prayerDate",
        addedToCell: "cellDate",
      } as const;
      const updateData: Record<string, unknown> = { ...data };
      for (const [field, timestampField] of Object.entries(timestampFields)) {
        const value = updateData[field];
        if (typeof value === "boolean") updateData[timestampField] = value ? new Date() : null;
      }
      await updateConsolidation(id, churchId, updateData as any);
      if (data.status === "consolidado") {
        const soul = await getSoulById(consolidation.soulId, churchId);
        if (soul) await updateSoul(soul.id, churchId, { status: "consolidado" });
      }
      return getConsolidationById(id, churchId);
    }),

  integrateIntoCell: protectedProcedure
    .input(z.object({ churchId: z.number(), consolidationId: z.number(), cellId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      const [consolidation, cell] = await Promise.all([
        getConsolidationById(input.consolidationId, input.churchId),
        getCellById(input.cellId, input.churchId),
      ]);
      if (!consolidation) throw new TRPCError({ code: "NOT_FOUND", message: "Consolidação não encontrada." });
      if (!cell) throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione uma Célula válida desta igreja." });
      const soul = await getSoulById(consolidation.soulId, input.churchId);
      if (!soul?.personId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Esta Nova Alma ainda não possui uma ficha de Pessoa vinculada." });
      }
      await requireJourneyStagePermission(ctx.user.id, input.churchId, soul.personId);
      const membership = await assignPersonToCell({ churchId: input.churchId, personId: soul.personId, cellId: cell.id });
      await updateConsolidation(input.consolidationId, input.churchId, { addedToCell: true, cellDate: new Date() } as any);
      if (cell.leaderId) {
        await setCurrentCareAssignment({
          churchId: input.churchId,
          personId: soul.personId,
          responsiblePersonId: cell.leaderId,
          role: "lider_celula",
          notes: `Integração na ${cell.name}: cuidado transferido ao líder da Célula.`,
        });
      }
      return { membership, consolidation: await getConsolidationById(input.consolidationId, input.churchId) };
    }),
});

const careRouter = router({
  visits: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      const actor = await requireChurchMember(ctx.user.id, input.churchId);
      const actorRoles = await getEffectiveChurchRoles(ctx.user.id, input.churchId, actor);
      const canManageAll = actorRoles.some((role) => ["pastor_presidente", "pastor_local"].includes(role));
      const hasPastoralResponsibility = actorRoles.some((role) => PASTORAL_ACTION_ROLES.has(role));
      if (!hasPastoralResponsibility) {
        throw new TRPCError({ code: "FORBIDDEN", message: "A fila de visitas é restrita à liderança de cuidado." });
      }

      const [followUps, referrals, people, managedPersonIds] = await Promise.all([
        getConsolidationFollowUpsByChurch(input.churchId),
        getConsolidationReferralsByChurch(input.churchId),
        getPeopleByChurch(input.churchId),
        canManageAll
          ? Promise.resolve<number[]>([])
          : getJourneyManagedPersonIds({
              churchId: input.churchId,
              actorPersonId: actor.personId ?? null,
              actorRoles,
            }),
      ]);
      const referralsById = new Map(referrals.map((referral) => [referral.id, referral]));
      const peopleById = new Map(people.map((person) => [person.id, person]));
      const managedIds = new Set(managedPersonIds);
      const latestVisitByReferral = new Map<number, (typeof followUps)[number]>();

      for (const followUp of followUps) {
        if (followUp.visitStatus === "nao_necessaria" || latestVisitByReferral.has(followUp.referralId)) continue;
        latestVisitByReferral.set(followUp.referralId, followUp);
      }

      return Array.from(latestVisitByReferral.values())
        .map((followUp) => {
          const referral = referralsById.get(followUp.referralId);
          if (!referral || referral.status === "encerrado") return null;
          const canSee = canManageAll || referral.acceptedByPersonId === actor.personId || referral.referredByPersonId === actor.personId || managedIds.has(referral.personId);
          if (!canSee) return null;
          const person = peopleById.get(referral.personId);
          return {
            referralId: referral.id,
            personId: referral.personId,
            personName: person?.fullName ?? "Pessoa vinculada",
            contactNumber: canManageAll || referral.acceptedByPersonId === actor.personId ? (person?.whatsapp || person?.phone || null) : null,
            reason: referral.reason,
            visitStatus: followUp.visitStatus,
            notes: followUp.notes,
            requestedAt: followUp.createdAt,
            nextAction: followUp.nextAction,
            nextActionAt: followUp.nextActionAt,
            consolidatorId: referral.acceptedByPersonId,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => Number(new Date(a.requestedAt)) - Number(new Date(b.requestedAt)));
    }),

  myQueue: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      const actor = await requireChurchMember(ctx.user.id, input.churchId);
      const actorRoles = await getEffectiveChurchRoles(ctx.user.id, input.churchId, actor);
      const canManageAll = actorRoles.some((role) => ["pastor_presidente", "pastor_local"].includes(role));
      const managedPersonIds = canManageAll
        ? new Set<number>()
        : new Set(
            await getJourneyManagedPersonIds({
              churchId: input.churchId,
              actorPersonId: actor.personId ?? null,
              actorRoles,
            })
          );
      const priorityOrder = { alta: 0, media: 1, normal: 2 } as const;
      const queue = await getCareAttentionByChurch(input.churchId);

      return queue
        .filter((item) => item.reasons.length > 0)
        .filter(
          (item) =>
            canManageAll ||
            managedPersonIds.has(item.person.id) ||
            item.careAssignment?.responsiblePersonId === actor.personId
        )
        .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    }),

  registerFirstContact: protectedProcedure
    .input(z.object({ churchId: z.number(), personId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await requireJourneyStagePermission(ctx.user.id, input.churchId, input.personId);
      const queue = await getCareAttentionByChurch(input.churchId);
      const item = queue.find((candidate) => candidate.person.id === input.personId);
      if (!item?.consolidation) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Esta pessoa não possui uma consolidação pendente de contato." });
      }
      return updateConsolidation(item.consolidation.id, input.churchId, {
        callMade: true,
        callDate: new Date(),
      });
    }),

  getCurrent: protectedProcedure
    .input(z.object({ churchId: z.number(), personId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireJourneyStagePermission(ctx.user.id, input.churchId, input.personId);
      const person = await getPersonById(input.personId, input.churchId);
      if (!person) throw new TRPCError({ code: "NOT_FOUND", message: "Pessoa não encontrada." });
      return getCurrentCareAssignment(input.personId, input.churchId);
    }),

  history: protectedProcedure
    .input(z.object({ churchId: z.number(), personId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireJourneyStagePermission(ctx.user.id, input.churchId, input.personId);
      const person = await getPersonById(input.personId, input.churchId);
      if (!person) throw new TRPCError({ code: "NOT_FOUND", message: "Pessoa não encontrada." });
      return getCareHistoryByPerson(input.personId, input.churchId);
    }),

  assign: protectedProcedure
    .input(
      z.object({
        churchId: z.number(),
        personId: z.number(),
        responsiblePersonId: z.number(),
        role: z.enum(["quem_ganhou", "consolidador", "lider_celula", "discipulador", "pastor"]),
        notes: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requireJourneyStagePermission(ctx.user.id, input.churchId, input.personId);
      const [person, responsible] = await Promise.all([
        getPersonById(input.personId, input.churchId),
        getPersonById(input.responsiblePersonId, input.churchId),
      ]);
      if (!person || !responsible) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Pessoa ou responsável inválido para esta igreja." });
      }
      return setCurrentCareAssignment(input);
    }),
});

const cellsRouter = router({
  list: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      return getCellsByChurch(input.churchId);
    }),

  members: protectedProcedure
    .input(z.object({ churchId: z.number(), cellId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      const cell = await getCellById(input.cellId, input.churchId);
      if (!cell) throw new TRPCError({ code: "NOT_FOUND", message: "Célula não encontrada." });
      return getActiveMembersByCell(input.cellId, input.churchId);
    }),

  memberCounts: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      return getCellMembersCount(input.churchId);
    }),

  meetingHistory: protectedProcedure
    .input(z.object({ churchId: z.number(), cellId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      const cell = await getCellById(input.cellId, input.churchId);
      if (!cell) throw new TRPCError({ code: "NOT_FOUND", message: "Célula não encontrada." });
      return getCellMeetingSummaries(input.cellId, input.churchId);
    }),

  meetingAccess: protectedProcedure
    .input(z.object({ churchId: z.number(), cellId: z.number() }))
    .query(async ({ input, ctx }) => {
      const authorization = await getCellMeetingAuthorization(ctx.user.id, input.churchId, input.cellId);
      return { canRecord: authorization.canRecord };
    }),

  recordMeeting: protectedProcedure
    .input(
      z.object({
        churchId: z.number(),
        cellId: z.number(),
        meetingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida."),
        topic: z.string().trim().max(255).optional(),
        notes: z.string().trim().max(3000).optional(),
        attendance: z.array(z.object({ personId: z.number().int().positive(), status: z.enum(["presente", "ausente"]) })),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requireCellMeetingAuthorization(ctx.user.id, input.churchId, input.cellId);
      const [members, existingMeeting] = await Promise.all([
        getActiveMembersByCell(input.cellId, input.churchId),
        getCellMeetingByDate(input.cellId, input.churchId, input.meetingDate),
      ]);
      if (existingMeeting) {
        throw new TRPCError({ code: "CONFLICT", message: "Já existe um encontro registrado para esta data." });
      }
      const activePersonIds = new Set(members.map((item) => item.person.id));
      const submittedPersonIds = input.attendance.map((item) => item.personId);
      const uniquePersonIds = new Set(submittedPersonIds);
      const hasInvalidPerson = submittedPersonIds.some((personId) => !activePersonIds.has(personId));
      if (hasInvalidPerson || uniquePersonIds.size !== submittedPersonIds.length || uniquePersonIds.size !== activePersonIds.size) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Registre a presença de todas as Pessoas atualmente vinculadas à Célula.",
        });
      }
      return createCellMeetingWithAttendance({
        cellId: input.cellId,
        churchId: input.churchId,
        meetingDate: input.meetingDate,
        topic: input.topic || null,
        notes: input.notes || null,
        attendance: input.attendance,
      });
    }),

  personMembership: protectedProcedure
    .input(z.object({ churchId: z.number(), personId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      const person = await getPersonById(input.personId, input.churchId);
      if (!person) throw new TRPCError({ code: "NOT_FOUND", message: "Pessoa não encontrada." });
      return getActiveCellMembership(input.personId, input.churchId);
    }),

  membershipHistory: protectedProcedure
    .input(z.object({ churchId: z.number(), personId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      const person = await getPersonById(input.personId, input.churchId);
      if (!person) throw new TRPCError({ code: "NOT_FOUND", message: "Pessoa não encontrada." });
      return getCellMembershipHistory(input.personId, input.churchId);
    }),

  assignPerson: protectedProcedure
    .input(z.object({ churchId: z.number(), personId: z.number(), cellId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await requireJourneyStagePermission(ctx.user.id, input.churchId, input.personId);
      const [person, cell, previousMembership] = await Promise.all([
        getPersonById(input.personId, input.churchId),
        getCellById(input.cellId, input.churchId),
        getActiveCellMembership(input.personId, input.churchId),
      ]);
      if (!person || !cell || !cell.active) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Pessoa ou Célula inválida para esta igreja." });
      }
      if (previousMembership?.cellId === input.cellId) {
        return { membership: previousMembership, transferred: false };
      }
      const membership = await assignPersonToCell(input);
      await updatePerson(person.id, input.churchId, { discipleshipStage: "celula" });
      await setCurrentCareAssignment({
        churchId: input.churchId,
        personId: person.id,
        responsiblePersonId: cell.leaderId,
        role: "lider_celula",
        notes: previousMembership ? `Transferida de ${previousMembership.cellName} para ${cell.name}.` : `Integrada à célula ${cell.name}.`,
      });
      return { membership, transferred: Boolean(previousMembership) };
    }),

  create: protectedProcedure
    .input(
      z.object({
        churchId: z.number(),
        name: z.string().min(2),
        leaderId: z.number(),
        supervisorId: z.number().optional(),
        hostId: z.number().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        neighborhood: z.string().optional(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        meetingDay: z
          .enum(["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"])
          .optional(),
        meetingTime: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requireCellManagementPermission(ctx.user.id, input.churchId, input.leaderId);
      const leader = await getPersonById(input.leaderId, input.churchId);
      if (!leader) throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione um líder válido da sua igreja." });
      return createCell(input as any);
    }),
});

const eventsRouter = router({
  list: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      return getEventsByChurch(input.churchId);
    }),

  attendanceReport: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), eventId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      await requireChurchAdministrator(ctx.user.id, input.churchId);
      const report = await getEventAttendanceReport(input);
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Evento não encontrado nesta igreja." });
      return report;
    }),

    create: protectedProcedure
    .input(
      z.object({
        churchId: z.number(),
        name: z.string().min(2),
        type: z.enum([
          "congresso",
          "conferencia",
          "vigilia",
          "retiro",
          "seminario",
          "culto",
          "outro",
        ]),
        description: z.string().optional(),
        startDate: z.string(),
        endDate: z.string().optional(),
        location: z.string().optional(),
        maxCapacity: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requireChurchAdministrator(ctx.user.id, input.churchId);
      return createEvent({ ...input, startDate: new Date(input.startDate) } as any);
    }),
  generateQrCode: protectedProcedure
    .input(z.object({ eventId: z.number(), churchId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await requireChurchAdministrator(ctx.user.id, input.churchId);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const eventRows = await db
        .select()
        .from(events)
        .where(and(eq(events.id, input.eventId), eq(events.churchId, input.churchId)))
        .limit(1);
      if (!eventRows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Evento não encontrado nesta igreja." });
      const { nanoid } = await import("nanoid");
      const token = nanoid(16);
      const qrCode = `checkin:${input.eventId}:${token}`;
      await db
        .update(events)
        .set({ qrCode })
        .where(and(eq(events.id, input.eventId), eq(events.churchId, input.churchId)));
      return { qrCode, token };
    }),
  checkin: publicProcedure
    .input(z.object({ token: z.string(), eventId: z.number(), visitorName: z.string().optional(), personId: z.number().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const eventRows = await db.select().from(events).where(eq(events.id, input.eventId)).limit(1);
      const event = eventRows[0];
      if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Evento não encontrado" });
      if (!event.active) throw new TRPCError({ code: "BAD_REQUEST", message: "Evento encerrado" });
      const expectedToken = event.qrCode?.split(":")[2];
      if (!expectedToken || expectedToken !== input.token) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "QR Code inválido" });
      }
      // Registrar check-in em event_registrations
      const { eventRegistrations } = await import("../drizzle/schema");
      if (input.personId) {
        const { people } = await import("../drizzle/schema");
        const personRows = await db
          .select({ id: people.id })
          .from(people)
          .where(and(eq(people.id, input.personId), eq(people.churchId, event.churchId)))
          .limit(1);
        if (!personRows[0]) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Pessoa não pertence à igreja deste evento." });
        }
        // Verificar se já fez check-in
        const existing = await db.select().from(eventRegistrations)
          .where(eq(eventRegistrations.eventId, input.eventId))
          .limit(50);
        const alreadyCheckedIn = existing.find((r: any) => r.personId === input.personId && r.checkedIn);
        if (alreadyCheckedIn) {
          return { success: true, eventName: event.name, checkedIn: alreadyCheckedIn.checkedInAt, alreadyRegistered: true };
        }
        // Upsert: se já inscrito, atualizar; senão inserir
        const alreadyRegistered = existing.find((r: any) => r.personId === input.personId);
        if (alreadyRegistered) {
          await db.update(eventRegistrations)
            .set({ checkedIn: true, checkedInAt: new Date() })
            .where(eq(eventRegistrations.id, alreadyRegistered.id));
        } else {
          await db.insert(eventRegistrations).values({
            eventId: input.eventId,
            personId: input.personId,
            checkedIn: true,
            checkedInAt: new Date(),
          });
        }
      }
      return { success: true, eventName: event.name, checkedIn: new Date(), alreadyRegistered: false };
    }),
});
const familiesRouter = router({
  list: protectedProcedure
    .input(z.object({ churchId: z.number(), search: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      const { getFamiliesByChurch } = await import("./db");
      const rows = await getFamiliesByChurch(input.churchId);
      const filtered = input.search
        ? rows.filter((f: { name: string }) =>
            f.name.toLowerCase().includes(input.search!.toLowerCase())
          )
        : rows;
      return filtered;
    }),
  create: protectedProcedure
    .input(z.object({ churchId: z.number(), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      const { createFamily } = await import("./db");
      return createFamily({ churchId: input.churchId, name: input.name });
    }),
});

const ministriesRouter = router({
  list: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      const [rows, counts] = await Promise.all([
        getMinistriesByChurch(input.churchId),
        getMinistryMemberCounts(input.churchId),
      ]);
      const countByMinistry = new Map(counts.map((item) => [item.ministryId, Number(item.count)]));
      return rows.map((m) => ({
        ...m,
        memberCount: countByMinistry.get(m.id) ?? 0,
        leaderName: null as string | null,
      }));
    }),
  members: protectedProcedure
    .input(z.object({ churchId: z.number(), ministryId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      const ministry = (await getMinistriesByChurch(input.churchId)).find((item) => item.id === input.ministryId);
      if (!ministry) throw new TRPCError({ code: "NOT_FOUND", message: "Ministério não encontrado." });
      return getMinistryMembers(input.ministryId, input.churchId);
    }),
  assignPerson: protectedProcedure
    .input(z.object({ churchId: z.number(), ministryId: z.number(), personId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await requireMinistryManagementPermission(ctx.user.id, input.churchId, input.ministryId);
      const person = await getPersonById(input.personId, input.churchId);
      if (!person) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Pessoa ou Ministério inválido para esta igreja." });
      }
      if (await isActiveMinistryMember(input.ministryId, input.personId, input.churchId)) {
        return { success: true, alreadyMember: true };
      }
      await assignPersonToMinistry({ ministryId: input.ministryId, personId: input.personId });
      return { success: true, alreadyMember: false };
    }),
  functionCatalog: protectedProcedure
    .input(z.object({ churchId: z.number(), ministryId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchAdministrator(ctx.user.id, input.churchId);
      const ministry = (await getMinistriesByChurch(input.churchId)).find((item) => item.id === input.ministryId);
      if (!ministry) throw new TRPCError({ code: "NOT_FOUND", message: "Ministério não encontrado." });
      return getMinistryFunctionCatalogFor(ministry);
    }),
  customFunctions: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchAdministrator(ctx.user.id, input.churchId);
      return getMinistryRoleDefinitionsByChurch(input.churchId);
    }),
  createCustomFunction: protectedProcedure
    .input(z.object({
      churchId: z.number(),
      ministryId: z.number().optional(),
      key: z.string().trim().min(2).max(100).regex(/^[a-z0-9_\-]+$/),
      name: z.string().trim().min(2).max(120),
      permissionPackage: z.enum(["member", "cell_leader", "consolidator", "visitor", "treasurer", "ministry_leader", "communication_leader"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const actor = await requireChurchAdministrator(ctx.user.id, input.churchId);
      if (input.ministryId && !(await getMinistriesByChurch(input.churchId)).some((item) => item.id === input.ministryId)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ministério inválido para esta igreja." });
      }
      const definition = await createMinistryRoleDefinition({ ...input, ministryId: input.ministryId ?? null, createdByChurchUserId: actor.id });
      return definition;
    }),
  personFunctions: protectedProcedure
    .input(z.object({ churchId: z.number(), personId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchAdministrator(ctx.user.id, input.churchId);
      const person = await getPersonById(input.personId, input.churchId);
      if (!person) throw new TRPCError({ code: "NOT_FOUND", message: "Pessoa não encontrada." });
      const assignments = await getMinistryRoleAssignmentsByPerson(input.personId, input.churchId);
      return assignments.map(({ assignment, ministry }) => {
        const definition = MINISTRY_FUNCTION_CATALOG.find((item) => item.key === assignment.roleKey);
        return {
          id: assignment.id,
          ministryId: ministry.id,
          ministryName: ministry.name,
          roleKey: assignment.roleKey,
          roleLabel: definition?.label ?? assignment.roleKey,
          grants: definition?.grants ?? [],
          assignedAt: assignment.assignedAt,
        };
      });
    }),
  assignFunction: protectedProcedure
    .input(z.object({ churchId: z.number(), personId: z.number(), ministryId: z.number(), roleKey: z.string().trim().min(2).max(100) }))
    .mutation(async ({ input, ctx }) => {
      const actor = await requireChurchAdministrator(ctx.user.id, input.churchId);
      const [person, ministry] = await Promise.all([
        getPersonById(input.personId, input.churchId),
        getMinistriesByChurch(input.churchId).then((items) => items.find((item) => item.id === input.ministryId)),
      ]);
      if (!person || !ministry) throw new TRPCError({ code: "BAD_REQUEST", message: "Pessoa ou Ministério inválido para esta igreja." });
      const allowed = getMinistryFunctionCatalogFor(ministry).some((item) => item.key === input.roleKey);
      if (!allowed) throw new TRPCError({ code: "BAD_REQUEST", message: "Essa função não é compatível com o Ministério selecionado." });
      if (!(await isActiveMinistryMember(input.ministryId, input.personId, input.churchId))) {
        await assignPersonToMinistry({ ministryId: input.ministryId, personId: input.personId });
      }
      return assignMinistryRole({ ...input, assignedByChurchUserId: actor.id });
    }),
  removeFunction: protectedProcedure
    .input(z.object({ churchId: z.number(), id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await requireChurchAdministrator(ctx.user.id, input.churchId);
      await deactivateMinistryRole(input.id, input.churchId);
      return { success: true };
    }),
  create: protectedProcedure
    .input(z.object({
      churchId: z.number(),
      name: z.string().min(1),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireChurchAdministrator(ctx.user.id, input.churchId);
      const db = await import("./db").then((m) => m.getDb());
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { ministries: ministriesTable } = await import("../drizzle/schema");
      await db.insert(ministriesTable).values({
        churchId: input.churchId,
        name: input.name,
        description: input.description ?? null,
        type: "outro",
      });
      return { success: true };
    }),
});

const schedulesRouter = router({
  list: protectedProcedure
    .input(z.object({ churchId: z.number(), month: z.number().optional(), year: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      const db = await import("./db").then((m) => m.getDb());
      if (!db) return [];
      const { scheduleItems } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const rows = await db
        .select()
        .from(scheduleItems)
        .where(eq(scheduleItems.churchId, input.churchId));
      // Filter by month/year in JS
      const now = new Date();
      const m = input.month ?? now.getMonth() + 1;
      const y = input.year ?? now.getFullYear();
      const filtered = rows.filter((r) => {
        const d = new Date(r.scheduledDate);
        return d.getMonth() + 1 === m && d.getFullYear() === y;
      });
      return filtered.map((item) => ({
        ...item,
        hasTimeConflict: Boolean(item.status !== "cancelada" && item.startTime && item.endTime && filtered.some((other) => other.status !== "cancelada" && other.id !== item.id && other.personId === item.personId && String(other.scheduledDate) === String(item.scheduledDate) && other.startTime && other.endTime && item.startTime! < other.endTime! && item.endTime! > other.startTime!)),
      }));
    }),
  create: protectedProcedure
    .input(z.object({
      churchId: z.number(),
      ministryId: z.number(),
      personId: z.number(),
      scheduledDate: z.string(),
      startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe um horário inicial válido."),
      endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe um horário final válido."),
      role: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireMinistryManagementPermission(ctx.user.id, input.churchId, input.ministryId);
      const [person, eligible] = await Promise.all([
        getPersonById(input.personId, input.churchId),
        isActiveMinistryMember(input.ministryId, input.personId, input.churchId),
      ]);
      if (!person || !eligible) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A pessoa precisa ser participante ativa deste Ministério antes de entrar na escala.",
        });
      }
      if (input.endTime <= input.startTime) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "O horário final precisa ser posterior ao horário inicial." });
      }
      const conflicts = await getScheduleTimeConflicts(input);
      if (conflicts.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Esta pessoa já possui outra escala em horário sobreposto nesta data." });
      }
      const db = await import("./db").then((m) => m.getDb());
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { scheduleItems } = await import("../drizzle/schema");
      await db.insert(scheduleItems).values({
        churchId: input.churchId,
        ministryId: input.ministryId,
        personId: input.personId,
        scheduledDate: new Date(input.scheduledDate + "T12:00:00"),
        startTime: input.startTime,
        endTime: input.endTime,
        role: input.role ?? null,
      });
      return { success: true };
    }),
  update: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      churchId: z.number().int().positive(),
      ministryId: z.number().int().positive(),
      personId: z.number().int().positive(),
      scheduledDate: z.string(),
      startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe um horário inicial válido."),
      endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe um horário final válido."),
      role: z.string().trim().max(100).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const existing = await getScheduleItemById(input.id, input.churchId);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Escala não encontrada nesta igreja." });
      if (existing.status === "cancelada") throw new TRPCError({ code: "BAD_REQUEST", message: "Uma Escala cancelada não pode ser editada. Crie uma nova Escala se necessário." });

      await requireMinistryManagementPermission(ctx.user.id, input.churchId, existing.ministryId);
      if (input.ministryId !== existing.ministryId) {
        await requireMinistryManagementPermission(ctx.user.id, input.churchId, input.ministryId);
      }
      const [person, eligible] = await Promise.all([
        getPersonById(input.personId, input.churchId),
        isActiveMinistryMember(input.ministryId, input.personId, input.churchId),
      ]);
      if (!person || !eligible) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A pessoa precisa ser participante ativa deste Ministério antes de entrar na escala." });
      }
      if (input.endTime <= input.startTime) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "O horário final precisa ser posterior ao horário inicial." });
      }
      const conflicts = await getScheduleTimeConflicts({ ...input, excludeScheduleItemId: input.id });
      if (conflicts.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Esta pessoa já possui outra escala em horário sobreposto nesta data." });
      }
      const updated = await updateScheduleItem({
        ...input,
        scheduledDate: new Date(`${input.scheduledDate}T12:00:00`),
        role: input.role || null,
      });
      if (!updated) throw new TRPCError({ code: "CONFLICT", message: "A Escala não pôde ser atualizada." });
      const impactedPersonIds = new Set([existing.personId, updated.personId]);
      const recipients = (await getChurchUsersByChurch(input.churchId))
        .filter((account) => account.active && account.personId !== null && impactedPersonIds.has(account.personId))
        .map((account) => account.id);
      const ministryName = (await getMinistriesByChurch(input.churchId)).find((ministry) => ministry.id === updated.ministryId)?.name ?? "Ministério";
      await emitNotificationWithoutBlocking({
        churchId: input.churchId,
        type: "escala_alterada",
        recipientChurchUserIds: recipients,
        title: "Sua Escala foi alterada",
        body: `A Escala de ${ministryName} para ${input.scheduledDate.split("-").reverse().join("/")} foi atualizada. Confira os novos detalhes no calendário.`,
        entityType: "schedule_item",
        entityId: updated.id,
        metadata: { ministryId: updated.ministryId, personId: updated.personId, scheduledDate: input.scheduledDate, startTime: updated.startTime, endTime: updated.endTime },
        dedupeKey: `escala-alterada:${updated.id}:${updated.ministryId}:${updated.personId}:${input.scheduledDate}:${updated.startTime}:${updated.endTime}:${updated.role ?? ""}`,
      });
      return updated;
    }),
  cancel: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      churchId: z.number().int().positive(),
      reason: z.string().trim().min(3, "Informe o motivo do cancelamento.").max(500),
    }))
    .mutation(async ({ input, ctx }) => {
      const existing = await getScheduleItemById(input.id, input.churchId);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Escala não encontrada nesta igreja." });
      if (existing.status === "cancelada") throw new TRPCError({ code: "CONFLICT", message: "Esta Escala já foi cancelada." });
      const authorization = await requireMinistryManagementPermission(ctx.user.id, input.churchId, existing.ministryId);
      const cancelled = await cancelScheduleItem({
        id: input.id,
        churchId: input.churchId,
        cancelledByChurchUserId: authorization.actor.id,
        cancelReason: input.reason,
      });
      if (!cancelled) throw new TRPCError({ code: "CONFLICT", message: "A Escala não pôde ser cancelada." });
      const recipients = (await getChurchUsersByChurch(input.churchId))
        .filter((account) => account.active && account.personId === existing.personId)
        .map((account) => account.id);
      const ministryName = (await getMinistriesByChurch(input.churchId)).find((ministry) => ministry.id === existing.ministryId)?.name ?? "Ministério";
      await emitNotificationWithoutBlocking({
        churchId: input.churchId,
        type: "escala_cancelada",
        recipientChurchUserIds: recipients,
        title: "Sua Escala foi cancelada",
        body: `A Escala de ${ministryName} para ${new Date(existing.scheduledDate).toLocaleDateString("pt-BR")} foi cancelada. Motivo: ${input.reason}`,
        entityType: "schedule_item",
        entityId: cancelled.id,
        metadata: { ministryId: existing.ministryId, personId: existing.personId, scheduledDate: existing.scheduledDate, cancelReason: input.reason },
        dedupeKey: `escala-cancelada:${cancelled.id}`,
      });
      return cancelled;
    }),
});

const libraryRouter = router({
  list: protectedProcedure
    .input(z.object({ churchId: z.number(), search: z.string().optional(), type: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      const db = await import("./db").then((m) => m.getDb());
      if (!db) return [];
      const { libraryItems } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const rows = await db.select().from(libraryItems).where(eq(libraryItems.churchId, input.churchId));
      let filtered = rows;
      if (input.search) {
        const s = input.search.toLowerCase();
        filtered = filtered.filter((r) => r.title.toLowerCase().includes(s) || (r.description ?? "").toLowerCase().includes(s));
      }
      if (input.type && input.type !== "Todos") {
        filtered = filtered.filter((r) => r.type === input.type);
      }
      return filtered;
    }),
  create: protectedProcedure
    .input(z.object({
      churchId: z.number(),
      title: z.string().min(1),
      type: z.enum(["pdf", "video", "apostila", "devocional"]),
      fileUrl: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      const db = await import("./db").then((m) => m.getDb());
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { libraryItems } = await import("../drizzle/schema");
      await db.insert(libraryItems).values({
        churchId: input.churchId,
        title: input.title,
        type: input.type,
        fileUrl: input.fileUrl ?? null,
        description: input.description ?? null,
      });
      return { success: true };
    }),
});

const announcementsRouter = router({
  list: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      return getAnnouncementsByChurch(input.churchId);
    }),

  create: protectedProcedure
    .input(
      z.object({
        churchId: z.number(),
        title: z.string().min(2),
        content: z.string().min(5),
        type: z.enum(["aviso", "evento", "comunicado", "devocional"]).default("aviso"),
        pinned: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      return createAnnouncement({ ...input, authorId: ctx.user.id });
    }),
});

const prayerRouter = router({
  list: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      return getPrayerRequestsByChurch(input.churchId);
    }),

  create: publicProcedure
    .input(
      z.object({
        churchId: z.number(),
        visitorName: z.string().optional(),
        visitorPhone: z.string().optional(),
        type: z.enum(["pedido", "testemunho"]).default("pedido"),
        content: z.string().min(5),
        isPrivate: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      const church = await getChurchById(input.churchId);
      if (!church?.active) throw new TRPCError({ code: "NOT_FOUND", message: "Igreja não encontrada." });
      return createPrayerRequest(input);
    }),
});

const dashboardRouter = router({
  stats: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      return getDashboardStats(input.churchId);
    }),

  radarEspiritual: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      return getRadarEspiritual(input.churchId);
    }),

  discipleshipFunnel: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      return getDiscipleshipFunnel(input.churchId);
    }),

  discipleshipTree: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      return getDiscipleshipTree(input.churchId);
    }),

  careAttention: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      return getCareAttentionByChurch(input.churchId);
    }),
});

// ─── CHURCH AUTH ROUTER ─────────────────────────────────────────────────────

const churchAuthRouter = router({
  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(6) }))
    .mutation(async ({ input }) => {
      const result = await loginChurchUser(input.email, input.password);
      if (!result) throw new TRPCError({ code: "UNAUTHORIZED", message: "Email ou senha inválidos" });
      return result;
    }),

  register: protectedProcedure
    .input(z.object({
      churchId: z.number(),
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      role: z.enum(["pastor_presidente","pastor_local","supervisor","lider","consolidador","diacono","secretario","tesoureiro","membro"]).optional(),
      personId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireChurchAdministrator(ctx.user.id, input.churchId);
      if (input.personId && !(await getPersonById(input.personId, input.churchId))) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A Pessoa selecionada não pertence a esta igreja." });
      }
      const user = await createChurchUser({
        churchId: input.churchId,
        name: input.name,
        email: input.email,
        password: input.password,
        role: input.role ?? "membro",
        personId: input.personId,
      });
      return { success: true, userId: user?.id };
    }),

  listUsers: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchAdministrator(ctx.user.id, input.churchId);
      return getChurchUsersByChurch(input.churchId);
    }),

  pendingRegistrations: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchAdministrator(ctx.user.id, input.churchId);
      return getPendingChurchUsers(input.churchId);
    }),

  resolveRegistration: protectedProcedure
    .input(z.object({
      churchId: z.number(),
      userId: z.number(),
      approved: z.boolean(),
      rejectionReason: z.string().min(3).max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireChurchAdministrator(ctx.user.id, input.churchId);
      if (!input.approved && !input.rejectionReason) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Informe o motivo da rejeição." });
      }
      const actorId = ctx.user.id < 0 ? Math.abs(ctx.user.id) : ctx.user.id;
      const user = await resolveChurchUserRegistration(input.userId, input.churchId, actorId, input.approved, input.rejectionReason);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Cadastro pendente não encontrado." });
      if (input.approved) {
        await emitNotificationWithoutBlocking({
          churchId: input.churchId,
          type: "pessoa_aprovada",
          recipientChurchUserIds: [user.id],
          title: "Seu cadastro foi aprovado",
          body: "Sua conta foi ativada pela liderança. Você já pode entrar na plataforma da sua igreja.",
          entityType: "church_user",
          entityId: user.id,
          dedupeKey: `pessoa-aprovada-${user.id}`,
        });
      }
      return user;
    }),

  effectiveRoles: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      const actor = await requireChurchMember(ctx.user.id, input.churchId);
      return getEffectiveChurchRoles(ctx.user.id, input.churchId, actor);
    }),

  linkPerson: protectedProcedure
    .input(z.object({ churchId: z.number(), userId: z.number(), personId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await requireChurchAdministrator(ctx.user.id, input.churchId);
      const person = await getPersonById(input.personId, input.churchId);
      if (!person) throw new TRPCError({ code: "BAD_REQUEST", message: "A Pessoa selecionada não pertence a esta igreja." });
      const user = await linkChurchUserToPerson(input.userId, input.churchId, input.personId);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Usuário da igreja não encontrado." });
      return user;
    }),

  updateAssignment: protectedProcedure
    .input(z.object({
      churchId: z.number(),
      userId: z.number(),
      personId: z.number(),
      role: z.enum(["pastor_presidente","pastor_local","supervisor","lider","consolidador","diacono","secretario","tesoureiro","membro"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const manager = await requireChurchRoleManager(ctx.user.id, input.churchId);
      if (ctx.user.id < 0 && Math.abs(ctx.user.id) === input.userId && manager.role !== input.role) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Não altere a própria função. Peça a outro Pastor para realizar essa mudança." });
      }
      const person = await getPersonById(input.personId, input.churchId);
      if (!person) throw new TRPCError({ code: "BAD_REQUEST", message: "A Pessoa selecionada não pertence a esta igreja." });
      const user = await updateChurchUserAssignment(input.userId, input.churchId, { personId: input.personId, role: input.role });
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Usuário da igreja não encontrado." });
      return user;
    }),

  updateComplementaryRoles: protectedProcedure
    .input(z.object({
      churchId: z.number(),
      userId: z.number(),
      roles: z.array(z.enum(["consolidador", "diacono", "tesoureiro", "levita"])),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireChurchRoleManager(ctx.user.id, input.churchId);
      if (ctx.user.id < 0 && Math.abs(ctx.user.id) === input.userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Peça a outro Pastor para alterar suas próprias funções complementares." });
      }
      const churchUser = await getActiveChurchUserById(input.userId);
      if (!churchUser || churchUser.churchId !== input.churchId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Usuário da igreja não encontrado." });
      }
      const complementaryRoles = input.roles.filter((role) => role !== churchUser.role);
      const roles = await setComplementaryRolesForChurchUser(input.userId, input.churchId, complementaryRoles);
      return { userId: input.userId, roles };
    }),
});

// ─── ADMIN AUTH ROUTER ────────────────────────────────────────────────────────

const adminAuthRouter = router({
  bootstrapStatus: publicProcedure.query(async () => ({
    available: await isInitialSuperAdminSetupAvailable(),
  })),

  bootstrap: publicProcedure
    .input(z.object({
      name: z.string().trim().min(2).max(255),
      email: z.string().email(),
      password: z.string().min(12, "A senha deve ter ao menos 12 caracteres"),
      setupToken: z.string().min(16),
    }))
    .mutation(async ({ input }) => {
      const result = await createInitialSuperAdmin(input);
      if (!result.ok) {
        throw new TRPCError({
          code: result.reason === "invalid_setup_token" ? "FORBIDDEN" : "CONFLICT",
          message: result.reason === "invalid_setup_token"
            ? "Código de configuração inválido"
            : "O Super Admin inicial já foi configurado",
        });
      }
      const login = await loginSuperAdmin(input.email, input.password);
      if (!login) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível iniciar a sessão administrativa" });
      return login;
    }),

  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(6) }))
    .mutation(async ({ input }) => {
      const result = await loginSuperAdmin(input.email, input.password);
      if (!result) throw new TRPCError({ code: "UNAUTHORIZED", message: "Credenciais inválidas" });
      return result;
    }),

  seed: adminProcedure
    .input(z.object({ name: z.string(), email: z.string().email(), password: z.string().min(8) }))
    .mutation(async ({ input }) => {
      await createSuperAdmin(input.name, input.email, input.password);
      return { success: true };
    }),
});

// ─── SUPER ADMIN ROUTER ───────────────────────────────────────────────────────

const superAdminRouter = router({
  stats: adminProcedure.query(() => getGlobalStats()),

  churches: adminProcedure.query(() => getAllChurchesAdmin()),

  pendingRegistrations: adminProcedure.query(() => getPendingRegistrations()),

  reviewRegistration: adminProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["approved", "rejected", "suspended"]),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return updateChurchRegistration(input.id, input.status, input.reason);
  }),
});

const diagnosticsRouter = router({
  recent: adminProcedure
    .input(z.object({ limit: z.number().int().min(1).max(200).optional() }).optional())
    .query(({ input }) => getStartupDiagnostics(input?.limit ?? 80)),
});

// ─── VISITOR ROUTER ───────────────────────────────────────────────────────────

const visitorRouter = router({
  submit: publicProcedure
    .input(z.object({
      churchSlug: z.string(),
      name: z.string().min(2),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      type: z.enum(["pedido_oracao","visita_pastoral","primeira_visita","interesse_participar"]),
      message: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const church = await getChurchBySlug(input.churchSlug);
      if (!church?.active) throw new TRPCError({ code: "NOT_FOUND", message: "Igreja não encontrada" });
      return createVisitorLead({ ...input, churchId: church.id });
    }),

  getLeads: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchAdministrator(ctx.user.id, input.churchId);
      return getVisitorLeadsByChurch(input.churchId);
    }),
});

// ─── REGISTER ROUTER ──────────────────────────────────────────────────────────

const registerRouter = router({
  church: publicProcedure
    .input(z.object({
      churchName: z.string().min(2),
      slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, "Apenas letras minúsculas, números e hífens"),
      city: z.string().optional(),
      state: z.string().length(2).optional(),
      phone: z.string().optional(),
      email: z.string().email(),
      pastorName: z.string().min(2),
      pastorEmail: z.string().email(),
      pastorPassword: z.string().min(8),
    }))
    .mutation(async ({ input }) => {
      // 1. Criar a igreja
      const church = await createChurch({
        name: input.churchName,
        slug: input.slug,
        city: input.city,
        state: input.state,
        phone: input.phone,
        email: input.email,
        active: false,
      });
      if (!church?.id) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao criar a igreja" });

      // 2. Criar o Pastor Presidente
      await createChurchUser({
        churchId: church.id,
        name: input.pastorName,
        email: input.pastorEmail,
        password: input.pastorPassword,
        role: "pastor_presidente",
      });

      // 3. Criar registro de aprovação (status: pending)
      await createChurchRegistration(church.id);

      return { success: true, churchId: church.id, slug: input.slug };
    }),
  disciple: publicProcedure
    .input(z.object({
      churchSlug: z.string().min(3).max(100),
      name: z.string().min(2).max(255),
      email: z.string().email(),
      password: z.string().min(8),
      phone: z.string().max(20).optional(),
      whatsapp: z.string().max(20).optional(),
    }))
    .mutation(async ({ input }) => {
      const church = await getChurchBySlug(input.churchSlug);
      if (!church?.active) throw new TRPCError({ code: "NOT_FOUND", message: "Igreja não encontrada ou indisponível." });
      const existingIdentity = await findPossiblePeopleByIdentity(church.id, {
        fullName: input.name,
        phone: input.phone || input.whatsapp,
      });
      if (existingIdentity.length) throw new TRPCError({ code: "CONFLICT", message: "Já existe uma Pessoa com estes dados nesta igreja. Solicite acesso à liderança." });
      const person = await createPerson({
        churchId: church.id,
        fullName: input.name,
        email: input.email.toLowerCase(),
        phone: input.phone || null,
        whatsapp: input.whatsapp || null,
        active: true,
      });
      if (!person) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível criar a ficha do discípulo." });
      const user = await createChurchUser({
        churchId: church.id,
        name: input.name,
        email: input.email,
        password: input.password,
        role: "membro",
        personId: person.id,
        active: false,
        registrationStatus: "pending",
      });
      const recipients = (await getChurchUsersByChurch(church.id))
        .filter((churchUser) => churchUser.active && ["pastor_presidente", "pastor_local", "secretario"].includes(churchUser.role))
        .map((churchUser) => churchUser.id);
      await emitNotificationWithoutBlocking({
        churchId: church.id,
        type: "cadastro_pendente",
        recipientChurchUserIds: recipients,
        title: "Novo cadastro aguardando aprovação",
        body: `${input.name} solicitou acesso à plataforma. Revise o cadastro em Configurações → Perfis e Hierarquia.`,
        entityType: "church_user",
        entityId: user.id,
        metadata: { personId: person.id },
        dedupeKey: `cadastro-pendente-${user.id}`,
      });
      return { success: true, userId: user.id, message: "Cadastro recebido. Aguarde a aprovação da liderança." };
    }),
});
// ─── INVITE ROUTER ───────────────────────────────────────────────────────────
const inviteRouter = router({
  create: protectedProcedure
    .input(z.object({ churchId: z.number(), email: z.string().email(), name: z.string().min(1), role: z.enum(["pastor_presidente","pastor_local","supervisor","lider","consolidador","diacono","secretario","tesoureiro","membro"]), personId: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      await requireChurchAdministrator(ctx.user.id, input.churchId);
      if (input.personId && !(await getPersonById(input.personId, input.churchId))) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A Pessoa selecionada não pertence a esta igreja." });
      }
      const tempPassword = Math.random().toString(36).slice(-8);
      const { createChurchUser } = await import("./auth");
      const user = await createChurchUser({ churchId: input.churchId, name: input.name, email: input.email, password: tempPassword, role: input.role, personId: input.personId });
            const { notifyOwner } = await import("./_core/notification");
      await notifyOwner({ title: `Novo convite: ${input.name}`, content: `Usuário ${input.name} (${input.email}) foi convidado para a igreja ${input.churchId} com o perfil ${input.role}. Senha temporária: ${tempPassword}` });
      return { success: true, userId: user.id, tempPassword };
    }),
});
// ─── REPORTS ROUTER ──────────────────────────────────────────────────────────
const reportsRouter = router({
  dashboard: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchAdministrator(ctx.user.id, input.churchId);
      const church = await getChurchById(input.churchId);
      const stats = await getDashboardStats(input.churchId);
      const funnel = await getDiscipleshipFunnel(input.churchId);
      const radar = await getRadarEspiritual(input.churchId);
      const now = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
      const html = generateReportHTML({
        churchName: church?.name || "Igreja",
        generatedAt: now,
        title: "Relatório Executivo",
        subtitle: "Indicadores de crescimento e discipulado",
        sections: [
          {
            title: "Indicadores Gerais",
            type: "kpi",
            kpis: [
              { label: "Total de Membros", value: stats?.totalMembers ?? 0, color: "#1e3a5f" },
              { label: "Novas Almas", value: stats?.newSouls ?? 0, color: "#c9a84c" },
              { label: "Células Ativas", value: stats?.totalCells ?? 0, color: "#16a34a" },
              { label: "Em Consolidação", value: stats?.consolidated ?? 0, color: "#7c3aed" },
              { label: "Líderes", value: stats?.totalLeaders ?? 0, color: "#dc2626" },
              { label: "Batizados", value: stats?.baptized ?? 0, color: "#0891b2" },
            ],
          },
          {
            title: "Funil de Discipulado",
            type: "table",
            headers: ["Etapa", "Quantidade"],
            rows: (funnel ?? []).map((f: { stage: string; count: number }) => [f.stage, f.count]),
          },
          {
            title: "Radar Espiritual — Alertas",
            type: "list",
            items: [
              `Sem célula: ${radar?.semCelula ?? 0} pessoas`,
              `Sem discipulador: ${radar?.semDiscipulador ?? 0} pessoas`,
              `Sem consolidação: ${radar?.semConsolidacao ?? 0} pessoas`,
            ],
          },
        ],
      });
      return { base64: htmlToBase64(html), filename: `relatorio-executivo-${Date.now()}.html` };
    }),

  cells: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchAdministrator(ctx.user.id, input.churchId);
      const church = await getChurchById(input.churchId);
      const cells = await getCellsByChurch(input.churchId);
      const now = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
      const html = generateReportHTML({
        churchName: church?.name || "Igreja",
        generatedAt: now,
        title: "Relatório de Células",
        subtitle: "Visão geral das células e membros",
        sections: [
          {
            title: "Indicadores de Células",
            type: "kpi",
            kpis: [
              { label: "Total de Células", value: cells?.length ?? 0, color: "#1e3a5f" },
            ],
          },
          {
            title: "Lista de Células",
            type: "table",
            headers: ["Nome", "Bairro", "Dia de Reunião"],
            rows: (cells ?? []).map((c: { name: string; neighborhood: string | null; meetingDay: string | null }) => [
              c.name,
              c.neighborhood || "-",
              c.meetingDay || "-",
            ]),
          },
        ],
      });
      return { base64: htmlToBase64(html), filename: `relatorio-celulas-${Date.now()}.html` };
    }),

  consolidation: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchAdministrator(ctx.user.id, input.churchId);
      const church = await getChurchById(input.churchId);
      const cons = await getConsolidationsByChurch(input.churchId);
      const now = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
      const done = (cons ?? []).filter((c: { status: string }) => c.status === "concluido").length;
      const pending = (cons ?? []).filter((c: { status: string }) => c.status === "em_andamento").length;
      const html = generateReportHTML({
        churchName: church?.name || "Igreja",
        generatedAt: now,
        title: "Relatório de Consolidação",
        subtitle: "Acompanhamento de novas almas",
        sections: [
          {
            title: "Indicadores",
            type: "kpi",
            kpis: [
              { label: "Total", value: cons?.length ?? 0, color: "#1e3a5f" },
              { label: "Concluídos", value: done, color: "#16a34a" },
              { label: "Em Andamento", value: pending, color: "#c9a84c" },
            ],
          },
          {
            title: "Detalhamento",
            type: "table",
            headers: ["Nova Alma", "Consolidador", "Status", "Etapa"],
            rows: (cons ?? []).slice(0, 50).map((c) => [
              c.soulId?.toString() || "-",
              c.consolidatorId?.toString() || "-",
              c.status || "-",
              c.callMade ? "Ligou" : "Pendente",
            ]),
          },
        ],
      });
      return { base64: htmlToBase64(html), filename: `relatorio-consolidacao-${Date.now()}.html` };
    }),
});

// ─── ONBOARDING ROUTER ──────────────────────────────────────────────────────
const onboardingRouter = router({
  get: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      return getOnboardingProgress(input.churchId);
    }),
  update: protectedProcedure
    .input(z.object({
      churchId: z.number(),
      stepWelcome: z.boolean().optional(),
      stepImportMembers: z.boolean().optional(),
      stepCreateCell: z.boolean().optional(),
      stepInviteLeaders: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireChurchAdministrator(ctx.user.id, input.churchId);
      return upsertOnboardingProgress(input);
    }),
  importCSV: protectedProcedure
    .input(z.object({
      churchId: z.number(),
      csvData: z.array(z.object({
        fullName: z.string(),
        email: z.string().optional(),
        phone: z.string().optional(),
        birthDate: z.string().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireChurchAdministrator(ctx.user.id, input.churchId);
      const count = await importPeopleFromCSV(input.churchId, input.csvData);
      await upsertOnboardingProgress({ churchId: input.churchId, stepImportMembers: true });
      return { success: true, imported: count };
    }),
});

// ─── ESCOLA DE FUNDAMENTOS ROUTER ──────────────────────────────────────────
const escolaFundamentosRouter = router({
  listCourses: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      return getCoursesByChurch(input.churchId);
    }),
  getEnrollments: protectedProcedure
    .input(z.object({ courseId: z.number(), churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      return getCourseEnrollments(input.courseId, input.churchId);
    }),
  enroll: protectedProcedure
    .input(z.object({ courseId: z.number(), personId: z.number(), churchId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await requireChurchAdministrator(ctx.user.id, input.churchId);
      const [course, person] = await Promise.all([
        getCoursesByChurch(input.churchId).then((items) => items.find((item) => item.id === input.courseId)),
        getPersonById(input.personId, input.churchId),
      ]);
      if (!course || !person) throw new TRPCError({ code: "BAD_REQUEST", message: "Curso e Pessoa devem pertencer a esta igreja." });
      await enrollInCourse({ courseId: input.courseId, personId: input.personId });
      return { success: true };
    }),
  updateEnrollment: protectedProcedure
    .input(z.object({
      id: z.number(),
      churchId: z.number(),
      status: z.enum(["matriculado", "em_andamento", "concluido"]).optional(),
      completedAt: z.date().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireChurchAdministrator(ctx.user.id, input.churchId);
      if (!(await getCourseEnrollmentById(input.id, input.churchId))) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Matrícula não encontrada nesta igreja." });
      }
      await updateCourseEnrollment(input.id, { status: input.status, completedAt: input.completedAt });
      return { success: true };
    }),
});

// ─── BATISMO ROUTER ───────────────────────────────────────────────────────────
const batismoRouter = router({
  listClasses: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      return getBaptismClassesByChurch(input.churchId);
    }),
  getEnrollments: protectedProcedure
    .input(z.object({ classId: z.number(), churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      return getBaptismEnrollments(input.classId, input.churchId);
    }),
  createClass: protectedProcedure
    .input(z.object({
      churchId: z.number(),
      name: z.string().min(2),
      date: z.string(),
      location: z.string().optional(),
      pastor: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      await createBaptismClass(input);
      return { success: true };
    }),
  enroll: protectedProcedure
    .input(z.object({ baptismClassId: z.number(), personId: z.number(), churchId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await requireChurchAdministrator(ctx.user.id, input.churchId);
      const [baptismClass, person] = await Promise.all([
        getBaptismClassesByChurch(input.churchId).then((items) => items.find((item) => item.id === input.baptismClassId)),
        getPersonById(input.personId, input.churchId),
      ]);
      if (!baptismClass || !person) throw new TRPCError({ code: "BAD_REQUEST", message: "Turma e Pessoa devem pertencer a esta igreja." });
      await enrollInBaptism(input);
      return { success: true };
    }),
  updateEnrollment: protectedProcedure
    .input(z.object({
      id: z.number(),
      churchId: z.number(),
      status: z.enum(["inscrito", "participou", "concluiu", "cancelado"]).optional(),
      completedAt: z.date().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      await updateBaptismEnrollment(input.id, input.churchId, { status: input.status, completedAt: input.completedAt });
      return { success: true };
    }),
});

// ─── ENCONTRO COM DEUS ROUTER ─────────────────────────────────────────────────
const encontroRouter = router({
  listEvents: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      return getEncounterEventsByChurch(input.churchId);
    }),
  getEnrollments: protectedProcedure
    .input(z.object({ eventId: z.number(), churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      return getEncounterEnrollments(input.eventId, input.churchId);
    }),
  createEvent: protectedProcedure
    .input(z.object({
      churchId: z.number(),
      name: z.string().min(2),
      date: z.string(),
      endDate: z.string().optional(),
      location: z.string().optional(),
      maxParticipants: z.number().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      await createEncounterEvent(input);
      return { success: true };
    }),
  enroll: protectedProcedure
    .input(z.object({ encounterEventId: z.number(), personId: z.number(), churchId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await requireChurchAdministrator(ctx.user.id, input.churchId);
      const [event, person] = await Promise.all([
        getEncounterEventsByChurch(input.churchId).then((items) => items.find((item) => item.id === input.encounterEventId)),
        getPersonById(input.personId, input.churchId),
      ]);
      if (!event || !person) throw new TRPCError({ code: "BAD_REQUEST", message: "Encontro e Pessoa devem pertencer a esta igreja." });
      await enrollInEncounter(input);
      return { success: true };
    }),
  updateEnrollment: protectedProcedure
    .input(z.object({
      id: z.number(),
      churchId: z.number(),
      status: z.enum(["inscrito", "confirmado", "participou", "concluiu", "cancelado"]).optional(),
      completedAt: z.date().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      await updateEncounterEnrollment(input.id, input.churchId, { status: input.status, completedAt: input.completedAt });
      return { success: true };
    }),
});

// ─── ESCOLA DE LÍDERES ROUTER ─────────────────────────────────────────────────
const escolaLideresRouter = router({
  listClasses: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      return getLeadershipClassesByChurch(input.churchId);
    }),
  getEnrollments: protectedProcedure
    .input(z.object({ classId: z.number(), churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      return getLeadershipEnrollments(input.classId, input.churchId);
    }),
  createClass: protectedProcedure
    .input(z.object({
      churchId: z.number(),
      name: z.string().min(2),
      period: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      pastor: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      await createLeadershipClass(input);
      return { success: true };
    }),
  enroll: protectedProcedure
    .input(z.object({ classId: z.number(), personId: z.number(), churchId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await requireChurchAdministrator(ctx.user.id, input.churchId);
      const [leadershipClass, person] = await Promise.all([
        getLeadershipClassesByChurch(input.churchId).then((items) => items.find((item) => item.id === input.classId)),
        getPersonById(input.personId, input.churchId),
      ]);
      if (!leadershipClass || !person) throw new TRPCError({ code: "BAD_REQUEST", message: "Turma e Pessoa devem pertencer a esta igreja." });
      await enrollInLeadershipSchool(input);
      return { success: true };
    }),
  updateEnrollment: protectedProcedure
    .input(z.object({
      id: z.number(),
      churchId: z.number(),
      status: z.enum(["matriculado", "lider_em_formacao", "concluido", "cancelado"]).optional(),
      grade: z.number().optional(),
      attendance: z.number().optional(),
      completedAt: z.date().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      await updateLeadershipEnrollment(input.id, input.churchId, {
        status: input.status,
        grade: input.grade,
        attendance: input.attendance,
        completedAt: input.completedAt,
      });
      return { success: true };
    }),
});

// ─── LIDERANÇA ROUTER ─────────────────────────────────────────────────────────
const liderancaRouter = router({
  list: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      return getLeadershipHistory(input.churchId);
    }),
  getByPerson: protectedProcedure
    .input(z.object({ personId: z.number(), churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      return getLeadershipHistoryByPerson(input.personId, input.churchId);
    }),
  add: protectedProcedure
    .input(z.object({
      churchId: z.number(),
      personId: z.number(),
      role: z.enum(["pastor_presidente","pastor_local","supervisor","lider","consolidador","diacono","secretario","tesoureiro","membro"]),
      startDate: z.string(),
      endDate: z.string().optional(),
      ministry: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      await addLeadershipHistory(input);
      return { success: true };
    }),
});

// ─── ACONSELHAMENTO ROUTER ────────────────────────────────────────────────────
const aconselhamentoRouter = router({
  list: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      const authorization = await requireCounselingRole(ctx.user.id, input.churchId);
      return getCounselingSessionsByChurch(input.churchId, authorization.hasFullAccess ? undefined : authorization.actor.personId ?? -1);
    }),
  create: protectedProcedure
    .input(z.object({
      churchId: z.number(),
      personId: z.number(),
      counselorId: z.number(),
      scheduledAt: z.date(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const authorization = await requireCounselingRole(ctx.user.id, input.churchId);
      const [person, counselor] = await Promise.all([
        getPersonById(input.personId, input.churchId),
        getPersonById(input.counselorId, input.churchId),
      ]);
      if (!person || !counselor) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Pessoa e aconselhador devem pertencer a esta igreja." });
      }
      if (!authorization.hasFullAccess && authorization.actor.personId !== input.counselorId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Supervisores só podem criar sessões atribuídas a si mesmos." });
      }
      await createCounselingSession(input);
      return { success: true };
    }),
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      churchId: z.number(),
      status: z.enum(["agendado", "realizado", "cancelado"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireCounselingSessionAccess(ctx.user.id, input.churchId, input.id);
      await updateCounselingSession(input.id, input.churchId, { status: input.status, notes: input.notes });
      return { success: true };
    }),
  getNotes: protectedProcedure
    .input(z.object({ sessionId: z.number(), churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireCounselingSessionAccess(ctx.user.id, input.churchId, input.sessionId);
      return getCounselingNotes(input.sessionId, input.churchId);
    }),
  addNote: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      churchId: z.number(),
      content: z.string().min(1),
      confidential: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireCounselingSessionAccess(ctx.user.id, input.churchId, input.sessionId);
      await addCounselingNote({
        sessionId: input.sessionId,
        churchId: input.churchId,
        authorId: ctx.user.id,
        content: input.content,
        confidential: input.confidential ?? true,
      });
      return { success: true };
    }),
});

// ─── COMUNICAÇÃO ROUTER ───────────────────────────────────────────────────────
const comunicacaoRouter = router({
  list: protectedProcedure
    .input(z.object({ churchId: z.number(), limit: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      await requireChurchAdministrator(ctx.user.id, input.churchId);
      return getCommunicationLogs(input.churchId, input.limit ?? 50);
    }),
  send: protectedProcedure
    .input(z.object({
      churchId: z.number(),
      type: z.enum(["push", "email", "whatsapp", "sms"]),
      category: z.enum(["boas_vindas","aniversario","lembrete_evento","lembrete_celula","convite","aviso","outro"]),
      recipientPersonId: z.number().optional(),
      recipientName: z.string().optional(),
      title: z.string().optional(),
      message: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireChurchAdministrator(ctx.user.id, input.churchId);
      if (input.recipientPersonId && !(await getPersonById(input.recipientPersonId, input.churchId))) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Destinatário não pertence a esta igreja." });
      }
      await logCommunication({ ...input, status: "enviado" });
      return { success: true };
    }),
});

// ─── APP ROUTER ───────────────────────────────────────────────────────────────

// ─── CERTIFICATES ROUTER ─────────────────────────────────────────────────────────────────────────────────────

const certificatesRouter = router({
  // Busca a configuração de certificado da igreja
  getConfig: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      const church = await getChurchById(input.churchId);
      if (!church) throw new TRPCError({ code: "NOT_FOUND" });
      return {
        pastorName: church.certPastorName ?? "",
        logoUrl: church.certLogoUrl ?? "",
        verseFundamentos: church.certVerseFundamentos ?? "",
        verseBatismo: church.certVerseBatismo ?? "",
        verseLideres: church.certVerseLideres ?? "",
        signatureLabel: church.certSignatureLabel ?? "Pastor(a) Presidente",
      };
    }),

  // Salva a configuração de certificado da igreja
  saveConfig: protectedProcedure
    .input(
      z.object({
        churchId: z.number(),
        pastorName: z.string().max(255).optional(),
        logoUrl: z.string().max(2048).optional(),
        verseFundamentos: z.string().max(500).optional(),
        verseBatismo: z.string().max(500).optional(),
        verseLideres: z.string().max(500).optional(),
        signatureLabel: z.string().max(100).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requireChurchAdministrator(ctx.user.id, input.churchId);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { churches: churchesTable } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await db
        .update(churchesTable)
        .set({
          certPastorName: input.pastorName,
          certLogoUrl: input.logoUrl,
          certVerseFundamentos: input.verseFundamentos,
          certVerseBatismo: input.verseBatismo,
          certVerseLideres: input.verseLideres,
          certSignatureLabel: input.signatureLabel,
        })
        .where(eq(churchesTable.id, input.churchId));
      return { success: true };
    }),

  // Gera o PDF do certificado
  generate: protectedProcedure
    .input(
      z.object({
        type: z.enum(["fundamentos", "batismo", "lideres"]),
        memberName: z.string().min(1),
        churchId: z.number(),
        // IDs opcionais para validar conclusão no backend
        enrollmentId: z.number().optional(),
        personId: z.number().optional(),
        courseName: z.string().optional(),
        className: z.string().optional(),
        pastorName: z.string().optional(),
        date: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);

      // Validar que a pessoa pertence à igreja (se personId fornecido)
      if (input.personId) {
        const { getDb: getDbInner } = await import("./db");
        const { people } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        const db = await getDbInner();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });
        const [person] = await db
          .select({ id: people.id })
          .from(people)
          .where(and(eq(people.id, input.personId), eq(people.churchId, input.churchId)))
          .limit(1);
        if (!person) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Pessoa não encontrada nesta igreja" });
        }
      }

      const church = await getChurchById(input.churchId);
      const churchName = church?.name ?? "Igreja";

      // Usar dados de personalização da igreja
      const pastorName = input.pastorName ?? church?.certPastorName ?? undefined;
      const signatureLabel = church?.certSignatureLabel ?? "Pastor(a) Presidente";
      const logoUrl = church?.certLogoUrl ?? undefined;
      const verse =
        input.type === "fundamentos"
          ? (church?.certVerseFundamentos ?? undefined)
          : input.type === "batismo"
            ? (church?.certVerseBatismo ?? undefined)
            : (church?.certVerseLideres ?? undefined);

      const { generateCertificatePDF } = await import("./certificates");
      const { storagePut } = await import("./storage");

      const pdfBytes = await generateCertificatePDF({
        type: input.type,
        memberName: input.memberName,
        churchName,
        pastorName,
        signatureLabel,
        logoUrl,
        verse,
        courseName: input.courseName,
        className: input.className,
        date: input.date,
      });

      const timestamp = Date.now();
      const safeName = input.memberName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
      const fileKey = `churches/${input.churchId}/certificates/${input.type}-${safeName}-${timestamp}.pdf`;

      const { url } = await storagePut(fileKey, Buffer.from(pdfBytes), "application/pdf");

      return { url, fileName: `certificado-${input.type}-${safeName}.pdf` };
    }),
});

// ─── TESOURARIA ────────────────────────────────────────────────────────────────
const financialDateInput = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.");
const financialTransactionInput = z.object({
  churchId: z.number().int().positive(),
  accountId: z.number().int().positive(),
  categoryId: z.number().int().positive(),
  type: z.enum(["entrada", "saida"]),
  amountCents: z.number().int().positive("O valor deve ser maior que zero."),
  transactionDate: financialDateInput,
  paymentMethod: z.enum(["dinheiro", "pix", "transferencia", "cartao", "cheque", "outro"]),
  contributorPersonId: z.number().int().positive().optional(),
  contributorName: z.string().trim().min(2).max(255).optional(),
  description: z.string().trim().max(2000).optional(),
  reference: z.string().trim().max(160).optional(),
});

async function validateFinancialReferences(input: z.infer<typeof financialTransactionInput>) {
  const [account, category, contributor] = await Promise.all([
    getFinancialAccountById(input.accountId, input.churchId),
    getFinancialCategoryById(input.categoryId, input.churchId),
    input.contributorPersonId ? getPersonById(input.contributorPersonId, input.churchId) : Promise.resolve(null),
  ]);
  if (!account || !category) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Conta ou categoria financeira não encontrada." });
  }
  if (category.type !== input.type) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "A categoria precisa ter o mesmo tipo do lançamento." });
  }
  if (input.contributorPersonId && !contributor) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "A Pessoa contribuinte não pertence a esta igreja." });
  }
  if (["outra_entrada", "outra_saida"].includes(category.key) && !input.description?.trim()) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Descreva o lançamento usando uma categoria manual." });
  }
  if (await isFinancialPeriodClosed(input.churchId, input.transactionDate)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "O período financeiro desta data está fechado." });
  }
  return { account, category };
}

const treasuryRouter = router({
  overview: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), startDate: financialDateInput, endDate: financialDateInput, accountId: z.number().int().positive().optional() }))
    .query(async ({ input, ctx }) => {
      await requireTreasuryAccess(ctx.user.id, input.churchId);
      return getTreasuryOverview(input);
    }),

  accounts: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      await requireTreasuryAccess(ctx.user.id, input.churchId);
      return getFinancialAccountsByChurch(input.churchId);
    }),

  categories: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), type: z.enum(["entrada", "saida"]).optional() }))
    .query(async ({ input, ctx }) => {
      await requireTreasuryAccess(ctx.user.id, input.churchId);
      return getFinancialCategoriesByChurch(input.churchId, input.type);
    }),

  periodClosure: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), periodStart: financialDateInput }))
    .query(async ({ input, ctx }) => {
      await requireTreasuryAccess(ctx.user.id, input.churchId);
      return getFinancialPeriodClosure(input.churchId, input.periodStart);
    }),

  receipt: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      await requireTreasuryAccess(ctx.user.id, input.churchId);
      const receipt = await getFinancialReceiptData(input.id, input.churchId);
      if (!receipt) throw new TRPCError({ code: "NOT_FOUND", message: "Lançamento financeiro não encontrado." });
      if (receipt.transaction.type !== "entrada" || receipt.transaction.status !== "confirmado") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Recibos estão disponíveis apenas para entradas confirmadas." });
      }
      return receipt;
    }),

  reconciliation: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), accountId: z.number().int().positive(), periodStart: financialDateInput, periodEnd: financialDateInput }))
    .query(async ({ input, ctx }) => {
      await requireTreasuryAccess(ctx.user.id, input.churchId);
      const account = await getFinancialAccountById(input.accountId, input.churchId);
      if (!account || account.type !== "banco") throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione uma conta bancária desta igreja." });
      const bookBalanceCents = await getBookBalanceAt({ churchId: input.churchId, accountId: input.accountId, endDate: input.periodEnd });
      return { reconciliation: await getFinancialReconciliation(input), bookBalanceCents };
    }),

  reconciliationAttachments: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), reconciliationId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      await requireTreasuryAccess(ctx.user.id, input.churchId);
      const reconciliation = await getFinancialReconciliationById(input.reconciliationId, input.churchId);
      if (!reconciliation) throw new TRPCError({ code: "NOT_FOUND", message: "Conciliação bancária não encontrada." });
      return getFinancialReconciliationAttachments(input.reconciliationId, input.churchId);
    }),

  removeReconciliationAttachment: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), reconciliationId: z.number().int().positive(), attachmentId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      await requireTreasuryAccess(ctx.user.id, input.churchId);
      const reconciliation = await getFinancialReconciliationById(input.reconciliationId, input.churchId);
      if (!reconciliation) throw new TRPCError({ code: "NOT_FOUND", message: "Conciliação bancária não encontrada." });
      const removed = await removeFinancialReconciliationAttachment({ id: input.attachmentId, reconciliationId: input.reconciliationId, churchId: input.churchId });
      if (!removed) throw new TRPCError({ code: "NOT_FOUND", message: "Comprovante não encontrado nesta conciliação." });
      return { success: true };
    }),

  saveReconciliation: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), accountId: z.number().int().positive(), periodStart: financialDateInput, periodEnd: financialDateInput, bankClosingBalanceCents: z.number().int(), notes: z.string().trim().max(2000).optional() }))
    .mutation(async ({ input, ctx }) => {
      const access = await requireTreasuryAccess(ctx.user.id, input.churchId);
      if (input.periodEnd < input.periodStart) throw new TRPCError({ code: "BAD_REQUEST", message: "O término do período deve ser posterior ao início." });
      const account = await getFinancialAccountById(input.accountId, input.churchId);
      if (!account || account.type !== "banco") throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione uma conta bancária desta igreja." });
      const bookBalanceCents = await getBookBalanceAt({ churchId: input.churchId, accountId: input.accountId, endDate: input.periodEnd });
      if (bookBalanceCents === null) throw new TRPCError({ code: "NOT_FOUND", message: "Conta bancária não encontrada." });
      const differenceCents = input.bankClosingBalanceCents - bookBalanceCents;
      return saveFinancialReconciliation({ ...input, bookBalanceCents, differenceCents, status: differenceCents === 0 ? "conciliada" : "com_divergencia", actorChurchUserId: access.actor.id });
    }),

  createAccount: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), name: z.string().trim().min(2).max(120), type: z.enum(["caixa", "banco", "outro"]), openingBalanceCents: z.number().int().min(0).default(0) }))
    .mutation(async ({ input, ctx }) => {
      const access = await requireTreasuryAccess(ctx.user.id, input.churchId);
      if (!access.canManageStructure) throw new TRPCError({ code: "FORBIDDEN", message: "Somente Pastores podem criar contas financeiras." });
      return createFinancialAccount(input);
    }),

  createCategory: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), type: z.enum(["entrada", "saida"]), name: z.string().trim().min(2).max(120) }))
    .mutation(async ({ input, ctx }) => {
      const access = await requireTreasuryAccess(ctx.user.id, input.churchId);
      if (!access.canManageStructure) throw new TRPCError({ code: "FORBIDDEN", message: "Somente Pastores podem criar categorias financeiras." });
      const key = `custom_${input.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;
      return createFinancialCategory({ ...input, key });
    }),

  createTransaction: protectedProcedure
    .input(financialTransactionInput.extend({ status: z.enum(["rascunho", "confirmado"]).default("confirmado") }))
    .mutation(async ({ input, ctx }) => {
      const access = await requireTreasuryAccess(ctx.user.id, input.churchId);
      await validateFinancialReferences(input);
      return createFinancialTransaction({ ...input, actorChurchUserId: access.actor.id });
    }),

  updateDraft: protectedProcedure
    .input(financialTransactionInput.extend({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const access = await requireTreasuryAccess(ctx.user.id, input.churchId);
      const existing = await getFinancialTransactionById(input.id, input.churchId);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Lançamento não encontrado." });
      if (existing.status !== "rascunho") throw new TRPCError({ code: "BAD_REQUEST", message: "Apenas lançamentos em rascunho podem ser alterados." });
      await validateFinancialReferences(input);
      return updateFinancialDraft({ ...input, actorChurchUserId: access.actor.id });
    }),

  confirmTransaction: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const access = await requireTreasuryAccess(ctx.user.id, input.churchId);
      const existing = await getFinancialTransactionById(input.id, input.churchId);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Lançamento não encontrado." });
      const date = new Date(existing.transactionDate).toISOString().slice(0, 10);
      if (await isFinancialPeriodClosed(input.churchId, date)) throw new TRPCError({ code: "FORBIDDEN", message: "O período financeiro deste lançamento está fechado." });
      const transaction = await confirmFinancialTransaction({ ...input, actorChurchUserId: access.actor.id });
      if (!transaction) throw new TRPCError({ code: "BAD_REQUEST", message: "Não foi possível confirmar este lançamento." });
      return transaction;
    }),

  reverseTransaction: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), id: z.number().int().positive(), reason: z.string().trim().min(5).max(500) }))
    .mutation(async ({ input, ctx }) => {
      const access = await requireTreasuryAccess(ctx.user.id, input.churchId);
      if (!access.canManageStructure) throw new TRPCError({ code: "FORBIDDEN", message: "Somente Pastores podem estornar lançamentos confirmados." });
      const existing = await getFinancialTransactionById(input.id, input.churchId);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Lançamento não encontrado." });
      const date = new Date(existing.transactionDate).toISOString().slice(0, 10);
      if (await isFinancialPeriodClosed(input.churchId, date)) throw new TRPCError({ code: "FORBIDDEN", message: "Reabra o período antes de estornar este lançamento." });
      const transaction = await reverseFinancialTransaction({ ...input, actorChurchUserId: access.actor.id });
      if (!transaction) throw new TRPCError({ code: "BAD_REQUEST", message: "Apenas lançamentos confirmados podem ser estornados." });
      return transaction;
    }),

  closePeriod: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), periodStart: financialDateInput, periodEnd: financialDateInput }))
    .mutation(async ({ input, ctx }) => {
      const access = await requireTreasuryAccess(ctx.user.id, input.churchId);
      if (!access.canClosePeriod) throw new TRPCError({ code: "FORBIDDEN", message: "Somente o Pastor Presidente pode fechar um período financeiro." });
      if (input.periodEnd < input.periodStart) throw new TRPCError({ code: "BAD_REQUEST", message: "O término do período deve ser posterior ao início." });
      const existing = await getFinancialPeriodClosure(input.churchId, input.periodStart);
      if (existing?.status === "fechado") throw new TRPCError({ code: "CONFLICT", message: "Este período já está fechado." });
      const overview = await getTreasuryOverview({
        churchId: input.churchId,
        startDate: input.periodStart,
        endDate: input.periodEnd,
      });
      if (overview.transactions.some((row) => row.transaction.status === "rascunho")) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Confirme ou ajuste os rascunhos antes de fechar o período." });
      }
      return closeFinancialPeriod({ ...input, actorChurchUserId: access.actor.id });
    }),

  reopenPeriod: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), periodStart: financialDateInput, reason: z.string().trim().min(5).max(500) }))
    .mutation(async ({ input, ctx }) => {
      const access = await requireTreasuryAccess(ctx.user.id, input.churchId);
      if (!access.canClosePeriod) throw new TRPCError({ code: "FORBIDDEN", message: "Somente o Pastor Presidente pode reabrir um período financeiro." });
      const closure = await reopenFinancialPeriod({ ...input, actorChurchUserId: access.actor.id });
      if (!closure) throw new TRPCError({ code: "NOT_FOUND", message: "Fechamento financeiro não encontrado." });
      return closure;
    }),
});

// ─── NOTIFICAÇÕES ──────────────────────────────────────────────────────────────

const notificationsRouter = router({
  mine: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), unreadOnly: z.boolean().optional() }))
    .query(async ({ input, ctx }) => {
      const actor = await requireChurchMember(ctx.user.id, input.churchId);
      return getNotificationsForChurchUser({ churchId: input.churchId, churchUserId: actor.id, unreadOnly: input.unreadOnly, limit: 40 });
    }),
  unreadCount: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const actor = await requireChurchMember(ctx.user.id, input.churchId);
      return { count: await getUnreadNotificationCount(input.churchId, actor.id) };
    }),
  markRead: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const actor = await requireChurchMember(ctx.user.id, input.churchId);
      await markNotificationRead({ id: input.id, churchId: input.churchId, churchUserId: actor.id });
      return { success: true };
    }),
});

// ─── STRIPE ROUTER ────────────────────────────────────────────────────────────
const stripeRouter = router({
  // Retorna o status da assinatura da igreja
  getSubscription: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      const church = await getChurchById(input.churchId);
      if (!church) throw new TRPCError({ code: "NOT_FOUND", message: "Igreja não encontrada" });
      return {
        plan: church.stripePlan ?? null,
        status: church.stripeStatus ?? null,
        currentPeriodEnd: church.stripeCurrentPeriodEnd ?? null,
        trialEndsAt: church.trialEndsAt ?? null,
        hasSubscription: !!church.stripeSubscriptionId,
      };
    }),

  // Cria uma sessão de checkout Stripe
 createCheckoutSession: protectedProcedure
   .input(z.object({
     churchId: z.number(),
     plan: z.enum(["basic", "pro", "enterprise"]),
     interval: z.enum(["month", "year"]).default("month"),
     origin: z.string(),
   }))
   .mutation(async ({ input, ctx }) => {
      await requireChurchAdministrator(ctx.user.id, input.churchId);
     const church = await getChurchById(input.churchId);
      if (!church) throw new TRPCError({ code: "NOT_FOUND", message: "Igreja não encontrada" });

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
        apiVersion: "2026-05-27.dahlia" as any,
      });

      const { PLANS } = await import("./stripe-products");
      const planData = PLANS[input.plan];
      const unitAmount = input.interval === "year" ? planData.yearlyPrice : planData.monthlyPrice;

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        customer_email: ctx.user.email ?? undefined,
        allow_promotion_codes: true,
        line_items: [{
          price_data: {
            currency: "brl",
            product_data: {
              name: `Ide Fazei ${planData.name}`,
              description: planData.description,
            },
            unit_amount: unitAmount,
            recurring: { interval: input.interval },
          },
          quantity: 1,
        }],
        metadata: {
          church_id: input.churchId.toString(),
          plan: input.plan,
          user_id: ctx.user.id.toString(),
        },
        client_reference_id: ctx.user.id.toString(),
        success_url: `${input.origin}/app/faturamento?success=1`,
        cancel_url: `${input.origin}/planos?canceled=1`,
      });

      return { url: session.url };
    }),

  // Cria uma sessão do portal de faturamento Stripe
 createPortalSession: protectedProcedure
   .input(z.object({
     churchId: z.number(),
     origin: z.string(),
   }))
   .mutation(async ({ input, ctx }) => {
      await requireChurchAdministrator(ctx.user.id, input.churchId);
     const church = await getChurchById(input.churchId);
      if (!church?.stripeCustomerId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhuma assinatura ativa encontrada" });
      }

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
        apiVersion: "2026-05-27.dahlia" as any,
      });

      const session = await stripe.billingPortal.sessions.create({
        customer: church.stripeCustomerId,
        return_url: `${input.origin}/app/faturamento`,
      });

      return { url: session.url };
    }),
});

// ─── APP DO LÍDER ─────────────────────────────────────────────────────────────
const leaderRouter = router({
  overview: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      const actor = await requireChurchMember(ctx.user.id, input.churchId);
      if (!actor.personId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Sua conta ainda não está vinculada a uma Pessoa. Peça ao Pastor para concluir o vínculo em Configurações.",
        });
      }
      const actorRoles = await getEffectiveChurchRoles(ctx.user.id, input.churchId, actor);
      const canManageAll = actorRoles.some((role) => ["pastor_presidente", "pastor_local"].includes(role));
      const [allCells, allSouls, allConsolidations, allPeople] = await Promise.all([
        getCellsByChurch(input.churchId),
        getSoulsByChurch(input.churchId),
        getConsolidationsByChurch(input.churchId),
        getPeopleByChurch(input.churchId),
      ]);
      const managedIds = canManageAll
        ? allPeople.map((person) => person.id)
        : await getJourneyManagedPersonIds({ churchId: input.churchId, actorPersonId: actor.personId, actorRoles });
      const managedIdSet = new Set(managedIds);
      const cells = canManageAll
        ? allCells
        : allCells.filter((cell) =>
            (actorRoles.includes("lider") && cell.leaderId === actor.personId) ||
            (actorRoles.includes("supervisor") && cell.supervisorId === actor.personId)
          );
      const cellMembers = await Promise.all(cells.map((cell) => getActiveMembersByCell(cell.id, input.churchId)));
      cellMembers.flat().forEach((item) => managedIdSet.add(item.person.id));
      const managedPeople = allPeople.filter((person) => managedIdSet.has(person.id));
      const managedSouls = allSouls.filter((soul) => soul.personId && managedIdSet.has(soul.personId));
      const managedSoulIds = new Set(managedSouls.map((soul) => soul.id));

      return {
        cells: cells.map((cell, index) => ({ ...cell, members: cellMembers[index] ?? [] })),
        people: managedPeople,
        souls: managedSouls,
        consolidations: allConsolidations.filter((consolidation) => managedSoulIds.has(consolidation.soulId)),
      };
    }),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  churches: churchRouter,
  people: peopleRouter,
  souls: soulsRouter,
  consolidation: consolidationRouter,
  care: careRouter,
  cells: cellsRouter,
  events: eventsRouter,
  ministries: ministriesRouter,
  announcements: announcementsRouter,
  prayer: prayerRouter,
  dashboard: dashboardRouter,
  leader: leaderRouter,
    families: familiesRouter,
  schedules: schedulesRouter,
  library: libraryRouter,
  invites: inviteRouter,
  churchAuth: churchAuthRouter,
  adminAuth: adminAuthRouter,
  superAdmin: superAdminRouter,
  diagnostics: diagnosticsRouter,
  visitor: visitorRouter,
  register: registerRouter,
  onboarding: onboardingRouter,
  reports: reportsRouter,
  escolaFundamentos: escolaFundamentosRouter,
  batismo: batismoRouter,
  encontro: encontroRouter,
  escolaLideres: escolaLideresRouter,
  lideranca: liderancaRouter,
  aconselhamento: aconselhamentoRouter,
  comunicacao: comunicacaoRouter,
  certificates: certificatesRouter,
  treasury: treasuryRouter,
  notifications: notificationsRouter,
  stripe: stripeRouter,
  contact: router({
    send: publicProcedure
      .input(z.object({
        name: z.string().min(2),
        email: z.string().email(),
        church: z.string().optional(),
        message: z.string().min(10),
      }))
      .mutation(async ({ input }) => {
        const { notifyOwner } = await import("./_core/notification");
        await notifyOwner({
          title: `Novo contato: ${input.name}`,
          content: `De: ${input.name} <${input.email}>\nIgreja: ${input.church || 'N/A'}\n\n${input.message}`,
        });
        return { success: true };
      }),
  }),
});
export type AppRouter = typeof appRouter;
