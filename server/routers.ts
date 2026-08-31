import { COOKIE_NAME } from "@shared/const";
import { randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { isValidSocialMediaUrl, normalizePublicWebsiteUrl, normalizeSocialMediaLinks, SOCIAL_PLATFORM_KEYS } from "../shared/socialMedia";
import { normalizePastoralSupportConfig, normalizePastoralSupportUrl } from "../shared/pastoralSupport";
import { HERO_PRESET_IDS } from "../shared/publicHero";
import { getOptimizedMediaUrls } from "./media";
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
  updateCell,
  assignPersonToCell,
  integrateConsolidationReferralIntoCell,
  createChurch,
  createConsolidationReferral,
  createConsolidationReferralCase,
  assignConsolidationCase,
  acceptConsolidationCase,
  approveConsolidationCase,
  getConsolidationCaseAssignments,
  startConsolidationWorkflow,
  createConsolidationFollowUp,
  createCareVisit,
  assignCareVisit,
  acceptCareVisit,
  completeCareVisit,
  cancelCareVisit,
  getCareVisitById,
  getCareVisitEvents,
  getCareVisitsByChurch,
  createEvent,
  createMinistry,
  createPerson,
  createPrayerRequest,
  createSoul,
  findPossiblePeopleByIdentity,
  getAnnouncementsByChurch,
  getPublicAnnouncementsByChurch,
  getPublicDailyDevotionalByChurch,
  getActiveMediaAssetById,
  updateAnnouncement,
  getCellsByChurch,
  getCellMembersCount,
  getActiveMembersByCell,
  getCellById,
  getCellMeetingByDate,
  getCellMeetingSummaries,
  getStartupDiagnostics,
  createCellMeetingWithAttendance,
  getActiveCellMembership,
  getPeopleWithoutActiveCell,
  getCellMembershipHistory,
  getAccessibleCellIdsByPerson,
  getActiveCellRoleKeysByPerson,
  getChurchById,
  getChurchBySlug,
  getChurchMemberByUserId,
  getActiveChurchUserById,
  getChurchMembersByChurch,
  getChurchUsersByChurch,
  getChurchUserByEmail,
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
  getFinancialCategoriesForManagement,
  getFinancialCategoryForManagement,
  getFinancialCategoryById,
  hasFinancialCategoryTransactions,
  updateFinancialCategory,
  setFinancialCategoryActive,
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
  getTreasuryServices,
  getTreasuryRecurringSchedules,
  getTreasuryRecurringScheduleById,
  createTreasuryRecurringSchedule,
  updateTreasuryRecurringSchedule,
  setTreasuryRecurringScheduleActive,
  getTreasuryServiceById,
  createTreasuryService,
  updateTreasuryService,
  cancelTreasuryService,
  getTreasuryCountSheetsByChurch,
  getTreasuryCountSheetById,
  saveTreasuryCountSheet,
  closeTreasuryCountSheet,
  getTreasuryDepositsByChurch,
  getTreasuryDepositByCountSheet,
  saveTreasuryDeposit,
  getTreasuryReportsByChurch,
  getTreasuryReportById,
  issueTreasuryReport,
  signTreasuryReport,
  getTreasuryServiceParticipantNames,
  getFinancialTransactionsByService,
  getFinancialTransactionsByCountSheet,
  getMinistriesByChurch,
  getMinistryMembers,
  archiveMinistry,
  setMinistryLeader,
  getDepartmentsByMinistry,
  getDepartmentsByChurch,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  setDepartmentLeader,
  setDepartmentSupervisor,
  setConsolidationDepartmentLeadership,
  ensureConsolidationMinistryStructure,
  getActiveDepartmentRoleKeysByPerson,
  getDepartmentMembers,
  getDepartmentCandidates,
  isActiveDepartmentMember,
  isActiveConsolidationMinistryMember,
  isActiveVisitsMinistryMember,
  assignPersonToDepartment,
  removePersonFromDepartment,
  getDepartmentRoleAssignments,
  assignDepartmentRole,
  endDepartmentRole,
  getMinistryMemberCounts,
  isActiveMinistryMember,
  getScheduleTimeConflicts,
  getScheduleItemById,
  updateScheduleItem,
  cancelScheduleItem,
  assignPersonToMinistry,
  removePersonFromMinistry,
  assignMinistryRole,
  deactivateMinistryRole,
  getActiveMinistryRoleKeysByPerson,
  getMinistryRoleAssignmentsByPerson,
  getMinistryRoleAssignmentById,
  getMinistryMembershipsByPerson,
  getMinistryRoleDefinitionsByChurch,
  createMinistryRoleDefinition,
  getPeopleByChurch,
  getPersonById,
  getPrayerRequestsByChurch,
  getPrayerRequestsByPerson,
  getCareHistoryByPerson,
  getCurrentCareAssignment,
  getRadarEspiritual,
  getSpiritualRadarByChurch,
  getSoulById,
  getSoulsByChurch,
  getSoulsByWinner,
  updateChurch,
  useChurchLogoAsPwaIcon,
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
  getPublishedTenantPublicExperienceBySlug,
  getTenantPublicSiteByChurchId,
  publishTenantPublicSiteByChurchId,
  saveTenantPublicDraftByChurchId,
  upsertOnboardingProgress,
  importPeopleFromCSV,
  // Escola de Fundamentos
  getCoursesByChurch,
  createCourse,
  getCourseEnrollments,
  getCourseEnrollmentById,
  enrollInCourse,
  updateCourseEnrollment,
  getFoundationStudiesByCourse,
  getFoundationStudyById,
  getFoundationModulesByCourse,
  getFoundationModuleById,
  createFoundationStudy,
  createFoundationModule,
  updateFoundationStudy,
  updateFoundationModule,
  getLibraryItemById,
  getFoundationStudyMaterials,
  attachFoundationStudyMaterial,
  updateFoundationStudyMaterialPosition,
  detachFoundationStudyMaterial,
  getFoundationStudyAdministrators,
  isFoundationStudyAdministrator,
  assignFoundationStudyAdministrator,
  removeFoundationStudyAdministrator,
  // Batismo
  getBaptismClassesByChurch,
  getBaptismEnrollments,
  createBaptismClass,
  enrollInBaptism,
  updateBaptismEnrollment,
  // Encontro com Deus
  addEncounterHistory,
  createEncounterChecklistItem,
  createEncounterEvent,
  createEncounterServantAssignment,
  createEncounterTeam,
  deactivateEncounterServantAssignment,
  enrollInEncounter,
  getEncounterChecklist,
  getEncounterEnrollmentById,
  getEncounterEnrollments,
  getEncounterEventById,
  getEncounterEventsByChurch,
  getEncounterManagedEventIds,
  getEncounterHistory,
  getEncounterOverview,
  getEncounterPublicFormByEvent,
  getEncounterPublicFormByToken,
  getEncounterServants,
  getEncounterTeamById,
  getEncounterTeams,
  rotateEncounterPublicForm,
  setEncounterPublicFormActive,
  submitEncounterDiscipleForm,
  updateEncounterChecklistItem,
  updateEncounterDiscipleFormReview,
  updateEncounterEnrollment,
  updateEncounterEvent,
  updateEncounterTeam,
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

const PASTOR_ROLES = new Set(["pastor_presidente", "pastor_local"]);
const CHURCH_ADMIN_ROLES = new Set(["pastor_presidente", "pastor_local", "secretario"]);
const CHURCH_ROLE_MANAGER_ROLES = PASTOR_ROLES;
const COUNSELING_ROLES = new Set(["pastor_presidente", "pastor_local", "supervisor"]);
const PASTORAL_ACTION_ROLES = new Set(["pastor_presidente", "pastor_local", "supervisor", "lider", "consolidador"]);
const TREASURY_ROLES = new Set(["pastor_presidente", "pastor_local", "tesoureiro"]);
const VISIT_ROLES = new Set(["pastor_presidente", "pastor_local", "supervisor", "consolidador", "visitador"]);
const MINISTRY_MANAGEMENT_ROLE_KEYS = new Set(["lider_louvor", "lider_consolidacao", "supervisor_consolidacao", "lider_visitas", "supervisor_visitas"]);
const MINISTRY_LEADERSHIP_ROLE_KEYS = new Set(["lider_celula", "supervisor_celulas", "lider_consolidacao", "supervisor_consolidacao", "lider_visitas", "supervisor_visitas", "lider_louvor"]);
const OPERATIONAL_MINISTRY_ROLE_KEYS = new Set(["membro_ministerio", "musico", "vocalista", "visitador"]);
const EXECUTIVE_READ_ROLES = new Set(["pastor_presidente", "pastor_local", "secretario", "supervisor"]);
const COMMUNICATION_MANAGER_ROLES = new Set(["pastor_presidente", "pastor_local", "secretario", "comunicacao"]);
const PRAYER_MANAGER_ROLES = new Set(["pastor_presidente", "pastor_local", "secretario", "supervisor"]);

/**
 * Catálogo central: a igreja atribui uma função, nunca permissões isoladas por pessoa.
 * Novas funções podem ser acrescidas aqui sem alterar o histórico de atribuições.
 */
const MINISTRY_FUNCTION_CATALOG = [
  { key: "visitador", label: "Visitador", ministryTypes: ["consolidacao", "visitas"], grants: ["visitador"] },
  { key: "lider_consolidacao", label: "Líder de Consolidação", ministryTypes: ["consolidacao"], grants: ["consolidador", "lider_consolidacao"] },
  { key: "supervisor_consolidacao", label: "Supervisor de Consolidação", ministryTypes: ["consolidacao"], grants: ["consolidador", "lider_consolidacao", "supervisor_consolidacao"] },
  { key: "lider_visitas", label: "Líder de Visitas", ministryTypes: ["consolidacao", "visitas"], grants: ["visitador", "lider_visitas"] },
  { key: "supervisor_visitas", label: "Supervisor de Visitas", ministryTypes: ["consolidacao", "visitas"], grants: ["visitador", "lider_visitas", "supervisor_visitas"] },
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

function isConsolidationMinistry(ministry: { type: string; name: string }) {
  const normalizedName = ministry.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return ministry.type === "consolidacao" || normalizedName.includes("consolidacao");
}
function isVisitsMinistry(ministry: { type: string; name: string }) {
  const normalizedName = ministry.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return ministry.type === "visitas" || (normalizedName.includes("visita") && !isConsolidationMinistry(ministry));
}
function getMinistryFunctionCatalogFor(ministry: { type: string; name: string }) {
  const normalizedName = ministry.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const context = isConsolidationMinistry(ministry) ? "consolidacao"
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
async function requirePastor(userId: number, churchId: number) {
  const member = await requireChurchMember(userId, churchId);
  const roles = await getEffectiveChurchRoles(userId, churchId, member);
  if (!roles.some((role) => PASTOR_ROLES.has(role))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Somente o Pastor pode executar esta ação de governança." });
  }
  return member;
}

async function getFoundationStudyAccess(userId: number, churchId: number) {
  const member = await requireChurchMember(userId, churchId);
  const roles = await getEffectiveChurchRoles(userId, churchId, member);
  const isPastor = roles.some((role) => role === "pastor_presidente" || role === "pastor_local");
  const churchUserId = userId < 0 ? Math.abs(userId) : null;
  const isDesignatedAdministrator = Boolean(
    !isPastor && churchUserId && await isFoundationStudyAdministrator(churchId, churchUserId)
  );
  return { member, isPastor, isDesignatedAdministrator, canManageStudies: isPastor || isDesignatedAdministrator };
}

async function requireFoundationStudyManager(userId: number, churchId: number) {
  const access = await getFoundationStudyAccess(userId, churchId);
  if (!access.canManageStudies) {
    throw new TRPCError({ code: "FORBIDDEN", message: "A gestão de estudos é restrita ao Pastor e aos administradores designados." });
  }
  return access;
}

async function requireFoundationStudyPastor(userId: number, churchId: number) {
  const access = await getFoundationStudyAccess(userId, churchId);
  if (!access.isPastor) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Somente Pastores podem definir administradores de estudos." });
  }
  return access;
}

async function requireChurchPublicSitePublisher(userId: number, churchId: number) {
  const member = await requireChurchMember(userId, churchId);
  const roles = await getEffectiveChurchRoles(userId, churchId, member);
  if (!roles.some((role) => role === "pastor_presidente" || role === "pastor_local")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "A publicação da página pública é restrita a Pastores da própria igreja." });
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

async function requireCellManagementPermission(userId: number, churchId: number, cellId: number) {
  const actor = await requireChurchMember(userId, churchId);
  const cell = await getCellById(cellId, churchId);
  if (!cell || !cell.active) throw new TRPCError({ code: "NOT_FOUND", message: "Célula não encontrada nesta igreja." });
  const roles = await getEffectiveChurchRoles(userId, churchId, actor);
  const canManageAll = roles.some((role) => PASTOR_ROLES.has(role));
  const canManageOwn = Boolean(actor.personId && [cell.leaderId, cell.coLeaderId, cell.supervisorId].includes(actor.personId));
  if (!canManageAll && !canManageOwn) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Você só pode administrar a própria Célula." });
  }
  return { actor, roles, cell, canManageAll, canManageOwn };
}
async function requireCellScopedRead(userId: number, churchId: number, cellId: number) {
  const actor = await requireChurchMember(userId, churchId);
  const cell = await getCellById(cellId, churchId);
  if (!cell || !cell.active) throw new TRPCError({ code: "NOT_FOUND", message: "Célula não encontrada nesta igreja." });
  const roles = await getEffectiveChurchRoles(userId, churchId, actor);
  if (roles.some((role) => PASTOR_ROLES.has(role))) return { actor, roles, cell };
  const isResponsible = Boolean(actor.personId && [cell.leaderId, cell.coLeaderId, cell.supervisorId].includes(actor.personId));
  const membership = actor.personId ? await getActiveCellMembership(actor.personId, churchId) : null;
  if (!isResponsible && membership?.cellId !== cell.id) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Você só pode consultar a própria Célula." });
  }
  return { actor, roles, cell };
}
async function requireScopedPersonRead(userId: number, churchId: number, personId: number) {
  const accessibleIds = await getAccessiblePersonIds(userId, churchId);
  if (accessibleIds !== null && !accessibleIds.has(personId)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem acesso a esta Pessoa." });
  }
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

  const canManageAll = roles.some((role) => PASTOR_ROLES.has(role));
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
      message: "Somente o Pastor ou o responsável por este Ministério pode gerenciar participantes e Escalas.",
    });
  }

    return { actor, roles, ministry, canManageAll };
}
async function requireMinistryScopedRead(userId: number, churchId: number, ministryId: number) {
  const actor = await requireChurchMember(userId, churchId);
  const ministry = (await getMinistriesByChurch(churchId)).find((item) => item.id === ministryId && item.active);
  if (!ministry) throw new TRPCError({ code: "NOT_FOUND", message: "Ministério não encontrado nesta igreja." });
  const roles = await getEffectiveChurchRoles(userId, churchId, actor);
  if (roles.some((role) => PASTOR_ROLES.has(role))) return { actor, roles, ministry };
  const isLeader = Boolean(actor.personId && ministry.leaderId === actor.personId);
  const isMember = Boolean(actor.personId && await isActiveMinistryMember(ministryId, actor.personId, churchId));
  if (!isLeader && !isMember) throw new TRPCError({ code: "FORBIDDEN", message: "Você só pode consultar Ministérios do seu escopo." });
  return { actor, roles, ministry };
}
async function requireDepartmentManagementPermission(userId: number, churchId: number, departmentId: number) {
  const actor = await requireChurchMember(userId, churchId);
  const roles = await getEffectiveChurchRoles(userId, churchId, actor);
  const department = await getDepartmentById(departmentId, churchId);
  if (!department) throw new TRPCError({ code: "NOT_FOUND", message: "Departamento não encontrado nesta igreja." });

  const isDepartmentLeader = Boolean(actor.personId && department.leaderId === actor.personId);
  const isDepartmentSupervisor = Boolean(actor.personId && department.supervisorId === actor.personId);
  if (isDepartmentLeader || isDepartmentSupervisor) return { actor, roles, department, canManageAll: false, isDepartmentLeader, isDepartmentSupervisor };

  const ministryAuthorization = await requireMinistryManagementPermission(userId, churchId, department.ministryId);
  return {
    actor: ministryAuthorization.actor,
    roles: ministryAuthorization.roles,
    department,
    canManageAll: ministryAuthorization.canManageAll,
    isDepartmentLeader: false,
    isDepartmentSupervisor: false,
  };
}

async function requireScheduleManagementPermission(userId: number, churchId: number, ministryId: number, departmentId?: number | null) {
  if (!departmentId) return requireMinistryManagementPermission(userId, churchId, ministryId);
  const department = await getDepartmentById(departmentId, churchId);
  if (!department) throw new TRPCError({ code: "NOT_FOUND", message: "Departamento não encontrado nesta igreja." });
  if (department.ministryId !== ministryId) throw new TRPCError({ code: "BAD_REQUEST", message: "O Departamento selecionado não pertence a este Ministério." });
  return requireDepartmentManagementPermission(userId, churchId, departmentId);
}

async function requireScheduleParticipant(churchId: number, ministryId: number, departmentId: number | null | undefined, personId: number) {
  const person = await getPersonById(personId, churchId);
  if (!person) throw new TRPCError({ code: "BAD_REQUEST", message: "Pessoa não encontrada nesta igreja." });
  if (departmentId) {
    const department = await getDepartmentById(departmentId, churchId);
    if (!department || department.ministryId !== ministryId) throw new TRPCError({ code: "BAD_REQUEST", message: "O Departamento selecionado não pertence a este Ministério." });
    if (!(await isActiveDepartmentMember(departmentId, personId, churchId))) throw new TRPCError({ code: "BAD_REQUEST", message: "A Pessoa precisa participar ativamente deste Departamento antes de entrar na Escala." });
    return person;
  }
  if (!(await isActiveMinistryMember(ministryId, personId, churchId))) throw new TRPCError({ code: "BAD_REQUEST", message: "A Pessoa precisa ser participante ativa deste Ministério antes de entrar na Escala." });
  return person;
}

async function getEffectiveChurchRoles(userId: number, churchId: number, actor: { role: string; personId?: number | null }) {
  if (userId >= 0) return [actor.role];
  const complementary = await getComplementaryRolesByChurchUser(Math.abs(userId), churchId);
  const [ministryRoleKeys, departmentRoleKeys, cellRoleKeys, customDefinitions, isConsolidationMember, isVisitsMember] = await Promise.all([
    actor.personId ? getActiveMinistryRoleKeysByPerson(actor.personId, churchId) : Promise.resolve([]),
    actor.personId ? getActiveDepartmentRoleKeysByPerson(actor.personId, churchId) : Promise.resolve([]),
    actor.personId ? getActiveCellRoleKeysByPerson(actor.personId, churchId) : Promise.resolve([]),
    getMinistryRoleDefinitionsByChurch(churchId),
    actor.personId ? isActiveConsolidationMinistryMember(actor.personId, churchId) : Promise.resolve(false),
    actor.personId ? isActiveVisitsMinistryMember(actor.personId, churchId) : Promise.resolve(false),
  ]);
  const customGrants = new Map(customDefinitions.map((definition) => [definition.key, CUSTOM_PERMISSION_PACKAGE_GRANTS[definition.permissionPackage] ?? []]));
  const ministryGrants = ministryRoleKeys.flatMap((key) => MINISTRY_FUNCTION_GRANTS.get(key) ?? customGrants.get(key) ?? []);
  const departmentGrants = departmentRoleKeys.flatMap((key) => MINISTRY_FUNCTION_GRANTS.get(key) ?? customGrants.get(key) ?? []);
  return Array.from(new Set([
    actor.role,
    ...complementary,
    ...(isConsolidationMember ? ["consolidador"] : []),
    ...(isVisitsMember ? ["visitador"] : []),
    ...cellRoleKeys,
    ...ministryGrants,
    ...departmentGrants,
  ]));
}

async function getChurchAccessSummary(userId: number, churchId: number) {
  const actor = await requireChurchMember(userId, churchId);
  const roles = await getEffectiveChurchRoles(userId, churchId, actor);
  const isPastor = roles.some((role) => ["pastor_presidente", "pastor_local"].includes(role));
  const isExecutive = roles.some((role) => EXECUTIVE_READ_ROLES.has(role));
  const isCommunicationManager = roles.some((role) => COMMUNICATION_MANAGER_ROLES.has(role));
  const isPrayerManager = roles.some((role) => PRAYER_MANAGER_ROLES.has(role));
  const isConsolidator = roles.includes("consolidador");
  const isVisitador = roles.includes("visitador");
  const isPastoralWorker = roles.some((role) => PASTORAL_ACTION_ROLES.has(role));
  const canAccessVisits = roles.some((role) => VISIT_ROLES.has(role));
  const canManageCells = roles.some((role) => ["pastor_presidente", "pastor_local", "supervisor", "lider"].includes(role));
  const canManageMinistry = roles.some((role) => PASTOR_ROLES.has(role) || role === "lider_ministerio" || MINISTRY_MANAGEMENT_ROLE_KEYS.has(role))
    || Boolean(actor.personId && (await getMinistriesByChurch(churchId)).some((ministry) => ministry.leaderId === actor.personId));
  const canManageLibrary = isExecutive;
  return {
    actorPersonId: actor.personId ?? null,
    actorRole: actor.role,
    roles,
    isPastor,
    isExecutive,
    isCommunicationManager,
    isPrayerManager,
    isConsolidator,
    isVisitador,
    isPastoralWorker,
    canAccessVisits,
    canManageCells,
    canManageMinistry,
    canManageLibrary,
    canAccessTreasury: roles.some((role) => TREASURY_ROLES.has(role)),
    canIndicateNewSoul: Boolean(actor.personId),
    canManageEvents: roles.some((role) => CHURCH_ADMIN_ROLES.has(role)),
    canManageEncounter: isExecutive,
  };
}

