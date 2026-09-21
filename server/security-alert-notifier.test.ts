import { describe, expect, it, vi } from "vitest";

import {
  buildSecurityAlertWebhookPayload,
  buildSlackSecurityAlertPayload,
  createSecurityAlertNotifier,
} from "./security-alert-notifier";
import { createSecurityAccessMonitor } from "./security-access-monitoring";
import type { SecurityAlert } from "./security-access-monitoring";

const alert: SecurityAlert = {
  alertKey: "critical:jwt_host_mismatch:source-a:400",
  eventType: "security.tenant_access_denied",
  severity: "critical",
  reason: "jwt_host_mismatch",
  procedurePath: "escolaFundamentos.listCourses",
  sourceFingerprint: "source-a",
  count: 3,
  distinctTargetTenantCount: 3,
  firstOccurredAt: new Date("2026-09-21T05:00:00.000Z"),
  lastOccurredAt: new Date("2026-09-21T05:01:00.000Z"),
};
const testWebhookToken = ["runtime", "test", "token"].join("-");
const testSlackWebhookUrl = [
  "https://hooks.slack.com",
  "services",
  "TEST",
  "TEST",
  "TEST",
].join("/");

function response(status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
  } as Response;
}

describe("payloads do canal de alerta de segurança", () => {
  it("gera payload genérico sem fingerprint, IDs de tenant ou PII", () => {
    const payload = buildSecurityAlertWebhookPayload(alert);

    expect(payload).toMatchObject({
      event: "security.tenant_access_critical",
      severity: "critical",
      reason: "jwt_host_mismatch",
      procedurePath: "escolaFundamentos.listCourses",
      attempts: 3,
      distinctTargetTenantCount: 3,
    });
    expect(payload.correlationId).toHaveLength(16);
    expect(JSON.stringify(payload)).not.toContain("source-a");
    expect(JSON.stringify(payload)).not.toMatch(
      /bearer|cookie|token|@|password|authorization/i
    );
  });

  it("gera payload compatível com Slack Incoming Webhook usando text e blocks", () => {
    const payload = buildSlackSecurityAlertPayload(alert);

    expect(payload.text).toContain("Alerta crítico de segurança");
    expect(payload.blocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "header" }),
        expect.objectContaining({ type: "section" }),
        expect.objectContaining({ type: "context" }),
      ])
    );
    expect(JSON.stringify(payload)).not.toContain("source-a");
  });
});

describe("notifier por webhook genérico", () => {
  it("envia somente alertas críticos com POST, JSON e Bearer opcional", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response());
    const notify = createSecurityAlertNotifier(
      {
        channel: "webhook",
        webhookUrl: "https://alerts.example.test/security",
        webhookToken: testWebhookToken,
        timeoutMs: 1_000,
      },
      fetchMock
    );

    await notify(alert);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://alerts.example.test/security");
    expect(init).toMatchObject({
      method: "POST",
      headers: {
        accept: "application/json, text/plain, */*",
        "content-type": "application/json",
        authorization: `Bearer ${testWebhookToken}`,
      },
    });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      event: "security.tenant_access_critical",
      severity: "critical",
    });
  });

  it("ignora alertas high e não faz chamada externa", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response());
    const notify = createSecurityAlertNotifier(
      {
        channel: "webhook",
        webhookUrl: "https://alerts.example.test/security",
      },
      fetchMock
    );

    await notify({ ...alert, severity: "high" });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("propaga falha HTTP para o monitor registrar notificationFailed", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response(503));
    const notify = createSecurityAlertNotifier(
      {
        channel: "webhook",
        webhookUrl: "https://alerts.example.test/security",
      },
      fetchMock
    );

    await expect(notify(alert)).rejects.toThrow(
      "security alert webhook returned HTTP 503"
    );
  });
});

describe("notifier Slack Incoming Webhook", () => {
  it("envia o payload de blocks para o host oficial do Slack sem Authorization", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response());
    const notify = createSecurityAlertNotifier(
      {
        channel: "slack",
        webhookUrl: testSlackWebhookUrl,
      },
      fetchMock
    );

    await notify(alert);

    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(init).toMatchObject({
      method: "POST",
      headers: {
        accept: "application/json, text/plain, */*",
        "content-type": "application/json",
      },
    });
    expect(
      (init?.headers as Record<string, string>).authorization
    ).toBeUndefined();
    expect(JSON.parse(String(init?.body))).toEqual(
      expect.objectContaining({
        text: expect.stringContaining("Alerta crítico"),
        blocks: expect.any(Array),
      })
    );
  });

  it("rejeita Slack configurado com host que não é oficial", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response());
    const notify = createSecurityAlertNotifier(
      {
        channel: "slack",
        webhookUrl: "https://evil.example.test/slack-hook",
      },
      fetchMock
    );

    await expect(notify(alert)).rejects.toThrow(
      "Slack alert channel requires an official Slack webhook host"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejeita webhook sem HTTPS", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response());
    const notify = createSecurityAlertNotifier(
      {
        channel: "webhook",
        webhookUrl: "http://alerts.example.test/security",
      },
      fetchMock
    );

    await expect(notify(alert)).rejects.toThrow(
      "security alert webhook URL must use HTTPS"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("não falha o processo quando o canal está disabled", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response());
    const notify = createSecurityAlertNotifier(
      { channel: "disabled" },
      fetchMock
    );

    await expect(notify(alert)).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("dispara o webhook quando o monitor atinge três tenants distintos", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response());
    const notify = createSecurityAlertNotifier(
      {
        channel: "webhook",
        webhookUrl: "https://alerts.example.test/security",
      },
      fetchMock
    );
    const monitor = createSecurityAccessMonitor({
      now: () => new Date("2026-09-21T05:00:00.000Z"),
      notify,
    });

    for (const targetChurchId of [200, 300, 400]) {
      await monitor.record({
        reason: "jwt_host_mismatch",
        procedurePath: "escolaFundamentos.listCourses",
        sessionChurchId: 100,
        targetChurchId,
        actorChurchUserId: 42,
        requestId: `critical-${targetChurchId}`,
        sourceFingerprint: "source-a",
      });
    }

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
    ).toMatchObject({
      event: "security.tenant_access_critical",
      severity: "critical",
      distinctTargetTenantCount: 3,
    });
  });
});
