import { describe, expect, it, vi } from "vitest";

import {
  buildSecurityAccessEvent,
  createSecurityAccessMonitor,
  type SecurityAlert,
} from "./security-access-monitoring";

const BASE_TIME = new Date("2026-09-21T05:00:00.000Z");

function createClock() {
  let current = new Date(BASE_TIME);
  return {
    now: () => new Date(current),
    advance: (milliseconds: number) => {
      current = new Date(current.getTime() + milliseconds);
    },
  };
}

function deniedInput(
  overrides: Partial<Parameters<typeof buildSecurityAccessEvent>[0]> = {}
) {
  return {
    reason: "jwt_host_mismatch" as const,
    procedurePath: "escolaFundamentos.listCourses",
    sessionChurchId: 100,
    targetChurchId: 200,
    actorChurchUserId: 42,
    requestId: "req-2026-0001",
    sourceFingerprint: "source-a",
    ...overrides,
  };
}

describe("registro de eventos de segurança tenant-aware", () => {
  it("produz um evento mínimo sem token, cookie, email ou payload sensível", () => {
    const event = buildSecurityAccessEvent(
      deniedInput({
        requestId: "req-safe-1",
        sourceFingerprint: "fp-safe-1",
      }),
      BASE_TIME
    );

    expect(event).toEqual({
      eventType: "security.tenant_access_denied",
      reason: "jwt_host_mismatch",
      procedurePath: "escolaFundamentos.listCourses",
      sessionChurchId: 100,
      targetChurchId: 200,
      actorChurchUserId: 42,
      requestId: "req-safe-1",
      sourceFingerprint: "fp-safe-1",
      occurredAt: BASE_TIME,
      severity: "warning",
    });

    expect(JSON.stringify(event)).not.toMatch(
      /bearer|cookie|token|@|password|authorization/i
    );
  });

  it("normaliza IDs inválidos, identificadores inseguros e caminho de procedure", () => {
    const event = buildSecurityAccessEvent(
      deniedInput({
        procedurePath: "escolaFundamentos.listCourses\nBearer secret",
        sessionChurchId: -1,
        targetChurchId: 0,
        actorChurchUserId: Number.NaN,
        requestId: "email@example.com",
        sourceFingerprint: "fingerprint with spaces",
      }),
      BASE_TIME
    );

    expect(event.sessionChurchId).toBeNull();
    expect(event.targetChurchId).toBeNull();
    expect(event.actorChurchUserId).toBeNull();
    expect(event.requestId).toBeNull();
    expect(event.sourceFingerprint).toBeNull();
    expect(event.procedurePath).toBe("unknown");
  });

  it("mantém o evento mesmo quando não existe fingerprint para correlação", async () => {
    const clock = createClock();
    const notify = vi
      .fn<(alert: SecurityAlert) => Promise<void>>()
      .mockResolvedValue(undefined);
    const monitor = createSecurityAccessMonitor({ now: clock.now, notify });

    const result = await monitor.record(
      deniedInput({ sourceFingerprint: null })
    );

    expect(result.alert).toBeNull();
    expect(result.notificationFailed).toBe(false);
    expect(monitor.getEvents()).toHaveLength(1);
    expect(notify).not.toHaveBeenCalled();
  });
});

