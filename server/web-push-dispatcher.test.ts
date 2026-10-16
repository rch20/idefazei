import { beforeEach, describe, expect, it, vi } from "vitest";

const sendNotification = vi.fn();
const setVapidDetails = vi.fn();

vi.mock("web-push", () => ({
  default: { sendNotification, setVapidDetails },
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getActiveWebPushSubscriptionsByChurchUsers: vi.fn(),
    revokeWebPushSubscription: vi.fn(),
  };
});

import { getActiveWebPushSubscriptionsByChurchUsers, revokeWebPushSubscription } from "./db";

const subscription = {
  id: 1,
  churchId: 100,
  churchUserId: 2,
  endpoint: "https://push.example.test/subscription/abc",
  p256dh: "p".repeat(32),
  auth: "a".repeat(16),
};

describe("dispatchWebPush", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("VAPID_PUBLIC_KEY", "public-key");
    vi.stubEnv("VAPID_PRIVATE_KEY", "private-key");
    vi.stubEnv("VAPID_SUBJECT", "mailto:push@idefazei.com.br");
    vi.mocked(getActiveWebPushSubscriptionsByChurchUsers).mockResolvedValue([subscription]);
    vi.mocked(revokeWebPushSubscription).mockResolvedValue(true);
    sendNotification.mockResolvedValue({ statusCode: 201 });
  });

  it("envia apenas para subscriptions ativas do churchId e destinatários resolvidos", async () => {
    const { dispatchWebPush } = await import("./webPush");
    const result = await dispatchWebPush({
      churchId: 100,
      recipientChurchUserIds: [2, 2, 0],
      title: "Novo encontro",
      body: "A reunião foi registrada.",
      url: "/app/celulas?cellId=5",
      entityType: "cell_meeting",
      entityId: 8,
      dedupeKey: "celula-encontro-registrado:8",
    });

    expect(getActiveWebPushSubscriptionsByChurchUsers).toHaveBeenCalledWith({ churchId: 100, churchUserIds: [2] });
    expect(setVapidDetails).toHaveBeenCalledWith("mailto:push@idefazei.com.br", "public-key", "private-key");
    expect(sendNotification).toHaveBeenCalledTimes(1);
    expect(sendNotification.mock.calls[0]?.[0]).toMatchObject({ endpoint: subscription.endpoint });
    expect(JSON.parse(String(sendNotification.mock.calls[0]?.[1])).data).toMatchObject({ entityType: "cell_meeting", entityId: 8, dedupeKey: "celula-encontro-registrado:8" });
    expect(result).toMatchObject({ attempted: 1, sent: 1, revoked: 0, failed: 0, skipped: false });
  });

  it("revoga automaticamente subscriptions rejeitadas como expiradas", async () => {
    sendNotification.mockRejectedValueOnce({ statusCode: 410 });
    const { dispatchWebPush } = await import("./webPush");

    const result = await dispatchWebPush({
      churchId: 100,
      recipientChurchUserIds: [2],
      title: "Escala alterada",
      body: "Confira a nova escala.",
      dedupeKey: "escala-alterada:9",
    });

    expect(revokeWebPushSubscription).toHaveBeenCalledWith({ churchId: 100, churchUserId: 2, endpoint: subscription.endpoint });
    expect(result).toMatchObject({ attempted: 1, sent: 0, revoked: 1, failed: 0, skipped: false });
  });
});
