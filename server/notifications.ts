import {
  createInternalNotificationDelivery,
  createNotificationEvent,
  getNotificationEventByDedupeKey,
  isNotificationChannelActive,
  type NotificationEventType,
} from "./db";
import { dispatchWebPush } from "./webPush";

/**
 * Orquestra a regra de negócio Event → Recipients → Delivery channel.
 * A implementação atual entrega somente no sistema. O registro de eventos,
 * entregas e preferências mantém a API oficial do WhatsApp como um canal futuro.
 */
export async function emitInternalNotification(data: {
  churchId: number;
  type: NotificationEventType;
  recipientChurchUserIds: number[];
  title: string;
  body: string;
  entityType?: string;
  entityId?: number;
  metadata?: Record<string, unknown>;
  dedupeKey?: string;
  push?: boolean;
  url?: string;
}) {
  const recipients = Array.from(new Set(data.recipientChurchUserIds.filter((id) => Number.isInteger(id) && id > 0)));
  if (recipients.length === 0) return { created: false, eventId: null, deliveries: 0 };
  if (!(await isNotificationChannelActive(data.churchId, data.type, "sistema"))) return { created: false, eventId: null, deliveries: 0 };

  const existing = data.dedupeKey ? await getNotificationEventByDedupeKey(data.churchId, data.dedupeKey) : null;
  if (existing) return { created: false, eventId: existing.id, deliveries: 0 };

  const event = await createNotificationEvent({
    churchId: data.churchId,
    type: data.type,
    entityType: data.entityType,
    entityId: data.entityId,
    title: data.title,
    body: data.body,
    metadata: data.metadata,
    dedupeKey: data.dedupeKey,
  });
  await Promise.all(recipients.map((recipientChurchUserId) => createInternalNotificationDelivery({ churchId: data.churchId, eventId: event.id, recipientChurchUserId })));
  if (data.push) {
    void dispatchWebPush({
      churchId: data.churchId,
      recipientChurchUserIds: recipients,
      title: data.title,
      body: data.body,
      url: data.url,
      entityType: data.entityType,
      entityId: data.entityId,
      dedupeKey: data.dedupeKey ?? `notification-event-${event.id}`,
    }).catch((error) => console.error("[notifications] Web Push dispatch failed", error));
  }
  return { created: true, eventId: event.id, deliveries: recipients.length };
}
