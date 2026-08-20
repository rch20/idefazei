import { and, count, desc, eq, isNull, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  announcements,
  baptismClasses,
  baptismEnrollments,
  careAssignments,
  cellAttendance,
  cellMeetings,
  cellMembers,
  cells,
  churchMembers,
  churchNotificationPreferences,
  churchRegistrations,
  churchUserComplementaryRoles,
  churchUsers,
  churches,
  communicationLogs,
  consolidations,
  consolidationFollowUps,
  consolidationReferrals,
  counselingNotes,
  counselingSessions,
  courseEnrollments,
  courses,
  encounterEnrollments,
  encounterEvents,
  eventRegistrations,
  events,
  families,
  familyMembers,
  financialAccounts,
  financialAuditLogs,
  financialCategories,
  financialPeriodClosures,
  financialReconciliationAttachments,
  financialReconciliations,
  financialTransactions,
  InsertUser,
  leadershipHistory,
  leadershipSchoolClasses,
  leadershipSchoolEnrollments,
  libraryItems,
  ministries,
  ministryMembers,
  ministryRoleAssignments,
  ministryRoleDefinitions,
  notificationDeliveries,
  notificationEvents,
  people,
  prayerRequests,
  scheduleItems,
  superAdmins,
  souls,
  users,
  visitorLeads,
  onboardingProgress,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── NOTIFICAÇÕES MULTI-CANAL ─────────────────────────────────────────────────

export type NotificationEventType =
  | "cadastro_pendente"
  | "pessoa_aprovada"
  | "visita_agendada"
  | "lembrete_visita"
  | "visita_nao_realizada"
  | "responsabilidade_atribuida"
  | "funcao_ministerial_atribuida"
  | "evento_igreja"
  | "comunicado_lideranca"
  | "encaminhamento_sem_aceite";

export type NotificationChannel = "sistema" | "whatsapp";

export async function isNotificationChannelActive(churchId: number, eventType: NotificationEventType, channel: NotificationChannel) {
  const db = await getDb();
  if (!db) return false;
  const preference = await db.select().from(churchNotificationPreferences)
    .where(and(eq(churchNotificationPreferences.churchId, churchId), eq(churchNotificationPreferences.eventType, eventType), eq(churchNotificationPreferences.channel, channel)))
    .limit(1);
  return preference[0]?.active ?? channel === "sistema";
}

export async function getNotificationEventByDedupeKey(churchId: number, dedupeKey: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(notificationEvents)
    .where(and(eq(notificationEvents.churchId, churchId), eq(notificationEvents.dedupeKey, dedupeKey)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createNotificationEvent(data: {
  churchId: number; type: NotificationEventType; entityType?: string | null; entityId?: number | null;
  title: string; body: string; metadata?: Record<string, unknown> | null; dedupeKey?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(notificationEvents).values({
    churchId: data.churchId, type: data.type, entityType: data.entityType ?? null, entityId: data.entityId ?? null,
    title: data.title, body: data.body, metadata: data.metadata ?? null, dedupeKey: data.dedupeKey ?? null,
  });
  const id = Number((result[0] as { insertId?: number })?.insertId ?? 0);
  const rows = await db.select().from(notificationEvents).where(eq(notificationEvents.id, id)).limit(1);
  if (!rows[0]) throw new Error("Falha ao criar evento de notificação");
  return rows[0];
}

export async function createInternalNotificationDelivery(data: { churchId: number; eventId: number; recipientChurchUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(notificationDeliveries).values({
    churchId: data.churchId, eventId: data.eventId, recipientChurchUserId: data.recipientChurchUserId,
    channel: "sistema", status: "entregue", deliveredAt: new Date(),
  });
}

export async function getNotificationsForChurchUser(data: { churchId: number; churchUserId: number; unreadOnly?: boolean; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(notificationDeliveries.churchId, data.churchId), eq(notificationDeliveries.recipientChurchUserId, data.churchUserId), eq(notificationDeliveries.channel, "sistema")];
  if (data.unreadOnly) conditions.push(isNull(notificationDeliveries.readAt));
  return db.select({ delivery: notificationDeliveries, event: notificationEvents })
    .from(notificationDeliveries)
    .innerJoin(notificationEvents, and(eq(notificationEvents.id, notificationDeliveries.eventId), eq(notificationEvents.churchId, data.churchId)))
    .where(and(...conditions)).orderBy(desc(notificationDeliveries.createdAt)).limit(data.limit ?? 40);
}

export async function getUnreadNotificationCount(churchId: number, churchUserId: number) {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select({ value: count() }).from(notificationDeliveries)
    .where(and(eq(notificationDeliveries.churchId, churchId), eq(notificationDeliveries.recipientChurchUserId, churchUserId), eq(notificationDeliveries.channel, "sistema"), isNull(notificationDeliveries.readAt)));
  return Number(rows[0]?.value ?? 0);
}

export async function markNotificationRead(data: { id: number; churchId: number; churchUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notificationDeliveries).set({ status: "lida", readAt: new Date() })
    .where(and(eq(notificationDeliveries.id, data.id), eq(notificationDeliveries.churchId, data.churchId), eq(notificationDeliveries.recipientChurchUserId, data.churchUserId), eq(notificationDeliveries.channel, "sistema")));
}

// ─── USERS ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  });

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── CHURCHES (TENANTS) ───────────────────────────────────────────────────────

export async function getChurchBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(churches).where(eq(churches.slug, slug)).limit(1);
  return result[0] ?? null;
}

export async function getChurchById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(churches).where(eq(churches.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getAllChurches() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(churches).where(eq(churches.active, true)).orderBy(churches.name);
}

export async function createChurch(data: typeof churches.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(churches).values(data);
  const insertId = (result[0] as { insertId?: number })?.insertId;
  if (!insertId) throw new Error("Failed to create church");
  const rows = await db.select().from(churches).where(eq(churches.id, insertId)).limit(1);
  return rows[0];
}

export async function updateChurch(id: number, data: Partial<typeof churches.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(churches).set(data).where(eq(churches.id, id));
}

// ─── CHURCH MEMBERS ───────────────────────────────────────────────────────────

export async function getChurchMemberByUserId(userId: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(churchMembers)
    .where(and(eq(churchMembers.userId, userId), eq(churchMembers.churchId, churchId)))
    .limit(1);
  return result[0] ?? null;
}

/** Retorna somente um usuário próprio de igreja que continua ativo. */
export async function getActiveChurchUserById(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(churchUsers)
    .where(and(eq(churchUsers.id, userId), eq(churchUsers.active, true)))
    .limit(1);
  return result[0] ?? null;
}

export async function getChurchUsersByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  const accounts = await db
    .select({
      id: churchUsers.id,
      name: churchUsers.name,
      email: churchUsers.email,
      role: churchUsers.role,
      personId: churchUsers.personId,
      active: churchUsers.active,
      lastLoginAt: churchUsers.lastLoginAt,
    })
    .from(churchUsers)
    .where(eq(churchUsers.churchId, churchId))
    .orderBy(churchUsers.name);
  const complementary = await db
    .select({ churchUserId: churchUserComplementaryRoles.churchUserId, role: churchUserComplementaryRoles.role })
    .from(churchUserComplementaryRoles)
    .where(eq(churchUserComplementaryRoles.churchId, churchId));
  return accounts.map((account) => ({
    ...account,
    complementaryRoles: complementary.filter((item) => item.churchUserId === account.id).map((item) => item.role),
  }));
}

export async function linkChurchUserToPerson(userId: number, churchId: number, personId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(churchUsers)
    .set({ personId })
    .where(and(eq(churchUsers.id, userId), eq(churchUsers.churchId, churchId)));
  return getActiveChurchUserById(userId);
}

export async function updateChurchUserAssignment(
  userId: number,
  churchId: number,
  data: { personId: number; role: typeof churchUsers.$inferInsert["role"] }
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(churchUsers)
    .set(data)
    .where(and(eq(churchUsers.id, userId), eq(churchUsers.churchId, churchId)));
  return getActiveChurchUserById(userId);
}

export async function getPendingChurchUsers(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(churchUsers)
    .where(and(eq(churchUsers.churchId, churchId), eq(churchUsers.registrationStatus, "pending")))
    .orderBy(churchUsers.createdAt);
}

export async function resolveChurchUserRegistration(
  userId: number,
  churchId: number,
  approverId: number,
  approved: boolean,
  rejectionReason?: string
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(churchUsers)
    .set({
      registrationStatus: approved ? "approved" : "rejected",
      active: approved,
      approvedAt: approved ? new Date() : null,
      approvedByChurchUserId: approverId,
      rejectionReason: approved ? null : rejectionReason || "Cadastro não aprovado",
    })
    .where(
      and(
        eq(churchUsers.id, userId),
        eq(churchUsers.churchId, churchId),
        eq(churchUsers.registrationStatus, "pending")
      )
    );
  const rows = await db
    .select()
    .from(churchUsers)
    .where(and(eq(churchUsers.id, userId), eq(churchUsers.churchId, churchId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getComplementaryRolesByChurchUser(churchUserId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ role: churchUserComplementaryRoles.role })
    .from(churchUserComplementaryRoles)
    .where(
      and(
        eq(churchUserComplementaryRoles.churchUserId, churchUserId),
        eq(churchUserComplementaryRoles.churchId, churchId)
      )
    );
  return rows.map((row) => row.role);
}

export async function setComplementaryRolesForChurchUser(
  churchUserId: number,
  churchId: number,
  roles: Array<"consolidador" | "diacono" | "tesoureiro" | "levita">
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .delete(churchUserComplementaryRoles)
    .where(
      and(
        eq(churchUserComplementaryRoles.churchUserId, churchUserId),
        eq(churchUserComplementaryRoles.churchId, churchId)
      )
    );
  const uniqueRoles = Array.from(new Set(roles));
  if (uniqueRoles.length > 0) {
    await db.insert(churchUserComplementaryRoles).values(
      uniqueRoles.map((role) => ({ churchId, churchUserId, role }))
    );
  }
  return getComplementaryRolesByChurchUser(churchUserId, churchId);
}

/** Determina se uma conta pode movimentar a jornada espiritual de uma Pessoa. */
export async function canChurchUserManageJourney(input: {
  churchId: number;
  actorPersonId: number | null;
  actorRoles: string[];
  targetPersonId: number;
}) {
  if (input.actorRoles.some((role) => ["pastor_presidente", "pastor_local"].includes(role))) return true;
  if (!input.actorPersonId) return false;

  const db = await getDb();
  if (!db) return false;

  if (input.actorRoles.includes("consolidador")) {
    const assignment = await getCurrentCareAssignment(input.targetPersonId, input.churchId);
    if (assignment?.responsiblePersonId === input.actorPersonId && assignment.role === "consolidador") return true;
  }

  if (input.actorRoles.includes("lider") || input.actorRoles.includes("supervisor")) {
    const matches = await db
      .select({ leaderId: cells.leaderId, supervisorId: cells.supervisorId })
      .from(cellMembers)
      .innerJoin(cells, eq(cells.id, cellMembers.cellId))
      .where(
        and(
          eq(cellMembers.personId, input.targetPersonId),
          eq(cellMembers.active, true),
          eq(cells.churchId, input.churchId)
        )
      )
      .limit(1);
    return matches.some((cell) =>
      (input.actorRoles.includes("lider") && cell.leaderId === input.actorPersonId) ||
      (input.actorRoles.includes("supervisor") && cell.supervisorId === input.actorPersonId)
    );
  }

  return false;
}

/** Lista as Pessoas que um perfil não pastoral pode movimentar no Funil. */
export async function getJourneyManagedPersonIds(input: {
  churchId: number;
  actorPersonId: number | null;
  actorRoles: string[];
}) {
  if (!input.actorPersonId) return [];
  const db = await getDb();
  if (!db) return [];

  const personIds = new Set<number>();

  if (input.actorRoles.includes("consolidador")) {
    const rows = await db
      .select({ personId: careAssignments.personId })
      .from(careAssignments)
      .where(
        and(
          eq(careAssignments.churchId, input.churchId),
          eq(careAssignments.responsiblePersonId, input.actorPersonId),
          eq(careAssignments.role, "consolidador"),
          eq(careAssignments.active, true)
        )
      );
    rows.forEach((row) => personIds.add(row.personId));
  }

  if (input.actorRoles.includes("lider") || input.actorRoles.includes("supervisor")) {
    const rows = await db
      .select({ personId: cellMembers.personId, leaderId: cells.leaderId, supervisorId: cells.supervisorId })
      .from(cellMembers)
      .innerJoin(cells, eq(cells.id, cellMembers.cellId))
      .where(
        and(
          eq(cellMembers.active, true),
          eq(cells.churchId, input.churchId)
        )
      );
    rows
      .filter((cell) =>
        (input.actorRoles.includes("lider") && cell.leaderId === input.actorPersonId) ||
        (input.actorRoles.includes("supervisor") && cell.supervisorId === input.actorPersonId)
      )
      .forEach((cell) => personIds.add(cell.personId));
  }

  return Array.from(personIds);
}

/** Retorna somente um Super Admin que continua ativo. */
export async function getActiveSuperAdminById(adminId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(superAdmins)
    .where(and(eq(superAdmins.id, adminId), eq(superAdmins.active, true)))
    .limit(1);
  return result[0] ?? null;
}

export async function getChurchMembersByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(churchMembers)
    .where(and(eq(churchMembers.churchId, churchId), eq(churchMembers.active, true)));
}

// ─── PEOPLE ───────────────────────────────────────────────────────────────────

export async function getPeopleByChurch(churchId: number, search?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(people.churchId, churchId), eq(people.active, true)];
  if (search) {
    conditions.push(
      or(
        sql`${people.fullName} LIKE ${`%${search}%`}`,
        sql`${people.email} LIKE ${`%${search}%`}`,
        sql`${people.phone} LIKE ${`%${search}%`}`
      ) as any
    );
  }
  return db
    .select()
    .from(people)
    .where(and(...conditions))
    .orderBy(people.fullName)
    .limit(100);
}

export async function getPersonById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(people)
    .where(and(eq(people.id, id), eq(people.churchId, churchId)))
    .limit(1);
  return result[0] ?? null;
}

/** Sugere fichas existentes, sem vincular automaticamente pessoas homônimas. */
export async function findPossiblePeopleByIdentity(
  churchId: number,
  identity: { fullName: string; phone?: string }
) {
  const db = await getDb();
  if (!db) return [];
  const matches = [eq(people.fullName, identity.fullName.trim())];
  const phone = identity.phone?.trim();
  if (phone) {
    matches.push(eq(people.phone, phone), eq(people.whatsapp, phone));
  }
  return db
    .select()
    .from(people)
    .where(and(eq(people.churchId, churchId), eq(people.active, true), or(...matches)))
    .orderBy(people.fullName)
    .limit(10);
}

export async function createPerson(data: typeof people.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(people).values(data);
  const personId = (result[0] as { insertId?: number }).insertId;
  if (!personId) throw new Error("Failed to create person");
  return getPersonById(personId, data.churchId);
}

export async function updatePerson(id: number, churchId: number, data: Partial<typeof people.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(people).set(data).where(and(eq(people.id, id), eq(people.churchId, churchId)));
}

// ─── SOULS (GANHAR ALMAS) ─────────────────────────────────────────────────────

export async function getSoulsByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(souls)
    .where(eq(souls.churchId, churchId))
    .orderBy(desc(souls.createdAt))
    .limit(100);
}

export async function getSoulById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(souls)
    .where(and(eq(souls.id, id), eq(souls.churchId, churchId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createSoul(data: typeof souls.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(souls).values(data);
  const soulId = (result[0] as { insertId?: number }).insertId;
  if (!soulId) throw new Error("Failed to create soul");
  const rows = await db
    .select()
    .from(souls)
    .where(and(eq(souls.id, soulId), eq(souls.churchId, data.churchId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateSoul(id: number, churchId: number, data: Partial<typeof souls.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(souls).set(data).where(and(eq(souls.id, id), eq(souls.churchId, churchId)));
}

export async function linkSoulToPerson(soulId: number, churchId: number, personId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(souls)
    .set({ personId })
    .where(and(eq(souls.id, soulId), eq(souls.churchId, churchId)));
}

// ─── CUIDADO PASTORAL ─────────────────────────────────────────────────────────

export async function getCurrentCareAssignment(personId: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(careAssignments)
    .where(
      and(
        eq(careAssignments.personId, personId),
        eq(careAssignments.churchId, churchId),
        eq(careAssignments.active, true)
      )
    )
    .orderBy(desc(careAssignments.startedAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getCareHistoryByPerson(personId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(careAssignments)
    .where(and(eq(careAssignments.personId, personId), eq(careAssignments.churchId, churchId)))
    .orderBy(desc(careAssignments.startedAt));
}

/** Retorna a fila objetiva de pessoas que demandam uma ação pastoral. */
export async function getCareAttentionByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  const [persons, churchSouls, churchConsolidations, activeAssignments, activeMemberships] = await Promise.all([
    getPeopleByChurch(churchId),
    getSoulsByChurch(churchId),
    getConsolidationsByChurch(churchId),
    db.select().from(careAssignments).where(and(eq(careAssignments.churchId, churchId), eq(careAssignments.active, true))),
    db
      .select({ personId: cellMembers.personId, cellId: cells.id, cellName: cells.name })
      .from(cellMembers)
      .innerJoin(cells, eq(cells.id, cellMembers.cellId))
      .where(and(eq(cells.churchId, churchId), eq(cells.active, true), eq(cellMembers.active, true))),
  ]);

  const soulByPerson = new Map(churchSouls.filter((soul) => soul.personId).map((soul) => [soul.personId!, soul]));
  const consolidationBySoul = new Map(churchConsolidations.map((item) => [item.soulId, item]));
  const careByPerson = new Map(activeAssignments.map((item) => [item.personId, item]));
  const cellByPerson = new Map(activeMemberships.map((item) => [item.personId, item]));

  return persons.map((person) => {
    const soul = soulByPerson.get(person.id);
    const consolidation = soul ? consolidationBySoul.get(soul.id) : undefined;
    const careAssignment = careByPerson.get(person.id);
    const cell = cellByPerson.get(person.id);
    const reasons: string[] = [];
    let nextStep = "Acompanhamento em dia";
    let priority: "alta" | "media" | "normal" = "normal";

    if (!careAssignment) {
      reasons.push("Sem responsável pelo cuidado");
      nextStep = "Definir responsável";
      priority = "alta";
    }
    if (soul && !consolidation) {
      reasons.push("Consolidação não iniciada");
      nextStep = "Iniciar consolidação";
      priority = "alta";
    } else if (consolidation && !consolidation.callMade) {
      reasons.push("Sem primeiro contato registrado");
      nextStep = "Registrar primeiro contato";
      priority = "alta";
    } else if (soul?.status === "consolidado" && !cell) {
      reasons.push("Sem célula ativa");
      nextStep = "Enviar para célula";
      priority = priority === "alta" ? "alta" : "media";
    }

    return {
      person,
      soul: soul ?? null,
      consolidation: consolidation ?? null,
      careAssignment: careAssignment ?? null,
      cell: cell ?? null,
      nextStep,
      priority,
      reasons,
    };
  });
}

/** Encerra o responsável anterior e define exatamente um responsável atual. */
export async function setCurrentCareAssignment(data: {
  churchId: number;
  personId: number;
  responsiblePersonId: number;
  role: "quem_ganhou" | "consolidador" | "lider_celula" | "discipulador" | "pastor";
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const now = new Date();
  await db
    .update(careAssignments)
    .set({ active: false, endedAt: now })
    .where(
      and(
        eq(careAssignments.personId, data.personId),
        eq(careAssignments.churchId, data.churchId),
        eq(careAssignments.active, true)
      )
    );
  const result = await db.insert(careAssignments).values({ ...data, active: true, startedAt: now });
  const assignmentId = (result[0] as { insertId?: number }).insertId;
  if (!assignmentId) throw new Error("Failed to set care assignment");
  const rows = await db.select().from(careAssignments).where(eq(careAssignments.id, assignmentId)).limit(1);
  return rows[0] ?? null;
}

// ─── CONSOLIDATIONS ───────────────────────────────────────────────────────────

export async function getConsolidationsBySoul(soulId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(consolidations)
    .where(and(eq(consolidations.soulId, soulId), eq(consolidations.churchId, churchId)));
}

export async function getConsolidationsByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(consolidations)
    .where(eq(consolidations.churchId, churchId))
    .orderBy(desc(consolidations.createdAt));
}

export async function getConsolidationById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(consolidations)
    .where(and(eq(consolidations.id, id), eq(consolidations.churchId, churchId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createConsolidation(data: typeof consolidations.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(consolidations).values(data);
  return result[0];
}

export async function updateConsolidation(id: number, churchId: number, data: Partial<typeof consolidations.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(consolidations)
    .set(data)
    .where(and(eq(consolidations.id, id), eq(consolidations.churchId, churchId)));
}

// ─── ENCAMINHAMENTOS PARA CONSOLIDAÇÃO ─────────────────────────────────────────

export async function getConsolidationReferralsByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(consolidationReferrals)
    .where(eq(consolidationReferrals.churchId, churchId))
    .orderBy(desc(consolidationReferrals.referredAt));
}

export async function getConsolidationReferralById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(consolidationReferrals)
    .where(and(eq(consolidationReferrals.id, id), eq(consolidationReferrals.churchId, churchId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createConsolidationReferral(data: typeof consolidationReferrals.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(consolidationReferrals).values(data);
  return result[0];
}

export async function updateConsolidationReferral(
  id: number,
  churchId: number,
  data: Partial<typeof consolidationReferrals.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(consolidationReferrals)
    .set(data)
    .where(and(eq(consolidationReferrals.id, id), eq(consolidationReferrals.churchId, churchId)));
  return getConsolidationReferralById(id, churchId);
}

export async function getConsolidationFollowUpsByReferral(referralId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(consolidationFollowUps)
    .where(and(eq(consolidationFollowUps.referralId, referralId), eq(consolidationFollowUps.churchId, churchId)))
    .orderBy(desc(consolidationFollowUps.createdAt));
}

export async function getConsolidationFollowUpsByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(consolidationFollowUps)
    .where(eq(consolidationFollowUps.churchId, churchId))
    .orderBy(desc(consolidationFollowUps.createdAt));
}

export async function createConsolidationFollowUp(data: typeof consolidationFollowUps.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(consolidationFollowUps).values(data);
  return result[0];
}

// ─── CELLS ────────────────────────────────────────────────────────────────────

export async function getCellsByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(cells)
    .where(and(eq(cells.churchId, churchId), eq(cells.active, true)))
    .orderBy(cells.name);
}

export async function getCellById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(cells)
    .where(and(eq(cells.id, id), eq(cells.churchId, churchId)))
    .limit(1);
  return result[0] ?? null;
}

export async function createCell(data: typeof cells.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(cells).values(data);
  return result[0];
}

export async function getCellMembersCount(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ cellId: cellMembers.cellId, count: sql<number>`COUNT(*)` })
    .from(cellMembers)
    .innerJoin(cells, eq(cells.id, cellMembers.cellId))
    .where(and(eq(cells.churchId, churchId), eq(cellMembers.active, true)))
    .groupBy(cellMembers.cellId);
}

/** Retorna as reuniões recentes de uma Célula com o resumo de presença já calculado. */
export async function getCellMeetingSummaries(cellId: number, churchId: number, limit = 6) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      meeting: cellMeetings,
      total: sql<number>`COUNT(${cellAttendance.id})`,
      present: sql<number>`COALESCE(SUM(CASE WHEN ${cellAttendance.status} = 'presente' THEN 1 ELSE 0 END), 0)`,
      absent: sql<number>`COALESCE(SUM(CASE WHEN ${cellAttendance.status} = 'ausente' THEN 1 ELSE 0 END), 0)`,
    })
    .from(cellMeetings)
    .leftJoin(cellAttendance, eq(cellAttendance.meetingId, cellMeetings.id))
    .innerJoin(cells, eq(cells.id, cellMeetings.cellId))
    .where(and(eq(cellMeetings.cellId, cellId), eq(cellMeetings.churchId, churchId), eq(cells.churchId, churchId)))
    .groupBy(cellMeetings.id)
    .orderBy(desc(cellMeetings.meetingDate))
    .limit(limit);
}

export async function getCellMeetingByDate(cellId: number, churchId: number, meetingDate: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(cellMeetings)
    .where(
      and(
        eq(cellMeetings.cellId, cellId),
        eq(cellMeetings.churchId, churchId),
        sql`${cellMeetings.meetingDate} = DATE(${meetingDate})`
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Cria um único encontro e sua lista completa de presença na mesma transação. */
export async function createCellMeetingWithAttendance(data: {
  cellId: number;
  churchId: number;
  meetingDate: string;
  topic?: string | null;
  notes?: string | null;
  attendance: Array<{ personId: number; status: "presente" | "ausente" }>;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const normalizedMeetingDate = new Date(`${data.meetingDate}T12:00:00.000Z`);

  return db.transaction(async (tx) => {
    const result = await tx.insert(cellMeetings).values({
      cellId: data.cellId,
      churchId: data.churchId,
      meetingDate: normalizedMeetingDate,
      topic: data.topic ?? null,
      notes: data.notes ?? null,
    });
    const meetingId = Number((result[0] as { insertId?: number } | undefined)?.insertId ?? 0);
    if (!meetingId) throw new Error("Failed to create cell meeting");

    if (data.attendance.length > 0) {
      await tx.insert(cellAttendance).values(
        data.attendance.map((entry) => ({
          meetingId,
          personId: entry.personId,
          status: entry.status,
        }))
      );
    }

    const rows = await tx.select().from(cellMeetings).where(eq(cellMeetings.id, meetingId)).limit(1);
    return rows[0] ?? null;
  });
}

export async function getActiveMembersByCell(cellId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ membership: cellMembers, person: people })
    .from(cellMembers)
    .innerJoin(cells, eq(cells.id, cellMembers.cellId))
    .innerJoin(people, eq(people.id, cellMembers.personId))
    .where(and(eq(cellMembers.cellId, cellId), eq(cellMembers.active, true), eq(cells.churchId, churchId), eq(people.churchId, churchId)))
    .orderBy(people.fullName);
}

export async function getActiveCellMembership(personId: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({
      id: cellMembers.id,
      personId: cellMembers.personId,
      cellId: cells.id,
      cellName: cells.name,
      joinedAt: cellMembers.joinedAt,
    })
    .from(cellMembers)
    .innerJoin(cells, eq(cells.id, cellMembers.cellId))
    .where(and(eq(cellMembers.personId, personId), eq(cellMembers.active, true), eq(cells.churchId, churchId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getCellMembershipHistory(personId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: cellMembers.id,
      cellId: cells.id,
      cellName: cells.name,
      joinedAt: cellMembers.joinedAt,
      leftAt: cellMembers.leftAt,
      active: cellMembers.active,
    })
    .from(cellMembers)
    .innerJoin(cells, eq(cells.id, cellMembers.cellId))
    .where(and(eq(cellMembers.personId, personId), eq(cells.churchId, churchId)))
    .orderBy(desc(cellMembers.joinedAt));
}

/** Encerra qualquer vínculo ativo antes de inserir a nova Célula da Pessoa. */
export async function assignPersonToCell(data: { churchId: number; personId: number; cellId: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const now = new Date();
  const activeMemberships = await db
    .select({ membershipId: cellMembers.id })
    .from(cellMembers)
    .innerJoin(cells, eq(cells.id, cellMembers.cellId))
    .where(
      and(
        eq(cellMembers.personId, data.personId),
        eq(cellMembers.active, true),
        eq(cells.churchId, data.churchId)
      )
    );
  for (const membership of activeMemberships) {
    await db.update(cellMembers).set({ active: false, leftAt: now }).where(eq(cellMembers.id, membership.membershipId));
  }
  const result = await db.insert(cellMembers).values({ cellId: data.cellId, personId: data.personId, active: true, joinedAt: now });
  const membershipId = (result[0] as { insertId?: number }).insertId;
  if (!membershipId) throw new Error("Failed to assign person to cell");
  const rows = await db.select().from(cellMembers).where(eq(cellMembers.id, membershipId)).limit(1);
  return rows[0] ?? null;
}

// ─── EVENTS ───────────────────────────────────────────────────────────────────

export async function getEventsByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(events)
    .where(and(eq(events.churchId, churchId), eq(events.active, true)))
    .orderBy(desc(events.startDate));
}

export async function createEvent(data: typeof events.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(events).values(data);
  return result[0];
}

// ─── MINISTRIES ───────────────────────────────────────────────────────────────

export async function getMinistriesByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(ministries)
    .where(and(eq(ministries.churchId, churchId), eq(ministries.active, true)))
    .orderBy(ministries.name);
}

export async function getMinistryMembers(ministryId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ membership: ministryMembers, person: people })
    .from(ministryMembers)
    .innerJoin(ministries, eq(ministries.id, ministryMembers.ministryId))
    .innerJoin(people, eq(people.id, ministryMembers.personId))
    .where(and(eq(ministryMembers.ministryId, ministryId), eq(ministries.churchId, churchId), eq(ministryMembers.active, true)))
    .orderBy(people.fullName);
}

export async function getMinistryMemberCounts(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ ministryId: ministryMembers.ministryId, count: sql<number>`COUNT(*)` })
    .from(ministryMembers)
    .innerJoin(ministries, eq(ministries.id, ministryMembers.ministryId))
    .where(and(eq(ministries.churchId, churchId), eq(ministryMembers.active, true)))
    .groupBy(ministryMembers.ministryId);
}

export async function isActiveMinistryMember(ministryId: number, personId: number, churchId: number) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ id: ministryMembers.id })
    .from(ministryMembers)
    .innerJoin(ministries, eq(ministries.id, ministryMembers.ministryId))
    .innerJoin(people, eq(people.id, ministryMembers.personId))
    .where(
      and(
        eq(ministryMembers.ministryId, ministryId),
        eq(ministryMembers.personId, personId),
        eq(ministryMembers.active, true),
        eq(ministries.churchId, churchId),
        eq(people.churchId, churchId)
      )
    )
    .limit(1);
  return rows.length > 0;
}

export async function assignPersonToMinistry(data: { ministryId: number; personId: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(ministryMembers).values({ ...data, active: true });
  return result[0];
}

export async function getMinistryRoleAssignmentsByPerson(personId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ assignment: ministryRoleAssignments, ministry: ministries })
    .from(ministryRoleAssignments)
    .innerJoin(ministries, eq(ministries.id, ministryRoleAssignments.ministryId))
    .where(and(
      eq(ministryRoleAssignments.churchId, churchId),
      eq(ministryRoleAssignments.personId, personId),
      eq(ministryRoleAssignments.active, true),
      eq(ministries.churchId, churchId),
      eq(ministries.active, true)
    ))
    .orderBy(ministries.name, ministryRoleAssignments.roleKey);
}

export async function getActiveMinistryRoleKeysByPerson(personId: number, churchId: number) {
  const assignments = await getMinistryRoleAssignmentsByPerson(personId, churchId);
  return Array.from(new Set(assignments.map(({ assignment }) => assignment.roleKey)));
}

export async function assignMinistryRole(data: {
  churchId: number;
  ministryId: number;
  personId: number;
  roleKey: string;
  assignedByChurchUserId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db
    .select({ id: ministryRoleAssignments.id })
    .from(ministryRoleAssignments)
    .where(and(
      eq(ministryRoleAssignments.churchId, data.churchId),
      eq(ministryRoleAssignments.ministryId, data.ministryId),
      eq(ministryRoleAssignments.personId, data.personId),
      eq(ministryRoleAssignments.roleKey, data.roleKey),
      eq(ministryRoleAssignments.active, true)
    ))
    .limit(1);
  if (existing.length) return { id: existing[0].id, alreadyAssigned: true };
  const result = await db.insert(ministryRoleAssignments).values({ ...data, active: true });
  return { id: result[0].insertId, alreadyAssigned: false };
}

export async function deactivateMinistryRole(id: number, churchId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(ministryRoleAssignments).set({ active: false, endedAt: new Date() })
    .where(and(eq(ministryRoleAssignments.id, id), eq(ministryRoleAssignments.churchId, churchId)));
}

export async function getMinistryRoleDefinitionsByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ministryRoleDefinitions).where(eq(ministryRoleDefinitions.churchId, churchId)).orderBy(ministryRoleDefinitions.name);
}

export async function createMinistryRoleDefinition(data: {
  churchId: number;
  ministryId?: number | null;
  key: string;
  name: string;
  permissionPackage: "member" | "cell_leader" | "consolidator" | "visitor" | "treasurer" | "ministry_leader" | "communication_leader";
  createdByChurchUserId?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(ministryRoleDefinitions).values({ ...data, ministryId: data.ministryId ?? null, createdByChurchUserId: data.createdByChurchUserId ?? null });
  const rows = await db.select().from(ministryRoleDefinitions).where(and(eq(ministryRoleDefinitions.churchId, data.churchId), eq(ministryRoleDefinitions.key, data.key))).limit(1);
  return rows[0] ?? null;
}

// ─── ANNOUNCEMENTS (MURAL) ────────────────────────────────────────────────────

export async function getAnnouncementsByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(announcements)
    .where(eq(announcements.churchId, churchId))
    .orderBy(desc(announcements.pinned), desc(announcements.publishedAt))
    .limit(50);
}

export async function createAnnouncement(data: typeof announcements.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(announcements).values(data);
  return result[0];
}

// ─── PRAYER REQUESTS ──────────────────────────────────────────────────────────

export async function getPrayerRequestsByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(prayerRequests)
    .where(and(eq(prayerRequests.churchId, churchId), eq(prayerRequests.isPrivate, false)))
    .orderBy(desc(prayerRequests.createdAt))
    .limit(50);
}

export async function createPrayerRequest(data: typeof prayerRequests.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(prayerRequests).values(data);
  return result[0];
}

// ─── DASHBOARD STATS ──────────────────────────────────────────────────────────

export async function getDashboardStats(churchId: number) {
  const db = await getDb();
  if (!db) return null;

  const [totalMembers] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(people)
    .where(and(eq(people.churchId, churchId), eq(people.active, true)));

  const [newSouls] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(souls)
    .where(and(eq(souls.churchId, churchId), eq(souls.status, "nova_alma")));

  const [consolidated] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(souls)
    .where(and(eq(souls.churchId, churchId), eq(souls.status, "consolidado")));

  const [baptized] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(people)
    .where(
      and(
        eq(people.churchId, churchId),
        sql`${people.baptismDate} IS NOT NULL`
      )
    );

  const [totalCells] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(cells)
    .where(and(eq(cells.churchId, churchId), eq(cells.active, true)));

  const [totalLeaders] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(churchMembers)
    .where(
      and(
        eq(churchMembers.churchId, churchId),
        eq(churchMembers.active, true),
        or(
          eq(churchMembers.role, "lider"),
          eq(churchMembers.role, "supervisor"),
          eq(churchMembers.role, "pastor_local"),
          eq(churchMembers.role, "pastor_presidente")
        ) as any
      )
    );

  const [totalMinistries] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(ministries)
    .where(and(eq(ministries.churchId, churchId), eq(ministries.active, true)));

  return {
    totalMembers: Number(totalMembers?.count ?? 0),
    newSouls: Number(newSouls?.count ?? 0),
    consolidated: Number(consolidated?.count ?? 0),
    baptized: Number(baptized?.count ?? 0),
    totalCells: Number(totalCells?.count ?? 0),
    totalLeaders: Number(totalLeaders?.count ?? 0),
    totalMinistries: Number(totalMinistries?.count ?? 0),
  };
}

// ─── RADAR ESPIRITUAL ─────────────────────────────────────────────────────────

export async function getRadarEspiritual(churchId: number) {
  const db = await getDb();
  if (!db) return null;

  // Pessoas sem célula
  const semCelula = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(people)
    .where(
      and(
        eq(people.churchId, churchId),
        eq(people.active, true),
        sql`${people.id} NOT IN (SELECT personId FROM cell_members WHERE active = true)`
      )
    );

  // Pessoas sem discipulador
  const semDiscipulador = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(people)
    .where(
      and(
        eq(people.churchId, churchId),
        eq(people.active, true),
        isNull(people.discipledById)
      )
    );

  // Pessoas sem consolidação (novas almas sem consolidador)
  const semConsolidacao = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(souls)
    .where(
      and(
        eq(souls.churchId, churchId),
        eq(souls.status, "nova_alma"),
        sql`${souls.id} NOT IN (SELECT soulId FROM consolidations)`
      )
    );

  // Pessoas sem curso
  const semCurso = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(people)
    .where(
      and(
        eq(people.churchId, churchId),
        eq(people.active, true),
        sql`${people.id} NOT IN (SELECT personId FROM course_enrollments)`
      )
    );

  return {
    semCelula: Number(semCelula[0]?.count ?? 0),
    semDiscipulador: Number(semDiscipulador[0]?.count ?? 0),
    semConsolidacao: Number(semConsolidacao[0]?.count ?? 0),
    semCurso: Number(semCurso[0]?.count ?? 0),
  };
}

// ─── DISCIPLESHIP FUNNEL ──────────────────────────────────────────────────────

export async function getDiscipleshipFunnel(churchId: number) {
  const db = await getDb();
  if (!db) return [];

  const stages = [
    "nova_alma",
    "consolidacao",
    "fundamentos",
    "celula",
    "batismo",
    "encontro_com_deus",
    "escola_de_lideres",
    "lideranca",
    "multiplicador",
  ] as const;

  const results = await Promise.all(
    stages.map(async (stage) => {
      const [row] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(people)
        .where(
          and(
            eq(people.churchId, churchId),
            eq(people.active, true),
            eq(people.discipleshipStage, stage)
          )
        );
      return { stage, count: Number(row?.count ?? 0) };
    })
  );

  return results;
}

// ─── DISCIPLESHIP TREE ────────────────────────────────────────────────────────

export async function getDiscipleshipTree(churchId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: people.id,
      fullName: people.fullName,
      photoUrl: people.photoUrl,
      discipleshipStage: people.discipleshipStage,
      wonById: people.wonById,
      discipledById: people.discipledById,
    })
    .from(people)
    .where(and(eq(people.churchId, churchId), eq(people.active, true)))
    .orderBy(people.fullName)
    .limit(200);
}

