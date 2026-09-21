import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  SECURITY_HOLD_DEFAULT_REVIEW_INTERVAL_MS,
  SECURITY_HOLD_MAX_DURATION_MS,
  buildSecurityAuditHoldExpireUpdate,
  buildSecurityAuditHoldExpiredEvent,
  buildSecurityAuditHoldInsert,
  buildSecurityAuditHoldOpenedEvent,
  buildSecurityAuditHoldReleaseUpdate,
  buildSecurityAuditHoldReleasedEvent,
  buildSecurityAuditHoldReviewUpdate,
  buildSecurityAuditHoldReviewedEvent,
  deriveSecurityAuditHoldState,
  decideSecurityAuditRetention,
  securityAccessEventToHoldScope,
  securityAuditHoldMatchesLog,
} from "./security-audit-holds";
import { buildSecurityAccessEvent } from "./security-access-monitoring";
import type {
  SecurityAccessAuditHold,
  SecurityAccessAuditLog,
} from "../drizzle/schema";

const baseNow = new Date("2026-09-21T05:00:00.000Z");
const baseEvent = buildSecurityAccessEvent(
  {
    reason: "jwt_host_mismatch",
    procedurePath: "escolaFundamentos.listCourses",
    sessionChurchId: 100,
    targetChurchId: 200,
    actorChurchUserId: 42,
    requestId: "req-123",
    sourceFingerprint: "source-a",
  },
  baseNow
);

const baseLog: Pick<
  SecurityAccessAuditLog,
  | "churchId"
  | "eventType"
  | "reason"
  | "procedurePath"
  | "sessionChurchId"
  | "targetChurchId"
  | "sourceFingerprint"
  | "createdAt"
> = {
  churchId: 100,
  eventType: "security.tenant_access_denied",
  reason: "jwt_host_mismatch",
  procedurePath: "escolaFundamentos.listCourses",
  sessionChurchId: 100,
  targetChurchId: 200,
  sourceFingerprint: "source-a",
  createdAt: baseNow,
};

function hold(
  overrides: Partial<
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
  > = {}
): Pick<
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
> {
  return {
    id: 7,
    churchId: 100,
    eventType: "security.tenant_access_denied",
    reason: "jwt_host_mismatch",
    procedurePath: "escolaFundamentos.listCourses",
    sessionChurchId: 100,
    targetChurchId: 200,
    sourceFingerprint: "source-a",
    status: "active",
    startsAt: new Date("2026-09-20T05:00:00.000Z"),
    expiresAt: new Date("2026-09-22T05:00:00.000Z"),
    ...overrides,
  };
}

describe("criação e ciclo de vida do security hold", () => {
  it("cria um hold ativo com revisão padrão em 30 dias e escopo específico", () => {
    const startsAt = baseNow;
    const expiresAt = new Date(
      startsAt.getTime() + SECURITY_HOLD_MAX_DURATION_MS
    );
    const insert = buildSecurityAuditHoldInsert(
      {
        churchId: 100,
        createdByChurchUserId: 42,
        holdReason: "Investigação de tentativa entre tenants",
        startsAt,
        expiresAt,
        reason: baseEvent.reason,
        procedurePath: baseEvent.procedurePath,
        sessionChurchId: baseEvent.sessionChurchId,
        targetChurchId: baseEvent.targetChurchId,
        sourceFingerprint: baseEvent.sourceFingerprint,
        idempotencyKey: "incident-2026-001",
      },
      baseNow
    );

    expect(insert).toMatchObject({
      churchId: 100,
      eventType: "security.tenant_access_denied",
      status: "active",
      holdReason: "Investigação de tentativa entre tenants",
      createdByChurchUserId: 42,
      reason: "jwt_host_mismatch",
      targetChurchId: 200,
      idempotencyKey: "incident-2026-001",
    });
    expect(insert.reviewDueAt.getTime()).toBe(
      startsAt.getTime() + SECURITY_HOLD_DEFAULT_REVIEW_INTERVAL_MS
    );
  });

  it("rejeita hold sem prazo futuro ou acima de 90 dias", () => {
    expect(() =>
      buildSecurityAuditHoldInsert(
        {
          churchId: 100,
          createdByChurchUserId: 42,
          holdReason: "Teste",
          startsAt: baseNow,
          expiresAt: baseNow,
        },
        baseNow
      )
    ).toThrow("expiresAt must be after startsAt");

    expect(() =>
      buildSecurityAuditHoldInsert(
        {
          churchId: 100,
          createdByChurchUserId: 42,
          holdReason: "Teste",
          startsAt: baseNow,
          expiresAt: new Date(
            baseNow.getTime() + SECURITY_HOLD_MAX_DURATION_MS + 1
          ),
        },
        baseNow
      )
    ).toThrow("security hold cannot exceed 90 days");
  });

  it("permite revisão que renova prazo, mas exige nova revisão dentro da janela", () => {
    const update = buildSecurityAuditHoldReviewUpdate({
      churchId: 100,
      holdId: 7,
      reviewedByChurchUserId: 55,
      reviewedAt: baseNow,
      expiresAt: new Date("2026-10-20T05:00:00.000Z"),
      reviewDueAt: new Date("2026-10-01T05:00:00.000Z"),
    });

    expect(update).toEqual({
      expiresAt: new Date("2026-10-20T05:00:00.000Z"),
      reviewDueAt: new Date("2026-10-01T05:00:00.000Z"),
      lastReviewedByChurchUserId: 55,
      lastReviewedAt: baseNow,
    });
  });

  it("libera o hold com responsável, data e motivo, preservando o histórico", () => {
    expect(
      buildSecurityAuditHoldReleaseUpdate({
        churchId: 100,
        holdId: 7,
        releasedByChurchUserId: 55,
        releasedAt: baseNow,
        releaseReason: "Investigação concluída",
      })
    ).toEqual({
      status: "released",
      releasedByChurchUserId: 55,
      releasedAt: baseNow,
      releaseReason: "Investigação concluída",
    });
  });

  it("marca somente hold ativo vencido como expired", () => {
    expect(
      buildSecurityAuditHoldExpireUpdate(
        baseNow,
        hold({
          expiresAt: new Date("2026-09-20T05:00:00.000Z"),
        }) as SecurityAccessAuditHold
      )
    ).toEqual({ status: "expired", expiredAt: baseNow });

    expect(() =>
      buildSecurityAuditHoldExpireUpdate(
        baseNow,
        hold() as SecurityAccessAuditHold
      )
    ).toThrow("security hold is not eligible for expiration");
  });
});

