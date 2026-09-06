import { describe, expect, it } from "vitest";
import { civilDateKey, formatCivilDate, formatCivilDateKeyForInput } from "./civilDate";

describe("civilDate", () => {
  it("preserva a data YYYY-MM-DD recebida do banco sem converter para o fuso local", () => {
    expect(civilDateKey("2026-09-13")).toBe("2026-09-13");
    expect(formatCivilDateKeyForInput("2026-09-13")).toBe("2026-09-13");
  });

  it("preserva a data quando o backend serializa DATE como meia-noite UTC", () => {
    expect(civilDateKey(new Date("2026-09-13T00:00:00.000Z"))).toBe("2026-09-13");
    expect(formatCivilDate(new Date("2026-09-13T00:00:00.000Z"))).toBe("13/09/2026");
  });

  it("formata a data civil no resumo sem mostrar o dia anterior", () => {
    expect(formatCivilDate("2026-09-13", { weekday: "short", day: "2-digit", month: "short" })).toContain("13");
  });
});
