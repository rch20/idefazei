import { describe, expect, it } from "vitest";
import { civilDateKey, civilDateParts, currentCivilDateKey, formatCivilDate, formatCivilDateKeyForInput } from "./civilDate";

describe("civilDate", () => {
  it("preserva a data YYYY-MM-DD recebida do banco sem converter para o fuso local", () => {
    expect(civilDateKey("2026-09-22")).toBe("2026-09-22");
    expect(civilDateParts("2026-09-22")).toEqual({ year: 2026, month: 9, day: 22 });
    expect(formatCivilDateKeyForInput("2026-09-22")).toBe("2026-09-22");
    expect(formatCivilDate("2026-09-22", { day: "2-digit", month: "long" })).toContain("22");
  });

  it("preserva a data quando o backend serializa DATE como meia-noite UTC", () => {
    expect(civilDateKey(new Date("2026-09-13T00:00:00.000Z"))).toBe("2026-09-13");
    expect(formatCivilDate(new Date("2026-09-13T00:00:00.000Z"))).toBe("13/09/2026");
  });

  it("calcula hoje no calendário de São Paulo na virada do UTC", () => {
    expect(currentCivilDateKey("America/Sao_Paulo", new Date("2026-09-01T02:00:00.000Z"))).toBe("2026-08-31");
    expect(currentCivilDateKey("America/Sao_Paulo", new Date("2026-09-01T03:00:00.000Z"))).toBe("2026-09-01");
  });

  it("formata a data civil no resumo sem mostrar o dia anterior", () => {
    expect(formatCivilDate("2026-09-13", { weekday: "short", day: "2-digit", month: "short" })).toContain("13");
  });
});