// ─── FAMILIES ─────────────────────────────────────────────────────────────────
export async function getFamiliesByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(families)
    .where(eq(families.churchId, churchId))
    .limit(200);
  return rows.map((f) => ({
    id: f.id,
    name: f.familyName,
    fatherName: null as string | null,
    motherName: null as string | null,
    childrenCount: 0,
    memberCount: 0,
    phone: null as string | null,
    address: null as string | null,
    notes: f.notes,
  }));
}

export async function createFamily(input: { churchId: number; name: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(families).values({
    churchId: input.churchId,
    familyName: input.name,
  });
  return { success: true };
}

// ─── SUPER ADMIN ──────────────────────────────────────────────────────────────

export async function getAllChurchesAdmin() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: churches.id,
      name: churches.name,
      slug: churches.slug,
      city: churches.city,
      state: churches.state,
      email: churches.email,
      phone: churches.phone,
      active: churches.active,
      createdAt: churches.createdAt,
    })
    .from(churches)
    .orderBy(churches.createdAt);
  return rows;
}

export async function getGlobalStats() {
  const db = await getDb();
  if (!db) return { totalChurches: 0, totalMembers: 0, totalCells: 0, totalSouls: 0 };
  const [churchCount] = await db.select({ count: sql<number>`count(*)` }).from(churches);
  const [memberCount] = await db.select({ count: sql<number>`count(*)` }).from(people);
  const [cellCount] = await db.select({ count: sql<number>`count(*)` }).from(cells);
  const [soulCount] = await db.select({ count: sql<number>`count(*)` }).from(souls);
  return {
    totalChurches: Number(churchCount?.count ?? 0),
    totalMembers: Number(memberCount?.count ?? 0),
    totalCells: Number(cellCount?.count ?? 0),
    totalSouls: Number(soulCount?.count ?? 0),
  };
}

