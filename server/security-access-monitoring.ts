import { createSecurityAlertNotifierFromEnv } from "./security-alert-notifier";

export const TENANT_ACCESS_DENIED_EVENT =
  "security.tenant_access_denied" as const;

export const TENANT_ACCESS_DENIED_REASONS = [
  "jwt_host_mismatch",
  "tenant_scope_mismatch",
  "tenant_unresolved",
  "client_tenant_mismatch",
] as const;

export type TenantAccessDeniedReason =
  (typeof TENANT_ACCESS_DENIED_REASONS)[number];
export type SecurityAlertSeverity = "high" | "critical";

export type SecurityAccessEventInput = {
  reason: TenantAccessDeniedReason;
  procedurePath: string;
  sessionChurchId?: number | null;
  targetChurchId?: number | null;
  actorChurchUserId?: number | null;
  requestId?: string | null;
  sourceFingerprint?: string | null;
  occurredAt?: Date;
};

export type SecurityAccessEvent = {
  eventType: typeof TENANT_ACCESS_DENIED_EVENT;
  reason: TenantAccessDeniedReason;
  procedurePath: string;
  sessionChurchId: number | null;
  targetChurchId: number | null;
  actorChurchUserId: number | null;
  requestId: string | null;
  sourceFingerprint: string | null;
  occurredAt: Date;
  severity: "warning";
};

export type SecurityAlert = {
  alertKey: string;
  eventType: typeof TENANT_ACCESS_DENIED_EVENT;
  severity: SecurityAlertSeverity;
  reason: TenantAccessDeniedReason;
  procedurePath: string;
  sourceFingerprint: string;
  count: number;
  distinctTargetTenantCount: number;
  firstOccurredAt: Date;
  lastOccurredAt: Date;
};

export type SecurityAccessMonitorPolicy = {
  windowMs: number;
  highThreshold: number;
  criticalDistinctTenants: number;
  cooldownMs: number;
};

export const DEFAULT_SECURITY_ACCESS_MONITOR_POLICY: SecurityAccessMonitorPolicy =
  {
    windowMs: 10 * 60 * 1000,
    highThreshold: 5,
    criticalDistinctTenants: 3,
    cooldownMs: 15 * 60 * 1000,
  };

export type SecurityAlertNotifier = (alert: SecurityAlert) => Promise<void>;

type SecurityAccessMonitorOptions = {
  policy?: Partial<SecurityAccessMonitorPolicy>;
  now?: () => Date;
  notify?: SecurityAlertNotifier;
};

type RecordResult = {
  event: SecurityAccessEvent;
  alert: SecurityAlert | null;
  notificationFailed: boolean;
};

const MAX_PROCEDURE_PATH_LENGTH = 160;
const MAX_REQUEST_ID_LENGTH = 120;
const MAX_FINGERPRINT_LENGTH = 128;
const SAFE_IDENTIFIER = /^[A-Za-z0-9_.:-]+$/;

function normalizePositiveId(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : null;
}

function normalizeSafeIdentifier(
  value: string | null | undefined,
  maxLength: number
): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().slice(0, maxLength);
  return normalized && SAFE_IDENTIFIER.test(normalized) ? normalized : null;
}

function normalizeProcedurePath(value: string): string {
  const normalized = value.trim().slice(0, MAX_PROCEDURE_PATH_LENGTH);
  return SAFE_IDENTIFIER.test(normalized) ? normalized : "unknown";
}

function normalizeDate(value: Date | undefined, fallback: Date): Date {
  return value instanceof Date && !Number.isNaN(value.getTime())
    ? new Date(value.getTime())
    : new Date(fallback.getTime());
}

export function buildSecurityAccessEvent(
  input: SecurityAccessEventInput,
  now = new Date()
): SecurityAccessEvent {
  return {
    eventType: TENANT_ACCESS_DENIED_EVENT,
    reason: input.reason,
    procedurePath: normalizeProcedurePath(input.procedurePath),
    sessionChurchId: normalizePositiveId(input.sessionChurchId),
    targetChurchId: normalizePositiveId(input.targetChurchId),
    actorChurchUserId: normalizePositiveId(input.actorChurchUserId),
    requestId: normalizeSafeIdentifier(input.requestId, MAX_REQUEST_ID_LENGTH),
    sourceFingerprint: normalizeSafeIdentifier(
      input.sourceFingerprint,
      MAX_FINGERPRINT_LENGTH
    ),
    occurredAt: normalizeDate(input.occurredAt, now),
    severity: "warning",
  };
}

