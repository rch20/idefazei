import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const compactSource = (source: string) =>
  source
    .replace(/\s+/g, " ")
    .replace(/\basync\s+\(\s*([A-Za-z_$][\w$]*)\s*\)/g, "async $1")
    .replace(/\(\s*([A-Za-z_$][\w$]*)\s*\)\s*=>/g, "$1 =>")
    .replace(/\s+\./g, ".")
    .replace(/\.\s+/g, ".")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/,\s*}/g, "}")
    .replace(/\s+}/g, "}")
    .trim();
const source = compactSource(
  readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8")
);
const dbSource = compactSource(
  readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8")
);

describe("Escalas — validações de entrada", () => {
  it("valida data de calendário, não apenas o formato", () => {
    expect(source).toContain(
      compactSource("const scheduleDateInput = z.string().trim().regex")
    );
    expect(source).toContain(
      compactSource("Informe uma data de calendário válida.")
    );
    expect(source).toContain(compactSource("scheduledDate: scheduleDateInput"));
  });

  it("limita e normaliza a função da escala também na criação", () => {
    expect(source).toContain(
      compactSource("role: z.string().trim().max(100).optional()")
    );
  });

  it("grava escala individual dentro de transação e trava a Pessoa do mesmo tenant", () => {
    expect(dbSource).toContain(
      compactSource("export async function createScheduleItem")
    );
    expect(dbSource).toContain(
      compactSource("eq(people.churchId, data.churchId)")
    );
    expect(dbSource).toContain('.for("update")');
    expect(dbSource).toContain(
      compactSource(
        "Esta pessoa já possui outra escala em horário sobreposto nesta data."
      )
    );
    expect(source).toContain(
      compactSource("scheduleId = await createScheduleItem")
    );
  });

  it("revalida conflito durante a edição antes de atualizar", () => {
    expect(dbSource).toContain(
      compactSource("export async function updateScheduleItem")
    );
    expect(dbSource).toContain(
      compactSource(
        "item.id !== data.id && hasScheduleTimeOverlap(item, data.startTime, data.endTime)"
      )
    );
    expect(source).toContain(
      compactSource("updated = await updateScheduleItem")
    );
    expect(source).toContain('code: "CONFLICT", message');
  });
});