async function requireExecutiveReadAccess(userId: number, churchId: number) {
  const access = await getChurchAccessSummary(userId, churchId);
  if (!access.isExecutive) throw new TRPCError({ code: "FORBIDDEN", message: "Esta área é restrita à liderança autorizada." });
  return access;
}

async function requireCommunicationManager(userId: number, churchId: number) {
  const access = await getChurchAccessSummary(userId, churchId);
  if (!access.isCommunicationManager) throw new TRPCError({ code: "FORBIDDEN", message: "A gestão da Comunicação é restrita à liderança autorizada." });
  return access;
}

async function requirePrayerManager(userId: number, churchId: number) {
  const access = await getChurchAccessSummary(userId, churchId);
  if (!access.isPrayerManager) throw new TRPCError({ code: "FORBIDDEN", message: "A gestão dos pedidos de oração é restrita à liderança autorizada." });
  return access;
}

async function getEffectivePersonRoles(personId: number, churchId: number) {
  const accounts = await getChurchUsersByChurch(churchId);
  const account = accounts.find((candidate) => candidate.active && candidate.personId === personId);
  if (!account) return [];

  const [ministryRoleKeys, departmentRoleKeys, cellRoleKeys, customDefinitions, isConsolidationMember, isVisitsMember] = await Promise.all([
    getActiveMinistryRoleKeysByPerson(personId, churchId),
    getActiveDepartmentRoleKeysByPerson(personId, churchId),
    getActiveCellRoleKeysByPerson(personId, churchId),
    getMinistryRoleDefinitionsByChurch(churchId),
    isActiveConsolidationMinistryMember(personId, churchId),
    isActiveVisitsMinistryMember(personId, churchId),
  ]);
  const customGrants = new Map(customDefinitions.map((definition) => [definition.key, CUSTOM_PERMISSION_PACKAGE_GRANTS[definition.permissionPackage] ?? []]));
  const ministryGrants = ministryRoleKeys.flatMap((key) => MINISTRY_FUNCTION_GRANTS.get(key) ?? customGrants.get(key) ?? []);
  const departmentGrants = departmentRoleKeys.flatMap((key) => MINISTRY_FUNCTION_GRANTS.get(key) ?? customGrants.get(key) ?? []);
  return Array.from(new Set([
    account.role,
    ...(account.complementaryRoles ?? []),
    ...(isConsolidationMember ? ["consolidador"] : []),
    ...(isVisitsMember ? ["visitador"] : []),
    ...cellRoleKeys,
    ...ministryGrants,
    ...departmentGrants,
  ]));
}

async function requireConsolidatorPerson(personId: number, churchId: number) {
  const [person, roles] = await Promise.all([
    getPersonById(personId, churchId),
    getEffectivePersonRoles(personId, churchId),
  ]);
  if (!person || !roles.includes("consolidador")) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione uma Pessoa com função ativa de Consolidador nesta igreja." });
  }
  return person;
}

async function requireVisitorPerson(personId: number, churchId: number) {
  const [person, roles] = await Promise.all([
    getPersonById(personId, churchId),
    getEffectivePersonRoles(personId, churchId),
  ]);
  if (!person || !roles.includes("visitador")) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione uma Pessoa com função ativa de Visitador nesta igreja." });
  }
  return person;
}

async function getConsolidationMinistryContext(userId: number, churchId: number) {
  const actor = await requireChurchMember(userId, churchId);
  const roles = await getEffectiveChurchRoles(userId, churchId, actor);
  const [ministries, departments, cells] = await Promise.all([
    getMinistriesByChurch(churchId),
    getDepartmentsByChurch(churchId),
    getCellsByChurch(churchId),
  ]);
  const ministry = ministries.find((item) => isConsolidationMinistry(item)) ?? null;
  const visitsMinistry = ministries.find((item) => isVisitsMinistry(item)) ?? null;
  const consolidationDepartment = ministry ? departments.find((item) => item.ministryId === ministry.id && item.systemKey === "consolidacao" && item.active) ?? null : null;
  const visitsDepartment = (visitsMinistry ? departments.find((item) => item.ministryId === visitsMinistry.id && item.systemKey === "visitas" && item.active) ?? null : null)
    ?? (ministry ? departments.find((item) => item.ministryId === ministry.id && item.systemKey === "visitas" && item.active) ?? null : null);
  const isPastor = roles.some((role) => CHURCH_ROLE_MANAGER_ROLES.has(role));
  const isMinistryLeader = Boolean(actor.personId && ministry?.leaderId === actor.personId);
  const isVisitsMinistryLeader = Boolean(actor.personId && visitsMinistry?.leaderId === actor.personId);
  const leadsAnyMinistry = Boolean(actor.personId && ministries.some((item) => item.leaderId === actor.personId));
  const leadsAnyDepartment = Boolean(actor.personId && departments.some((item) => item.active && [item.leaderId, item.supervisorId].includes(actor.personId)));
  const leadsAnyCell = Boolean(actor.personId && cells.some((item) => [item.leaderId, item.supervisorId].includes(actor.personId)));
  const managesConsolidation = Boolean(isPastor || isMinistryLeader || (actor.personId && consolidationDepartment && [consolidationDepartment.leaderId, consolidationDepartment.supervisorId].includes(actor.personId)));
  const managesVisits = Boolean(isPastor || isMinistryLeader || isVisitsMinistryLeader || (actor.personId && visitsDepartment && [visitsDepartment.leaderId, visitsDepartment.supervisorId].includes(actor.personId)));
  return {
    actor,
    roles,
    ministry,
    visitsMinistry,
    consolidationDepartment,
    visitsDepartment,
    capabilities: {
      canConfigure: isPastor,
      canManageConsolidation: managesConsolidation,
      canManageVisits: managesVisits,
      canWorkConsolidation: managesConsolidation || roles.includes("consolidador"),
      canWorkVisits: managesVisits || roles.includes("visitador"),
      canRefer: isPastor || leadsAnyMinistry || leadsAnyDepartment || leadsAnyCell,
    },
  };
}

async function requireConsolidationDepartmentManager(userId: number, churchId: number, kind: "consolidacao" | "visitas") {
  const context = await getConsolidationMinistryContext(userId, churchId);
  const allowed = kind === "consolidacao" ? context.capabilities.canManageConsolidation : context.capabilities.canManageVisits;
  if (!allowed) throw new TRPCError({ code: "FORBIDDEN", message: `Somente Pastores, Líderes ou Supervisores de ${kind === "consolidacao" ? "Consolidação" : "Visitas"} podem executar esta ação.` });
  return context;
}

async function resolveReferralSource(userId: number, churchId: number, targetPersonId: number) {
  const actor = await requireChurchMember(userId, churchId);
  if (!actor.personId) throw new TRPCError({ code: "FORBIDDEN", message: "Vincule sua conta a uma Pessoa antes de indicar alguém para Consolidação." });
  const roles = await getEffectiveChurchRoles(userId, churchId, actor);
  const target = await getPersonById(targetPersonId, churchId);
  if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Pessoa não encontrada nesta igreja." });
  if (roles.some((role) => CHURCH_ROLE_MANAGER_ROLES.has(role))) return { actor, sourceType: "pastoral" as const, sourceCellId: null, sourceMinistryId: null, sourceDepartmentId: null };

  const [targetCell, cells, ministries, departments] = await Promise.all([
    getActiveCellMembership(targetPersonId, churchId),
    getCellsByChurch(churchId),
    getMinistriesByChurch(churchId),
    getDepartmentsByChurch(churchId),
  ]);
  if (targetCell) {
    const cell = cells.find((item) => item.id === targetCell.cellId);
    if (cell && [cell.leaderId, cell.supervisorId].includes(actor.personId)) return { actor, sourceType: "celula" as const, sourceCellId: cell.id, sourceMinistryId: null, sourceDepartmentId: null };
  }
  for (const department of departments.filter((item) => item.active && [item.leaderId, item.supervisorId].includes(actor.personId))) {
    if (await isActiveDepartmentMember(department.id, targetPersonId, churchId)) return { actor, sourceType: "departamento" as const, sourceCellId: null, sourceMinistryId: department.ministryId, sourceDepartmentId: department.id };
  }
  for (const ministry of ministries.filter((item) => item.active && item.leaderId === actor.personId)) {
    if (await isActiveMinistryMember(ministry.id, targetPersonId, churchId)) return { actor, sourceType: "ministerio" as const, sourceCellId: null, sourceMinistryId: ministry.id, sourceDepartmentId: null };
  }
  throw new TRPCError({ code: "FORBIDDEN", message: "Você só pode indicar Pessoas vinculadas à sua Célula, Ministério ou Departamento." });
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
    actor.personId && [cell.leaderId, cell.coLeaderId, cell.supervisorId].includes(actor.personId)
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

const socialMediaUrlInput = (platform: (typeof SOCIAL_PLATFORM_KEYS)[number]) => z.string().trim().max(500).refine((value) => isValidSocialMediaUrl(platform, value), `Informe uma URL HTTPS válida para ${platform}.`).optional().or(z.literal(""));
const socialMediaInputSchema = z.object({
  instagram: socialMediaUrlInput("instagram"),
  facebook: socialMediaUrlInput("facebook"),
  youtube: socialMediaUrlInput("youtube"),
  tiktok: socialMediaUrlInput("tiktok"),
}).optional();
const pastoralSupportInputSchema = z.object({
  url: z.string().trim().max(500).refine((value) => !value || normalizePastoralSupportUrl(value) !== null, "Informe uma URL HTTPS válida do Dedo de Prosa.").optional().or(z.literal("")),
  label: z.string().trim().max(80).optional().or(z.literal("")),
  enabled: z.boolean().optional(),
  showPublic: z.boolean().optional(),
  showAuthenticated: z.boolean().optional(),
}).optional();

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
        website: z.string().trim().max(500).refine((value) => !value || normalizePublicWebsiteUrl(value) !== null, "Informe uma URL HTTP(S) válida para o website.").optional().or(z.literal("")),
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
        website: z.string().trim().max(500).refine((value) => !value || normalizePublicWebsiteUrl(value) !== null, "Informe uma URL HTTP(S) válida para o website.").optional().or(z.literal("")),
        vision: z.string().optional(),
        mission: z.string().optional(),
        values: z.string().optional(),
        socialMedia: socialMediaInputSchema,
        pastoralSupport: pastoralSupportInputSchema,
        publicRegistrationEnabled: z.boolean().optional(),
        publicRegistrationTitle: z.string().trim().min(3).max(140).optional(),
        publicRegistrationMessage: z.string().trim().min(10).max(500).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, socialMedia, pastoralSupport, website, ...data } = input;
      await requirePastor(ctx.user.id, id);
      return updateChurch(id, {
        ...data,
        ...(socialMedia !== undefined ? { socialMedia: normalizeSocialMediaLinks(socialMedia) } : {}),
        ...(pastoralSupport !== undefined ? { pastoralSupport: normalizePastoralSupportConfig(pastoralSupport) } : {}),
        ...(website !== undefined ? { website: normalizePublicWebsiteUrl(website) } : {}),
      });
    }),

  useLogoAsPwaIcon: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await requirePastor(ctx.user.id, input.id);
      return useChurchLogoAsPwaIcon(input.id);
    }),
});

// ─── SITE PÚBLICO MULTI-TENANT ─────────────────────────────────────────────────
// A página visitante descobre a igreja exclusivamente pelo host resolvido no
// contexto. Já o painel usa apenas o churchId confirmado pela sessão JWT.
const tenantPublicRouter = router({
  current: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.tenantSlug) return null;
    return getPublishedTenantPublicExperienceBySlug(ctx.tenantSlug);
  }),

  adminPreview: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user.churchId || ctx.user.authSource !== "church") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Esta visualização é restrita a contas de igreja." });
    }
    await requireChurchAdministrator(ctx.user.id, ctx.user.churchId);
    return getTenantPublicSiteByChurchId(ctx.user.churchId);
  }),

  saveDraft: protectedProcedure.input(z.object({
    seoTitle: z.string().trim().max(255).nullable().optional(),
    seoDescription: z.string().trim().max(320).nullable().optional(),
    theme: z.object({
      primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
      fontPair: z.literal("sacred_serif").optional(),
      logoUrl: z.string().trim().max(500).refine((value) => value.startsWith("/") || /^https:\/\//.test(value), "Informe uma URL HTTPS ou um arquivo interno.").nullable().optional(),
      faviconUrl: z.string().trim().max(500).refine((value) => value.startsWith("/") || /^https:\/\//.test(value), "Informe uma URL HTTPS ou um arquivo interno.").nullable().optional(),
    }),
    sections: z.array(z.object({
      sectionType: z.enum(["hero", "welcome", "about", "schedule", "events", "ministries", "gallery", "contact", "footer"]),
      enabled: z.boolean(),
      sortOrder: z.number().int().min(0).max(20),
      content: z.object({
        title: z.string().trim().max(140).optional(),
        eyebrow: z.string().trim().max(80).optional(),
        subtitle: z.string().trim().max(280).optional(),
        body: z.string().trim().max(2000).optional(),
        primaryCtaLabel: z.string().trim().max(48).optional(),
        primaryCtaHref: z.string().trim().max(280).refine((value) => value.startsWith("/") || /^https:\/\//.test(value), "Informe um destino interno ou uma URL HTTPS.").optional(),
        heroImageSource: z.enum(["preset", "custom"]).optional(),
        heroImagePresetId: z.enum(HERO_PRESET_IDS).nullable().optional(),
        heroImageUrl: z.string().trim().max(2048).refine((value) => /^https:\/\//.test(value), "A imagem do Hero precisa usar HTTPS.").nullable().optional(),
        heroImageAssetId: z.number().int().positive().nullable().optional(),
        services: z.array(z.object({
          day: z.string().trim().min(2).max(32),
          time: z.string().trim().min(2).max(24),
          label: z.string().trim().max(80).optional(),
          location: z.string().trim().max(160).optional(),
        }).strict()).max(7).optional(),
        items: z.array(z.object({
          url: z.string().trim().max(2048).refine((value) => value.startsWith("/manus-storage/churches/") || /^https:\/\//.test(value), "Informe uma URL HTTPS ou um arquivo interno."),
          mediaAssetId: z.number().int().positive().optional(),
          alt: z.string().trim().min(3).max(180),
          caption: z.string().trim().max(180).optional(),
        }).strict()).max(8).optional(),
      }).strict(),
    })).min(1).max(7),
  })).mutation(async ({ ctx, input }) => {
    if (!ctx.user.churchId || ctx.user.authSource !== "church") throw new TRPCError({ code: "FORBIDDEN" });
    await requireChurchPublicSitePublisher(ctx.user.id, ctx.user.churchId);
    await validateHeroImageSelection(ctx.user.churchId, input.sections);
    return saveTenantPublicDraftByChurchId(ctx.user.churchId, input);
  }),

  publish: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.user.churchId || ctx.user.authSource !== "church") throw new TRPCError({ code: "FORBIDDEN" });
    await requireChurchPublicSitePublisher(ctx.user.id, ctx.user.churchId);
    return publishTenantPublicSiteByChurchId(ctx.user.churchId, ctx.user.id);
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
      const accessibleIds = await getAccessiblePersonIds(ctx.user.id, input.churchId);
      const matches = await findPossiblePeopleByIdentity(input.churchId, input);
      return accessibleIds === null ? matches : matches.filter((person) => accessibleIds.has(person.id));
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
      const access = await getChurchAccessSummary(ctx.user.id, input.churchId);
      const accessiblePersonIds = await getAccessiblePersonIds(ctx.user.id, input.churchId);
      const souls = await getSoulsByChurch(input.churchId);
      if (accessiblePersonIds === null) return souls;
      if (!access.actorPersonId) return [];
      return souls.filter((soul) => soul.personId !== null && accessiblePersonIds.has(soul.personId));
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
      const access = await getChurchAccessSummary(ctx.user.id, input.churchId);
      const isSelfIndication = !access.isPastoralWorker && Boolean(access.actorPersonId);
      if (!access.isPastoralWorker && !isSelfIndication) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Seu perfil não pode registrar uma Nova Alma." });
      }
      if (isSelfIndication && (input.existingPersonId || input.wonById)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Membros podem apenas indicar uma nova alma; a liderança fará os vínculos pastorais." });
      }
      const isSpontaneousVisit = input.origin === "visita_espontanea";
      if (!isSelfIndication && !isSpontaneousVisit && !input.wonById) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Informe quem ganhou a Nova Alma ou selecione visita espontânea." });
      }
      const winner = isSelfIndication
        ? await getPersonById(access.actorPersonId!, input.churchId)
        : input.wonById ? await getPersonById(input.wonById, input.churchId) : null;
      if (isSelfIndication && !winner) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Sua conta ainda não está vinculada a uma Pessoa da igreja." });
      }
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
          wonById: winner?.id ?? null,
        });
      }
      if (!person) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível criar a ficha da Pessoa." });
      }

      const { existingPersonId: _existingPersonId, wonById: _wonById, origin: _origin, acceptedJesus: _acceptedJesus, reconciliation: _reconciliation, firstVisit: _firstVisit, ...soulInput } = input;
      const soul = await createSoul({
        ...soulInput,
        origin: isSelfIndication ? "indicacao" : input.origin,
        acceptedJesus: isSelfIndication ? false : input.acceptedJesus,
        reconciliation: isSelfIndication ? false : input.reconciliation,
        firstVisit: isSelfIndication ? false : input.firstVisit,
        wonById: winner?.id ?? null,
        personId: person.id,
      } as any);
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
            notes: isSelfIndication ? "Indicação registrada pelo próprio membro; aguarda cuidado da liderança." : "Responsável inicial definido no registro da Nova Alma.",
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
      await requirePastoralAction(ctx.user.id, input.churchId);
      const soul = await getSoulById(input.id, input.churchId);
      if (!soul?.personId) throw new TRPCError({ code: "NOT_FOUND", message: "Nova Alma não encontrada." });
      await requireJourneyStagePermission(ctx.user.id, input.churchId, soul.personId);
      return updateSoul(input.id, input.churchId, { status: input.status });
    }),
});

