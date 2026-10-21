import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CHURCH_SETUP_STEPS, CHURCH_SETUP_STEP_KEYS } from "../shared/churchSetup";

const read = (path: string) => readFileSync(resolve(import.meta.dirname, "..", path), "utf8");

describe("trilho de configuração do primeiro acesso", () => {
  it("descreve todos os passos, incluindo redes sociais, com destino e ação", () => {
    expect(CHURCH_SETUP_STEP_KEYS).toContain("redes");
    expect(CHURCH_SETUP_STEP_KEYS).toContain("pix");
    for (const key of CHURCH_SETUP_STEP_KEYS) {
      const step = CHURCH_SETUP_STEPS[key];
      expect(step.title.length).toBeGreaterThan(3);
      expect(step.path.startsWith("/app/")).toBe(true);
      expect(step.action.length).toBeGreaterThan(3);
    }
  });

  it("confere os passos pelos dados e guarda só o que foi pulado", () => {
    const db = read("server/db.ts");
    expect(db).toContain("export async function getChurchSetupStatus");
    expect(db).toContain("celula: cellCount > 0");
    expect(db).toContain("pix: pixCount > 0");
    expect(db).toContain("redes: Object.values(social");
    expect(db).toContain("skipped: !done[key] && skipped.has(key)");
    expect(db).toContain("setChurchSetupStepSkipped");
  });

  it("restringe o trilho a quem administra a igreja", () => {
    const routers = read("server/routers.ts");
    const block = routers.slice(routers.indexOf("setup: protectedProcedure"), routers.indexOf("  update: protectedProcedure", routers.indexOf("setup: protectedProcedure")));
    expect(block).toContain("requirePastor(ctx.user.id, input.churchId)");
    expect(block).toContain("setSetupStepSkipped");
  });

  it("cria a tabela de pulos de forma aditiva e registra no ledger", () => {
    const sql = read("drizzle/0105_church_setup_skips.sql");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS `church_setup_skips`");
    expect(sql).not.toMatch(/DROP|ALTER TABLE|DELETE/i);
    const ledger = JSON.parse(read("drizzle/custom-migrations.json"));
    const entry = ledger.entries.find((item: { id: string }) => item.id === "0105");
    expect(entry.sha256).toBe(createHash("sha256").update(sql).digest("hex"));
  });

  it("mostra o cartão só ao administrador e abre a aba certa em Configurações", () => {
    expect(read("client/src/pages/Inicio.tsx")).toContain("accessSummary?.canManageChurch && user?.churchId ? <ChurchSetupTrail");
    const trail = read("client/src/components/ChurchSetupTrail.tsx");
    expect(trail).toContain("Pular por enquanto");
    expect(trail).toContain("Nada é obrigatório");
    expect(read("client/src/pages/Configuracoes.tsx")).toContain('get("aba")');
  });
});
