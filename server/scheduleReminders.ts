import type { Request, Response } from "express";
import { timingSafeEqual } from "crypto";
import { and, eq, gte, isNotNull, lt, lte } from "drizzle-orm";
import { ministries, scheduleItems, churchUsers, careVisits } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { emitInternalNotification } from "./notifications";

const REMINDER_HOURS = [24, 2] as const;
const DEFAULT_SCHEDULE_TIMEZONE_OFFSET = "-03:00";
/** Quanto tempo depois do horário marcado uma Visita ainda "agendada" é considerada atrasada. */
const CARE_VISIT_OVERDUE_GRACE_MS = 3 * 60 * 60 * 1000;
/** Até quando no passado olhamos Visitas atrasadas (evita reprocessar registros muito antigos). */
const CARE_VISIT_OVERDUE_LOOKBACK_DAYS = 7;

export function getScheduleReminderStage(startAt: Date, now: Date): 24 | 2 | null {
  const hoursUntilStart = (startAt.getTime() - now.getTime()) / (60 * 60 * 1000);
  if (hoursUntilStart <= 0) return null;
  return REMINDER_HOURS.find((hours) => Math.abs(hoursUntilStart - hours) < 1) ?? null;
}

export function getScheduleDateKey(value: Date | string) {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

/** Uma Visita "agendada" cujo horário já passou da folga de tolerância, sem ter sido iniciada/concluída. */
export function isCareVisitOverdue(scheduledAt: Date, now: Date) {
  return now.getTime() - scheduledAt.getTime() > CARE_VISIT_OVERDUE_GRACE_MS;
}

export function isValidInternalJobToken(receivedToken: string | undefined, configuredToken = ENV.internalJobsToken) {
  if (!receivedToken || !configuredToken) return false;
  const received = Buffer.from(receivedToken);
  const configured = Buffer.from(configuredToken);
  return received.length === configured.length && timingSafeEqual(received, configured);
}

function getScheduleStartAt(scheduledDate: Date | string, startTime: string) {
  const day = getScheduleDateKey(scheduledDate);
  return new Date(`${day}T${startTime}:00${DEFAULT_SCHEDULE_TIMEZONE_OFFSET}`);
}

export async function scheduleRemindersHandler(req: Request, res: Response) {
  try {
    const configuredToken = ENV.internalJobsToken;
    if (!configuredToken) return res.status(503).json({ error: "internal-jobs-token-not-configured" });
    const providedToken = req.header("x-internal-jobs-token") ?? undefined;
    if (!isValidInternalJobToken(providedToken, configuredToken)) return res.status(403).json({ error: "forbidden" });

    const db = await getDb();
    if (!db) return res.status(500).json({ error: "database unavailable" });

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 1);
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 2);

    const overdueLookback = new Date(now.getTime() - CARE_VISIT_OVERDUE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const overdueCutoff = new Date(now.getTime() - CARE_VISIT_OVERDUE_GRACE_MS);
    const upcomingVisitCutoff = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const [items, accounts, ministryRows, upcomingVisits, overdueVisits] = await Promise.all([
      db.select().from(scheduleItems).where(and(eq(scheduleItems.status, "agendada"), isNotNull(scheduleItems.startTime), isNotNull(scheduleItems.endTime), gte(scheduleItems.scheduledDate, startDate), lte(scheduleItems.scheduledDate, endDate))),
      db.select({ id: churchUsers.id, churchId: churchUsers.churchId, personId: churchUsers.personId }).from(churchUsers).where(eq(churchUsers.active, true)),
      db.select({ id: ministries.id, churchId: ministries.churchId, name: ministries.name }).from(ministries),
      db.select().from(careVisits).where(and(eq(careVisits.status, "agendada"), isNotNull(careVisits.scheduledAt), isNotNull(careVisits.assignedToPersonId), gte(careVisits.scheduledAt, now), lte(careVisits.scheduledAt, upcomingVisitCutoff))),
      db.select().from(careVisits).where(and(eq(careVisits.status, "agendada"), isNotNull(careVisits.scheduledAt), isNotNull(careVisits.assignedToPersonId), gte(careVisits.scheduledAt, overdueLookback), lt(careVisits.scheduledAt, overdueCutoff))),
    ]);

    const recipientsByPerson = new Map<string, number[]>();
    for (const account of accounts) {
      if (!account.personId) continue;
      const key = `${account.churchId}:${account.personId}`;
      recipientsByPerson.set(key, [...(recipientsByPerson.get(key) ?? []), account.id]);
    }
    const ministryNameById = new Map(ministryRows.map((ministry) => [`${ministry.churchId}:${ministry.id}`, ministry.name]));

    let remindersCreated = 0;
    let deliveries = 0;
    for (const item of items) {
      if (!item.startTime || !item.endTime) continue;
      const startAt = getScheduleStartAt(item.scheduledDate, item.startTime);
      const stage = getScheduleReminderStage(startAt, now);
      if (!stage) continue;
      const recipients = recipientsByPerson.get(`${item.churchId}:${item.personId}`) ?? [];
      const ministryName = ministryNameById.get(`${item.churchId}:${item.ministryId}`) ?? "seu Ministério";
      const result = await emitInternalNotification({
        churchId: item.churchId,
        type: "lembrete_escala",
        recipientChurchUserIds: recipients,
        title: stage === 24 ? "Sua escala é amanhã" : "Sua escala começa em breve",
        body: `${ministryName}${item.role ? ` · ${item.role}` : ""}: ${item.startTime}–${item.endTime} em ${getScheduleDateKey(item.scheduledDate)}. ${stage === 24 ? "Prepare-se para servir." : "Organize-se para chegar no horário."}`,
        entityType: "schedule_item",
        entityId: item.id,
        metadata: { reminderHours: stage, scheduledDate: getScheduleDateKey(item.scheduledDate), startTime: item.startTime, endTime: item.endTime, ministryId: item.ministryId },
        dedupeKey: `lembrete-escala-${item.id}-${stage}h`,
        push: true,
        url: `/app/escalas?ministerio=${item.ministryId}`,
      });
      if (result.created) {
        remindersCreated += 1;
        deliveries += result.deliveries;
      }
    }

    for (const visit of upcomingVisits) {
      if (!visit.scheduledAt || !visit.assignedToPersonId) continue;
      const stage = getScheduleReminderStage(visit.scheduledAt, now);
      if (!stage) continue;
      const recipients = recipientsByPerson.get(`${visit.churchId}:${visit.assignedToPersonId}`) ?? [];
      const result = await emitInternalNotification({
        churchId: visit.churchId,
        type: "lembrete_visita",
        recipientChurchUserIds: recipients,
        title: stage === 24 ? "Sua visita é amanhã" : "Sua visita começa em breve",
        body: `${visit.reason}${visit.address ? ` · ${visit.address}` : ""}. ${stage === 24 ? "Prepare-se para a visita." : "Organize-se para chegar no horário."}`,
        entityType: "care_visit",
        entityId: visit.id,
        metadata: { reminderHours: stage, scheduledAt: visit.scheduledAt.toISOString(), referralId: visit.referralId },
        dedupeKey: `lembrete-visita-${visit.id}-${stage}h`,
        push: true,
        url: "/app/cuidado",
      });
      if (result.created) {
        remindersCreated += 1;
        deliveries += result.deliveries;
      }
    }

    for (const visit of overdueVisits) {
      if (!visit.scheduledAt || !visit.assignedToPersonId) continue;
      const recipients = recipientsByPerson.get(`${visit.churchId}:${visit.assignedToPersonId}`) ?? [];
      const result = await emitInternalNotification({
        churchId: visit.churchId,
        type: "visita_nao_realizada",
        recipientChurchUserIds: recipients,
        title: "Visita não registrada",
        body: `${visit.reason}, marcada para ${visit.scheduledAt.toISOString().slice(0, 16).replace("T", " ")}, ainda não foi marcada como realizada ou cancelada.`,
        entityType: "care_visit",
        entityId: visit.id,
        metadata: { scheduledAt: visit.scheduledAt.toISOString(), referralId: visit.referralId },
        dedupeKey: `visita-nao-realizada-${visit.id}`,
        push: true,
        url: "/app/cuidado",
      });
      if (result.created) {
        remindersCreated += 1;
        deliveries += result.deliveries;
      }
    }

    return res.json({ ok: true, remindersCreated, deliveries, timestamp: now.toISOString() });
  } catch (error) {
    console.error("[scheduleReminders] Error:", error);
    return res.status(500).json({ error: String(error), timestamp: new Date().toISOString() });
  }
}