const consolidationRouter = router({
  structure: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      const context = await getConsolidationMinistryContext(ctx.user.id, input.churchId);
      const people = context.capabilities.canConfigure || context.capabilities.canManageConsolidation || context.capabilities.canManageVisits
        ? await getPeopleByChurch(input.churchId)
        : [];
      const names = new Map(people.map((person) => [person.id, person.fullName]));
      const visitsTeam = context.visitsMinistry ? await getMinistryMembers(context.visitsMinistry.id, input.churchId) : [];
      const visitsTeamNames = new Map(visitsTeam.map(({ person }) => [person.id, person.fullName]));
      const departmentRows = [context.consolidationDepartment, context.visitsDepartment].filter((department): department is NonNullable<typeof department> => Boolean(department));
      const departments = await Promise.all(departmentRows.map(async (department) => ({
        ...department,
        leaderName: department.leaderId ? names.get(department.leaderId) ?? "Líder definido" : null,
        supervisorName: department.supervisorId ? names.get(department.supervisorId) ?? "Supervisor definido" : null,
        memberCount: (await getDepartmentMembers(department.id, input.churchId)).length,
      })));
      return {
        ministry: context.ministry,
        visitsMinistry: context.visitsMinistry ? {
          ...context.visitsMinistry,
          leaderName: context.visitsMinistry.leaderId ? visitsTeamNames.get(context.visitsMinistry.leaderId) ?? names.get(context.visitsMinistry.leaderId) ?? "Líder definido" : null,
          memberCount: visitsTeam.length,
          members: context.capabilities.canManageVisits ? visitsTeam.map(({ person }) => ({ id: person.id, fullName: person.fullName })) : [],
        } : null,
        consolidationDepartment: departments.find((department) => department.systemKey === "consolidacao") ?? null,
        visitsDepartment: departments.find((department) => department.systemKey === "visitas") ?? null,
        departments,
        canConfigure: context.capabilities.canConfigure,
        capabilities: context.capabilities,
        people: people.map((person) => ({ id: person.id, fullName: person.fullName })),
      };
    }),

  setupMinistry: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const actor = await requireChurchMember(ctx.user.id, input.churchId);
      const roles = await getEffectiveChurchRoles(ctx.user.id, input.churchId, actor);
      if (!roles.some((role) => CHURCH_ROLE_MANAGER_ROLES.has(role))) throw new TRPCError({ code: "FORBIDDEN", message: "Somente Pastores podem estruturar o Ministério de Consolidação e Visitas." });
      return ensureConsolidationMinistryStructure(input.churchId);
    }),

  setDepartmentLeadership: protectedProcedure
    .input(z.object({ churchId: z.number(), departmentId: z.number(), leaderId: z.number().nullable(), supervisorId: z.number().nullable() }))
    .mutation(async ({ input, ctx }) => {
      const context = await getConsolidationMinistryContext(ctx.user.id, input.churchId);
      if (!context.capabilities.canConfigure || (!context.ministry && !context.visitsMinistry)) throw new TRPCError({ code: "FORBIDDEN", message: "Somente Pastores podem definir Líder e Supervisor." });
      const department = await getDepartmentById(input.departmentId, input.churchId);
      const validMinistryIds = new Set([context.ministry?.id, context.visitsMinistry?.id].filter((id): id is number => Boolean(id)));
      if (!department || !validMinistryIds.has(department.ministryId) || !department.systemKey) throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione um Departamento válido de Consolidação ou Visitas." });
      const actorChurchUserId = ctx.user.id < 0 ? Math.abs(ctx.user.id) : null;
      if (!actorChurchUserId) throw new TRPCError({ code: "FORBIDDEN", message: "Use uma conta pastoral da igreja para definir a liderança." });
      const updated = await setConsolidationDepartmentLeadership({ churchId: input.churchId, departmentId: department.id, leaderId: input.leaderId, supervisorId: input.supervisorId, assignedByChurchUserId: actorChurchUserId });
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Departamento não encontrado." });
      return updated;
    }),

  consolidators: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      const context = await getConsolidationMinistryContext(ctx.user.id, input.churchId);
      if (!context.capabilities.canWorkConsolidation) throw new TRPCError({ code: "FORBIDDEN", message: "Sua função não possui acesso à equipe de Consolidação." });
      const [accounts, churchPeople] = await Promise.all([
        getChurchUsersByChurch(input.churchId),
        getPeopleByChurch(input.churchId),
      ]);
      const names = new Map(churchPeople.map((person) => [person.id, person.fullName]));
      const personIds = Array.from(new Set(accounts.filter((account) => account.active && account.personId).map((account) => account.personId!)));
      const candidates = await Promise.all(personIds.map(async (personId) => {
        const roles = await getEffectivePersonRoles(personId, input.churchId);
        return roles.includes("consolidador") ? { personId, name: names.get(personId) ?? "Consolidador" } : null;
      }));
      return candidates.filter((candidate): candidate is { personId: number; name: string } => Boolean(candidate));
    }),
  visitors: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      const context = await getConsolidationMinistryContext(ctx.user.id, input.churchId);
      if (!context.capabilities.canWorkVisits && !context.capabilities.canWorkConsolidation) throw new TRPCError({ code: "FORBIDDEN", message: "Sua função não possui acesso à equipe de Visitas." });
      const [accounts, churchPeople] = await Promise.all([
        getChurchUsersByChurch(input.churchId),
        getPeopleByChurch(input.churchId),
      ]);
      const names = new Map(churchPeople.map((person) => [person.id, person.fullName]));
      const candidates = await Promise.all(accounts.filter((account) => account.active && account.personId).map(async (account) => {
        const roles = new Set(await getEffectivePersonRoles(account.personId!, input.churchId));
        return roles.has("visitador") || roles.has("pastor_presidente") || roles.has("pastor_local") || roles.has("supervisor")
          ? { personId: account.personId!, name: names.get(account.personId!) ?? account.name }
          : null;
      }));
      return candidates.filter((candidate): candidate is { personId: number; name: string } => Boolean(candidate));
    }),

  referrals: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      const context = await getConsolidationMinistryContext(ctx.user.id, input.churchId);
      const actor = context.actor;
      if (!context.capabilities.canManageConsolidation && !context.capabilities.canWorkConsolidation && !context.capabilities.canRefer) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sua função não possui acesso aos casos de Consolidação." });
      }
      const canViewAll = context.capabilities.canManageConsolidation;
      const isPastor = context.roles.some((role) => PASTOR_ROLES.has(role));
      const [referrals, managedPersonIds, churchPeople] = await Promise.all([
        getConsolidationReferralsByChurch(input.churchId),
        canViewAll || !actor.personId
          ? Promise.resolve<number[]>([])
          : getJourneyManagedPersonIds({ churchId: input.churchId, actorPersonId: actor.personId, actorRoles: context.roles }),
        getPeopleByChurch(input.churchId),
      ]);
      const managedIds = new Set(managedPersonIds);
      const visible = canViewAll
        ? referrals
        : referrals.filter((referral) => referral.referredByPersonId === actor.personId || referral.preferredConsolidatorId === actor.personId || referral.assignedToPersonId === actor.personId || referral.acceptedByPersonId === actor.personId || managedIds.has(referral.personId));
      const peopleById = new Map(churchPeople.map((person) => [person.id, person]));
      return visible.map((referral) => {
        const person = peopleById.get(referral.personId);
        const canViewContact = canViewAll || ((referral.assignedToPersonId === actor.personId || referral.acceptedByPersonId === actor.personId) && referral.status !== "pendente");
        return {
          ...referral,
          ...getReferralCareDueState(referral),
          personName: person?.fullName ?? "Pessoa vinculada",
          contactNumber: canViewContact ? (person?.whatsapp || person?.phone || null) : null,
          referredByName: peopleById.get(referral.referredByPersonId)?.fullName ?? "Liderança",
          sourceName: referral.sourceType === "celula" ? "Célula" : referral.sourceType === "ministerio" ? "Ministério" : referral.sourceType === "departamento" ? "Departamento" : referral.sourceType === "pastoral" ? "Pastoral" : "Liderança",
          preferredConsolidatorName: referral.preferredConsolidatorId ? peopleById.get(referral.preferredConsolidatorId)?.fullName ?? "Consolidador indicado" : null,
          assignedToName: referral.assignedToPersonId ? peopleById.get(referral.assignedToPersonId)?.fullName ?? "Consolidador atribuído" : null,
          acceptedByName: referral.acceptedByPersonId ? peopleById.get(referral.acceptedByPersonId)?.fullName ?? "Consolidador" : null,
          canAssign: canViewAll,
          canApprove: Boolean(context.capabilities.canManageConsolidation && referral.status === "pendente"),
          canAccept: Boolean(context.roles.includes("consolidador") && actor.personId && referral.status === "aprovado" && (!referral.assignedToPersonId || referral.assignedToPersonId === actor.personId)),
          canIntegrate: Boolean(isPastor && referral.status === "em_acompanhamento"),
        };
      });
    }),
  visits: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      const context = await getConsolidationMinistryContext(ctx.user.id, input.churchId);
      if (!context.capabilities.canWorkVisits && !context.capabilities.canManageConsolidation) throw new TRPCError({ code: "FORBIDDEN", message: "Sua função não possui acesso à aba Visitas." });
      const [visits, referrals, churchPeople] = await Promise.all([
        getCareVisitsByChurch(input.churchId),
        getConsolidationReferralsByChurch(input.churchId),
        getPeopleByChurch(input.churchId),
      ]);
      const referralsById = new Map(referrals.map((referral) => [referral.id, referral]));
      const peopleById = new Map(churchPeople.map((person) => [person.id, person]));
      const canMonitorAll = context.capabilities.canManageVisits;
      const canAcceptVisits = Boolean(context.actor.personId && context.roles.includes("visitador"));
      return visits
        .filter((visit) => canMonitorAll || visit.assignedToPersonId === context.actor.personId || visit.requestedByPersonId === context.actor.personId || (canAcceptVisits && !visit.assignedToPersonId))
        .map((visit) => {
          const referral = referralsById.get(visit.referralId);
          const person = referral ? peopleById.get(referral.personId) : null;
          const canViewContact = canMonitorAll || visit.assignedToPersonId === context.actor.personId;
          return {
            ...visit,
            personId: referral?.personId ?? null,
            personName: person?.fullName ?? "Pessoa vinculada",
            contactNumber: canViewContact ? (person?.whatsapp || person?.phone || null) : null,
            address: visit.address || (canViewContact ? [person?.street, person?.number, person?.neighborhood, person?.city, person?.state].filter(Boolean).join(", ") || null : null),
            caseReason: referral?.reason ?? visit.reason,
            notes: visit.completionNotes ?? visit.cancellationReason ?? null,
            assignedToName: visit.assignedToPersonId ? peopleById.get(visit.assignedToPersonId)?.fullName ?? "Visitador designado" : null,
            requestedByName: peopleById.get(visit.requestedByPersonId)?.fullName ?? "Responsável de cuidado",
            canAssign: context.capabilities.canManageVisits,
            canAccept: Boolean(canAcceptVisits && !visit.assignedToPersonId && !["realizada", "cancelada"].includes(visit.status)),
            canComplete: Boolean(context.capabilities.canManageVisits || visit.assignedToPersonId === context.actor.personId),
          };
        });
    }),

  createReferral: protectedProcedure
    .input(z.object({
      churchId: z.number(),
      personId: z.number(),
      reason: z.string().trim().min(3).max(255),
      notes: z.string().trim().max(2000).optional(),
      priority: z.enum(["baixa", "normal", "alta", "urgente"]).default("normal"),
      preferredConsolidatorId: z.number().optional(),
      careDueInDays: z.number().int().min(1).max(14).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const source = await resolveReferralSource(ctx.user.id, input.churchId, input.personId);
      const context = await getConsolidationMinistryContext(ctx.user.id, input.churchId);
      if (input.preferredConsolidatorId) await requireConsolidatorPerson(input.preferredConsolidatorId, input.churchId);
      const churchUserId = ctx.user.id < 0 ? Math.abs(ctx.user.id) : null;
      try {
        return await createConsolidationReferralCase({
          churchId: input.churchId,
          personId: input.personId,
          referredByPersonId: source.actor.personId!,
          preferredConsolidatorId: input.preferredConsolidatorId ?? null,
          assignedToPersonId: input.preferredConsolidatorId ?? null,
          assignedByChurchUserId: input.preferredConsolidatorId ? churchUserId : null,
          assignedAt: input.preferredConsolidatorId ? new Date() : null,
          departmentId: context.consolidationDepartment?.id ?? null,
          sourceType: source.sourceType,
          sourceCellId: source.sourceCellId,
          sourceMinistryId: source.sourceMinistryId,
          sourceDepartmentId: source.sourceDepartmentId,
          priority: input.priority,
          reason: input.reason,
          notes: input.notes || null,
          status: "pendente",
          careDueAt: new Date(Date.now() + (input.careDueInDays ?? DEFAULT_REFERRAL_CARE_DUE_DAYS) * 24 * 60 * 60 * 1000),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.includes("já possui um caso ativo")) throw new TRPCError({ code: "CONFLICT", message: "Esta Pessoa já possui um caso ativo na Consolidação." });
        throw error;
      }
    }),

  assignReferral: protectedProcedure
    .input(z.object({ churchId: z.number(), id: z.number(), consolidatorId: z.number().nullable(), notes: z.string().trim().max(1000).optional() }))
    .mutation(async ({ input, ctx }) => {
      await requireConsolidationDepartmentManager(ctx.user.id, input.churchId, "consolidacao");
      if (input.consolidatorId) await requireConsolidatorPerson(input.consolidatorId, input.churchId);
      return assignConsolidationCase({
        churchId: input.churchId,
        referralId: input.id,
        toPersonId: input.consolidatorId,
        performedByChurchUserId: ctx.user.id < 0 ? Math.abs(ctx.user.id) : null,
        notes: input.notes || null,
      });
    }),

  assignmentHistory: protectedProcedure
    .input(z.object({ churchId: z.number(), referralId: z.number() }))
    .query(async ({ input, ctx }) => {
      const context = await getConsolidationMinistryContext(ctx.user.id, input.churchId);
      const referral = await getConsolidationReferralById(input.referralId, input.churchId);
      if (!referral) throw new TRPCError({ code: "NOT_FOUND", message: "Caso de Consolidação não encontrado." });
      const canView = context.capabilities.canManageConsolidation || referral.assignedToPersonId === context.actor.personId || referral.acceptedByPersonId === context.actor.personId;
      if (!canView) throw new TRPCError({ code: "FORBIDDEN", message: "Você não possui acesso ao histórico deste caso." });
      const [events, people] = await Promise.all([getConsolidationCaseAssignments(input.referralId, input.churchId), getPeopleByChurch(input.churchId)]);
      const names = new Map(people.map((person) => [person.id, person.fullName]));
      return events.map((event) => ({ ...event, fromName: event.fromPersonId ? names.get(event.fromPersonId) ?? "Responsável anterior" : null, toName: event.toPersonId ? names.get(event.toPersonId) ?? "Novo responsável" : null }));
    }),

  updateReferralCareDue: protectedProcedure
    .input(z.object({ churchId: z.number(), id: z.number(), careDueAt: z.string().datetime() }))
    .mutation(async ({ input, ctx }) => {
      const context = await getConsolidationMinistryContext(ctx.user.id, input.churchId);
      const referral = await getConsolidationReferralById(input.id, input.churchId);
      if (!referral) throw new TRPCError({ code: "NOT_FOUND", message: "Caso de Consolidação não encontrado." });
      if (!context.capabilities.canManageConsolidation && referral.acceptedByPersonId !== context.actor.personId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Somente o Consolidador responsável, Líder ou Supervisor pode ajustar este prazo." });
      }
      if (["encerrado", "cancelado"].includes(referral.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Não é possível alterar o prazo de um encaminhamento encerrado." });
      }
      const dueAt = new Date(input.careDueAt);
      if (dueAt.getTime() <= Date.now()) throw new TRPCError({ code: "BAD_REQUEST", message: "Defina um prazo futuro para o cuidado." });
      return updateConsolidationReferral(input.id, input.churchId, { careDueAt: dueAt });
    }),

  approveReferral: protectedProcedure
    .input(z.object({ churchId: z.number(), id: z.number(), notes: z.string().trim().max(1000).optional() }))
    .mutation(async ({ input, ctx }) => {
      const context = await getConsolidationMinistryContext(ctx.user.id, input.churchId);
      if (!context.capabilities.canManageConsolidation) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Somente a liderança autorizada pode aceitar uma indicação para Consolidação." });
      }
      const referral = await getConsolidationReferralById(input.id, input.churchId);
      if (!referral || referral.status !== "pendente") throw new TRPCError({ code: "BAD_REQUEST", message: "Este caso já foi analisado ou não está disponível." });
      try {
        return await approveConsolidationCase({ churchId: input.churchId, referralId: input.id, approvedByPersonId: context.actor.personId ?? null, churchUserId: ctx.user.id < 0 ? Math.abs(ctx.user.id) : null, notes: input.notes?.trim() || null });
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.includes("já foi analisado")) throw new TRPCError({ code: "CONFLICT", message: "Este caso já foi analisado por outra pessoa. Atualize a fila." });
        throw error;
      }
    }),

  acceptReferral: protectedProcedure
    .input(z.object({ churchId: z.number(), id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const context = await getConsolidationMinistryContext(ctx.user.id, input.churchId);
      const actor = context.actor;
      if (!actor.personId || !context.roles.includes("consolidador")) throw new TRPCError({ code: "FORBIDDEN", message: "Somente uma Pessoa com função ativa de Consolidador pode assumir este caso." });
      const referral = await getConsolidationReferralById(input.id, input.churchId);
      if (!referral || !["pendente", "aprovado"].includes(referral.status)) throw new TRPCError({ code: "BAD_REQUEST", message: "Este caso não está disponível para aceite." });
      if ((referral.assignedToPersonId || referral.preferredConsolidatorId) && (referral.assignedToPersonId ?? referral.preferredConsolidatorId) !== actor.personId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Este caso está atribuído a outro Consolidador." });
      }
      try {
        return await acceptConsolidationCase({ churchId: input.churchId, referralId: input.id, personId: actor.personId, churchUserId: ctx.user.id < 0 ? Math.abs(ctx.user.id) : null });
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.includes("não está mais disponível")) throw new TRPCError({ code: "CONFLICT", message: "Este caso já foi assumido por outra Pessoa. Atualize a fila." });
        throw error;
      }
    }),

  registerReferralContact: protectedProcedure
    .input(z.object({ churchId: z.number(), id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const context = await getConsolidationMinistryContext(ctx.user.id, input.churchId);
      const referral = await getConsolidationReferralById(input.id, input.churchId);
      if (!referral) throw new TRPCError({ code: "NOT_FOUND", message: "Caso de Consolidação não encontrado." });
      if (!context.capabilities.canManageConsolidation && referral.acceptedByPersonId !== context.actor.personId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Somente o Consolidador responsável, Líder ou Supervisor pode registrar este contato." });
      }
      return updateConsolidationReferral(input.id, input.churchId, {
        status: "em_acompanhamento",
        firstContactAt: referral.firstContactAt ?? new Date(),
      });
    }),

  followUps: protectedProcedure
    .input(z.object({ churchId: z.number(), referralId: z.number() }))
    .query(async ({ input, ctx }) => {
      const context = await getConsolidationMinistryContext(ctx.user.id, input.churchId);
      const referral = await getConsolidationReferralById(input.referralId, input.churchId);
      if (!referral) throw new TRPCError({ code: "NOT_FOUND", message: "Caso de Consolidação não encontrado." });
      const isResponsible = referral.acceptedByPersonId === context.actor.personId;
      const isReferrer = referral.referredByPersonId === context.actor.personId;
      if (!context.capabilities.canManageConsolidation && !isResponsible && !isReferrer) throw new TRPCError({ code: "FORBIDDEN", message: "Você não possui acesso ao histórico deste caso." });
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
      const context = await getConsolidationMinistryContext(ctx.user.id, input.churchId);
      const actor = context.actor;
      if (!actor.personId) throw new TRPCError({ code: "FORBIDDEN", message: "Vincule sua conta a uma Pessoa antes de registrar acompanhamento." });
      const referral = await getConsolidationReferralById(input.referralId, input.churchId);
      if (!referral || !referral.acceptedByPersonId) throw new TRPCError({ code: "BAD_REQUEST", message: "O caso precisa ser assumido antes do acompanhamento." });
      if (!context.capabilities.canManageConsolidation && referral.acceptedByPersonId !== actor.personId) throw new TRPCError({ code: "FORBIDDEN", message: "Somente o Consolidador responsável, Líder ou Supervisor pode registrar este acompanhamento." });
      if (["encerrado", "cancelado"].includes(referral.status)) throw new TRPCError({ code: "BAD_REQUEST", message: "Este caso já foi encerrado e não aceita novos acompanhamentos." });
      if (referral.status !== "aceito" && referral.status !== "em_acompanhamento") throw new TRPCError({ code: "BAD_REQUEST", message: "O caso precisa estar pronto para acompanhamento." });
      if (input.visitAssigneePersonId) await requireVisitorPerson(input.visitAssigneePersonId, input.churchId);
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
      let visit = null;
      if (["solicitada", "agendada"].includes(input.visitStatus)) {
        visit = await createCareVisit({
          churchId: input.churchId,
          referralId: input.referralId,
          departmentId: context.visitsDepartment?.id ?? null,
          requestedByPersonId: actor.personId,
          assignedToPersonId: input.visitAssigneePersonId ?? null,
          assignedByChurchUserId: input.visitAssigneePersonId ? (ctx.user.id < 0 ? Math.abs(ctx.user.id) : null) : null,
          assignedAt: input.visitAssigneePersonId ? new Date() : null,
          reason: (input.nextAction || "Visita solicitada pela Consolidação").slice(0, 255),
          address: null,
          priority: referral.priority,
          status: input.visitScheduledAt ? "agendada" : "solicitada",
          scheduledAt: input.visitScheduledAt ? new Date(input.visitScheduledAt) : null,
          performedByChurchUserId: ctx.user.id < 0 ? Math.abs(ctx.user.id) : null,
        });
      }
      await updateConsolidationReferral(input.referralId, input.churchId, { status: "em_acompanhamento", firstContactAt: referral.firstContactAt ?? new Date() });
      return { followUp, visit };
    }),
  assignVisit: protectedProcedure
    .input(z.object({ churchId: z.number(), visitId: z.number(), visitorId: z.number().nullable(), scheduledAt: z.string().datetime().nullable().optional(), notes: z.string().trim().max(1000).optional() }))
    .mutation(async ({ input, ctx }) => {
      await requireConsolidationDepartmentManager(ctx.user.id, input.churchId, "visitas");
      if (input.visitorId) await requireVisitorPerson(input.visitorId, input.churchId);
      return assignCareVisit({ churchId: input.churchId, visitId: input.visitId, toPersonId: input.visitorId, performedByChurchUserId: ctx.user.id < 0 ? Math.abs(ctx.user.id) : null, scheduledAt: input.scheduledAt === undefined ? undefined : input.scheduledAt ? new Date(input.scheduledAt) : null, notes: input.notes || null });
    }),

  acceptVisit: protectedProcedure
    .input(z.object({ churchId: z.number(), visitId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const context = await getConsolidationMinistryContext(ctx.user.id, input.churchId);
      if (!context.actor.personId || !context.roles.includes("visitador")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Somente Visitadores ativos podem aceitar uma Visita." });
      }
      const visit = await getCareVisitById(input.visitId, input.churchId);
      if (!visit) throw new TRPCError({ code: "NOT_FOUND", message: "Visita não encontrada nesta igreja." });
      if (visit.assignedToPersonId && visit.assignedToPersonId !== context.actor.personId) {
        throw new TRPCError({ code: "CONFLICT", message: "Esta Visita já foi assumida por outro Visitador." });
      }
      try {
        return await acceptCareVisit({ churchId: input.churchId, visitId: input.visitId, personId: context.actor.personId, performedByChurchUserId: ctx.user.id < 0 ? Math.abs(ctx.user.id) : null });
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.includes("não pode mais") || message.includes("já foi assumida")) throw new TRPCError({ code: "CONFLICT", message });
        throw error;
      }
    }),

  completeVisit: protectedProcedure
    .input(z.object({ churchId: z.number(), visitId: z.number(), notes: z.string().trim().min(3).max(3000) }))
    .mutation(async ({ input, ctx }) => {
      const context = await getConsolidationMinistryContext(ctx.user.id, input.churchId);
      const visit = await getCareVisitById(input.visitId, input.churchId);
      if (!visit) throw new TRPCError({ code: "NOT_FOUND", message: "Visita não encontrada." });
      if (!context.capabilities.canManageVisits && visit.assignedToPersonId !== context.actor.personId) throw new TRPCError({ code: "FORBIDDEN", message: "Esta Visita não está atribuída à sua função." });
      const completed = await completeCareVisit({ churchId: input.churchId, visitId: input.visitId, performedByChurchUserId: ctx.user.id < 0 ? Math.abs(ctx.user.id) : null, notes: input.notes });
      if (context.actor.personId) {
        await createConsolidationFollowUp({ churchId: input.churchId, referralId: visit.referralId, recordedByPersonId: context.actor.personId, contactChannel: "visita", outcome: "visitou", notes: input.notes, visitStatus: "realizada", visitAssigneePersonId: visit.assignedToPersonId });
      }
      const referral = await getConsolidationReferralById(visit.referralId, input.churchId);
      if (referral) await updateConsolidationReferral(referral.id, input.churchId, { status: "em_acompanhamento", firstContactAt: referral.firstContactAt ?? new Date() });
      return completed;
    }),

  cancelVisit: protectedProcedure
    .input(z.object({ churchId: z.number(), visitId: z.number(), reason: z.string().trim().min(3).max(1000) }))
    .mutation(async ({ input, ctx }) => {
      await requireConsolidationDepartmentManager(ctx.user.id, input.churchId, "visitas");
      return cancelCareVisit({ churchId: input.churchId, visitId: input.visitId, performedByChurchUserId: ctx.user.id < 0 ? Math.abs(ctx.user.id) : null, reason: input.reason });
    }),

  visitHistory: protectedProcedure
    .input(z.object({ churchId: z.number(), visitId: z.number() }))
    .query(async ({ input, ctx }) => {
      const context = await getConsolidationMinistryContext(ctx.user.id, input.churchId);
      const visit = await getCareVisitById(input.visitId, input.churchId);
      if (!visit) throw new TRPCError({ code: "NOT_FOUND", message: "Visita não encontrada." });
      if (!context.capabilities.canManageVisits && visit.assignedToPersonId !== context.actor.personId && visit.requestedByPersonId !== context.actor.personId) throw new TRPCError({ code: "FORBIDDEN", message: "Você não possui acesso ao histórico desta Visita." });
      return getCareVisitEvents(input.visitId, input.churchId);
    }),

  closeReferral: protectedProcedure
    .input(z.object({ churchId: z.number(), id: z.number(), closeNotes: z.string().trim().min(3).max(2000) }))
    .mutation(async ({ input, ctx }) => {
      const context = await getConsolidationMinistryContext(ctx.user.id, input.churchId);
      const referral = await getConsolidationReferralById(input.id, input.churchId);
      if (!referral) throw new TRPCError({ code: "NOT_FOUND", message: "Caso de Consolidação não encontrado." });
      if (!context.capabilities.canManageConsolidation && referral.acceptedByPersonId !== context.actor.personId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Somente o Consolidador responsável, Líder ou Supervisor pode encerrar este acompanhamento." });
      }
      if (referral.status !== "em_acompanhamento") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "O cuidado só pode ser encerrado depois do primeiro acompanhamento." });
      }
      const followUps = await getConsolidationFollowUpsByReferral(input.id, input.churchId);
      if (followUps.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Registre pelo menos um acompanhamento antes de encerrar o cuidado." });
      }
      return updateConsolidationReferral(input.id, input.churchId, {
        status: "encerrado",
        closedAt: new Date(),
        closeNotes: input.closeNotes,
      });
    }),

  integrateReferralIntoCell: protectedProcedure
    .input(z.object({ churchId: z.number(), referralId: z.number(), cellId: z.number(), closeNotes: z.string().trim().max(2000).optional() }))
    .mutation(async ({ input, ctx }) => {
      const context = await getConsolidationMinistryContext(ctx.user.id, input.churchId);
      if (!context.roles.some((role) => PASTOR_ROLES.has(role))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Somente o Pastor pode concluir a integração de uma Pessoa em uma Célula." });
      }
      try {
        return await integrateConsolidationReferralIntoCell({
          churchId: input.churchId,
          referralId: input.referralId,
          cellId: input.cellId,
          closeNotes: input.closeNotes?.trim() || "Cuidado concluído com integração em Célula.",
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        throw new TRPCError({ code: "BAD_REQUEST", message: message || "Não foi possível concluir a integração em Célula." });
      }
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
      const [soul, existing] = await Promise.all([
        getSoulById(input.soulId, input.churchId),
        getConsolidationsBySoul(input.soulId, input.churchId),
      ]);
      if (!soul) throw new TRPCError({ code: "NOT_FOUND", message: "Nova Alma não encontrada." });
      if (!soul.personId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Esta Nova Alma precisa estar vinculada a uma Pessoa antes da consolidação." });
      }
      await requireJourneyStagePermission(ctx.user.id, input.churchId, soul.personId);
      await requireConsolidatorPerson(input.consolidatorId, input.churchId);
      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Esta Nova Alma já possui uma consolidação em andamento." });
      }
      try {
        return await startConsolidationWorkflow({
          churchId: input.churchId,
          soulId: soul.id,
          personId: soul.personId,
          consolidatorId: input.consolidatorId,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.includes("já possui uma consolidação")) {
          throw new TRPCError({ code: "CONFLICT", message: "Esta Nova Alma já possui uma consolidação em andamento." });
        }
        if (message.includes("Nova Alma inválida")) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "A Nova Alma mudou durante a operação. Atualize a tela e tente novamente." });
        }
        throw error;
      }
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

      const [visits, referrals, people, managedPersonIds] = await Promise.all([
        getCareVisitsByChurch(input.churchId),
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

      return visits
        .map((visit) => {
          const referral = referralsById.get(visit.referralId);
          if (!referral || referral.status === "encerrado") return null;
          const canSee = canManageAll || visit.assignedToPersonId === actor.personId || visit.requestedByPersonId === actor.personId || referral.acceptedByPersonId === actor.personId || referral.referredByPersonId === actor.personId || managedIds.has(referral.personId);
          if (!canSee) return null;
          const person = peopleById.get(referral.personId);
          const canViewContact = canManageAll || visit.assignedToPersonId === actor.personId || referral.acceptedByPersonId === actor.personId;
          return {
            ...visit,
            visitId: visit.id,
            personId: referral.personId,
            personName: person?.fullName ?? "Pessoa vinculada",
            contactNumber: canViewContact ? (person?.whatsapp || person?.phone || null) : null,
            caseReason: referral.reason,
            assignedToName: visit.assignedToPersonId ? peopleById.get(visit.assignedToPersonId)?.fullName ?? "Visitador designado" : null,
            notes: visit.completionNotes ?? visit.cancellationReason ?? null,
            consolidatorId: referral.acceptedByPersonId,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => Number(new Date(a.createdAt)) - Number(new Date(b.createdAt)));
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
      await requireScopedPersonRead(ctx.user.id, input.churchId, input.personId);
      const person = await getPersonById(input.personId, input.churchId);
      if (!person) throw new TRPCError({ code: "NOT_FOUND", message: "Pessoa não encontrada." });
      return getCurrentCareAssignment(input.personId, input.churchId);
    }),

  history: protectedProcedure
    .input(z.object({ churchId: z.number(), personId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireScopedPersonRead(ctx.user.id, input.churchId, input.personId);
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
        releaseAccess: z.boolean().default(true),
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
      return setCurrentCareAssignment({
        ...input,
        approverChurchUserId: ctx.user.id < 0 ? Math.abs(ctx.user.id) : null,
        releaseAccess: input.releaseAccess,
      });
    }),
});

const cellsRouter = router({
  managementAccess: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      const actor = await requireChurchMember(ctx.user.id, input.churchId);
      const roles = await getEffectiveChurchRoles(ctx.user.id, input.churchId, actor);
      return {
        actorPersonId: actor.personId ?? null,
        canCreateAny: roles.some((role) => PASTOR_ROLES.has(role)),
        canCreateOwn: false,
      };
    }),
  list: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      const actor = await requireChurchMember(ctx.user.id, input.churchId);
      const roles = await getEffectiveChurchRoles(ctx.user.id, input.churchId, actor);
      const canManageAll = roles.some((role) => PASTOR_ROLES.has(role));
      const rows = await getCellsByChurch(input.churchId);
      const accessibleIds = canManageAll || !actor.personId
        ? new Set(rows.map((cell) => cell.id))
        : new Set(await getAccessibleCellIdsByPerson(actor.personId, input.churchId));
      return rows.filter((cell) => accessibleIds.has(cell.id)).map((cell) => ({
        ...cell,
        canManage: canManageAll || Boolean(actor.personId && [cell.leaderId, cell.coLeaderId, cell.supervisorId].includes(actor.personId)),
        canTransferMembers: canManageAll,
      }));
    }),

  members: protectedProcedure
    .input(z.object({ churchId: z.number(), cellId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireCellScopedRead(ctx.user.id, input.churchId, input.cellId);
      return getActiveMembersByCell(input.cellId, input.churchId);
    }),

  memberCounts: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      const actor = await requireChurchMember(ctx.user.id, input.churchId);
      const roles = await getEffectiveChurchRoles(ctx.user.id, input.churchId, actor);
      const counts = await getCellMembersCount(input.churchId);
      if (roles.some((role) => PASTOR_ROLES.has(role)) || !actor.personId) return counts;
      const accessibleIds = new Set(await getAccessibleCellIdsByPerson(actor.personId, input.churchId));
      return counts.filter((item) => accessibleIds.has(item.cellId));
    }),

  meetingHistory: protectedProcedure
    .input(z.object({ churchId: z.number(), cellId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireCellScopedRead(ctx.user.id, input.churchId, input.cellId);
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

  assignmentCandidates: protectedProcedure
    .input(z.object({ churchId: z.number(), cellId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const cell = await getCellById(input.cellId, input.churchId);
      if (!cell || !cell.active) throw new TRPCError({ code: "NOT_FOUND", message: "Célula não encontrada." });
      await requireCellManagementPermission(ctx.user.id, input.churchId, input.cellId);
      return getPeopleWithoutActiveCell(input.churchId);
    }),

  personMembership: protectedProcedure
    .input(z.object({ churchId: z.number(), personId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireScopedPersonRead(ctx.user.id, input.churchId, input.personId);
      const person = await getPersonById(input.personId, input.churchId);
      if (!person) throw new TRPCError({ code: "NOT_FOUND", message: "Pessoa não encontrada." });
      return getActiveCellMembership(input.personId, input.churchId);
    }),

  membershipHistory: protectedProcedure
    .input(z.object({ churchId: z.number(), personId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireScopedPersonRead(ctx.user.id, input.churchId, input.personId);
      const person = await getPersonById(input.personId, input.churchId);
      if (!person) throw new TRPCError({ code: "NOT_FOUND", message: "Pessoa não encontrada." });
      return getCellMembershipHistory(input.personId, input.churchId);
    }),

  assignPerson: protectedProcedure
    .input(z.object({ churchId: z.number(), personId: z.number().int().positive(), cellId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const [person, cell, previousMembership] = await Promise.all([
        getPersonById(input.personId, input.churchId),
        getCellById(input.cellId, input.churchId),
        getActiveCellMembership(input.personId, input.churchId),
      ]);
      if (!person || !person.active || !cell || !cell.active) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Pessoa ou Célula inválida para esta igreja." });
      }
      const authorization = await requireCellManagementPermission(ctx.user.id, input.churchId, input.cellId);
      if (previousMembership?.cellId === input.cellId) {
        return { membership: previousMembership, transferred: false };
      }
      if (previousMembership && !authorization.canManageAll) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Transferências entre Células devem ser realizadas por um Pastor ou Supervisor." });
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
        coLeaderId: z.number().optional().nullable(),
        supervisorId: z.number().optional().nullable(),
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
      await requirePastor(ctx.user.id, input.churchId);
      const assignedIds = [input.leaderId, input.coLeaderId ?? null, input.supervisorId ?? null].filter((id): id is number => id !== null && id !== undefined);
      if (new Set(assignedIds).size !== assignedIds.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Líder, co-líder e supervisor devem ser Pessoas diferentes." });
      const assignedPeople = await Promise.all(assignedIds.map((personId) => getPersonById(personId, input.churchId)));
      if (assignedPeople.some((person) => !person)) throw new TRPCError({ code: "BAD_REQUEST", message: "Toda liderança deve pertencer a esta igreja." });
      return createCell(input as any);
    }),
  updateLeadership: protectedProcedure
    .input(z.object({
      churchId: z.number().int().positive(),
      cellId: z.number().int().positive(),
      leaderId: z.number().int().positive(),
      coLeaderId: z.number().int().positive().nullable(),
      supervisorId: z.number().int().positive().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requirePastor(ctx.user.id, input.churchId);
      const assignedIds = [input.leaderId, input.coLeaderId, input.supervisorId].filter((id): id is number => id !== null);
      if (new Set(assignedIds).size !== assignedIds.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Líder, co-líder e supervisor devem ser Pessoas diferentes." });
      const cell = await getCellById(input.cellId, input.churchId);
      if (!cell || !cell.active) throw new TRPCError({ code: "NOT_FOUND", message: "Célula não encontrada nesta igreja." });
      const assignedPeople = await Promise.all(assignedIds.map((personId) => getPersonById(personId, input.churchId)));
      if (assignedPeople.some((person) => !person)) throw new TRPCError({ code: "BAD_REQUEST", message: "Toda liderança deve pertencer a esta igreja." });
      return updateCell(input.cellId, input.churchId, { leaderId: input.leaderId, coLeaderId: input.coLeaderId, supervisorId: input.supervisorId });
    }),
  updatePublicSettings: protectedProcedure
    .input(z.object({
      churchId: z.number(),
      cellId: z.number(),
      address: z.string().trim().max(500).nullable(),
      city: z.string().trim().max(100).nullable(),
      neighborhood: z.string().trim().max(100).nullable(),
      latitude: z.number().min(-90).max(90).nullable(),
      longitude: z.number().min(-180).max(180).nullable(),
      meetingDay: z.enum(["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"]).nullable(),
      meetingTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe um horário válido.").nullable(),
      publicVisible: z.boolean(),
      publicLocationMode: z.enum(["approximate", "exact"]),
      publicLeaderContact: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireChurchPublicSitePublisher(ctx.user.id, input.churchId);
      const cell = await getCellById(input.cellId, input.churchId);
      if (!cell) throw new TRPCError({ code: "NOT_FOUND", message: "Célula não encontrada nesta igreja." });
      if (input.publicVisible && (input.latitude === null || input.longitude === null)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Defina a localização no mapa antes de publicar a Célula." });
      }
      if (input.publicLeaderContact) {
        const leader = await getPersonById(cell.leaderId, input.churchId);
        if (!leader?.whatsapp?.trim() && !leader?.phone?.trim()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "O líder precisa ter telefone ou WhatsApp cadastrado antes da publicação do contato." });
        }
      }
      return updateCell(input.cellId, input.churchId, {
        address: input.address || null,
        city: input.city || null,
        neighborhood: input.neighborhood || null,
        latitude: input.latitude === null ? null : String(input.latitude),
        longitude: input.longitude === null ? null : String(input.longitude),
        meetingDay: input.meetingDay,
        meetingTime: input.meetingTime,
        publicVisible: input.publicVisible,
        publicLocationMode: input.publicLocationMode,
        publicLeaderContact: input.publicLeaderContact,
      });
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
      const actor = await requireChurchMember(ctx.user.id, input.churchId);
      const actorRoles = await getEffectiveChurchRoles(ctx.user.id, input.churchId, actor);
      const [rows, counts, churchPeople, assignments, definitions] = await Promise.all([
        getMinistriesByChurch(input.churchId),
        getMinistryMemberCounts(input.churchId),
        getPeopleByChurch(input.churchId),
        actor.personId ? getMinistryRoleAssignmentsByPerson(actor.personId, input.churchId) : Promise.resolve([]),
        getMinistryRoleDefinitionsByChurch(input.churchId),
      ]);
      const countByMinistry = new Map(counts.map((item) => [item.ministryId, Number(item.count)]));
      const nameByPerson = new Map(churchPeople.map((person) => [person.id, person.fullName]));
      const definitionByKey = new Map(definitions.map((definition) => [definition.key, definition]));
      const canManageAll = actorRoles.some((role) => PASTOR_ROLES.has(role));
      const managedByAssignment = new Set(assignments.filter(({ assignment }) =>
        MINISTRY_MANAGEMENT_ROLE_KEYS.has(assignment.roleKey)
        || definitionByKey.get(assignment.roleKey)?.permissionPackage === "ministry_leader"
      ).map(({ assignment }) => assignment.ministryId));
      const visibleRows = canManageAll
        ? rows
        : rows.filter((ministry) => Boolean(actor.personId && ministry.leaderId === actor.personId) || managedByAssignment.has(ministry.id));
      if (!canManageAll && visibleRows.length === 0) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Você não possui um Ministério sob sua responsabilidade." });
      }
      return visibleRows.map((m) => ({
        ...m,
        memberCount: countByMinistry.get(m.id) ?? 0,
        leaderName: m.leaderId ? nameByPerson.get(m.leaderId) ?? null : null,
        canManage: canManageAll || Boolean(actor.personId && m.leaderId === actor.personId) || managedByAssignment.has(m.id),
      }));
    }),
  members: protectedProcedure
    .input(z.object({ churchId: z.number(), ministryId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const actor = await requireChurchMember(ctx.user.id, input.churchId);
      const ministry = (await getMinistriesByChurch(input.churchId)).find((item) => item.id === input.ministryId && item.active);
      if (!ministry) throw new TRPCError({ code: "NOT_FOUND", message: "Ministério não encontrado nesta igreja." });
      const roles = await getEffectiveChurchRoles(ctx.user.id, input.churchId, actor);
      const canReadAll = roles.some((role) => PASTOR_ROLES.has(role));
      const canManage = canReadAll || Boolean(actor.personId && ministry.leaderId === actor.personId);
      const isMember = actor.personId ? await isActiveMinistryMember(input.ministryId, actor.personId, input.churchId) : false;
      if (!canManage && !isMember) throw new TRPCError({ code: "FORBIDDEN", message: "Você só pode consultar Ministérios do seu escopo." });
      return getMinistryMembers(input.ministryId, input.churchId);
    }),
  candidates: protectedProcedure
    .input(z.object({ churchId: z.number(), ministryId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      await requireMinistryManagementPermission(ctx.user.id, input.churchId, input.ministryId);
      const people = await getPeopleByChurch(input.churchId);
      return people.map((person) => ({ id: person.id, fullName: person.fullName }));
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
      await assignPersonToMinistry({ churchId: input.churchId, ministryId: input.ministryId, personId: input.personId });
      return { success: true, alreadyMember: false };
    }),
  removePerson: protectedProcedure
    .input(z.object({ churchId: z.number(), ministryId: z.number(), personId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const authorization = await requireMinistryManagementPermission(ctx.user.id, input.churchId, input.ministryId);
      if (authorization.ministry.leaderId === input.personId) {
        throw new TRPCError({ code: "CONFLICT", message: "O líder estrutural só pode ser removido pelo Pastor ao alterar a liderança." });
      }
      return { success: await removePersonFromMinistry({ ...input }) };
    }),
  functionCatalog: protectedProcedure
    .input(z.object({ churchId: z.number(), ministryId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireMinistryManagementPermission(ctx.user.id, input.churchId, input.ministryId);
      const ministry = (await getMinistriesByChurch(input.churchId)).find((item) => item.id === input.ministryId);
      if (!ministry) throw new TRPCError({ code: "NOT_FOUND", message: "Ministério não encontrado." });
      return getMinistryFunctionCatalogFor(ministry);
    }),
  customFunctions: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requirePastor(ctx.user.id, input.churchId);
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
      const actor = await requirePastor(ctx.user.id, input.churchId);
      if (input.ministryId && !(await getMinistriesByChurch(input.churchId)).some((item) => item.id === input.ministryId)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ministério inválido para esta igreja." });
      }
      const definition = await createMinistryRoleDefinition({ ...input, ministryId: input.ministryId ?? null, createdByChurchUserId: actor.id });
      return definition;
    }),
  personMemberships: protectedProcedure
    .input(z.object({ churchId: z.number(), personId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requirePastor(ctx.user.id, input.churchId);
      const person = await getPersonById(input.personId, input.churchId);
      if (!person) throw new TRPCError({ code: "NOT_FOUND", message: "Pessoa não encontrada." });
      const memberships = await getMinistryMembershipsByPerson(input.personId, input.churchId);
      return memberships.map(({ membership, ministry }) => ({
        id: membership.id,
        ministryId: ministry.id,
        ministryName: ministry.name,
        ministryType: ministry.type,
        isLeader: ministry.leaderId === input.personId,
        joinedAt: membership.joinedAt,
      }));
    }),
  personAccess: protectedProcedure
    .input(z.object({ churchId: z.number(), personId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requirePastor(ctx.user.id, input.churchId);
      const person = await getPersonById(input.personId, input.churchId);
      if (!person) throw new TRPCError({ code: "NOT_FOUND", message: "Pessoa não encontrada." });
      const account = (await getChurchUsersByChurch(input.churchId)).find((candidate) => candidate.active && candidate.personId === input.personId);
      return {
        accountLinked: Boolean(account),
        accountEmail: account?.email ?? null,
        roles: account ? await getEffectivePersonRoles(input.personId, input.churchId) : [],
      };
    }),
  personFunctions: protectedProcedure
    .input(z.object({ churchId: z.number(), personId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requirePastor(ctx.user.id, input.churchId);
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
      const member = await requireChurchMember(ctx.user.id, input.churchId);
      const roles = await getEffectiveChurchRoles(ctx.user.id, input.churchId, member);
      const isPastor = roles.some((role) => PASTOR_ROLES.has(role));
      if (!isPastor) await requireMinistryManagementPermission(ctx.user.id, input.churchId, input.ministryId);
      if (!isPastor && !OPERATIONAL_MINISTRY_ROLE_KEYS.has(input.roleKey)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Líderes só podem atribuir funções operacionais da própria equipe." });
      }
      if (MINISTRY_LEADERSHIP_ROLE_KEYS.has(input.roleKey) && !isPastor) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Somente o Pastor pode atribuir funções de liderança." });
      }
      const [person, ministry] = await Promise.all([
        getPersonById(input.personId, input.churchId),
        getMinistriesByChurch(input.churchId).then((items) => items.find((item) => item.id === input.ministryId && item.active)),
      ]);
      if (!person || !ministry) throw new TRPCError({ code: "BAD_REQUEST", message: "Pessoa ou Ministério inválido para esta igreja." });
      const allowed = getMinistryFunctionCatalogFor(ministry).some((item) => item.key === input.roleKey);
      if (!allowed) throw new TRPCError({ code: "BAD_REQUEST", message: "Essa função não é compatível com o Ministério selecionado." });
      if (!(await isActiveMinistryMember(input.ministryId, input.personId, input.churchId))) {
        await assignPersonToMinistry({ churchId: input.churchId, ministryId: input.ministryId, personId: input.personId });
      }
      return assignMinistryRole({ ...input, assignedByChurchUserId: member.id });
    }),
  removeFunction: protectedProcedure
    .input(z.object({ churchId: z.number(), id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const assignment = await getMinistryRoleAssignmentById(input.id, input.churchId);
      if (!assignment) throw new TRPCError({ code: "NOT_FOUND", message: "Função ministerial não encontrada nesta igreja." });
      const member = await requireChurchMember(ctx.user.id, input.churchId);
      const roles = await getEffectiveChurchRoles(ctx.user.id, input.churchId, member);
      const isPastor = roles.some((role) => PASTOR_ROLES.has(role));
      if (!isPastor) {
        if (!OPERATIONAL_MINISTRY_ROLE_KEYS.has(assignment.roleKey)) throw new TRPCError({ code: "FORBIDDEN", message: "Somente o Pastor pode remover funções de liderança." });
        await requireMinistryManagementPermission(ctx.user.id, input.churchId, assignment.ministryId);
      }
      await deactivateMinistryRole(input.id, input.churchId, assignment.ministryId);
      return { success: true };
    }),
  create: protectedProcedure
    .input(z.object({
      churchId: z.number(),
      name: z.string().trim().min(2).max(255),
      description: z.string().trim().max(3000).optional(),
      type: z.enum(["louvor", "infantil", "recepcao", "midia", "intercessao", "evangelismo", "casais", "jovens", "consolidacao", "visitas", "outro"]).default("outro"),
      leaderId: z.number().int().positive().nullable().optional(),
      participantIds: z.array(z.number().int().positive()).max(100).default([]),
    }))
    .mutation(async ({ input, ctx }) => {
      await requirePastor(ctx.user.id, input.churchId);
      if (input.leaderId !== undefined && input.leaderId !== null) {
        await requireChurchRoleManager(ctx.user.id, input.churchId);
        const leader = await getPersonById(input.leaderId, input.churchId);
        if (!leader) throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione um líder válido desta igreja." });
      }
      const participantIds = Array.from(new Set(input.participantIds));
      const participantPeople = await Promise.all(participantIds.map((personId) => getPersonById(personId, input.churchId)));
      if (participantPeople.some((person) => !person)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Todos os envolvidos precisam pertencer a esta igreja." });
      }
      const ministry = await createMinistry({
        churchId: input.churchId,
        name: input.name,
        description: input.description || null,
        type: input.type,
        leaderId: input.leaderId ?? null,
      }, participantIds);
      return ministry;
    }),
  archive: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), ministryId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      await requirePastor(ctx.user.id, input.churchId);
      const result = await archiveMinistry({ ministryId: input.ministryId, churchId: input.churchId });
      if (!result.archived) {
        if (result.reason === "not_found") throw new TRPCError({ code: "NOT_FOUND", message: "Ministério não encontrado nesta igreja." });
        if (result.reason === "scheduled_items") throw new TRPCError({ code: "CONFLICT", message: "Não é possível excluir este Ministério enquanto existem escalas agendadas. Cancele ou conclua as escalas antes." });
        throw new TRPCError({ code: "CONFLICT", message: "Não é possível excluir este Ministério enquanto existem encaminhamentos de Consolidação vinculados. O histórico precisa ser preservado." });
      }
      return result;
    }),
  updateLeader: protectedProcedure
    .input(z.object({ churchId: z.number(), ministryId: z.number().int().positive(), leaderId: z.number().int().positive().nullable() }))
    .mutation(async ({ input, ctx }) => {
      await requireChurchRoleManager(ctx.user.id, input.churchId);
      const ministry = (await getMinistriesByChurch(input.churchId)).find((item) => item.id === input.ministryId);
      if (!ministry) throw new TRPCError({ code: "NOT_FOUND", message: "Ministério não encontrado nesta igreja." });
      if (input.leaderId !== null) {
        const leader = await getPersonById(input.leaderId, input.churchId);
        if (!leader) throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione um líder válido desta igreja." });
      }
      return setMinistryLeader({ ministryId: input.ministryId, churchId: input.churchId, leaderId: input.leaderId });
    }),
});

const departmentsRouter = router({
  list: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), ministryId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const ministryAccess = await requireMinistryScopedRead(ctx.user.id, input.churchId, input.ministryId);
      const actor = ministryAccess.actor;
      const roles = ministryAccess.roles;
      const ministry = ministryAccess.ministry;
      let canManageMinistry = false;
      try {
        await requireMinistryManagementPermission(ctx.user.id, input.churchId, input.ministryId);
        canManageMinistry = true;
      } catch (error) {
        if (!(error instanceof TRPCError) || error.code !== "FORBIDDEN") throw error;
      }
      const [items, peopleRows] = await Promise.all([getDepartmentsByMinistry(input.ministryId, input.churchId), getPeopleByChurch(input.churchId)]);
      const nameByPerson = new Map(peopleRows.map((person) => [person.id, person.fullName]));
      return Promise.all(items.map(async (department) => ({
        ...department,
        leaderName: department.leaderId ? nameByPerson.get(department.leaderId) ?? null : null,
        memberCount: (await getDepartmentMembers(department.id, input.churchId)).length,
        canManage: canManageMinistry || Boolean(actor.personId && department.leaderId === actor.personId),
        canAssignLeader: roles.some((role) => CHURCH_ROLE_MANAGER_ROLES.has(role)),
      })));
    }),
  listByChurch: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const actor = await requireChurchMember(ctx.user.id, input.churchId);
      const roles = await getEffectiveChurchRoles(ctx.user.id, input.churchId, actor);
      const items = await getDepartmentsByChurch(input.churchId);
      const ministryRows = await getMinistriesByChurch(input.churchId);
      const isPastor = roles.some((role) => PASTOR_ROLES.has(role));
      const assignments = actor.personId ? await getMinistryRoleAssignmentsByPerson(actor.personId, input.churchId) : [];
      const definitions = await getMinistryRoleDefinitionsByChurch(input.churchId);
      const definitionByKey = new Map(definitions.map((definition) => [definition.key, definition]));
      const managedMinistryIds = new Set([
        ...ministryRows.filter((ministry) => ministry.leaderId === actor.personId).map((ministry) => ministry.id),
        ...assignments.filter(({ assignment }) => MINISTRY_MANAGEMENT_ROLE_KEYS.has(assignment.roleKey) || definitionByKey.get(assignment.roleKey)?.permissionPackage === "ministry_leader").map(({ assignment }) => assignment.ministryId),
      ]);
      const accessibleMinistryIds = isPastor ? null : managedMinistryIds;
      return Promise.all(items.map(async (department) => {
        let canManage = false;
        if (department.active) {
          try {
            await requireDepartmentManagementPermission(ctx.user.id, input.churchId, department.id);
            canManage = true;
          } catch (error) {
            if (!(error instanceof TRPCError) || !["FORBIDDEN", "NOT_FOUND"].includes(error.code)) throw error;
          }
        }
        if (accessibleMinistryIds && !accessibleMinistryIds.has(department.ministryId)) return null;
        return { id: department.id, ministryId: department.ministryId, name: department.name, active: department.active, canManage };
      })).then((rows) => rows.filter(Boolean));
    }),
  members: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), departmentId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const department = await getDepartmentById(input.departmentId, input.churchId);
      if (!department) throw new TRPCError({ code: "NOT_FOUND", message: "Departamento não encontrado nesta igreja." });
      await requireMinistryScopedRead(ctx.user.id, input.churchId, department.ministryId);
      return (await getDepartmentMembers(input.departmentId, input.churchId)).map(({ membership, person }) => ({ membership, person: { id: person.id, fullName: person.fullName } }));
    }),
  candidates: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), departmentId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      await requireDepartmentManagementPermission(ctx.user.id, input.churchId, input.departmentId);
      return getDepartmentCandidates(input.departmentId, input.churchId);
    }),
  roles: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), departmentId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const department = await getDepartmentById(input.departmentId, input.churchId);
      if (!department) throw new TRPCError({ code: "NOT_FOUND", message: "Departamento não encontrado nesta igreja." });
      await requireMinistryScopedRead(ctx.user.id, input.churchId, department.ministryId);
      return getDepartmentRoleAssignments(input.departmentId, input.churchId);
    }),
  create: protectedProcedure
    .input(z.object({
      churchId: z.number().int().positive(),
      ministryId: z.number().int().positive(),
      name: z.string().trim().min(2).max(160),
      description: z.string().trim().max(1000).optional(),
      leaderId: z.number().int().positive().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const actor = await requirePastor(ctx.user.id, input.churchId);
      const ministry = (await getMinistriesByChurch(input.churchId)).find((item) => item.id === input.ministryId);
      if (!ministry) throw new TRPCError({ code: "NOT_FOUND", message: "Ministério não encontrado nesta igreja." });
      if (input.leaderId !== undefined && input.leaderId !== null) {
        await requireChurchRoleManager(ctx.user.id, input.churchId);
        const leader = await getPersonById(input.leaderId, input.churchId);
        if (!leader) throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione um líder válido desta igreja." });
      }
      try {
        return await createDepartment({ ...input, description: input.description || null, leaderId: input.leaderId ?? null });
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (/duplicate/i.test(message)) throw new TRPCError({ code: "CONFLICT", message: "Já existe um Departamento com este nome no Ministério." });
        throw error;
      }
    }),
  update: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), departmentId: z.number().int().positive(), name: z.string().trim().min(2).max(160), description: z.string().trim().max(1000).optional() }))
    .mutation(async ({ input, ctx }) => {
      await requirePastor(ctx.user.id, input.churchId);
      const department = await getDepartmentById(input.departmentId, input.churchId);
      if (!department) throw new TRPCError({ code: "NOT_FOUND", message: "Departamento não encontrado nesta igreja." });
      try {
        return await updateDepartment({ id: input.departmentId, churchId: input.churchId, name: input.name, description: input.description || null });
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (/duplicate/i.test(message)) throw new TRPCError({ code: "CONFLICT", message: "Já existe um Departamento com este nome no Ministério." });
        throw error;
      }
    }),
  updateLeader: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), departmentId: z.number().int().positive(), leaderId: z.number().int().positive().nullable() }))
    .mutation(async ({ input, ctx }) => {
      await requireChurchRoleManager(ctx.user.id, input.churchId);
      if (input.leaderId !== null) {
        const leader = await getPersonById(input.leaderId, input.churchId);
        if (!leader) throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione um líder válido desta igreja." });
      }
      const department = await setDepartmentLeader(input);
      if (!department) throw new TRPCError({ code: "NOT_FOUND", message: "Departamento não encontrado nesta igreja." });
      return department;
    }),
  addMember: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), departmentId: z.number().int().positive(), personId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      await requireDepartmentManagementPermission(ctx.user.id, input.churchId, input.departmentId);
      const person = await getPersonById(input.personId, input.churchId);
      if (!person) throw new TRPCError({ code: "BAD_REQUEST", message: "Pessoa não encontrada nesta igreja." });
      try {
        return await assignPersonToDepartment(input);
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.includes("participar do Ministério")) throw new TRPCError({ code: "BAD_REQUEST", message });
        throw error;
      }
    }),
  removeMember: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), departmentId: z.number().int().positive(), personId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      await requireDepartmentManagementPermission(ctx.user.id, input.churchId, input.departmentId);
      try {
        return { success: await removePersonFromDepartment(input) };
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.includes("outro líder")) throw new TRPCError({ code: "CONFLICT", message });
        throw error;
      }
    }),
  assignRole: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), departmentId: z.number().int().positive(), personId: z.number().int().positive(), roleKey: z.string().trim().min(2).max(100).regex(/^[a-z0-9_]+$/, "Use somente letras minúsculas, números e sublinhado.") }))
    .mutation(async ({ input, ctx }) => {
      const authorization = await requireDepartmentManagementPermission(ctx.user.id, input.churchId, input.departmentId);
      if (!(await isActiveDepartmentMember(input.departmentId, input.personId, input.churchId))) throw new TRPCError({ code: "BAD_REQUEST", message: "A função só pode ser atribuída a participante ativo do Departamento." });
      return assignDepartmentRole({ ...input, assignedByChurchUserId: authorization.actor.id });
    }),
  endRole: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), departmentId: z.number().int().positive(), assignmentId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      await requireDepartmentManagementPermission(ctx.user.id, input.churchId, input.departmentId);
      return { success: await endDepartmentRole({ id: input.assignmentId, churchId: input.churchId, departmentId: input.departmentId }) };
    }),
  deactivate: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), departmentId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      await requirePastor(ctx.user.id, input.churchId);
      await updateDepartment({ id: input.departmentId, churchId: input.churchId, active: false });
      return { success: true };
    }),
});

