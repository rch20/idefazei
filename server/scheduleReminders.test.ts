import { describe, expect, it } from "vitest";
import { getScheduleDateKey, getScheduleReminderStage } from "./scheduleReminders";

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
});