// ─── VISITOR LEADS ────────────────────────────────────────────────────────────

export async function createVisitorLead(input: {
  churchId: number;
  name: string;
  phone?: string;
  email?: string;
  type: "pedido_oracao" | "visita_pastoral" | "primeira_visita" | "interesse_participar";
  message?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(visitorLeads).values({
    churchId: input.churchId,
    name: input.name,
    phone: input.phone ?? null,
    email: input.email ?? null,
    type: input.type,
    message: input.message ?? null,
  });
  return { success: true };
}

export async function getVisitorLeadsByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(visitorLeads).where(eq(visitorLeads.churchId, churchId)).orderBy(visitorLeads.createdAt);
}

// ─── CHURCH REGISTRATION ──────────────────────────────────────────────────────

export async function createChurchRegistration(churchId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(churchRegistrations).values({ churchId });
  return { success: true };
}

export async function getPendingRegistrations() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: churchRegistrations.id,
      churchId: churchRegistrations.churchId,
      status: churchRegistrations.status,
      submittedAt: churchRegistrations.submittedAt,
      churchName: churches.name,
      churchSlug: churches.slug,
      email: churches.email,
    })
    .from(churchRegistrations)
    .innerJoin(churches, eq(churches.id, churchRegistrations.churchId))
    .where(eq(churchRegistrations.status, "pending"))
    .orderBy(churchRegistrations.submittedAt);
}

