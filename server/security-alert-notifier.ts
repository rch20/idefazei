import { createHash } from "node:crypto";

import { ENV } from "./_core/env";
import type {
  SecurityAlert,
  SecurityAlertNotifier,
} from "./security-access-monitoring";

export type SecurityAlertChannel = "disabled" | "webhook" | "slack";

export type SecurityAlertNotifierConfig = {
  channel: SecurityAlertChannel;
  webhookUrl?: string;
  webhookToken?: string;
  timeoutMs?: number;
};

export type SecurityAlertWebhookPayload = {
  event: "security.tenant_access_critical";
  severity: "critical";
  correlationId: string;
  reason: SecurityAlert["reason"];
  procedurePath: string;
  attempts: number;
  distinctTargetTenantCount: number;
  firstOccurredAt: string;
  lastOccurredAt: string;
};

type SlackTextObject = {
  type: "plain_text" | "mrkdwn";
  text: string;
};

type SlackWebhookPayload = {
  text: string;
  blocks: Array<
    | { type: "header"; text: SlackTextObject }
    | { type: "section"; fields: SlackTextObject[] }
    | { type: "context"; elements: SlackTextObject[] }
  >;
};

type FetchLike = typeof fetch;

const DEFAULT_TIMEOUT_MS = 5_000;
const MIN_TIMEOUT_MS = 250;
const MAX_TIMEOUT_MS = 15_000;
const SLACK_WEBHOOK_HOSTS = new Set(["hooks.slack.com", "hooks.slack-gov.com"]);

function toCorrelationId(alert: SecurityAlert): string {
  return createHash("sha256").update(alert.alertKey).digest("hex").slice(0, 16);
}

function parseTimeoutMs(value: number | undefined): number {
  if (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_TIMEOUT_MS &&
    value <= MAX_TIMEOUT_MS
  ) {
    return value;
  }
  return DEFAULT_TIMEOUT_MS;
}

function validateHttpsEndpoint(
  channel: Exclude<SecurityAlertChannel, "disabled">,
  rawUrl: string | undefined
): { url: string | null; error: string | null } {
  if (!rawUrl?.trim()) {
    return { url: null, error: "security alert webhook URL is not configured" };
  }

  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") {
      return { url: null, error: "security alert webhook URL must use HTTPS" };
    }
    if (channel === "slack" && !SLACK_WEBHOOK_HOSTS.has(url.hostname)) {
      return {
        url: null,
        error: "Slack alert channel requires an official Slack webhook host",
      };
    }
    return { url: url.toString(), error: null };
  } catch {
    return { url: null, error: "security alert webhook URL is invalid" };
  }
}

export function getSecurityAlertNotifierConfigFromEnv(): SecurityAlertNotifierConfig {
  const channel: SecurityAlertChannel =
    ENV.securityAlertChannel === "slack"
      ? "slack"
      : ENV.securityAlertChannel === "webhook"
        ? "webhook"
        : "disabled";
  const parsedTimeout = Number(ENV.securityAlertTimeoutMs);

  return {
    channel,
    webhookUrl: ENV.securityAlertWebhookUrl || undefined,
    webhookToken: ENV.securityAlertWebhookToken || undefined,
    timeoutMs: Number.isFinite(parsedTimeout) ? parsedTimeout : undefined,
  };
}

export function buildSecurityAlertWebhookPayload(
  alert: SecurityAlert
): SecurityAlertWebhookPayload {
  return {
    event: "security.tenant_access_critical",
    severity: "critical",
    correlationId: toCorrelationId(alert),
    reason: alert.reason,
    procedurePath: alert.procedurePath,
    attempts: alert.count,
    distinctTargetTenantCount: alert.distinctTargetTenantCount,
    firstOccurredAt: alert.firstOccurredAt.toISOString(),
    lastOccurredAt: alert.lastOccurredAt.toISOString(),
  };
}

export function buildSlackSecurityAlertPayload(
  alert: SecurityAlert
): SlackWebhookPayload {
  const payload = buildSecurityAlertWebhookPayload(alert);
  const summary = `Alerta crítico de segurança no Ide Fazei: ${payload.reason}`;

  return {
    text: summary,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "Alerta crítico de segurança",
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Evento:*\n${payload.event}` },
          { type: "mrkdwn", text: `*Motivo:*\n${payload.reason}` },
          {
            type: "mrkdwn",
            text: `*Tentativas:*\n${payload.attempts}`,
          },
          {
            type: "mrkdwn",
            text: `*Tenants atingidos:*\n${payload.distinctTargetTenantCount}`,
          },
          {
            type: "mrkdwn",
            text: `*Procedure:*\n\`${payload.procedurePath}\``,
          },
          {
            type: "mrkdwn",
            text: `*Correlação:*\n\`${payload.correlationId}\``,
          },
        ],
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Janela encerrada em ${payload.lastOccurredAt}. Não contém tokens, cookies, e-mails ou IDs de pessoas.`,
          },
        ],
      },
    ],
  };
}

export function createSecurityAlertNotifier(
  config: SecurityAlertNotifierConfig,
  fetchImpl: FetchLike = globalThis.fetch
): SecurityAlertNotifier {
  if (config.channel === "disabled") {
    return async () => undefined;
  }

  const endpoint = validateHttpsEndpoint(config.channel, config.webhookUrl);
  const timeoutMs = parseTimeoutMs(config.timeoutMs);

  return async alert => {
    // O canal externo recebe apenas o limiar crítico. Alertas high permanecem
    // disponíveis para persistência e investigação interna.
    if (alert.severity !== "critical") return;

    if (!endpoint.url || endpoint.error) {
      throw new Error(
        endpoint.error ?? "security alert webhook is unavailable"
      );
    }

    const body =
      config.channel === "slack"
        ? buildSlackSecurityAlertPayload(alert)
        : buildSecurityAlertWebhookPayload(alert);
    const headers: Record<string, string> = {
      accept: "application/json, text/plain, */*",
      "content-type": "application/json",
    };
    if (config.channel === "webhook" && config.webhookToken?.trim()) {
      headers.authorization = `Bearer ${config.webhookToken.trim()}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(endpoint.url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(
          `security alert webhook returned HTTP ${response.status}`
        );
      }
    } finally {
      clearTimeout(timeout);
    }
  };
}

export function createSecurityAlertNotifierFromEnv(
  fetchImpl: FetchLike = globalThis.fetch
): SecurityAlertNotifier {
  return createSecurityAlertNotifier(
    getSecurityAlertNotifierConfigFromEnv(),
    fetchImpl
  );
}
