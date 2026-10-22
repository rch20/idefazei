import { describe, expect, it } from "vitest";
import { getScheduleDateKey, getScheduleReminderStage, isCareVisitOverdue, isValidInternalJobToken } from "./scheduleReminders";

describe("lembretes internos de Escalas", () => {
  const now = new Date("2026-08-20T12:00:00.000Z");

  it("seleciona a etapa de 24 horas na janela horária correta", () => {
    expect(getScheduleReminderStage(new Date("2026-08-21T12:30:00.000Z"), now)).toBe(24);
  });

  it("seleciona a etapa de 2 horas e ignora horários já iniciados", () => {
    expect(getScheduleReminderStage(new Date("2026-08-20T14:30:00.000Z"), now)).toBe(2);
    expect(getScheduleReminderStage(new Date("2026-08-20T11:59:00.000Z"), now)).toBeNull();
  });

  it("preserva a data civil da Escala ao montar a notificação", () => {
    expect(getScheduleDateKey("2026-08-21")).toBe("2026-08-21");
    expect(getScheduleDateKey(new Date("2026-08-21T12:00:00.000Z"))).toBe("2026-08-21");
  });

  it("aceita somente o segredo local configurado para execução do job", () => {
    expect(isValidInternalJobToken("segredo-correto", "segredo-correto")).toBe(true);
    expect(isValidInternalJobToken("segredo-incorreto", "segredo-correto")).toBe(false);
    expect(isValidInternalJobToken(undefined, "segredo-correto")).toBe(false);
  });
});

describe("lembretes internos de Visitas", () => {
  const now = new Date("2026-08-20T12:00:00.000Z");

  it("reaproveita as mesmas janelas de 24h e 2h para lembrar uma Visita agendada", () => {
    expect(getScheduleReminderStage(new Date("2026-08-21T12:30:00.000Z"), now)).toBe(24);
    expect(getScheduleReminderStage(new Date("2026-08-20T14:30:00.000Z"), now)).toBe(2);
  });

  it("considera atrasada uma Visita agendada cujo horário passou da folga de 3 horas", () => {
    expect(isCareVisitOverdue(new Date("2026-08-20T08:00:00.000Z"), now)).toBe(true); // 4h atrás
    expect(isCareVisitOverdue(new Date("2026-08-20T10:00:00.000Z"), now)).toBe(false); // 2h atrás, ainda na folga
    expect(isCareVisitOverdue(new Date("2026-08-20T13:00:00.000Z"), now)).toBe(false); // ainda não chegou a hora
  });
});