describe("escopo e decisão de retenção", () => {
  it("retém somente evento do mesmo tenant e dentro da janela do hold", () => {
    expect(securityAuditHoldMatchesLog(hold(), baseLog, baseNow)).toBe(true);
    expect(
      securityAuditHoldMatchesLog(hold({ churchId: 999 }), baseLog, baseNow)
    ).toBe(false);
    expect(
      securityAuditHoldMatchesLog(
        hold({ targetChurchId: 999 }),
        baseLog,
        baseNow
      )
    ).toBe(false);
    expect(
      securityAuditHoldMatchesLog(
        hold({ status: "released" }),
        baseLog,
        baseNow
      )
    ).toBe(false);
  });

  it("trata campos nulos do hold como curinga controlado dentro do tenant", () => {
    expect(
      securityAuditHoldMatchesLog(
        hold({
          reason: null,
          procedurePath: null,
          sessionChurchId: null,
          targetChurchId: null,
          sourceFingerprint: null,
        }),
        baseLog,
        baseNow
      )
    ).toBe(true);
  });

  it("retorna todos os holds coincidentes e o maior prazo de retenção", () => {
    const decision = decideSecurityAuditRetention(
      baseLog,
      [
        hold(),
        hold({
          id: 8,
          expiresAt: new Date("2026-09-25T05:00:00.000Z"),
        }),
      ],
      baseNow
    );

    expect(decision).toEqual({
      retain: true,
      holdIds: [7, 8],
      retainUntil: new Date("2026-09-25T05:00:00.000Z"),
    });
  });

  it("não retém o evento quando não há hold aplicável", () => {
    expect(
      decideSecurityAuditRetention(
        baseLog,
        [hold({ targetChurchId: 999 })],
        baseNow
      )
    ).toEqual({ retain: false, holdIds: [], retainUntil: null });
  });

  it("converte um evento de acesso negado em escopo específico de hold", () => {
    expect(securityAccessEventToHoldScope(baseEvent)).toEqual({
      eventType: "security.tenant_access_denied",
      reason: "jwt_host_mismatch",
      procedurePath: "escolaFundamentos.listCourses",
      sessionChurchId: 100,
      targetChurchId: 200,
      sourceFingerprint: "source-a",
    });
  });

  it("cria eventos append-only para abertura, revisão, liberação e expiração", () => {
    const opened = buildSecurityAuditHoldOpenedEvent({
      churchId: 100,
      holdId: 7,
      actorChurchUserId: 42,
      occurredAt: baseNow,
      reason: "Investigação aberta",
      hold: hold(),
    });
    const reviewed = buildSecurityAuditHoldReviewedEvent({
      churchId: 100,
      holdId: 7,
      actorChurchUserId: 55,
      occurredAt: baseNow,
      reason: "Prazo revisado",
      previous: hold(),
      next: hold({ expiresAt: new Date("2026-10-20T05:00:00.000Z") }),
    });
    const released = buildSecurityAuditHoldReleasedEvent({
      churchId: 100,
      holdId: 7,
      actorChurchUserId: 55,
      occurredAt: baseNow,
      reason: "Investigação concluída",
      previous: hold(),
    });
    const expired = buildSecurityAuditHoldExpiredEvent({
      churchId: 100,
      holdId: 7,
      actorChurchUserId: null,
      occurredAt: new Date("2026-09-23T05:00:00.000Z"),
      reason: "Expiração automática",
      previous: hold(),
    });

    expect(opened).toMatchObject({
      action: "opened",
      previousStatus: null,
      newStatus: "active",
      actorChurchUserId: 42,
    });
    expect(reviewed).toMatchObject({
      action: "reviewed",
      previousStatus: "active",
      newStatus: "active",
      actorChurchUserId: 55,
    });
    expect(released).toMatchObject({
      action: "released",
      previousStatus: "active",
      newStatus: "released",
    });
    expect(expired).toMatchObject({
      action: "expired",
      previousStatus: "active",
      newStatus: "expired",
      actorChurchUserId: null,
    });
  });

  it("deriva estados do painel sem alterar o estado persistido", () => {
    expect(deriveSecurityAuditHoldState(hold(), baseNow)).toMatchObject({
      status: "active",
      displayState: "active",
      isReviewDue: false,
      isExpired: false,
    });
    expect(
      deriveSecurityAuditHoldState(
        hold({
          expiresAt: new Date("2026-09-22T05:00:00.000Z"),
          reviewDueAt: new Date("2026-09-20T05:00:00.000Z"),
        }),
        baseNow
      )
    ).toMatchObject({
      displayState: "review_due",
      isReviewDue: true,
      isExpired: false,
    });
    expect(
      deriveSecurityAuditHoldState(
        hold({ expiresAt: new Date("2026-09-20T05:00:00.000Z") }),
        baseNow
      )
    ).toMatchObject({
      displayState: "expired_pending",
      isExpired: true,
    });
  });
});

