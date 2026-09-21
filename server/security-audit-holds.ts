import type {
  InsertSecurityAccessAuditHoldEvent,
  InsertSecurityAccessAuditHold,
  SecurityAccessAuditHold,
  SecurityAccessAuditLog,
} from "../drizzle/schema";
import type {
  SecurityAccessEvent,
  TenantAccessDeniedReason,
} from "./security-access-monitoring";

export const SECURITY_HOLD_EVENT_TYPE =
  "security.tenant_access_denied" as const;
export const SECURITY_HOLD_MAX_DURATION_MS = 90 * 24 * 60 * 60 * 1000;
export const SECURITY_HOLD_DEFAULT_REVIEW_INTERVAL_MS =
  30 * 24 * 60 * 60 * 1000;

export type SecurityAuditHoldStatus = "active" | "released" | "expired";

export type SecurityAuditHoldScope = {
  eventType?: typeof SECURITY_HOLD_EVENT_TYPE;
  reason?: TenantAccessDeniedReason | null;
  procedurePath?: string | null;
  sessionChurchId?: number | null;
  targetChurchId?: number | null;
  sourceFingerprint?: string | null;
};

export type CreateSecurityAuditHoldInput = {
  churchId: number;
  createdByChurchUserId: number;
  holdReason: string;
  startsAt: Date;
  expiresAt: Date;
  reviewDueAt?: Date;
  idempotencyKey?: string | null;
} & SecurityAuditHoldScope;

export type ReviewSecurityAuditHoldInput = {
  churchId: number;
  holdId: number;
  reviewedByChurchUserId: number;
  reviewedAt: Date;
  expiresAt: Date;
  reviewDueAt: Date;
};

export type ReleaseSecurityAuditHoldInput = {
  churchId: number;
  holdId: number;
  releasedByChurchUserId: number;
  releasedAt: Date;
  releaseReason: string;
};

export type SecurityAuditRetentionDecision = {
  retain: boolean;
  holdIds: number[];
  retainUntil: Date | null;
};

export type SecurityAuditHoldDerivedState = {
  status: SecurityAuditHoldStatus;
  displayState:
    | "active"
    | "review_due"
    | "expired_pending"
    | "released"
    | "expired";
  isReviewDue: boolean;
  isExpired: boolean;
  daysUntilExpiration: number | null;
};

type SecurityAuditHoldEventInput = {
  churchId: number;
  holdId: number;
  actorChurchUserId?: number | null;
  occurredAt: Date;
  reason: string;
  metadata?: Record<string, unknown> | null;
};

function buildHoldEvent(
  input: SecurityAuditHoldEventInput,
  action: "opened" | "reviewed" | "released" | "expired",
  transition: Pick<
    InsertSecurityAccessAuditHoldEvent,
    | "previousStatus"
    | "newStatus"
    | "previousExpiresAt"
    | "newExpiresAt"
    | "previousReviewDueAt"
    | "newReviewDueAt"
  >
): InsertSecurityAccessAuditHoldEvent {
  return {
    churchId: positiveId(input.churchId, "churchId"),
    holdId: positiveId(input.holdId, "holdId"),
    action,
    actorChurchUserId:
      input.actorChurchUserId === null || input.actorChurchUserId === undefined
        ? null
        : positiveId(input.actorChurchUserId, "actorChurchUserId"),
    ...transition,
    reason: requiredReason(input.reason, "reason", MAX_HOLD_REASON_LENGTH),
    metadata: input.metadata ?? null,
    occurredAt: validDate(input.occurredAt, "occurredAt"),
  };
}

export function buildSecurityAuditHoldOpenedEvent(
  input: SecurityAuditHoldEventInput & {
    hold: Pick<SecurityAccessAuditHold, "expiresAt" | "reviewDueAt">;
  }
): InsertSecurityAccessAuditHoldEvent {
  return buildHoldEvent(input, "opened", {
    previousStatus: null,
    newStatus: "active",
    previousExpiresAt: null,
    newExpiresAt: input.hold.expiresAt,
    previousReviewDueAt: null,
    newReviewDueAt: input.hold.reviewDueAt,
  });
}