function getAlertKey(
  event: SecurityAccessEvent,
  severity: SecurityAlertSeverity
): string {
  return [
    severity,
    event.reason,
    event.sourceFingerprint,
    severity === "high" ? (event.targetChurchId ?? "unknown") : "all-tenants",
  ].join(":");
}

function toAlert(
  severity: SecurityAlertSeverity,
  events: SecurityAccessEvent[],
  sourceFingerprint: string,
  alertKey: string
): SecurityAlert {
  const first = events[0];
  const last = events[events.length - 1];
  const distinctTargetTenantCount = new Set(
    events
      .map(event => event.targetChurchId)
      .filter((id): id is number => id !== null)
  ).size;

  return {
    alertKey,
    eventType: TENANT_ACCESS_DENIED_EVENT,
    severity,
    reason: last.reason,
    procedurePath: last.procedurePath,
    sourceFingerprint,
    count: events.length,
    distinctTargetTenantCount,
    firstOccurredAt: first.occurredAt,
    lastOccurredAt: last.occurredAt,
  };
}

export function createSecurityAccessMonitor(
  options: SecurityAccessMonitorOptions = {}
) {
  const policy: SecurityAccessMonitorPolicy = {
    ...DEFAULT_SECURITY_ACCESS_MONITOR_POLICY,
    ...options.policy,
  };
  const now = options.now ?? (() => new Date());
  const notify = options.notify ?? createSecurityAlertNotifierFromEnv();
  const events: SecurityAccessEvent[] = [];
  const lastAlertAt = new Map<string, number>();
  const alertHistory: SecurityAlert[] = [];

  function prune(referenceTime: Date) {
    const minimumTime = referenceTime.getTime() - policy.windowMs;
    while (events.length > 0 && events[0].occurredAt.getTime() < minimumTime) {
      events.shift();
    }
  }

  async function record(
    input: SecurityAccessEventInput
  ): Promise<RecordResult> {
    const referenceTime = now();
    prune(referenceTime);

    const event = buildSecurityAccessEvent(input, referenceTime);
    events.push(event);

    if (!event.sourceFingerprint) {
      return { event, alert: null, notificationFailed: false };
    }

    const sourceEvents = events.filter(
      candidate =>
        candidate.sourceFingerprint === event.sourceFingerprint &&
        candidate.reason === event.reason
    );
    const targetEvents = sourceEvents.filter(
      candidate => candidate.targetChurchId !== null
    );
    const distinctTargetTenantCount = new Set(
      targetEvents.map(candidate => candidate.targetChurchId)
    ).size;
    const sameTargetEvents = targetEvents.filter(
      candidate => candidate.targetChurchId === event.targetChurchId
    );

    let severity: SecurityAlertSeverity | null = null;
    let qualifyingEvents: SecurityAccessEvent[] = sourceEvents;
    if (distinctTargetTenantCount >= policy.criticalDistinctTenants) {
      severity = "critical";
      qualifyingEvents = targetEvents;
    } else if (
      sameTargetEvents.length >= policy.highThreshold &&
      event.targetChurchId !== null
    ) {
      severity = "high";
      qualifyingEvents = sameTargetEvents;
    }

    if (!severity) {
      return { event, alert: null, notificationFailed: false };
    }

    const alertKey = getAlertKey(event, severity);
    const lastSentAt = lastAlertAt.get(alertKey);
    if (
      lastSentAt !== undefined &&
      referenceTime.getTime() - lastSentAt < policy.cooldownMs
    ) {
      return { event, alert: null, notificationFailed: false };
    }

    const alert = toAlert(
      severity,
      qualifyingEvents,
      event.sourceFingerprint,
      alertKey
    );
    lastAlertAt.set(alertKey, referenceTime.getTime());
    alertHistory.push(alert);

    try {
      await notify(alert);
      return { event, alert, notificationFailed: false };
    } catch {
      return { event, alert, notificationFailed: true };
    }
  }

  return {
    record,
    getEvents: () => events.map(event => ({ ...event })),
    getAlertHistory: () => alertHistory.map(alert => ({ ...alert })),
  };
}