const scheduleDateInput = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data no formato AAAA-MM-DD.").refine((value) => {
  const date = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Informe uma data de calendário válida.");

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
      departmentId: z.number().int().positive().nullable().optional(),
      personId: z.number(),
      scheduledDate: scheduleDateInput,
      startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe um horário inicial válido."),
      endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe um horário final válido."),
      role: z.string().trim().max(100).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireScheduleManagementPermission(ctx.user.id, input.churchId, input.ministryId, input.departmentId);
      await requireScheduleParticipant(input.churchId, input.ministryId, input.departmentId, input.personId);
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
        departmentId: input.departmentId ?? null,
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
      departmentId: z.number().int().positive().nullable().optional(),
      personId: z.number().int().positive(),
      scheduledDate: scheduleDateInput,
      startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe um horário inicial válido."),
      endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe um horário final válido."),
      role: z.string().trim().max(100).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const existing = await getScheduleItemById(input.id, input.churchId);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Escala não encontrada nesta igreja." });
      if (existing.status === "cancelada") throw new TRPCError({ code: "BAD_REQUEST", message: "Uma Escala cancelada não pode ser editada. Crie uma nova Escala se necessário." });

      await requireScheduleManagementPermission(ctx.user.id, input.churchId, existing.ministryId, existing.departmentId);
      await requireScheduleManagementPermission(ctx.user.id, input.churchId, input.ministryId, input.departmentId);
      await requireScheduleParticipant(input.churchId, input.ministryId, input.departmentId, input.personId);
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
        metadata: { ministryId: updated.ministryId, departmentId: updated.departmentId, personId: updated.personId, scheduledDate: input.scheduledDate, startTime: updated.startTime, endTime: updated.endTime },
        dedupeKey: `escala-alterada:${updated.id}:${updated.ministryId}:${updated.departmentId ?? "ministerio"}:${updated.personId}:${input.scheduledDate}:${updated.startTime}:${updated.endTime}:${updated.role ?? ""}`,
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
      const authorization = await requireScheduleManagementPermission(ctx.user.id, input.churchId, existing.ministryId, existing.departmentId);
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
        metadata: { ministryId: existing.ministryId, departmentId: existing.departmentId, personId: existing.personId, scheduledDate: existing.scheduledDate, cancelReason: input.reason },
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
      await requireFoundationStudyManager(ctx.user.id, input.churchId);
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

function parseAnnouncementDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) throw new TRPCError({ code: "BAD_REQUEST", message: "Informe uma data válida para o aviso." });
  return parsed;
}

const announcementInput = z.object({
  title: z.string().trim().min(2).max(255),
  content: z.string().trim().min(5).max(4000),
  type: z.enum(["aviso", "evento", "comunicado", "devocional"]).default("aviso"),
  pinned: z.boolean().default(false),
  publicVisible: z.boolean().default(false),
  publicStartsAt: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  ctaLabel: z.string().trim().max(80).nullable().optional(),
  ctaHref: z.string().trim().max(500).refine((value) => value.startsWith("/") || /^https:\/\//.test(value), "Informe um destino interno ou uma URL HTTPS.").nullable().optional(),
  imageUrl: z.string().trim().max(1000).url().nullable().optional(),
  mediaAssetId: z.number().int().positive().nullable().optional(),
});

async function validateAnnouncementMedia(churchId: number, mediaAssetId: number | null | undefined, imageUrl: string | null | undefined) {
  if (!imageUrl && mediaAssetId) throw new TRPCError({ code: "BAD_REQUEST", message: "O asset de mídia precisa estar vinculado a uma imagem." });
  if (!imageUrl) return;
  if (!mediaAssetId) throw new TRPCError({ code: "BAD_REQUEST", message: "Imagens públicas precisam ser enviadas pelo fluxo de mídia da igreja." });
  const asset = await getActiveMediaAssetById(mediaAssetId, churchId);
  if (!asset || asset.purpose !== "announcement_image" || asset.resourceType !== "image") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "A imagem selecionada não pertence a esta igreja ou não é uma imagem de aviso." });
  }
  const optimized = getOptimizedMediaUrls({ provider: asset.provider, publicId: asset.publicId, url: asset.url, resourceType: asset.resourceType });
  const acceptedUrls = new Set([asset.url, asset.secureUrl, optimized.optimizedUrl, optimized.webpUrl, optimized.avifUrl].filter((value): value is string => Boolean(value)));
  if (!acceptedUrls.has(imageUrl)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "A URL da imagem não corresponde ao asset enviado para esta igreja." });
  }
}

async function validateHeroImageSelection(churchId: number, sections: Array<{ sectionType: string; content: { heroImageSource?: "preset" | "custom"; heroImagePresetId?: string | null; heroImageUrl?: string | null; heroImageAssetId?: number | null } }>) {
  const hero = sections.find((section) => section.sectionType === "hero");
  if (!hero) return;
  const source = hero.content.heroImageSource ?? "preset";
  if (source === "preset") {
    if (hero.content.heroImagePresetId && !HERO_PRESET_IDS.includes(hero.content.heroImagePresetId as (typeof HERO_PRESET_IDS)[number])) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "A imagem predefinida do Hero não é válida." });
    }
    return;
  }
  if (!hero.content.heroImageAssetId || !hero.content.heroImageUrl) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Envie uma imagem personalizada do Hero antes de salvar." });
  }
  const asset = await getActiveMediaAssetById(hero.content.heroImageAssetId, churchId);
  if (!asset || asset.purpose !== "tenant_public_hero" || asset.resourceType !== "image") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "A imagem personalizada não pertence a esta igreja ou não é um asset de Hero." });
  }
  const optimized = getOptimizedMediaUrls({ provider: asset.provider, publicId: asset.publicId, url: asset.url, resourceType: asset.resourceType });
  const acceptedUrls = new Set([asset.url, asset.secureUrl, optimized.optimizedUrl, optimized.webpUrl, optimized.avifUrl].filter((value): value is string => Boolean(value)));
  if (!acceptedUrls.has(hero.content.heroImageUrl)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "A URL da imagem não corresponde ao asset enviado para esta igreja." });
  }
}

function validateAnnouncementCta(ctaLabel: string | null | undefined, ctaHref: string | null | undefined) {
  if (Boolean(ctaLabel) !== Boolean(ctaHref)) throw new TRPCError({ code: "BAD_REQUEST", message: "Preencha o texto e o destino do botão juntos." });
}