export async function updateChurchRegistration(id: number, status: "approved" | "rejected" | "suspended", reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const registration = await db
    .select({ churchId: churchRegistrations.churchId })
    .from(churchRegistrations)
    .where(eq(churchRegistrations.id, id))
    .limit(1);
  if (!registration[0]) throw new Error("Cadastro de igreja não encontrado");

  await db.update(churchRegistrations).set({
    status,
    reviewedAt: new Date(),
    rejectionReason: status === "rejected" ? (reason ?? null) : null,
    suspensionReason: status === "suspended" ? (reason ?? null) : null,
  }).where(eq(churchRegistrations.id, id));
  await db
    .update(churches)
    .set({ active: status === "approved" })
    .where(eq(churches.id, registration[0].churchId));
  return { success: true };
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────

export async function getOnboardingProgress(churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(onboardingProgress)
    .where(eq(onboardingProgress.churchId, churchId)).limit(1);
  return rows[0] ?? null;
}

export async function upsertOnboardingProgress(data: {
  churchId: number;
  stepWelcome?: boolean;
  stepImportMembers?: boolean;
  stepCreateCell?: boolean;
  stepInviteLeaders?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getOnboardingProgress(data.churchId);
  const update: Record<string, unknown> = {};
  if (data.stepWelcome !== undefined) update.stepWelcome = data.stepWelcome;
  if (data.stepImportMembers !== undefined) update.stepImportMembers = data.stepImportMembers;
  if (data.stepCreateCell !== undefined) update.stepCreateCell = data.stepCreateCell;
  if (data.stepInviteLeaders !== undefined) update.stepInviteLeaders = data.stepInviteLeaders;

  if (existing) {
    // Check if all steps completed
    const merged = { ...existing, ...update };
    if (merged.stepWelcome && merged.stepImportMembers && merged.stepCreateCell && merged.stepInviteLeaders) {
      update.completedAt = new Date();
    }
    await db.update(onboardingProgress).set(update).where(eq(onboardingProgress.id, existing.id));
    return { ...existing, ...update };
  } else {
    const vals = { churchId: data.churchId, ...update };
    await db.insert(onboardingProgress).values(vals as typeof onboardingProgress.$inferInsert);
    return vals;
  }
}

export async function importPeopleFromCSV(
  churchId: number,
  rows: { fullName: string; email?: string; phone?: string; birthDate?: string }[]
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  let imported = 0;
  for (const row of rows) {
    if (!row.fullName?.trim()) continue;
    await db.insert(people).values({
      churchId,
      fullName: row.fullName.trim(),
      email: row.email?.trim() || null,
      phone: row.phone?.trim() || null,
      birthDate: row.birthDate ? new Date(row.birthDate) : null,
      status: "membro",
    } as typeof people.$inferInsert);
    imported++;
  }
  return imported;
}

// ─── ESCOLA DE FUNDAMENTOS ────────────────────────────────────────────────────

export async function getCoursesByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(courses).where(eq(courses.churchId, churchId));
}

export async function getCourseEnrollments(courseId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    enrollment: courseEnrollments,
    person: { id: people.id, fullName: people.fullName, phone: people.phone },
  })
  .from(courseEnrollments)
  .innerJoin(people, eq(courseEnrollments.personId, people.id))
  .where(and(eq(courseEnrollments.courseId, courseId), eq(people.churchId, churchId)));
}

