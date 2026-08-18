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
} from "./auth";
import {
  createAnnouncement,
  createCell,
  assignPersonToCell,
  createChurch,
  createConsolidation,
  createEvent,
  createPerson,
  createPrayerRequest,
  createSoul,
  findPossiblePeopleByIdentity,
  getAnnouncementsByChurch,
  getCellsByChurch,
  getActiveMembersByCell,
  getCellById,
  getActiveCellMembership,
  getCellMembershipHistory,
  getChurchById,
  getChurchBySlug,
  getChurchMemberByUserId,
  getActiveChurchUserById,
  getChurchMembersByChurch,
  getChurchUsersByChurch,
  linkChurchUserToPerson,
  updateChurchUserAssignment,
  getComplementaryRolesByChurchUser,
  setComplementaryRolesForChurchUser,
  canChurchUserManageJourney,
  getJourneyManagedPersonIds,
  getConsolidationsByChurch,
  getConsolidationsBySoul,
  getConsolidationById,
  getCareAttentionByChurch,
  getDashboardStats,
  getDiscipleshipFunnel,
  getDiscipleshipTree,
  getEventsByChurch,
  getMinistriesByChurch,
  getMinistryMembers,
  getMinistryMemberCounts,
  isActiveMinistryMember,
  assignPersonToMinistry,
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
import { eq } from "drizzle-orm";
import { generateReportHTML, htmlToBase64 } from "./reports";

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

const CHURCH_ADMIN_ROLES = new Set(["pastor_presidente", "pastor_local", "secretario"]);
const CHURCH_ROLE_MANAGER_ROLES = new Set(["pastor_presidente", "pastor_local"]);

async function requireChurchAdministrator(userId: number, churchId: number) {
  const member = await requireChurchMember(userId, churchId);
  if (!CHURCH_ADMIN_ROLES.has(member.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Seu perfil não tem permissão para esta ação" });
  }
  return member;
}

async function requireChurchRoleManager(userId: number, churchId: number) {
  const member = await requireChurchMember(userId, churchId);
  if (!CHURCH_ROLE_MANAGER_ROLES.has(member.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Somente Pastores podem definir funções de acesso." });
  }
  return member;
}

async function getEffectiveChurchRoles(userId: number, churchId: number, actor: { role: string }) {
  if (userId >= 0) return [actor.role];
  const complementary = await getComplementaryRolesByChurchUser(Math.abs(userId), churchId);
  return Array.from(new Set([actor.role, ...complementary]));
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

// ─── ROUTERS ──────────────────────────────────────────────────────────────────

const churchRouter = router({
  list: publicProcedure.query(() => getAllChurches()),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ input }) => getChurchBySlug(input.slug)),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getChurchById(input.id)),

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
      await requireChurchMember(ctx.user.id, input.churchId);
      return getPeopleByChurch(input.churchId, input.search);
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
      await requireChurchMember(ctx.user.id, input.churchId);
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
      await requireChurchMember(ctx.user.id, input.churchId);
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
        await requireChurchMember(ctx.user.id, churchId);
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
        ]),
        acceptedJesus: z.boolean().default(false),
        reconciliation: z.boolean().default(false),
        firstVisit: z.boolean().default(false),
        wonById: z.number(),
        existingPersonId: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      const winner = await getPersonById(input.wonById, input.churchId);
      if (!winner) {
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
          wonById: input.wonById,
        });
      }
      if (!person) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível criar a ficha da Pessoa." });
      }

      const { existingPersonId: _existingPersonId, ...soulInput } = input;
      const soul = await createSoul({ ...soulInput, personId: person.id } as any);
      if (!soul) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível registrar a Nova Alma." });
      }
      await linkSoulToPerson(soul.id, input.churchId, person.id);
      const careAssignment = await setCurrentCareAssignment({
        churchId: input.churchId,
        personId: person.id,
        responsiblePersonId: input.wonById,
        role: "quem_ganhou",
        notes: "Responsável inicial definido no registro da Nova Alma.",
      });
      return { soul, person, careAssignment, createdPerson: !input.existingPersonId };
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
      await requireChurchMember(ctx.user.id, input.churchId);
      return updateSoul(input.id, input.churchId, { status: input.status });
    }),
});

