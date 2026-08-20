import type { Request, Response } from "express";
import { and, eq, gte, isNotNull, lte } from "drizzle-orm";
import { ministries, scheduleItems, churchUsers } from "../drizzle/schema";
import { sdk } from "./_core/sdk";
import { getDb } from "./db";
import { emitInternalNotification } from "./notifications";

const REMINDER_HOURS = [24, 2] as const;
const REMINDER_WINDOW_MS = 60 * 60 * 1000;
const DEFAULT_SCHEDULE_TIMEZONE_OFFSET = "-03:00";

export function getScheduleReminderStage(startAt: Date, now: Date): 24 | 2 | null {
  const hoursUntilStart = (startAt.getTime() - now.getTime()) / (60 * 60 * 1000);
  if (hoursUntilStart <= 0) return null;
  return REMINDER_HOURS.find((hours) => Math.abs(hoursUntilStart - hours) < 1) ?? null;
}

export function getScheduleDateKey(value: Date | string) {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function getScheduleStartAt(scheduledDate: Date | string, startTime: string) {
  const day = getScheduleDateKey(scheduledDate);
  return new Date(`${day}T${startTime}:00${DEFAULT_SCHEDULE_TIMEZONE_OFFSET}`);
}

export async function scheduleRemindersHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) return res.status(403).json({ error: "cron-only" });

    const db = await getDb();
    if (!db) return res.status(500).json({ error: "database unavailable" });

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 1);
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 2);

    const [items, accounts, ministryRows] = await Promise.all([
      db.select().from(scheduleItems).where(and(isNotNull(scheduleItems.startTime), isNotNull(scheduleItems.endTime), gte(scheduleItems.scheduledDate, startDate), lte(scheduleItems.scheduledDate, endDate))),
      db.select({ id: churchUsers.id, churchId: churchUsers.churchId, personId: churchUsers.personId }).from(churchUsers).where(eq(churchUsers.active, true)),
      db.select({ id: ministries.id, churchId: ministries.churchId, name: ministries.name }).from(ministries),
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