export async function getCourseEnrollmentById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ enrollment: courseEnrollments })
    .from(courseEnrollments)
    .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
    .innerJoin(people, eq(courseEnrollments.personId, people.id))
    .where(and(eq(courseEnrollments.id, id), eq(courses.churchId, churchId), eq(people.churchId, churchId)))
    .limit(1);
  return rows[0]?.enrollment ?? null;
}

export async function enrollInCourse(data: { courseId: number; personId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(courseEnrollments).values({
    courseId: data.courseId,
    personId: data.personId,
    status: "matriculado",
  } as typeof courseEnrollments.$inferInsert);
}

export async function updateCourseEnrollment(id: number, data: { status?: string; completedAt?: Date | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const update: Record<string, unknown> = {};
  if (data.status !== undefined) update.status = data.status;
  if (data.completedAt !== undefined) update.completedAt = data.completedAt;
  await db.update(courseEnrollments).set(update).where(eq(courseEnrollments.id, id));
}

// ─── BATISMO ──────────────────────────────────────────────────────────────────

export async function getBaptismClassesByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(baptismClasses).where(eq(baptismClasses.churchId, churchId));
}

export async function getBaptismEnrollments(classId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    enrollment: baptismEnrollments,
    person: { id: people.id, fullName: people.fullName, phone: people.phone },
  })
  .from(baptismEnrollments)
  .innerJoin(people, eq(baptismEnrollments.personId, people.id))
  .where(and(eq(baptismEnrollments.baptismClassId, classId), eq(baptismEnrollments.churchId, churchId)));
}

