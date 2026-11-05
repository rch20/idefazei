// Presença no culto — lógica de dados.
// Reaproveita a ocorrência de culto já existente (treasury_services) e adiciona a
// presença nominal (service_attendance) + a sessão de marcação (visitantes/fechamento).
// A autorização é feita no router (acesso de cuidado/liderança), não aqui.

import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { getDb, createTreasuryService } from "./db";
import {
  serviceAttendance,
  serviceAttendanceSessions,
  treasuryServices,
  people,
  cells,
  cellMembers,
  ministries,
  ministryMembers,
} from "../drizzle/schema";

function toDateString(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string") return value.slice(0, 10);
  return "";
}

export type PresenceServiceRow = {
  id: number;
  name: string;
  serviceDate: string;
  startTime: string | null;
  serviceStatus: "aberto" | "fechado" | "cancelado";
  sessionStatus: "aberta" | "fechada" | null;
  presentCount: number;
  justifiedCount: number;
  visitorsCount: number;
};

/** Lista as ocorrências de culto recentes para a tela de presença (exclui canceladas). */
export async function listPresenceServices(churchId: number, limit = 24): Promise<PresenceServiceRow[]> {
  const db = await getDb();
  if (!db) return [];
  const services = await db
    .select()
    .from(treasuryServices)
    .where(and(eq(treasuryServices.churchId, churchId), ne(treasuryServices.status, "cancelado")))
    .orderBy(desc(treasuryServices.serviceDate), desc(treasuryServices.id))
    .limit(limit);
  if (!services.length) return [];
  const ids = services.map((s) => s.id);

  const attendance = await db
    .select({ serviceId: serviceAttendance.serviceId, status: serviceAttendance.status })
    .from(serviceAttendance)
    .where(and(eq(serviceAttendance.churchId, churchId), inArray(serviceAttendance.serviceId, ids)));
  const presentByService = new Map<number, number>();
  const justifiedByService = new Map<number, number>();
  for (const row of attendance) {
    if (row.status === "justificado") justifiedByService.set(row.serviceId, (justifiedByService.get(row.serviceId) ?? 0) + 1);
    else presentByService.set(row.serviceId, (presentByService.get(row.serviceId) ?? 0) + 1);
  }

  const sessions = await db
    .select()
    .from(serviceAttendanceSessions)
    .where(and(eq(serviceAttendanceSessions.churchId, churchId), inArray(serviceAttendanceSessions.serviceId, ids)));
  const sessionByService = new Map(sessions.map((s) => [s.serviceId, s]));

  return services.map((s) => {
    const session = sessionByService.get(s.id) ?? null;
    return {
      id: s.id,
      name: s.name,
      serviceDate: toDateString(s.serviceDate),
      startTime: s.startTime ?? null,
      serviceStatus: s.status,
      sessionStatus: session ? session.status : null,
      presentCount: presentByService.get(s.id) ?? 0,
      justifiedCount: justifiedByService.get(s.id) ?? 0,
      visitorsCount: session?.visitorsCount ?? 0,
    };
  });
}

/** Cria uma ocorrência de culto avulsa (reaproveita a tesouraria) e abre a sessão de presença. */
export async function createPresenceService(
  churchId: number,
  data: { name: string; serviceDate: string; startTime?: string | null },
  actorChurchUserId: number
) {
  const service = await createTreasuryService({
    churchId,
    name: data.name,
    serviceDate: data.serviceDate,
    startTime: data.startTime ?? null,
    createdByChurchUserId: actorChurchUserId,
  });
  if (!service) throw new Error("Falha ao criar o culto");
  await ensureSession(churchId, service.id, actorChurchUserId);
  return { id: service.id, name: service.name, serviceDate: toDateString(service.serviceDate), startTime: service.startTime ?? null };
}

async function getService(churchId: number, serviceId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(treasuryServices)
    .where(and(eq(treasuryServices.id, serviceId), eq(treasuryServices.churchId, churchId)))
    .limit(1);
  return rows[0] ?? null;
}

/** Garante que exista a sessão de presença do culto (idempotente). */
export async function ensureSession(churchId: number, serviceId: number, actorChurchUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");
  const existing = await db
    .select()
    .from(serviceAttendanceSessions)
    .where(and(eq(serviceAttendanceSessions.churchId, churchId), eq(serviceAttendanceSessions.serviceId, serviceId)))
    .limit(1);
  if (existing[0]) return existing[0];
  try {
    await db.insert(serviceAttendanceSessions).values({ churchId, serviceId, openedByChurchUserId: actorChurchUserId });
  } catch {
    // corrida: outra marcação criou a sessão ao mesmo tempo — segue com a existente.
  }
  const rows = await db
    .select()
    .from(serviceAttendanceSessions)
    .where(and(eq(serviceAttendanceSessions.churchId, churchId), eq(serviceAttendanceSessions.serviceId, serviceId)))
    .limit(1);
  return rows[0] ?? null;
}

