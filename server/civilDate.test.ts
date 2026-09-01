import { describe, expect, it } from "vitest";
import { formatCivilDateInput, parseCivilDateAsUtcNoon } from "./civilDate";

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
});