export async function createBaptismClass(data: {
  churchId: number; name: string; date: string; location?: string; pastor?: string; notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(baptismClasses).values(data as unknown as typeof baptismClasses.$inferInsert);
}

export async function enrollInBaptism(data: { baptismClassId: number; personId: number; churchId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(baptismEnrollments).values({ ...data, status: "inscrito" } as typeof baptismEnrollments.$inferInsert);
}

export async function updateBaptismEnrollment(id: number, churchId: number, data: { status?: string; completedAt?: Date | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const update: Record<string, unknown> = {};
  if (data.status !== undefined) update.status = data.status;
  if (data.completedAt !== undefined) update.completedAt = data.completedAt;
  await db.update(baptismEnrollments).set(update).where(and(eq(baptismEnrollments.id, id), eq(baptismEnrollments.churchId, churchId)));
}

// ─── ENCONTRO COM DEUS ────────────────────────────────────────────────────────

export async function getEncounterEventsByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(encounterEvents).where(eq(encounterEvents.churchId, churchId));
}

export async function getEncounterEnrollments(eventId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    enrollment: encounterEnrollments,
    person: { id: people.id, fullName: people.fullName, phone: people.phone },
  })
  .from(encounterEnrollments)
  .innerJoin(people, eq(encounterEnrollments.personId, people.id))
  .where(and(eq(encounterEnrollments.encounterEventId, eventId), eq(encounterEnrollments.churchId, churchId)));
}

export async function createEncounterEvent(data: {
  churchId: number; name: string; date: string; endDate?: string; location?: string; maxParticipants?: number; description?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(encounterEvents).values(data as unknown as typeof encounterEvents.$inferInsert);
}

export async function enrollInEncounter(data: { encounterEventId: number; personId: number; churchId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(encounterEnrollments).values({ ...data, status: "inscrito" } as typeof encounterEnrollments.$inferInsert);
}

export async function updateEncounterEnrollment(id: number, churchId: number, data: { status?: string; completedAt?: Date | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const update: Record<string, unknown> = {};
  if (data.status !== undefined) update.status = data.status;
  if (data.completedAt !== undefined) update.completedAt = data.completedAt;
  await db.update(encounterEnrollments).set(update).where(and(eq(encounterEnrollments.id, id), eq(encounterEnrollments.churchId, churchId)));
}

// ─── ESCOLA DE LÍDERES ────────────────────────────────────────────────────────

export async function getLeadershipClassesByChurch(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leadershipSchoolClasses).where(eq(leadershipSchoolClasses.churchId, churchId));
}

export async function getLeadershipEnrollments(classId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    enrollment: leadershipSchoolEnrollments,
    person: { id: people.id, fullName: people.fullName, phone: people.phone },
  })
  .from(leadershipSchoolEnrollments)
  .innerJoin(people, eq(leadershipSchoolEnrollments.personId, people.id))
  .where(and(eq(leadershipSchoolEnrollments.classId, classId), eq(leadershipSchoolEnrollments.churchId, churchId)));
}

export async function createLeadershipClass(data: {
  churchId: number; name: string; period?: string; startDate?: string; endDate?: string; pastor?: string; description?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(leadershipSchoolClasses).values(data as unknown as typeof leadershipSchoolClasses.$inferInsert);
}

export async function enrollInLeadershipSchool(data: { classId: number; personId: number; churchId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(leadershipSchoolEnrollments).values({ ...data, status: "matriculado" } as typeof leadershipSchoolEnrollments.$inferInsert);
}

export async function updateLeadershipEnrollment(id: number, churchId: number, data: { status?: string; grade?: number; attendance?: number; completedAt?: Date | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const update: Record<string, unknown> = {};
  if (data.status !== undefined) update.status = data.status;
  if (data.grade !== undefined) update.grade = data.grade;
  if (data.attendance !== undefined) update.attendance = data.attendance;
  if (data.completedAt !== undefined) update.completedAt = data.completedAt;
  await db.update(leadershipSchoolEnrollments).set(update).where(and(eq(leadershipSchoolEnrollments.id, id), eq(leadershipSchoolEnrollments.churchId, churchId)));
}

// ─── HISTÓRICO DE LIDERANÇA ───────────────────────────────────────────────────

export async function getLeadershipHistory(churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    history: leadershipHistory,
    person: { id: people.id, fullName: people.fullName },
  })
  .from(leadershipHistory)
  .innerJoin(people, eq(leadershipHistory.personId, people.id))
  .where(eq(leadershipHistory.churchId, churchId))
  .orderBy(desc(leadershipHistory.createdAt));
}

export async function getLeadershipHistoryByPerson(personId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leadershipHistory)
    .where(and(eq(leadershipHistory.personId, personId), eq(leadershipHistory.churchId, churchId)))
    .orderBy(desc(leadershipHistory.startDate));
}

export async function addLeadershipHistory(data: {
  churchId: number; personId: number; role: string; startDate: string; endDate?: string; ministry?: string; notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(leadershipHistory).values(data as unknown as typeof leadershipHistory.$inferInsert);
}

// ─── ACONSELHAMENTO PASTORAL ──────────────────────────────────────────────────

export async function getCounselingSessionsByChurch(churchId: number, counselorId?: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    session: counselingSessions,
    person: { id: people.id, fullName: people.fullName },
  })
  .from(counselingSessions)
  .innerJoin(people, eq(counselingSessions.personId, people.id))
  .where(counselorId ? and(eq(counselingSessions.churchId, churchId), eq(counselingSessions.counselorId, counselorId)) : eq(counselingSessions.churchId, churchId))
  .orderBy(desc(counselingSessions.scheduledAt));
}