export function buildSecurityAuditHoldReviewedEvent(
  input: SecurityAuditHoldEventInput & {
    previous: Pick<SecurityAccessAuditHold, "expiresAt" | "reviewDueAt">;
    next: Pick<SecurityAccessAuditHold, "expiresAt" | "reviewDueAt">;
  }
): InsertSecurityAccessAuditHoldEvent {
  return buildHoldEvent(input, "reviewed", {
    previousStatus: "active",
    newStatus: "active",
    previousExpiresAt: input.previous.expiresAt,
    newExpiresAt: input.next.expiresAt,
    previousReviewDueAt: input.previous.reviewDueAt,
    newReviewDueAt: input.next.reviewDueAt,
  });
}

export function buildSecurityAuditHoldReleasedEvent(
  input: SecurityAuditHoldEventInput & {
    previous: Pick<SecurityAccessAuditHold, "expiresAt" | "reviewDueAt">;
  }
): InsertSecurityAccessAuditHoldEvent {
  return buildHoldEvent(input, "released", {
    previousStatus: "active",
    newStatus: "released",
    previousExpiresAt: input.previous.expiresAt,
    newExpiresAt: null,
    previousReviewDueAt: input.previous.reviewDueAt,
    newReviewDueAt: null,
  });
}

export function buildSecurityAuditHoldExpiredEvent(
  input: SecurityAuditHoldEventInput & {
    previous: Pick<SecurityAccessAuditHold, "expiresAt" | "reviewDueAt">;
  }
): InsertSecurityAccessAuditHoldEvent {
  return buildHoldEvent(input, "expired", {
    previousStatus: "active",
    newStatus: "expired",
    previousExpiresAt: input.previous.expiresAt,
    newExpiresAt: null,
    previousReviewDueAt: input.previous.reviewDueAt,
    newReviewDueAt: null,
  });
}

export function deriveSecurityAuditHoldState(
  hold: Pick<SecurityAccessAuditHold, "status" | "expiresAt" | "reviewDueAt">,
  now = new Date()
): SecurityAuditHoldDerivedState {
  const referenceAt = validDate(now, "now");
  const isExpired = hold.status === "active" && hold.expiresAt <= referenceAt;
  const isReviewDue =
    hold.status === "active" && !isExpired && hold.reviewDueAt <= referenceAt;
  const displayState =
    hold.status === "released"
      ? "released"
      : hold.status === "expired"
        ? "expired"
        : isExpired
          ? "expired_pending"
          : isReviewDue
            ? "review_due"
            : "active";
  return {
    status: hold.status,
    displayState,
    isReviewDue,
    isExpired,
    daysUntilExpiration:
      hold.status === "active"
        ? Math.max(
            0,
            Math.ceil(
              (hold.expiresAt.getTime() - referenceAt.getTime()) /
                (24 * 60 * 60 * 1000)
            )
          )
        : null,
  };
}

const SAFE_IDENTIFIER = /^[A-Za-z0-9_.:-]+$/;
const MAX_HOLD_REASON_LENGTH = 1000;
const MAX_RELEASE_REASON_LENGTH = 500;
const MAX_IDEMPOTENCY_KEY_LENGTH = 64;
const MAX_PROCEDURE_PATH_LENGTH = 160;
const MAX_FINGERPRINT_LENGTH = 128;

function positiveId(value: number, fieldName: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  return value;
}

function validDate(value: Date, fieldName: string): Date {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error(`${fieldName} must be a valid date`);
  }
  return new Date(value.getTime());
}

function optionalPositiveId(
  value: number | null | undefined,
  fieldName: string
): number | null {
  if (value === null || value === undefined) return null;
  return positiveId(value, fieldName);
}

function optionalSafeIdentifier(
  value: string | null | undefined,
  fieldName: string,
  maxLength: number
): string | null {
  if (value === null || value === undefined || value === "") return null;
  const normalized = value.trim().slice(0, maxLength);
  if (!normalized || !SAFE_IDENTIFIER.test(normalized)) {
    throw new Error(`${fieldName} must be a safe identifier`);
  }
  return normalized;
}