const consolidationRouter = router({
  list: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      return getConsolidationsByChurch(input.churchId);
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
      await requireChurchMember(ctx.user.id, input.churchId);
      const [soul, consolidator, existing] = await Promise.all([
        getSoulById(input.soulId, input.churchId),
        getPersonById(input.consolidatorId, input.churchId),
        getConsolidationsBySoul(input.soulId, input.churchId),
      ]);
      if (!soul) throw new TRPCError({ code: "NOT_FOUND", message: "Nova Alma não encontrada." });
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
  getCurrent: protectedProcedure
    .input(z.object({ churchId: z.number(), personId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      const person = await getPersonById(input.personId, input.churchId);
      if (!person) throw new TRPCError({ code: "NOT_FOUND", message: "Pessoa não encontrada." });
      return getCurrentCareAssignment(input.personId, input.churchId);
    }),

  history: protectedProcedure
    .input(z.object({ churchId: z.number(), personId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
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
      await requireChurchMember(ctx.user.id, input.churchId);
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
      await requireChurchMember(ctx.user.id, input.churchId);
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
      await requireChurchMember(ctx.user.id, input.churchId);
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
      await requireChurchMember(ctx.user.id, input.churchId);
      return createEvent({ ...input, startDate: new Date(input.startDate) } as any);
    }),
  generateQrCode: protectedProcedure
    .input(z.object({ eventId: z.number(), churchId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { nanoid } = await import("nanoid");
      const token = nanoid(16);
      const qrCode = `checkin:${input.eventId}:${token}`;
      await db.update(events).set({ qrCode }).where(eq(events.id, input.eventId));
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
      await requireChurchMember(ctx.user.id, input.churchId);
      const [ministry, person] = await Promise.all([
        getMinistriesByChurch(input.churchId).then((items) => items.find((item) => item.id === input.ministryId)),
        getPersonById(input.personId, input.churchId),
      ]);
      if (!ministry || !person) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Pessoa ou Ministério inválido para esta igreja." });
      }
      if (await isActiveMinistryMember(input.ministryId, input.personId, input.churchId)) {
        return { success: true, alreadyMember: true };
      }
      await assignPersonToMinistry({ ministryId: input.ministryId, personId: input.personId });
      return { success: true, alreadyMember: false };
    }),
  create: protectedProcedure
    .input(z.object({
      churchId: z.number(),
      name: z.string().min(1),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
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
      return filtered;
    }),
  create: protectedProcedure
    .input(z.object({
      churchId: z.number(),
      ministryId: z.number(),
      personId: z.number(),
      scheduledDate: z.string(),
      role: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
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
      const db = await import("./db").then((m) => m.getDb());
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { scheduleItems } = await import("../drizzle/schema");
      await db.insert(scheduleItems).values({
        churchId: input.churchId,
        ministryId: input.ministryId,
        personId: input.personId,
        scheduledDate: new Date(input.scheduledDate + "T12:00:00"),
        role: input.role ?? null,
      });
      return { success: true };
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
  list: publicProcedure
    .input(z.object({ churchId: z.number() }))
    .query(({ input }) => getPrayerRequestsByChurch(input.churchId)),

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
    .mutation(({ input }) => createPrayerRequest(input)),
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
      if (!church) throw new TRPCError({ code: "NOT_FOUND", message: "Igreja não encontrada" });
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
      await requireChurchMember(ctx.user.id, input.churchId);
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
      await requireChurchMember(ctx.user.id, input.churchId);
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
      await requireChurchMember(ctx.user.id, input.churchId);
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
      await requireChurchMember(ctx.user.id, input.churchId);
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
      await requireChurchMember(ctx.user.id, input.churchId);
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
      await requireChurchMember(ctx.user.id, input.churchId);
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
      await requireChurchMember(ctx.user.id, input.churchId);
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
      await requireChurchMember(ctx.user.id, input.churchId);
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
      await updateBaptismEnrollment(input.id, { status: input.status, completedAt: input.completedAt });
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
      await requireChurchMember(ctx.user.id, input.churchId);
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
      await updateEncounterEnrollment(input.id, { status: input.status, completedAt: input.completedAt });
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
      await requireChurchMember(ctx.user.id, input.churchId);
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
      await updateLeadershipEnrollment(input.id, {
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
      await requireChurchMember(ctx.user.id, input.churchId);
      return getCounselingSessionsByChurch(input.churchId);
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
      await requireChurchMember(ctx.user.id, input.churchId);
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
      await requireChurchMember(ctx.user.id, input.churchId);
      await updateCounselingSession(input.id, { status: input.status, notes: input.notes });
      return { success: true };
    }),
  getNotes: protectedProcedure
    .input(z.object({ sessionId: z.number(), churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
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
      await requireChurchMember(ctx.user.id, input.churchId);
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
      await requireChurchMember(ctx.user.id, input.churchId);
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
      await requireChurchMember(ctx.user.id, input.churchId);
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
              name: `Lampas ${planData.name}`,
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
