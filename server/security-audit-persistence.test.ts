import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import {
  buildSecurityAccessAuditInsert,
  insertSecurityAccessAuditLog,
  type SecurityAuditInsertDb,
} from "./security-audit-persistence";
import { buildSecurityAccessEvent } from "./security-access-monitoring";
import { securityAccessAuditLogs } from "../drizzle/schema";

const event = buildSecurityAccessEvent(
  {
    reason: "jwt_host_mismatch",
    procedurePath: "escolaFundamentos.listCourses",
    sessionChurchId: 100,
    targetChurchId: 200,
    actorChurchUserId: 42,
    requestId: "req-123",
    sourceFingerprint: "source-a",
  },
  new Date("2026-09-21T05:00:00.000Z")
);

describe("contrato da auditoria security.tenant_access_denied", () => {
  it("atribui churchId ao tenant proprietário e preserva os campos de correlação mínimos", () => {
    const insert = buildSecurityAccessAuditInsert({
      churchId: 100,
      event,
    });

    expect(insert).toEqual({
      churchId: 100,
      eventType: "security.tenant_access_denied",
      reason: "jwt_host_mismatch",
      procedurePath: "escolaFundamentos.listCourses",
      sessionChurchId: 100,
      targetChurchId: 200,
      actorChurchUserId: 42,
      requestId: "req-123",
      sourceFingerprint: "source-a",
      severity: "warning",
      occurredAt: new Date("2026-09-21T05:00:00.000Z"),
    });

    expect(Object.keys(insert)).not.toEqual(
      expect.arrayContaining([
        "token",
        "authorization",
        "cookie",
        "email",
        "payload",
      ])
    );
  });

  it("rejeita churchId inválido antes de qualquer insert", () => {
    expect(() =>
      buildSecurityAccessAuditInsert({ churchId: 0, event })
    ).toThrow("churchId must be a positive integer");
    expect(() =>
      buildSecurityAccessAuditInsert({ churchId: -1, event })
    ).toThrow("churchId must be a positive integer");
  });

  it("rejeita tipos de evento que não pertencem ao contrato de acesso negado", () => {
    expect(() =>
      buildSecurityAccessAuditInsert({
        churchId: 100,
        event: {
          ...event,
          eventType: "security.other_event" as typeof event.eventType,
        },
      })
    ).toThrow("Unsupported security audit event type");
  });
});

describe("insert da auditoria", () => {
  it("insere na tabela correta e retorna o insertId sem escrever outros dados", async () => {
    const values = vi.fn().mockResolvedValue([{ insertId: 77 }]);
    const insert = vi.fn().mockReturnValue({ values });
    const db: SecurityAuditInsertDb = { insert };

    const result = await insertSecurityAccessAuditLog(db, {
      churchId: 100,
      event,
    });

    expect(result).toBe(77);
    expect(insert).toHaveBeenCalledWith(securityAccessAuditLogs);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        churchId: 100,
        eventType: "security.tenant_access_denied",
        targetChurchId: 200,
      })
    );
    expect(values).toHaveBeenCalledTimes(1);
  });

  it("retorna zero quando o driver não devolve insertId", async () => {
    const values = vi.fn().mockResolvedValue([{}]);
    const db: SecurityAuditInsertDb = {
      insert: vi.fn().mockReturnValue({ values }),
    };

    await expect(
      insertSecurityAccessAuditLog(db, { churchId: 100, event })
    ).resolves.toBe(0);
  });

  it("propaga falha do banco para o chamador tratar sem mascarar o erro", async () => {
    const values = vi.fn().mockRejectedValue(new Error("database unavailable"));
    const db: SecurityAuditInsertDb = {
      insert: vi.fn().mockReturnValue({ values }),
    };

    await expect(
      insertSecurityAccessAuditLog(db, { churchId: 100, event })
    ).rejects.toThrow("database unavailable");
  });
});

describe("migration 0074", () => {
  const migration = readFileSync(
    new URL("../drizzle/0074_security_access_audit.sql", import.meta.url),
    "utf8"
  );

  it("cria a tabela, os enums e os índices tenant-aware", () => {
    expect(migration).toContain("CREATE TABLE security_access_audit_logs");
    expect(migration).toContain(
      "security_access_audit_logs_church_created_idx"
    );
    expect(migration).toContain(
      "security_access_audit_logs_source_created_idx"
    );
    expect(migration).toContain(
      "security_access_audit_logs_target_created_idx"
    );
    expect(migration).toContain(
      "security_access_audit_logs_reason_created_idx"
    );
    expect(migration).not.toContain("security.tenant_access_denied");
    expect(migration).toContain("jwt_host_mismatch");
    expect(migration).toContain("client_tenant_mismatch");
  });

  it("é aditiva e não contém operações destrutivas ou dados sensíveis", () => {
    expect(migration).not.toMatch(/DROP\s+TABLE|DELETE\s+FROM|UPDATE\s+/i);
    expect(migration).not.toMatch(
      /DATABASE_URL|JWT_SECRET|Authorization|Bearer/i
    );
  });
});
