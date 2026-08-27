import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");

describe("Escalas — validações de entrada", () => {
  it("valida data de calendário, não apenas o formato", () => {
    expect(source).toContain("const scheduleDateInput = z.string().trim().regex");
    expect(source).toContain("Informe uma data de calendário válida.");
    expect(source).toContain("scheduledDate: scheduleDateInput");
  });

  it("limita e normaliza a função da escala também na criação", () => {
    expect(source).toContain("role: z.string().trim().max(100).optional()");
  });
});

