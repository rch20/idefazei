import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dispatchWebPush: vi.fn(),
  createInternalNotificationDelivery: vi.fn(),
  createNotificationEvent: vi.fn(),
  getNotificationEventByDedupeKey: vi.fn(),
  isNotificationChannelActive: vi.fn(),
}));

vi.mock("./webPush", () => ({ dispatchWebPush: mocks.dispatchWebPush }));
vi.mock("./db", () => ({
  createInternalNotificationDelivery: mocks.createInternalNotificationDelivery,
  createNotificationEvent: mocks.createNotificationEvent,
  getNotificationEventByDedupeKey: mocks.getNotificationEventByDedupeKey,
  isNotificationChannelActive: mocks.isNotificationChannelActive,
}));

import { emitInternalNotification } from "./notifications";

describe("emitInternalNotification com Push opcional", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isNotificationChannelActive.mockResolvedValue(true);
    mocks.getNotificationEventByDedupeKey.mockResolvedValue(null);
    mocks.createNotificationEvent.mockResolvedValue({ id: 77 });
    mocks.createInternalNotificationDelivery.mockResolvedValue(undefined);
    mocks.dispatchWebPush.mockResolvedValue({ attempted: 1, sent: 1, revoked: 0, failed: 0, skipped: false });
  });

  it("grava primeiro no sino e dispara Push somente quando o gatilho opta por Push", async () => {
    const result = await emitInternalNotification({
      churchId: 100,
      type: "escala_atribuida",
      recipientChurchUserIds: [2, 2, 0, -1],
      title: "Nova escala",
      body: "Confira sua escala.",
      entityType: "schedule_item",
      entityId: 10,
      dedupeKey: "escala-atribuida:10",
      url: "/app/escalas?ministerio=4",
      push: true,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(result).toEqual({ created: true, eventId: 77, deliveries: 1 });
    expect(mocks.createInternalNotificationDelivery).toHaveBeenCalledWith({ churchId: 100, eventId: 77, recipientChurchUserId: 2 });
    expect(mocks.dispatchWebPush).toHaveBeenCalledWith(expect.objectContaining({ churchId: 100, recipientChurchUserIds: [2], dedupeKey: "escala-atribuida:10", url: "/app/escalas?ministerio=4" }));
  });

  it("mantém o fallback interno e não envia Push quando o gatilho não opta pelo canal externo", async () => {
    await emitInternalNotification({
      churchId: 100,
      type: "comunicado_lideranca",
      recipientChurchUserIds: [2],
      title: "Aviso interno",
      body: "Somente no sino.",
      dedupeKey: "aviso-interno:1",
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mocks.createInternalNotificationDelivery).toHaveBeenCalledTimes(1);
    expect(mocks.dispatchWebPush).not.toHaveBeenCalled();
  });

  it("não duplica evento nem Push quando o dedupeKey já existe", async () => {
    mocks.getNotificationEventByDedupeKey.mockResolvedValue({ id: 55 });

    await expect(emitInternalNotification({
      churchId: 100,
      type: "celula_encontro_registrado",
      recipientChurchUserIds: [2],
      title: "Encontro",
      body: "Registrado.",
      dedupeKey: "celula-encontro-registrado:55",
      push: true,
    })).resolves.toEqual({ created: false, eventId: 55, deliveries: 0 });

    expect(mocks.createNotificationEvent).not.toHaveBeenCalled();
    expect(mocks.createInternalNotificationDelivery).not.toHaveBeenCalled();
    expect(mocks.dispatchWebPush).not.toHaveBeenCalled();
  });
});
