import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  isNotificationChannelActive: vi.fn(),
  getNotificationEventByDedupeKey: vi.fn(),
  createNotificationEvent: vi.fn(),
  createInternalNotificationDelivery: vi.fn(),
}));

import {
  createInternalNotificationDelivery,
  createNotificationEvent,
  getNotificationEventByDedupeKey,
  isNotificationChannelActive,
} from "./db";
import { emitInternalNotification } from "./notifications";

describe("arquitetura de notificações multi-canal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isNotificationChannelActive).mockResolvedValue(true);
    vi.mocked(getNotificationEventByDedupeKey).mockResolvedValue(null);
    vi.mocked(createNotificationEvent).mockResolvedValue({ id: 11 } as never);
    vi.mocked(createInternalNotificationDelivery).mockResolvedValue(undefined);
  });

  it("separa o evento dos destinatários e entrega somente pelo canal interno ativo", async () => {
    const result = await emitInternalNotification({
      churchId: 100,
      type: "cadastro_pendente",
      recipientChurchUserIds: [4, 4, 8],
      title: "Novo cadastro",
      body: "Há uma nova solicitação aguardando aprovação.",
      entityType: "church_user",
      entityId: 19,
      dedupeKey: "cadastro-pendente-19",
    });

    expect(result).toEqual({ created: true, eventId: 11, deliveries: 2 });
    expect(createNotificationEvent).toHaveBeenCalledWith(expect.objectContaining({ churchId: 100, type: "cadastro_pendente", entityId: 19 }));
    expect(createInternalNotificationDelivery).toHaveBeenCalledTimes(2);
    expect(createInternalNotificationDelivery).toHaveBeenCalledWith({ churchId: 100, eventId: 11, recipientChurchUserId: 4 });
    expect(createInternalNotificationDelivery).toHaveBeenCalledWith({ churchId: 100, eventId: 11, recipientChurchUserId: 8 });
  });

  it("não repete um evento com a mesma chave de deduplicação", async () => {
    vi.mocked(getNotificationEventByDedupeKey).mockResolvedValue({ id: 11 } as never);

    const result = await emitInternalNotification({
      churchId: 100,
      type: "encaminhamento_sem_aceite",
      recipientChurchUserIds: [4],
      title: "Encaminhamento pendente",
      body: "Aguardando aceite.",
      dedupeKey: "encaminhamento-sem-aceite-33",
    });

    expect(result).toEqual({ created: false, eventId: 11, deliveries: 0 });
    expect(createNotificationEvent).not.toHaveBeenCalled();
    expect(createInternalNotificationDelivery).not.toHaveBeenCalled();
  });
});