describe("migration 0075", () => {
  const migration = readFileSync(
    new URL("../drizzle/0075_security_access_audit_holds.sql", import.meta.url),
    "utf8"
  );

  it("cria hold tenant-aware com ciclo de vida e índices de consulta", () => {
    expect(migration).toContain("CREATE TABLE security_access_audit_holds");
    expect(migration).toContain(
      "security_access_audit_holds_idempotency_unique"
    );
    expect(migration).toContain(
      "security_access_audit_holds_church_status_expiry_idx"
    );
    expect(migration).toContain("status ENUM('active', 'released', 'expired')");
    expect(migration).toContain("reviewDueAt TIMESTAMP NOT NULL");
    expect(migration).toContain("expiredAt TIMESTAMP NULL");
  });

  it("é aditiva e não contém operações destrutivas ou segredos", () => {
    expect(migration).not.toMatch(/DROP\s+TABLE|DELETE\s+FROM|UPDATE\s+/i);
    expect(migration).not.toMatch(
      /DATABASE_URL|JWT_SECRET|Bearer|Authorization|PRIVATE KEY/i
    );
  });
});

describe("migration customizada e histórico append-only", () => {
  const eventsMigration = readFileSync(
    new URL(
      "../drizzle/0076_security_access_audit_hold_events.sql",
      import.meta.url
    ),
    "utf8"
  );
  const customMigrations = JSON.parse(
    readFileSync(
      new URL("../drizzle/custom-migrations.json", import.meta.url),
      "utf8"
    )
  ) as {
    drizzleJournalBoundary: { idx: number; tag: string };
    entries: Array<{ id: string; file: string; kind: string }>;
  };

  it("cria o histórico append-only com índices por tenant e hold", () => {
    expect(eventsMigration).toContain(
      "CREATE TABLE security_access_audit_hold_events"
    );
    expect(eventsMigration).toContain(
      "security_access_audit_hold_events_hold_occurred_idx"
    );
    expect(eventsMigration).toContain(
      "action ENUM('opened', 'reviewed', 'released', 'expired')"
    );
    expect(eventsMigration).toContain("metadata JSON NULL");
    expect(eventsMigration).not.toMatch(
      /DROP\s+TABLE|DELETE\s+FROM|UPDATE\s+/i
    );
  });

  it("declara a fronteira do journal e as migrations customizadas 0068–0076", () => {
    expect(customMigrations.drizzleJournalBoundary).toEqual({
      idx: 67,
      tag: "0067_closed_blue_shield",
    });
    expect(customMigrations.entries.map(entry => entry.id)).toEqual([
      "0068",
      "0069",
      "0070",
      "0071",
      "0072",
      "0073",
      "0074",
      "0075",
      "0076",
    ]);
    expect(
      customMigrations.entries.every(entry => entry.kind === "custom-additive")
    ).toBe(true);
  });
});