export type RosterPerson = {
  personId: number;
  fullName: string;
  photoUrl: string | null;
  gender: string | null;
  stage: string | null;
  neighborhood: string | null;
  cellIds: number[];
  ministryIds: number[];
  present: boolean;
  status: "presente" | "justificado" | null;
  source: "manual" | "facial" | null;
};

export type PresenceRoster = {
  service: { id: number; name: string; serviceDate: string; startTime: string | null; serviceStatus: string };
  session: { visitorsCount: number; status: "aberta" | "fechada" };
  people: RosterPerson[];
  cells: Array<{ id: number; name: string }>;
  ministries: Array<{ id: number; name: string }>;
  presentCount: number;
  justifiedCount: number;
};

/** Monta a lista de marcação: todos os membros ativos + status atual + filtros. */
export async function getPresenceRoster(churchId: number, serviceId: number, actorChurchUserId: number): Promise<PresenceRoster | null> {
  const db = await getDb();
  if (!db) return null;
  const service = await getService(churchId, serviceId);
  if (!service) return null;
  const session = await ensureSession(churchId, serviceId, actorChurchUserId);

  const [members, cellRows, ministryRows, cellMemberRows, ministryMemberRows, attendanceRows] = await Promise.all([
    db
      .select({
        id: people.id,
        fullName: people.fullName,
        photoUrl: people.photoUrl,
        gender: people.gender,
        stage: people.discipleshipStage,
        neighborhood: people.neighborhood,
      })
      .from(people)
      .where(and(eq(people.churchId, churchId), eq(people.active, true)))
      .orderBy(people.fullName),
    db.select({ id: cells.id, name: cells.name }).from(cells).where(eq(cells.churchId, churchId)),
    db.select({ id: ministries.id, name: ministries.name }).from(ministries).where(eq(ministries.churchId, churchId)),
    db.select({ cellId: cellMembers.cellId, personId: cellMembers.personId }).from(cellMembers).innerJoin(cells, eq(cellMembers.cellId, cells.id)).where(eq(cells.churchId, churchId)),
    db.select({ ministryId: ministryMembers.ministryId, personId: ministryMembers.personId }).from(ministryMembers).innerJoin(ministries, eq(ministryMembers.ministryId, ministries.id)).where(eq(ministries.churchId, churchId)),
    db.select({ personId: serviceAttendance.personId, status: serviceAttendance.status, source: serviceAttendance.source }).from(serviceAttendance).where(and(eq(serviceAttendance.churchId, churchId), eq(serviceAttendance.serviceId, serviceId))),
  ]);

  const cellsByPerson = new Map<number, number[]>();
  for (const row of cellMemberRows) {
    const list = cellsByPerson.get(row.personId) ?? [];
    list.push(row.cellId);
    cellsByPerson.set(row.personId, list);
  }
  const ministriesByPerson = new Map<number, number[]>();
  for (const row of ministryMemberRows) {
    const list = ministriesByPerson.get(row.personId) ?? [];
    list.push(row.ministryId);
    ministriesByPerson.set(row.personId, list);
  }
  const attendanceByPerson = new Map(attendanceRows.map((r) => [r.personId, r]));

  let presentCount = 0;
  let justifiedCount = 0;
  const peopleList: RosterPerson[] = members.map((m) => {
    const att = attendanceByPerson.get(m.id) ?? null;
    if (att) {
      if (att.status === "justificado") justifiedCount += 1;
      else presentCount += 1;
    }
    return {
      personId: m.id,
      fullName: m.fullName,
      photoUrl: m.photoUrl ?? null,
      gender: m.gender ?? null,
      stage: m.stage ?? null,
      neighborhood: m.neighborhood ?? null,
      cellIds: cellsByPerson.get(m.id) ?? [],
      ministryIds: ministriesByPerson.get(m.id) ?? [],
      present: Boolean(att),
      status: att ? att.status : null,
      source: att ? att.source : null,
    };
  });

  return {
    service: { id: service.id, name: service.name, serviceDate: toDateString(service.serviceDate), startTime: service.startTime ?? null, serviceStatus: service.status },
    session: { visitorsCount: session?.visitorsCount ?? 0, status: session?.status ?? "aberta" },
    people: peopleList,
    cells: cellRows.sort((a, b) => a.name.localeCompare(b.name)),
    ministries: ministryRows.sort((a, b) => a.name.localeCompare(b.name)),
    presentCount,
    justifiedCount,
  };
}

