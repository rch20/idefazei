import { describe, expect, it } from "vitest";
import { selectFoundationWeeklyStudy } from "./db";

type Fixture = { id: number; title: string; weekStart: string | null; position: number };

const study = (id: number, title: string, weekStart: string | null, position: number): Fixture => ({ id, title, weekStart, position });

describe("seleção da semana atual de Fundamentos", () => {
  it("escolhe a maior weekStart vencida, independentemente da posição editorial", () => {
    const selected = selectFoundationWeeklyStudy([
      study(1, "Semana 01", "2026-09-06", 2),
      study(2, "Semana 03", "2026-09-20", 0),
      study(3, "Semana 02", "2026-09-13", 1),
    ], "2026-09-21");

    expect(selected?.title).toBe("Semana 03");
  });

  it("não escolhe estudo futuro", () => {
    const selected = selectFoundationWeeklyStudy([
      study(1, "Semana futura", "2026-09-27", 0),
    ], "2026-09-21");

    expect(selected).toBeNull();
  });

  it("usa o estudo legado sem weekStart somente quando não há estudo semanal vencido", () => {
    const selected = selectFoundationWeeklyStudy([
      study(1, "Legado inicial", null, 0),
      study(2, "Legado mais recente", null, 1),
      study(3, "Semana futura", "2026-09-27", 2),
    ], "2026-09-21");

    expect(selected?.title).toBe("Legado mais recente");
  });

  it("prioriza estudo semanal vencido sobre qualquer registro legado", () => {
    const selected = selectFoundationWeeklyStudy([
      study(1, "Legado", null, 4),
      study(2, "Semana atual", "2026-09-20", 0),
    ], "2026-09-21");

    expect(selected?.title).toBe("Semana atual");
  });
});