export async function getCounselingSessionById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(counselingSessions)
    .where(and(eq(counselingSessions.id, id), eq(counselingSessions.churchId, churchId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createCounselingSession(data: {
  churchId: number; personId: number; counselorId: number; scheduledAt: Date; notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(counselingSessions).values(data as typeof counselingSessions.$inferInsert);
}

export async function updateCounselingSession(id: number, churchId: number, data: { status?: string; notes?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const update: Record<string, unknown> = {};
  if (data.status !== undefined) update.status = data.status;
  if (data.notes !== undefined) update.notes = data.notes;
  await db.update(counselingSessions).set(update).where(and(eq(counselingSessions.id, id), eq(counselingSessions.churchId, churchId)));
}

export async function getCounselingNotes(sessionId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(counselingNotes)
    .where(and(eq(counselingNotes.sessionId, sessionId), eq(counselingNotes.churchId, churchId)));
}

export async function addCounselingNote(data: {
  sessionId: number; churchId: number; authorId: number; content: string; confidential?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(counselingNotes).values(data as typeof counselingNotes.$inferInsert);
}

// ─── COMUNICAÇÃO ──────────────────────────────────────────────────────────────

export async function getCommunicationLogs(churchId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(communicationLogs)
    .where(eq(communicationLogs.churchId, churchId))
    .orderBy(desc(communicationLogs.sentAt))
    .limit(limit);
}

export async function logCommunication(data: {
  churchId: number;
  type: "push" | "email" | "whatsapp" | "sms";
  category: "boas_vindas" | "aniversario" | "lembrete_evento" | "lembrete_celula" | "convite" | "aviso" | "outro";
  recipientPersonId?: number;
  recipientName?: string;
  title?: string;
  message?: string;
  status?: "enviado" | "entregue" | "falhou";
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(communicationLogs).values(data as typeof communicationLogs.$inferInsert);
}

// ─── TESOURARIA ────────────────────────────────────────────────────────────────

const DEFAULT_FINANCIAL_ACCOUNTS = [
  { name: "Caixa", type: "caixa" as const },
  { name: "Banco principal", type: "banco" as const },
];

const DEFAULT_FINANCIAL_CATEGORIES = [
  { type: "entrada" as const, key: "dizimo", name: "Dízimo" },
  { type: "entrada" as const, key: "oferta", name: "Oferta" },
  { type: "entrada" as const, key: "voto", name: "Voto" },
  { type: "entrada" as const, key: "primicias", name: "Primícias" },
  { type: "entrada" as const, key: "missoes", name: "Missões" },
  { type: "entrada" as const, key: "acao_social", name: "Ação social" },
  { type: "entrada" as const, key: "doacao", name: "Doação" },
  { type: "entrada" as const, key: "outra_entrada", name: "Outra entrada" },
  { type: "saida" as const, key: "aluguel", name: "Aluguel" },
  { type: "saida" as const, key: "agua", name: "Água" },
  { type: "saida" as const, key: "luz", name: "Luz" },
  { type: "saida" as const, key: "internet", name: "Internet" },
  { type: "saida" as const, key: "manutencao", name: "Manutenção" },
  { type: "saida" as const, key: "ministerios", name: "Ministérios" },
  { type: "saida" as const, key: "acao_social", name: "Ação social" },
  { type: "saida" as const, key: "administracao", name: "Administração" },
  { type: "saida" as const, key: "outra_saida", name: "Outra saída" },
];

function financialDate(value: string) {
  return new Date(`${value}T12:00:00.000Z`);
}

export async function ensureTreasuryDefaults(churchId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [existingAccounts, existingCategories] = await Promise.all([
    db.select({ name: financialAccounts.name }).from(financialAccounts).where(eq(financialAccounts.churchId, churchId)),
    db.select({ key: financialCategories.key, type: financialCategories.type }).from(financialCategories).where(eq(financialCategories.churchId, churchId)),
  ]);
  const accountNames = new Set(existingAccounts.map((account) => account.name));
  const categoryKeys = new Set(existingCategories.map((category) => `${category.type}:${category.key}`));
  const missingAccounts = DEFAULT_FINANCIAL_ACCOUNTS.filter((account) => !accountNames.has(account.name));
  const missingCategories = DEFAULT_FINANCIAL_CATEGORIES.filter((category) => !categoryKeys.has(`${category.type}:${category.key}`));

  if (missingAccounts.length > 0) {
    await db.insert(financialAccounts).values(missingAccounts.map((account) => ({ churchId, ...account, openingBalanceCents: 0, active: true })));
  }
  if (missingCategories.length > 0) {
    await db.insert(financialCategories).values(missingCategories.map((category) => ({ churchId, ...category, isSystem: true, active: true })));
  }
}

export async function getFinancialAccountsByChurch(churchId: number) {
  await ensureTreasuryDefaults(churchId);
  const db = await getDb();
  if (!db) return [];
  return db.select().from(financialAccounts).where(and(eq(financialAccounts.churchId, churchId), eq(financialAccounts.active, true))).orderBy(financialAccounts.name);
}

export async function getFinancialAccountById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(financialAccounts).where(and(eq(financialAccounts.id, id), eq(financialAccounts.churchId, churchId), eq(financialAccounts.active, true))).limit(1);
  return rows[0] ?? null;
}

export async function createFinancialAccount(data: { churchId: number; name: string; type: "caixa" | "banco" | "outro"; openingBalanceCents: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(financialAccounts).values({ ...data, active: true });
  const id = Number((result[0] as { insertId?: number })?.insertId ?? 0);
  const rows = await db.select().from(financialAccounts).where(eq(financialAccounts.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getFinancialCategoriesByChurch(churchId: number, type?: "entrada" | "saida") {
  await ensureTreasuryDefaults(churchId);
  const db = await getDb();
  if (!db) return [];
  const filters = [eq(financialCategories.churchId, churchId), eq(financialCategories.active, true)];
  if (type) filters.push(eq(financialCategories.type, type));
  return db.select().from(financialCategories).where(and(...filters)).orderBy(financialCategories.type, financialCategories.name);
}

export async function getFinancialCategoryById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(financialCategories).where(and(eq(financialCategories.id, id), eq(financialCategories.churchId, churchId), eq(financialCategories.active, true))).limit(1);
  return rows[0] ?? null;
}

export async function createFinancialCategory(data: { churchId: number; type: "entrada" | "saida"; key: string; name: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(financialCategories).values({ ...data, isSystem: false, active: true });
  const id = Number((result[0] as { insertId?: number })?.insertId ?? 0);
  const rows = await db.select().from(financialCategories).where(eq(financialCategories.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getFinancialTransactionById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(financialTransactions).where(and(eq(financialTransactions.id, id), eq(financialTransactions.churchId, churchId))).limit(1);
  return rows[0] ?? null;
}

export async function isFinancialPeriodClosed(churchId: number, transactionDate: string) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select().from(financialPeriodClosures)
    .where(and(eq(financialPeriodClosures.churchId, churchId), eq(financialPeriodClosures.status, "fechado"), sql`DATE(${financialPeriodClosures.periodStart}) <= DATE(${transactionDate})`, sql`DATE(${financialPeriodClosures.periodEnd}) >= DATE(${transactionDate})`))
    .limit(1);
  return rows.length > 0;
}

type FinancialTransactionFilters = {
  churchId: number;
  startDate?: string;
  endDate?: string;
  accountId?: number;
  categoryId?: number;
  type?: "entrada" | "saida";
  includeDrafts?: boolean;
};

export async function getFinancialTransactions(filters: FinancialTransactionFilters) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(financialTransactions.churchId, filters.churchId)];
  if (filters.startDate) conditions.push(sql`DATE(${financialTransactions.transactionDate}) >= DATE(${filters.startDate})`);
  if (filters.endDate) conditions.push(sql`DATE(${financialTransactions.transactionDate}) <= DATE(${filters.endDate})`);
  if (filters.accountId) conditions.push(eq(financialTransactions.accountId, filters.accountId));
  if (filters.categoryId) conditions.push(eq(financialTransactions.categoryId, filters.categoryId));
  if (filters.type) conditions.push(eq(financialTransactions.type, filters.type));
  if (!filters.includeDrafts) conditions.push(sql`${financialTransactions.status} <> 'rascunho'`);
  return db.select({ transaction: financialTransactions, account: financialAccounts, category: financialCategories })
    .from(financialTransactions)
    .innerJoin(financialAccounts, and(eq(financialAccounts.id, financialTransactions.accountId), eq(financialAccounts.churchId, filters.churchId)))
    .innerJoin(financialCategories, and(eq(financialCategories.id, financialTransactions.categoryId), eq(financialCategories.churchId, filters.churchId)))
    .where(and(...conditions))
    .orderBy(desc(financialTransactions.transactionDate), desc(financialTransactions.createdAt));
}

export async function getTreasuryOverview(data: { churchId: number; startDate: string; endDate: string; accountId?: number }) {
  const [accounts, periodRows, allRows] = await Promise.all([
    getFinancialAccountsByChurch(data.churchId),
    getFinancialTransactions({ churchId: data.churchId, startDate: data.startDate, endDate: data.endDate, accountId: data.accountId, includeDrafts: true }),
    getFinancialTransactions({ churchId: data.churchId, accountId: data.accountId }),
  ]);
  const confirmedPeriodRows = periodRows.filter((row) => row.transaction.status === "confirmado");
  const sumByType = (type: "entrada" | "saida", rows: typeof confirmedPeriodRows) => rows.filter((row) => row.transaction.type === type).reduce((total, row) => total + row.transaction.amountCents, 0);
  const entriesCents = sumByType("entrada", confirmedPeriodRows);
  const expensesCents = sumByType("saida", confirmedPeriodRows);
  const balances = accounts.map((account) => {
    const movement = allRows.filter((row) => row.transaction.status === "confirmado" && row.transaction.accountId === account.id)
      .reduce((total, row) => total + (row.transaction.type === "entrada" ? row.transaction.amountCents : -row.transaction.amountCents), 0);
    return { account, balanceCents: account.openingBalanceCents + movement };
  });
  const categoryTotals = confirmedPeriodRows.reduce<Record<string, { categoryId: number; categoryName: string; type: "entrada" | "saida"; amountCents: number }>>((groups, row) => {
    const key = `${row.transaction.type}:${row.category.id}`;
    groups[key] ??= { categoryId: row.category.id, categoryName: row.category.name, type: row.transaction.type, amountCents: 0 };
    groups[key].amountCents += row.transaction.amountCents;
    return groups;
  }, {});
  return {
    accounts,
    transactions: periodRows,
    entriesCents,
    expensesCents,
    resultCents: entriesCents - expensesCents,
    balanceCents: balances.reduce((total, item) => total + item.balanceCents, 0),
    accountBalances: balances,
    categories: Object.values(categoryTotals).sort((a, b) => b.amountCents - a.amountCents),
  };
}

async function writeFinancialAuditLog(data: {
  churchId: number;
  transactionId?: number;
  actorChurchUserId: number;
  action: "criado" | "atualizado" | "confirmado" | "estornado" | "periodo_fechado" | "periodo_reaberto";
  beforeData?: unknown;
  afterData?: unknown;
  note?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(financialAuditLogs).values(data);
}

export async function createFinancialTransaction(data: {
  churchId: number; accountId: number; categoryId: number; type: "entrada" | "saida"; amountCents: number; transactionDate: string;
  paymentMethod: "dinheiro" | "pix" | "transferencia" | "cartao" | "cheque" | "outro"; contributorPersonId?: number; contributorName?: string; description?: string; reference?: string; status: "rascunho" | "confirmado"; actorChurchUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.transaction(async (tx) => {
    const now = new Date();
    const insert = await tx.insert(financialTransactions).values({
      churchId: data.churchId, accountId: data.accountId, categoryId: data.categoryId, type: data.type, amountCents: data.amountCents,
      transactionDate: financialDate(data.transactionDate), paymentMethod: data.paymentMethod, contributorPersonId: data.contributorPersonId ?? null, contributorName: data.contributorName ?? null, description: data.description ?? null, reference: data.reference ?? null,
      status: data.status, createdByChurchUserId: data.actorChurchUserId,
      confirmedByChurchUserId: data.status === "confirmado" ? data.actorChurchUserId : null,
      confirmedAt: data.status === "confirmado" ? now : null,
    });
    const id = Number((insert[0] as { insertId?: number })?.insertId ?? 0);
    const rows = await tx.select().from(financialTransactions).where(eq(financialTransactions.id, id)).limit(1);
    const transaction = rows[0];
    if (!transaction) throw new Error("Falha ao criar lançamento financeiro");
    await tx.insert(financialAuditLogs).values({ churchId: data.churchId, transactionId: id, actorChurchUserId: data.actorChurchUserId, action: data.status === "confirmado" ? "confirmado" : "criado", afterData: transaction });
    return transaction;
  });
  return result;
}

export async function updateFinancialDraft(data: {
  id: number; churchId: number; accountId: number; categoryId: number; type: "entrada" | "saida"; amountCents: number; transactionDate: string;
  paymentMethod: "dinheiro" | "pix" | "transferencia" | "cartao" | "cheque" | "outro"; contributorPersonId?: number; contributorName?: string; description?: string; reference?: string; actorChurchUserId: number;
}) {
  const previous = await getFinancialTransactionById(data.id, data.churchId);
  if (!previous) return null;
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(financialTransactions).set({ accountId: data.accountId, categoryId: data.categoryId, type: data.type, amountCents: data.amountCents, transactionDate: financialDate(data.transactionDate), paymentMethod: data.paymentMethod, contributorPersonId: data.contributorPersonId ?? null, contributorName: data.contributorName ?? null, description: data.description ?? null, reference: data.reference ?? null })
    .where(and(eq(financialTransactions.id, data.id), eq(financialTransactions.churchId, data.churchId), eq(financialTransactions.status, "rascunho")));
  const updated = await getFinancialTransactionById(data.id, data.churchId);
  if (!updated) return null;
  await writeFinancialAuditLog({ churchId: data.churchId, transactionId: data.id, actorChurchUserId: data.actorChurchUserId, action: "atualizado", beforeData: previous, afterData: updated });
  return updated;
}

export async function confirmFinancialTransaction(data: { id: number; churchId: number; actorChurchUserId: number }) {
  const previous = await getFinancialTransactionById(data.id, data.churchId);
  if (!previous) return null;
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(financialTransactions).set({ status: "confirmado", confirmedByChurchUserId: data.actorChurchUserId, confirmedAt: new Date() })
    .where(and(eq(financialTransactions.id, data.id), eq(financialTransactions.churchId, data.churchId), eq(financialTransactions.status, "rascunho")));
  const updated = await getFinancialTransactionById(data.id, data.churchId);
  if (!updated || updated.status !== "confirmado") return null;
  await writeFinancialAuditLog({ churchId: data.churchId, transactionId: data.id, actorChurchUserId: data.actorChurchUserId, action: "confirmado", beforeData: previous, afterData: updated });
  return updated;
}

export async function reverseFinancialTransaction(data: { id: number; churchId: number; actorChurchUserId: number; reason: string }) {
  const previous = await getFinancialTransactionById(data.id, data.churchId);
  if (!previous || previous.status !== "confirmado") return null;
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(financialTransactions).set({ status: "estornado", reversedByChurchUserId: data.actorChurchUserId, reversedAt: new Date(), reversalReason: data.reason })
    .where(and(eq(financialTransactions.id, data.id), eq(financialTransactions.churchId, data.churchId), eq(financialTransactions.status, "confirmado")));
  const updated = await getFinancialTransactionById(data.id, data.churchId);
  if (!updated || updated.status !== "estornado") return null;
  await writeFinancialAuditLog({ churchId: data.churchId, transactionId: data.id, actorChurchUserId: data.actorChurchUserId, action: "estornado", beforeData: previous, afterData: updated, note: data.reason });
  return updated;
}

export async function getFinancialPeriodClosure(churchId: number, periodStart: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(financialPeriodClosures).where(and(eq(financialPeriodClosures.churchId, churchId), sql`DATE(${financialPeriodClosures.periodStart}) = DATE(${periodStart})`)).limit(1);
  return rows[0] ?? null;
}

export async function getFinancialReceiptData(transactionId: number, churchId: number) {
  const transaction = await getFinancialTransactionById(transactionId, churchId);
  if (!transaction) return null;
  const [account, category, contributor] = await Promise.all([
    getFinancialAccountById(transaction.accountId, churchId),
    getFinancialCategoryById(transaction.categoryId, churchId),
    transaction.contributorPersonId ? getPersonById(transaction.contributorPersonId, churchId) : Promise.resolve(null),
  ]);
  if (!account || !category) return null;
  return { transaction, account, category, contributor };
}

export async function getFinancialReconciliation(data: { churchId: number; accountId: number; periodStart: string }) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(financialReconciliations)
    .where(and(eq(financialReconciliations.churchId, data.churchId), eq(financialReconciliations.accountId, data.accountId), sql`DATE(${financialReconciliations.periodStart}) = DATE(${data.periodStart})`))
    .limit(1);
  return rows[0] ?? null;
}

export async function getFinancialReconciliationById(id: number, churchId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(financialReconciliations)
    .where(and(eq(financialReconciliations.id, id), eq(financialReconciliations.churchId, churchId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getFinancialReconciliationAttachments(reconciliationId: number, churchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(financialReconciliationAttachments)
    .where(and(eq(financialReconciliationAttachments.reconciliationId, reconciliationId), eq(financialReconciliationAttachments.churchId, churchId)))
    .orderBy(desc(financialReconciliationAttachments.createdAt));
}

export async function createFinancialReconciliationAttachment(data: {
  churchId: number; reconciliationId: number; fileKey: string; url: string; fileName: string; mimeType: string; sizeBytes: number; uploadedByChurchUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(financialReconciliationAttachments).values(data);
  const id = Number((result[0] as { insertId?: number })?.insertId ?? 0);
  const rows = await db.select().from(financialReconciliationAttachments)
    .where(and(eq(financialReconciliationAttachments.id, id), eq(financialReconciliationAttachments.churchId, data.churchId)))
    .limit(1);
  if (!rows[0]) throw new Error("Falha ao registrar comprovante bancário");
  return rows[0];
}

export async function getBookBalanceAt(data: { churchId: number; accountId: number; endDate: string }) {
  const account = await getFinancialAccountById(data.accountId, data.churchId);
  if (!account) return null;
  const rows = await getFinancialTransactions({ churchId: data.churchId, accountId: data.accountId, endDate: data.endDate });
  const movement = rows.filter((row) => row.transaction.status === "confirmado")
    .reduce((total, row) => total + (row.transaction.type === "entrada" ? row.transaction.amountCents : -row.transaction.amountCents), 0);
  return account.openingBalanceCents + movement;
}

export async function saveFinancialReconciliation(data: {
  churchId: number; accountId: number; periodStart: string; periodEnd: string; bankClosingBalanceCents: number;
  bookBalanceCents: number; differenceCents: number; status: "em_andamento" | "conciliada" | "com_divergencia"; notes?: string; actorChurchUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getFinancialReconciliation(data);
  if (existing) {
    await db.update(financialReconciliations).set({
      periodEnd: financialDate(data.periodEnd), bankClosingBalanceCents: data.bankClosingBalanceCents, bookBalanceCents: data.bookBalanceCents,
      differenceCents: data.differenceCents, status: data.status, notes: data.notes ?? null, reconciledByChurchUserId: data.actorChurchUserId, reconciledAt: new Date(),
    }).where(and(eq(financialReconciliations.id, existing.id), eq(financialReconciliations.churchId, data.churchId)));
  } else {
    await db.insert(financialReconciliations).values({
      churchId: data.churchId, accountId: data.accountId, periodStart: financialDate(data.periodStart), periodEnd: financialDate(data.periodEnd),
      bankClosingBalanceCents: data.bankClosingBalanceCents, bookBalanceCents: data.bookBalanceCents, differenceCents: data.differenceCents,
      status: data.status, notes: data.notes ?? null, reconciledByChurchUserId: data.actorChurchUserId,
    });
  }
  return getFinancialReconciliation(data);
}

export async function closeFinancialPeriod(data: { churchId: number; periodStart: string; periodEnd: string; actorChurchUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getFinancialPeriodClosure(data.churchId, data.periodStart);
  if (existing) {
    await db.update(financialPeriodClosures).set({
      periodEnd: financialDate(data.periodEnd),
      status: "fechado",
      closedByChurchUserId: data.actorChurchUserId,
      closedAt: new Date(),
    }).where(and(eq(financialPeriodClosures.id, existing.id), eq(financialPeriodClosures.churchId, data.churchId), eq(financialPeriodClosures.status, "reaberto")));
    const closedAgain = await getFinancialPeriodClosure(data.churchId, data.periodStart);
    if (!closedAgain || closedAgain.status !== "fechado") return null;
    await writeFinancialAuditLog({ churchId: data.churchId, actorChurchUserId: data.actorChurchUserId, action: "periodo_fechado", beforeData: existing, afterData: closedAgain, note: "Período fechado novamente após reabertura." });
    return closedAgain;
  }
  const result = await db.insert(financialPeriodClosures).values({ churchId: data.churchId, periodStart: financialDate(data.periodStart), periodEnd: financialDate(data.periodEnd), status: "fechado", closedByChurchUserId: data.actorChurchUserId });
  const id = Number((result[0] as { insertId?: number })?.insertId ?? 0);
  await writeFinancialAuditLog({ churchId: data.churchId, actorChurchUserId: data.actorChurchUserId, action: "periodo_fechado", afterData: { periodStart: data.periodStart, periodEnd: data.periodEnd } });
  const rows = await db.select().from(financialPeriodClosures).where(eq(financialPeriodClosures.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function reopenFinancialPeriod(data: { churchId: number; periodStart: string; actorChurchUserId: number; reason: string }) {
  const closure = await getFinancialPeriodClosure(data.churchId, data.periodStart);
  if (!closure) return null;
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(financialPeriodClosures).set({ status: "reaberto", reopenedByChurchUserId: data.actorChurchUserId, reopenedAt: new Date(), reopeningReason: data.reason }).where(and(eq(financialPeriodClosures.id, closure.id), eq(financialPeriodClosures.churchId, data.churchId), eq(financialPeriodClosures.status, "fechado")));
  const updated = await getFinancialPeriodClosure(data.churchId, data.periodStart);
  if (!updated) return null;
  await writeFinancialAuditLog({ churchId: data.churchId, actorChurchUserId: data.actorChurchUserId, action: "periodo_reaberto", beforeData: closure, afterData: updated, note: data.reason });
  return updated;
}
