/**
 * Handler de notificações automáticas — acionado pelo Heartbeat (cron diário).
 *
 * Rota: POST /api/scheduled/daily-notifications
 *
 * Dispara dois tipos de alertas:
 *   1. Aniversariantes do dia — membros com birthDate = hoje
 *   2. Ausentes — membros sem atividade há mais de 30 dias (sem presença em célula)
 *
 * Após o deploy, criar o cron com:
 *   manus-heartbeat create \
 *     --name daily-notifications \
 *     --cron "0 0 9 * * *" \
 *     --path /api/scheduled/daily-notifications \
 *     --description "Notificações diárias: aniversariantes e ausentes"
 */

import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { getDb } from "./db";
import { people, cellAttendance, cellMeetings, churchUsers, consolidationReferrals } from "../drizzle/schema";
import { and, eq, sql, lt, isNull } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";
import { emitInternalNotification } from "./notifications";

export async function dailyNotificationsHandler(req: Request, res: Response) {
  try {
    // 1. Authenticate — must be a cron call
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only" });
    }

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "database unavailable" });
    }

    const today = new Date();
    const todayMonth = today.getMonth() + 1; // 1-12
    const todayDay = today.getDate();

    // ── 2. Aniversariantes do dia ─────────────────────────────────────────────
    const birthdayPeople = await db
      .select({
        id: people.id,
        fullName: people.fullName,
        churchId: people.churchId,
        birthDate: people.birthDate,
        phone: people.phone,
      })
      .from(people)
      .where(
        and(
          sql`MONTH(${people.birthDate}) = ${todayMonth}`,
          sql`DAY(${people.birthDate}) = ${todayDay}`,
          eq(people.active, true)
        )
      );

    if (birthdayPeople.length > 0) {
      const names = birthdayPeople.map((p) => `• ${p.fullName}`).join("\n");
      await notifyOwner({
        title: `🎂 ${birthdayPeople.length} aniversariante(s) hoje`,
        content: `Membros que fazem aniversário hoje:\n\n${names}\n\nLembre-se de entrar em contato e celebrar com eles!`,
      });
    }

    // ── 3. Ausentes há mais de 30 dias ────────────────────────────────────────
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Subquery: IDs de pessoas que tiveram presença CONFIRMADA nos últimos 30 dias
    // Filtra: personId não nulo + status = 'presente' + data da reunião dentro do período
    const recentAttendees = db
      .select({ personId: cellAttendance.personId })
      .from(cellAttendance)
      .innerJoin(cellMeetings, eq(cellAttendance.meetingId, cellMeetings.id))
      .where(
        and(
          sql`${cellAttendance.personId} IS NOT NULL`,
          eq(cellAttendance.status, "presente"),
          sql`${cellMeetings.meetingDate} >= ${thirtyDaysAgo.toISOString().split("T")[0]}`
        )
      );

    const absentPeople = await db
      .select({
        id: people.id,
        fullName: people.fullName,
        churchId: people.churchId,
      })
      .from(people)
      .where(
        and(
          eq(people.active, true),
          sql`${people.id} NOT IN (${recentAttendees})`
        )
      )
      .limit(20); // limitar a 20 para não sobrecarregar a notificação

    if (absentPeople.length > 0) {
      const names = absentPeople.slice(0, 10).map((p) => `• ${p.fullName}`).join("\n");
      const extra = absentPeople.length > 10 ? `\n... e mais ${absentPeople.length - 10} pessoas` : "";
      await notifyOwner({
        title: `⚠️ ${absentPeople.length} membro(s) ausente(s) há mais de 30 dias`,
        content: `Os seguintes membros não registraram presença em nenhuma célula nos últimos 30 dias:\n\n${names}${extra}\n\nConsidere entrar em contato para verificar como estão.`,
      });
    }

    // ── 4. Encaminhamentos sem aceite ─────────────────────────────────────────
    // O evento é idempotente por encaminhamento; o canal interno já fica pronto
    // para que outro provedor (WhatsApp oficial) seja acrescentado no futuro.
    const unacceptedCutoff = new Date();
    unacceptedCutoff.setDate(unacceptedCutoff.getDate() - 2);
    const staleReferrals = await db.select().from(consolidationReferrals)
      .where(and(eq(consolidationReferrals.status, "pendente"), lt(consolidationReferrals.referredAt, unacceptedCutoff)));
    const recipientCache = new Map<number, Array<{ id: number; role: string; personId: number | null }>>();
    let staleReferralNotifications = 0;
    for (const referral of staleReferrals) {
      let churchRecipients = recipientCache.get(referral.churchId);
      if (!churchRecipients) {
        churchRecipients = await db.select({ id: churchUsers.id, role: churchUsers.role, personId: churchUsers.personId }).from(churchUsers)
          .where(and(eq(churchUsers.churchId, referral.churchId), eq(churchUsers.active, true)));
        recipientCache.set(referral.churchId, churchRecipients);
      }
      const recipients = churchRecipients
        .filter((account) => ["pastor_presidente", "pastor_local", "supervisor", "consolidador"].includes(account.role) || account.personId === referral.preferredConsolidatorId)
        .map((account) => account.id);
      const result = await emitInternalNotification({
        churchId: referral.churchId,
        type: "encaminhamento_sem_aceite",
        recipientChurchUserIds: recipients,
        title: "Encaminhamento sem aceite há mais de 2 dias",
        body: "Um encaminhamento de Consolidação continua aguardando responsável. Revise a fila para definir o cuidado necessário.",
        entityType: "consolidation_referral",
        entityId: referral.id,
        metadata: { preferredConsolidatorId: referral.preferredConsolidatorId, referredAt: referral.referredAt.toISOString() },
        dedupeKey: `encaminhamento-sem-aceite-${referral.id}`,
      });
      if (result.created) staleReferralNotifications += result.deliveries;
    }

    // ── 5. Resposta ───────────────────────────────────────────────────────────
    return res.json({
      ok: true,
      birthdays: birthdayPeople.length,
      absent: absentPeople.length,
      staleReferralNotifications,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[dailyNotifications] Error:", err);
    return res.status(500).json({
      error: String(err),
      timestamp: new Date().toISOString(),
    });
  }
}
