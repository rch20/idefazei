import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  loginChurchUser,
  loginSuperAdmin,
  createChurchUser,
  createSuperAdmin,
} from "./auth";
import {
  createAnnouncement,
  createCell,
  createChurch,
  createConsolidation,
  createEvent,
  createPerson,
  createPrayerRequest,
  createSoul,
  getAnnouncementsByChurch,
  getCellsByChurch,
  getChurchById,
  getChurchBySlug,
  getChurchMemberByUserId,
  getChurchMembersByChurch,
  getConsolidationsByChurch,
  getDashboardStats,
  getDiscipleshipFunnel,
  getDiscipleshipTree,
  getEventsByChurch,
  getMinistriesByChurch,
  getPeopleByChurch,
  getPersonById,
  getPrayerRequestsByChurch,
  getRadarEspiritual,
  getSoulsByChurch,
  updateChurch,
  updateConsolidation,
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
} from "./db";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

async function requireChurchMember(userId: number, churchId: number) {
  const member = await getChurchMemberByUserId(userId, churchId);
  if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado a esta igreja" });
  return member;
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
      await requireChurchMember(ctx.user.id, id);
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
      await requireChurchMember(ctx.user.id, churchId);
      return updatePerson(id, churchId, data as any);
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
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      return createSoul(input as any);
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
      return createConsolidation(input);
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
      return updateConsolidation(id, churchId, data as any);
    }),
});

const cellsRouter = router({
  list: protectedProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireChurchMember(ctx.user.id, input.churchId);
      return getCellsByChurch(input.churchId);
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
      const rows = await getMinistriesByChurch(input.churchId);
      return rows.map((m) => ({
        ...m,
        memberCount: 0,
        leaderName: null as string | null,
      }));
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

  register: publicProcedure
    .input(z.object({
      churchId: z.number(),
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      role: z.enum(["pastor_presidente","pastor_local","supervisor","lider","consolidador","diacono","secretario","tesoureiro","membro"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const user = await createChurchUser({
        churchId: input.churchId,
        name: input.name,
        email: input.email,
        password: input.password,
        role: input.role ?? "membro",
      });
      return { success: true, userId: user?.id };
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

  seed: publicProcedure
    .input(z.object({ name: z.string(), email: z.string().email(), password: z.string().min(8), secret: z.string() }))
    .mutation(async ({ input }) => {
      if (input.secret !== "lampas-super-admin-2025") throw new TRPCError({ code: "FORBIDDEN" });
      await createSuperAdmin(input.name, input.email, input.password);
      return { success: true };
    }),
});

// ─── SUPER ADMIN ROUTER ───────────────────────────────────────────────────────

const superAdminRouter = router({
  stats: publicProcedure.query(() => getGlobalStats()),

  churches: publicProcedure.query(() => getAllChurchesAdmin()),

  pendingRegistrations: publicProcedure.query(() => getPendingRegistrations()),

  reviewRegistration: publicProcedure
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

  getLeads: publicProcedure
    .input(z.object({ churchId: z.number() }))
    .query(async ({ input }) => {
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

// ─── APP ROUTER ───────────────────────────────────────────────────────────────

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
  cells: cellsRouter,
  events: eventsRouter,
  ministries: ministriesRouter,
  announcements: announcementsRouter,
  prayer: prayerRouter,
  dashboard: dashboardRouter,
    families: familiesRouter,
  schedules: schedulesRouter,
  library: libraryRouter,
  churchAuth: churchAuthRouter,
  adminAuth: adminAuthRouter,
  superAdmin: superAdminRouter,
  visitor: visitorRouter,
  register: registerRouter,
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
