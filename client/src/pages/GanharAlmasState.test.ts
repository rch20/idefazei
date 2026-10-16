import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../../..");
const pageSource = readFileSync(resolve(root, "client/src/pages/GanharAlmas.tsx"), "utf8");
const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");

describe("painel de Nova Alma e Discípulo", () => {
  it("usa o estado visual unificado e separa cadastro de etapa principal", () => {
    expect(pageSource).toContain("deriveDiscipleshipDisplayState");
    expect(pageSource).toContain("Fila de Novas Almas");
    expect(pageSource).toContain("uma única vez");
    expect(pageSource).toContain("publicLeadSoulIds");
    expect(pageSource).toContain("Discípulos com ficha");
    expect(pageSource).toContain("Novas almas pendentes");
    expect(pageSource).toContain("Etapa da Jornada: Consolidação");
    expect(pageSource).toContain("Ela não cria nem confirma um caso na fila moderna de Consolidação");
    expect(pageSource).toContain("Abrir ficha em Discípulos");
    expect(pageSource).toContain("Etapa: ${getDiscipleshipStageLabel(displayState.stage)}");
    expect(pageSource).toContain("SoulContactActions");
    expect(pageSource).toContain("Não informado");
    expect(pageSource).toContain('htmlFor="soul-email"');
    expect(pageSource).toContain("soul.email");
  });

  it("consulta a etapa principal da Pessoa com isolamento por igreja", () => {
    expect(dbSource).toContain("discipleshipStage: people.discipleshipStage");
    expect(dbSource).toContain("email: people.email");
    expect(dbSource).toContain("personEmail: people.email");
    expect(dbSource).toContain("eq(people.churchId, churchId)");
    expect(dbSource).toContain("eq(souls.churchId, churchId)");
  });
});