/** Marca/atualiza/remove a presença de uma pessoa. present=false remove a linha (ausência implícita). */
export async function setPersonPresence(
  churchId: number,
  serviceId: number,
  personId: number,
  opts: { present: boolean; status?: "presente" | "justificado"; source?: "manual" | "facial" },
  actorChurchUserId: number
) {
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");
  const service = await getService(churchId, serviceId);
  if (!service) throw new Error("Culto não encontrado");
  if (service.status === "cancelado") throw new Error("Culto cancelado");
  await ensureSession(churchId, serviceId, actorChurchUserId);

  if (!opts.present) {
    await db.delete(serviceAttendance).where(and(eq(serviceAttendance.churchId, churchId), eq(serviceAttendance.serviceId, serviceId), eq(serviceAttendance.personId, personId)));
    return { present: false as const };
  }

  const status = opts.status ?? "presente";
  const source = opts.source ?? "manual";
  const existing = await db
    .select({ id: serviceAttendance.id })
    .from(serviceAttendance)
    .where(and(eq(serviceAttendance.churchId, churchId), eq(serviceAttendance.serviceId, serviceId), eq(serviceAttendance.personId, personId)))
    .limit(1);
  if (existing[0]) {
    await db.update(serviceAttendance).set({ status, source, markedByChurchUserId: actorChurchUserId }).where(eq(serviceAttendance.id, existing[0].id));
  } else {
    try {
      await db.insert(serviceAttendance).values({ churchId, serviceId, personId, status, source, markedByChurchUserId: actorChurchUserId });
    } catch {
      // corrida com outra marcação simultânea do mesmo culto/pessoa — já está presente.
    }
  }
  return { present: true as const, status, source };
}

/** Ajusta a contagem de visitantes do culto. */
export async function setVisitorsCount(churchId: number, serviceId: number, count: number, actorChurchUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");
  const safe = Math.max(0, Math.min(100000, Math.trunc(count)));
  await ensureSession(churchId, serviceId, actorChurchUserId);
  await db
    .update(serviceAttendanceSessions)
    .set({ visitorsCount: safe })
    .where(and(eq(serviceAttendanceSessions.churchId, churchId), eq(serviceAttendanceSessions.serviceId, serviceId)));
  return { visitorsCount: safe };
}

/** Abre/fecha a sessão de presença do culto. */
export async function setSessionStatus(churchId: number, serviceId: number, status: "aberta" | "fechada", actorChurchUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");
  await ensureSession(churchId, serviceId, actorChurchUserId);
  await db
    .update(serviceAttendanceSessions)
    .set({
      status,
      closedByChurchUserId: status === "fechada" ? actorChurchUserId : null,
      closedAt: status === "fechada" ? new Date() : null,
    })
    .where(and(eq(serviceAttendanceSessions.churchId, churchId), eq(serviceAttendanceSessions.serviceId, serviceId)));
  return { status };
}

export type ServiceReport = {
  service: { id: number; name: string; serviceDate: string; startTime: string | null };
  presentCount: number;
  justifiedCount: number;
  absentCount: number;
  visitorsCount: number;
  totalMembers: number;
  absent: Array<{ personId: number; fullName: string }>;
};

/** Relatório de um culto: presentes, justificados, ausentes (membros sem linha) e visitantes. */
export async function getServiceReport(churchId: number, serviceId: number): Promise<ServiceReport | null> {
  const db = await getDb();
  if (!db) return null;
  const service = await getService(churchId, serviceId);
  if (!service) return null;

  const [members, attendanceRows, sessionRows] = await Promise.all([
    db.select({ id: people.id, fullName: people.fullName }).from(people).where(and(eq(people.churchId, churchId), eq(people.active, true))).orderBy(people.fullName),
    db.select({ personId: serviceAttendance.personId, status: serviceAttendance.status }).from(serviceAttendance).where(and(eq(serviceAttendance.churchId, churchId), eq(serviceAttendance.serviceId, serviceId))),
    db.select().from(serviceAttendanceSessions).where(and(eq(serviceAttendanceSessions.churchId, churchId), eq(serviceAttendanceSessions.serviceId, serviceId))).limit(1),
  ]);

  const statusByPerson = new Map(attendanceRows.map((r) => [r.personId, r.status]));
  let presentCount = 0;
  let justifiedCount = 0;
  const absent: Array<{ personId: number; fullName: string }> = [];
  for (const m of members) {
    const status = statusByPerson.get(m.id);
    if (status === "justificado") justifiedCount += 1;
    else if (status === "presente") presentCount += 1;
    else absent.push({ personId: m.id, fullName: m.fullName });
  }

  return {
    service: { id: service.id, name: service.name, serviceDate: toDateString(service.serviceDate), startTime: service.startTime ?? null },
    presentCount,
    justifiedCount,
    absentCount: absent.length,
    visitorsCount: sessionRows[0]?.visitorsCount ?? 0,
    totalMembers: members.length,
    absent,
  };
}