describe("limiares e disparo de alertas", () => {
  it("dispara alerta high após cinco tentativas correlacionadas no mesmo tenant", async () => {
    const clock = createClock();
    const notify = vi
      .fn<(alert: SecurityAlert) => Promise<void>>()
      .mockResolvedValue(undefined);
    const monitor = createSecurityAccessMonitor({ now: clock.now, notify });

    for (let index = 0; index < 4; index += 1) {
      const result = await monitor.record(
        deniedInput({ requestId: `req-${index}` })
      );
      expect(result.alert).toBeNull();
    }

    const result = await monitor.record(deniedInput({ requestId: "req-4" }));

    expect(result.alert).toMatchObject({
      severity: "high",
      reason: "jwt_host_mismatch",
      count: 5,
      distinctTargetTenantCount: 1,
      sourceFingerprint: "source-a",
    });
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it("dispara alerta critical quando a mesma origem tenta atingir três tenants", async () => {
    const clock = createClock();
    const notify = vi
      .fn<(alert: SecurityAlert) => Promise<void>>()
      .mockResolvedValue(undefined);
    const monitor = createSecurityAccessMonitor({ now: clock.now, notify });

    await monitor.record(deniedInput({ targetChurchId: 200 }));
    await monitor.record(deniedInput({ targetChurchId: 300 }));
    const result = await monitor.record(deniedInput({ targetChurchId: 400 }));

    expect(result.alert).toMatchObject({
      severity: "critical",
      count: 3,
      distinctTargetTenantCount: 3,
      sourceFingerprint: "source-a",
    });
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it("deduplica o alerta critical mesmo quando a quarta tentativa mira outro tenant", async () => {
    const clock = createClock();
    const notify = vi
      .fn<(alert: SecurityAlert) => Promise<void>>()
      .mockResolvedValue(undefined);
    const monitor = createSecurityAccessMonitor({ now: clock.now, notify });

    await monitor.record(deniedInput({ targetChurchId: 200 }));
    await monitor.record(deniedInput({ targetChurchId: 300 }));
    await monitor.record(deniedInput({ targetChurchId: 400 }));
    const result = await monitor.record(deniedInput({ targetChurchId: 500 }));

    expect(result.alert).toBeNull();
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it("não dispara alerta antes do limiar configurado", async () => {
    const clock = createClock();
    const notify = vi
      .fn<(alert: SecurityAlert) => Promise<void>>()
      .mockResolvedValue(undefined);
    const monitor = createSecurityAccessMonitor({
      now: clock.now,
      notify,
      policy: { highThreshold: 3 },
    });

    await monitor.record(deniedInput({ targetChurchId: 200 }));
    const result = await monitor.record(deniedInput({ targetChurchId: 201 }));

    expect(result.alert).toBeNull();
    expect(notify).not.toHaveBeenCalled();
  });

  it("não usa tentativas contra outro tenant para atingir o high do tenant atual", async () => {
    const clock = createClock();
    const notify = vi
      .fn<(alert: SecurityAlert) => Promise<void>>()
      .mockResolvedValue(undefined);
    const monitor = createSecurityAccessMonitor({
      now: clock.now,
      notify,
      policy: { highThreshold: 3 },
    });

    await monitor.record(deniedInput({ targetChurchId: 200 }));
    await monitor.record(deniedInput({ targetChurchId: 200 }));
    await monitor.record(deniedInput({ targetChurchId: 201 }));

    expect(notify).not.toHaveBeenCalled();
  });

  it("não mistura eventos de origens diferentes na mesma contagem", async () => {
    const clock = createClock();
    const notify = vi
      .fn<(alert: SecurityAlert) => Promise<void>>()
      .mockResolvedValue(undefined);
    const monitor = createSecurityAccessMonitor({ now: clock.now, notify });

    for (let index = 0; index < 4; index += 1) {
      await monitor.record(
        deniedInput({ sourceFingerprint: `source-${index}` })
      );
    }
    const result = await monitor.record(
      deniedInput({ sourceFingerprint: "source-final" })
    );

    expect(result.alert).toBeNull();
    expect(notify).not.toHaveBeenCalled();
  });
});

describe("deduplicação e janela temporal", () => {
  it("deduplica o mesmo alerta durante o cooldown", async () => {
    const clock = createClock();
    const notify = vi
      .fn<(alert: SecurityAlert) => Promise<void>>()
      .mockResolvedValue(undefined);
    const monitor = createSecurityAccessMonitor({ now: clock.now, notify });

    for (let index = 0; index < 5; index += 1) {
      await monitor.record(deniedInput({ requestId: `first-${index}` }));
    }
    clock.advance(60_000);
    const result = await monitor.record(
      deniedInput({ requestId: "during-cooldown" })
    );

    expect(result.alert).toBeNull();
    expect(notify).toHaveBeenCalledTimes(1);
    expect(monitor.getAlertHistory()).toHaveLength(1);
  });

  it("permite um novo alerta após o cooldown, sem apagar os eventos recentes", async () => {
    const clock = createClock();
    const notify = vi
      .fn<(alert: SecurityAlert) => Promise<void>>()
      .mockResolvedValue(undefined);
    const monitor = createSecurityAccessMonitor({ now: clock.now, notify });

    for (let index = 0; index < 5; index += 1) {
      await monitor.record(deniedInput({ requestId: `before-${index}` }));
    }
    clock.advance(15 * 60_000);
    let result;
    for (let index = 0; index < 5; index += 1) {
      result = await monitor.record(
        deniedInput({ requestId: `after-${index}` })
      );
    }

    expect(result?.alert).toMatchObject({ severity: "high", count: 5 });
    expect(notify).toHaveBeenCalledTimes(2);
    expect(monitor.getEvents()).toHaveLength(5);
  });

  it("remove eventos fora da janela de agregação", async () => {
    const clock = createClock();
    const notify = vi
      .fn<(alert: SecurityAlert) => Promise<void>>()
      .mockResolvedValue(undefined);
    const monitor = createSecurityAccessMonitor({ now: clock.now, notify });

    await monitor.record(deniedInput({ requestId: "old" }));
    clock.advance(10 * 60_000 + 1);
    await monitor.record(deniedInput({ requestId: "new" }));

    expect(monitor.getEvents()).toHaveLength(1);
    expect(monitor.getEvents()[0]?.requestId).toBe("new");
  });
});

describe("falhas do canal de alerta", () => {
  it("não transforma falha do notifier em falha do registro do evento", async () => {
    const clock = createClock();
    const notify = vi
      .fn<(alert: SecurityAlert) => Promise<void>>()
      .mockRejectedValue(new Error("canal indisponível"));
    const monitor = createSecurityAccessMonitor({ now: clock.now, notify });

    for (let index = 0; index < 4; index += 1) {
      await monitor.record(deniedInput({ requestId: `failed-${index}` }));
    }
    const result = await monitor.record(deniedInput({ requestId: "failed-4" }));

    expect(result.alert).toMatchObject({ severity: "high" });
    expect(result.notificationFailed).toBe(true);
    expect(monitor.getEvents()).toHaveLength(5);
    expect(monitor.getAlertHistory()).toHaveLength(1);
  });

  it("não envia alertas para uma origem sem fingerprint, mesmo com várias tentativas", async () => {
    const clock = createClock();
    const notify = vi
      .fn<(alert: SecurityAlert) => Promise<void>>()
      .mockResolvedValue(undefined);
    const monitor = createSecurityAccessMonitor({ now: clock.now, notify });

    for (let index = 0; index < 10; index += 1) {
      await monitor.record(
        deniedInput({
          sourceFingerprint: null,
          requestId: `anonymous-${index}`,
        })
      );
    }

    expect(notify).not.toHaveBeenCalled();
    expect(monitor.getEvents()).toHaveLength(10);
  });
});
