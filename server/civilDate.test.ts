import { describe, expect, it } from "vitest";
import { currentCivilDateAsUtcNoon, formatCivilDateInput, normalizeCivilTime, parseCivilDateAsUtcNoon } from "./civilDate";

describe("datas civis de Eventos", () => {
  it("interpreta 19/09 como o dia 19 sem depender do fuso do processo", () => {
    const parsed = parseCivilDateAsUtcNoon("2026-09-19");
    expect(parsed?.toISOString()).toBe("2026-09-19T12:00:00.000Z");
    expect(parsed && formatCivilDateInput(parsed)).toBe("2026-09-19");
  });

  it("rejeita datas inexistentes e formatos com horário misturado", () => {
    expect(parseCivilDateAsUtcNoon("2026-02-30")).toBeNull();
    expect(parseCivilDateAsUtcNoon("2026-09-19T00:00:00.000Z")).toBeNull();
    expect(parseCivilDateAsUtcNoon("")).toBeNull();
  });

  it("normaliza horários no formato HH:mm sem aplicar fuso", () => {
    expect(normalizeCivilTime("19:30")).toBe("19:30");
    expect(normalizeCivilTime("24:00")).toBeNull();
    expect(normalizeCivilTime("19:3")).toBeNull();
    expect(normalizeCivilTime("")).toBeNull();
  });

  it("considera a data civil de São Paulo na virada do UTC", () => {
    const current = currentCivilDateAsUtcNoon("America/Sao_Paulo", new Date("2026-09-01T02:00:00.000Z"));
    expect(formatCivilDateInput(current)).toBe("2026-08-31");
  });
});