const announcementsRouter = router({
  list: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireCommunicationManager(ctx.user.id, input.churchId);
      return getAnnouncementsByChurch(input.churchId);
    }),

  publicList: publicProcedure
    .query(async ({ ctx }) => {
      if (!ctx.tenantSlug) return [];
      const church = await getChurchBySlug(ctx.tenantSlug);
      if (!church?.active) return [];
      const publicSite = await getTenantPublicSiteByChurchId(church.id);
      if (publicSite?.site?.status !== "published") return [];
      return getPublicAnnouncementsByChurch(church.id);
    }),

  create: protectedProcedure
    .input(z.object({ churchId: z.number(), ...announcementInput.shape }))
    .mutation(async ({ input, ctx }) => {
      await requireCommunicationManager(ctx.user.id, input.churchId);
      const publicStartsAt = parseAnnouncementDate(input.publicStartsAt);
      const expiresAt = parseAnnouncementDate(input.expiresAt);
      if (expiresAt && publicStartsAt && expiresAt <= publicStartsAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A expiração precisa ser posterior ao início da exibição." });
      }
      validateAnnouncementCta(input.ctaLabel, input.ctaHref);
      await validateAnnouncementMedia(input.churchId, input.mediaAssetId, input.imageUrl);
      if (input.publicVisible) {
        await requireChurchPublicSitePublisher(ctx.user.id, input.churchId);
      }
      const publicStatus = input.publicVisible ? (publicStartsAt && publicStartsAt > new Date() ? "agendado" : "publicado") : "rascunho";
      return createAnnouncement({ ...input, authorId: ctx.user.id, publicStartsAt, expiresAt, publicStatus });
    }),

  update: protectedProcedure
    .input(z.object({ churchId: z.number(), id: z.number().int().positive(), ...announcementInput.shape }))
    .mutation(async ({ input, ctx }) => {
      await requireCommunicationManager(ctx.user.id, input.churchId);
      const publicStartsAt = parseAnnouncementDate(input.publicStartsAt);
      const expiresAt = parseAnnouncementDate(input.expiresAt);
      if (expiresAt && publicStartsAt && expiresAt <= publicStartsAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A expiração precisa ser posterior ao início da exibição." });
      }
      validateAnnouncementCta(input.ctaLabel, input.ctaHref);
      await validateAnnouncementMedia(input.churchId, input.mediaAssetId, input.imageUrl);
      if (input.publicVisible) await requireChurchPublicSitePublisher(ctx.user.id, input.churchId);
      const publicStatus = input.publicVisible ? (publicStartsAt && publicStartsAt > new Date() ? "agendado" : "publicado") : "rascunho";
      const { id, churchId, ...data } = input;
      return updateAnnouncement(id, churchId, { ...data, publicStartsAt, expiresAt, publicStatus });
    }),

  archivePublic: protectedProcedure
    .input(z.object({ churchId: z.number(), id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      await requireChurchPublicSitePublisher(ctx.user.id, input.churchId);
      return updateAnnouncement(input.id, input.churchId, { publicVisible: false, publicStatus: "arquivado" });
    }),
});

const prayerRouter = router({
  list: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requirePrayerManager(ctx.user.id, input.churchId);
      return getPrayerRequestsByChurch(input.churchId);
    }),

  mine: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      const actor = await requireChurchMember(ctx.user.id, input.churchId);
      if (!actor.personId) return [];
      return getPrayerRequestsByPerson(input.churchId, actor.personId);
    }),

  createMine: protectedProcedure
    .input(z.object({
      churchId: z.number(),
      type: z.enum(["pedido", "testemunho"]).default("pedido"),
      content: z.string().min(5),
      isPrivate: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const actor = await requireChurchMember(ctx.user.id, input.churchId);
      if (!actor.personId) throw new TRPCError({ code: "BAD_REQUEST", message: "Sua conta ainda não está vinculada a uma Pessoa da igreja." });
      const person = await getPersonById(actor.personId, input.churchId);
      if (!person) throw new TRPCError({ code: "NOT_FOUND", message: "Seu cadastro de Pessoa não foi encontrado." });
      return createPrayerRequest({
        churchId: input.churchId,
        personId: actor.personId,
        visitorName: person.fullName,
        visitorPhone: person.whatsapp ?? person.phone ?? null,
        type: input.type,
        content: input.content,
        isPrivate: input.isPrivate,
      });
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
      await requireExecutiveReadAccess(ctx.user.id, input.churchId);
      return getDashboardStats(input.churchId);
    }),

  radarEspiritual: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireExecutiveReadAccess(ctx.user.id, input.churchId);
      return getRadarEspiritual(input.churchId);
    }),

  discipleshipFunnel: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireExecutiveReadAccess(ctx.user.id, input.churchId);
      return getDiscipleshipFunnel(input.churchId);
    }),

  discipleshipTree: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireExecutiveReadAccess(ctx.user.id, input.churchId);
      return getDiscipleshipTree(input.churchId);
    }),

  careAttention: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireExecutiveReadAccess(ctx.user.id, input.churchId);
      return getCareAttentionByChurch(input.churchId);
    }),
});

const radarSignalCatalog = [
  { key: "consolidacao_pendente", label: "Consolidação pendente", description: "Nova Alma sem registro de Consolidação." },
  { key: "primeiro_contato_pendente", label: "Primeiro contato pendente", description: "Consolidação sem primeiro contato registrado." },
  { key: "visita_pendente", label: "Visita pendente", description: "Visita aberta, agendada ou vencida." },
  { key: "follow_up_vencido", label: "Follow-up vencido", description: "Próxima ação de cuidado passou do prazo." },
  { key: "sem_responsavel", label: "Sem responsável", description: "Pessoa sem responsável ativo pelo cuidado." },
  { key: "sem_celula", label: "Sem célula ativa", description: "Pessoa em etapa de integração sem célula ativa." },
  { key: "sem_discipulador", label: "Sem discipulador", description: "Etapa de discipulado sem discipulador registrado." },
  { key: "ausencias_recentes", label: "Ausências recentes", description: "Duas últimas marcações de célula foram ausências." },
  { key: "pedido_oracao_pendente", label: "Pedido de oração pendente", description: "Pedido vinculado a uma Pessoa sem retorno registrado." },
  { key: "sem_formacao", label: "Sem formação registrada", description: "Pessoa sem matrícula em formação ativa ou concluída." },
] as const;

const radarRouter = router({
  list: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      const actor = await requireChurchMember(ctx.user.id, input.churchId);
      const access = await getChurchAccessSummary(ctx.user.id, input.churchId);
      if (!access.isExecutive) throw new TRPCError({ code: "FORBIDDEN", message: "O Radar Espiritual é restrito à liderança autorizada." });
      const actorRoles = access.roles;
      const canManageAll = actorRoles.some((role) => ["pastor_presidente", "pastor_local"].includes(role));
      const managedPersonIds = canManageAll
        ? null
        : new Set(await getJourneyManagedPersonIds({
            churchId: input.churchId,
            actorPersonId: actor.personId ?? null,
            actorRoles,
          }));
      const radar = await getSpiritualRadarByChurch(input.churchId);
      const items = canManageAll
        ? radar.items
        : radar.items.filter((item) => managedPersonIds?.has(item.person.id) || item.careAssignment?.responsiblePersonId === actor.personId);
      const scopedSummary = {
        ...radar.summary,
        totalPeople: canManageAll ? radar.summary.totalPeople : managedPersonIds?.size ?? 0,
        peopleWithSignals: items.length,
        alta: items.filter((item) => item.priority === "alta").length,
        media: items.filter((item) => item.priority === "media").length,
        normal: items.filter((item) => item.priority === "normal").length,
        bySignal: Object.fromEntries(radarSignalCatalog.map((signal) => [signal.key, items.filter((item) => item.signals.some((itemSignal) => itemSignal.key === signal.key)).length])),
      };
      return {
        summary: scopedSummary,
        items,
        availableSignals: radarSignalCatalog,
        scope: { canManageAll, actorRoles, linkedPersonId: actor.personId ?? null },
      };
    }),
});

// ─── CHURCH AUTH ROUTER ─────────────────────────────────────────────────────

const churchAuthRouter = router({
  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(6) }))
    .mutation(async ({ input }) => {
      const result = await loginChurchUser(input.email, input.password);
      if (!result) {
        const account = await getChurchUserByEmail(input.email);
        if (account?.registrationStatus === "pending") {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Seu cadastro ainda aguarda aprovação da liderança." });
        }
        if (account && !account.active) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Seu acesso ainda não está liberado. Fale com a liderança da sua igreja." });
        }
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Email ou senha inválidos" });
      }
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
      await requirePastor(ctx.user.id, input.churchId);
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
      await requirePastor(ctx.user.id, input.churchId);
      return getChurchUsersByChurch(input.churchId);
    }),

  pendingRegistrations: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requirePastor(ctx.user.id, input.churchId);
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
      await requirePastor(ctx.user.id, input.churchId);
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

  accessSummary: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => getChurchAccessSummary(ctx.user.id, input.churchId)),

  linkPerson: protectedProcedure
    .input(z.object({ churchId: z.number(), userId: z.number(), personId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await requirePastor(ctx.user.id, input.churchId);
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
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantSlug || ctx.tenantSlug !== input.churchSlug) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Envie sua solicitação pelo portal da igreja correta." });
      }
      const church = await getChurchBySlug(input.churchSlug);
      if (!church?.active) throw new TRPCError({ code: "NOT_FOUND", message: "Igreja não encontrada" });

      if (input.type === "pedido_oracao") {
        return createPrayerRequest({
          churchId: church.id,
          visitorName: input.name,
          visitorPhone: input.phone,
          type: "pedido",
          content: input.message?.trim() || "Pedido de oração enviado pelo Portal do Visitante.",
          isPrivate: false,
        });
      }

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
      email: z.string().email().max(320),
      password: z.string().min(8).max(128),
      birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      phone: z.string().max(20).optional(),
      whatsapp: z.string().max(20).optional(),
      zipCode: z.string().regex(/^\d{5}-?\d{3}$/),
      street: z.string().max(255).optional(),
      number: z.string().min(1).max(10),
      neighborhood: z.string().max(100).optional(),
      city: z.string().max(100).optional(),
      state: z.string().regex(/^[A-Za-z]{2}$/).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantSlug || ctx.tenantSlug !== input.churchSlug) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Envie seu cadastro pelo endereço oficial da igreja correta." });
      }
      const church = await getChurchBySlug(input.churchSlug);
      if (!church?.active) throw new TRPCError({ code: "NOT_FOUND", message: "Igreja não encontrada ou indisponível." });
      if (!church.publicRegistrationEnabled) throw new TRPCError({ code: "FORBIDDEN", message: "O cadastro público está temporariamente fechado por esta igreja." });
      const existingAccount = await getChurchUserByEmail(input.email);
      if (existingAccount) throw new TRPCError({ code: "CONFLICT", message: "Este e-mail já possui um cadastro. Solicite acesso à liderança ou use outro e-mail." });
      const existingIdentity = await findPossiblePeopleByIdentity(church.id, {
        fullName: input.name,
        phone: input.phone || input.whatsapp,
        email: input.email,
      });
      if (existingIdentity.length) throw new TRPCError({ code: "CONFLICT", message: "Já existe uma Pessoa com estes dados nesta igreja. Solicite acesso à liderança." });
      const person = await createPerson({
        churchId: church.id,
        fullName: input.name,
        email: input.email.toLowerCase(),
        birthDate: input.birthDate ? new Date(`${input.birthDate}T00:00:00.000Z`) : null,
        phone: input.phone || null,
        whatsapp: input.whatsapp || null,
        zipCode: input.zipCode.replace(/\D/g, ""),
        street: input.street || null,
        number: input.number,
        neighborhood: input.neighborhood || null,
        city: input.city || null,
        state: input.state?.toUpperCase() || null,
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
        active: true,
        registrationStatus: "approved",
        approvedAt: new Date(),
        approvedByChurchUserId: null,
      });
      return {
        success: true,
        userId: user.id,
        registrationStatus: "approved" as const,
        message: "Cadastro aprovado. Você já pode entrar na plataforma com o e-mail e a senha cadastrados.",
      };
    }),
});
// ─── INVITE ROUTER ───────────────────────────────────────────────────────────
const inviteRouter = router({
  create: protectedProcedure
    .input(z.object({ churchId: z.number(), email: z.string().email(), name: z.string().min(1), role: z.enum(["pastor_presidente","pastor_local","supervisor","lider","consolidador","diacono","secretario","tesoureiro","membro"]), personId: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      await requirePastor(ctx.user.id, input.churchId);
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
      const [referrals, visits, people] = await Promise.all([getConsolidationReferralsByChurch(input.churchId), getCareVisitsByChurch(input.churchId), getPeopleByChurch(input.churchId)]);
      const peopleById = new Map(people.map((person) => [person.id, person.fullName]));
      const currentTime = Date.now();
      const activeCases = referrals.filter((referral) => referral.status !== "encerrado");
      const overdueCases = activeCases.filter((referral) => referral.careDueAt && new Date(referral.careDueAt).getTime() < currentTime);
      const unassignedCases = activeCases.filter((referral) => !referral.assignedToPersonId && !referral.acceptedByPersonId);
      const pendingVisits = visits.filter((visit) => !["realizada", "cancelada"].includes(visit.status));
      const completedVisits = visits.filter((visit) => visit.status === "realizada");
      const now = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
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
              { label: "Casos ativos", value: activeCases.length, color: "#1e3a5f" },
              { label: "Sem responsável", value: unassignedCases.length, color: "#c9a84c" },
              { label: "Atrasados", value: overdueCases.length, color: "#dc2626" },
              { label: "Visitas pendentes", value: pendingVisits.length, color: "#b45309" },
              { label: "Visitas realizadas", value: completedVisits.length, color: "#16a34a" },
            ],
          },
          {
            title: "Fila de casos",
            type: "table",
            headers: ["Pessoa", "Origem", "Prioridade", "Responsável", "Status", "Prazo"],
            rows: referrals.slice(0, 50).map((referral) => [
              peopleById.get(referral.personId) ?? `Pessoa #${referral.personId}`,
              referral.sourceType.replace(/_/g, " "),
              referral.priority,
              peopleById.get(referral.assignedToPersonId ?? referral.acceptedByPersonId ?? 0) ?? "Fila",
              referral.status.replace(/_/g, " "),
              referral.careDueAt ? new Date(referral.careDueAt).toLocaleDateString("pt-BR") : "-",
            ]),
          },
        ],
      });
      return { base64: htmlToBase64(html), filename: `relatorio-consolidacao-visitas-${Date.now()}.html` };
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
      await requirePastor(ctx.user.id, input.churchId);
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
      await requirePastor(ctx.user.id, input.churchId);
      const count = await importPeopleFromCSV(input.churchId, input.csvData);
      await upsertOnboardingProgress({ churchId: input.churchId, stepImportMembers: true });
      return { success: true, imported: count };
    }),
});

