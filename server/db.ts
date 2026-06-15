import { and, count, desc, eq, isNull, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  announcements,
  cellAttendance,
  cellMeetings,
  cellMembers,
  cells,
  churchMembers,
  churchRegistrations,
  churches,
  consolidations,
  courseEnrollments,
  courses,
  eventRegistrations,
  events,
  families,
  familyMembers,
  InsertUser,
  libraryItems,
  ministries,
  ministryMembers,
  people,
  prayerRequests,
  scheduleItems,
  souls,
  users,
  visitorLeads,
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

export async function createPerson(data: typeof people.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(people).values(data);
  return result[0];
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

export async function createSoul(data: typeof souls.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(souls).values(data);
  return result[0];
}

export async function updateSoul(id: number, churchId: number, data: Partial<typeof souls.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(souls).set(data).where(and(eq(souls.id, id), eq(souls.churchId, churchId)));
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
  await db.update(churchRegistrations).set({
    status,
    reviewedAt: new Date(),
    rejectionReason: status === "rejected" ? (reason ?? null) : null,
    suspensionReason: status === "suspended" ? (reason ?? null) : null,
  }).where(eq(churchRegistrations.id, id));
  return { success: true };
}
