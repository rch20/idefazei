import { TENANT_ACCESS_DENIED_EVENT } from "./security-access-monitoring";
import type { SecurityAccessEvent } from "./security-access-monitoring";
import {
  securityAccessAuditLogs,
  type InsertSecurityAccessAuditLog,
} from "../drizzle/schema";

export type SecurityAccessAuditInsert = InsertSecurityAccessAuditLog;

export type SecurityAuditInsertDb = {
  insert: (table: typeof securityAccessAuditLogs) => {
    values: (values: SecurityAccessAuditInsert) => Promise<unknown>;
  };
};

function requirePositiveId(value: number, fieldName: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  return value;
}

export function buildSecurityAccessAuditInsert(data: {
  churchId: number;
  event: SecurityAccessEvent;
}): SecurityAccessAuditInsert {
  const churchId = requirePositiveId(data.churchId, "churchId");

  if (data.event.eventType !== TENANT_ACCESS_DENIED_EVENT) {
    throw new Error("Unsupported security audit event type");
  }

  return {
    churchId,
    eventType: data.event.eventType,
    reason: data.event.reason,
    procedurePath: data.event.procedurePath,
    sessionChurchId: data.event.sessionChurchId,
    targetChurchId: data.event.targetChurchId,
    actorChurchUserId: data.event.actorChurchUserId,
    requestId: data.event.requestId,
    sourceFingerprint: data.event.sourceFingerprint,
    severity: data.event.severity,
    occurredAt: data.event.occurredAt,
  };
}

export async function insertSecurityAccessAuditLog(
  db: SecurityAuditInsertDb,
  data: { churchId: number; event: SecurityAccessEvent }
): Promise<number> {
  const values = buildSecurityAccessAuditInsert(data);
  const result = await db.insert(securityAccessAuditLogs).values(values);
  return Number(
    (result as [{ insertId?: number }] | undefined)?.[0]?.insertId ?? 0
  );
}