// ─── ESCOLA DE FUNDAMENTOS ROUTER ──────────────────────────────────────────
const escolaFundamentosRouter = router({
  access: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const access = await getFoundationStudyAccess(ctx.user.id, input.churchId);
      return { canManageStudies: access.canManageStudies, canManageAdministrators: access.isPastor };
    }),
  listCourses: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      return getCoursesByChurch(input.churchId);
    }),
  listStudies: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), courseId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const access = await getFoundationStudyAccess(ctx.user.id, input.churchId);
      const course = (await getCoursesByChurch(input.churchId)).find((item) => item.id === input.courseId);
      if (!course) throw new TRPCError({ code: "NOT_FOUND", message: "Turma não encontrada nesta igreja." });
      return getFoundationStudiesByCourse(input.churchId, input.courseId, access.canManageStudies);
    }),
  listModules: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), courseId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const access = await getFoundationStudyAccess(ctx.user.id, input.churchId);
      const course = (await getCoursesByChurch(input.churchId)).find((item) => item.id === input.courseId);
      if (!course) throw new TRPCError({ code: "NOT_FOUND", message: "Turma não encontrada nesta igreja." });
      return getFoundationModulesByCourse(input.churchId, input.courseId, access.canManageStudies);
    }),
  createModule: protectedProcedure
    .input(z.object({
      churchId: z.number().int().positive(), courseId: z.number().int().positive(),
      title: z.string().trim().min(3, "Informe um título com ao menos 3 caracteres.").max(160),
      description: z.string().trim().max(500).optional(), position: z.number().int().min(0).max(999).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const access = await requireFoundationStudyManager(ctx.user.id, input.churchId);
      const course = (await getCoursesByChurch(input.churchId)).find((item) => item.id === input.courseId);
      if (!course) throw new TRPCError({ code: "NOT_FOUND", message: "Turma não encontrada nesta igreja." });
      const modules = await getFoundationModulesByCourse(input.churchId, input.courseId, true);
      const module = await createFoundationModule({ ...input, position: input.position ?? modules.length, createdByChurchUserId: access.member.id });
      return { success: true, moduleId: module.id };
    }),
  updateModule: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(), churchId: z.number().int().positive(),
      title: z.string().trim().min(3).max(160).optional(), description: z.string().trim().max(500).nullable().optional(),
      position: z.number().int().min(0).max(999).optional(), active: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireFoundationStudyManager(ctx.user.id, input.churchId);
      if (!(await getFoundationModuleById(input.id, input.churchId))) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Módulo não encontrado nesta igreja." });
      }
      await updateFoundationModule(input);
      return { success: true };
    }),
  moveModule: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), courseId: z.number().int().positive(), id: z.number().int().positive(), direction: z.enum(["up", "down"]) }))
    .mutation(async ({ input, ctx }) => {
      await requireFoundationStudyManager(ctx.user.id, input.churchId);
      const modules = await getFoundationModulesByCourse(input.churchId, input.courseId, true);
      const index = modules.findIndex((module) => module.id === input.id);
      if (index < 0) throw new TRPCError({ code: "NOT_FOUND", message: "Módulo não encontrado nesta turma." });
      const targetIndex = input.direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= modules.length) return { success: true };
      const current = modules[index];
      const target = modules[targetIndex];
      await Promise.all([
        updateFoundationModule({ id: current.id, churchId: input.churchId, position: target.position }),
        updateFoundationModule({ id: target.id, churchId: input.churchId, position: current.position }),
      ]);
      return { success: true };
    }),
  moveStudy: protectedProcedure
    .input(z.object({
      churchId: z.number().int().positive(), courseId: z.number().int().positive(), id: z.number().int().positive(),
      moduleId: z.number().int().positive().nullable(), direction: z.enum(["up", "down"]),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireFoundationStudyManager(ctx.user.id, input.churchId);
      const studies = (await getFoundationStudiesByCourse(input.churchId, input.courseId, true))
        .filter((study) => study.moduleId === input.moduleId);
      const index = studies.findIndex((study) => study.id === input.id);
      if (index < 0) throw new TRPCError({ code: "NOT_FOUND", message: "Estudo não encontrado neste módulo." });
      const targetIndex = input.direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= studies.length) return { success: true };
      const current = studies[index];
      const target = studies[targetIndex];
      await Promise.all([
        updateFoundationStudy({ id: current.id, churchId: input.churchId, position: target.position }),
        updateFoundationStudy({ id: target.id, churchId: input.churchId, position: current.position }),
      ]);
      return { success: true };
    }),
  listStudyMaterials: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), studyId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const access = await getFoundationStudyAccess(ctx.user.id, input.churchId);
      const study = await getFoundationStudyById(input.studyId, input.churchId);
      if (!study || (!study.active && !access.canManageStudies)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Estudo não encontrado nesta igreja." });
      }
      return getFoundationStudyMaterials(input.churchId, input.studyId);
    }),
  attachStudyMaterial: protectedProcedure
    .input(z.object({
      churchId: z.number().int().positive(), studyId: z.number().int().positive(),
      libraryItemId: z.number().int().positive(), position: z.number().int().min(0).max(999).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireFoundationStudyManager(ctx.user.id, input.churchId);
      const [study, material] = await Promise.all([
        getFoundationStudyById(input.studyId, input.churchId),
        getLibraryItemById(input.libraryItemId, input.churchId),
      ]);
      if (!study) throw new TRPCError({ code: "NOT_FOUND", message: "Estudo não encontrado nesta igreja." });
      if (!material) throw new TRPCError({ code: "NOT_FOUND", message: "Material não encontrado na Biblioteca desta igreja." });
      const current = await getFoundationStudyMaterials(input.churchId, input.studyId);
      await attachFoundationStudyMaterial({ ...input, position: input.position ?? current.length });
      return { success: true };
    }),
  updateStudyMaterialPosition: protectedProcedure
    .input(z.object({
      churchId: z.number().int().positive(), studyId: z.number().int().positive(),
      id: z.number().int().positive(), position: z.number().int().min(0).max(999),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireFoundationStudyManager(ctx.user.id, input.churchId);
      const materials = await getFoundationStudyMaterials(input.churchId, input.studyId);
      if (!materials.some((material) => material.id === input.id)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Vínculo de material não encontrado neste estudo." });
      }
      await updateFoundationStudyMaterialPosition(input);
      return { success: true };
    }),
  moveStudyMaterial: protectedProcedure
    .input(z.object({
      churchId: z.number().int().positive(), studyId: z.number().int().positive(),
      id: z.number().int().positive(), direction: z.enum(["up", "down"]),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireFoundationStudyManager(ctx.user.id, input.churchId);
      const materials = await getFoundationStudyMaterials(input.churchId, input.studyId);
      const index = materials.findIndex((material) => material.id === input.id);
      if (index < 0) throw new TRPCError({ code: "NOT_FOUND", message: "Vínculo de material não encontrado neste estudo." });
      const targetIndex = input.direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= materials.length) return { success: true };
      const current = materials[index];
      const target = materials[targetIndex];
      await Promise.all([
        updateFoundationStudyMaterialPosition({ id: current.id, churchId: input.churchId, studyId: input.studyId, position: target.position }),
        updateFoundationStudyMaterialPosition({ id: target.id, churchId: input.churchId, studyId: input.studyId, position: current.position }),
      ]);
      return { success: true };
    }),
  detachStudyMaterial: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), studyId: z.number().int().positive(), id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      await requireFoundationStudyManager(ctx.user.id, input.churchId);
      const materials = await getFoundationStudyMaterials(input.churchId, input.studyId);
      if (!materials.some((material) => material.id === input.id)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Vínculo de material não encontrado neste estudo." });
      }
      await detachFoundationStudyMaterial(input);
      return { success: true };
    }),
  createStudy: protectedProcedure
    .input(z.object({
      churchId: z.number().int().positive(), courseId: z.number().int().positive(),
      moduleId: z.number().int().positive().nullable().optional(),
      title: z.string().trim().min(3, "Informe um título com ao menos 3 caracteres.").max(160),
      summary: z.string().trim().max(500).optional(), content: z.string().trim().max(12000).optional(),
      position: z.number().int().min(0).max(999).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const access = await requireFoundationStudyManager(ctx.user.id, input.churchId);
      const course = (await getCoursesByChurch(input.churchId)).find((item) => item.id === input.courseId);
      if (!course) throw new TRPCError({ code: "NOT_FOUND", message: "Turma não encontrada nesta igreja." });
      if (input.moduleId) {
        const module = await getFoundationModuleById(input.moduleId, input.churchId);
        if (!module || module.courseId !== input.courseId) throw new TRPCError({ code: "NOT_FOUND", message: "Módulo não encontrado nesta turma." });
      }
      const existing = await getFoundationStudiesByCourse(input.churchId, input.courseId, true);
      const study = await createFoundationStudy({ ...input, position: input.position ?? existing.length, createdByChurchUserId: access.member.id });
      return { success: true, studyId: study.id };
    }),
  updateStudy: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(), churchId: z.number().int().positive(),
      moduleId: z.number().int().positive().nullable().optional(),
      title: z.string().trim().min(3).max(160).optional(), summary: z.string().trim().max(500).nullable().optional(),
      content: z.string().trim().max(12000).nullable().optional(), position: z.number().int().min(0).max(999).optional(), active: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireFoundationStudyManager(ctx.user.id, input.churchId);
      if (!(await getFoundationStudyById(input.id, input.churchId))) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Estudo não encontrado nesta igreja." });
      }
      if (input.moduleId) {
        const study = await getFoundationStudyById(input.id, input.churchId);
        const module = await getFoundationModuleById(input.moduleId, input.churchId);
        if (!study || !module || study.courseId !== module.courseId) throw new TRPCError({ code: "NOT_FOUND", message: "Módulo não encontrado nesta turma." });
      }
      await updateFoundationStudy(input);
      return { success: true };
    }),
  listStudyAdministrators: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      await requireFoundationStudyPastor(ctx.user.id, input.churchId);
      return getFoundationStudyAdministrators(input.churchId);
    }),
  assignStudyAdministrator: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), churchUserId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const access = await requireFoundationStudyPastor(ctx.user.id, input.churchId);
      const account = (await getChurchUsersByChurch(input.churchId)).find((user) => user.id === input.churchUserId && user.active);
      if (!account) throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione uma conta ativa desta igreja." });
      await assignFoundationStudyAdministrator({ churchId: input.churchId, churchUserId: input.churchUserId, assignedByChurchUserId: access.member.id });
      return { success: true };
    }),
  removeStudyAdministrator: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), churchUserId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      await requireFoundationStudyPastor(ctx.user.id, input.churchId);
      await removeFoundationStudyAdministrator(input.churchId, input.churchUserId);
      return { success: true };
    }),
  createCourse: protectedProcedure
    .input(z.object({
      churchId: z.number(),
      name: z.string().trim().min(3, "Informe um nome com ao menos 3 caracteres.").max(120),
      type: z.enum(["salvacao", "oracao", "biblia", "igreja", "espirito_santo", "batismo", "outro"]),
      description: z.string().trim().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireFoundationStudyManager(ctx.user.id, input.churchId);
      const course = await createCourse(input);
      return { success: true, courseId: course.id };
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
      await requireFoundationStudyManager(ctx.user.id, input.churchId);
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
      await requireFoundationStudyManager(ctx.user.id, input.churchId);
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

async function getEncounterAccess(userId: number, churchId: number) {
  const actor = await requireChurchMember(userId, churchId);
  const roles = await getEffectiveChurchRoles(userId, churchId, actor);
  const canManageAll = roles.some((role) => CHURCH_ADMIN_ROLES.has(role));
  const managedEventIds = actor.personId ? await getEncounterManagedEventIds(churchId, actor.personId) : [];
  return { actor, roles, canManageAll, managedEventIds };
}

async function requireEncounterModuleAccess(userId: number, churchId: number) {
  const access = await getEncounterAccess(userId, churchId);
  if (!access.canManageAll && access.managedEventIds.length === 0) {
    throw new TRPCError({ code: "FORBIDDEN", message: "A gestão do Encontro com Deus é restrita à liderança e aos responsáveis designados." });
  }
  return access;
}

async function requireEncounterEventAccess(userId: number, churchId: number, eventId: number) {
  const [access, event] = await Promise.all([
    getEncounterAccess(userId, churchId),
    getEncounterEventById(eventId, churchId),
  ]);
  if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Encontro não encontrado nesta igreja." });
  if (!access.canManageAll && !access.managedEventIds.includes(eventId)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Você não é responsável por este encontro." });
  }
  return { ...access, event };
}

function throwEncounterMutationError(error: unknown): never {
  const message = error instanceof Error ? error.message : "";
  if (message === "ENCOUNTER_UNAVAILABLE") throw new TRPCError({ code: "BAD_REQUEST", message: "Este encontro não aceita novas alterações." });
  if (message === "ENCOUNTER_DUPLICATE_ENROLLMENT") throw new TRPCError({ code: "CONFLICT", message: "Esta Pessoa já está inscrita neste encontro." });
  if (message === "ENCOUNTER_DUPLICATE_SERVANT_ASSIGNMENT") throw new TRPCError({ code: "CONFLICT", message: "Esta Pessoa já possui esta função no encontro." });
  if (message === "ENCOUNTER_CAPACITY_REACHED") throw new TRPCError({ code: "CONFLICT", message: "O encontro atingiu o limite de discípulos." });
  if (message === "ENCOUNTER_PUBLIC_FORM_UNAVAILABLE") throw new TRPCError({ code: "NOT_FOUND", message: "Esta ficha não está disponível para novos envios." });
  if (message === "ENCOUNTER_FORM_ALREADY_SUBMITTED") throw new TRPCError({ code: "CONFLICT", message: "Sua ficha já foi recebida para este encontro. Procure a liderança se precisar corrigir alguma informação." });
  throw error;
}

const encounterEventStatusSchema = z.enum(["rascunho", "planejamento", "confirmado", "em_andamento", "encerrado", "cancelado"]);
const encounterEnrollmentStatusSchema = z.enum(["inscrito", "confirmado", "participou", "concluiu", "cancelado"]);
const encounterReviewStatusSchema = z.enum(["recebida", "em_analise", "confirmada", "precisa_correcao", "rejeitada"]);
const encounterTeamCategorySchema = z.enum(["lideranca", "espiritual", "apoio", "operacional", "manual"]);
const encounterChecklistCategorySchema = z.enum(["estrutura", "discipulos", "servos", "intercessao", "alimentacao", "logistica", "comunicacao", "pos_encontro", "outro"]);

const encontroRouter = router({
  hasAccess: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      const access = await getEncounterAccess(ctx.user.id, input.churchId);
      return access.canManageAll || access.managedEventIds.length > 0;
    }),
  accessSummary: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      const access = await getEncounterAccess(ctx.user.id, input.churchId);
      return { hasAccess: access.canManageAll || access.managedEventIds.length > 0, canManageAll: access.canManageAll };
    }),
  listEvents: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      const access = await requireEncounterModuleAccess(ctx.user.id, input.churchId);
      const events = await getEncounterEventsByChurch(input.churchId);
      return access.canManageAll ? events : events.filter((event) => access.managedEventIds.includes(event.id));
    }),
  getOverview: protectedProcedure
    .input(z.object({ eventId: z.number(), churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      const access = await requireEncounterEventAccess(ctx.user.id, input.churchId, input.eventId);
      const overview = await getEncounterOverview(input.eventId, input.churchId);
      return { ...overview, access: { canManageAll: access.canManageAll } };
    }),
  getEnrollments: protectedProcedure
    .input(z.object({ eventId: z.number(), churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireEncounterEventAccess(ctx.user.id, input.churchId, input.eventId);
      return getEncounterEnrollments(input.eventId, input.churchId);
    }),
  createEvent: protectedProcedure
    .input(z.object({
      churchId: z.number(),
      name: z.string().trim().min(2).max(255),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      location: z.string().trim().max(255).optional(),
      maxParticipants: z.number().int().min(1).max(10000).optional(),
      description: z.string().trim().max(4000).optional(),
      status: encounterEventStatusSchema.optional(),
      responsiblePersonId: z.number().int().positive().optional(),
      generalNotes: z.string().trim().max(4000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const actor = await requireChurchAdministrator(ctx.user.id, input.churchId);
      if (input.endDate && input.endDate < input.date) throw new TRPCError({ code: "BAD_REQUEST", message: "A data final não pode ser anterior à data inicial." });
      if (input.responsiblePersonId && !(await getPersonById(input.responsiblePersonId, input.churchId))) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "O responsável precisa pertencer a esta igreja." });
      }
      const event = await createEncounterEvent({ ...input, responsiblePersonId: input.responsiblePersonId ?? actor.personId ?? null });
      return { success: true, eventId: event.id };
    }),
  updateEvent: protectedProcedure
    .input(z.object({
      id: z.number(),
      churchId: z.number(),
      name: z.string().trim().min(2).max(255).optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      location: z.string().trim().max(255).nullable().optional(),
      maxParticipants: z.number().int().min(1).max(10000).nullable().optional(),
      description: z.string().trim().max(4000).nullable().optional(),
      status: encounterEventStatusSchema.optional(),
      responsiblePersonId: z.number().int().positive().nullable().optional(),
      generalNotes: z.string().trim().max(4000).nullable().optional(),
      active: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, churchId, ...changes } = input;
      const access = await requireEncounterEventAccess(ctx.user.id, churchId, id);
      if (changes.responsiblePersonId !== undefined && !access.canManageAll) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Somente a administração pode alterar o responsável pelo encontro." });
      }
      if (changes.responsiblePersonId && !(await getPersonById(changes.responsiblePersonId, churchId))) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "O responsável precisa pertencer a esta igreja." });
      }
      if (changes.active === false && !access.canManageAll) throw new TRPCError({ code: "FORBIDDEN", message: "Somente a administração pode arquivar encontros." });
      await updateEncounterEvent(id, churchId, changes);
      await addEncounterHistory({ churchId, encounterEventId: id, actorPersonId: access.actor.personId ?? null, action: changes.status ? `encontro_${changes.status}` : "encontro_atualizado", entityType: "encontro", entityId: id, details: changes });
      return { success: true };
    }),
  enroll: protectedProcedure
    .input(z.object({ encounterEventId: z.number(), personId: z.number(), churchId: z.number(), notes: z.string().trim().max(2000).optional() }))
    .mutation(async ({ input, ctx }) => {
      await requireEncounterEventAccess(ctx.user.id, input.churchId, input.encounterEventId);
      if (!(await getPersonById(input.personId, input.churchId))) throw new TRPCError({ code: "BAD_REQUEST", message: "A Pessoa selecionada não pertence a esta igreja." });
      try {
        const enrollment = await enrollInEncounter({ ...input, source: "manual" });
        return { success: true, enrollmentId: enrollment.id };
      } catch (error) {
        throwEncounterMutationError(error);
      }
    }),
  updateEnrollment: protectedProcedure
    .input(z.object({ id: z.number(), churchId: z.number(), status: encounterEnrollmentStatusSchema.optional(), notes: z.string().trim().max(2000).nullable().optional() }))
    .mutation(async ({ input, ctx }) => {
      const enrollment = await getEncounterEnrollmentById(input.id, input.churchId);
      if (!enrollment) throw new TRPCError({ code: "NOT_FOUND", message: "Inscrição não encontrada nesta igreja." });
      await requireEncounterEventAccess(ctx.user.id, input.churchId, enrollment.encounterEventId);
      await updateEncounterEnrollment(input.id, input.churchId, { status: input.status, notes: input.notes });
      return { success: true };
    }),
  reviewDiscipleForm: protectedProcedure
    .input(z.object({ id: z.number(), eventId: z.number(), churchId: z.number(), reviewStatus: encounterReviewStatusSchema, reviewNotes: z.string().trim().max(2000).nullable().optional() }))
    .mutation(async ({ input, ctx }) => {
      const access = await requireEncounterEventAccess(ctx.user.id, input.churchId, input.eventId);
      const result = await updateEncounterDiscipleFormReview({ id: input.id, eventId: input.eventId, churchId: input.churchId, reviewStatus: input.reviewStatus, reviewNotes: input.reviewNotes, reviewedByPersonId: access.actor.personId ?? null });
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Ficha não encontrada neste encontro." });
      return { success: true };
    }),
  listTeams: protectedProcedure
    .input(z.object({ eventId: z.number(), churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireEncounterEventAccess(ctx.user.id, input.churchId, input.eventId);
      return getEncounterTeams(input.eventId, input.churchId);
    }),
  createTeam: protectedProcedure
    .input(z.object({ eventId: z.number(), churchId: z.number(), parentTeamId: z.number().nullable().optional(), name: z.string().trim().min(2).max(120), category: encounterTeamCategorySchema, requiredCount: z.number().int().min(1).max(1000).nullable().optional(), notes: z.string().trim().max(2000).nullable().optional() }))
    .mutation(async ({ input, ctx }) => {
      const access = await requireEncounterEventAccess(ctx.user.id, input.churchId, input.eventId);
      if (input.parentTeamId) {
        const parent = await getEncounterTeamById(input.parentTeamId, input.churchId);
        if (!parent || parent.encounterEventId !== input.eventId) throw new TRPCError({ code: "BAD_REQUEST", message: "A equipe superior precisa pertencer a este encontro." });
      }
      const result = await createEncounterTeam({ churchId: input.churchId, encounterEventId: input.eventId, parentTeamId: input.parentTeamId ?? null, name: input.name, category: input.category, source: "manual", requiredCount: input.requiredCount ?? null, notes: input.notes ?? null, active: true });
      await addEncounterHistory({ churchId: input.churchId, encounterEventId: input.eventId, actorPersonId: access.actor.personId ?? null, action: "equipe_criada", entityType: "equipe", entityId: result.id, details: { name: input.name, category: input.category } });
      return { success: true, teamId: result.id };
    }),
  updateTeam: protectedProcedure
    .input(z.object({ id: z.number(), eventId: z.number(), churchId: z.number(), name: z.string().trim().min(2).max(120).optional(), category: encounterTeamCategorySchema.optional(), requiredCount: z.number().int().min(1).max(1000).nullable().optional(), notes: z.string().trim().max(2000).nullable().optional(), active: z.boolean().optional() }))
    .mutation(async ({ input, ctx }) => {
      const access = await requireEncounterEventAccess(ctx.user.id, input.churchId, input.eventId);
      const team = await getEncounterTeamById(input.id, input.churchId);
      if (!team || team.encounterEventId !== input.eventId) throw new TRPCError({ code: "NOT_FOUND", message: "Equipe não encontrada neste encontro." });
      const { id, eventId, churchId, ...changes } = input;
      await updateEncounterTeam(id, churchId, changes);
      await addEncounterHistory({ churchId, encounterEventId: eventId, actorPersonId: access.actor.personId ?? null, action: changes.active === false ? "equipe_desativada" : "equipe_atualizada", entityType: "equipe", entityId: id, details: changes });
      return { success: true };
    }),
  listServants: protectedProcedure
    .input(z.object({ eventId: z.number(), churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireEncounterEventAccess(ctx.user.id, input.churchId, input.eventId);
      return getEncounterServants(input.eventId, input.churchId);
    }),
  assignServant: protectedProcedure
    .input(z.object({ eventId: z.number(), churchId: z.number(), personId: z.number(), teamId: z.number().nullable().optional(), roleKey: z.string().trim().max(64).nullable().optional(), roleName: z.string().trim().min(2).max(120), roleSource: z.enum(["catalogo", "manual"]), assignmentType: z.enum(["responsavel", "membro", "substituto"]), notes: z.string().trim().max(2000).nullable().optional() }))
    .mutation(async ({ input, ctx }) => {
      await requireEncounterEventAccess(ctx.user.id, input.churchId, input.eventId);
      const [person, team] = await Promise.all([
        getPersonById(input.personId, input.churchId),
        input.teamId ? getEncounterTeamById(input.teamId, input.churchId) : Promise.resolve(null),
      ]);
      if (!person) throw new TRPCError({ code: "BAD_REQUEST", message: "O servo precisa pertencer a esta igreja." });
      if (input.teamId && (!team || team.encounterEventId !== input.eventId)) throw new TRPCError({ code: "BAD_REQUEST", message: "A equipe precisa pertencer a este encontro." });
      try {
        const result = await createEncounterServantAssignment({ churchId: input.churchId, encounterEventId: input.eventId, personId: input.personId, teamId: input.teamId ?? null, roleKey: input.roleKey ?? null, roleName: input.roleName, roleSource: input.roleSource, assignmentType: input.assignmentType, notes: input.notes ?? null, active: true });
        return { success: true, assignmentId: result.id };
      } catch (error) {
        throwEncounterMutationError(error);
      }
    }),
  removeServant: protectedProcedure
    .input(z.object({ id: z.number(), eventId: z.number(), churchId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const access = await requireEncounterEventAccess(ctx.user.id, input.churchId, input.eventId);
      await deactivateEncounterServantAssignment(input.id, input.eventId, input.churchId);
      await addEncounterHistory({ churchId: input.churchId, encounterEventId: input.eventId, actorPersonId: access.actor.personId ?? null, action: "servo_retirado", entityType: "servo", entityId: input.id });
      return { success: true };
    }),
  listChecklist: protectedProcedure
    .input(z.object({ eventId: z.number(), churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireEncounterEventAccess(ctx.user.id, input.churchId, input.eventId);
      return getEncounterChecklist(input.eventId, input.churchId);
    }),
  createChecklistItem: protectedProcedure
    .input(z.object({ eventId: z.number(), churchId: z.number(), title: z.string().trim().min(2).max(255), category: encounterChecklistCategorySchema, assignedPersonId: z.number().nullable().optional(), dueAt: z.date().nullable().optional(), notes: z.string().trim().max(2000).nullable().optional() }))
    .mutation(async ({ input, ctx }) => {
      const access = await requireEncounterEventAccess(ctx.user.id, input.churchId, input.eventId);
      if (input.assignedPersonId && !(await getPersonById(input.assignedPersonId, input.churchId))) throw new TRPCError({ code: "BAD_REQUEST", message: "O responsável pela tarefa precisa pertencer a esta igreja." });
      const result = await createEncounterChecklistItem({ churchId: input.churchId, encounterEventId: input.eventId, title: input.title, category: input.category, assignedPersonId: input.assignedPersonId ?? null, dueAt: input.dueAt ?? null, notes: input.notes ?? null, status: "pendente" });
      await addEncounterHistory({ churchId: input.churchId, encounterEventId: input.eventId, actorPersonId: access.actor.personId ?? null, action: "checklist_criado", entityType: "checklist", entityId: result.id, details: { title: input.title, category: input.category } });
      return { success: true, itemId: result.id };
    }),
  updateChecklistItem: protectedProcedure
    .input(z.object({ id: z.number(), eventId: z.number(), churchId: z.number(), title: z.string().trim().min(2).max(255).optional(), category: encounterChecklistCategorySchema.optional(), assignedPersonId: z.number().nullable().optional(), dueAt: z.date().nullable().optional(), status: z.enum(["pendente", "em_andamento", "concluida", "cancelada"]).optional(), notes: z.string().trim().max(2000).nullable().optional() }))
    .mutation(async ({ input, ctx }) => {
      const access = await requireEncounterEventAccess(ctx.user.id, input.churchId, input.eventId);
      if (input.assignedPersonId && !(await getPersonById(input.assignedPersonId, input.churchId))) throw new TRPCError({ code: "BAD_REQUEST", message: "O responsável pela tarefa precisa pertencer a esta igreja." });
      const { id, eventId, churchId, ...changes } = input;
      await updateEncounterChecklistItem(id, eventId, churchId, { ...changes, completedAt: changes.status === "concluida" ? new Date() : changes.status ? null : undefined });
      await addEncounterHistory({ churchId, encounterEventId: eventId, actorPersonId: access.actor.personId ?? null, action: changes.status ? `checklist_${changes.status}` : "checklist_atualizado", entityType: "checklist", entityId: id, details: changes });
      return { success: true };
    }),
  getHistory: protectedProcedure
    .input(z.object({ eventId: z.number(), churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireEncounterEventAccess(ctx.user.id, input.churchId, input.eventId);
      return getEncounterHistory(input.eventId, input.churchId);
    }),
  getPublicForm: protectedProcedure
    .input(z.object({ eventId: z.number(), churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireEncounterEventAccess(ctx.user.id, input.churchId, input.eventId);
      return getEncounterPublicFormByEvent(input.eventId, input.churchId);
    }),
  rotatePublicForm: protectedProcedure
    .input(z.object({ eventId: z.number(), churchId: z.number(), expiresAt: z.date().nullable().optional() }))
    .mutation(async ({ input, ctx }) => {
      const access = await requireEncounterEventAccess(ctx.user.id, input.churchId, input.eventId);
      const result = await rotateEncounterPublicForm({ churchId: input.churchId, encounterEventId: input.eventId, publicToken: randomBytes(32).toString("base64url"), createdByPersonId: access.actor.personId ?? null, expiresAt: input.expiresAt ?? null });
      return { success: true, publicToken: result.publicToken };
    }),
  setPublicFormActive: protectedProcedure
    .input(z.object({ eventId: z.number(), churchId: z.number(), active: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const access = await requireEncounterEventAccess(ctx.user.id, input.churchId, input.eventId);
      await setEncounterPublicFormActive({ churchId: input.churchId, encounterEventId: input.eventId, active: input.active, actorPersonId: access.actor.personId ?? null });
      return { success: true };
    }),
  publicForm: router({
    get: publicProcedure
      .input(z.object({ token: z.string().min(32).max(96) }))
      .query(async ({ input, ctx }) => {
        const resolved = await getEncounterPublicFormByToken(input.token);
        if (!resolved || !ctx.tenantChurchId || !ctx.tenantSlug || resolved.church.id !== ctx.tenantChurchId || resolved.church.slug !== ctx.tenantSlug) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Ficha não encontrada ou indisponível." });
        }
        return resolved;
      }),
    submit: publicProcedure
      .input(z.object({
        token: z.string().min(32).max(96),
        fullName: z.string().trim().min(3).max(255),
        age: z.number().int().min(1).max(120),
        phone: z.string().trim().min(10).max(20),
        guardianName: z.string().trim().min(2).max(255),
        guardianPhone: z.string().trim().min(10).max(20),
        friendName: z.string().trim().min(2).max(255),
        friendPhone: z.string().trim().min(10).max(20),
        attendingChurch: z.string().trim().min(2).max(255),
        invitedByName: z.string().trim().min(2).max(255),
        consentAccepted: z.literal(true),
      }))
      .mutation(async ({ input, ctx }) => {
        const resolved = await getEncounterPublicFormByToken(input.token);
        if (!resolved || !ctx.tenantChurchId || !ctx.tenantSlug || resolved.church.id !== ctx.tenantChurchId || resolved.church.slug !== ctx.tenantSlug) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Envie a ficha pelo endereço oficial da igreja correta." });
        }
        try {
          return await submitEncounterDiscipleForm({ publicToken: input.token, fullName: input.fullName, age: input.age, phone: input.phone, guardianName: input.guardianName, guardianPhone: input.guardianPhone, friendName: input.friendName, friendPhone: input.friendPhone, attendingChurch: input.attendingChurch, invitedByName: input.invitedByName, consentAccepted: true });
        } catch (error) {
          throwEncounterMutationError(error);
        }
      }),
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
const MAX_FINANCIAL_CENTS = 2_147_483_647;
const financialDateInput = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.").refine((value) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}, "Informe uma data existente no calendário.");

function assertFinancialDateRange(startDate: string, endDate: string) {
  if (endDate < startDate) throw new TRPCError({ code: "BAD_REQUEST", message: "O término do período deve ser posterior ou igual ao início." });
}

function isDuplicateFinancialRecord(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "ER_DUP_ENTRY";
}

const financialTransactionInput = z.object({
  churchId: z.number().int().positive(),
  accountId: z.number().int().positive(),
  categoryId: z.number().int().positive(),
  type: z.enum(["entrada", "saida"]),
  amountCents: z.number().int().positive("O valor deve ser maior que zero.").max(MAX_FINANCIAL_CENTS, "O valor excede o limite permitido."),
  transactionDate: financialDateInput,
  paymentMethod: z.enum(["dinheiro", "pix", "transferencia", "cartao", "cheque", "outro"]),
  contributorPersonId: z.number().int().positive().optional(),
  contributorName: z.string().trim().min(2).max(255).optional(),
  serviceId: z.number().int().positive().optional(),
  countSheetId: z.number().int().positive().optional(),
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
  if (input.serviceId) {
    const service = await getTreasuryServiceById(input.serviceId, input.churchId);
    if (!service || service.status === "cancelado") throw new TRPCError({ code: "BAD_REQUEST", message: "O culto selecionado não pertence a esta igreja ou foi cancelado." });
  }
  if (input.countSheetId) {
    const countSheet = await getTreasuryCountSheetById(input.countSheetId, input.churchId);
    if (!countSheet || (input.serviceId && countSheet.serviceId !== input.serviceId)) throw new TRPCError({ code: "BAD_REQUEST", message: "A folha de contagem não pertence a este culto ou a esta igreja." });
  }
  if (["outra_entrada", "outra_saida"].includes(category.key) && !input.description?.trim()) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Descreva o lançamento usando uma categoria manual." });
  }
  if (await isFinancialPeriodClosed(input.churchId, input.transactionDate)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "O período financeiro desta data está fechado." });
  }
  return { account, category };
}

const treasuryServiceInput = z.object({
  churchId: z.number().int().positive(),
  name: z.string().trim().min(2).max(160),
  serviceDate: financialDateInput,
  startTime: z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, "Informe um horário válido.").optional(),
  location: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(2000).optional(),
});
const treasuryRecurringScheduleInput = z.object({
  churchId: z.number().int().positive(),
  name: z.string().trim().min(2).max(160),
  weekday: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, "Informe um horário válido."),
  location: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(2000).optional(),
});
const treasuryCountAmountInput = z.number().int().min(0).max(MAX_FINANCIAL_CENTS);
const treasuryCountSheetInput = z.object({
  churchId: z.number().int().positive(),
  serviceId: z.number().int().positive(),
  id: z.number().int().positive().optional(),
  counterOnePersonId: z.number().int().positive(),
  counterTwoPersonId: z.number().int().positive(),
  cashCents: treasuryCountAmountInput.default(0),
  pixCents: treasuryCountAmountInput.default(0),
  transferCents: treasuryCountAmountInput.default(0),
  cardCents: treasuryCountAmountInput.default(0),
  checkCents: treasuryCountAmountInput.default(0),
  otherCents: treasuryCountAmountInput.default(0),
  notes: z.string().trim().max(2000).optional(),
});
const treasuryDepositInput = z.object({
  churchId: z.number().int().positive(),
  countSheetId: z.number().int().positive(),
  id: z.number().int().positive().optional(),
  accountId: z.number().int().positive(),
  amountCents: z.number().int().positive().max(MAX_FINANCIAL_CENTS),
  depositDate: financialDateInput,
  reference: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(2000).optional(),
});
const treasuryRouter = router({
  overview: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), startDate: financialDateInput, endDate: financialDateInput, accountId: z.number().int().positive().optional() }))
    .query(async ({ input, ctx }) => {
      await requireTreasuryAccess(ctx.user.id, input.churchId);
      assertFinancialDateRange(input.startDate, input.endDate);
      if (input.accountId && !await getFinancialAccountById(input.accountId, input.churchId)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conta financeira não encontrada nesta igreja." });
      }
      return getTreasuryOverview(input);
    }),

  services: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), includeCancelled: z.boolean().optional() }))
    .query(async ({ input, ctx }) => {
      const access = await requireTreasuryAccess(ctx.user.id, input.churchId);
      return getTreasuryServices(input.churchId, input.includeCancelled ?? false, access.actor.id);
    }),

  recurringSchedules: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), includeInactive: z.boolean().optional() }))
    .query(async ({ input, ctx }) => {
      await requireTreasuryAccess(ctx.user.id, input.churchId);
      return getTreasuryRecurringSchedules(input.churchId, input.includeInactive ?? false);
    }),

  createRecurringSchedule: protectedProcedure
    .input(treasuryRecurringScheduleInput)
    .mutation(async ({ input, ctx }) => {
      const access = await requireTreasuryAccess(ctx.user.id, input.churchId);
      if (!access.canManageStructure) throw new TRPCError({ code: "FORBIDDEN", message: "Somente Pastores podem configurar cultos fixos." });
      const created = await createTreasuryRecurringSchedule({ ...input, createdByChurchUserId: access.actor.id });
      if (!created) throw new TRPCError({ code: "CONFLICT", message: "Já existe uma programação fixa com este nome, dia e horário." });
      return created;
    }),

  updateRecurringSchedule: protectedProcedure
    .input(treasuryRecurringScheduleInput.extend({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const access = await requireTreasuryAccess(ctx.user.id, input.churchId);
      if (!access.canManageStructure) throw new TRPCError({ code: "FORBIDDEN", message: "Somente Pastores podem editar cultos fixos." });
      const existing = await getTreasuryRecurringScheduleById(input.id, input.churchId);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Programação fixa não encontrada nesta igreja." });
      const updated = await updateTreasuryRecurringSchedule(input);
      if (!updated) throw new TRPCError({ code: "BAD_REQUEST", message: "Não foi possível atualizar a programação fixa." });
      return updated;
    }),

  setRecurringScheduleActive: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), id: z.number().int().positive(), active: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const access = await requireTreasuryAccess(ctx.user.id, input.churchId);
      if (!access.canManageStructure) throw new TRPCError({ code: "FORBIDDEN", message: "Somente Pastores podem ativar ou pausar cultos fixos." });
      const existing = await getTreasuryRecurringScheduleById(input.id, input.churchId);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Programação fixa não encontrada nesta igreja." });
      return setTreasuryRecurringScheduleActive(input);
    }),

  createService: protectedProcedure
    .input(treasuryServiceInput)
    .mutation(async ({ input, ctx }) => {
      const access = await requireTreasuryAccess(ctx.user.id, input.churchId);
      if (!access.canManageStructure) throw new TRPCError({ code: "FORBIDDEN", message: "Somente Pastores podem cadastrar cultos." });
      return createTreasuryService({ ...input, createdByChurchUserId: access.actor.id });
    }),

  updateService: protectedProcedure
    .input(treasuryServiceInput.extend({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const access = await requireTreasuryAccess(ctx.user.id, input.churchId);
      if (!access.canManageStructure) throw new TRPCError({ code: "FORBIDDEN", message: "Somente Pastores podem editar cultos." });
      const existing = await getTreasuryServiceById(input.id, input.churchId);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Culto não encontrado nesta igreja." });
      const updated = await updateTreasuryService(input);
      if (!updated) throw new TRPCError({ code: "BAD_REQUEST", message: "Somente ocorrências abertas podem ser editadas." });
      return updated;
    }),

  cancelService: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const access = await requireTreasuryAccess(ctx.user.id, input.churchId);
      if (!access.canManageStructure) throw new TRPCError({ code: "FORBIDDEN", message: "Somente Pastores podem cancelar cultos." });
      const service = await getTreasuryServiceById(input.id, input.churchId);
      if (!service) throw new TRPCError({ code: "NOT_FOUND", message: "Culto não encontrado nesta igreja." });
      return cancelTreasuryService(input.id, input.churchId);
    }),

  countSheets: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      await requireTreasuryAccess(ctx.user.id, input.churchId);
      return getTreasuryCountSheetsByChurch(input.churchId);
    }),

  saveCountSheet: protectedProcedure
    .input(treasuryCountSheetInput)
    .mutation(async ({ input, ctx }) => {
      const access = await requireTreasuryAccess(ctx.user.id, input.churchId);
      if (input.counterOnePersonId === input.counterTwoPersonId) throw new TRPCError({ code: "BAD_REQUEST", message: "A contagem precisa de duas pessoas diferentes." });
      const service = await getTreasuryServiceById(input.serviceId, input.churchId);
      if (!service || service.status === "cancelado") throw new TRPCError({ code: "NOT_FOUND", message: "Culto não encontrado nesta igreja." });
      const people = await getPeopleByChurch(input.churchId);
      const personIds = new Set(people.map((person) => person.id));
      if (!personIds.has(input.counterOnePersonId) || !personIds.has(input.counterTwoPersonId)) throw new TRPCError({ code: "BAD_REQUEST", message: "Os dois contadores precisam pertencer a esta igreja." });
      const saved = await saveTreasuryCountSheet({ ...input, amounts: { cashCents: input.cashCents, pixCents: input.pixCents, transferCents: input.transferCents, cardCents: input.cardCents, checkCents: input.checkCents, otherCents: input.otherCents }, createdByChurchUserId: access.actor.id });
      if (!saved) throw new TRPCError({ code: "CONFLICT", message: "Já existe uma folha de contagem fechada ou para este culto." });
      return saved;
    }),

  closeCountSheet: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const access = await requireTreasuryAccess(ctx.user.id, input.churchId);
      const sheet = await getTreasuryCountSheetById(input.id, input.churchId);
      if (!sheet) throw new TRPCError({ code: "NOT_FOUND", message: "Folha de contagem não encontrada nesta igreja." });
      const closed = await closeTreasuryCountSheet({ ...input, actorChurchUserId: access.actor.id });
      if (!closed) throw new TRPCError({ code: "BAD_REQUEST", message: "Não foi possível fechar esta folha de contagem." });
      return closed;
    }),

  deposits: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      await requireTreasuryAccess(ctx.user.id, input.churchId);
      return getTreasuryDepositsByChurch(input.churchId);
    }),

  saveDeposit: protectedProcedure
    .input(treasuryDepositInput)
    .mutation(async ({ input, ctx }) => {
      const access = await requireTreasuryAccess(ctx.user.id, input.churchId);
      const sheet = await getTreasuryCountSheetById(input.countSheetId, input.churchId);
      if (!sheet) throw new TRPCError({ code: "NOT_FOUND", message: "Folha de contagem não encontrada nesta igreja." });
      if (sheet.status !== "fechada") throw new TRPCError({ code: "BAD_REQUEST", message: "Feche a folha de contagem antes de registrar o depósito." });
      if (input.amountCents > sheet.totalCents) throw new TRPCError({ code: "BAD_REQUEST", message: "O depósito não pode ser maior que o total contado." });
      const account = await getFinancialAccountById(input.accountId, input.churchId);
      if (!account || account.type !== "banco") throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione uma conta bancária desta igreja." });
      const saved = await saveTreasuryDeposit({ ...input, actorChurchUserId: access.actor.id });
      if (!saved) throw new TRPCError({ code: "CONFLICT", message: "Já existe um depósito para esta folha de contagem." });
      return saved;
    }),

  reports: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      await requireTreasuryAccess(ctx.user.id, input.churchId);
      return getTreasuryReportsByChurch(input.churchId);
    }),

  report: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      await requireTreasuryAccess(ctx.user.id, input.churchId);
      const report = await getTreasuryReportById(input.id, input.churchId);
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Relatório financeiro não encontrado nesta igreja." });
      return report;
    }),

  issueReport: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), serviceId: z.number().int().positive(), countSheetId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const access = await requireTreasuryAccess(ctx.user.id, input.churchId);
      const report = await issueTreasuryReport({ ...input, actorChurchUserId: access.actor.id });
      if (!report) throw new TRPCError({ code: "BAD_REQUEST", message: "Feche a folha de contagem e confira o vínculo com o culto antes de emitir o relatório." });
      return report;
    }),

  signReport: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), id: z.number().int().positive(), role: z.enum(["contador1", "contador2", "tesoureiro", "pastor"]) }))
    .mutation(async ({ input, ctx }) => {
      const access = await requireTreasuryAccess(ctx.user.id, input.churchId);
      if (!access.canManageStructure) throw new TRPCError({ code: "FORBIDDEN", message: "Somente a liderança financeira autorizada pode registrar a assinatura." });
      const report = await signTreasuryReport(input);
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Relatório financeiro não encontrado nesta igreja." });
      return report;
    }),

  serviceTransactions: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), serviceId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      await requireTreasuryAccess(ctx.user.id, input.churchId);
      const service = await getTreasuryServiceById(input.serviceId, input.churchId);
      if (!service) throw new TRPCError({ code: "NOT_FOUND", message: "Culto não encontrado nesta igreja." });
      return getFinancialTransactionsByService(input.churchId, input.serviceId);
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

  categoriesManagement: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const access = await requireTreasuryAccess(ctx.user.id, input.churchId);
      if (!access.canManageStructure) throw new TRPCError({ code: "FORBIDDEN", message: "Somente Pastores podem administrar categorias financeiras." });
      return getFinancialCategoriesForManagement(input.churchId);
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
      assertFinancialDateRange(input.periodStart, input.periodEnd);
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
    .input(z.object({ churchId: z.number().int().positive(), accountId: z.number().int().positive(), periodStart: financialDateInput, periodEnd: financialDateInput, bankClosingBalanceCents: z.number().int().min(-MAX_FINANCIAL_CENTS).max(MAX_FINANCIAL_CENTS), notes: z.string().trim().max(2000).optional() }))
    .mutation(async ({ input, ctx }) => {
      const access = await requireTreasuryAccess(ctx.user.id, input.churchId);
      assertFinancialDateRange(input.periodStart, input.periodEnd);
      const account = await getFinancialAccountById(input.accountId, input.churchId);
      if (!account || account.type !== "banco") throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione uma conta bancária desta igreja." });
      const bookBalanceCents = await getBookBalanceAt({ churchId: input.churchId, accountId: input.accountId, endDate: input.periodEnd });
      if (bookBalanceCents === null) throw new TRPCError({ code: "NOT_FOUND", message: "Conta bancária não encontrada." });
      const differenceCents = input.bankClosingBalanceCents - bookBalanceCents;
      return saveFinancialReconciliation({ ...input, bookBalanceCents, differenceCents, status: differenceCents === 0 ? "conciliada" : "com_divergencia", actorChurchUserId: access.actor.id });
    }),

  createAccount: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), name: z.string().trim().min(2).max(120), type: z.enum(["caixa", "banco", "outro"]), openingBalanceCents: z.number().int().min(0).max(MAX_FINANCIAL_CENTS).default(0) }))
    .mutation(async ({ input, ctx }) => {
      const access = await requireTreasuryAccess(ctx.user.id, input.churchId);
      if (!access.canManageStructure) throw new TRPCError({ code: "FORBIDDEN", message: "Somente Pastores podem criar contas financeiras." });
      try {
        return await createFinancialAccount(input);
      } catch (error) {
        if (isDuplicateFinancialRecord(error)) throw new TRPCError({ code: "CONFLICT", message: "Já existe uma conta financeira com esse nome nesta igreja." });
        throw error;
      }
    }),

  createCategory: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), type: z.enum(["entrada", "saida"]), name: z.string().trim().min(2).max(120) }))
    .mutation(async ({ input, ctx }) => {
      const access = await requireTreasuryAccess(ctx.user.id, input.churchId);
      if (!access.canManageStructure) throw new TRPCError({ code: "FORBIDDEN", message: "Somente Pastores podem criar categorias financeiras." });
      const key = `custom_${input.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;
      try {
        return await createFinancialCategory({ ...input, key });
      } catch (error) {
        if (isDuplicateFinancialRecord(error)) throw new TRPCError({ code: "CONFLICT", message: "Já existe uma categoria equivalente para este tipo de lançamento." });
        throw error;
      }
    }),

  updateCategory: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), id: z.number().int().positive(), type: z.enum(["entrada", "saida"]), name: z.string().trim().min(2).max(120) }))
    .mutation(async ({ input, ctx }) => {
      const access = await requireTreasuryAccess(ctx.user.id, input.churchId);
      if (!access.canManageStructure) throw new TRPCError({ code: "FORBIDDEN", message: "Somente Pastores podem editar categorias financeiras." });
      const category = await getFinancialCategoryForManagement(input.id, input.churchId);
      if (!category) throw new TRPCError({ code: "NOT_FOUND", message: "Categoria financeira não encontrada nesta igreja." });
      if (category.isSystem) throw new TRPCError({ code: "FORBIDDEN", message: "Categorias padrão do sistema não podem ser editadas." });
      if (category.type !== input.type && await hasFinancialCategoryTransactions(input.id, input.churchId)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Não é possível trocar o tipo de uma categoria que já possui lançamentos." });
      }
      try {
        return await updateFinancialCategory(input);
      } catch (error) {
        if (isDuplicateFinancialRecord(error)) throw new TRPCError({ code: "CONFLICT", message: "Já existe uma categoria equivalente para este tipo de lançamento." });
        throw error;
      }
    }),

  setCategoryActive: protectedProcedure
    .input(z.object({ churchId: z.number().int().positive(), id: z.number().int().positive(), active: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const access = await requireTreasuryAccess(ctx.user.id, input.churchId);
      if (!access.canManageStructure) throw new TRPCError({ code: "FORBIDDEN", message: "Somente Pastores podem ativar ou inativar categorias financeiras." });
      const category = await getFinancialCategoryForManagement(input.id, input.churchId);
      if (!category) throw new TRPCError({ code: "NOT_FOUND", message: "Categoria financeira não encontrada nesta igreja." });
      if (category.isSystem) throw new TRPCError({ code: "FORBIDDEN", message: "Categorias padrão do sistema não podem ser inativadas." });
      return setFinancialCategoryActive(input);
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
      assertFinancialDateRange(input.periodStart, input.periodEnd);
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
  tenantPublic: tenantPublicRouter,
  people: peopleRouter,
  souls: soulsRouter,
  consolidation: consolidationRouter,
  care: careRouter,
  cells: cellsRouter,
  events: eventsRouter,
  ministries: ministriesRouter,
  departments: departmentsRouter,
  announcements: announcementsRouter,
  prayer: prayerRouter,
  dashboard: dashboardRouter,
  radar: radarRouter,
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