function requiredReason(value: string, fieldName: string, maxLength: number) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${fieldName} is required`);
  if (normalized.length > maxLength) {
    throw new Error(`${fieldName} exceeds maximum length`);
  }
  return normalized;
}

function ensureWindow(
  startsAt: Date,
  expiresAt: Date,
  reviewDueAt: Date,
  referenceAt: Date
) {
  if (expiresAt.getTime() <= startsAt.getTime()) {
    throw new Error("expiresAt must be after startsAt");
  }
  if (
    expiresAt.getTime() - startsAt.getTime() >
    SECURITY_HOLD_MAX_DURATION_MS
  ) {
    throw new Error(
      "security hold cannot exceed 90 days without review renewal"
    );
  }
  if (reviewDueAt.getTime() < startsAt.getTime()) {
    throw new Error("reviewDueAt cannot be before startsAt");
  }
  if (reviewDueAt.getTime() > expiresAt.getTime()) {
    throw new Error("reviewDueAt cannot be after expiresAt");
  }
  if (expiresAt.getTime() <= referenceAt.getTime()) {
    throw new Error("expiresAt must be in the future");
  }
}

export function buildSecurityAuditHoldInsert(
  data: CreateSecurityAuditHoldInput,
  now = new Date()
): InsertSecurityAccessAuditHold {
  const referenceAt = validDate(now, "now");
  const startsAt = validDate(data.startsAt, "startsAt");
  const expiresAt = validDate(data.expiresAt, "expiresAt");
  const reviewDueAt = validDate(
    data.reviewDueAt ??
      new Date(
        Math.min(
          startsAt.getTime() + SECURITY_HOLD_DEFAULT_REVIEW_INTERVAL_MS,
          expiresAt.getTime()
        )
      ),
    "reviewDueAt"
  );

  ensureWindow(startsAt, expiresAt, reviewDueAt, referenceAt);

  return {
    churchId: positiveId(data.churchId, "churchId"),
    eventType: data.eventType ?? SECURITY_HOLD_EVENT_TYPE,
    reason: data.reason ?? null,
    procedurePath: optionalSafeIdentifier(
      data.procedurePath,
      "procedurePath",
      MAX_PROCEDURE_PATH_LENGTH
    ),
    sessionChurchId: optionalPositiveId(
      data.sessionChurchId,
      "sessionChurchId"
    ),
    targetChurchId: optionalPositiveId(data.targetChurchId, "targetChurchId"),
    sourceFingerprint: optionalSafeIdentifier(
      data.sourceFingerprint,
      "sourceFingerprint",
      MAX_FINGERPRINT_LENGTH
    ),
    status: "active",
    holdReason: requiredReason(
      data.holdReason,
      "holdReason",
      MAX_HOLD_REASON_LENGTH
    ),
    createdByChurchUserId: positiveId(
      data.createdByChurchUserId,
      "createdByChurchUserId"
    ),
    startsAt,
    expiresAt,
    reviewDueAt,
    idempotencyKey: optionalSafeIdentifier(
      data.idempotencyKey,
      "idempotencyKey",
      MAX_IDEMPOTENCY_KEY_LENGTH
    ),
  };
}

export function buildSecurityAuditHoldReviewUpdate(
  data: ReviewSecurityAuditHoldInput
): Pick<
  SecurityAccessAuditHold,
  "expiresAt" | "reviewDueAt" | "lastReviewedByChurchUserId" | "lastReviewedAt"
> {
  const reviewedAt = validDate(data.reviewedAt, "reviewedAt");
  const expiresAt = validDate(data.expiresAt, "expiresAt");
  const reviewDueAt = validDate(data.reviewDueAt, "reviewDueAt");
  ensureWindow(reviewedAt, expiresAt, reviewDueAt, reviewedAt);

  return {
    expiresAt,
    reviewDueAt,
    lastReviewedByChurchUserId: positiveId(
      data.reviewedByChurchUserId,
      "reviewedByChurchUserId"
    ),
    lastReviewedAt: reviewedAt,
  };
}

export function buildSecurityAuditHoldReleaseUpdate(
  data: ReleaseSecurityAuditHoldInput
): Pick<
  SecurityAccessAuditHold,
  "status" | "releasedByChurchUserId" | "releasedAt" | "releaseReason"
> {
  return {
    status: "released",
    releasedByChurchUserId: positiveId(
      data.releasedByChurchUserId,
      "releasedByChurchUserId"
    ),
    releasedAt: validDate(data.releasedAt, "releasedAt"),
    releaseReason: requiredReason(
      data.releaseReason,
      "releaseReason",
      MAX_RELEASE_REASON_LENGTH
    ),
  };
}

export function buildSecurityAuditHoldExpireUpdate(
  expiredAt: Date,
  expiredByReference: SecurityAccessAuditHold
): Pick<SecurityAccessAuditHold, "status" | "expiredAt"> {
  const referenceAt = validDate(expiredAt, "expiredAt");
  if (
    expiredByReference.status !== "active" ||
    expiredByReference.expiresAt.getTime() > referenceAt.getTime()
  ) {
    throw new Error("security hold is not eligible for expiration");
  }
  return { status: "expired", expiredAt: referenceAt };
}

function matchesOptional<T>(
  expected: T | null | undefined,
  actual: T
): boolean {
  return expected === null || expected === undefined || expected === actual;
}

export function securityAuditHoldMatchesLog(
  hold: Pick<
    SecurityAccessAuditHold,
    | "id"
    | "churchId"
    | "eventType"
    | "reason"
    | "procedurePath"
    | "sessionChurchId"
    | "targetChurchId"
    | "sourceFingerprint"
    | "status"
    | "startsAt"
    | "expiresAt"
  >,
  log: Pick<
    SecurityAccessAuditLog,
    | "churchId"
    | "eventType"
    | "reason"
    | "procedurePath"
    | "sessionChurchId"
    | "targetChurchId"
    | "sourceFingerprint"
    | "createdAt"
  >,
  now = new Date()
): boolean {
  const referenceAt = validDate(now, "now");
  if (hold.status !== "active") return false;
  if (hold.churchId !== log.churchId) return false;
  if (referenceAt < hold.startsAt || referenceAt >= hold.expiresAt)
    return false;
  if (log.createdAt < hold.startsAt || log.createdAt >= hold.expiresAt) {
    return false;
  }
  if (hold.eventType !== log.eventType) return false;
  if (!matchesOptional(hold.reason, log.reason)) return false;
  if (!matchesOptional(hold.procedurePath, log.procedurePath)) return false;
  if (!matchesOptional(hold.sessionChurchId, log.sessionChurchId)) return false;
  if (!matchesOptional(hold.targetChurchId, log.targetChurchId)) return false;
  if (!matchesOptional(hold.sourceFingerprint, log.sourceFingerprint)) {
    return false;
  }
  return true;
}

export function decideSecurityAuditRetention(
  log: Pick<
    SecurityAccessAuditLog,
    | "churchId"
    | "eventType"
    | "reason"
    | "procedurePath"
    | "sessionChurchId"
    | "targetChurchId"
    | "sourceFingerprint"
    | "createdAt"
  >,
  holds: Array<
    Pick<
      SecurityAccessAuditHold,
      | "id"
      | "churchId"
      | "eventType"
      | "reason"
      | "procedurePath"
      | "sessionChurchId"
      | "targetChurchId"
      | "sourceFingerprint"
      | "status"
      | "startsAt"
      | "expiresAt"
    >
  >,
  now = new Date()
): SecurityAuditRetentionDecision {
  const matching = holds.filter(hold =>
    securityAuditHoldMatchesLog(hold, log, now)
  );
  return {
    retain: matching.length > 0,
    holdIds: matching.map(hold => hold.id),
    retainUntil:
      matching.length > 0
        ? new Date(Math.max(...matching.map(hold => hold.expiresAt.getTime())))
        : null,
  };
}

export function securityAccessEventToHoldScope(
  event: SecurityAccessEvent
): SecurityAuditHoldScope {
  return {
    eventType: SECURITY_HOLD_EVENT_TYPE,
    reason: event.reason,
    procedurePath: event.procedurePath,
    sessionChurchId: event.sessionChurchId,
    targetChurchId: event.targetChurchId,
    sourceFingerprint: event.sourceFingerprint,
  };
}
