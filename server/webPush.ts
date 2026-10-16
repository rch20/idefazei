import webpush from "web-push";
import { ENV } from "./_core/env";
import { getActiveWebPushSubscriptionsByChurchUsers, revokeWebPushSubscription } from "./db";

const MAX_TITLE_LENGTH = 120;
const MAX_BODY_LENGTH = 240;
const DEFAULT_VAPID_SUBJECT = "mailto:noreply@idefazei.com.br";

let vapidConfigured = false;

function configureVapid() {
  if (vapidConfigured) return true;
  if (!ENV.vapidPublicKey || !ENV.vapidPrivateKey) return false;
  webpush.setVapidDetails(ENV.vapidSubject || DEFAULT_VAPID_SUBJECT, ENV.vapidPublicKey, ENV.vapidPrivateKey);
  vapidConfigured = true;
  return true;
}

function clamp(value: string, max: number) {
  const normalized = value.trim();
  return normalized.length <= max ? normalized : `${normalized.slice(0, max - 1).trimEnd()}…`;
}

export type WebPushDispatchResult = {
  attempted: number;
  sent: number;
  revoked: number;
  failed: number;
  skipped: boolean;
};

export async function dispatchWebPush(data: {
  churchId: number;
  recipientChurchUserIds: number[];
  title: string;
  body: string;
  url?: string;
  entityType?: string;
  entityId?: number;
  dedupeKey: string;
}): Promise<WebPushDispatchResult> {
  if (!configureVapid()) {
    return { attempted: 0, sent: 0, revoked: 0, failed: 0, skipped: true };
  }

  const recipients = Array.from(new Set(data.recipientChurchUserIds.filter((id) => Number.isInteger(id) && id > 0)));
  if (recipients.length === 0) return { attempted: 0, sent: 0, revoked: 0, failed: 0, skipped: false };

  const subscriptions = await getActiveWebPushSubscriptionsByChurchUsers({ churchId: data.churchId, churchUserIds: recipients });
  const payload = JSON.stringify({
    title: clamp(data.title, MAX_TITLE_LENGTH),
    body: clamp(data.body, MAX_BODY_LENGTH),
    data: {
      url: data.url || "/app",
      entityType: data.entityType || null,
      entityId: data.entityId || null,
      dedupeKey: data.dedupeKey,
    },
  });

  let sent = 0;
  let revoked = 0;
  let failed = 0;
  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      }, payload, { TTL: 60 * 60 });
      sent += 1;
    } catch (error) {
      const statusCode = typeof error === "object" && error !== null && "statusCode" in error ? Number((error as { statusCode?: number }).statusCode) : 0;
      if (statusCode === 404 || statusCode === 410) {
        await revokeWebPushSubscription({ churchId: data.churchId, churchUserId: subscription.churchUserId, endpoint: subscription.endpoint });
        revoked += 1;
      } else {
        failed += 1;
        console.error("[webPush] delivery failed", { churchId: data.churchId, churchUserId: subscription.churchUserId, statusCode });
      }
    }
  }));

  return { attempted: subscriptions.length, sent, revoked, failed, skipped: false };
}
